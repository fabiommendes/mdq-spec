---
type: spec
status: draft
tags: [mdq, ids, slugify, diagnostics, models]
relatedTo: [loading-module, docs/exam.md, docs/question-types/multiple-choice.md]
---

# Unique ids are errors

Python only (`mdq-py/`) plus the shared corpus. Do NOT touch `mdq-js/`.

## Problem

- The spec marks these as critical (`docs/question-types/*.md`, "critical"
  rows), but the linter only reports them as warnings:
  - `duplicate-choice-id` and `duplicate-choice-text` (multiple-choice,
    multiple-selection, true-false, and the choices of a fill-in choice
    blank);
  - `duplicate-blank-id` (fill-in).
- `docs/exam.md` § Question ids now requires unique question ids.
  `duplicate-question-id` is a warning too.
- The parser derives choice ids with its own `_slugify`
  (`mdq/parser.py:1438-1458`, `_assign_choice_ids` at about `:1810`). It does
  not disambiguate, so different texts can get the same id: `Brasília` and
  `Brasilia` both become `brasilia`, and `São Paulo!` and `São Paulo?` both
  become `sao-paulo`. `mdq/slugify.py` has a strategy that disambiguates
  (`loose`), but nothing uses it.

## Rules

### Duplicates are errors

- The four rules become pydantic model validators, so they are `error`
  diagnostics, and `load` returns `document=None`.
  - `duplicate-choice-id`: ids of the choices of one question, or of one
    fill-in choice blank.
  - `duplicate-choice-text`: same scope. Compare texts with the same
    normalization the linter uses today (`linter._visual_key`: whitespace
    collapsed outside code spans). Move that helper where the models can use
    it.
  - `duplicate-blank-id`: blank ids of one fill-in question.
  - `duplicate-question-id`: question ids of one exam, after includes resolve
    and after implicit ids (`q1`, `q2`, ...) are assigned. See the list of
    cases in `docs/exam.md` § Question ids.
- The diagnostic `code` is the rule name above, not the pydantic error type.
  Raise the errors in a way that lets `loading.py` recover the code (e.g.
  `PydanticCustomError(code, message)`, whose `type` is the code).
- The diagnostic `path` points at the second occurrence: `("choices", 1,
  "id")`, `("blanks", 2, "id")`, `("questions", 3)`. Keep today's
  paths. With pydantic the loc may carry a union tag prefix; follow what
  `loading.py` already does for other pydantic errors.
- Remove the four checks from `mdq/linter.py` and their rows from
  `docs/lint-codes.md`. Add a short section "Errors" to `docs/lint-codes.md`
  that lists these four codes as errors raised by the models, so mdq-js uses
  the same codes.
- Remove the matching entries from `examples/**/*.lint.json`. Delete a file
  if it becomes empty.

### Derived ids

Out of scope. Moved to `derived-ids.md`, which removes id derivation from the
parser and adds `with_ids()` to the models.

## Examples

- `examples/invalid/` gets one example per rule. Use Brazil-inspired content
  (see `AGENTS.md`):
  - `multiple-choice-duplicate-choice-id.yaml`
  - `multiple-selection-duplicate-choice-text.yaml`
  - `fill-in-duplicate-blank-id.yaml`
  - `exam-duplicate-question-id.yaml`
- JSON Schema cannot express "unique by field", so these four examples pass
  the schema and fail only in the models. `tests/test_schema_agreement.py`
  requires both sides to reject every invalid example. Put these in
  `examples/invalid/model-only/`, and change the agreement test: for that
  directory, the schema must accept and `load` must reject. Update
  `mdq/testing.py` to match.
- Any `examples/valid/` document that has one of the four warnings today (see
  the `.lint.json` files) must become valid or move to `examples/invalid/`.

## Tests

- `load` on each case returns `document=None` and an `error` diagnostic with
  the code and path above. Cover:
  - two explicit choice ids equal;
  - two choice texts equal after whitespace normalization;
  - two blank ids equal;
  - exam: two inline questions with the same `id`; the same question
    included twice; an inline `id` equal to an included question's id; a
    declared `id: q2` on block 1 colliding with the implicit `q2` of block 2.
- Migrate or delete the existing linter tests for the four removed checks.

## Done means

- The four rules are errors from `load`, with the codes above.
- The linter no longer contains them.
- `uv run pytest` (except the known `test_hypothesis` failure) and
  `uv run mypy mdq` pass.
