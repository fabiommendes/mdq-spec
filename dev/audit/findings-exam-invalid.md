---
type: note
status: active
tags: [mdq, audit, examples]
relatedTo: [docs/exam.md, examples]
---

# Audit findings: exam examples and invalid examples

Scope: `examples/valid/exam/` (with `bank/`), `examples/invalid/`,
`examples/invalid/model-only/`. Schema checks ran against
`schema/mdq.schema.json` with `jsonschema`. Implementation checks ran against
mdq-py (`mdq.load`, `mdq validate`). Entries marked `[impl]` are disagreements
between mdq-py and the spec. Entries marked `known` are already in
`dev/issues/lint-spec-open-decisions.md`.

Directory placement: all 20 `.yaml` files of `examples/invalid/` are rejected
by the schema, and all 18 files of `examples/invalid/model-only/` are accepted
by the schema. No file is in the wrong directory.

### Example mismatches

`ID | severity | example file(s) | spec reference | what is wrong | expected vs actual`

- EX-M1 | medium | `examples/valid/exam/take-home.yaml` | `docs/exam.md:313-315`, `docs/exam.md:336-338` | The spec lists weeks as an allowed unit and says `duration` "carries each component into the largest unit that holds it". The largest unit that holds 14 days is the week. | By the spec text: `P2W`. Actual: `P14D`. The rule "weeks fold into days" exists only in the comment of the example and in `mdq/_schedule.py`. The schema accepts both forms.
- EX-M2 | medium | `examples/valid/exam/scheduled.mdq.md`, `examples/valid/exam/take-home.mdq.md` | `docs/exam.md:88-91`, `docs/question-types/base.md:85-88`, `docs/exam.md:310` | `start: 2026-03-10 09:00:00-03:00` and `start: 2026-06-05` are unquoted. With the YAML 1.1 rules that the spec needs elsewhere (`include: yes` is a boolean), these values are a YAML timestamp and a YAML date, not strings. The spec says "A value keeps its YAML type and is never converted" and `start` has type string. Also, the first value uses a space instead of `T`, which ISO 8601 does not allow (RFC 3339 does) and the schema pattern rejects. | By the spec text: error (wrong type), or at least `malformed-start` for the space form. Actual: accepted and normalized to `2026-03-10T09:00:00-03:00`. The spec needs an explicit exception for `start`, or the examples must quote the value and use `T`.
- EX-M3 | medium | `examples/valid/exam/thematic-break-in-question.yaml` (question 3) | `docs/question-types/numeric.md:24`, `docs/question-types/numeric.md:112-128` | The expected AST has `decimalPlaces: 1` for `[numeric]: 5.5 +- 10%`. No rule of numeric.md derives `decimalPlaces` from the body: the spec only infers `domain`. | By the spec text: no `decimalPlaces` field. Actual: `decimalPlaces: 1`.
- EX-M4 | medium | `examples/invalid/extra-fields.yaml` | `docs/question-types/base.md:98`, `schema/question-base.yaml:113-114` | The document breaks two rules: it has the unknown field `invalid-field` and it has no `stem` (required). mdq-py reports two `schema-error` diagnostics. The file has no comment that states the intended rule. | Expected: one broken rule. Add a `stem`.
- EX-M5 | medium | `examples/invalid/model-only/ordering-accept-reject-overlap.yaml` | `docs/question-types/ordering.md:305-308`, `docs/question-types/ordering.md:340` | The `accept` entry and the `reject` entry both repeat the answer key (`lines`). The example also breaks "accept should not repeat the `[ordering]` block's own lines" (`accept-repeats-answer-key`) and has a `reject` entry equal to the answer key, which contradicts `ordering.md:305-308` (known: this rule has no code). | Expected: `accept` and `reject` hold the same lines, and these lines differ from `lines`.
- EX-M6 | medium | `examples/invalid/model-only/essay-malformed-locale.yaml` | `docs/question-types/base.md:78`, `docs/question-types/base.md:265`, `docs/lint-codes.md:85` | `brasil` has 6 letters. RFC 5646 allows a language subtag of 5 to 8 letters, so `brasil` is a well-formed tag. It is not a valid tag, because it is not registered. `lint-codes.md` defines `malformed-locale` as "not a well-formed BCP 47 language tag". The comment also cites a schema `locale` pattern that does not exist. | With the definition in lint-codes.md the example is not invalid. Use a value that is not well-formed (`pt_BR`, `português`), or define the rule as "valid" and say which registry check is required. See EX-S9.
- EX-M7 | low | `examples/valid/exam/include-all.yaml`, `nonstandard-include-query.yaml`, `thematic-break-in-question.yaml`, `bank/amazonia-01.yaml` | `docs/question-types/short-answer.md:224-226` | `[short-answer]: Amazônia` parses to `oneOf: [Amazônia]`. The prose says the content is "the only pattern of the `[short-answer/accept]` block", and the frontmatter table has no `oneOf` field. | By the prose: `accept: [Amazônia]`. Actual: `oneOf`. Known (fields `oneOf`, `regex`, `openEnded` are not in the frontmatter table).
- EX-M8 | low | `examples/valid/exam/include-all.lint.json`, `nonstandard-include-query.lint.json` | `docs/exam.md:359` | The rule table gives the field `questions[].id` for `undeclared-id-after-include-all`, and `missing-id` for the same question uses the path `[questions, n, id]`. | Expected path: `[questions, 3, id]`. Actual: `[questions, 3]`.
- EX-M9 | low | `examples/invalid/exam-block-duplicate-key.lint.json` | `docs/lint-codes.md:102-104` | The path is `[]` for an error in the frontmatter of block 0. The path does not locate the block. | Expected: `[questions, 0]`. Actual: `[]`.
- EX-M10 | low | `examples/valid/exam/penalty-policy.yaml`, `examples/invalid/multiple-choice-score-out-of-range.yaml`, `model-only/exam-zero-duration.yaml`, `model-only/essay-malformed-locale.yaml`, `model-only/fill-in-misplaced-blank.yaml`, 4 files that cite `dev/specs/to-do/` | -- | Comments cite sources that do not exist: `docs/adr/0001-score-scale-and-exam-level-clamping.md` (no `docs/adr/`), exam.md section "Scheduling" (the section is "Duration and Start Time"), a schema `locale` pattern (none exists), `fill-in.md:301` (the rule is at line 306), `dev/specs/to-do/unique-ids.md` and `lint-on-models.md` (now in `to-review/`, and `dev/` is not in git). | Fix or remove the references.
- EX-M11 | low | 38 `.yaml` files in `examples/invalid/` and `model-only/` without `.lint.json` | `docs/lint-codes.md:67-117` | Only the 4 examples with a `.mdq.md` source pin the error code. For the other invalid examples the expected code exists only in a comment, so a wrong code (see EX-S3) is not detected. | Add a `.lint.json` to each invalid example.
- EX-M12 | low | `examples/valid/exam/bank/amazonia-01`, `bank/pantanal-02` | -- | No `.lint.json`. The expected list for both is empty by the spec. `mdq-py/tests/test_lint_corpus.py` reads a missing file as an empty list, which conflicts with the convention "missing means not pinned". No `.lint.json` in the corpus holds `[]`. | Decide one convention. Write `[]` when the list is empty.

