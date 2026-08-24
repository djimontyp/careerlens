#!/usr/bin/env bash

set -euo pipefail

docker_bin="${DOCKER_BIN:-docker}"
mapfile -t containers < <(
    "${docker_bin}" ps \
        --filter label=com.docker.compose.project=careerlens-prod \
        --filter label=com.docker.compose.service=db \
        --format '{{.ID}}'
)

if [[ "${#containers[@]}" -ne 1 || ! "${containers[0]}" =~ ^[0-9a-f]{12,64}$ ]]; then
    echo "Expected exactly one CareerLens production database container" >&2
    exit 1
fi

exec "${docker_bin}" exec "${containers[0]}" sh -c \
    'exec pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --no-owner --no-privileges'
