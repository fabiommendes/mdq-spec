---
type: plan
status: active
tags: [mdq, mdq-js, port, sync]
relatedTo: [mdq-js/docs/sync/README.md, mdq-js/docs/sync/testing.md]
---

# Roadmap of the TypeScript port

The port follows mdq-py, which is the reference. This document lists the
phases of the port and the decisions that apply to all of them. The detailed
per-feature status is [`tests/not-ported.ts`](../../tests/not-ported.ts).

## Decisions

1. **One cycle per feature.** Each cycle has a handoff in `docs/handoffs/`
   with the public API, the acceptance criteria and the Python functions to
   port. The cycle is test-driven, and the corpus is the main test source.
2. **Corpus first.** Before an area is ported, the Python tests of that area
   that state facts about the format move into `examples/`. This can need new
   corpus kinds, for example sources that must fail to parse, with the
   expected error. See [testing.md](testing.md).
3. **Responses are plain JSON.** The response types follow
   [`docs/responses.md`](../../../docs/responses.md): JSON objects, arrays,
   strings and numbers. No `Set` or `Map`, so a response can be stored, sent
   and loaded from a fixture without conversion.
4. **Same dialect as Python.** Differences between the two runtimes must not
   change a result:
   * Every `RegExp` uses the `u` flag. `\w` and `\d` are ASCII in JavaScript
     and Unicode in Python, so a port of a Python pattern that relies on
     Unicode uses `\p{L}`, `\p{N}` and similar classes.
   * Python `$` also matches before a final `\n`; JavaScript `$` does not.
   * Frontmatter YAML follows the Python loader (YAML 1.1 without base-60
     integers), not the js-yaml default (YAML 1.2).
   * markdown-it uses the same preset and options as Python (`gfm-like`).
   * Text comparisons use the same normalization as Python (NFKC, case
     folding, accent removal). `toLowerCase` is not case folding.

   Each difference that a cycle finds gets an example in the corpus.
5. **Validation includes the model rules.** Python checks some rules in the
   Pydantic models (unique ids, regex that compiles, and so on). TypeScript
   has no model layer, so these rules are Zod refinements, and
   `validateDocument` rejects `examples/invalid/model-only/`.

6. **Same module names as Python.** A TypeScript module uses the name of the
   Python module that holds the same code, for example `parser`, `linter`,
   `query` and `schedule`. The layout does not have to be identical, and a
   name differs only for a good reason, which the module documentation
   states. For example, `schema` replaces `mdq.models` and `mdq.types`,
   because Zod defines the types and the validation in one place.

7. **No Temporal yet.** Exam `start` and `duration` use strings: the exam
   frontmatter loader keeps the YAML timestamp text (`YamlTimestamp`, like
   PyYAML `isoformat()`), and `schedule` has one function per field that
   throws `RangeError`. Each function keeps an internal parse and format
   step, so Temporal can replace the internals later without an API change.
   Revisit when Node 26 is the CI minimum, Safari ships Temporal and the
   repository uses TypeScript 6. See
   `dev/research/temporal-for-exam-schedule.md` (local).

## Phases

| Phase | Scope | Status |
| ----- | ----- | ------ |
| F0 | Corpus layout, `not-ported.ts` manifest, docs | done |
| F1 | Zod schemas equal to the JSON Schema | done |
| F2 | Parser: bracket lists aligned with Python (no derived ids; `grading`, `weight`, `shuffle`) | done |
| F3 | Parser: essay, numeric, short-answer, ordering, fill-in bodies | done |
| F4 | Parser: exams, `include`, `include-all`; the spec audit (`dev/audit/plan.md`) | done |
| F4.1 | `resolveExam`, the question bank and the `include-all` query language ; `.resolved.yaml` corpus | done |
| F5 | Model layer: `withIds`, model rules as Zod refinements, `load()` with diagnostics | to do |
| F6 | Linter, checked against the `.lint.json` files | to do |
| F7 | Scoring, checked against `examples/grading/` | to do |
| F8 | SolidJS components | to do |

The CLI, format conversions (Moodle XML, GIFT, Aiken), `show`, `scaffold`
and the file-system question bank stay in Python.

## Coordination with mdq-py

* The layout of the mdq-py modules is stable (see "Package layout" in
  `mdq-py/AGENTS.md`). The public modules are `mdq`, `mdq.models`,
  `mdq.types`, `mdq.errors`, `mdq.convert` and `mdq.hypothesis`. New
  TypeScript modules take the names of the private Python modules that hold
  the same code, without the leading underscore: for example `parser/markdown`
  (`_markdown.py`), `loading` (`_loading.py`), `banks` (`_banks.py`).