No disagreement found for: H1 slug and title, instructions, block split, `include` and `include-all` blocks, `max`, `penalty`, `2h 30m` to `PT2H30M`, inherited values, question ids (none derived in the AST), in `include-all`, `midterm`, `penalty-policy`, `scheduled`, `no-questions`, `nonstandard-include-query`, and the 6 bank questions. The comment of `include-all.yaml` about the bank (first query adds `amazonia-01` and `pantanal-01`, second query adds nothing) is correct.

### Coverage gaps

`ID | spec reference | rule or case with no example | suggested example`

Error codes of `docs/lint-codes.md` "Errors" and the example that triggers each:

| Code | Example |
| --- | --- |
| `accept-reject-overlap` | `model-only/ordering-accept-reject-overlap` |
| `blank-choice-text` | `model-only/multiple-choice-blank-choice-text` |
| `blank-text-field` | `model-only/essay-blank-text-field` (`preamble` only) |
| `duplicate-blank-id` | `model-only/fill-in-duplicate-blank-id` |
| `duplicate-choice-id` | `model-only/multiple-choice-duplicate-choice-id` |
| `duplicate-choice-text` | `model-only/multiple-selection-duplicate-choice-text` |
| `duplicate-question-id` | `model-only/exam-duplicate-question-id` (1 of 4 forms) |
| `forbidden-block-element` | `model-only/essay-forbidden-heading-stem` (H1 in `stem` only) |
| `invalid-duration` | `exam-duration-in-months`, `model-only/exam-zero-duration` |
| `invalid-regex` | `model-only/short-answer-invalid-regex` (`regex` field only) |
| `malformed-locale` | `model-only/essay-malformed-locale` (see EX-M6), `model-only/exam-malformed-locale` |
| `malformed-numeric-answer` | `numeric-malformed-fraction-answer` |
| `malformed-start` | `exam-start-not-iso` |
| `malformed-true-false-marker` | `true-false-multi-character-marker`, `model-only/true-false-non-letter-marker` |
| `malformed-uuid` | `essay-malformed-uuid` |
| `misplaced-blank` | `model-only/fill-in-misplaced-blank` |
| `reserved-true-false-marker` | `model-only/true-false-reserved-true-false-marker` |
| `true-false-marker-disagrees-with-correct` | `model-only/true-false-marker-disagrees-with-correct` |
| `undefined-blank` | `model-only/fill-in-undefined-blank` |
| `unknown-include-field` | `exam-unknown-include-field` |
| `unreferenced-blank` | `model-only/fill-in-unreferenced-blank` |

