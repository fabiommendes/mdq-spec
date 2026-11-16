"""
Tests for `scripts/check_mirrors.py`.

Run from the repository root:

    uv run --no-project --with pytest pytest scripts/test_check_mirrors.py
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import check_mirrors
from check_mirrors import local_tree, mirror_url, problem, remote_tree


def _git(root: Path, *args: str) -> str:
    return subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=root, check=True, capture_output=True, text=True,
    ).stdout.strip()


def test_equal_trees_have_no_problem() -> None:
    assert problem("mdq-js", "a" * 40, "a" * 40) is None


def test_different_trees_name_the_push_command() -> None:
    msg = problem("mdq-js", "a" * 40, "b" * 40)
    assert msg is not None
    assert "git subtree push --prefix=mdq-js mdq-js main" in msg


def test_local_tree_matches_the_tree_a_mirror_fetch_returns(tmp_path: Path, monkeypatch) -> None:
    # A "mirror" repository whose main holds the content of sub/ at the root.
    repo = tmp_path / "repo"
    mirror = tmp_path / "mirror"
    (repo / "sub").mkdir(parents=True)
    (repo / "sub" / "f.txt").write_text("x")
    _git(tmp_path, "init", "-q", "-b", "main", str(repo))
    _git(repo, "add", ".")
    _git(repo, "commit", "-q", "-m", "init")
    _git(tmp_path, "init", "-q", "-b", "main", str(mirror))
    (mirror / "f.txt").write_text("x")
    _git(mirror, "add", ".")
    _git(mirror, "commit", "-q", "-m", "init")
    monkeypatch.setattr(check_mirrors, "mirror_url", lambda name: str(mirror))
    assert remote_tree("sub", root=repo) == local_tree("sub", root=repo)
    (mirror / "f.txt").write_text("y")
    _git(mirror, "commit", "-qam", "change")
    assert remote_tree("sub", root=repo) != local_tree("sub", root=repo)


def test_mirror_urls_are_public_https() -> None:
    assert mirror_url("mdq-js") == "https://github.com/fabiommendes/mdq-js.git"
