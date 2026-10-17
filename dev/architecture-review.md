---
type: plan
status: active
tags: [mdq, architecture, deepening, refactor]
relatedTo: [loading-module, unique-ids, derived-ids]
---

# Architecture review: mdq-py

Source: `/improve-codebase-architecture` run of 2026-09-23 (HTML report at
`/tmp/architecture-review-20260923-232203.html`, a temporary file that goes
out of date). This file is the source of truth. Update the status after each
candidate. Line numbers are from 2026-09-23 and may have moved.

Vocabulary: module, interface, depth, seam, adapter, leverage, locality
(skill `codebase-design`).

## Status

| Id | Candidate                                   | Strength        | Status |
| -- | ------------------------------------------- | --------------- | ------ |
| C1 | One loading module                          | Strong          | Done (`a929489`, `8fae079`) |
| C2 | Lint rules onto the Question models         | Strong          | Done (uncommitted, 2026-09-25): `dev/specs/to-review/lint-on-models.md`. Follow-up: `dev/specs/to-do/rule-conformance.md` |
| C3 | One seam per question type                  | Worth exploring | Open |
| C4 | Exam parsing into `MDQParser`               | Worth exploring | Open |
| C5 | One numeric module for converters + models  | Worth exploring | Open |
| C6 | Delete modules that fail the deletion test  | Strong          | Done (uncommitted, 2026-09-25): `grading.py`, `mdit/`, `render.common_frontmatter` deleted; test-only helpers out of `models.__all__`. `types.py` kept (the parser uses it). `MissingIdError`/`UnresolvedInclude` kept (`docs/responses.md`) |

Related work done in the same session: `dev/specs/to-review/loading-module.md`,
`unique-ids.md`, `derived-ids.md`.

## C2. Lint rules onto the Question models

- Problem: `lint_document(dict, question_type)` in `mdq/linter.py` is a
  shallow module over raw dicts. It dispatches with an `if question_type ==`
  chain (about `linter.py:152-173`), has no branch for `ordering`, and
  re-checks shapes the models already guarantee (`_iter_choices`,
  `_is_number`).
- Solution: advisory rules become `lint()` on each question class and on
  `Exam`; `linter.py` becomes a helper module (like `render.py` for
  `render()`). Hard rules become model validators.
- Remaining hard-rule candidates: `invalid-regex` (the model already builds
  the pattern lazily, about `models.py:679`), `undefined-blank` and
  `unreferenced-blank` (`_check_blank_markers`). Check the spec docs for each
  before moving: only "critical" rules become errors.
- Exam lint should lint the questions inside the exam (today `_check_exam`
  only checks for an empty question list).
- Constraint: `.lint.json` corpus files and `docs/lint-codes.md` must stay in
  sync. The `lint_snapshot` script never overwrites existing files without
  `--overwrite`.
- Backlog items it resolves: "Move the obligatory validations in the linter
  to the Pydantic models" and "Add a `.lint()` method to the models".

## C3. One seam per question type

- Problem: each question type is a key in about 10 dispatch sites, in three
  styles: string `==` (parser, linter), `isinstance` (show, gift,
  moodle_xml, fill-in scoring), dicts (scaffold, `TYPE_QUESTION_KEYS`). Enum
  literals are copied between `types.py`, `models.py` and `parser.py`
  (`GradedQuestionType`, `NumericDomain`, ...).
- Solution: the model class is the seam for type-specific behavior other
  than parsing; one registry maps type tag -> class, scaffold template.
- Open question: do per-type body parsers (ordering is about 150 lines) move
  behind this seam or stay in the parser?
- C2 reduces it: `lint()` per class removes the linter chain.

## C4. Exam parsing into `MDQParser`

- Problem: exam parsing is a parallel free-function path (`parse_exam`,
  `_split_exam_blocks`, `_parse_exam_block` in `parser.py`) with its own
  frontmatter handling. Question frontmatter is applied in three places.
  There is a FIXME in `parse_exam` asking for this move.
- Solution: one parser module, one frontmatter pass, one cursor for both
  documents.

## C5. One numeric module

- Problem: `convert/gift.py` and `convert/moodle_xml.py` share byte-identical
  helpers (`find_unescaped`, `split_unescaped`, `common_prefix`,
  `join_blocks`, `format_num`, numeric value/tolerance). They partly overlap
  `models.numeric_value`/`numeric_matches`.
- Solution: one numeric answer module used by `NumericQuestion` and both
  converters; escaping helpers into `convert/base.py`.

## C6. Delete modules that fail the deletion test

Remaining items (verified 2026-09-25):

- `mdq/mdit/plugins/choices.py` (170 lines): nothing imports it.
- `render.common_frontmatter` (`render.py:17`): nothing calls it.
- `mdq/grading.py`: three `NotImplementedError` stubs. `BACKLOG.md` now has
  "Grading entry points must require an addressable document", so decide
  with the human: delete the stubs, or keep them as the planned interface.
- Also check `models.__all__` for helpers exported only for tests
  (`coerce_ordering_lines`, `first_feedback`, `render_pattern_block`,
  `normalize_paragraphs`, `normalize_intro`, `remove_trailing_ws`).
- Still dead after C1: the TypedDicts in `mdq/types.py` that nothing uses.

## Other findings (not candidates)

- Import cycle: `models` imports `parser` for `reconstruct_blocks`.
- `cli.py` `--type` help text for `mdq new` may still list 7 types.
- Blanks have no `score` method; a fill-in choice blank scores
  `choice.score or 0.0` while multiple-choice uses `unspecified_score()`,
  so the same choice can score differently.
