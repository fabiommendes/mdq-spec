---
type: log
status: active
tags: [audit]
relatedTo: []
---

# Spec audit log

## Cycle 0: links and question-base

Changes:

* Links to `question-types/base.md` now point to `question-base.md` (exam.md, responses.md, grammar.md, README.md, ordering, short-answer, fill-in). `base.md` mentions in lint-codes.md prose renamed too.
* `references/true-false-spellings.md` links now point to `annex/true-false-spellings.md` (true-false.md). Step 2 passes.
* question-base.md: `### Additional Rules` is now `## Additional Rules` (last section, outside AST). Anchor `#additional-rules` unchanged.
* question-base.md table has the Code column. Split rows: uuid version/variant, id/title missing. New rows: unknown-frontmatter-key, non-ascii-whitespace (footnote 10 points to grammar.md).
* lint-codes.md main table: moved `stem-not-a-paragraph` and `unsafe-thematic-break` into alphabetical order.

Proposed codes: none.

Open questions:

* non-ascii-whitespace: spec row declares warning (grammar.md: warning for U+0085/2028/2029 and syntax positions, info otherwise). Corpus valid examples report info. Step 5 flags it. Needs a decision: declare info plus note, or two rows.
* The rows for `blank-text-field` (error in lint-codes.md model-level table, warning for metadata) kept as critical/warning per the existing spec levels.

## Cycle 1: essay

Changes:

* essay.md Additional Rules: added Code column, realigned. New rows: `input` schema-error, `answerKey` empty string schema-error, `body` foreign-choice-marker (footnote 4). Existing rows got ignored-highlight, blank-text-field, unknown-highlight-language, code-input-without-highlight, missing-answer-key.
* lint-codes.md: `foreign-choice-marker` now lists essay in "Question types"; Errors table re-padded.
* Audit shows no remaining essay messages.

Proposed codes: none.

Open questions:

* foreign-choice-marker for `* [essay]` (essay-tag-in-list): lint-codes.md describes it only for choice markers. Row declared as critical, field `body`. Confirm the wording or move to a dedicated code.
* Corpus parse-error cases (spaced/uppercase tag, two answer keys, no body) have no table row: parse-error is not a lint rule, left out on purpose.

## Cycle 2: multiple-choice

Changes:

* multiple-choice.md Additional Rules: added Code column, realigned. Existing rows got blank-choice-text, duplicate-choice-text, duplicate-choice-id, blank-choice-feedback, blank-choice-comment, visually-identical-choices, multiple-choice-no-correct-choice, all-choices-correct, multiple-choice-many-correct-choices, missing-choice-id.
* New rows: `choices[].id` slug, `choices[].score` range and `choices[].feedback` empty string (all schema-error), `choices[]` foreign-choice-marker.
* lint-codes.md already listed multiple-choice for every declared code: no change.
* Audit shows no remaining multiple-choice messages.

Proposed codes: none.

Open questions:

* Corpus parse-error (empty brackets) has no row, same as essay. forbidden-block-element (two checkbox lists) is declared in question-base.md.
* foreign-choice-marker row uses field `choices[]` (the marker is not a model field). Confirm.

## Cycle 3: multiple-selection

Changes:

* multiple-selection.md Additional Rules: added Code column, realigned. Existing rows got blank-choice-text, duplicate-choice-text, duplicate-choice-id, blank-choice-feedback, blank-choice-comment, visually-identical-choices, no-correct-choice, all-choices-correct, missing-choice-id.
* New rows: `choices[].id` slug, `choices[].correct` required (corpus multiple-selection-choice-without-correct and single-choice are schema-error), `choices[].feedback` empty string (all schema-error), `choices[]` foreign-choice-marker (forced-star, unknown-marker).
* lint-codes.md already lists multiple-selection for every declared code: no change.
* Audit shows no remaining multiple-selection messages.

Proposed codes: none.

Open questions:

* no-correct-choice vs multiple-choice-no-correct-choice: multiple-selection reports only `no-correct-choice` (mdq-py `check_multiple_selection_answers`); multiple-choice and fill-in report `multiple-choice-no-correct-choice`. Same meaning (info, nothing correct), different wording. Looks redundant; merge into one code or keep, human decides.
* Level of the `choices[].feedback` empty-string row is critical (schema), as in multiple-choice. Same for the `choices[].id` slug row.
* The multiple-selection feedback empty-string and id-slug schema rows have no corpus example checked.

