# Deploying on the Oracle ARM64 VPS

The production flow is deliberately small:

```
push to main
  -> GitHub ubuntu-24.04-arm runner
  -> build the app image natively for linux/arm64
  -> push to GHCR (SHA tag + digest)
  -> SSH to the VPS
  -> copy Compose + deploy scripts from the same commit
  -> pull the digest, migrate, recreate the app, wait for /api/health
```

Piston is **not** built by CI. The VPS builds the modified checkout at
`~/piston` once, natively, and reuses that image until Piston itself is
upgraded. Database seeding stays manual. The Postgres volume is never reset by
a deploy.

CI runs only the production build. It deliberately has no lint, test, or
typecheck step; run those locally before pushing.

## Services

| Service | Image | Exposure |
| --- | --- | --- |
| `app` | `ghcr.io/visheshgubrani/practice-dsa@sha256:…` | `127.0.0.1:3002` only |
| `postgres` | `postgres:18-alpine` | Compose network + `127.0.0.1:5483` |
| `piston` | locally built `piston-native:python-3.12.0` | Compose network only |

Both published ports are loopback-only. They dodge the ports already taken on
the VPS: 3000/3001 belong to the academy and cramlify clients, and Postgres
slots 5470/5482 belong to cramlify and swingtradervcp.

Caddy, already installed on the host, terminates HTTPS for the domain and
proxies to the loopback app port with one basic-auth login (`dsa`).

## One-time setup

### 1. Host prerequisites

- Ubuntu 24.04 ARM64 with rootful Docker and Docker Compose v2.24 or newer
  (`!reset` in the dev override needs it; the production stack is plain v2).
- Unified cgroup v2. Piston's Isolate sandbox needs it:

  ```bash
  stat -fc %T /sys/fs/cgroup        # cgroup2fs
  docker info --format '{{.CgroupVersion}}'
  ```

- Caddy installed and running, ports 80/443 reachable. On Oracle Cloud, open
  80/443 in the VCN security list *and* the host firewall; the default cloud
  rules usually allow only SSH.
- DNS `A`/`AAAA` record for the chosen domain pointing at the VPS.

### 2. GitHub Actions secrets

Create these in the repository settings:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IP or DNS name |
| `VPS_USER` | SSH user that can run Docker |
| `VPS_SSH_KEY` | private deploy key, including `BEGIN`/`END` lines |
| `VPS_PORT` | optional; defaults to `22` |
| `VPS_APP_DIR` | optional; defaults to `practice-dsa` relative to the SSH user's home |

Use a dedicated key with no passphrase (the workflow runs non-interactively)
and put its public half in `~/.ssh/authorized_keys`.

CI does not store host keys. The ephemeral runner uses `StrictHostKeyChecking
accept-new`, so it records the VPS key on the job's first connection and
verifies it for the remaining steps. There is no `VPS_KNOWN_HOSTS` secret to
create or rotate. The tradeoff is trust-on-first-use per run: a hijacked DNS or
routing path at connect time would not be caught. Confirm the fingerprint once
out of band if that matters to you:

```bash
ssh-keyscan -p "${VPS_PORT:-22}" VPS_HOST | ssh-keygen -lf -
# compare with: ssh VPS_USER@VPS_HOST 'ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
```

### 3. Copy the modified Piston checkout (once)

The local checkout contains uncommitted changes (`Dockerfile.python` is
untracked), so do **not** clone from GitHub. Copy the working tree, including
those changes:

```bash
# from the machine that has ~/piston
rsync -az --delete --exclude .git ~/piston/ VPS_USER@VPS_HOST:piston/
```

The remote path is relative to the SSH user's home. Verify:

```bash
ssh VPS_USER@VPS_HOST 'ls -l ~/piston/Dockerfile.python'
```

If rsync is not available on the VPS, use tar:

```bash
tar czf - --exclude=.git -C "$HOME" piston \
  | ssh VPS_USER@VPS_HOST 'tar xzf - -C "$HOME"'
```

### 4. Put the deployment files on the VPS

CI copies `docker-compose.prod.yml` and `deploy/` on every deployment, but the
first bootstrap needs them before CI has run. From the repository root:

```bash
tar czf - docker-compose.prod.yml deploy \
  | ssh VPS_USER@VPS_HOST 'mkdir -p practice-dsa && tar xzf - -C practice-dsa'
```

