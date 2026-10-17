---
type: spec
status: draft
tags: [mdq, loading, diagnostics, lint, architecture]
relatedTo: [GLOSSARY.md, BACKLOG.md]
---

# Loading module

Python only (`mdq-py/`). Do NOT touch `mdq-js/`; its port is a backlog item.

## Problem

- `mdq validate` runs parse -> JSON Schema -> lint on a dict and never builds a
  model. Rules that only the pydantic models enforce (e.g. ordering
  accept/reject overlap) never fire there.
- `mdq.parse_question` runs parse -> model and skips lint. It leaks a raw
  pydantic `ValidationError`, although its docstring promises `ParseError`.
- The document shape exists three times: `schema/*.yaml`, the TypedDicts in
  `mdq/types.py`, and `mdq/models.py`.
- Problems come in three unrelated types: `jsonschema.ValidationError`,
  `LintWarning`, pydantic `ValidationError`.
- `validator.DEFAULT_SCHEMA_DIR` points outside the package, so an installed
  `mdq` cannot validate.

## Goal

One module, `mdq/loading.py`, owns markdown/data -> model -> diagnostics. Every
caller (library, CLI, include resolution, tests) goes through it.

## Interface

All names are re-exported from `mdq`.

```python
Severity = Literal["error", "warning", "info"]

@dataclass(frozen=True)
class Diagnostic:
    severity: Severity
    code: str                        # lint rule name, or an error code
    message: str
    path: tuple[str | int, ...] = () # location in the document data
    line: int | None = None          # set only by parse errors, for now

@dataclass(frozen=True)
class Loaded(Generic[D]):            # D = Question | Exam
    document: D | None               # None if and only if there is an error
    diagnostics: list[Diagnostic]

    def __bool__(self) -> bool: ...  # True if and only if document is not None
    def validate(self, raise_on: Severity = "error") -> D: ...

Source = str | Path | IO[str] | Mapping[str, Any]
Format = Literal["mdq", "yaml", "json"]

@overload
def load(source: Source, *, kind: Literal["question"], format: Format | None = None,
         loader: QuestionLoader | None = None) -> Loaded[Question]: ...
@overload
def load(source: Source, *, kind: Literal["exam"], format: Format | None = None,
         loader: QuestionLoader | None = None) -> Loaded[Exam]: ...
@overload
def load(source: Source, *, kind: None = None, format: Format | None = None,
         loader: QuestionLoader | None = None) -> Loaded[Question | Exam]: ...

# Same overloads on `kind`, returning D instead of Loaded[D].
def parse(source, *, kind=None, format=None, loader=None,
          raise_on: Severity = "error") -> Question | Exam: ...

class InvalidDocument(MdqError):
    diagnostics: list[Diagnostic]
```

### `load`

- Never raises for problems in the document. It raises only for problems of
  the call: a file that does not exist, an unknown `format`.
- Source kinds:
  - `str`: document text, never a path. Markdown unless `format` says
    otherwise.
  - `Path`: the format comes from the suffix (`.mdq.md`/`.mdq` -> mdq,
    `.yaml`/`.yml` -> yaml, `.json` -> json). `format` overrides it. When
    `loader` is None, the default is `FileLoader(path.parent)`.
  - `IO[str]`: read, then handled as `str`.
  - `Mapping`: document data that was already parsed. It skips the parse step.
- Pipeline: parse (mdq/yaml/json) -> resolve includes -> model -> lint.
  - A parse failure (`ParseError`, YAML/JSON syntax) becomes one `error`
    diagnostic with `line` set when known. Stop.
  - A pydantic `ValidationError` becomes one `error` diagnostic per pydantic
    error. `path` = pydantic `loc`, `code` = pydantic error `type`. Stop.
  - Lint runs only when the model was built. All rules always run.
  - The parser's `unknown-frontmatter-key` warnings become diagnostics.
    They come first, ahead of the lint diagnostics.
- JSON Schema is NOT part of the pipeline.

### `Loaded`: result semantics

- `Loaded` is falsy if and only if no document was built. Warnings and info do
  not make it falsy.
- `validate(raise_on="error")` returns the document, or raises
  `InvalidDocument` (with all diagnostics) if any diagnostic has a severity at
  or above `raise_on` (`error` > `warning` > `info`). Errors always raise,
  because no document exists.
