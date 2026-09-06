#!/usr/bin/env bash

set -Eeuo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
requested_context="${CAREERLENS_REQUESTED_DOCKER_CONTEXT:-${DOCKER_CONTEXT:-}}"
common_dir="$(git -C "$root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
main_repository=""
if [[ -n "$common_dir" ]]; then
    main_repository="$(cd "$common_dir/.." && pwd)"
fi

env_file="$root/.env"
if [[ ! -e "$env_file" && -n "$main_repository" && -e "$main_repository/.env" ]]; then
    env_file="$main_repository/.env"
elif [[ ! -e "$env_file" ]]; then
    env_file="$root/.env.example"
fi

load_dotenv() {
    local file="$1" line key value quote
    [[ -f "$file" ]] || return 0
    while IFS= read -r line || [[ -n "$line" ]]; do
        line="${line#"${line%%[![:space:]]*}"}"
        [[ -z "$line" || "$line" == \#* ]] && continue
        if [[ "$line" =~ ^export[[:space:]]+ ]]; then
            line="${line#export}"
            line="${line#"${line%%[![:space:]]*}"}"
        fi
        [[ "$line" == *=* ]] || {
            echo "Invalid dotenv line in $file" >&2
            exit 1
        }
        key="${line%%=*}"
        key="${key%"${key##*[![:space:]]}"}"
        [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || {
            echo "Invalid dotenv key in $file: $key" >&2
            exit 1
        }
        value="${line#*=}"
        value="${value#"${value%%[![:space:]]*}"}"
        value="${value%"${value##*[![:space:]]}"}"
        quote="${value:0:1}"
        if [[ ${#value} -ge 2 && ( "$quote" == "'" || "$quote" == '"' ) ]]; then
            [[ "${value: -1}" == "$quote" ]] || {
                echo "Unclosed dotenv quote in $file: $key" >&2
                exit 1
            }
            value="${value:1:${#value}-2}"
        elif [[ "$value" =~ ^(.*[^[:space:]])[[:space:]]+\#.*$ ]]; then
            value="${BASH_REMATCH[1]}"
        elif [[ "$value" == \#* ]]; then
            value=""
        fi
        export "$key=$value"
    done < "$file"
}

has_op_references=0
if [[ -p "$env_file" ]]; then
    has_op_references=1
elif [[ -f "$env_file" ]] && grep -Eq '^[[:space:]]*(export[[:space:]]+)?[A-Za-z_][A-Za-z0-9_]*=.*op://' "$env_file"; then
    has_op_references=1
fi

use_op="${USE_OP:-auto}"
if [[ "$use_op" == "auto" || -z "$use_op" ]]; then
    use_op="$has_op_references"
fi
if [[ "$use_op" != "0" && "$use_op" != "1" ]]; then
    echo "USE_OP must be auto, 0, or 1" >&2
    exit 2
fi
if [[ "$use_op" == "0" && "$has_op_references" == "1" ]]; then
    echo "USE_OP=0 cannot resolve op:// values or a 1Password FIFO" >&2
    exit 1
fi

if [[ "$use_op" == "1" && "${CAREERLENS_OP_READY:-0}" != "1" ]]; then
    op_bin="${OP_BIN:-op}"
    command -v "$op_bin" >/dev/null 2>&1 || {
        echo "Missing command: $op_bin" >&2
        exit 1
    }
    exec "$op_bin" run --env-file="$env_file" -- env \
        CAREERLENS_OP_READY=1 \
        CAREERLENS_REQUESTED_DOCKER_CONTEXT="$requested_context" \
        bash "$0" "$@"
fi

if [[ "${CAREERLENS_OP_READY:-0}" != "1" ]]; then
    load_dotenv "$env_file"
fi
load_dotenv "$root/.env.worktree"

if [[ -n "$requested_context" ]]; then
    DOCKER_CONTEXT="$requested_context"
elif [[ -z "${DOCKER_CONTEXT:-}" ]]; then
    command -v docker >/dev/null 2>&1 || {
        echo "Missing command: docker" >&2
        exit 1
    }
    current_context="$(docker context show 2>/dev/null || true)"
    current_endpoint="$(docker context inspect "$current_context" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
    if [[ "$current_endpoint" == unix://* || "$current_endpoint" == npipe://* ]]; then
        DOCKER_CONTEXT="$current_context"
    elif [[ "$(uname -s)" == "Darwin" ]] && docker context inspect desktop-linux >/dev/null 2>&1; then
        DOCKER_CONTEXT="desktop-linux"
    else
        echo "Set DOCKER_CONTEXT explicitly; refusing to select a remote Docker context" >&2
        exit 1
    fi
fi
export DOCKER_CONTEXT

exec env CAREERLENS_ENV_READY=1 "$@"
