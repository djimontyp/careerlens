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

deploy_root="${HOME}/.careerlens"
docker_config="$(mktemp --directory /dev/shm/careerlens-docker-config.XXXXXX)"
export DOCKER_CONFIG="${docker_config}"

cleanup() {
    docker logout >/dev/null 2>&1 || true
    rm -rf "${docker_config}"
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
compose run --rm app python src/manage.py migrate --noinput
compose up --detach --wait app
curl --fail --silent --retry 5 --retry-all-errors --retry-delay 2 http://127.0.0.1:9000/health >/dev/null
