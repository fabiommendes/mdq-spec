"""
Tests for `scripts/check_versions.py`.

Run from the repository root:

    uv run --no-project --with pytest pytest scripts/test_check_versions.py
"""

from __future__ import annotations

from check_versions import check, read_versions


def _versions(spec: str, py: str, js: str) -> dict[str, str]:
    return {"schema/package.json": spec, "mdq-py/pyproject.toml": py, "mdq-js/package.json": js}


def test_same_major_minor_passes_with_different_patches() -> None:
    assert check(_versions("0.2.0", "0.2.1", "0.2.7")) == []


def test_different_minor_fails() -> None:
    problems = check(_versions("0.2.0", "0.1.5", "0.2.0"))
    assert len(problems) == 1
    assert "MAJOR.MINOR" in problems[0]


def test_different_major_fails() -> None:
    assert check(_versions("1.0.0", "0.0.1", "1.0.0"))


def test_unparsable_version_fails() -> None:
    problems = check(_versions("0.2.0", "latest", "0.2.0"))
    assert any("mdq-py/pyproject.toml" in p for p in problems)


def test_repository_versions_agree() -> None:
    assert check(read_versions()) == []
