import os
import shutil
import subprocess
from pathlib import Path

import pytest


@pytest.mark.parametrize("recipe", ["test", "typecheck", "deploy-check", "api-schema"])
def test_verification_commands_disable_inherited_development_access(tmp_path: Path, recipe: str) -> None:
    repository = Path(__file__).resolve().parents[2]
    shutil.copy2(repository / "justfile", tmp_path / "justfile")
    shutil.copytree(repository / "just", tmp_path / "just")
    fake_bin = tmp_path / "bin"
    fake_bin.mkdir()
    # Observe the recipe's process environment without running a nested suite or schema export.
    uv = fake_bin / "uv"
    uv.write_text(
        '#!/bin/sh\nprintf "%s\\n" "$APP__DJANGO__DEBUG" "$APP__DEV__AUTOLOGIN"\n',
        encoding="utf-8",
    )
    uv.chmod(0o755)

    result = subprocess.run(
        ["just", recipe],
        cwd=tmp_path,
        env=os.environ
        | {
            "PATH": f"{fake_bin}:{os.environ['PATH']}",
            "APP__DJANGO__DEBUG": "true",
            "APP__DEV__AUTOLOGIN": "true",
        },
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert result.stdout.splitlines() == ["false", "false"]
