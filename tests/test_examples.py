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

from mdq_spec.testing import (
    INVALID_FILES,
    VALID_DIR,
    VALID_FILES,
    WARNING_FILES,
    WARNINGS_DIR,
    relative_id,
)
from mdq_spec.validator import SchemaError, validate_file


def test_examples_dir_has_documents() -> None:
    """
    Guard against a typo'd path silently making every test below a no-op.
    """
    assert VALID_FILES, f"no example .yml/.json files found under {VALID_DIR}"
    assert WARNING_FILES, f"no example .yml/.json files found under {WARNINGS_DIR}"


@pytest.mark.parametrize("path", VALID_FILES, ids=[relative_id(p) for p in VALID_FILES])
def test_example_is_valid(path: Path) -> None:
    try:
        result = validate_file(path)
    except SchemaError as exc:
        pytest.fail(f"{relative_id(path)}: {exc}")

    if not result.valid:
        details = "\n".join(
            f"  - {'/'.join(str(part) for part in err.path) or '<root>'}: {err.message}"
            for err in result.errors
        )
        pytest.fail(
            f"{relative_id(path)} failed validation as {result.question_type!r}:\n{details}"
        )


@pytest.mark.parametrize(
    "path", INVALID_FILES, ids=[relative_id(p) for p in INVALID_FILES]
)
def test_invalid_fixture_is_actually_invalid(path: Path) -> None:
    try:
        result = validate_file(path)
    except SchemaError:
        # Could not even be validated (e.g. missing/unknown 'type') --
        # that also counts as "not a valid document".
        return

    assert not result.valid, (
        f"{relative_id(path)} lives under examples/invalid/ but validated "
        f"successfully as {result.question_type!r}"
    )
