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

ENV DEBUG=${DEBUG}
ENV DATABASE_URL=${DATABASE_URL}

# Enable debug logging
ENV NEXT_PRIVATE_DEBUG=${DEBUG}
ENV NEXT_DEBUG_BUILD=${DEBUG}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

# Build the application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DEBUG=0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy source files for dev mapping (only needed if DEBUG=1)
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
