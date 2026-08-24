#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/careerlens-remote-deploy-test.XXXXXX")"

cleanup() {
    rm -rf -- "${test_root}"
}

trap cleanup EXIT

mkdir -p "${test_root}/bin" "${test_root}/home/.careerlens"
touch "${test_root}/home/.careerlens/production.yml"

cat > "${test_root}/bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == login ]]; then
    IFS= read -r token || true
    [[ "${token}" == registry-token ]]
fi
printf '%s\n' "$*" >> "${FAKE_DOCKER_LOG}"
EOF

cat > "${test_root}/bin/curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "${FAKE_CURL_LOG}"
EOF

cat > "${test_root}/bin/mktemp" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
/usr/bin/mktemp -d "${FAKE_TEMP_ROOT}/careerlens-docker-config.XXXXXX"
EOF

chmod +x "${test_root}/bin/docker" "${test_root}/bin/curl" "${test_root}/bin/mktemp"

values=(
    docker.io/example/careerlens@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
    '["app.example.test"]'
    https://app.example.test
    client_test
    https://app.example.test/callback/
    carelens
    carelens
    owner@example.test
    database-password
    django-secret
    workos-key
    registry-user
    registry-token
)

printf '%s\0' "${values[@]}" | env \
    HOME="${test_root}/home" \
    PATH="${test_root}/bin:${PATH}" \
    FAKE_DOCKER_LOG="${test_root}/docker.log" \
    FAKE_CURL_LOG="${test_root}/curl.log" \
    FAKE_TEMP_ROOT="${test_root}" \
    DOCKER_CONFIG_BASE="${test_root}" \
    bash "${repository_root}/deploy/scripts/remote_deploy.sh"

migrate_line="$(grep -n 'compose .* run --rm app python src/manage.py migrate --noinput' "${test_root}/docker.log" | cut -d: -f1)"
seed_line="$(grep -n 'compose .* run --rm app python src/manage.py import_vacancies src/vacancies/fixtures/demo_vacancies.json --user-email owner@example.test' "${test_root}/docker.log" | cut -d: -f1)"
app_line="$(grep -n 'compose .* up --detach --wait app' "${test_root}/docker.log" | cut -d: -f1)"

[[ "${migrate_line}" -lt "${seed_line}" ]]
[[ "${seed_line}" -lt "${app_line}" ]]

echo "Remote deploy demo seed contract verified"
