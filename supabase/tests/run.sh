#!/usr/bin/env bash
# Corre los tests de RLS contra una base con migraciones + seed.
# Por defecto usa el Postgres de Supabase local (supabase start).
#   DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres bash supabase/tests/run.sh
set -euo pipefail
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
cd "$(dirname "$0")"
psql "$DB_URL" -q -t -v ON_ERROR_STOP=1 -f rls_test.sql 2>&1 | grep -E "OK:|FALLÓ|ERROR|✔" | sed -E "s/^psql:[^ ]+ //"
exit "${PIPESTATUS[0]}"
