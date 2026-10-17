---
type: spec
status: draft
tags: [mdq, lint, diagnostics, models, refactor]
relatedTo: [loading-module, unique-ids, rule-conformance, dev/architecture-review.md]
---

# Lint rules on the models (C2)

Python only (`mdq-py/`) plus the shared corpus and docs. Do NOT touch
`mdq-js/`. Candidate C2 of `dev/architecture-review.md`.

## Problem

- `lint_document(dict, question_type)` in `mdq/linter.py` works on raw
  dicts. It dispatches with an `if question_type == ...` chain and re-checks
  shapes that the models already guarantee (`_iter_choices`, `_is_number`).
- `mdq/loading.py` calls it three times (about `:420`, `:455`, `:469`), and
  the exam path lints its questions with its own loop.
- Six rules are "critical" in the spec docs, so they MUST be model errors,
  but the linter reports them as warnings (see "New errors").
- The ordering `accept`/`reject` overlap check raises a plain `ValueError`
  (`models.py`, `OrderingQuestion.check_accept_and_reject_disjoint`), so its
  diagnostic code is `value_error`.

## Rules

### `lint()` on the models

- Every question class and `Exam` get `lint(self) -> list[Diagnostic]`.
  - `BaseQuestion.lint()` runs the rules common to all questions.
  - Each subclass calls `super().lint()` and adds its own rules. A rule
    shared by some types only (for example the choice rules of
    multiple-choice, multiple-selection and true-false) lives in one helper
    that each of those classes calls.
  - `Exam.lint()` runs the exam rules, then calls `lint()` on each question
    and adds `("questions", i)` to the start of each diagnostic path.
- Paths stay the same as today, relative to the document root.
- `mdq/linter.py` becomes a helper module for the `lint()` methods, like
  `mdq/render.py` is for `render()`. Delete `lint_document`, the dispatch
  chain, and the helpers that only exist to check raw dict shapes.
- `mdq/loading.py` calls `document.lint()` once, after the model is built.
  Remove its per-question lint loop. `unknown-frontmatter-key` still comes
  from the parser, unchanged.
- The set of warning/info diagnostics that `load` returns for every corpus
  example does not change, except for the codes that become errors below.
  The `.lint.json` files are the check.
- Normalization in the models can remove the information that a rule needs
  (for example, a `comment` of only whitespace may become `None`). If a rule
  can no longer see its input on the model, do not drop the rule and do not
  guess: report it (see "Report").

### New errors

These rules become pydantic model validators that raise
`PydanticCustomError(code, message)`, as `_check_unique_choices` does. `load`
returns `document=None` for them. Keep the path that the lint rule reports
today.

| Code | Source | Rule |
| --- | --- | --- |
| `invalid-regex` | `short-answer.md:377-378` | a `regex`, or a `/`-delimited pattern in `accept`, `reject`, `preAccept`, `preReject` (also in fill-in short-answer blanks), must compile as an MDQ regex |
| `undefined-blank` | `fill-in.md:299` | every `[^id]` marker in the stem names a declared blank |
| `unreferenced-blank` | `fill-in.md:300` | every declared blank is referenced by a `[^id]` marker |
| `malformed-locale` | `base.md:251` | `locale` is a well-formed BCP 47 tag |
| `reserved-true-false-marker` | `true-false.md:209` | a true-false marker is never `X` or `x` |
| `blank-text-field` | `base.md:249` | `preamble`, `epilogue` and `stem` have at least one visible character |
| `accept-reject-overlap` | `ordering.md:334` | replaces today's `value_error` for ordering `accept`/`reject` overlap |

- `blank-text-field` splits: for `preamble`, `epilogue` and `stem` it is an
  error; for `title`, `author`, `comment` and `answerKey` it stays a
  warning with the same code. If the same code with two severities causes a
  problem in `loading` or the tests, use `blank-intro-field` for the error
  and say so in the report.
- Remove these rules from the lint side.
- `docs/lint-codes.md`: move the rows to the "Errors" table, alphabetical.
- Corpus:
  - Remove the matching entries from `examples/**/*.lint.json`. Delete a
    file if it becomes empty.
  - A `examples/valid/` document that has one of these diagnostics today
    must become valid (change the content, keep the purpose of the example)
    or move to `examples/invalid/`. List each case in the report.
  - Add one invalid example per new error. JSON Schema cannot express these
    rules, so they go in `examples/invalid/model-only/` (see
    `mdq/testing.py` and `tests/test_schema_agreement.py`). Use
    Brazil-inspired content (see `AGENTS.md`).

## Out of scope

- New rules, severity changes, and rules missing from the spec: they are in
  `dev/specs/to-do/rule-conformance.md`, done after this spec.

## Tests

- `load` returns `document=None` and one `error` with the code and path
  above for each new error.
- `lint()` called directly on a model returns the same diagnostics as
  `load` for that document.
- `Exam.lint()` returns a question's diagnostics with the
  `("questions", i, ...)` path.
- Migrate the tests of `lint_document` in `tests/test_linter.py` to call
  `lint()` on models. Delete tests for the rules that become errors, after
  the equivalent `load` test exists.

## Done means

- No `lint_document` and no `if question_type ==` chain in `mdq/linter.py`.
- `loading.py` lints with one `document.lint()` call.
- The seven codes above are errors from `load`.
- `uv run pytest` (except the known
  `tests/test_hypothesis.py::test_code_block_round_trips_verbatim` failure),
  `uv run mypy mdq` and `uv run ruff check` pass.

## Report

- Rules that could not move to the models as they are, and why.
- Corpus examples that changed or moved.
- Anything in the spec docs that is ambiguous, and how you read it.