If you set `VPS_APP_DIR`, use that directory instead of `practice-dsa`.

### 5. Create the server environment file

```bash
ssh VPS_USER@VPS_HOST
cd ~/practice-dsa
cp deploy/env.example .env
chmod 600 .env
$EDITOR .env
```

Fill in:

- `POSTGRES_PASSWORD` and `DATABASE_URL` — the defaults are the standard
  `postgres`/`postgres` login against the Compose service, so nothing has to
  change. If you rotate the password, change both values together and
  URL-encode characters such as `@`, `:`, `/`, and `#` in the password (and
  percent-encode or Compose-escape `$`), because both the URL parser and
  Compose's `.env` interpolation read that value.
- `OPENAI_API_KEY` — leave empty only if the scripted demo tutor is acceptable.

`PISTON_SOURCE_DIR` defaults to `../piston`, which is `~/piston` when the
deploy directory is `~/practice-dsa`. If you use a different `VPS_APP_DIR`, set
it to the absolute path of the Piston checkout instead. The workflow never
touches `.env`.

### 6. Build Piston natively and start Postgres + Piston

```bash
cd ~/practice-dsa
bash deploy/vps-bootstrap.sh
```

The first build compiles CPython 3.12.0 and Isolate on the VPS and can take a
while. The script waits until both services are healthy. Piston's health check
passes only when it reports exactly Python `3.12.0`.

```bash
docker compose --env-file .env -f docker-compose.prod.yml ps
docker compose --env-file .env -f docker-compose.prod.yml logs -f piston
```

Routine app deploys never rebuild this image.

### 7. Move the practice database

**Pause writes in the local app** (no Run/Submit, no notes autosave, no review
rating) for the final dump. Then, from the local repository:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' \
  > dsa-software.dump

