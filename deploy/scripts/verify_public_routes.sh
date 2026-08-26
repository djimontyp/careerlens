#!/usr/bin/env bash

set -euo pipefail

base_url="${1:-}"
if [[ ! "${base_url}" =~ ^https://[a-zA-Z0-9.-]+$ ]]; then
    echo "Expected an HTTPS origin without a path" >&2
    exit 1
fi

curl --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 2 \
    "${base_url}/" >/dev/null

feed_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    "${base_url}/api/v1/feed")"
if [[ "${feed_status}" != 401 ]]; then
    echo "Expected unauthenticated Feed to return 401, got ${feed_status}" >&2
    exit 1
fi
