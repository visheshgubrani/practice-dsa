# syntax=docker/dockerfile:1

# Production image for the ARM64 VPS.
#
# The build runs on the same architecture as the target (GitHub's ubuntu-24.04-arm
# runner, or the VPS itself), so no cross-compilation is involved. The runtime
# keeps the migration and seed tooling in the image: deploy/vps-deploy.sh runs
# `pnpm db:migrate` before recreating the app, and catalog seeding stays manual.
#
# Python is a runtime dependency of `pnpm db:seed`: the catalog conformance gate
# in lib/problems/conformance.ts executes each reference solution locally before
# writing the catalog.

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.33.2

FROM node:${NODE_VERSION}-bookworm-slim AS base
ARG PNPM_VERSION
ENV NEXT_TELEMETRY_DISABLED=1 \
    CI=1
# Pinned by version, not by a floating tag. Corepack is deliberately avoided:
# its prepared pnpm lives under root's cache and is not available to the `node`
# user the runner switches to.
RUN npm install --global pnpm@${PNPM_VERSION} \
    && npm cache clean --force
WORKDIR /app

# --- Dependencies: the lockfile, installed once and reused by the builder.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# --- Builder: the normal production build, including Monaco and visualizer sync.
FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- Runtime: Next's production server plus migration/seed tooling.
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ARG PNPM_VERSION
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates python3 \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@${PNPM_VERSION} \
    && npm cache clean --force

WORKDIR /app
RUN chown node:node /app

# next start needs the manifests and the config it was built with.
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/node_modules ./node_modules

# Runtime-only source: Drizzle migrations, the seed input, the vendored Python
# tracer the visualizer sends to Piston, and the operational scripts.
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/lib ./lib
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/vendor ./vendor
COPY --from=builder --chown=node:node /app/docs/catalog/neetcode-150.json ./docs/catalog/neetcode-150.json

USER node
EXPOSE 3000

CMD ["pnpm", "start"]
