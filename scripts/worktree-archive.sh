#!/usr/bin/env bash

set -Eeuo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
worktree_environment="$root/.env.worktree"

if [[ ! -f "$worktree_environment" ]]; then
    echo "Missing $worktree_environment; refusing to guess which Docker project to remove" >&2
    exit 1
fi

set -a
source "$worktree_environment"
set +a

if [[ -z "${COMPOSE_PROJECT_NAME:-}" ]]; then
    echo "Missing COMPOSE_PROJECT_NAME in $worktree_environment" >&2
    exit 1
fi
case "$COMPOSE_PROJECT_NAME" in
    careerlens-release-dev|careerlens-production)
        echo "Refusing to remove protected Docker project: $COMPOSE_PROJECT_NAME" >&2
        exit 1
        ;;
esac

docker --context="$DOCKER_CONTEXT" compose \
    --env-file "$worktree_environment" \
    --project-name "$COMPOSE_PROJECT_NAME" \
    --file "$root/deploy/compose/dev.yml" \
    down -v

rm -f "$worktree_environment"
echo "Removed Docker resources for $COMPOSE_PROJECT_NAME"
