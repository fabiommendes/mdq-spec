"""
Command-line interface for mdq_spec.

Usage:
    mdq_spec validate <question.json|question.yaml>
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal, Optional

import typer

from .validator import SchemaError, ValidationResult, validate_file

app = typer.Typer(
    name="mdq_spec",
    help="Tools for the MDQ (Markdown Questions) file format.",
    add_completion=False,
    no_args_is_help=True,
)


Level = Literal["default", "strict"]


@app.callback()
def _root() -> None:
    """
    Tools for the MDQ (Markdown Questions) file format.

    Keeping this (even empty) callback forces Typer to expose subcommands
    like `validate` instead of collapsing into a single top-level command,
    since Typer only does that collapse when a Typer app has no callback
    and exactly one registered command.
    """


def _print_result(file: Path, result: ValidationResult) -> int:
    if result.valid:
        typer.echo(f"OK    {file}  [{result.question_type}]")
    else:
        typer.echo(
            f"FAIL  {file}  [{result.question_type or 'unknown type'}]", err=True
        )
        for err in result.errors:
            location = "/".join(str(part) for part in err.path) or "<root>"
            typer.echo(f"  - {location}: {err.message}", err=True)

    # Warnings are advisory: they're printed either way, but never turn an
    # otherwise-OK result into a failing exit code.
    for warning in result.warnings:
        location = "/".join(str(part) for part in warning.path) or "<root>"
        typer.echo(f"  ! {location}: {warning.message}", err=True)

    return 0 if result.valid else 1


@app.command()
def validate(
    file: Path = typer.Argument(
        ...,
        help="Path to a question document (.json, .yaml, or .yml).",
    ),
    question_type: Optional[str] = typer.Option(
        None,
        "--type",
        help=(
            "Question type to validate against (multiple-choice, "
            "multiple-selection, true-false, essay, numeric). Defaults to "
            "the document's own 'type' field."
        ),
    ),
    schema_dir: Optional[Path] = typer.Option(
        None,
        "--schema-dir",
        help="Directory containing the MDQ *.yaml schemas (default: the repo's schema/ directory).",
    ),
    level: Level = typer.Option(
        "default",
        "--level",
        case_sensitive=False,
        help=(
            "Verification level for the lint checks that go beyond JSON "
            "Schema (duplicate choice ids/texts, blank text fields, ...). "
            "'strict' is accepted but currently behaves like 'default' -- "
            "no strict-only rules are implemented yet."
        ),
    ),
) -> None:
    """
    Validate a question file against its MDQ JSON Schema, and lint it
    for issues JSON Schema alone can't catch.
    """

    try:
        result = validate_file(
            file,
            question_type=question_type,
            schema_dir=schema_dir,
            level=level,
        )
    except SchemaError as exc:
        typer.echo(f"error: {exc}", err=True)
        raise typer.Exit(code=2)

    exit_code = _print_result(file, result)
    if exit_code:
        raise typer.Exit(code=exit_code)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
