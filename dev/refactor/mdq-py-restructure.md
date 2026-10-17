---
type: plan
status: complete
tags: [mdq, mdq-py, architecture, refactor, public-api]
relatedTo: [architecture-review, loading-module, lint-on-models]
---

# Plan: restructure mdq-py around its public surface

Diagram and findings: `dev/refactor/mdq-py-structure.html`. Snapshot of
2026-09-28 (working tree with uncommitted C2/C6 work). Continues
`dev/architecture-review.md` (C3, C4, C5 are still open there).

## Goal

- The package tree shows the public surface. A first-time reader opens
  `mdq/__init__.py`, `models/`, `convert/` and sees the whole API.
- Public modules: `mdq`, `mdq.models`, `mdq.types`, `mdq.errors`,
  `mdq.convert`, `mdq.hypothesis`. `mdq.cli` exposes only `app`/`main` and is
  not API.
- Every other module is `_private` and belongs to one owner package.
- Nothing in the wheel reads the repo layout (`examples/`, `docs/`).

## Rules

- R1: A `_module` is imported only by its parent package or its siblings.
  Known exception: `cli/_show.py` uses `models/_render.py`.
- R2: Tests can import private modules (unit tests of `_regex`, `_slugify`,
  `_query`, converters). Host code and docs cannot.
- R3: `docs/api/` has one page per public module, not one per file.
- R4: No compatibility shims. The package is at 0.1.0 and unreleased on PyPI
  under the new API (confirm, see D3).

## Target public surface

| Module          | Names |
| --------------- | ----- |
| `mdq`           | `load`, `parse`, `Loaded`, `Diagnostic`, `Severity`, `Question`, `Exam`, `QuestionBank`, `FileLoader`, `DictLoader`, `MdqError`, `InvalidDocument` |
| `mdq.models`    | document tree classes and `QuestionScore`; no helper functions |
| `mdq.types`     | Literal aliases, response types, TypedDicts (single source) |
| `mdq.errors`    | exception hierarchy, incl. `InvalidDocument`, `IncludeNotFound` |
| `mdq.convert`   | `import_question`, `export_question`, `FORMATS` |
| `mdq.hypothesis`| `questions`, `exams`, per-type question strategies |

Removed from `mdq`: `ParseError` (`load`/`parse` never raise it; it stays in
`mdq.errors`).

## Phases

Each phase is one commit inside `mdq-py/`, with `pytest`, `mypy mdq` and
`ruff` green.

0. Commit the current working tree (C2/C6 work) first. Fix F1
   (`Exam.render` raises `NotImplementedError`) in a separate commit; it is a
   bug, not structure.
1. Out of the wheel:
   - `mdq/testing.py` -> `tests/_corpus.py` (drop `lint_json_sibling`).
   - `mdq/scripts/lint_snapshot.py` -> `mdq-py/scripts/lint_snapshot.py`.
     Update `mdq-js/docs/sync/testing.md` and `test_lint_corpus.py`.
   - `mdq/hypothesis/{aiken,gift,moodle_xml,slugs,schedule,frontmatter}.py`
     -> `tests/strategies/`.
   - `hypothesis` becomes the optional extra `mdq[hypothesis]`.
   - Remove the leftover `[tool.setuptools]` block.
2. Dead code and duplicates:
   - Delete `ExamScore`, `Exam.add_question`, `errors.{ValidationError,
     MissingIdError, EmptyQuestions, NodesRemaining}`, `md_tables`, unused
     aliases in `types.py`. `MissingIdError` is cited in `docs/responses.md`:
     check before deleting.
   - `types.py` owns every Literal alias; `models` imports them.
   - One `QUESTION_TYPES` (in `types`), one `COMMON_QUESTION_KEYS` (in
     `_parser`).
   - Fix stale `MdqModel.__str__`/`render` docstrings.
3. Private leaves at the top level:
   - `schedule.py` -> `_schedule.py`.
   - New `_markdown.py`: `md`, `reconstruct_blocks`,
     `find_forbidden_elements`, `find_misplaced_blank_markers` (out of
     `parser.py`). Models then use the parser only in `Exam.resolve`.
   - `errors.py` gets `InvalidDocument` and `IncludeNotFound`.
4. `parser.py` -> `_parser/` package, split by the existing sections
   (`_question`, `_frontmatter`, `_choices`, `_numeric`, `_ordering`,
   `_exam`). `__init__` exports `parse_question`, `parse_exam`, `is_exam`,
   `INHERITED_FIELDS`. Tests that use `parse_any`/`parse_file` move to
   `mdq.load` where possible. C4 (exam parsing into `MDQParser`) fits here or
   right after.
5. `models.py` -> `models/` package:
   - First the helpers: `render` -> `_render`, `linter` -> `_lint`, `regex`
     -> `_regex`, `query` -> `_query`, `slugify` -> `_slugify`.
   - Then split by question family, mirroring `docs/question-types/*`:
     `_base`, `_choice`, `_numeric`, `_text`, `_fill_in`, `_ordering`,
     `_exam`, `_score`. `__init__` re-exports the tree.
   - Module-level helpers (`numeric_matches`, `first_feedback`, ...) go to
     the family module that uses them. `numeric_value` is shared with
     `convert/_moodle_xml` (C5).
6. Pipeline and facade:
   - `loading.py` -> `_loading.py`, `loaders.py` -> `_banks.py` (ends the
     `loading`/`loaders` confusion, F6).
   - `mdq/__init__.py` exports the target surface.
7. `convert/`:
   - Format modules become `_aiken`, `_gift`, `_moodle_xml`;
     `convert/parser.py` -> `_string_parser.py`.
   - `FORMATS` constant replaces the `register_format` + `del` idiom.
   - C5: shared escaping/numeric helpers into `convert/_text.py`.