- Typical use:

  ```python
  if loaded := mdq.load(path):
      use(loaded.document)
  question = mdq.load(text).validate(raise_on="warning")
  ```

### `kind`

- `kind="question"` or `kind="exam"` checks what the document is and narrows
  the static return type, so callers that know the kind do not branch on
  `isinstance`.
- The parameter is `kind`, not `type`: `type` already means the question type
  (`multiple-choice`, ...) in documents, and it shadows the builtin.
- Mismatch (e.g. `kind="question"` on an exam): one `error` diagnostic,
  code `wrong-kind`, `document=None`. Detect the kind before model
  validation, so the caller gets this error instead of a list of pydantic
  errors.
- `kind=None` accepts both.

### `parse`

- Shortcut for `load(...).validate(raise_on)`, with the same `kind`
  overloads.
- `parse_question` and `parse_exam` are removed. They were pass-throughs to
  `parse(kind=...)`. Update the callers (CLI, tests).
- `ParseError` and pydantic `ValidationError` never leave the module.

### Severities of lint rules

- The `level` parameter ("default"/"strict") goes away.
- Rules that run today at default level -> `warning`.
- Rules that run today only at strict level (`_check_stem_is_a_paragraph`,
  `_check_stem_ellipsis_expanded`, `_check_locale_language_subtag`, and the
  strict branches inside the other checks) -> `info`.
- In C1 the linter still works on the dict. The loading module keeps the dict
  from the parse step (or `model.model_dump()` for a `Mapping` source; choose
  the one that keeps the current lint behavior) and passes it to the linter.
  Moving lint onto the models is a separate change.

### `LintWarning`

It merges into `Diagnostic`. `rule` -> `code`, and `severity` is added.
`lint_document` returns `list[Diagnostic]`.

## Include resolution

- `QuestionLoader.load(question_id)` returns the source: `str` (markdown) or
  `Mapping` (data). It no longer returns a `QuestionDict`.
- The exam load runs the full pipeline on each included source.
- Diagnostics of an included question are added to the exam's diagnostics,
  with the path prefixed by `("questions", i)`, where `i` is the index of the
  entry in the exam.
- An error in an included question is an error of the exam.
- `IncludeNotFound` becomes an `error` diagnostic at `("questions", i)`.
- `FileLoader` returns the file text. `DictLoader` returns what it holds.

## Removals

- `mdq/validator.py`: deleted. `ValidationResult`, `validate_document`,
  `validate_file`, `load_document`, `SchemaError`.
- `TYPE_SCHEMAS` moves to `mdq/scripts/schema_bundle.py`.
- `scaffold.QUESTION_TYPES` is derived from the models (the `type` literals of
  the `Question` union), not from `TYPE_SCHEMAS`.
- `jsonschema` and `referencing` move to the dev dependencies.
- The TypedDicts in `mdq/types.py` are no longer part of any public interface.
  They can stay as internal types of the parser. Delete the ones that nothing
  uses.

## CLI

- `mdq validate FILE`:
  - Uses `load`. Accepts `.mdq.md`, `.mdq`, `.yaml`, `.yml`, `.json`.
  - Drops `--type` and `--schema-dir`.
  - `--level default|strict` stays: `default` prints errors and warnings,
    `strict` also prints info.
  - Exit codes are unchanged: 1 when there is an error, 2 for call errors (e.g.
    the file does not exist), 0 otherwise.
  - Output: one line per diagnostic, with severity, code, path (and line when
    known), message.
- `mdq show` and `mdq export` use `parse`/`load` and catch `InvalidDocument`
  only. Remove the manual `FileLoader(file.parent)` in `show`.

## Schema/model agreement

A new test in `mdq-py/tests/` replaces the runtime JSON Schema check as the
guard against drift. It needs `jsonschema` (dev only).

- Every document under `examples/valid/` (the `.yaml`/`.json` files, and the
  `.yaml` sibling of each `.mdq.md`) validates against the bundled schema AND
  loads without errors.
- Every document under `examples/invalid/` fails the schema AND fails `load`
  with at least one error.
- A document that one side accepts and the other rejects is a failure. The
  test message says which side.

## Expected lint files (`.lint.json`)

Shared corpus for Python and Typescript.