scp dsa-software.dump VPS_USER@VPS_HOST:practice-dsa/
```

Restore into the new, empty VPS database:

```bash
ssh VPS_USER@VPS_HOST
cd ~/practice-dsa
bash deploy/restore-db.sh ~/practice-dsa/dsa-software.dump
```

The script refuses to run against a database that already has any table, so it
cannot overwrite practice history by accident. The dump includes the `drizzle`
migration journal, which is why the first deploy's `db:migrate` is a no-op.
Do **not** seed after this restore: the dump already contains the catalog and
its problem UUIDs.

The local database is kept. Nothing in this procedure resets local volumes.

### 8. Verify the restore

Compare the source and VPS output of `deploy/verify-db.sql`. The table counts
and the `problem_ids` checksum must match.

Local:

```bash
docker compose -f docker-compose.dev.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f -' < deploy/verify-db.sql
```

VPS:

```bash
cd ~/practice-dsa
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f -' < deploy/verify-db.sql
```

`problem_ids` is `md5(string_agg(id::text, ',' order by id))` over `problems`:
problem IDs are UUIDs generated at first seed, so the checksum is the identity
check, not just a row count.

### 9. Configure Caddy

Add a site block to the existing `/etc/caddy/Caddyfile` using
`deploy/Caddyfile.example`, replacing the domain. Generate the bcrypt hash **on
the VPS** (the command prompts, keeping the password out of shell history):

```bash
caddy hash-password
```

Paste the resulting `$2a$…` hash into the `basic_auth` block. The login is
`dsa`; the single block protects the whole site and every `/api/*` path.

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -f
```

Caddy obtains and renews HTTPS certificates automatically once DNS and ports
80/443 are correct. If the installed Caddy predates the `basic_auth` spelling,
upgrade it rather than inventing a second auth layer.

### 10. First application deploy

Push to `main`, or start the workflow by hand:

```bash
gh workflow run "Deploy to Oracle ARM VPS"
gh run watch
```

The workflow builds on `ubuntu-24.04-arm`, pushes
`ghcr.io/visheshgubrani/practice-dsa:sha-<commit>`, copies the Compose file and
scripts from that commit, logs in to GHCR temporarily on the VPS, deploys the
resulting **digest**, and logs out. Deployments are serialized by a `concurrency`
group; a run is never cancelled mid-migration.

After it finishes:

```bash
ssh VPS_USER@VPS_HOST
cd ~/practice-dsa
cat .deployed-image
docker compose --env-file .env -f docker-compose.prod.yml ps
curl -fsS http://127.0.0.1:3002/api/health
```

The expected health body is `{"status":"ok"}`. A `503` means Postgres is not
reachable, not that the app process is gone.

## Routine deploys

```bash
git push origin main
```

CI does the rest. `/api/health` is the readiness gate; the deploy fails if the
app does not report healthy. The previous image reference is kept in
`.previous-image`, and the successful one in `.deployed-image`.

There is a brief restart window while the single app container is recreated.
There is no blue/green setup.

## App rollback

The previous image is recorded in `.previous-image`. Run the normal deploy path
with it: it pulls, migrates (additive, normally a no-op), recreates the app,
waits for health, and updates `.deployed-image`/`.previous-image`.

```bash
cd ~/practice-dsa
cat .previous-image
docker login ghcr.io
APP_IMAGE="$(cat .previous-image)" bash deploy/vps-deploy.sh
docker logout ghcr.io
```

If the image is still local and you want neither a pull nor a migration, start
it directly. This path does **not** update `.deployed-image`, so update or
remove that file if later commands should target the rolled-back image.

```bash
cd ~/practice-dsa
APP_IMAGE="$(cat .previous-image)" docker compose --env-file .env \
  -f docker-compose.prod.yml up -d --no-deps --no-build --wait --wait-timeout 180 app
```

Migrations are additive, so the previous app can run against the newer schema.
Rolling the **database** back is a separate, destructive restore; see below.

## Database backup and restore

Back up on the VPS:

```bash
cd ~/practice-dsa
bash deploy/backup-db.sh                       # backups/dsa-software-<utc>.dump
bash deploy/backup-db.sh /path/to/copy.dump
```

Then copy the dump off the machine. Back up before Piston upgrades, manual
seeds, or any risky database work.

The restore script only accepts an empty database. A real database rollback is
therefore a deliberate, destructive operation:

```bash
cd ~/practice-dsa
docker compose --env-file .env -f docker-compose.prod.yml stop app

# Destroys the current database. Only do this when you mean it.
docker compose --env-file .env -f docker-compose.prod.yml exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
     -c "drop database if exists \"$POSTGRES_DB\" with (force);" \
     -c "create database \"$POSTGRES_DB\";"'

bash deploy/restore-db.sh /path/to/dsa-software.dump

# Start the app again (workflow_dispatch, or the vps-deploy command above).
```

Never use `docker compose down -v`: it deletes `postgres_data`.

## Manual seed

Catalog changes are deliberate and stay manual. After a migration that includes
a catalog change:

```bash
cd ~/practice-dsa
export APP_IMAGE="$(cat .deployed-image)"
docker compose --env-file .env -f docker-compose.prod.yml \
  run --rm --no-deps app pnpm db:seed
```

Seed upserts by slug and preserves problem IDs and all user data. It does not
reset the database. Do not seed over a freshly restored dump unless the catalog
itself changed.

## Logs and health

```bash
cd ~/practice-dsa
docker compose --env-file .env -f docker-compose.prod.yml logs -f app
docker compose --env-file .env -f docker-compose.prod.yml logs -f postgres
docker compose --env-file .env -f docker-compose.prod.yml logs -f piston
sudo journalctl -u caddy -f
```

Health failure behavior is intentional: with Postgres stopped, the route returns
`503` and the Compose health check fails; it does not expose the database error.

```bash
curl -i http://127.0.0.1:3002/api/health
```

## Verify Piston and the app on ARM

Piston's own health check already requires exactly Python 3.12.0. To exercise
the real judging path through the restored catalog:

```bash
cd ~/practice-dsa
export APP_IMAGE="$(cat .deployed-image)"
docker compose --env-file .env -f docker-compose.prod.yml \
  run --rm --no-deps app pnpm piston:check
docker compose --env-file .env -f docker-compose.prod.yml \
  run --rm --no-deps app pnpm visualizer:check
```

Then in a browser through Caddy, with the `dsa` login:

- Run and Submit on a known problem; the console shows a real engine verdict.
- Visualize draws a trace (the vendored tracer and Python Tutor assets are in
  the image).
- Monaco loads from `/monaco/vs`.
- The tutor streams a reply (needs `OPENAI_API_KEY`; otherwise the scripted demo
  is expected).
- Notes and review data are the restored ones, not a fresh seed.

## Piston upgrades

Preserve the running image first:

```bash
cd ~/practice-dsa
current=$(docker compose --env-file .env -f docker-compose.prod.yml ps -q piston)
image=$(docker inspect --format '{{.Image}}' "$current")
docker image tag "$image" piston-native:rollback
```

Copy the updated `~/piston` working tree again, then rebuild and recreate only
Piston:

```bash
docker compose --env-file .env -f docker-compose.prod.yml build piston
docker compose --env-file .env -f docker-compose.prod.yml \
  up -d --no-build --wait --wait-timeout 1800 piston
```

If the new engine fails, restore the saved image:

```bash
PISTON_NATIVE_IMAGE=piston-native:rollback \
  docker compose --env-file .env -f docker-compose.prod.yml \
  up -d --no-build --pull never --wait piston
```

The native Piston image is local only; it is not published to GHCR. Never mount
a volume over `/piston`: the bundled runtime lives there and a volume would hide
it.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Deploy fails before migration | Is Piston's image present? Run `deploy/vps-bootstrap.sh` once. |
| GHCR `denied` | The VPS login happened; confirm the repository's Actions permissions allow package write and the package is linked to the repo. |
| `db:migrate` fails | Stop and inspect `logs app`; do not retry with a reset volume. |
| `/api/health` is 503 | Postgres container state, `DATABASE_URL` host `postgres`, password encoding. |
| Caddy returns 502 | App not listening on `127.0.0.1:3002`; check `docker compose ps`. |
| Caddy returns 401 everywhere | That is the basic_auth block working; use `curl -u dsa`. |
| Piston unhealthy | `logs piston`; check cgroup v2 and that `/piston` is not mounted. |

### SSH disconnect follow-up (2026-10-22)

Approved operational fix; implementation and local verification complete.
Verification on the VPS is pending the next deployment.
This does not change the current application phase or its acceptance gates.

[Run 39760126142](https://github.com/visheshgubrani/practice-dsa/actions/runs/39760126142)
built and published the image, then lost SSH with `Broken pipe` / exit `255`
after 4 minutes 16 seconds without output during the quiet pull. An idle
connection timeout is the leading hypothesis; the logs do not establish a
Postgres or application configuration error.

- [x] Configure the workflow's `dsa-vps` host with `ServerAliveInterval 30`,
  `ServerAliveCountMax 6`, and `ConnectTimeout 15`.
- [x] Use `--progress plain pull app` with the existing Compose arguments.
- [x] Validate workflow YAML, shell syntax, rendered SSH settings, Compose
  configuration, lint, and typecheck.
- [x] Verify the full suite with isolated fixtures and a production build;
  record the actual results and default-command limitations below.
- [ ] On the next deployment, verify visible pull progress, completed
  migrations, healthy app startup, and the recorded image digest.

The deployment stays synchronous. If SSH still disconnects, inspect VPS
SSH/Docker journals, memory, and disk usage around the failure before changing
the deployment flow.

Local verification (pnpm 10.33.2):

- Workflow YAML parsed; all five workflow shell blocks and every `deploy/*.sh`
  script passed `bash -n`. `ssh -G` over the workflow's rendered host block
  confirmed the three settings without connecting to the VPS.
- `docker compose --env-file deploy/env.example -f docker-compose.prod.yml
  --progress plain config --quiet`, `pnpm lint`, and `pnpm typecheck` passed.
- `pnpm test` on a disposable database copy passed 504/506 tests. The two coach
  count failures match the already documented fixture interference; a serial
  run passed 515/516, with one coach count still affected by copied practice
  records on its fixed test date. The full suite, with its globs expanded
  recursively and `--test-concurrency=1`, passed **516/516** on a catalog-only
  copy. Both disposable copies were removed; the source database was read-only.
- `pnpm build` was blocked by the environment's Turbopack port-binding
  restriction, including the retry outside the sandbox. `pnpm build --webpack`
  passed outside the sandbox; the first Webpack attempt inside the sandbox
  could not capture TypeScript's config output. No build configuration changed.

## What CI does not do

- It does not run lint, tests, or typecheck.
- It does not build or upgrade Piston.
- It does not seed the catalog.
- It does not dump, restore, reset, or roll the database back.
- It does not edit Caddy or DNS.
- It does not publish the Piston port, and it does not change the app's or
  Postgres's loopback-only port mappings.