Load errors:

| Code | Example |
| --- | --- |
| `yaml-syntax-error` | `question-duplicate-key`, `exam-block-duplicate-key` (repeated key only) |
| `json-syntax-error` | none |
| `parse-error` | none |
| `conflicting-accept` | none |
| `invalid-document` | none |
| `wrong-kind` | none (API level) |
| `unresolved-include-all` | none (API level) |
| `schema-error` | `exam-ids-not-strings`, `question-id-not-string`, and 12 `.yaml` files |

Gaps:

- EX-G1 | `docs/lint-codes.md:105` | `parse-error`: no invalid `.mdq.md` breaks the grammar. | A question with no body; an exam source with no H1.
- EX-G2 | `docs/exam.md:134-138`, `docs/exam.md:356` | `---` as a thematic break in the epilogue of a question in an exam (critical). | `invalid/exam-thematic-break-in-epilogue.mdq.md`, with the `Nota: leia com atenção.` case of the spec. Add a valid example with `***` in the epilogue.
- EX-G3 | `docs/exam.md:127-128` | Inline question with no frontmatter and no `===`. | `invalid/exam-missing-separator.mdq.md`. See EX-S5: mdq-py accepts this.
- EX-G4 | `docs/exam.md:110-114` | H1 heading in the instructions; `---` fenced block in the instructions. | One invalid source for each. See EX-S6.
- EX-G5 | `docs/exam.md:129-130`, `docs/exam.md:360`, `docs/lint-codes.md:50` | `separator-before-include`: no example. | Valid exam with `===` before an `include` block, with the warning in `.lint.json`.
- EX-G6 | `docs/exam.md:83-85` | `id` and `title` in both the H1 and the frontmatter (frontmatter wins). | Valid exam with `id` and `title` in both places.
- EX-G7 | `docs/exam.md:99-101` | H1 without slug in a valid exam, which gives `missing-id` at path `[id]`. Exam `id` in the frontmatter only. | Valid exam `# Title`.
- EX-G8 | `docs/exam.md:231-241` | Duplicate ids: forms 2, 3 and 4 have no example (two `include` of the same question; inline `id` equal to an `include`; declared `id: q2` equal to the derived id of block 2). | Three `model-only` examples. Also a Markdown source for form 1.
- EX-G9 | `docs/exam.md:243-244` | `include-all` that overlaps an `include` or an inline id is not an error: the exam example covers the overlap with `include`, but not with an inline question of the same declared id. | Add an inline question with `id: amazonia-01` to a copy of `include-all.mdq.md`.
- EX-G10 | `docs/exam.md:156`, `schema/exam.yaml:227-229` | `max: 0`, negative `max`, non-integer `max` (`max: "2"`, `max: 2.5`). | `invalid/exam-include-all-max-zero.yaml`.
- EX-G11 | `docs/exam.md:140-141` | Block with both `include` and `include-all`; `include` with `max`; `max` alone. Only an unknown key (`notes`) has an example. | `invalid/exam-include-and-include-all.mdq.md` with `.yaml`.
- EX-G12 | `docs/exam.md:163-198` | Query language: `OR`, precedence of `AND` over `OR`, parentheses, `NOT NOT`, `EXCEPT` with more than one slug, a Unicode space in the query, a keyword prefix in a tag (`ANDROID`), a lone lowercase `and` (valid tag), a tag with a comma. Only `AND NOT ... EXCEPT slug` and `recursion and draft` have examples. | Valid exam with `(forest OR wetland) AND NOT draft EXCEPT pantanal-02, amazonia-01`, resolved against `bank/`. AST example with U+00A0 in the query and `nonstandard-include-query`.
- EX-G13 | `docs/lint-codes.md:25`, `docs/exam.md:358` | `empty-include-all` is in no `.lint.json`. `include-all.yaml` names it in a comment only, because `load` does not report it. | A pinned expectation for the resolved exam (diagnostics of `Exam.resolve` against `bank/`).
- EX-G14 | `docs/exam.md:212-229` | Derived ids and positions after includes resolve (`q4` after an `include-all` that adds 3 questions). No example shows a resolved exam or derived ids. | Expected output of `resolve` plus derived ids for `include-all.mdq.md`.
- EX-G15 | `docs/exam.md:284-305` | Exam `grading`: no example of the string form, of the mapping form, of an unknown key (`essay`) or of a bad value. | Valid exam with `grading: {true-false: partial}`. Invalid AST with `grading: {essay: partial}`.
- EX-G16 | `docs/exam.md:270-273` | `penalty`: only `capped`. No example of `full`, of an explicit `none`, or of an invalid value. | `invalid/exam-unknown-penalty.yaml` (`penalty: half`).
- EX-G17 | `docs/exam.md:313-338` | Duration forms: no example of `HH:MM` (`1:30`, the unquoted YAML 1.1 case of line 331), ISO with a time part (`PT90M`, `P1DT2H30M`), `Xd Yh Zm` with days, carry (`24h` to `P1D`, `90m` to `PT1H30M`), seconds. | One valid exam for each form.
- EX-G18 | `docs/exam.md:317-318`, `docs/lint-codes.md:83` | Invalid durations from a Markdown source: `0m`, `0:00`, empty string, `1y`, `P1Y`, `1:60`. The two existing examples are AST only (`P1M`, `PT0S`). See EX-S3. | `invalid/exam-duration-*.mdq.md` with `.lint.json`.
- EX-G19 | `docs/exam.md:309-311`, `docs/exam.md:335` | `start`: no example of a date-time without offset, with `Z`, or without seconds. No example of a date that matches the schema pattern but does not exist (`2026-02-30`, `T25:00`), which is a `model-only` case. | `valid/exam/start-local-time.mdq.md`; `invalid/model-only/exam-start-impossible-date.yaml`.
- EX-G20 | `docs/exam.md:342-344` | Empty exam from a Markdown source (H1 only, or H1 and instructions). `no-questions` is AST only. | `valid/exam/no-questions.mdq.md`.
- EX-G21 | `docs/exam.md:249-260` | Inheritance: no example of a question that declares its own `author` or `locale` and keeps it, and no example that shows exam `tags` are not inherited. | Valid exam with `tags`, `author`, `locale` and one question that declares `author`.
- EX-G22 | `docs/exam.md:87-88`, `docs/lint-codes.md:102-104` | Repeated key in the exam frontmatter (the example covers a block only). YAML that does not parse. `json-syntax-error`. `invalid-document` (top level is a list). | `invalid/exam-duplicate-key.mdq.md`, `invalid/question-bad-yaml.mdq.md`, `invalid/not-a-mapping.yaml`, one `.json` example.
- EX-G23 | `docs/question-types/short-answer.md:93-99`, `docs/lint-codes.md:106-107` | `conflicting-accept` has no example. | `invalid/short-answer-conflicting-accept.mdq.md`.
- EX-G24 | `docs/question-types/base.md:129-133`, `docs/lint-codes.md:77`, `docs/lint-codes.md:82` | `forbidden-block-element`: no example for a heading that starts with `[`, a paragraph that starts with `[`, a list whose items all start with `[`, or the fields `preamble` and `epilogue`. `blank-text-field` as error: no example for `stem` and `epilogue`. | One `model-only` example for each form.
- EX-G25 | `docs/exam.md:348-350` | `malformed-uuid`, `unsafe-id`, `blank-text-field` (title) and `uuid-unknown-version` on the exam frontmatter. | `invalid/exam-malformed-uuid.yaml`; valid exam with an id that is not url-safe.
- EX-G26 | `schema/exam.yaml:181-187` | No exam example holds an inline `ordering`, `fill-in`, `numeric` with unit, or `multiple-selection` question. The missing ordering case hides EX-S1. | Valid exam with one question of each type.
- EX-G27 | `docs/exam.md:94-97` | Exam source with no H1 but `type: exam` in the frontmatter; exam with two H1 headings. | Two invalid sources.

