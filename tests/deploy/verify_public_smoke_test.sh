#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/careerlens-public-smoke-test.XXXXXX")"

cleanup() {
    rm -rf -- "${test_root}"
}

trap cleanup EXIT

mkdir -p "${test_root}/bin"
cat > "${test_root}/bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
url="${@: -1}"
if [[ "$*" == *--write-out* ]]; then
    if [[ "${url}" == */interests ]]; then
        printf '%s' "${FAKE_INTERESTS_STATUS}"
    else
        printf '%s' "${FAKE_FEED_STATUS}"
    fi
fi
EOF
chmod +x "${test_root}/bin/curl"

env PATH="${test_root}/bin:${PATH}" FAKE_FEED_STATUS=401 \
    FAKE_INTERESTS_STATUS='200 text/html; charset=utf-8' \
    bash "${repository_root}/deploy/scripts/verify_public_routes.sh" https://app.example.test

if env PATH="${test_root}/bin:${PATH}" FAKE_FEED_STATUS=200 \
    FAKE_INTERESTS_STATUS='200 text/html; charset=utf-8' \
    bash "${repository_root}/deploy/scripts/verify_public_routes.sh" https://app.example.test; then
    echo "Public Feed accepted an unauthenticated request" >&2
    exit 1
fi

if env PATH="${test_root}/bin:${PATH}" FAKE_FEED_STATUS=401 \
    FAKE_INTERESTS_STATUS='404 text/html; charset=utf-8' \
    bash "${repository_root}/deploy/scripts/verify_public_routes.sh" https://app.example.test; then
    echo "Public interests probe accepted a missing deep link" >&2
    exit 1
fi

if env PATH="${test_root}/bin:${PATH}" FAKE_FEED_STATUS=401 \
    FAKE_INTERESTS_STATUS='200 application/json' \
    bash "${repository_root}/deploy/scripts/verify_public_routes.sh" https://app.example.test; then
    echo "Public interests probe accepted a non-HTML response" >&2
    exit 1
fi

echo "Public route smoke contract verified"