## Cycle 4: true-false

Changes:

* true-false.md Additional Rules: added Code column, realigned. Existing rows got blank-choice-text, duplicate-choice-text, duplicate-choice-id, unlisted-true-false-marker, locale-mismatched-true-false-marker, blank-choice-feedback, blank-choice-comment, visually-identical-choices, uniform-true-false-answers, non-nfc-true-false-marker, missing-choice-id, true-false-marker-disagrees-with-correct.
* Split the marker row: malformed-true-false-marker (not a single letter) and reserved-true-false-marker (`X`/`x`).
* New rows: false-friend-true-false-marker (warning, `S` under `locale: id`), `choices[]` foreign-choice-marker (corpus blank-marker, symbol-marker), `choices[].id` slug, `choices[].correct` required, `choices[].feedback` empty string (all schema-error, same as multiple-selection). `choices` at-least-two row is now schema-error.
* lint-codes.md already lists true-false for every declared code: no change.
* Audit shows no remaining true-false messages.

Proposed codes: none.

Open questions:

* model-only/true-false-marker-disagrees-warning: no conflict. Corpus severity is error, lint-codes.md says error, spec row is critical. WARNING marker `N` with `correct: false` is a disagreement (critical); a WARNING marker with `correct: true` gives only unlisted-true-false-marker (warning). The file name "warning" is misleading but harmless.
* foreign-choice-marker row uses field `choices[]`, as in the other choice types.
* Corpus has no example for a schema-error on `choices[].id` slug or `choices[].feedback` empty string in true-false.
* Header of the old row said "choices ... (schema)" and the spec text does not give a code for `non-nfc` beyond info; kept as info (matches corpus).

## Cycle 5: numeric

Changes:

* numeric.md Additional Rules: added Code column, realigned. Existing rows got answer-outside-domain, relative-tolerance-around-zero, relative-tolerance-over-one, domain-mismatch, ignored-decimal-places, missing-tolerance.
* New rows: `answer` malformed-numeric-answer (critical), and schema-error rows for negative `tolerance.absolute`, negative `decimalPlaces`, `unit` with whitespace or brackets.
* lint-codes.md already lists numeric (and fill-in) for every declared code: no change.
* Audit shows no remaining numeric messages.

Proposed codes: none.

Open questions:

* Corpus parse-error cases (exponent, leading/trailing dot, leading zero, negative tolerance in tag, two relative tolerances, zero denominator in markdown, etc.) have no row, same as earlier types.
* numeric-malformed-fraction-answer.yaml says "1/0" also fails the schema pattern, but the corpus reports only malformed-numeric-answer. Row declared as malformed-numeric-answer, not schema-error.
* Schema-error rows for `unit`, `tolerance.absolute`, `decimalPlaces` match corpus (numeric-unit-with-space-field, numeric-negative-*). Rule text is mine; check wording.

## Cycle 6: short-answer

Changes:

* short-answer.md Additional Rules: added Code column, realigned. Existing rows got invalid-regex (two rows), conflicting-accept, parse-error (four body-grammar rows: repeated block, content plus list, empty reject / detached reject list, interleaved feedback and comment), detached-answer-list, schema-error (pattern list minimum, unmatched value), no-correct-answer, blank-text-field, redundant-regex-anchor, ignored-regex-flag.
* New row: `incorrectFeedback` empty string, schema-error (corpus short-answer-empty-incorrect-feedback).
* lint-codes.md already lists short-answer for every declared code: no change. `reject-without-feedback` is ordering only (mdq-py `check_ordering_reject_without_feedback`), not declared here.
* Audit shows no remaining short-answer messages.

Proposed codes: none.

Open questions:

* The four body-grammar rows use `parse-error`, which the earlier cycles left out as "not a lint rule". Kept because the rows already existed and the corpus reports it. Confirm.
* The blank-text-field row for `incorrectFeedback` is warning (whitespace-only) and the new schema-error row is critical (empty string). Same split as other free-text fields.
* "feedback and comment lines must not interleave" is corpus parse-error; "unmatched must be incorrect or manual" is schema-error (corpus short-answer-unknown-unmatched), so "(schema)" added to that row.
* Incident: a script of mine overwrote part of short-answer.md. I restored it from HEAD plus the `base.md` to `question-base.md` link fix. Any other uncommitted edit to that file made before this cycle is lost: check `git diff docs/question-types/short-answer.md`.

