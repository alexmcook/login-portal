#!/bin/sh
set -e

# Read DB password from Docker secrets if available, otherwise fall back to env var
PGPASS_FILE=/run/secrets/POSTGRES_PASSWORD
if [ -f "$PGPASS_FILE" ]; then
  PGPASSWORD="$(cat "$PGPASS_FILE")"
else
  PGPASSWORD="${POSTGRES_PASSWORD}"
fi

export PGHOST="${POSTGRES_HOST:-postgres}"
export PGPORT="${POSTGRES_PORT:-5432}"
export PGUSER="${POSTGRES_USER:-postgres}"
export PGDATABASE="${POSTGRES_DB:-login-portal}"
export PGPASSWORD

# Wait for Postgres to be ready
echo "Waiting for Postgres at $PGHOST:$PGPORT..."
until pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" >/dev/null 2>&1; do
  sleep 1
done

echo "Postgres is ready, running migrations..."
# Run migrations (uses PG* env vars or DATABASE_URL if set)
npm run migrate:up

echo "Migrations complete, starting server..."
exec "$@"
