#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fake_docker="${repo_root}/tests/deploy/fixtures/fake_docker.sh"

output="$(DOCKER_BIN="${fake_docker}" bash "${repo_root}/deploy/scripts/stream_postgres_backup.sh")"
[[ "${output}" == *"exec 0123456789ab sh -c"* ]]
[[ "${output}" == *"pg_dump"* ]]
[[ "${output}" == *"--format=custom --no-owner --no-privileges"* ]]

if FAKE_CONTAINERS=$'0123456789ab\nabcdefabcdef' DOCKER_BIN="${fake_docker}" \
    bash "${repo_root}/deploy/scripts/stream_postgres_backup.sh" >/dev/null 2>&1; then
    echo "Backup script accepted multiple database containers" >&2
    exit 1
fi
