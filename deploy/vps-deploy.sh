#!/usr/bin/env bash
#
# Runs on the VPS. CI calls this after copying this file and the Compose file.
# It can also be run by hand:
#
#   docker login ghcr.io
#   APP_IMAGE=ghcr.io/visheshgubrani/practice-dsa@sha256:<digest> bash deploy/vps-deploy.sh
#
# Order matters: Postgres and Piston must be ready before migrations, migrations
# must land before the new app starts, and the app must be healthy before this
# process records the new image as deployed.

set -euo pipefail

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

COMPOSE=(docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.prod.yml")

: "${APP_IMAGE:?APP_IMAGE must be set to the ghcr.io image reference (tag or digest)}"
export APP_IMAGE

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "error: $ROOT_DIR/.env is missing. Copy deploy/env.example and fill it in." >&2
  exit 1
fi

log() {
  printf '\n[deploy] %s\n' "$*"
}

on_error() {
  local status=$?
  echo
  echo "[deploy] FAILED (exit $status)." >&2
  if [[ -f "$ROOT_DIR/.previous-image" ]]; then
    echo "[deploy] Previous app image: $(cat "$ROOT_DIR/.previous-image")" >&2
    echo "[deploy] See docs/deploy.md for the rollback command." >&2
  fi
  "${COMPOSE[@]}" ps >&2 || true
  "${COMPOSE[@]}" logs --tail=80 app >&2 || true
  exit "$status"
}
trap on_error ERR

wait_for_healthy() {
  local service=$1 container status
  container=$("${COMPOSE[@]}" ps -q "$service")
  if [[ -z "$container" ]]; then
    echo "error: $service has no container" >&2
    return 1
  fi
  status=$(docker inspect \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$container")
  if [[ "$status" != "healthy" ]]; then
    echo "error: $service is $status, not healthy" >&2
    return 1
  fi
  echo "[deploy] $service: healthy"
}

log "Pulling $APP_IMAGE"
"${COMPOSE[@]}" --progress plain pull app

log "Ensuring Postgres and Piston are running"
"${COMPOSE[@]}" up -d --no-build --wait --wait-timeout 180 postgres piston
wait_for_healthy postgres
wait_for_healthy piston

# Remember what was running before this deploy. The file survives a failed
# deploy so the previous app image can be started again by hand.
previous_container=$("${COMPOSE[@]}" ps -q app 2>/dev/null || true)
if [[ -n "$previous_container" ]]; then
  previous_image=$(docker inspect --format '{{.Config.Image}}' "$previous_container" 2>/dev/null || true)
  if [[ -n "$previous_image" && "$previous_image" != "$APP_IMAGE" ]]; then
    printf '%s\n' "$previous_image" > "$ROOT_DIR/.previous-image"
    log "Previous app image: $previous_image"
  fi
fi

log "Applying database migrations"
timeout 600 "${COMPOSE[@]}" run --rm --no-deps -T app pnpm db:migrate

log "Recreating the app"
"${COMPOSE[@]}" up -d --no-deps --no-build --wait --wait-timeout 180 app
wait_for_healthy app

printf '%s\n' "$APP_IMAGE" > "$ROOT_DIR/.deployed-image"
log "Deployed $APP_IMAGE"
