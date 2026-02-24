#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set; aborting." >&2
  exit 1
fi

echo "DATABASE_URL: ${DATABASE_URL%@*}@***"  # Hide password in logs
echo "Applying Prisma migrations..."
npx prisma migrate deploy || {
  echo "Migration failed, trying db push..."
  npx prisma db push
}

exec "$@"
