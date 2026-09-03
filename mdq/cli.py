"""
Command-line interface for mdq.

Usage:
    mdq validate <question.json|question.yaml>
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path
from typing import Annotated, Literal

import typer
from pydantic import ValidationError as PydanticValidationError
from rich.console import Console
from rich.text import Text

from . import show as _show
from .errors import ParseError
from .loaders import FileLoader
from .schema_bundle import write_bundle
from .testing import EXAMPLES_ROOT
from .validator import SchemaError, ValidationResult, validate_file

app = typer.Typer(
    name="mdq",
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
    question_type: str | None = typer.Option(
        None,
        "--type",
        help=(
            "Question type to validate against (multiple-choice, "
            "multiple-selection, true-false, essay, numeric, short-answer, "
            "fill-in). Defaults to the document's own 'type' field."
        ),
    ),
    schema_dir: Path | None = typer.Option(
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


@app.command("bundle-schema")
def bundle_schema(
    output: Path = typer.Argument(
        Path("schema/mdq.schema.json"),
        help="Where to write the bundled JSON Schema file.",
    ),
    schema_dir: Path | None = typer.Option(
        None,
        "--schema-dir",
        help="Directory containing the MDQ *.yaml schemas (default: the repo's schema/ directory).",
    ),
) -> None:
    """
    Bundle every schema/*.yaml file into one self-contained JSON Schema
    document, so a consumer needs to fetch and resolve only a single file.
    """

    try:
        bundle = write_bundle(output, schema_dir=schema_dir)
    except SchemaError as exc:
        typer.echo(f"error: {exc}", err=True)
        raise typer.Exit(code=2)

    n_defs = len(bundle["$defs"])
    stdout.print(f"[b green]wrote[/] {output} ({n_defs} schemas bundled)")


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
        if entry.suffix not in (".yaml", ".yml", ".json", ".md", ".mdq"):
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


@app.command()
def show(
    file: Path = typer.Argument(
        ...,
        help="Path to a question or exam document (.mdq.md or .mdq), or - for stdin.",
    ),
    no_answer_key: bool = typer.Option(
        False,
        "--no-answer-key",
        help=(
            "Hide anything that reveals the correct answer (correctness "
            "marks, an essay's answer key, a numeric answer, ...), as if "
            "previewing the question for a student."
        ),
    ),
    width: int | None = typer.Option(
        None,
        "--width",
        help="Console width to render at (default: the terminal's own width).",
    ),
) -> None:
    """
    Show the parsed representation of a question or exam document.

    Renders rich-text fields (preamble, stem, epilogue, choice text,
    feedback, ...) as Markdown and everything else as structured
    metadata, so the document's shape is easy to check at a glance.
    """

    # Built fresh (rather than reusing the module-level `stdout`/`stderr`)
    # so each binds the *current* `sys.stdout`/`sys.stderr` -- important
    # under test runners that swap those out from under an
    # already-constructed Console.
    console = Console(
        file=sys.stdout, width=width, highlight=False, force_terminal=True
    )
    error_console = Console(file=sys.stderr, highlight=False, force_terminal=True)

    # Everything below that can embed a path or an exception message is
    # printed as a `Text` object, never spliced into a markup `str` --
    # `file` and `exc` can both carry document/filesystem content with
    # square brackets, which Rich would otherwise parse as markup (and,
    # for a stray closing tag like `[/]`, raise instead of print).
    loader = None
    if str(file) == "-":
        source = sys.stdin.read()
    else:
        if not file.is_file():
            error_console.print("[b red]error:[/]", Text(f"file not found: {file}"))
            raise typer.Exit(code=2)
        try:
            source = file.read_text(encoding="utf-8")
        except OSError as exc:
            error_console.print(
                "[b red]error:[/]", Text(f"could not read {file}: {exc}")
            )
            raise typer.Exit(code=2)
        # Resolve an exam's `include:` entries against its own directory,
        # the same convention `mdq.loaders.FileLoader` documents. Ignored
        # entirely for a question document, and for input read from stdin
        # (which has no directory to resolve against).
        loader = FileLoader(file.parent)

    try:
        _show.show_source(
            source, console, show_answer_key=not no_answer_key, loader=loader
        )
    except (ParseError, PydanticValidationError) as exc:
        error_console.print("[b red]error:[/]", Text(str(exc)))
        raise typer.Exit(code=1)


def main() -> None:
    app()


if __name__ == "__main__":
    main()