## Cycle 7: fill-in

Changes:

* fill-in.md Additional Rules: added Code column, realigned (only the table was replaced; rest of the file untouched). Existing rows got schema-error (blanks, choices), duplicate-blank-id, undefined-blank, unreferenced-blank, misplaced-blank, parse-error (block defined twice), undefined-blank (preAccept/preReject keys).
* New rows: `blanks[].id` slug/required (schema-error), `blanks[].unit` only on numeric (schema-error), preAccept/preReject key on a choice or numeric blank (schema-error, footnote 8).
* Inherited blank codes not repeated. lint-codes.md already lists fill-in for every declared code: no change.
* Audit shows no remaining fill-in messages.

Proposed codes: none.

Open questions:

* parse-error corpus cases (both accept spellings, interleaved observations, blank line before choices, two accept/reject lists, two choice definitions, two kinds one blank, unit in tag, unknown kind) have no own rows; only the "defines each block at most once" row uses parse-error.
* Preexisting row said preAccept/preReject keys must be short answer blanks; reworded to "declared blank" plus a separate schema row for the wrong-kind case.
* fill-in-misplaced-blank-heading reports unreferenced-blank, not misplaced-blank (heading is not a paragraph, so the marker is not a blank). Matches the rows; confirm intent.

## Cycle 8: ordering

Changes:

* ordering.md Additional Rules: added Code column, realigned (also fixed the one over-wide row). Existing rows got schema-error, accept-reject-overlap, parse-error (same content block type, at most one `[extra]`, one feedback/comment block), ignored-highlight, duplicate-alternative-lines, accept-repeats-answer-key, redundant-strict-indentation, blank-ordering-line, unknown-highlight-language, reject-without-feedback, visually-identical-lines.
* New schema-error rows: `lines[]` must be a `[level, text]` pair, `level` non-negative integer, `content`, `indentation`, `normalizations` (known values, no repeats). Matches corpus invalid/ordering-*.
* lint-codes.md already lists ordering for every declared code (blank-ordering-line, accept-reject-overlap included): no change.
* Audit shows no remaining ordering messages.

Proposed codes: none.

Open questions:

* accept-reject-overlap is critical and listed under lint-codes.md "Errors" (model-level). Corpus severity error. No conflict. Both model-only examples (including `-lenient`, which overlaps only after `indentation: lenient` implies `dedent`) report it at path `accept[0]`.
* Corpus parse-error cases without own rows: epilogue before section, multiline item, no block, ordered-list body, interleaved observations. Same policy as earlier cycles. Three existing rows (content type mismatch, two `[extra]`, two feedback blocks) use parse-error.
* Rule text for the new schema rows is mine; check wording.

## Cycle 9: exams

Changes:

* exam.md Additional Rules: added Code column, realigned (field column width 15; the setext row overflows on purpose). Existing rows got duplicate-question-id, invalid-duration, parse-error (epilogue `---`), exam-without-questions, setext-heading, unsafe-thematic-break, empty-include-all, undeclared-id-after-include-all, separator-before-include, nonstandard-include-query.
* New rows: `start` malformed-start, `questions[]` unknown-include-field, `questions[].max` schema-error (corpus exam-include-all-max-*).
* `duration` row reworded to cover the accepted forms and positivity (both are invalid-duration).
* unsafe-thematic-break is declared in question-base.md for preamble, stem and epilogue. The exam row now lists only `instructions` and links to the generic rules.
* lint-codes.md already lists exam for every declared code: no change.
* empty-include-all is resolve-only, not in the corpus; audit exempts it.

Proposed codes: none.

Open questions:

* Exam epilogue `---` row uses parse-error (corpus exam-thematic-break-in-epilogue), still "critical". Not a lint rule; same policy question as earlier cycles.
* setext-heading is lint-codes.md "exam" only, but the field list includes `questions[].{preamble,stem,epilogue}`. Matches corpus (reported at `instructions`).
* Corpus parse-error cases without rows: exam-max-alone.
* Schema-error exam cases (description, grading, penalty, ids not strings, type without H1) are not rows here; only `max` added. Add the others?

