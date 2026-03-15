#!/bin/sh
set -e

# If Infisical is configured, re-exec with secrets injected
if [ -n "$INFISICAL_CLIENT_ID" ] && [ "$__INFISICAL_LOADED" != "1" ]; then
  echo "[entrypoint] Loading secrets from Infisical..."
  export __INFISICAL_LOADED=1
  export HOME=/tmp
  export INFISICAL_TOKEN=$(npx infisical login \
    --method=universal-auth \
    --client-id="${INFISICAL_CLIENT_ID}" \
    --client-secret="${INFISICAL_CLIENT_SECRET}" \
    --domain="${INFISICAL_API_URL:-https://secrets.isntfunny.de/api}" \
    --plain --silent)
  if [ -z "$INFISICAL_TOKEN" ]; then
    echo "[entrypoint] ERROR: Failed to authenticate with Infisical" >&2
    exit 1
  fi
  exec npx infisical run \
    --projectId "${INFISICAL_PROJECT_ID}" \
    --env "${INFISICAL_ENV:-prod}" \
    --domain "${INFISICAL_API_URL:-https://secrets.isntfunny.de/api}" \
    -- "$0" "$@"
fi

# Worker skips database setup
if [ "$SKIP_MIGRATIONS" = "1" ]; then
  echo "[entrypoint] Skipping migrations (worker mode)"
  exec "$@"
fi

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
