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

# ── Stage 2: Build Next.js app ────────────────────────────────────────
FROM node:24-slim AS builder

ARG DEBUG=0
ARG DATABASE_URL="postgresql://build:build@localhost:5432/build"
ARG REACT_PROFILE=0

ENV NEXT_PUBLIC_DEBUG=${DEBUG}
ENV DATABASE_URL=${DATABASE_URL}
ENV REACT_PROFILE=${REACT_PROFILE}

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/styled-system ./styled-system

COPY package.json package-lock.json* ./
COPY panda.config.ts tsconfig.json postcss.config.cjs ./
COPY prisma.config.ts next.config.ts ./
COPY instrumentation.ts instrumentation-client.ts ./
COPY sentry.server.config.ts sentry.edge.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY shared ./shared
COPY worker ./worker
COPY public ./public
COPY email-templates ./email-templates
COPY cli ./cli

RUN if [ "$REACT_PROFILE" = "1" ]; then npm run build -- --profile; else npm run build; fi

# ── Stage 3: Production app (runner + worker share this image) ─────────
FROM node:24-slim AS app

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        fontconfig hunspell-de-de postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# node_modules from deps — includes compiled native addons (nodehun, sharp, bcrypt)
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./

# Next.js standalone build (runner)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Source files for tsx (worker)
COPY --from=builder --chown=nextjs:nodejs /app/worker ./worker
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/shared ./shared
COPY --from=builder --chown=nextjs:nodejs /app/email-templates ./email-templates

# CLI
COPY --from=builder --chown=nextjs:nodejs /app/cli ./cli
RUN printf '#!/bin/sh\nexec /app/node_modules/.bin/tsx /app/cli/index.ts "$@"\n' > /usr/local/bin/kitchen \
    && chmod +x /usr/local/bin/kitchen

# Entrypoint script (runner: runs migrations then starts server)
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
