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
if [[ "$*" == *--write-out* ]]; then
    printf '%s' "${FAKE_FEED_STATUS}"
fi
EOF
chmod +x "${test_root}/bin/curl"

env PATH="${test_root}/bin:${PATH}" FAKE_FEED_STATUS=401 \
    bash "${repository_root}/deploy/scripts/verify_public_routes.sh" https://app.example.test

if env PATH="${test_root}/bin:${PATH}" FAKE_FEED_STATUS=200 \
    bash "${repository_root}/deploy/scripts/verify_public_routes.sh" https://app.example.test; then
    echo "Public Feed accepted an unauthenticated request" >&2
    exit 1
fi

echo "Public route smoke contract verified"
