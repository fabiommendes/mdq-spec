"""Every file in schema/ must itself be a structurally valid JSON Schema.

This does not validate any question *documents* -- it only checks that the
schema files (question-base.yaml, multiple-choice.yaml, ...) are
well-formed JSON Schemas, using jsonschema's own meta-schema checker.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml
from jsonschema.exceptions import SchemaError
from jsonschema.validators import validator_for

SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schema"
SCHEMA_FILES = sorted(SCHEMA_DIR.glob("*.yaml"))
SCHEMA_FILE_IDS = [path.name for path in SCHEMA_FILES]


def test_schema_dir_has_schemas() -> None:
    """Guard against a typo'd path silently turning every other test into a no-op."""
    assert SCHEMA_FILES, f"no *.yaml files found in {SCHEMA_DIR}"


@pytest.mark.parametrize("schema_path", SCHEMA_FILES, ids=SCHEMA_FILE_IDS)
def test_schema_file_is_valid_yaml_mapping(schema_path: Path) -> None:
    contents = yaml.safe_load(schema_path.read_text(encoding="utf-8"))
    assert isinstance(contents, dict), (
        f"{schema_path.name} must contain a YAML/JSON object at the top level, "
        f"got {type(contents).__name__}"
    )


@pytest.mark.parametrize("schema_path", SCHEMA_FILES, ids=SCHEMA_FILE_IDS)
def test_schema_is_compliant_jsonschema(schema_path: Path) -> None:
    """Each schema must validate against the meta-schema it declares via `$schema`."""
    contents = yaml.safe_load(schema_path.read_text(encoding="utf-8"))

    # Pick the validator class matching the schema's own "$schema" (falls
    # back to the latest draft jsonschema supports if unset), rather than
    # hard-coding a single draft, so this test still makes sense if a
    # schema file is ever bumped to a newer/older draft.
    validator_cls = validator_for(contents)

    try:
        validator_cls.check_schema(contents)
    except SchemaError as exc:
        pytest.fail(f"{schema_path.name} is not a compliant JSON Schema: {exc}")


@pytest.mark.parametrize("schema_path", SCHEMA_FILES, ids=SCHEMA_FILE_IDS)
def test_schema_declares_an_id(schema_path: Path) -> None:
    """Every schema needs a stable "$id" so relative $refs between files resolve."""
    contents = yaml.safe_load(schema_path.read_text(encoding="utf-8"))
    assert contents.get("$id"), f"{schema_path.name} is missing a top-level $id"


def test_schema_ids_are_unique() -> None:
    ids = [yaml.safe_load(p.read_text(encoding="utf-8")).get("$id") for p in SCHEMA_FILES]
    seen: set[str] = set()
    duplicates = {schema_id for schema_id in ids if schema_id in seen or seen.add(schema_id)}
    assert not duplicates, f"duplicate $id values across schema/: {duplicates}"
