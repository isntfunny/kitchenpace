#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set; aborting." >&2
  exit 1
fi

echo "Applying Prisma migrations..."
npx prisma migrate deploy --config ./prisma.config.ts

# Debug mode: run with next dev for hot reload
if [ "$DEBUG" = "1" ]; then
  echo "⚠️  DEBUG MODE ENABLED - Running with next dev"
  echo "   Source files are mapped for error reporting"
  exec npm run dev
fi

exec "$@"
