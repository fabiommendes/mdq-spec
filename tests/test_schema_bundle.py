"""
Verify `mdq.schema_bundle` produces a single, self-contained JSON Schema
that behaves the same as validating against `schema/*.yaml` directly --
see `tests/test_examples.py`, which this reuses fixtures from.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError as JsonSchemaError
from jsonschema.validators import validator_for

from mdq.schema_bundle import bundle_schemas, write_bundle
from mdq.testing import INVALID_PARSED, VALID_PARSED, relative_id
from mdq.validator import SchemaError, TYPE_SCHEMAS

BUNDLE = bundle_schemas()


def test_bundle_has_one_def_per_schema_file() -> None:
    schema_dir = Path(__file__).resolve().parent.parent / "schema"
    expected = {p.stem for p in schema_dir.glob("*.yaml")}
    assert set(BUNDLE["$defs"]) == expected


def test_bundle_is_compliant_jsonschema() -> None:
    validator_cls = validator_for(BUNDLE)
    try:
        validator_cls.check_schema(BUNDLE)
    except JsonSchemaError as exc:
        pytest.fail(f"bundled schema is not a compliant JSON Schema: {exc}")


def test_bundle_oneof_covers_every_standalone_type() -> None:
    """`oneOf` should have exactly one entry per schema in TYPE_SCHEMAS."""
    assert len(BUNDLE["oneOf"]) == len(TYPE_SCHEMAS)


def test_bundle_missing_schema_dir_raises() -> None:
    with pytest.raises(SchemaError):
        bundle_schemas(Path("/nonexistent/schema/dir"))


def test_write_bundle_round_trips(tmp_path: Path) -> None:
    output = tmp_path / "mdq.schema.json"
    written = write_bundle(output)
    assert output.exists()
    reloaded = yaml.safe_load(output.read_text(encoding="utf-8"))
    assert reloaded == written


@pytest.mark.parametrize(
    "path", VALID_PARSED, ids=[relative_id(p) for p in VALID_PARSED]
)
def test_valid_example_validates_against_bundle(path: Path) -> None:
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    question_type = document.get("type") or (
        "exam" if "questions" in document else None
    )
    assert question_type, (
        f"{relative_id(path)}: could not tell its type for the bundle lookup"
    )

    schema = {
        "$ref": f"#/$defs/{Path(TYPE_SCHEMAS[question_type]).stem}",
        "$defs": BUNDLE["$defs"],
    }
    validator = Draft202012Validator(schema)
    errors = list(validator.iter_errors(document))
    assert not errors, (
        f"{relative_id(path)} failed bundled validation as {question_type!r}:\n"
        + "\n".join(
            f"  - {'/'.join(map(str, e.path)) or '<root>'}: {e.message}" for e in errors
        )
    )


@pytest.mark.parametrize(
    "path", INVALID_PARSED, ids=[relative_id(p) for p in INVALID_PARSED]
)
def test_invalid_example_still_fails_against_bundle(path: Path) -> None:
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    question_type = document.get("type") if isinstance(document, dict) else None
    if question_type not in TYPE_SCHEMAS:
        # No type to look up a fragment by -- exactly the kind of
        # brokenness these fixtures are meant to exercise elsewhere
        # (see test_examples.py); nothing further to check here.
        return

    schema = {
        "$ref": f"#/$defs/{Path(TYPE_SCHEMAS[question_type]).stem}",
        "$defs": BUNDLE["$defs"],
    }
    validator = Draft202012Validator(schema)
    errors = list(validator.iter_errors(document))
    assert errors, (
        f"{relative_id(path)} lives under examples/invalid/ but validated "
        f"successfully against the bundle as {question_type!r}"
    )
