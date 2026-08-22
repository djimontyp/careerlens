#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
temp_base="${TMPDIR:-/tmp}"
test_root="$(mktemp -d "${temp_base%/}/careerlens-frontend-test.XXXXXX")"

cleanup() {
    if [[ "${test_root}" != "${temp_base%/}"/careerlens-frontend-test.* ]]; then
        echo "Refusing unsafe cleanup path: ${test_root}" >&2
        return 1
    fi
    rm -rf -- "${test_root}"
}

trap cleanup EXIT

mkdir -p "${test_root}/dist/assets"
printf '<main>release one</main>\n' > "${test_root}/dist/index.html"
printf 'asset\n' > "${test_root}/dist/assets/app.js"
tar --create --gzip --file "${test_root}/frontend.tar.gz" --directory "${test_root}/dist" .

sha="0123456789abcdef0123456789abcdef01234567"
install_root="${test_root}/www"

bash "${repository_root}/deploy/scripts/install_frontend.sh" \
    "${test_root}/frontend.tar.gz" \
    "${sha}" \
    "${install_root}"

[[ "$(readlink "${install_root}/current")" == "releases/${sha}" ]]
grep --fixed-strings 'release one' "${install_root}/current/index.html" >/dev/null
[[ -f "${install_root}/current/assets/app.js" ]]

mkdir -p "${test_root}/broken-dist"
printf 'broken asset\n' > "${test_root}/broken-dist/app.js"
tar --create --gzip --file "${test_root}/broken.tar.gz" --directory "${test_root}/broken-dist" .
broken_sha="89abcdef0123456789abcdef0123456789abcdef"

if bash "${repository_root}/deploy/scripts/install_frontend.sh" \
    "${test_root}/broken.tar.gz" \
    "${broken_sha}" \
    "${install_root}"; then
    echo "Broken frontend archive was accepted" >&2
    exit 1
fi

[[ "$(readlink "${install_root}/current")" == "releases/${sha}" ]]
[[ ! -e "${install_root}/releases/${broken_sha}" ]]

if bash "${repository_root}/deploy/scripts/install_frontend.sh" \
    "${test_root}/frontend.tar.gz" \
    invalid-sha \
    "${install_root}"; then
    echo "Invalid SHA was accepted" >&2
    exit 1
fi

echo "Frontend install contract verified"
