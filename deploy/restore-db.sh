#!/usr/bin/env bash
#
# Restore a custom-format pg_dump into the *empty* production database.
#
#   bash deploy/restore-db.sh /path/to/dsa-software.dump
#
# The guard is deliberate: pg_restore replaces objects, and a dump restored over
# a database that already has practice rows would overwrite the very history
# this app exists to keep. To restore an existing deployment, take a backup
# first and use a deliberate, manual procedure.
#
# The dump includes the drizzle migration journal, so a later `db:migrate` is a
# no-op rather than a re-run against a schema it does not know was applied.

set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

if [[ $# -ne 1 ]]; then
  echo "usage: bash deploy/restore-db.sh /path/to/dsa-software.dump" >&2
  exit 1
fi

# Resolve the argument before changing directory, so a relative dump path works
# from wherever the script was invoked.
dump=$(cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1")
if [[ ! -f "$dump" ]]; then
  echo "error: dump not found: $dump" >&2
  exit 1
fi

cd "$ROOT_DIR"

COMPOSE=(docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.prod.yml")

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "error: $ROOT_DIR/.env is missing." >&2
  exit 1
fi

echo "[restore] Starting Postgres"
"${COMPOSE[@]}" up -d --no-build --wait --wait-timeout 180 postgres

db_user=$("${COMPOSE[@]}" exec -T postgres printenv POSTGRES_USER)
db_name=$("${COMPOSE[@]}" exec -T postgres printenv POSTGRES_DB)

table_count=$("${COMPOSE[@]}" exec -T postgres psql \
  -U "$db_user" -d "$db_name" -tAc \
  "select count(*) from information_schema.tables where table_schema not in ('pg_catalog', 'information_schema')")
table_count=$(printf '%s' "$table_count" | tr -d '[:space:]')

if [[ -z "$table_count" || ! "$table_count" =~ ^[0-9]+$ ]]; then
  echo "error: could not determine whether $db_name is empty (got '$table_count')." >&2
  exit 1
fi

if [[ "$table_count" != "0" ]]; then
  echo "refusing to restore: $db_name already has $table_count table(s)." >&2
  echo "Restoration is only supported into a new, empty database. Take a backup first." >&2
  exit 1
fi

echo "[restore] Restoring $dump into $db_name"
"${COMPOSE[@]}" exec -T postgres pg_restore \
  -U "$db_user" -d "$db_name" \
  --no-owner --no-privileges --single-transaction --exit-on-error < "$dump"

echo "[restore] Done. Counts and problem IDs:"
"${COMPOSE[@]}" exec -T postgres psql -U "$db_user" -d "$db_name" -c \
  "select count(*) as problems, md5(string_agg(id::text, ',' order by id)) as problem_ids from problems;"
