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
import sys
from pathlib import Path
from typing import Any

import yaml
from jsonschema.exceptions import SchemaError as JsonSchemaError
from jsonschema.validators import validator_for

#: Root of the mdq-spec checkout.
MDQ_ROOT = Path(__file__).resolve().parent.parent

__all__ = [
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


def bundle_schemas(schema_dir: Path | None = None) -> dict[str, Any]:
    """
    Load every `schema/*.yaml` file and bundle them into one schema.

    The result's `$defs` has one entry per source file, keyed by its
    stem (`question-base`, `multiple-choice`, ...), each still carrying
    its own original `$id` unchanged. The top-level `oneOf` lists every
    standalone document type -- an exam or any one of the seven question
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

    bundle = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "$id": f"{base_url}/{BUNDLE_FILENAME}",
        "title": "MDQ document (bundled)",
        "description": (
            "Every MDQ document type -- an exam, or any one of the seven "
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
