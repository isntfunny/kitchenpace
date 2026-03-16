#!/bin/sh
set -e

# If Infisical is configured, load secrets into shell environment
if [ -n "$INFISICAL_CLIENT_ID" ] && [ "$__INFISICAL_LOADED" != "1" ]; then
  echo "[entrypoint] Loading secrets from Infisical..."
  export __INFISICAL_LOADED=1
  export HOME=/tmp
  export INFISICAL_UNIVERSAL_AUTH_CLIENT_ID="${INFISICAL_CLIENT_ID}"
  export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET="${INFISICAL_CLIENT_SECRET}"
  export INFISICAL_TOKEN=$(npx infisical login \
    --method=universal-auth --plain --silent)
  if [ -z "$INFISICAL_TOKEN" ]; then
    echo "[entrypoint] ERROR: Failed to authenticate with Infisical" >&2
    exit 1
  fi
  npx infisical export \
    --projectId "${INFISICAL_PROJECT_ID}" \
    --env "${INFISICAL_ENV:-prod}" \
    --format=dotenv-export > /tmp/.env.infisical
  . /tmp/.env.infisical
  echo "[entrypoint] Loaded $(wc -l < /tmp/.env.infisical) secrets from Infisical"
  echo "[entrypoint] Loaded $(wc -l < /tmp/.env.infisical) secrets from Infisical"
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
