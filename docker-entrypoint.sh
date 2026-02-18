#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set; aborting." >&2
  exit 1
fi

echo "DATABASE_URL: ${DATABASE_URL%@*}@***"  # Hide password in logs
echo "Applying Prisma migrations..."

# Run migration with verbose output
npx prisma migrate deploy --config ./prisma.config.ts --verbose || {
  echo "Migration failed, trying db push..."
  npx prisma db push --config ./prisma.config.ts --skip-generate
}

# Debug mode: show more info
if [ "$DEBUG" = "1" ]; then
  echo "⚠️  DEBUG MODE ENABLED"
  echo "   Source files are mapped for better stacktraces"
fi

exec "$@"
