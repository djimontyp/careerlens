#!/usr/bin/env bash

set -euo pipefail

gitleaks_image="zricethezav/gitleaks@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f"
repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
git_dir="$(git -C "${repository_root}" rev-parse --absolute-git-dir)"
common_dir="$(git -C "${repository_root}" rev-parse --path-format=absolute --git-common-dir)"

if [[ "${git_dir}" != "${common_dir}" ]]; then
    echo "Shared Git common directory is forbidden" >&2
    exit 1
fi

if [[ -e "${git_dir}/objects/info/alternates" ]]; then
    echo "Shared Git object alternates are forbidden" >&2
    exit 1
fi

forbidden_paths=0

while IFS= read -r -d '' path; do
    case "${path}" in
        .env* | */.env* | .agents/* | .claude/* | .codex/* | .superpowers/* | .mcp.json | .mcp.local.json | */.mcp.local.json | backups/* | */backups/* | media/* | */media/* | data/* | */data/* | *.db | *.db-* | *.sqlite | *.sqlite-* | *.sqlite3 | *.sqlite3-* | *.dump | *.backup | *.bak | *.sql | *.sql.gz | *.pem | *.key | *.p12 | *.pfx | id_rsa | */id_rsa | id_ed25519 | */id_ed25519)
            echo "Forbidden tracked path: ${path}" >&2
            forbidden_paths=$((forbidden_paths + 1))
            ;;
    esac
done < <(git -C "${repository_root}" ls-files -z)

if ((forbidden_paths > 0)); then
    exit 1
fi

run_gitleaks() {
    docker run --rm \
        --volume "${repository_root}:/repo:ro" \
        "${gitleaks_image}" "$@" \
        --config=/repo/.gitleaks-project.toml \
        --redact
}

run_gitleaks dir /repo
run_gitleaks git /repo

git -C "${repository_root}" fsck --full --no-dangling >/dev/null

echo "Publication boundaries verified"