8. `cli.py` -> `cli/` package: `__init__` (app, main), `_validate`, `_new`
   (+ `scaffold.py`), `_convert`, `_show` (+ `show.py`). Entry point stays
   `mdq.cli:main`.
9. Docs and changelog:
   - `docs/api/`: 6 pages plus a CLI reference.
   - `mdq-py/CHANGELOG.md` `[Unreleased]`: breaking module moves, removed
     exports.
   - Update the module map in `mdq-js/docs/sync/` if it cites Python paths.

## Progress

- Phase 0 (commits d967efd, 81df11e) and F1 (d787c50): done.
- Phases 1-3 (1e75f0d, c2b7be4, 3fd07bc) and test fixes (a96eec6, 0f4cfc8): done.
- Kept on purpose: `errors.MissingIdError` (cited by `docs/responses.md`);
  the copy of `COMMON_QUESTION_KEYS` in `tests/strategies/frontmatter.py`
  (it catches drift between the docs and the parser); the `QUESTION_TYPES`
  subset in `hypothesis/documents.py` (types the strategies cover).
- Phase 4 (8d9a748): done. `mdq/parser.py` -> `mdq/_parser/` (`_question`
  keeps `MDQParser`/`parse_question`, git-mv'd from `parser.py`;
  `_frontmatter`/`_choices`/`_numeric`/`_ordering` are the leaf helpers;
  `_exam` holds `parse_exam`/`is_exam`/block-splitting, calling back into
  `_question.parse_question`). `reconstruct_blocks`/`find_forbidden_elements`
  moved out of `_markdown.py` into `_question.py`, which now uses
  `MDQParser` directly with no lazy import. `parse_any`/`parse_file`
  dropped (nothing in `mdq/` used them); `tests/_parse.py` has a small
  dispatch helper for the tests that did.
- Phase 6 (484437a): done. `loading.py` -> `_loading.py`,
  `loaders.py` -> `_banks.py`; `Source`/`Format`/`Kind`/`Ids` moved to
  `mdq.types`. `mdq/__init__.py` exports exactly the target surface
  (`ParseError` dropped, stays in `mdq.errors`).
- Phase 7 (77aa4d5): done. `convert/{base,aiken,gift,moodle_xml,parser}.py`
  -> `_base`/`_aiken`/`_gift`/`_moodle_xml`/`_string_parser`.
  `register_format`/`del register_format` replaced by a private
  registry dict in `_base.py`; `mdq.convert` exports
  `import_question`, `export_question`, `FORMATS`. Skipped C5 (shared
  `convert/_text.py` escaping/numeric helpers) -- not asked for in
  this pass, still a backlog candidate.
- Phase 8 (c24bef6): done. `cli.py` -> `cli/` package: `_app.py` holds
  the shared `typer.Typer` + `main`; `_validate.py`, `_new.py`
  (absorbs `scaffold.py`), `_convert.py`, `_show.py` (absorbs
  `show.py`) each register one command on import. `__init__.py`
  exposes only `app`/`main`. Dropped the unused module-level `stderr`
  Console left over from `cli.py`.
- Phase 9 (6f2aa60): done. `docs/api/`: one page per public module
  (`mdq`, `mdq.models`, `mdq.types`, `mdq.errors`, `mdq.convert`,
  `mdq.hypothesis`) plus a prose-only `mdq.cli` CLI reference page.
  New `mdq.errors.rst`; deleted the pages for modules that went
  private or away (loading, loaders, scaffold, show).
  `mdq-py/AGENTS.md` gained a "Package layout" section. Sphinx build
  (`uv run --with sphinx --with sphinx-mdinclude sphinx-build -b html
  docs /tmp/mdq-docs -q`) exits 0; the docstring-formatting
  warnings it prints predate this refactor. README.md/docs/_readme.md
  cited no module paths that moved, so neither needed edits.
- Phase 5 (c8c9656): done. `mdq/models.py` -> `mdq/models/` package.
  Step A git-mv'd `render`/`linter`/`regex`/`query`/`slugify` in as
  `_render`/`_lint`/`_regex`/`_query`/`_slugify`. Step B split by question
  family into `_base`/`_choice`/`_numeric`/`_text`/`_fill_in`/`_ordering`/
  `_exam`/`_score`. `models/__init__.py` re-exports the document tree
  only -- no helper functions, no Literal aliases (moved external
  `models.X` Literal-alias usages, e.g. `show.py`'s `NumericDomain` and
  `hypothesis/documents.py`'s `EssayInput`, to `mdq.types` directly).
  `ExamStart`/`ExamDuration` (Annotated field types, not Literal aliases)
  stayed in `_exam.py`, unexported -- nothing outside `models.py` used
  them. Cross-module pydantic forward refs (`BaseQuestion._exam`/`.exam`
  -> `Exam`, `score_response()` -> `QuestionScore`) needed no
  `model_rebuild()`: they resolve automatically once every extracted
  module imports what its own `Annotated[...]` fields use -- the one
  real bug along the way was a missing `Annotated` import in `_text.py`,
  not a cross-module forward-ref problem.

## Out of scope (backlog candidates)

- F2: `Exam.resolve` raises `ParseError`/pydantic errors instead of returning
  diagnostics like `load`.
- C3: one registry for question types (type tag -> class, template).

## Decisions (2026-09-28)

- D1: Converter format modules are private. `mdq.convert` exposes only
  `import_question`, `export_question` and `FORMATS`.
- D2: Split `models/` by question family in this refactor.
- D3: No shims. Old import paths break (the author is the only user).
- D4: F1 fixed first, in a separate commit (`Exam._render_lines`,
  `tests/test_exam_render.py`).
