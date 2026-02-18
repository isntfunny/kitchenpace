#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set; aborting." >&2
  exit 1
fi

echo "Applying Prisma migrations..."
npx prisma migrate deploy --config ./prisma.config.ts

# Debug mode: show more info
if [ "$DEBUG" = "1" ]; then
  echo "⚠️  DEBUG MODE ENABLED"
  echo "   Source files are mapped for better stacktraces"
fi

exec "$@"