Remaining audit messages after this cycle (outside exam scope):

* Step 5: non-ascii-whitespace: corpus reports info, spec declares warning (examples/valid/essay/feff-in-middle, nbsp-in-prose). Same as Cycle 0 open question.
* Steps 1-4, 6, 7: clean.

## Examples cycle 0: question-base (carrier: essay)

Added:

* `invalid/model-only/essay-blank-preamble` (.yaml + .lint.json): `blank-text-field` critical for `preamble`. Only missing piece of that row (stem and epilogue already had examples).

Already covered (no new file): forbidden-block-element (essay-h1-in-preamble, essay-forbidden-*), malformed-locale, unsafe-id, stem-not-a-paragraph, blank-tag, unsplit-tag-list, blank-text-field metadata (blank-author, blank-title, blank-comment), malformed-uuid, uuid-unknown-version/variant, missing-id, missing-title, locale-lookalike-language, unsafe-thematic-break (preamble and epilogue), unknown-frontmatter-key, non-ascii-whitespace.

Rows without an example:

* `unsafe-thematic-break` in `stem`: stem must be a single paragraph, so a `---` there is `stem-not-a-paragraph`/forbidden, not reachable as its own case. Not added.

mdq-py disagreements: none. Corpus tests pass (2669 passed).

Open questions:

* The table has no schema-error or parse-error rows, so none checked here (essay corpus has many, covered by cycle 1).
* Step 5 still fails on non-ascii-whitespace severity (cycle 0 open question).

## Examples cycle 1: essay

Added: none. All 8 rows of the essay table already have an example.

Coverage:

* `input` schema-error: invalid/essay-unknown-input.
* `answerKey` empty string schema-error: invalid/essay-empty-answer-key.
* `body` foreign-choice-marker: invalid/essay-tag-in-list.
* ignored-highlight: valid/essay/ignored-highlight, ignored-highlight-plain.
* answerKey blank-text-field: valid/essay/blank-answer-key.
* unknown-highlight-language: valid/essay/unknown-highlight-language.
* code-input-without-highlight: valid/essay/code-without-highlight.
* missing-answer-key: many valid examples.

Rows without an example: none.

mdq-py disagreements: none. Corpus tests pass (2669 passed, 107 skipped).

Open questions:

* Audit (all steps) still fails only on non-ascii-whitespace severity (valid/essay/feff-in-middle, nbsp-in-prose report info, spec declares warning). Same as cycle 0.

## Examples cycle 2: multiple-choice

Added:

* `invalid/model-only/multiple-choice-duplicate-choice-text` (.yaml + .lint.json): `duplicate-choice-text` critical at `choices[2].text`. Only row without an example.

Already covered: schema-error (single-choice, bad-choice-id, score-out-of-range, empty-feedback), foreign-choice-marker (multiple-choice-foreign-marker), blank-choice-text, duplicate-choice-id, blank-choice-feedback, blank-choice-comment, visually-identical-choices, multiple-choice-no-correct-choice (no-correct-answer*), all-choices-correct, multiple-choice-many-correct-choices, missing-choice-id (choice-ids and others).

Rows without an example: none.

mdq-py disagreements: none. Corpus tests pass (2670 passed, 107 skipped).

Open questions:

* Audit (all steps) fails only on non-ascii-whitespace severity (essay examples), same as cycle 0.

## Examples cycle 3: multiple-selection

Added (7 examples, .yaml + .lint.json each):

* `invalid/multiple-selection-bad-choice-id`: `choices[].id` slug, schema-error.
* `invalid/multiple-selection-empty-feedback`: `choices[].feedback` empty string, schema-error.
* `invalid/model-only/multiple-selection-blank-choice-text`: blank-choice-text.
* `invalid/model-only/multiple-selection-duplicate-choice-id`: duplicate-choice-id.
* `valid/multiple-selection/blank-choice-feedback`: blank-choice-feedback (warning).
* `valid/multiple-selection/blank-choice-comment`: blank-choice-comment (warning).
* `valid/multiple-selection/visually-identical-choices`: visually-identical-choices (info).

Already covered: at-least-two (single-choice), `correct` required (choice-without-correct), foreign-choice-marker (forced-star, unknown-marker), duplicate-choice-text, no-correct-choice (none-correct), all-choices-correct (all-correct), missing-choice-id (many).

