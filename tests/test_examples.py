"""
Validate every example question document under examples/ against the
MDQ question schemas.

Any .yaml/.yml/.json file directly under examples/ is expected to be a
*valid* question document. Files under examples/invalid/ are expected to
be intentionally broken fixtures -- so instead of skipping them, we assert
that they still fail validation, to catch a fixture silently becoming
valid (e.g. after a schema change) and no longer testing what it claims
to.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from mdq_spec.validator import SchemaError, validate_file

ROOT = Path(__file__).resolve().parent.parent
EXAMPLES_DIR = ROOT / "examples"
INVALID_DIR = EXAMPLES_DIR / "invalid"
DOCUMENT_SUFFIXES = (".yaml", ".yml", ".json")


def _collect(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in DOCUMENT_SUFFIXES
    )


VALID_FILES = [
    path for path in _collect(EXAMPLES_DIR) if INVALID_DIR not in path.parents
]


def _relative_id(path: Path) -> str:
    return str(path.relative_to(EXAMPLES_DIR))


def test_examples_dir_has_documents() -> None:
    """
    Guard against a typo'd path silently making every test below a no-op.
    """
    assert VALID_FILES, f"no example .yaml/.yml/.json files found under {EXAMPLES_DIR}"


@pytest.mark.parametrize(
    "path", VALID_FILES, ids=[_relative_id(p) for p in VALID_FILES]
)
def test_example_is_valid(path: Path) -> None:
    try:
        result = validate_file(path)
    except SchemaError as exc:
        pytest.fail(f"{_relative_id(path)}: {exc}")

    if not result.valid:
        details = "\n".join(
            f"  - {'/'.join(str(part) for part in err.path) or '<root>'}: {err.message}"
            for err in result.errors
        )
        pytest.fail(
            f"{_relative_id(path)} failed validation as {result.question_type!r}:\n{details}"
        )