- `<stem>.lint.json` sits next to the document. `foo.mdq.md` and `foo.yaml`
  share `foo.lint.json`.
- It exists only if the document has at least one warning or info diagnostic.
  If there is no file, zero diagnostics are expected.
- Content: a JSON array of `{"code": str, "severity": "warning" | "info",
  "path": [str | int, ...]}`. No message and no line.
- Errors are never listed. Invalid examples only assert "at least one error".
- The test compares the file with the actual diagnostics as a multiset,
  ignoring order. The match must be exact.
- Each valid document is loaded from each format it has (`.mdq.md` and
  `.yaml`), and both results are compared with the same `.lint.json`.

## Syntax errors (`examples/invalid/syntax/`)

- YAML or JSON that does not parse, repeats a key, or is not a mapping at the
  top level. These are not documents, so the schema tests leave them out;
  only `load` runs, and the `.lint.json` pins `yaml-syntax-error`,
  `json-syntax-error` or `invalid-document`.

## Resolved exams (`.resolved.yaml`)

- `<stem>.resolved.yaml` sits next to an exam that has `include` or
  `include-all` blocks, under `examples/valid/exam/`. Every such exam has one.
- Content: `questions`, the ids after `resolve` against `examples/valid/exam/`
  (the bank is that directory, recursively) and `with_ids`; `diagnostics`,
  what `resolve` reports, in the `.lint.json` shape.
- `max` keeps the first candidates, in the bank's sorted order, so the
  expectation is deterministic.
- The file is not a document: the corpus collectors skip the suffix.

### Corpus changes

- Move `examples/warnings/*.yaml` into `examples/valid/<type>/`, each with its
  `.lint.json`. Delete `examples/warnings/`.
- Update `mdq/testing.py`: remove `WARNINGS_DIR` and `WARNING_PARSED`, and
  add a helper that finds the `.lint.json` of a document.

### Snapshot script

`mdq-py/mdq/scripts/lint_snapshot.py`:

- For every valid example, compute the diagnostics with `load`.
- If the `.lint.json` does not exist and there are diagnostics, write it.
- If it exists, never write it. When the file differs from the actual
  diagnostics, print the file and the difference.
- `--overwrite PATH...` rewrites only the files given. There is no flag that
  rewrites all files.
- Exit status is non-zero when some existing file differs.

Review the first snapshot by hand before it is committed. A snapshot can freeze
lint bugs in place.

### `docs/lint-codes.md`

A table with code, severity, the question types it applies to, and a one-line
description. It is the reference list for mdq-js.

## Tests that move

- Example-pair tests: `load(md)` and `load(yaml sibling)` produce equal
  models, and equal lint diagnostics.
- Linter tests: go through `load(mapping)` and assert on diagnostic codes,
  not through `lint_document`.
- Parser tests that assert the dict shape (`parse_any`, TypedDict imports): go
  through `load`, or delete them if a triplet already covers the case.
- `test_examples.py`: its checks move into the schema/model agreement test and
  the `.lint.json` test.

## Commits

Keep each commit inside one subtree (see `AGENTS.md`, Git layout).

1. `mdq-py`: `loading.py`, `Diagnostic`, `InvalidDocument`, severities.
   `parse*`, the CLI and `QuestionLoader` switch to it.
2. `mdq-py`: delete `validator.py`, move `jsonschema` to dev, add the
   schema/model agreement test, drop `--type`/`--schema-dir`.
3. root: move `warnings/` into `valid/`, add the `.lint.json` files, add
   `docs/lint-codes.md`, add the Diagnostic entry to `GLOSSARY.md`.
4. `mdq-py`: the snapshot script and the `.lint.json` tests.

## Out of scope

- Line numbers from a source map (see `BACKLOG.md`).
- Moving lint rules onto the models (`.lint()`).
- The mdq-js port.

## Done means

- `mdq validate` and `mdq.parse*` run the same pipeline and report the same
  problems.
- A pydantic-only rule violation (e.g. an overlap between ordering accept and
  reject) makes `mdq validate` exit with 1.
- No module outside the tests imports `jsonschema`.
- Every valid example either has a reviewed `.lint.json` or produces no
  diagnostics.
- `uv run pytest` and `uv run mypy mdq` pass.