Rows without an example: none.

mdq-py disagreements: none. Corpus tests pass (2677 passed, 107 skipped).

Open questions:

* Audit (all steps) fails only on non-ascii-whitespace severity (essay examples), same as cycle 0.

## Examples cycle 4: true-false

Added (4 examples, .yaml + .lint.json each):

* `invalid/model-only/true-false-blank-choice-text`: blank-choice-text.
* `invalid/model-only/true-false-duplicate-choice-id`: duplicate-choice-id.
* `invalid/true-false-bad-choice-id`: `choices[].id` slug, schema-error.
* `invalid/true-false-empty-feedback`: `choices[].feedback` empty string, schema-error.

Already covered: at-least-two and `correct` required (single-choice, choice-without-correct), foreign-choice-marker (blank-marker, symbol-marker), malformed-true-false-marker, reserved-true-false-marker, marker-disagrees, duplicate-choice-text, unlisted/locale-mismatched/false-friend markers, blank-choice-feedback and blank-choice-comment, visually-identical-choices, uniform-true-false-answers, non-nfc-true-false-marker, missing-choice-id.

Rows without an example: none.

mdq-py disagreements: none. Corpus tests pass (2681 passed, 107 skipped).

Open questions:

* Audit (all steps) fails only on non-ascii-whitespace severity (essay examples), same as cycle 0.

## Examples cycle 5: numeric

Added: none. All 10 rows of the numeric table already have an example.

Coverage:

* malformed-numeric-answer: invalid/numeric-malformed-fraction-answer.
* answer-outside-domain: valid/numeric/answer-outside-domain, answer-outside-domain-fraction.
* tolerance.absolute, decimalPlaces, unit schema-error: invalid/numeric-negative-absolute-tolerance, numeric-negative-decimal-places, numeric-unit-with-space-field (and numeric-unit-with-space/-bracket in Markdown).
* relative-tolerance-around-zero: valid/numeric/relative-tolerance-around-zero (+ string variants).
* relative-tolerance-over-one: valid/numeric/relative-tolerance-over-one.
* domain-mismatch: valid/numeric/answer-outside-domain, fraction-answer-float, whole-fraction-domain-integer.
* ignored-decimal-places: valid/numeric/ignored-decimal-places, -inferred.
* missing-tolerance: valid/numeric/fraction, negative-fraction, decimal-beyond-float and others.

Rows without an example: none.

mdq-py disagreements: none. Corpus tests pass (2681 passed, 107 skipped).

Open questions:

* numeric-malformed-fraction-answer is not model-only although the example comment says "1/0" also fails the schema pattern; the lint reports only malformed-numeric-answer. Leave as is.
* Audit (all steps) fails only on non-ascii-whitespace severity (essay examples), same as cycle 0.

## Examples cycle 6: short-answer

Added (1 example, .yaml + .lint.json):

* `valid/short-answer/blank-incorrect-feedback`: blank-text-field (warning) at `incorrectFeedback`. Only row without an example.

Already covered: schema-error pattern list (empty-pattern, empty-pattern-line), invalid-regex (invalid-regex, unclosed-regex-*, unknown-regex-flag, repeated-regex-flag), conflicting-accept (conflicting-accept/-reject/-bare), parse-error rows (repeated-block/-accept/-reject, content-and-list, empty-reject, reject-detached-list, interleaved-observations), detached-answer-list (detached-list), unmatched schema-error (unknown-unmatched), no-correct-answer, incorrectFeedback empty string (empty-incorrect-feedback), redundant-regex-anchor, ignored-regex-flag.

Rows without an example: none.

mdq-py disagreements: none. Corpus tests pass (2682 passed, 107 skipped).

Open questions:

* Audit (all steps) fails only on non-ascii-whitespace severity (essay examples), same as cycle 0.


## Code split: one severity per code

Changed:

* New code `non-ascii-whitespace-in-prose` (info). `non-ascii-whitespace` is warning only (U+0085, U+2028, U+2029, syntax positions).
* New code `blank-content-field` (error) for blank `preamble`, `epilogue`, `stem`. `blank-text-field` stays warning.
* Docs: grammar.md lint section, question-base.md Additional Rules, lint-codes.md (main table, Errors table).
* Corpus: 6 `.lint.json` with prose info (code renamed), 4 `.lint.json` with blank-content error (code renamed).
* mdq-py: `_parser/_spaces.py`, `models/_base.py`, tests (whitespace, model rule errors, loading paths, corpus parser-only codes).
* Changelogs and BACKLOG item for mdq-js.