### Spec problems

`ID | severity | spec reference(s) | contradiction / ambiguity / omission`

- EX-S1 | high | `schema/exam.yaml:178-187`, `docs/exam.md:118-121` | Schema vs prose: `Entry` has no `$ref` to `ordering.yaml`. The schema rejects an exam with an inline ordering question. The prose allows any question, and mdq-py accepts it.
- EX-S2 | high | `docs/exam.md:88-91`, `docs/exam.md:331-332`, `docs/question-types/base.md:85-88` | Omission: the spec does not define the YAML version or the scalar resolution. It needs YAML 1.1 for `include: yes` (boolean) and for the timestamp in `scheduled.mdq.md`, but rejects YAML 1.1 for `1:30`. A YAML 1.2 parser (the default of most JavaScript libraries) reads `yes` as a string and accepts `invalid/exam-ids-not-strings.mdq.md`. The spec must list which plain scalars are booleans, numbers, dates and nulls.
- EX-S3 | medium | `docs/lint-codes.md:83`, `docs/lint-codes.md:87` | [impl] From a Markdown source, mdq-py reports an invalid `duration` or `start` as `parse-error` with path `[]`. From YAML, it reports `invalid-duration` and `malformed-start` with paths `[duration]` and `[start]`. lint-codes.md gives the specific codes and says a rule with a code reports that code.
- EX-S4 | medium | `docs/exam.md:310` | [impl] `start: 2026-02-30` (unquoted, Markdown source) raises an uncaught `ValueError` ("day is out of range for month") in `mdq.load`. Expected: `malformed-start`.
- EX-S5 | medium | `docs/exam.md:127-128` | Ambiguity and [impl]: "An inline question that does not contain a frontmatter block MUST be preceded by a separator", but the spec does not say how to detect the violation. mdq-py reads the question as instructions (a `[essay]` paragraph in `instructions`), loads an exam with 0 questions and reports only `exam-without-questions`. The instructions have no rule against paragraphs that start with `[`.
- EX-S6 | medium | `docs/exam.md:110-114` | [impl] and omission: the instructions MUST NOT hold an H1 heading or a block between `---`. mdq-py accepts an H1 in the instructions with no diagnostic. It also accepts a `---` block with invalid YAML (`foo: [bar`), with a YAML list, or with a tab in the value, and reads it as text. `lint-codes.md:102-104` says `yaml-syntax-error` covers the frontmatter of an exam block. The spec does not say how to tell a block frontmatter from two thematic breaks with text between them. None of these rules has an error code.
- EX-S7 | medium | `docs/exam.md:247-260` | Omission: the spec does not say if the parsed AST shows the inherited `locale` and `author` on each question. The examples show them (`midterm.yaml`, `scheduled.yaml`). Derived ids get the opposite treatment (`exam.md:213-215`, not in the AST). Defaults (`penalty: none`, `grading: symmetric`) are not in the AST. The spec also does not say if an included question inherits after it resolves. A round trip of the AST writes `author` on each question.
- EX-S8 | medium | `docs/exam.md:108-132`, `schema/exam.yaml:72-76` | Omission: exam.md has no "Markdown to AST mapping" section. The field names `instructions` and `questions`, the fact that `type: exam` is always in the AST, and the form of an include entry exist only in the schema and in the examples.
- EX-S9 | medium | `docs/question-types/base.md:78`, `docs/question-types/base.md:265`, `docs/question-types/base.md:278-280`, `docs/lint-codes.md:85` | Contradiction: base.md says `locale` must be a "valid" BCP 47 tag; lint-codes.md says "well-formed". These are different terms in RFC 5646. Footnote 8 of base.md cites a "`locale` pattern in Frontmatter" that does not exist in base.md or in the schema.
- EX-S10 | medium | `schema/exam.yaml:18-25`, `docs/exam.md:88-91` | Schema vs prose: the description of the exam `id` says "A number written in the frontmatter is read as its decimal string form". The prose and `invalid/exam-ids-not-strings` say a number is an error.
- EX-S11 | medium | `docs/exam.md:334-338`, `docs/exam.md:79`, `schema/exam.yaml:135` | Ambiguity: the canonical form of `start` is not defined. mdq-py writes `Z` as `+00:00`, adds `:00` seconds, writes `.5` as `.500000`, and accepts ISO week dates (`2026-W11-2`) and a lowercase `t`, but rejects the ISO basic format (`20260310`). "A valid ISO 8601 date or date-time" is wider than the schema pattern. The canonical form of a duration with a fraction of a second is also not defined. See EX-M1 for weeks.
- EX-S12 | medium | `docs/exam.md:322-329` | Grammar vs prose: the `duration` grammar accepts the empty string, `P`, `PT`, `P1DT`, and leading or trailing spaces in `xd_yh_zm`. The prose excludes the first three ("at least one component"). `P1DT` has a component, so the prose allows it, but the schema and mdq-py reject it. The grammar also fails to build with the Lark LALR parser (reduce/reduce collision on `" "*`).
- EX-S13 | medium | `docs/question-types/multiple-choice.md:102-104`, `docs/question-types/multiple-choice.md:174-184` | Contradiction: "an omitted value is 0" vs a grading section that depends on unspecified scores. `penalty-policy.yaml` has `score: 0` for each `[ ]` choice, so no choice parsed from Markdown has an unspecified score and `symmetric` equals `partial`. The schema lets `score` be absent.
- EX-S14 | low | `docs/exam.md:134-138`, `docs/exam.md:356` | Omission: the `---` rule covers the epilogue only. `thematic-break-in-question` depends on `---` being legal in the preamble of an inline question, which the spec does not state. The critical rule has no code of its own in lint-codes.md (mdq-py uses `parse-error`).
- EX-S15 | low | `docs/exam.md:164-177` | Ambiguity: `NOTa` and `ANDb` have two readings in the query grammar. The `TAG` regex reads `NOTa` as one tag, but the string terminal `"NOT"` also matches the prefix (Lark Earley gives `NOT a`, LALR gives the tag `NOTa`). [impl] mdq-py accepts `a EXCEPT b_`, and `b_` is not a `SLUG`.
- EX-S16 | low | `docs/exam.md:94-97`, `schema/exam.yaml:161-162` | Schema vs prose: the H1 title is required in the source, but `title` is not required in the schema (`type` is not required either). An AST without a title is valid and cannot be written as Markdown. The spec does not say if a setext heading (`Title` + `===`) is an H1, and `===` is also the separator.
- EX-S17 | low | `schema/exam.yaml:44-49`, `docs/exam.md:58` | Schema-only rules with no prose: `description`, `course`, `title`, `author` and `id` have `minLength: 1` (`invalid/exam-empty-description`). The prose says a blank `title` or `author` is a warning (`blank-text-field`), so `""` is an error and `" "` is a warning. Same for "at least two choices" (`invalid/multiple-choice-single-choice`, `schema/multiple-choice.yaml:21`): multiple-choice.md does not state it.
- EX-S18 | low | `docs/responses.md:239-245`, `docs/lint-codes.md:111-112`, `docs/exam.md:213-215` | Naming: responses.md uses exception names (`MissingIdError`, `UnresolvedInclude`) and lint-codes.md uses codes (`unresolved-include-all`) for the same conditions. responses.md says a question with no id is `MissingIdError`; exam.md says the id is derived (`q1`, ...).
- EX-S19 | low | `docs/exam.md:22-48`, `docs/exam.md:224-226` | The first example of exam.md breaks its own SHOULD: the last question has no `id` and comes after an `include-all`.
- EX-S20 | low | `docs/question-types/short-answer.md:77-78` | Omission: the object form of a pattern is `{pattern, feedback}` in the prose. The schema and `invalid/short-answer-pattern-extra-field` also allow `comment`.
- EX-S21 | low | `docs/question-types/fill-in.md:44-47`, `docs/question-types/fill-in.md:303` | Ambiguity: the spec does not say if the stem can reference the same blank two times. `model-only/fill-in-duplicate-blank-id` does this.
- EX-S22 | low | `docs/lint-codes.md:57` | `unknown-frontmatter-key` is a warning in a Markdown source (exam and question), but the same key in a YAML or JSON document is a `schema-error` (`additionalProperties: false`). No spec text covers unknown keys. Known.
- EX-S23 | low | `invalid/short-answer-open-ended-with-accept`, `invalid/short-answer-open-ended-with-key` | `openEnded` with `oneOf`, `regex`, `accept` or `reject` is rejected by the schema and the model, but short-answer.md does not state the rule. Known.

Examples checked in full: 54 (8 exams and 6 bank questions in `examples/valid/exam/`, 22 in `examples/invalid/`, 18 in `examples/invalid/model-only/`).
```