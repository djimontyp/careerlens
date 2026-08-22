#!/usr/bin/env bash

set -euo pipefail

archive="${1:?frontend archive is required}"
sha="${2:?source SHA is required}"
install_root="${3:-/var/www/careerlens}"

if [[ ! "${sha}" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Invalid source SHA" >&2
    exit 1
fi

if [[ ! -f "${archive}" ]]; then
    echo "Frontend archive does not exist" >&2
    exit 1
fi

releases_root="${install_root}/releases"
release_root="${releases_root}/${sha}"

install -d -m 755 "${releases_root}"

if [[ ! -d "${release_root}" ]]; then
    staging_root="$(mktemp -d "${releases_root}/.${sha}.new.XXXXXX")"

    cleanup() {
        if [[ "${staging_root}" != "${releases_root}/.${sha}.new."* ]]; then
            echo "Refusing unsafe cleanup path: ${staging_root}" >&2
            return 1
        fi
        rm -rf -- "${staging_root}"
    }

    trap cleanup EXIT
    tar --extract --gzip --file "${archive}" --directory "${staging_root}"

    if [[ ! -f "${staging_root}/index.html" ]]; then
        echo "Frontend archive does not contain index.html" >&2
        exit 1
    fi

    chmod -R u=rwX,go=rX "${staging_root}"
    mv "${staging_root}" "${release_root}"
    trap - EXIT
fi

if [[ ! -f "${release_root}/index.html" ]]; then
    echo "Frontend release does not contain index.html" >&2
    exit 1
fi

next_link="${install_root}/.current.${sha}.new"
rm -f "${next_link}"
ln -s "releases/${sha}" "${next_link}"

if mv -Tf "${next_link}" "${install_root}/current" 2>/dev/null; then
    exit 0
fi

rm -f "${install_root}/current"
mv "${next_link}" "${install_root}/current"