Open questions:

* Exam `instructions` has no blank check today, so it is not in `blank-content-field`. Add one?
* The `blank-intro-field` fallback mentioned in lint-codes.md is removed.
* Pre-existing, unrelated: `tests/test_ordering_parser.py::test_render_parse_is_a_fixed_point` fails; ruff F401 in `mdq/cli/_show.py`.

## Examples cycle 7: fill-in

Added (2 examples, .yaml + .lint.json each):

* `invalid/fill-in-no-blanks`: `blanks` empty, schema-error (`minItems: 1`).
* `invalid/fill-in-single-choice`: choice blank with one choice, schema-error at `blanks[0].choices` (`minItems: 2`).

Already covered: blanks[].id slug/required (bad-blank-id, blank-without-id), unit on short answer (unit-on-short-answer), duplicate-blank-id, undefined-blank (stem and preAccept key), unreferenced-blank, misplaced-blank (+ code-span, emphasis, link), parse-error block defined twice (two-accept-lists, two-reject-lists, both-accept-spellings), preReject on numeric blank schema-error.

Rows without an example: none.

mdq-py disagreements:

* tests/test_invalid_sources.py::test_invalid_parsed_only_example_reports_its_lint_json[fill-in-no-blanks.yaml] and [fill-in-single-choice.yaml]: mdq-py loads both documents without error (`mdq validate` says OK). The model does not enforce `minItems` of `blanks` (1) and of a choice blank's `choices` (2). Examples kept spec-correct; mdq-py needs a fix. Other corpus tests pass; spec_audit passes all 7 steps.

Open questions:

* The preAccept/preReject schema-error row has an example only for preReject on a numeric blank; a choice blank and preAccept are untested.

## Examples cycle 8: ordering

Added: none. All 20 rows of the ordering table already have an example.

Coverage:

* schema-error: invalid/ordering-single-line (lines), ordering-line-three-items (pair), ordering-negative-level and ordering-non-integer-level (level), ordering-empty-accept (alternative lines), ordering-unknown-content, ordering-unknown-indentation, ordering-unknown-normalization and ordering-repeated-normalization.
* accept-reject-overlap: invalid/model-only/ordering-accept-reject-overlap (+ `-lenient`).
* parse-error: ordering-accept-type-mismatch, ordering-extra-type-mismatch, ordering-two-extra, ordering-two-feedback-blocks.
* ignored-highlight, duplicate-alternative-lines (+ accepts-after-dedent), accept-repeats-answer-key (+ after-dedent, after-skip-blanks), redundant-strict-indentation, blank-ordering-line (+ blank-extra-line), unknown-highlight-language, reject-without-feedback, visually-identical-lines (+ across-blocks): valid/ordering/ same-name examples.

Rows without an example: none.

mdq-py disagreements: none new. Corpus tests: 2682 passed, 2 failed (cycle 7 fill-in-no-blanks and fill-in-single-choice, known).

Open questions:

* Audit (all 7 steps) passes.

## Examples cycle 9: exams

Added (3 files, 1 example):

* `valid/exam/thematic-break-in-instructions` (.mdq.md + .yaml + .lint.json): `unsafe-thematic-break` (warning) at `instructions`. Only `thematic-break-in-question` existed, which covers the question `preamble`.

Already covered: duplicate-question-id (exam-duplicate-question-id and model-only variants), malformed-start, invalid-duration, parse-error epilogue `---` (exam-thematic-break-in-epilogue), unknown-include-field, `questions[].max` schema-error (exam-include-all-max-*), exam-without-questions, setext-heading (valid/exam/setext-heading), undeclared-id-after-include-all (include-all), separator-before-include, nonstandard-include-query.

Rows without an example:

* `empty-include-all`: reported only by `Exam.resolve`, which needs the include store. `load`/`validate` never report it, so no `.lint.json` can hold it. Audit exempts it.
* `setext-heading` in `questions[].{preamble,stem,epilogue}`: only `instructions` has an example.

