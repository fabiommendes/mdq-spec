"""
Check that the specification, mdq-py and mdq-js share MAJOR.MINOR.

The versions are read from `schema/package.json`, `mdq-py/pyproject.toml` and
`mdq-js/package.json`. Only the patch number may differ between them.

Run it from the repository root with `uv run scripts/check_versions.py`. It
exits with 1 when the three disagree.
"""

from __future__ import annotations

import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

_VERSION = re.compile(r"^(\d+)\.(\d+)\.(\d+)")


def read_versions(root: Path = ROOT) -> dict[str, str]:
    """Return the version of each package, keyed by its manifest path."""
    py = tomllib.loads((root / "mdq-py/pyproject.toml").read_text("utf-8"))
    return {
        "schema/package.json": json.loads((root / "schema/package.json").read_text("utf-8"))["version"],
        "mdq-py/pyproject.toml": py["project"]["version"],
        "mdq-js/package.json": json.loads((root / "mdq-js/package.json").read_text("utf-8"))["version"],
    }


def check(versions: dict[str, str]) -> list[str]:
    """Return the problems found: an unparsable version or a MAJOR.MINOR that differs."""
    problems: list[str] = []
    lines: dict[str, tuple[str, str]] = {}
    for path, version in versions.items():
        match = _VERSION.match(version)
        if match is None:
            problems.append(f"{path}: version {version!r} is not MAJOR.MINOR.PATCH")
        else:
            lines[path] = (match.group(1), match.group(2))
    if len(set(lines.values())) > 1:
        detail = ", ".join(f"{path} {versions[path]}" for path in lines)
        problems.append(f"MAJOR.MINOR differs between the packages: {detail}")
    return problems


def main() -> int:
    versions = read_versions()
    problems = check(versions)
    for problem in problems:
        print(problem, file=sys.stderr)
    if not problems:
        print("versions ok: " + ", ".join(f"{p} {v}" for p, v in versions.items()))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
