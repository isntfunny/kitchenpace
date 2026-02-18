FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files and panda config for codegen
COPY package.json package-lock.json* panda.config.ts tsconfig.json ./

# Install ALL dependencies (including devDependencies for prisma)
RUN npm ci --include=dev

# Development dependencies
FROM base AS builder
WORKDIR /app

ARG DEBUG=0
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL

ENV DEBUG=${DEBUG}
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-this}
ENV NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

# Build: use --debug flag when DEBUG=1 for verbose output
RUN if [ "$DEBUG" = "1" ]; then npm run build -- --debug; else npm run build; fi

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy source files for better error stacktraces (DEBUG=1)
COPY --from=builder --chown=nextjs:nodejs /app/app ./app
COPY --from=builder --chown=nextjs:nodejs /app/components ./components
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

RUN chmod +x ./docker-entrypoint.sh || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]

CMD ["node", "server.js"]
