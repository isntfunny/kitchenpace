FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files and panda config for codegen
COPY package.json package-lock.json* panda.config.ts tsconfig.json ./

# Install ALL dependencies (including devDependencies for prisma)
RUN npm ci --include=dev

# Development runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ARG DEBUG=0
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL

ENV NODE_ENV=development
ENV DEBUG=${DEBUG}
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-change-this}
ENV NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs . .

RUN npx prisma generate

RUN mkdir -p /app/.next/dev && chown -R nextjs:nodejs /app/.next

RUN chmod +x ./docker-entrypoint.sh || true

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]

CMD ["npm", "run", "dev"]
