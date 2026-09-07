import os
import shutil
import stat
import subprocess
from pathlib import Path

import pytest

REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
LIFECYCLE_FILES = (
    ".env.example",
    "scripts/dev-env.sh",
    "scripts/worktree-archive.sh",
    "scripts/worktree-setup.sh",
)


def write_executable(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


@pytest.fixture
def isolated_repository(tmp_path: Path) -> tuple[Path, dict[str, str]]:
    repository = tmp_path / "repository"
    fake_bin = tmp_path / "bin"
    orca_root = tmp_path / "owner-root"
    repository.mkdir()
    fake_bin.mkdir()
    orca_root.mkdir()

    for relative_path in LIFECYCLE_FILES:
        source = REPOSITORY_ROOT / relative_path
        if not source.exists():
            pytest.fail(f"Missing lifecycle file: {relative_path}")
        destination = repository / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    (repository / "frontend").mkdir()
    (repository / "frontend" / "package-lock.json").write_text("{}\n", encoding="utf-8")

    write_executable(
        fake_bin / "docker",
        """#!/usr/bin/env bash
set -euo pipefail

case "$*" in
    "context show")
        printf '%s\\n' desktop-linux
        ;;
    "context inspect desktop-linux --format {{.Endpoints.docker.Host}}")
        printf '%s\\n' unix:///var/run/docker.sock
        ;;
    *" compose "*" down -v")
        exit "${FAKE_COMPOSE_DOWN_EXIT:-0}"
        ;;
esac
""",
    )
    write_executable(fake_bin / "npm", "#!/usr/bin/env bash\nexit 0\n")
    write_executable(
        fake_bin / "op",
        "#!/usr/bin/env bash\necho 'setup must not invoke op' >&2\nexit 91\n",
    )
    write_executable(fake_bin / "uv", "#!/usr/bin/env bash\nexit 0\n")

    subprocess.run(["git", "init", "--initial-branch=feature/orca"], cwd=repository, check=True, capture_output=True)

    environment = os.environ.copy()
    environment.update(
        {
            "PATH": f"{fake_bin}:{environment['PATH']}",
            "ORCA_ROOT_PATH": str(orca_root),
            "USE_OP": "0",
        }
    )
    return repository, environment


def run_script(repository: Path, environment: dict[str, str], script: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["bash", script],
        cwd=repository,
        env=environment,
        text=True,
        capture_output=True,
        check=False,
    )


def test_setup_is_idempotent_and_keeps_worktree_state_private(
    isolated_repository: tuple[Path, dict[str, str]],
) -> None:
    repository, environment = isolated_repository

    first_run = run_script(repository, environment, "scripts/worktree-setup.sh")

    assert first_run.returncode == 0, first_run.stderr
    worktree_environment = repository / ".env.worktree"
    first_content = worktree_environment.read_text(encoding="utf-8")
    assert stat.S_IMODE(worktree_environment.stat().st_mode) == 0o600
    assert "COMPOSE_PROJECT_NAME=careerlens-feature_orca-" in first_content
    assert "CAREERLENS_HTTP_PORT=" in first_content
    assert "CAREERLENS_FRONTEND_PORT=" in first_content
    assert "CAREERLENS_DEV_DB_PORT=" in first_content
    assert "APP__DATABASE__PASSWORD=" in first_content

    second_run = run_script(repository, environment, "scripts/worktree-setup.sh")

    assert second_run.returncode == 0, second_run.stderr
    assert worktree_environment.read_text(encoding="utf-8") == first_content


def test_setup_does_not_read_owner_fifo(
    isolated_repository: tuple[Path, dict[str, str]],
) -> None:
    repository, environment = isolated_repository
    os.mkfifo(repository / ".env")
    environment.pop("USE_OP")

    setup = run_script(repository, environment, "scripts/worktree-setup.sh")

    assert setup.returncode == 0, setup.stderr
    assert (repository / ".env.worktree").exists()


def test_setup_recognizes_same_worktree_with_different_path_case(
    isolated_repository: tuple[Path, dict[str, str]],
) -> None:
    repository, environment = isolated_repository
    subprocess.run(["git", "add", "."], cwd=repository, check=True, capture_output=True)
    subprocess.run(
        [
            "git",
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.com",
            "commit",
            "-m",
            "fixture",
        ],
        cwd=repository,
        check=True,
        capture_output=True,
    )
    linked_worktree = repository.parent / "linked"
    subprocess.run(
        ["git", "worktree", "add", "-b", "feature/linked", str(linked_worktree)],
        cwd=repository,
        check=True,
        capture_output=True,
    )
    case_variant = linked_worktree.with_name(linked_worktree.name.upper())
    linked_worktree.rename(case_variant)
    if not case_variant.is_dir() or linked_worktree.resolve() == case_variant.resolve():
        pytest.skip("requires a case-insensitive filesystem")

    first_run = run_script(case_variant, environment, "scripts/worktree-setup.sh")
    assert first_run.returncode == 0, first_run.stderr
    worktree_environment = case_variant / ".env.worktree"
    first_content = worktree_environment.read_text(encoding="utf-8")

    second_run = run_script(case_variant, environment, "scripts/worktree-setup.sh")

    assert second_run.returncode == 0, second_run.stderr
    assert worktree_environment.read_text(encoding="utf-8") == first_content


def test_archive_keeps_state_when_compose_cleanup_fails(
    isolated_repository: tuple[Path, dict[str, str]],
) -> None:
    repository, environment = isolated_repository
    setup = run_script(repository, environment, "scripts/worktree-setup.sh")
    assert setup.returncode == 0, setup.stderr
    worktree_environment = repository / ".env.worktree"
    os.mkfifo(repository / ".env")

    failed_environment = environment | {"FAKE_COMPOSE_DOWN_EXIT": "42"}
    failed_archive = run_script(repository, failed_environment, "scripts/worktree-archive.sh")

    assert failed_archive.returncode == 42
    assert worktree_environment.exists()

    successful_archive = run_script(repository, environment, "scripts/worktree-archive.sh")

    assert successful_archive.returncode == 0, successful_archive.stderr
    assert not worktree_environment.exists()
