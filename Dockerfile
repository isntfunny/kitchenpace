# ── Stage 1: Install dependencies ─────────────────────────────────────
FROM node:24-slim AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY panda.config.ts tsconfig.json postcss.config.cjs ./

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        python3 make g++ \
    && npm ci --include=dev \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 1b: Production-only dependencies ────────────────────────────
FROM node:24-slim AS prod-deps

WORKDIR /app

ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --omit=dev --ignore-scripts && npx prisma generate

# ── Stage 2: Build Next.js app ────────────────────────────────────────
FROM node:24-slim AS builder

ARG DEBUG=0

WORKDIR /app

# Make DEBUG available as env var for Next.js build
ENV NEXT_PUBLIC_DEBUG=${DEBUG}

# Prisma 7 requires DATABASE_URL at build time to load prisma.config.ts
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL=${DATABASE_URL}

# Copy dependency artifacts (changes least often → best cache layer)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/styled-system ./styled-system

# Config files (change occasionally)
COPY package.json package-lock.json* ./
COPY panda.config.ts tsconfig.json postcss.config.cjs ./
COPY prisma.config.ts ./
COPY next.config.ts ./
COPY instrumentation.ts instrumentation-client.ts ./
COPY sentry.server.config.ts sentry.edge.config.ts ./

# Prisma schema (generate at runtime after migrations)
COPY prisma ./prisma

# Source code (changes most often → last for cache)
COPY src ./src
COPY shared ./shared
COPY worker ./worker
COPY public ./public
COPY email-templates ./email-templates
COPY cli ./cli

RUN npm run build

# ── Stage 3: Production runner (Next.js) ──────────────────────────────
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        fontconfig hunspell-de-de \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Copy node_modules + prisma (needed for db setup)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

# Copy app files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy CLI
COPY --from=builder --chown=nextjs:nodejs /app/cli ./cli

# Copy and setup entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# CLI launcher script (wraps tsx with entry file)
RUN printf '#!/bin/sh\nexec /app/node_modules/.bin/tsx /app/cli/index.ts "$@"\n' > /usr/local/bin/kitchen \
    && chmod +x /usr/local/bin/kitchen

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]

# ── Stage 4: Worker ───────────────────────────────────────────────────
FROM node:24-slim AS worker

WORKDIR /app

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Production node_modules incl. generated Prisma client
COPY --from=prod-deps /app/node_modules ./node_modules

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json ./
COPY worker ./worker
COPY src ./src
COPY shared ./shared
COPY email-templates ./email-templates

ENV NODE_ENV=production

CMD ["npm", "run", "worker"]
