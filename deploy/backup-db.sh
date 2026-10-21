#!/usr/bin/env bash
#
# Dump the production database in the same custom format the local install uses.
# Safe to run while the app is up; PostgreSQL gives pg_dump a consistent snapshot.
#
#   bash deploy/backup-db.sh                      # backups/dsa-software-<utc>.dump
#   bash deploy/backup-db.sh /path/to/copy.dump   # explicit destination
#
# Copy the file off the VPS. It contains every practice row and the Drizzle
# migration journal.

set -euo pipefail
umask 077

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

COMPOSE=(docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.prod.yml")

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "error: $ROOT_DIR/.env is missing." >&2
  exit 1
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination=${1:-"$ROOT_DIR/backups/dsa-software-$timestamp.dump"}
mkdir -p "$(dirname -- "$destination")"

"${COMPOSE[@]}" up -d --no-build --wait --wait-timeout 180 postgres

echo "[backup] Writing $destination"
"${COMPOSE[@]}" exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$destination"

ls -lh "$destination"