mdq-py disagreements: none new. Corpus tests: 2691 passed, 2 failed (cycle 7 fill-in-no-blanks and fill-in-single-choice, known). Audit passes all 7 steps.

Open questions:

* A bare `---` in `instructions` followed later by another `---` line opens a block (frontmatter), so the example has a single `---` and no frontmatter on the question. The warning is only reachable in that shape.
* Exam examples with `include` did not need a `.resolved.yaml`.

## Examples: summary

Examples added per type (cycles 0 to 9):

* question-base (carrier essay): 1
* essay: 0
* multiple-choice: 1
* multiple-selection: 7
* true-false: 4
* numeric: 0
* short-answer: 1
* fill-in: 2
* ordering: 0
* exam: 1

mdq-py disagreements:

* tests/test_invalid_sources.py::test_invalid_parsed_only_example_reports_its_lint_json[fill-in-no-blanks.yaml] and [fill-in-single-choice.yaml] (cycle 7): the model does not enforce `minItems` of `blanks` (1) and of a choice blank's `choices` (2). Examples are spec-correct.
* Pre-existing, unrelated: tests/test_ordering_parser.py::test_render_parse_is_a_fixed_point.

Open questions recorded by the examples cycles:

* Cycle 0: no schema-error/parse-error rows in the question-base table; `unsafe-thematic-break` in `stem` unreachable (stem-not-a-paragraph first).
* Cycle 5: numeric-malformed-fraction-answer is not model-only although the comment says the schema pattern also fails; lint reports only malformed-numeric-answer.
* Cycle 7: preAccept/preReject schema-error row has an example only for preReject on a numeric blank; choice blank and preAccept untested.
* Cycle 9: empty-include-all unreachable from the corpus; setext-heading untested in question fields; `---` in instructions shape restriction.
* Cycles 1 to 8: the non-ascii-whitespace severity question was closed by the code split (non-ascii-whitespace-in-prose); audit passes.

## Fix: ordering render/parse fixed point

* Falsifying example: `OrderingQuestion(stem="A\xa0", content="code", highlight="python", lines=[(0,"main-0"),(0,"main-00")])`.
* Root cause: `normalize_intro` (mdq-py/mdq/models/_base.py) used `str.strip()`, which also trims U+00A0. Spec (docs/references/grammar.md, "Unicode spaces") reads Unicode spaces as text, and the parser keeps them. Not an ordering bug: any question type with a stem ending in a Unicode space was affected.
* Fix: `normalize_intro` trims only ASCII whitespace. No spec change.
* Test: `test_render_parse_keeps_trailing_unicode_space_in_stem` in mdq-py/tests/test_ordering_parser.py.
* Results: ordering parser tests pass; full suite 4 failures, all fill-in-no-blanks / fill-in-single-choice (other agent); mypy clean.

## Fixes: blank instructions and fill-in minItems

Blank exam instructions:

* Spec: `docs/exam.md` "Additional Rules" row `instructions | critical | blank-content-field`; `docs/lint-codes.md` Errors row and the `blank-text-field` note mention exam `instructions`.
* Corpus: `examples/invalid/model-only/exam-blank-instructions.{yaml,lint.json}`.
* mdq-py: `Exam.check_instructions_are_not_blank`; tests in `tests/test_model_rule_errors.py`.

fill-in minItems, root cause:

* `load` validates only through the Pydantic models, not the JSON Schema. Several models lacked the schema limits (`min_length`), so the schema `minItems`/`minLength` were not enforced.
* Fixed in the models, all now `schema-error`: fill-in `blanks` (1), choice blank `choices` (2), short answer and blank `accept`/`reject`/`preAccept`/`preReject` (1, shared `PatternList`), ordering `accept`/`reject` (1), ordering alternative `feedback`/`comment`, ordering and essay `highlight`, question `id`/`title`/`author`, exam `id`/`title`/`course`/`author`, include `include` (all `minLength: 1`).
* Test `test_empty_accept_is_allowed_and_dropped_by_to_dict` encoded the old behavior; replaced by a rejection test. Hypothesis strategy `alternatives` in `tests/test_ordering_models.py` no longer generates empty lists.
* Still not enforced (no schema limit, only noted): `tags` items may be empty strings (schema has no `minLength` there).
* Open: `tests/test_ordering_parser.py` strategies may build empty `accept`/`reject`; the other agent owns that file (it passes now).
