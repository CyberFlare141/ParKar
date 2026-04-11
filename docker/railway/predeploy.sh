#!/usr/bin/env bash
set -euo pipefail

cd /opt/render/project/src

if [ "${RAILWAY_SCHEMA_IMPORT:-true}" = "false" ]; then
  echo "Skipping schema import because RAILWAY_SCHEMA_IMPORT=false."
  exit 0
fi

if [ ! -f "schema.sql" ]; then
  echo "schema.sql not found; skipping database bootstrap."
  exit 0
fi

database_url="${DATABASE_URL:-}"

if [ -z "$database_url" ] && [ -n "${DB_CONNECTION:-}" ] && [ "${DB_CONNECTION}" = "pgsql" ]; then
  if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PORT:-}" ] || [ -z "${DB_DATABASE:-}" ] || [ -z "${DB_USERNAME:-}" ]; then
    echo "Database connection variables are incomplete; skipping schema bootstrap."
    exit 0
  fi

  db_password="${DB_PASSWORD:-}"
  database_url="postgresql://${DB_USERNAME}:${db_password}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}"
fi

if [ -z "$database_url" ]; then
  echo "DATABASE_URL is not set; skipping schema bootstrap."
  exit 0
fi

existing_users_table="$(psql "$database_url" -tAc "SELECT to_regclass('public.users');" | tr -d '[:space:]')"

if [ "$existing_users_table" = "users" ]; then
  echo "Database schema already exists; skipping schema import."
  exit 0
fi

echo "Bootstrapping PostgreSQL schema from schema.sql..."
psql "$database_url" -v ON_ERROR_STOP=1 -f schema.sql
echo "Schema import completed."
