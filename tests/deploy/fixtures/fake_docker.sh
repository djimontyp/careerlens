#!/usr/bin/env bash

set -euo pipefail

if [[ "$1" == ps ]]; then
    printf '%s\n' "${FAKE_CONTAINERS:-0123456789ab}"
    exit 0
fi

printf '%s\n' "$*"
