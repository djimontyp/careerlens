#!/usr/bin/env bash

set -euo pipefail

read_value() {
    local name="$1"
    local value

    IFS= read -r -d '' value
    printf -v "${name}" '%s' "${value}"
}

variables=(
    CAREERLENS_IMAGE
    APP__DJANGO__ALLOWED_HOSTS
    APP__CORE__SITE_URL
    APP__AUTH__WORKOS__CLIENT_ID
    APP__AUTH__WORKOS__REDIRECT_URI
    APP__DATABASE__DATABASE
    APP__DATABASE__USER
    DATABASE_PASSWORD
    DJANGO_SECRET_KEY
    WORKOS_API_KEY
    DOCKERHUB_USERNAME
    DOCKERHUB_TOKEN
)

for variable in "${variables[@]}"; do
    read_value "${variable}"
done

RUNTIME_DATABASE_ROLE_SPLIT=false
if IFS= read -r -d '' RUNTIME_DATABASE_ROLE_SPLIT; then
    read_value RUNTIME_DATABASE_USER
    read_value RUNTIME_DATABASE_PASSWORD
else
    RUNTIME_DATABASE_ROLE_SPLIT=false
fi
if [[ "${RUNTIME_DATABASE_ROLE_SPLIT}" != true && "${RUNTIME_DATABASE_ROLE_SPLIT}" != false ]]; then
    echo "Runtime database role split must be true or false" >&2
    exit 1
fi
if [[ "${RUNTIME_DATABASE_ROLE_SPLIT}" == true ]]; then
    if [[ -z "${RUNTIME_DATABASE_USER:-}" || -z "${RUNTIME_DATABASE_PASSWORD:-}" ]]; then
        echo "Runtime database credentials must both be nonempty" >&2
        exit 1
    fi
    export RUNTIME_DATABASE_USER RUNTIME_DATABASE_PASSWORD
    export APP_DATABASE_PASSWORD_ENV=RUNTIME_DATABASE_PASSWORD
else
    unset RUNTIME_DATABASE_USER RUNTIME_DATABASE_PASSWORD APP_DATABASE_PASSWORD_ENV
fi

export APP__ENVIRONMENT=production
export COMPOSE_PROJECT_NAME=careerlens-prod
export CAREERLENS_IMAGE
export APP__DJANGO__ALLOWED_HOSTS
export APP__CORE__SITE_URL
export APP__AUTH__WORKOS__CLIENT_ID
export APP__AUTH__WORKOS__REDIRECT_URI
export APP__DATABASE__DATABASE
export APP__DATABASE__USER
export DATABASE_PASSWORD
export DJANGO_SECRET_KEY
export WORKOS_API_KEY

if [[ ! "${CAREERLENS_IMAGE}" =~ ^docker\.io/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$ ]]; then
    echo "Invalid immutable image reference" >&2
    exit 1
fi

rollback_only="${ROLLBACK_ONLY:-false}"
if [[ "${rollback_only}" != false && "${rollback_only}" != true ]]; then
    echo "ROLLBACK_ONLY must be true or false" >&2
    exit 1
fi

deploy_root="${HOME}/.careerlens"
if [[ -f "${deploy_root}/runtime-role-split.enabled" && "${RUNTIME_DATABASE_ROLE_SPLIT}" != true ]]; then
    echo "Runtime role split is already enabled; refusing fallback to migration credentials" >&2
    exit 1
fi
docker_config_base="${DOCKER_CONFIG_BASE:-/dev/shm}"
docker_config="$(mktemp --directory "${docker_config_base%/}/careerlens-docker-config.XXXXXX")"
export DOCKER_CONFIG="${docker_config}"

cleanup() {
    docker logout >/dev/null 2>&1 || true
    case "${docker_config}" in
        "${docker_config_base%/}"/careerlens-docker-config.*) rm -rf -- "${docker_config}" ;;
        *)
            echo "Refusing unsafe cleanup path: ${docker_config}" >&2
            return 1
            ;;
    esac
}

trap cleanup EXIT

compose() {
    docker compose --file "${deploy_root}/production.yml" "$@"
}

printf '%s' "${DOCKERHUB_TOKEN}" | docker login --username "${DOCKERHUB_USERNAME}" --password-stdin
unset DOCKERHUB_TOKEN DOCKERHUB_USERNAME
compose config --quiet
compose pull
compose up --detach --wait db
if [[ "${rollback_only}" == false ]]; then
    compose run --rm migrate
fi
compose up --detach --wait app
if [[ "${RUNTIME_DATABASE_ROLE_SPLIT}" == true ]]; then
    touch "${deploy_root}/runtime-role-split.enabled"
fi
curl --fail --silent --header "X-Forwarded-Proto: https" --retry 5 --retry-all-errors --retry-delay 2 http://127.0.0.1:9000/health >/dev/null