* `Exam.render()` writes MDQ Markdown in Python. TypeScript has no render
  functions (see [schemas.md](schemas.md)), so this stays in Python until a
  web use case needs it.
* The Python test helpers (`mdq-py/tests/_corpus.py`,
  `mdq-py/scripts/lint_snapshot.py`, `mdq-py/tests/strategies/`) are not
  ported. TypeScript has its own helpers in
  `tests/`.

## Reference changes waiting for a phase

Final changes in mdq-py that belong to a later phase. Remove an entry when
its phase ports it.

* F5: `docs/lint-codes.md`, "Load errors", lists the codes that `load()`
  reports: `yaml-syntax-error`, `json-syntax-error`, `parse-error`,
  `conflicting-accept`, `invalid-document`, `wrong-kind`,
  `unresolved-include-all` (root `811553e`). The parser side is ported:
  `ParseError.code`/`path`, `YamlSyntaxError`, `ForeignChoiceMarkerError`,
  `UndefinedBlankError`, and the `warnings` list of `parseDocument`.
  `load` merges the parser warnings with the model and lint diagnostics.
* F5: the model rules of the audit (`dev/audit/plan.md`, every section
  that says "Falta mdq-js"): `with_ids`; `SlugId` on choices and blanks;
  `locale` well-formed by RFC 5646 (`malformed-locale`); `malformed-start`
  and `invalid-duration` with paths `["start"]`/`["duration"]` (the Zod
  `duration` pattern already rejects most cases as `schema-error`);
  `unknown-include-field`; `duplicate-question-id`; `forbidden-block-element`
  (`find_forbidden_elements`, `block_text`); `misplaced-blank` and
  `unreferenced-blank`/`undefined-blank` from the stem; `invalid-regex`;
  union labels stripped from error paths and one diagnostic per
  `(code, path)`. The corpus suite `tests/invalid-sources.spec.ts` lists the
  codes in `LOAD_CODES` of `tests/not-ported.ts`.
* F5: null in any optional field is absent (base.md), nested fields
  included; `meta` keeps null values. The parser drops nulls from the
  frontmatter; the YAML/JSON path needs the same before validation.
* F5: `effective_grading`/`effective_shuffle` (`inherit`), `Exam.grading_for`,
  `shuffle_for` and `resolve_question` (`tests/test_inherited_grading.py`,
  `test_null_fields.py`).
* F6: a fill-in choice blank runs the per-choice checks of multiple choice,
  after `check_multiple_choice_answers` and in this order:
  `blank-choice-feedback`, `blank-choice-comment`, `missing-choice-id`,
  `visually-identical-choices`. The paths are
  `("blanks", i, "choices", j, ...)`. Snapshots are in
  `examples/valid/fill-in/*.lint.json` (root `811553e`, mdq-py `bc1188d`).
* F6: `check_numeric` uses the value of a string answer.
  `answer-outside-domain` reports `"3/2"` and `"2.5"` with domain
  `integer`, but not `"10/2"` or `"5.0"`. `relative-tolerance-around-zero`
  reports `"0"`, `"-0"`, `"0/7"` and `"0.0"` (mdq-py `bc1188d`).
* F6 (root `95d7535`, mdq-py `d4e6e5c`, tests in
  `mdq-py/tests/test_lint_precision.py`):
  * `accept-reject-overlap` compares `comparison_key(lines)`, after the
    normalizations and the indentation. `duplicate-alternative-lines` only
    reports accept/accept and reject/reject pairs.
  * `domain-mismatch` uses the set of accepted domains: a string answer
    gives its written form; a whole float gives integer; a non-whole float
    gives fraction or decimal; a decimal absolute tolerance narrows the set
    to decimal; an integer absolute tolerance keeps it.
  * `redundant-regex-anchor`: a leading `^` only without the `f` flag, a
    trailing `$` only without `f` or `b`; a `$` after an odd number of
    backslashes is literal. It checks `regex` and every `/`-delimited
    accept/reject entry (paths `("regex",)`, `("accept", i)`,
    `("reject", i)`), with one diagnostic per pattern.
* Numeric answer representation (root `27f845f`, mdq-py `99b8f12`, tests in
  `mdq-py/tests/test_numeric_representation.py`):
  * F6: `answer-outside-domain`, `domain-mismatch`, `missing-tolerance` and
    `relative-tolerance-around-zero` judge a string answer by its value or
    its written form. See `docs/lint-codes.md`.
  * F7: `numeric_matches` uses exact rational arithmetic. A string is read
    as a fraction, a float as its shortest decimal. TypeScript needs a
    rational type over `bigint`.
