#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "[entrypoint] ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

export DATABASE_URL
echo "[entrypoint] DATABASE_URL: ${DATABASE_URL%@*}@***"

# Wait for database
echo "[entrypoint] Waiting for database..."
attempt=1
while [ $attempt -le 30 ]; do
  if npx prisma db execute --stdin </dev/null 2>/dev/null; then
    break
  fi
  sleep 2
  attempt=$((attempt + 1))
done
if [ $attempt -gt 30 ]; then
  echo "[entrypoint] ERROR: Database not ready" >&2
  exit 1
fi

# Apply migrations (prisma generate already ran during Docker build)
echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy

# Generate Prisma client (must run after migrations)
echo "[entrypoint] Generating Prisma client..."
npx prisma generate

echo "[entrypoint] Ready"
exec "$@"
