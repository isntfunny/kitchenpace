#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set; aborting." >&2
  exit 1
fi

echo "DATABASE_URL: ${DATABASE_URL%@*}@***"  # Hide password in logs
DEBUG_MODE=0
if [ "$DEBUG" = "1" ]; then
  DEBUG_MODE=1
  echo "⚠️  DEBUG MODE ENABLED"
  echo "   Building against a clean database (db:fresh)."
fi

if [ "$DEBUG_MODE" -eq 1 ]; then
  npm run db:fresh
else
  echo "Applying Prisma migrations..."
  npx prisma migrate deploy || {
    echo "Migration failed, trying db push..."
    npx prisma db push
  }
fi

exec "$@"
