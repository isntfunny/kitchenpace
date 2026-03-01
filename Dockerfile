FROM node:24-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
COPY panda.config.ts ./
COPY tsconfig.json ./

RUN npm ci --include=dev

FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/panda.config.ts ./
COPY --from=deps /app/tsconfig.json ./

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:24-alpine AS runner

WORKDIR /app

ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ARG LOGTO_CLIENT_ID
ARG LOGTO_CLIENT_SECRET
ARG S3_ENDPOINT
ARG S3_BUCKET
ARG S3_ACCESS_KEY_ID
ARG S3_SECRET_ACCESS_KEY
ARG OPENSEARCH_URL
ARG OPENSEARCH_USERNAME
ARG OPENSEARCH_PASSWORD

ENV NODE_ENV=production
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV LOGTO_CLIENT_ID=${LOGTO_CLIENT_ID}
ENV LOGTO_CLIENT_SECRET=${LOGTO_CLIENT_SECRET}
ENV S3_ENDPOINT=${S3_ENDPOINT}
ENV S3_BUCKET=${S3_BUCKET}
ENV S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
ENV S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
ENV OPENSEARCH_URL=${OPENSEARCH_URL}
ENV OPENSEARCH_USERNAME=${OPENSEARCH_USERNAME}
ENV OPENSEARCH_PASSWORD=${OPENSEARCH_PASSWORD}

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

FROM node:24-alpine AS worker

WORKDIR /app

ARG DATABASE_URL
ARG TRIGGER_API_URL
ARG TRIGGER_ACCESS_TOKEN

COPY --from=builder /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY lib ./lib
COPY trigger ./trigger
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY trigger.config.ts ./

ENV DATABASE_URL=${DATABASE_URL}
ENV TRIGGER_API_URL=${TRIGGER_API_URL}
ENV TRIGGER_ACCESS_TOKEN=${TRIGGER_ACCESS_TOKEN}

CMD ["npx", "trigger.dev@latest", "dev"]
