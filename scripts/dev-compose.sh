#!/usr/bin/env bash

set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${CAREERLENS_ENV_READY:-0}" != "1" ]]; then
    exec bash "$root/scripts/dev-env.sh" bash "$0" "$@"
fi

compose_env_file="/dev/null"
if [[ -f "$root/.env.worktree" ]]; then
    compose_env_file="$root/.env.worktree"
fi

exec docker --context="$DOCKER_CONTEXT" compose \
    --env-file "$compose_env_file" \
    --file "$root/deploy/compose/dev.yml" \
    "$@"
