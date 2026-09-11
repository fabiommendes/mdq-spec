"""
Bundle the individual `schema/*.yaml` files into one self-contained JSON
Schema document.

`mdq.validator` resolves the cross-file `$ref`s between `schema/*.yaml`
(e.g. `multiple-choice.yaml`'s `allOf` pulling in `question-base.yaml`)
by building a `referencing.Registry` from every file on disk. That is
fine for this repo's own validator, but a consumer who just wants "the
MDQ schema" as a single artifact -- an editor, a schema store, another
language's validator -- would otherwise need to fetch every sibling file
too and replicate that resolution.

JSON Schema has a standard answer for this: nest each schema, `$id` and
all, under the bundle's own `$defs`. A nested `$id` opens a new base URI
scope for any `$ref` inside it, so `multiple-choice.yaml`'s existing
`"./question-base.yaml"` reference still resolves -- to the sibling copy
embedded in the same bundle -- purely from the URI-scope rules every
JSON Schema validator already implements for a single document. No
`$ref` in any `schema/*.yaml` file needs rewriting, and no registry is
needed to validate against the result.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml
from jsonschema.validators import validator_for

from .validator import DEFAULT_SCHEMA_DIR, TYPE_SCHEMAS, SchemaError

__all__ = ["bundle_schemas", "write_bundle", "main"]

#: Where the bundle's own `$id` points, once assembled -- the sibling
#: filename it would occupy next to the schemas it bundles.
BUNDLE_FILENAME = "mdq.schema.json"


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

    # TYPE_SCHEMAS is `mdq.validator`'s own map of question type -> schema
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

    validator_cls = validator_for(bundle)
    validator_cls.check_schema(bundle)

    return bundle


def write_bundle(output_path: Path, schema_dir: Path | None = None) -> dict[str, Any]:
    """
    Write the bundle from `bundle_schemas` to `output_path` as JSON.

    Returns the bundle dict, so a caller (`main` included) can report on
    it without re-reading the file it just wrote.
    """

    bundle = bundle_schemas(schema_dir)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")
    return bundle


def main(argv: list[str] | None = None) -> int:
    """
    Entry point for `python -m mdq.schema_bundle`.

    Bundling is a maintenance step for this repo -- it regenerates a
    checked-in artifact from the schemas next to it -- rather than
    something a user of the `mdq` CLI ever needs, so it is reachable
    only by running this module directly.

    Args:
        argv: Command-line arguments, defaulting to `sys.argv[1:]`.

    Returns:
        A process exit code: 0 on success, 2 if the schemas could not be
        bundled.
    """

    parser = argparse.ArgumentParser(
        prog="python -m mdq.schema_bundle",
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
        default=Path("schema") / BUNDLE_FILENAME,
        help="where to write the bundled JSON Schema file (default: %(default)s)",
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
    args = parser.parse_args(argv)

    try:
        bundle = write_bundle(args.output, schema_dir=args.schema_dir)
    except SchemaError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(f"wrote {args.output} ({len(bundle['$defs'])} schemas bundled)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