* Rule changes P4, Q5-Q8 (root `5f023cf`, `c77c289`; mdq-py `744d82d`,
  `b972609`; tests in `mdq-py/tests/test_numeric_domain_rules.py` and
  `test_named_load_errors.py`):
  * F5: `malformed-start` and `invalid-duration` (errors, paths
    `["start"]`, `["duration"]`), from `_validate_start` and
    `_validate_duration` in `models/_exam.py`. PT0S, P0D, P1M, P1Y, `""` and
    a non-string are invalid durations. Example
    `invalid/model-only/exam-zero-duration.yaml`. The parser keeps a value
    that does not parse as written (`canonicalOrAsWritten`).
  * F5: `schema-error` for every generic Zod issue; named refinements keep
    their code (`docs/lint-codes.md`, "Load errors").
    `malformed-true-false-marker`: the marker is exactly one code point in
    `\p{L}`, checked before `reserved-true-false-marker`; the schema has no
    length limit on the marker.
  * F6: `domain-mismatch` with `domain: fraction` accepts an integer answer
    (`_accepted_numeric_domains`); `ignored-decimal-places` uses the
    effective domain (`_effective_numeric_domain`).
* String-only fields (root `40591e2`, mdq-py `4409033`; tests in
  `mdq-py/tests/test_string_only_fields.py`, `test_invalid_sources.py`).
  The parser part is ported. For F5:
  * a non-string `id`, `include` or `include-all` is `schema-error` at
    `["id"]`, `["questions", N, "id"]`, `["questions", N, "include"]`,
    `["questions", N, "include-all"]`;
  * error paths inside an exam's `questions` have no union tag
    (`questions.0.stem`, not `questions.0.question.essay.stem`).
* Duplicate keys and exam tags (J1, J3; root `78b4bd2`, mdq-py `2bfeaae`;
  tests in `mdq-py/tests/test_duplicate_keys.py`). The parser part is
  ported (`YamlSyntaxError`). For F5:
  * `load` reports `yaml-syntax-error` (path `[]`) for YAML documents,
    and `json-syntax-error` for a JSON object that repeats a key
    (`JSON.parse` keeps the last value, so it needs its own check). YAML
    documents use the frontmatter loader (`duration: 1:30` is a string).
    Corpus: `examples/invalid/question-duplicate-key.mdq.md`,
    `exam-block-duplicate-key.mdq.md`.
* F5/F6: the `non-ascii-whitespace` lint (mdq-py `ac13b51`,
  `mdq-py/mdq/_parser/_spaces.py`, tests in `mdq-py/tests/test_whitespace.py`).
  `load` runs it before parsing and keeps it when parsing fails.
* F6, from the audit: `unsafe-thematic-break` (a `-` thematic break in
  instructions/preamble/stem/epilogue), `setext-heading` on the model side
  for `instructions`, `unlisted-true-false-marker` (was
  `provisional-true-false-marker`), `blank-text-field` for a blank
  `answerKey`; `unexpanded-stem-ellipsis` and `shadowed-answers` are gone;
  `domain-mismatch` judges by value and only when the declared domain is
  narrower; the pre-validation lints of `dev/specs/to-review/pre-validation-lints.md`.
  Every `examples/valid/**/*.lint.json` exists, `[]` for a clean document,
  and the `.yaml` side of a pair ignores `PARSER_ONLY_CODES`
  (`mdq-py/tests/_corpus.py`).
* F7, from the audit: `examples/grading/{multiple-choice,multiple-selection,
  true-false,numeric,short-answer}.yaml` (`mdq-py/tests/test_grading_examples.py`,
  205 cases; `"malformed"` is a `ResponseError`, `"pending"` a
  `NotAutoGradable`); the exam score (`Exam.score_responses`, `ExamScore`,
  exam.md "Exam score"); `decimalPlaces` as the comparison precision
  (`tests/test_decimal_places.py`); ordering `grades_indentation`
  (`tests/test_ordering_scoring.py`); the inexact comparison of
  `dev/specs/to-review/inexact-comparison.md` (`src/inexact-tables.json`
  is in place); the omitted `[ ]` score through `grading`; the NFC rule
  for exact literals.

## Known gaps in the reference

Found while planning the port. Fix them in Python first:

* No test reads `examples/grading/`. Scores are tested only with inline
  models in `test_scoring.py` and `test_score_response_spec.py`.
* Python has no exam score. `docs/responses.md` describes how an exam is
  scored, but mdq-py only scores single questions (the unused `ExamScore`
  was deleted).
* `numeric_value` does not accept the `{value, unit}` response form that
  `docs/responses.md` describes.
* `examples/invalid/model-only/` has no expected error code, so both sides
  only check that some error occurs.
* `docs/lint-codes.md` documents `empty-include-all`,
  `separator-before-include` and `unsafe-id`, but no example produces them.
