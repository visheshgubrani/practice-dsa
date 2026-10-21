#!/usr/bin/env bash
#
# Runs on the VPS once, before the first application deploy.
#
# Builds the modified Piston checkout at ../piston (the default
# PISTON_SOURCE_DIR) natively and starts Postgres + Piston. This is the slow
# step: it compiles CPython 3.12.0 and Isolate on the VPS. Later application
# deploys never rebuild Piston.
#
#   cp deploy/env.example .env
#   $EDITOR .env
#   bash deploy/vps-bootstrap.sh

set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

COMPOSE=(docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.prod.yml")

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "error: $ROOT_DIR/.env is missing." >&2
  echo "       cp deploy/env.example .env, then fill in the password and key." >&2
  exit 1
fi

echo
echo "[bootstrap] Building native Piston from PISTON_SOURCE_DIR in .env (default ../piston)."
echo "[bootstrap] This compiles CPython 3.12.0 and Isolate; the first build is slow."
echo
"${COMPOSE[@]}" build piston

echo
echo "[bootstrap] Starting Postgres and Piston."
echo
"${COMPOSE[@]}" up -d --wait --wait-timeout 1800 postgres piston

cat <<'EOF'

[bootstrap] Postgres and Piston are healthy.

Next:
  1. Restore the practice dump into the empty database:
       bash deploy/restore-db.sh /path/to/dsa-software.dump
  2. Configure the Caddy site block (deploy/Caddyfile.example) and reload Caddy.
  3. Push to main, or run the Deploy workflow from GitHub Actions.

EOF
