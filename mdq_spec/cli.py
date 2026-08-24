"""
Command-line interface for mdq_spec.

Usage:
    mdq_spec validate <question.json|question.yaml>
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path
from typing import Annotated, Literal, Optional

import typer
from rich.console import Console

from .testing import EXAMPLES_ROOT
from .validator import SchemaError, ValidationResult, validate_file

app = typer.Typer(
    name="mdq_spec",
    help="Tools for the MDQ (Markdown Questions) file format.",
    add_completion=False,
    no_args_is_help=True,
)


Level = Literal["default", "strict"]

stderr = Console(file=sys.stderr, highlight=False, force_terminal=True)
stdout = Console(file=sys.stdout, highlight=False, force_terminal=True)


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


@app.command()
def examples(
    destination: Annotated[
        Path | None,
        typer.Argument(
            help="Directory to copy the example question files into (default: current working directory).",
        ),
    ] = None,
    force: Annotated[
        bool,
        typer.Option(
            ...,
            "--force",
            "-f",
            help="Overwrite existing files/directories in the destination.",
        ),
    ] = False,
) -> None:
    """
    Copy the bundled example question files into the current directory.
    """

    if not EXAMPLES_ROOT.exists():
        msg = f"[b red]instalation error:[/] examples directory not found: {EXAMPLES_ROOT}"
        stderr.print(msg)
        raise typer.Exit(code=2)

    if destination is None:
        destination = Path.cwd()

    n_copied = 0
    n_skipped = 0

    for entry in EXAMPLES_ROOT.rglob("*"):
        if entry.suffix not in (".yaml", ".yml", ".json", ".md", ".mdq", "mde"):
            continue
        if entry.is_dir():
            continue

        target = destination / entry.name
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and not force:
            n_skipped += 1
            continue

        shutil.copy2(entry, target)
        n_copied += 1

    msg = f"Copied {n_copied} item(s) and skipped {n_skipped} item(s) from {EXAMPLES_ROOT} to {destination}"
    stdout.print(f"[b green]success:[/] {msg}")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
