---
type: spec
status: draft
tags: [mdq, lint, diagnostics, conformance, spec-rules]
relatedTo: [lint-on-models, unique-ids, dev/architecture-review.md]
---

# Rule conformance

Python only (`mdq-py/`) plus the shared corpus and docs. Do NOT touch
`mdq-js/`. Depends on `lint-on-models.md`: write every lint rule as part of
the `lint()` methods on the models.

## Problem

The "Additional rules" tables in `docs/question-types/*.md` are the
specification. The implementation does not follow them exactly: some rules
are missing, some have a different severity, and some lint rules are not in
the spec. The audit of 2026-09-25 found the cases below. Strict adherence:
the spec tables and the implementation must match, row for row.

## Rules

Levels map to severities: critical = model error (or parse error if only the
source shows it), warning = `warning`, info = `info`.

### A. Severity changes (the spec wins)

| Code | Now | Spec |
| --- | --- | --- |
| `stem-not-a-paragraph` | info | warning (`base.md:253`) |
| `code-input-without-highlight` | warning | info (`essay.md:90`) |
| `multiple-choice-no-correct-choice` | warning | info (`multiple-choice.md:216`) |
| `locale-mismatched-true-false-marker` | info | warning (`true-false.md:214`) |

### B. Lint rules that the spec does not list

Keep them, and add a row to the matching spec table with the current
severity. Add a footnote when the reason is not clear from the row.

| Code | Severity | Spec table |
| --- | --- | --- |
| `blank-choice-text` | warning | multiple-choice, multiple-selection, true-false, fill-in |
| `blank-tag` | warning | base |
| `blank-text-field` (title, author, comment, answerKey) | warning | base (answerKey: essay) |
| `locale-lookalike-language` | info | base |
| `multiple-choice-many-correct-choices` | warning | multiple-choice |
| `unexpanded-stem-ellipsis` | info | base |
| `unsplit-tag-list` | warning | base |
| `exam-without-questions` | warning | exam (`docs/exam.md` has no rules table: add an "Additional rules" section with the same format as `base.md`) |

### C. Missing rules

Implement each one. The codes are proposals: keep them unless a better
kebab-case code is clear, and use the same code for the same rule in every
question type.

| Spec row | Level | Proposed code |
| --- | --- | --- |
| `base.md:252` id must be url-safe | warning | `unsafe-id` |
| `base.md:255` id, title should be defined | info | `missing-id`, `missing-title` |
| MC/MS/TF `choices[].feedback`, `choices[].comment` visible character | warning | `blank-choice-feedback`, `blank-choice-comment` |
| MC/MS/TF `choices[].text` not visually equivalent to another | info | `visually-identical-choices` |
| MC/MS/TF `choices[].id` defined, not derived | info | `missing-choice-id` |
| `multiple-choice.md:217` not every choice correct | info | `all-choices-correct` |
| `multiple-selection.md:122` at least one correct | info | `no-correct-choice` |
| `multiple-selection.md:123` not every choice correct | info | `all-choices-correct` |
| `true-false.md:218` not all true or all false | info | `uniform-true-false-answers` |
| `true-false.md:219` marker is one code point in NFC | info | `non-nfc-true-false-marker` |
| `essay.md:89`, `ordering.md:343` highlight is a recognized language | info | `unknown-highlight-language` |
| `essay.md:91` answerKey defined | info | `missing-answer-key` |
| `numeric.md:153` domain agrees with the inferred domain | info | `domain-mismatch` |
| `numeric.md:156` tolerance for a decimal or fraction answer | info | `missing-tolerance` |
| `short-answer.md:383` accept holds a `*` wildcard | warning | `accept-wildcard` |
| `short-answer.md:385` regex flag accepted but ignored | info | `ignored-regex-flag` |
| `short-answer.md:386` reject `*` not the last item | info | `unreachable-reject` |

- Read every footnote of a row before implementing it.
- Recognized language: any alias of a Pygments lexer
  (`pygments.lexers.find_lexer_class_by_name`). Add `pygments` as a direct
  dependency in `mdq-py/pyproject.toml` (today it comes only through
  `rich`). Say in the `essay.md`/`ordering.md` footnotes that the Pygments
  lexer aliases are the reference list.
- `visually-identical-choices`: reuse `visually-identical-lines` of the
  ordering linter where the comparison is the same.

### D. Critical rules to verify

The audit did not find where these are enforced. For each one, find the
check, or implement it as an error. Report which case applies.

- `base.md:250`: preamble, epilogue and stem have no forbidden block
  elements (`base.md` § Forbidden elements), also for documents built from
  YAML/JSON, not only from markdown.
- `fill-in.md:301`: blanks appear only in a plain text run of a paragraph.
- `true-false.md:210`: the marker agrees with `correct` according to its
  category.
- `short-answer.md:379`: `accept`/`reject` not written as a body block and
  a frontmatter field at the same time.

## Docs and corpus

- `docs/lint-codes.md` lists every code, with the severity from the spec.
- Every new rule gets at least one example: a valid example with a
  `.lint.json` for warning/info, an invalid example for errors
  (`examples/invalid/model-only/` if the JSON Schema accepts it).
  Brazil-inspired content (see `AGENTS.md`).
- Update the existing `.lint.json` files for the severity changes in A. The
  lint snapshot script never overwrites by default; update by hand or pass
  `--overwrite` for a named file only.
- New rules can add diagnostics to existing examples. Add them to the
  `.lint.json` files, and check each one: a new diagnostic on an existing
  example is either correct or a bug in the rule.

## Tests

- One unit test per rule in C and D (positive and negative case), calling
  `lint()` on the model or `load` for errors.
- A test that every code in `docs/lint-codes.md` is produced by some
  corpus example, and every code the implementation produces is in
  `docs/lint-codes.md`. If one exists already, extend it.

## Done means

- Every row of every "Additional rules" table has an implementation with
  the same level, and every lint code has a spec row.
- `uv run pytest` (except the known
  `tests/test_hypothesis.py::test_code_block_round_trips_verbatim` failure),
  `uv run mypy mdq` and `uv run ruff check` pass.

## Report

- Per section, the codes added or changed, and where.
- Section D: for each rule, "already enforced at file:function" or
  "implemented as <code>".
- Spec rows that are ambiguous or cannot be implemented, and why.
- Existing examples with new diagnostics.
