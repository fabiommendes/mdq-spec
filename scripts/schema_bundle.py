# /// script
# requires-python = ">=3.13"
# dependencies = ["PyYAML>=6.0", "jsonschema>=4.18"]
# ///
"""
Bundle the individual `schema/*.yaml` files into one self-contained JSON
Schema document.

The test suite resolves the cross-file `$ref`s between `schema/*.yaml`
(e.g. `multiple-choice.yaml`'s `allOf` pulling in `question-base.yaml`)
by building a `referencing.Registry` from every file on disk (see
`tests/test_schema_agreement.py`). That is fine there, but a consumer
who just wants "the MDQ schema" as a single artifact -- an editor, a
schema store, another language's validator -- would otherwise need to
fetch every sibling file too and replicate that resolution.

JSON Schema has a standard answer for this: nest each schema, `$id` and
all, under the bundle's own `$defs`. A nested `$id` opens a new base URI
scope for any `$ref` inside it, so `multiple-choice.yaml`'s existing
`"./question-base.yaml"` reference still resolves -- to the sibling copy
embedded in the same bundle -- purely from the URI-scope rules every
JSON Schema validator already implements for a single document. No
`$ref` in any `schema/*.yaml` file needs rewriting, and no registry is
needed to validate against the result.

Run it from the repository root with `uv run scripts/schema_bundle.py`. It
writes the bundle to `schema/` and to the package source of each subtree
(`mdq-py/`, `mdq-js/`) that is present in the checkout. `--check` writes
nothing: it fails if a copy differs from a fresh bundle.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Callable

import yaml
from jsonschema.exceptions import SchemaError as JsonSchemaError
from jsonschema.validators import validator_for

#: Root of the mdq-spec checkout.
MDQ_ROOT = Path(__file__).resolve().parent.parent

__all__ = [
    "FRONTMATTER_SHORTHANDS",
    "TYPE_SCHEMAS",
    "SchemaError",
    "bundle_schemas",
    "write_bundle",
    "output_files",
    "main",
]


class SchemaError(Exception):
    """
    Raised for problems locating, loading, or bundling schemas.
    """


#: Maps the `type` discriminator used in question documents to the
#: schema file (relative to a schema directory) that defines that
#: question type.
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


#: Where the bundle's own `$id` points, once assembled -- the sibling
#: filename it would occupy next to the schemas it bundles.
BUNDLE_FILENAME = "mdq.schema.json"

DEFAULT_SCHEMA_DIR = MDQ_ROOT / "schema"

#: Each subtree ships a copy of the bundle with its package source. Maps
#: the subtree directory to the directory of its copy.
SUBTREE_SCHEMA_DIRS = {
    "mdq-py": Path("mdq-py") / "mdq",
    "mdq-js": Path("mdq-js") / "src",
}


#: The document that holds the frontmatter table shared by every question
#: type, and the schema that declares the matching properties.
BASE_STEM = "question-base"

#: Prefix of the `$defs` key of the frontmatter schema of a question type.
FRONTMATTER_DEF_PREFIX = "frontmatter-"


def _ref(defs: dict[str, Any], stem: str, field: str) -> dict[str, Any]:
    """
    A `$ref` to the property `field` of the schema `stem`, wherever the
    schema declares it: at the top level or in an `allOf` member.

    Raises:
        SchemaError: the schema has no such property.
    """

    schema = defs[stem]
    pointers = []
    if field in schema.get("properties", {}):
        pointers.append(f"#/properties/{field}")
    for index, member in enumerate(schema.get("allOf", [])):
        if isinstance(member, dict) and field in member.get("properties", {}):
            pointers.append(f"#/allOf/{index}/properties/{field}")
    if not pointers:
        raise SchemaError(f"{stem} has no property {field!r}")
    return {"$ref": schema["$id"] + pointers[0]}


def _tags_shorthand(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    owner = "exam" if stem == "exam" else BASE_STEM
    return {"anyOf": [_ref(defs, owner, "tags"), {"type": "string"}]}


def _pre_pattern_map(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": {"$ref": defs["short-answer"]["$id"] + "#/$defs/patternList"},
    }


def _blank_text_map(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    return {"type": "object", "additionalProperties": {"type": "string"}}


def _blank_domain_map(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": {
            "$ref": defs["fill-in"]["$id"] + "#/$defs/NumericBlank/properties/domain"
        },
    }


def _blank_decimal_places_map(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    return {
        "type": "object",
        "additionalProperties": {
            "$ref": defs["fill-in"]["$id"] + "#/$defs/NumericBlank/properties/decimalPlaces"
        },
    }


def _normalizations_shorthand(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    return {
        "anyOf": [
            _ref(defs, "ordering", "normalizations"),
            {"type": "string"},
        ]
    }


def _any_string(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    return {"type": "string"}


def _own_type(defs: dict[str, Any], stem: str) -> dict[str, Any]:
    return _ref(defs, stem, "type")


#: Frontmatter fields that a frontmatter table documents with a spelling the
#: schema does not describe, as (document stem, field) to the reason and a
#: function that builds the property schema of the frontmatter. The table
#: describes the frontmatter and the schema describes the AST.
#: `scripts/spec_audit.py` also reads the reasons.
FRONTMATTER_SHORTHANDS: dict[
    tuple[str, str], tuple[str, Callable[[dict[str, Any], str], dict[str, Any]]]
] = {
    ("question-base", "tags"): ("comma-delimited string shorthand", _tags_shorthand),
    ("exam", "tags"): ("comma-delimited string shorthand", _tags_shorthand),
    ("fill-in", "preAccept"): (
        "map shorthand, a field of each blank in the AST",
        _pre_pattern_map,
    ),
    ("fill-in", "preReject"): (
        "map shorthand, a field of each blank in the AST",
        _pre_pattern_map,
    ),
    ("fill-in", "incorrectFeedback"): (
        "map shorthand, a field of each blank in the AST",
        _blank_text_map,
    ),
    ("fill-in", "domain"): (
        "map shorthand, a field of each numeric blank in the AST",
        _blank_domain_map,
    ),
    ("fill-in", "decimalPlaces"): (
        "map shorthand, a field of each numeric blank in the AST",
        _blank_decimal_places_map,
    ),
    ("ordering", "normalizations"): (
        "a bare string is a comma-delimited list",
        _normalizations_shorthand,
    ),
    ("exam", "start"): (
        "the frontmatter spelling is normalized in the AST",
        _any_string,
    ),
    ("exam", "duration"): (
        "the frontmatter spelling is normalized in the AST",
        _any_string,
    ),
    ("question-base", "type"): (
        "each question type schema declares its own",
        _own_type,
    ),
}


def frontmatter_fields(doc_path: Path) -> list[str]:
    """
    The fields of the table under the `## Frontmatter` heading of a
    specification document, in table order.

    Raises:
        SchemaError: the document has no such heading or table.
    """

    fields: list[str] = []
    in_section = False
    for line in doc_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            if in_section:
                break
            in_section = line.strip() == "## Frontmatter"
            continue
        if in_section and line.startswith("|"):
            cell = line.strip().strip("|").split("|")[0].strip()
            if cell and cell != "Field" and not re.fullmatch(r"-+", cell):
                fields.append(cell)
    if not fields:
        raise SchemaError(f"{doc_path} has no `## Frontmatter` table")
    return fields


def frontmatter_schemas(defs: dict[str, Any], docs_dir: Path) -> dict[str, Any]:
    """
    Build the frontmatter schema of each question type and of the exam,
    keyed by `frontmatter-<type>`.

    A frontmatter may hold only the fields of the frontmatter table of its
    document and, for a question, of the base table. Each property refers to
    the property schema of the question type (or of the base) and no other
    property is valid. The key of a body field (`stem`, `choices`, ...) is
    not valid either. A shorthand of `FRONTMATTER_SHORTHANDS` has a schema
    of its own.

    The schema validates a frontmatter after the removal of each `null`
    value (question-base.md, "Frontmatter").
    """

    base_fields = frontmatter_fields(docs_dir / f"{BASE_STEM}.md")
    result: dict[str, Any] = {}
    for question_type in TYPE_SCHEMAS:
        if question_type == "exam":
            doc = docs_dir.parent / "exam.md"
        else:
            doc = docs_dir / f"{question_type}.md"
        own = frontmatter_fields(doc)
        tables = [(question_type, own)]  # (document stem, fields)
        if question_type != "exam":
            tables.append((BASE_STEM, base_fields))
        properties: dict[str, Any] = {}
        for stem, fields in tables:
            for field in fields:
                if field in properties:
                    continue
                shorthand = FRONTMATTER_SHORTHANDS.get((stem, field))
                if shorthand is not None:
                    properties[field] = shorthand[1](defs, question_type)
                else:
                    properties[field] = _ref(defs, stem, field)
        result[FRONTMATTER_DEF_PREFIX + question_type] = {
            "title": f"Frontmatter of a {question_type}",
            "description": (
                f"The fields that the frontmatter of a {question_type} in "
                "Markdown may hold: the frontmatter table of its document "
                "and, for a question, the one of the base type. Any other key "
                "is the `invalid-frontmatter-field` error. Validate the "
                "mapping after removing each key with a `null` value."
            ),
            "type": "object",
            "properties": properties,
            "additionalProperties": False,
        }
    return result


def bundle_schemas(schema_dir: Path | None = None) -> dict[str, Any]:
    """
    Load every `schema/*.yaml` file and bundle them into one schema.

    The result's `$defs` has one entry per source file, keyed by its
    stem (`question-base`, `multiple-choice`, ...), each still carrying
    its own original `$id` unchanged. It also has one `frontmatter-<type>`
    entry per question type and for the exam, built from the frontmatter
    tables of `docs/` by `frontmatter_schemas` (only when `docs/` is next
    to `schema_dir`). The top-level `oneOf` lists every
    standalone document type -- an exam or any one of the eight question
    types -- so the bundle validates "is this any MDQ document" outright,
    while `#/$defs/<type>` still validates one type on its own.

    Args:
        schema_dir: Directory containing the MDQ `*.yaml` schemas.
            Defaults to this repo's own `schema/` directory.

    Returns:
        The bundled schema, already checked against its own meta-schema.

    Raises:
        SchemaError: If `schema_dir` has no `*.yaml` files, or one of
            them has no top-level `$id` to nest it under.
    """

    schema_dir = Path(schema_dir) if schema_dir else DEFAULT_SCHEMA_DIR
    paths = sorted(schema_dir.glob("*.yaml"))

    if not paths:
        raise SchemaError(f"no *.yaml files found in {schema_dir}")

    defs: dict[str, Any] = {}
    for path in paths:
        contents = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(contents, dict) or not contents.get("$id"):
            raise SchemaError(f"{path.name} has no top-level $id; cannot bundle it")
        defs[path.stem] = contents

    # TYPE_SCHEMAS is this module's own map of question type -> schema
    # file -- reused here so "which schemas stand on their own" has one
    # source of truth, rather than a second list drifting from it.
    entry_ids = [defs[Path(filename).stem]["$id"] for filename in TYPE_SCHEMAS.values()]

    base_url = next(iter(defs.values()))["$id"].rsplit("/", 1)[0]

    docs_dir = schema_dir.parent / "docs" / "question-types"
    if docs_dir.is_dir():
        defs.update(frontmatter_schemas(defs, docs_dir))

    bundle = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"{base_url}/{BUNDLE_FILENAME}",
        "title": "MDQ document (bundled)",
        "description": (
            "Every MDQ document type -- an exam, or any one of the eight "
            "question types -- bundled from schema/*.yaml into a single "
            "self-contained file. Validate against the whole thing to "
            "accept any MDQ document, or against `#/$defs/<type>` (e.g. "
            "`#/$defs/multiple-choice`) to check one type specifically."
        ),
        "oneOf": [{"$ref": schema_id} for schema_id in entry_ids],
        "$defs": defs,
    }

    try:
        validator_for(bundle).check_schema(bundle)
    except JsonSchemaError as exc:
        raise SchemaError(f"the bundle is not a valid JSON Schema: {exc.message}") from exc
    return bundle


def output_files(root: Path = MDQ_ROOT) -> tuple[list[Path], list[str]]:
    """
    Find where the bundle goes in the checkout at `root`.

    Returns:
        The output files, and the subtrees skipped because their package
        directory is not in the checkout.
    """

    files = [root / "schema" / BUNDLE_FILENAME]
    skipped = []
    for subtree, schema_dir in SUBTREE_SCHEMA_DIRS.items():
        if (root / schema_dir).is_dir():
            files.append(root / schema_dir / BUNDLE_FILENAME)
        else:
            skipped.append(subtree)
    return files, skipped


def write_bundle(output_path: Path, schema_dir: Path | None = None) -> dict[str, Any]:
    """
    Write the bundle from `bundle_schemas` to `output_path` as JSON.

    Returns the bundle dict, so a caller (`main` included) can report on
    it without re-reading the file it just wrote.
    """

    bundle = bundle_schemas(schema_dir)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(_dump(bundle), encoding="utf-8")
    return bundle


def _dump(bundle: dict[str, Any]) -> str:
    return json.dumps(bundle, indent=2) + "\n"


def main(argv: list[str] | None = None) -> int:
    """
    Entry point for `uv run scripts/schema_bundle.py`.

    Args:
        argv: Command-line arguments, defaulting to `sys.argv[1:]`.

    Returns:
        A process exit code: 0 on success, 1 if `--check` found a stale
        copy, 2 if the schemas could not be bundled.
    """

    parser = argparse.ArgumentParser(
        prog="scripts/schema_bundle.py",
        description=(
            "Bundle every schema/*.yaml file into one self-contained JSON "
            "Schema document, so a consumer needs to fetch and resolve only "
            "a single file."
        ),
    )
    parser.add_argument(
        "output",
        nargs="?",
        type=Path,
        default=None,
        help=(
            "where to write the bundled JSON Schema file "
            "(default: schema/ and each subtree present in the checkout)"
        ),
    )
    parser.add_argument(
        "--schema-dir",
        type=Path,
        default=None,
        help=(
            "directory containing the MDQ *.yaml schemas "
            "(default: the repo's schema/ directory)"
        ),
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="write nothing; fail if an output file differs from a fresh bundle",
    )
    args = parser.parse_args(argv)

    try:
        bundle = bundle_schemas(args.schema_dir)
    except SchemaError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if args.output:
        files, skipped = [args.output], []
    else:
        files, skipped = output_files()
    for subtree in skipped:
        print(f"skip {subtree}: not in this checkout")

    if args.check:
        expected = _dump(bundle)
        stale = [
            path
            for path in files
            if not path.exists() or path.read_text(encoding="utf-8") != expected
        ]
        for path in stale:
            print(f"error: {_display(path)} is out of date", file=sys.stderr)
        if stale:
            print("run `uv run scripts/schema_bundle.py` to update it", file=sys.stderr)
            return 1
        print(f"ok {', '.join(_display(path) for path in files)}")
        return 0

    for path in files:
        write_bundle(path, schema_dir=args.schema_dir)
    written = ", ".join(_display(path) for path in files)
    print(f"wrote {written} ({len(bundle['$defs'])} schemas bundled)")
    return 0


def _display(path: Path) -> str:
    """Show `path` relative to the repository root, if it is inside it."""
    path = Path(path).resolve()
    return str(path.relative_to(MDQ_ROOT)) if path.is_relative_to(MDQ_ROOT) else str(path)


if __name__ == "__main__":
    raise SystemExit(main())
