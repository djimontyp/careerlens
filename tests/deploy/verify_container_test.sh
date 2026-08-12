#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
image_name="careerlens:container-contract-$$"
project_name="careerlens-contract-$$"
http_port="$((19000 + $$ % 1000))"
secrets_directory=""

compose() {
    docker compose \
        --file "${repository_root}/deploy/compose/production.yml" \
        --project-name "${project_name}" \
        "$@"
}

cleanup() {
    exit_status="$?"
    trap - EXIT
    if ((exit_status != 0)); then
        compose ps || true
        compose logs --no-color --tail 100 app db || true
    fi
    compose down --volumes --remove-orphans >/dev/null 2>&1 || true
    docker image rm "${image_name}" >/dev/null 2>&1 || true
    if [[ -n "${secrets_directory}" ]]; then
        rm -rf "${secrets_directory}"
    fi
    exit "${exit_status}"
}

trap cleanup EXIT

export CAREERLENS_IMAGE="${image_name}"
export CAREERLENS_HTTP_PORT="${http_port}"
secrets_directory="$(mktemp -d)"
printf '%s' "container-contract-only-secret-key-32-characters" >"${secrets_directory}/django_secret_key"
printf '%s' "container-contract-only-password" >"${secrets_directory}/app_database_password"
printf '%s' "container-contract-only-password" >"${secrets_directory}/db_database_password"
export CAREERLENS_SECRETS_DIR="${secrets_directory}"
export APP__ENVIRONMENT="production"
export APP__DJANGO__ALLOWED_HOSTS='["app.example.invalid","127.0.0.1"]'
export APP__CORE__SITE_URL="https://app.example.invalid"
export APP__DATABASE__DATABASE="careerlens_contract"
export APP__DATABASE__USER="careerlens_contract"

docker build \
    --file "${repository_root}/deploy/docker/app.Dockerfile" \
    --platform linux/amd64 \
    --tag "${image_name}" \
    "${repository_root}"

[[ "$(docker image inspect --format '{{.Architecture}}' "${image_name}")" == "amd64" ]]

compose config --quiet
compose up --detach --wait

app_container="$(compose ps --quiet app)"
db_container="$(compose ps --quiet db)"

curl \
    --fail \
    --silent \
    --header "X-Forwarded-Proto: https" \
    "http://127.0.0.1:${http_port}/health" \
    | grep --fixed-strings '"status": "ok"' >/dev/null

[[ "$(docker inspect --format '{{.Config.User}}' "${app_container}")" == "10001:10001" ]]
[[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "${app_container}")" == "true" ]]
[[ "$(docker inspect --format '{{json .HostConfig.CapDrop}}' "${app_container}")" == '["ALL"]' ]]
[[ "$(docker inspect --format '{{json .HostConfig.SecurityOpt}}' "${app_container}")" == '["no-new-privileges:true"]' ]]
[[ "$(docker inspect --format '{{.HostConfig.PidsLimit}}' "${app_container}")" == "128" ]]
[[ "$(docker inspect --format '{{.HostConfig.Memory}}' "${app_container}")" == "536870912" ]]
[[ "$(docker inspect --format '{{.HostConfig.NanoCpus}}' "${app_container}")" == "750000000" ]]
[[ "$(docker inspect --format '{{(index (index .NetworkSettings.Ports "8000/tcp") 0).HostIp}}' "${app_container}")" == "127.0.0.1" ]]
[[ "$(docker inspect --format '{{.Config.User}}' "${db_container}")" == "999:999" ]]
[[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "${db_container}")" == "true" ]]
[[ "$(docker inspect --format '{{json .HostConfig.CapDrop}}' "${db_container}")" == '["ALL"]' ]]
[[ "$(docker inspect --format '{{json .HostConfig.SecurityOpt}}' "${db_container}")" == '["no-new-privileges:true"]' ]]
[[ -z "$(docker port "${db_container}")" ]]
[[ "$(docker inspect --format '{{.HostConfig.PidsLimit}}' "${db_container}")" == "128" ]]
[[ "$(docker inspect --format '{{.HostConfig.Memory}}' "${db_container}")" == "1073741824" ]]
[[ "$(docker inspect --format '{{.HostConfig.NanoCpus}}' "${db_container}")" == "750000000" ]]

inspect_output="$(docker inspect "${app_container}" "${db_container}")"
grep --quiet --fixed-strings "APP__DJANGO__SECRET_KEY_FILE=/run/secrets/django_secret_key" <<<"${inspect_output}"
grep --quiet --fixed-strings "APP__DATABASE__PASSWORD_FILE=/run/secrets/app_database_password" <<<"${inspect_output}"
grep --quiet --fixed-strings "POSTGRES_PASSWORD_FILE=/run/secrets/db_database_password" <<<"${inspect_output}"

if grep --quiet --extended-regexp '"(APP__DJANGO__SECRET_KEY|APP__DATABASE__PASSWORD|POSTGRES_PASSWORD)=' <<<"${inspect_output}" \
    || grep --quiet --extended-regexp 'container-contract-only-(secret-key|password)' <<<"${inspect_output}"; then
    echo "Container metadata contains a raw secret value" >&2
    exit 1
fi

if docker exec "${app_container}" touch /app/root-filesystem-write-probe >/dev/null 2>&1; then
    echo "App root filesystem is writable" >&2
    exit 1
fi

docker exec "${app_container}" sh -c 'touch /tmp/write-probe && rm /tmp/write-probe'

echo "Container security contract verified"
