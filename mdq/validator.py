"""
Load MDQ JSON Schemas and validate question documents against them.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from jsonschema import Draft202012Validator
from jsonschema.exceptions import ValidationError
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

from .linter import LEVELS, LintWarning, lint_document

__all__ = [
    "SchemaError",
    "ValidationResult",
    "validate_document",
    "validate_file",
    "load_document",
]

# The schema/ directory lives at the root of the mdq.spec repo, one level
# above this package.
DEFAULT_SCHEMA_DIR = Path(__file__).resolve().parent.parent / "schema"

# Maps the `type` discriminator used in question documents to the schema
# file (relative to a schema directory) that defines that question type.
TYPE_SCHEMAS = {
    "multiple-choice": "multiple-choice.yaml",
    "multiple-selection": "multiple-selection.yaml",
    "true-false": "true-false.yaml",
    "essay": "essay.yaml",
    "numeric": "numeric.yaml",
    "short-answer": "short-answer.yaml",
    "fill-in": "fill-in.yaml",
    "ordering": "ordering.yaml",
    "exam": "exam.yaml",
}


class SchemaError(Exception):
    """
    Raised for problems locating or loading schemas/documents.

    This is distinct from a *validation* failure (an instance that fails
    the schema): SchemaError means we could not even run the validation.
    """


@dataclass
class ValidationResult:
    valid: bool
    question_type: str | None
    errors: list[ValidationError] = field(default_factory=list)

    #: Issues that go beyond what JSON Schema can express (see
    #: mdq.linter). These never affect `valid` -- they're advisory,
    #: not hard failures.
    warnings: list[LintWarning] = field(default_factory=list)


def load_document(path: Path) -> Any:
    """
    Load a JSON or YAML question document from disk.
    """

    path = Path(path)
    if not path.exists():
        raise SchemaError(f"file not found: {path}")

    text = path.read_text(encoding="utf-8")
    suffix = path.suffix.lower()

    if suffix == ".json":
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise SchemaError(f"could not parse {path} as JSON: {exc}") from exc

    if suffix in (".yaml", ".yml"):
        try:
            return yaml.safe_load(text)
        except yaml.YAMLError as exc:
            raise SchemaError(f"could not parse {path} as YAML: {exc}") from exc

    # Unknown extension: YAML is a superset of JSON, so a plain YAML parse
    # handles both.
    try:
        return yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise SchemaError(f"could not parse {path} as JSON or YAML: {exc}") from exc


def build_registry(schema_dir: Path) -> Registry:
    """
    Build a `referencing.Registry` from every *.yaml schema in schema_dir.

    Each schema is registered under its own `$id`, so relative `$ref`s
    between schema files (e.g. multiple-choice.yaml referring to
    `./question-base.yaml`, which resolves to the sibling file's `$id`)
    resolve entirely from local disk, without any network access.
    """

    resources = []
    for schema_path in sorted(Path(schema_dir).glob("*.yaml")):
        contents = yaml.safe_load(schema_path.read_text(encoding="utf-8"))
        schema_id = contents.get("$id") if isinstance(contents, dict) else None
        if not schema_id:
            continue
        resource = Resource.from_contents(contents, default_specification=DRAFT202012)
        resources.append((schema_id, resource))
    return Registry().with_resources(resources)


def load_schema(question_type: str, schema_dir: Path) -> dict:
    try:
        filename = TYPE_SCHEMAS[question_type]
    except KeyError:
        valid = ", ".join(sorted(TYPE_SCHEMAS))
        raise SchemaError(
            f"unknown question type {question_type!r}; expected one of: {valid}"
        ) from None

    schema_path = Path(schema_dir) / filename
    if not schema_path.exists():
        raise SchemaError(f"schema file not found: {schema_path}")
    return yaml.safe_load(schema_path.read_text(encoding="utf-8"))


def validate_document(
    document: Any,
    question_type: str | None = None,
    schema_dir: Path | None = None,
    level: str = "default",
) -> ValidationResult:
    """
    Validate an already-loaded document (a dict) against its MDQ schema.

    Besides JSON Schema validation (`result.errors`), this also runs the
    mdq.linter checks (`result.warnings`) for problems that require
    real logic to catch -- e.g. duplicate choice ids, blank-but-non-empty
    text fields -- rather than pure schema shape. Warnings never affect
    `result.valid`.

    `level` selects the verification level ("default" or "strict"); see
    mdq.linter for details. Invalid values raise ValueError.
    """

    if level not in LEVELS:
        raise ValueError(
            f"unknown verification level {level!r}; expected one of {LEVELS}"
        )

    schema_dir = Path(schema_dir) if schema_dir else DEFAULT_SCHEMA_DIR

    if not isinstance(document, dict):
        raise SchemaError(
            "document must be a JSON/YAML object (mapping) at the top level"
        )

    question_type = question_type or document.get("type")
    if not question_type:
        raise SchemaError(
            "could not determine question type: the document has no 'type' "
            "field and none was given via --type"
        )

    schema = load_schema(question_type, schema_dir)
    registry = build_registry(schema_dir)
    validator = Draft202012Validator(schema, registry=registry)

    errors = sorted(
        validator.iter_errors(document), key=lambda e: list(map(str, e.path))
    )

    return ValidationResult(
        valid=not errors,
        question_type=question_type,
        errors=errors,
        warnings=lint_document(document, question_type, level=level),
    )


def validate_file(
    path: Path,
    question_type: str | None = None,
    schema_dir: Path | None = None,
    level: str = "default",
) -> ValidationResult:
    """
    Load a JSON/YAML question file from disk and validate it.
    """

    document = load_document(Path(path))
    return validate_document(
        document,
        question_type=question_type,
        schema_dir=schema_dir,
        level=level,
    )
