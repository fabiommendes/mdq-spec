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

from mdq.testing import (
    INVALID_PARSED,
    VALID_DIR,
    VALID_SOURCES,
    VALID_PARSED,
    WARNING_PARSED,
    WARNINGS_DIR,
    relative_id,
)
from mdq.validator import SchemaError, validate_file


def test_examples_dir_has_documents() -> None:
    """
    Guard against a typo'd path silently making every test below a no-op.
    """
    assert VALID_PARSED, f"no example .yml/.json files found under {VALID_DIR}"
    assert WARNING_PARSED, f"no example .yml/.json files found under {WARNINGS_DIR}"


@pytest.mark.parametrize(
    "path", VALID_PARSED, ids=[relative_id(p) for p in VALID_PARSED]
)
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
    "path", INVALID_PARSED, ids=[relative_id(p) for p in INVALID_PARSED]
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


@pytest.mark.parametrize(
    "path", WARNING_PARSED, ids=[relative_id(p) for p in WARNING_PARSED]
)
def test_warning_fixture_actually_warns(path: Path) -> None:
    """
    Files under examples/warnings/ are valid documents that a linter
    should still complain about. Assert both halves: a fixture that
    stopped validating, or stopped producing any warning, is no longer
    testing what it claims to.
    """
    try:
        result = validate_file(path, level="strict")
    except SchemaError as exc:
        pytest.fail(f"{relative_id(path)}: {exc}")

    assert result.valid, (
        f"{relative_id(path)} lives under examples/warnings/ but does not "
        f"validate as {result.question_type!r}"
    )
    assert result.warnings, (
        f"{relative_id(path)} lives under examples/warnings/ but the linter "
        f"reported nothing"
    )


@pytest.mark.parametrize(
    "path", VALID_SOURCES, ids=[relative_id(p) for p in VALID_SOURCES]
)
def test_example_source_validates_from_markdown(path: Path) -> None:
    """Regression: `.mdq.md` sources used to be read as YAML and fail."""
    result = validate_file(path)
    assert result.valid, [err.message for err in result.errors]
