#!/usr/bin/env bash

set -Eeuo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
common_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
branch="${ORCA_WORKSPACE_NAME:-$(git branch --show-current)}"

if [[ -z "$branch" || "$branch" == "main" || "$branch" == "master" ]]; then
    echo "Cannot set up an isolated environment for an empty, main, or master branch" >&2
    exit 1
fi

docker_context="$(bash "$root/scripts/dev-env.sh" bash -c 'printf "%s" "$DOCKER_CONTEXT"')"

DOCKER_CONTEXT="$docker_context" python3 - "$common_dir" "$root" "$branch" <<'PYTHON'
import fcntl
import hashlib
import os
import re
import secrets
import socket
import subprocess
import sys
from pathlib import Path


common_dir = Path(sys.argv[1])
worktree_dir = Path(sys.argv[2])
branch = sys.argv[3]
docker_context = os.environ["DOCKER_CONTEXT"]
environment_path = worktree_dir / ".env.worktree"
lock_path = common_dir / "worktree-setup.lock"


def read_environment(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.fullmatch(r"([A-Za-z_][A-Za-z0-9_]*)=(.*)", line)
        if match:
            values[match.group(1)] = match.group(2).strip("\"'")
    return values


def port_available(port: int, reserved: set[int], hosts: tuple[str, ...]) -> bool:
    if port in reserved:
        return False
    for host in hosts:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as listener:
            try:
                listener.bind((host, port))
            except OSError:
                return False
    return True


def project_owns_port(port: int, project_name: str) -> bool:
    result = subprocess.run(
        [
            "docker",
            f"--context={docker_context}",
            "ps",
            "--filter",
            f"label=com.docker.compose.project={project_name}",
            "--format",
            "{{.Ports}}",
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0 and re.search(rf"(?<!\d){port}->", result.stdout) is not None


def resolve_port(
    existing: str | None,
    first_port: int,
    reserved: set[int],
    hosts: tuple[str, ...],
    project_name: str,
) -> int:
    if existing and existing.isdigit():
        port = int(existing)
        if port not in reserved and (port_available(port, reserved, hosts) or project_owns_port(port, project_name)):
            reserved.add(port)
            return port
    for port in range(first_port, 65536):
        if port_available(port, reserved, hosts):
            reserved.add(port)
            return port
    raise RuntimeError(f"No available port starting from {first_port}")


with lock_path.open("w", encoding="utf-8") as lock_file:
    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
    identity = hashlib.sha256(f"{branch}:{worktree_dir}".encode()).hexdigest()[:8]
    branch_slug = re.sub(r"[^a-z0-9]", "_", branch.lower()).strip("_")[:20]
    project_name = f"careerlens-{branch_slug}-{identity}"
    database_name = f"careerlens_{branch_slug}_{identity}"
    existing_environment = read_environment(environment_path)

    reserved_ports: set[int] = set()
    worktree_list = subprocess.run(
        ["git", "worktree", "list", "--porcelain"],
        capture_output=True,
        text=True,
        check=False,
    )
    for line in worktree_list.stdout.splitlines():
        if not line.startswith("worktree "):
            continue
        sibling = Path(line.removeprefix("worktree "))
        if sibling.resolve() == worktree_dir.resolve():
            continue
        sibling_environment = read_environment(sibling / ".env.worktree")
        for key in ("CAREERLENS_HTTP_PORT", "CAREERLENS_FRONTEND_PORT", "CAREERLENS_DEV_DB_PORT"):
            value = sibling_environment.get(key, "")
            if value.isdigit():
                reserved_ports.add(int(value))

    offset = int(identity, 16) % 100
    http_port = resolve_port(
        existing_environment.get("CAREERLENS_HTTP_PORT"),
        9090 + offset,
        reserved_ports,
        ("0.0.0.0", "127.0.0.1"),
        project_name,
    )
    frontend_port = resolve_port(
        existing_environment.get("CAREERLENS_FRONTEND_PORT"),
        5173 + offset,
        reserved_ports,
        ("0.0.0.0", "127.0.0.1"),
        project_name,
    )
    database_port = resolve_port(
        existing_environment.get("CAREERLENS_DEV_DB_PORT"),
        5433 + offset,
        reserved_ports,
        ("127.0.0.1",),
        project_name,
    )
    database_password = existing_environment.get("APP__DATABASE__PASSWORD") or secrets.token_hex(16)

    content = "\n".join(
        (
            f"COMPOSE_PROJECT_NAME={project_name}",
            f"CAREERLENS_HTTP_PORT={http_port}",
            f"CAREERLENS_FRONTEND_PORT={frontend_port}",
            f"CAREERLENS_DEV_DB_PORT={database_port}",
            f"DOCKER_CONTEXT={docker_context}",
            "APP__ENVIRONMENT=development",
            "APP__DJANGO__DEBUG=true",
            "APP__DEV__AUTOLOGIN=true",
            f"APP__CORE__SITE_URL=http://localhost:{frontend_port}",
            f"APP__AUTH__WORKOS__REDIRECT_URI=http://localhost:{frontend_port}/callback/",
            f"APP__DATABASE__DATABASE={database_name}",
            f"APP__DATABASE__USER={database_name}",
            f"APP__DATABASE__PASSWORD={database_password}",
            "APP__DATABASE__HOST=127.0.0.1",
            f"APP__DATABASE__PORT={database_port}",
            "",
        )
    )
    descriptor = os.open(environment_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as environment_file:
        environment_file.write(content)
    environment_path.chmod(0o600)

print(
    f"Isolated environment ready: {project_name} "
    f"(frontend={frontend_port}, backend={http_port}, database={database_port})"
)
PYTHON

npm --prefix "$root/frontend" ci --prefer-offline
uv sync --frozen
