# Changelog

This file records the changes to the MDQ specification: the syntax in
`docs/`, the JSON Schema in `schema/` and the examples in `examples/`. The
implementations have their own changelogs in
[mdq-py](mdq-py/CHANGELOG.md) and [mdq-js](mdq-js/CHANGELOG.md).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The specification uses [Semantic Versioning](https://semver.org/). Before
1.0.0, a minor version can have incompatible changes.

## [Unreleased]

First version of the specification.

### Added

- File extensions `.mdq.md`, `.md` and `.mdq`.
- Question types: multiple choice, multiple selection, true/false, short
  answer, numeric, fill in the blanks, essay and ordering.
- Exams: several questions in one file, includes from a question bank,
  inherited fields, grading defaults, penalty, `start` and `duration`.
- Grading strategies per question type: `partial` and `symmetric` for all,
  `all-or-nothing` for multiple selection, true/false and fill in, and
  `no-mistakes` (no credit after a mistake, an abstention is no mistake) for
  true/false and fill in. A scalar exam `grading` maps to each type by a
  table.
- Representation and scoring of student responses (`docs/responses.md`).
- Lint codes for problems the schema cannot express (`docs/lint-codes.md`).
- JSON Schema for every document type, and a bundle of all of them in
  `schema/mdq.schema.json`.
- Shared corpus of valid and invalid examples, with the expected parse and
  lint results.
- Common grammar rules (`docs/references/grammar.md`): the terminals that
  several documents share (`ws`, `nl`, `SLUG`, `INTEGER`, `DECIMAL`, `UNIT`,
  `COMMENT_LINE`, `CHOICE_ID`, `UNICODE_SPACE`), the feedback and comment
  lines, the definition of a visible character, and a regex dialect that
  matches the same characters in Python, JavaScript and JSON Schema.
- Normalized value of a choice marker (`docs/references/choices.md`): NFKC,
  then ASCII lowercase, before type inference. `[Ｘ]` is `x` and `[Ｆ]` is
  false. `marker` keeps the letter as written, without the `ws` around it.
- True/false letters are terminals (`TRUE_LETTER`, `FALSE_LETTER`,
  `WARNING_LETTER`) on the normalized value. `LETTER` is a General_Category
  (`Lu`, `Ll`, `Lt`, `Lo`, not `Lm`), an exception to the regex dialect of the
  grammar. Validity is measured on the written text and meaning on the
  normalized value. `[ˇ]` and `[ー]` are `foreign-choice-marker`.
- True/false letter sets (`docs/question-types/true-false.md`, "Body"). The
  meaning of a letter never depends on `locale`. TRUE: `T V B D Đ` and 对 對 真
  是 В 참 ص स স ब ఒ ச ถ સ. FALSE: `F M` and 错 錯 偽 非 Н 거 خ غ ग ম च త த ผ ખ.
  Every other letter, `S` included, is a WARNING letter and reads as true. A
  letter joins TRUE or FALSE only when it has no conflict in actual practice:
  a romanization alone does not count. The annex
  (`docs/annex/true-false-spellings.md`) lists 38 languages, the sources and
  the classification of each candidate letter.
- True/false grading terms (`docs/question-types/true-false.md`, "Grading"):
  a statement is judged correctly, judged wrongly or an abstention. The info
  `uniform-true-false-answers` covers every statement with the same `correct`
  value, reported at `choices`.
- Responses (`docs/responses.md`): a multiple selection response is the list
  of ticked choice ids. In a true/false response, `null` is the same as an
  absent key, and any other non-boolean value (`"T"`, `1`) is a malformed
  response. An id not present in the question is a malformed response for
  every type that uses ids.
- Choice items (`docs/references/choices.md`, "Item"): a block other than the
  first paragraph, the feedback and the comment is a `parse-error`.
- True/false locale table and rules (`docs/question-types/true-false.md`,
  "Locale"): one row per language, with the TRUE and FALSE letters accepted
  and the false friends. `T` and `F` are canonical. A false friend (a letter
  that means false in that language but true globally, such as `S` under `id`
  and `vi`, or `E` under `pt`) gets only `false-friend-true-false-marker`. A
  letter the row accepts gets no warning. Any other WARNING letter gets only
  `unlisted-true-false-marker`. A TRUE or FALSE letter the row does not accept
  gets `locale-mismatched-true-false-marker` (SHOULD). A writer without
  `marker` SHOULD write `T` or `F`.
- True/false `marker` rules (`docs/question-types/true-false.md`, "Choices"):
  the category of `marker` MUST agree with `correct`, and `marker` MUST NOT be
  `X`. These rules, and the letter check, apply to the `marker` field of model
  input. A markdown bracket value that is not allowed gets only
  `foreign-choice-marker`. The schema keeps only the length of `marker`; a rule
  with its own code is reported instead of `schema-error`.
- Lint code `non-nfkc-true-false-marker` (`info`): the marker is not its own
  NFKC form.
- Choice lists (`docs/references/choices.md`): the choice marker, the item
  grammar, the AST fields, and the text and id rules that multiple choice,
  multiple selection, true/false and choice blanks share. A bracket followed
  by `(` or `[` is a link, so a list of links is valid outside the body; the
  empty marker `[]` is a `parse-error`.
- Lint code `stray-choice-marker` (`warning`): a list outside the body with
  some items that start with a choice value is almost always a broken choice
  list.
- Lint codes `non-ascii-whitespace` and `non-ascii-whitespace-in-prose`: a
  Unicode space outside code is a `warning` in a syntax position and an
  `info` inside prose.
- Frontmatter rule (`docs/question-types/question-base.md`): a Markdown
  frontmatter may hold only the fields of the frontmatter table of its
  question type and of the base table. Any other key, a field the body sets
  (`stem`, `choices`, `accept`, the `unit` of a numeric question, ...) or an
  unknown key, is the error `invalid-frontmatter-field` (it replaces the
  warning `unknown-frontmatter-key`). `accept` and `reject` leave the
  frontmatter table of short answer, and `unit` the one of numeric: the body
  sets them (`[short-answer]`, `[numeric(unit)]`). The lint code
  `conflicting-accept` no longer exists. YAML and JSON are unchanged.
- Lint code `redundant-id` (`warning`): `id` set in the frontmatter and as a
  slug. The frontmatter wins, whether the values are equal or not.
- Frontmatter schemas in the bundle (`$defs/frontmatter-<type>`, one per
  question type and for the exam), built from the frontmatter tables by
  `scripts/schema_bundle.py`. `scripts/spec_audit.py` checks the frontmatter
  of every `.mdq.md` example against them.
- Pre-validation feedback for short answer (`docs/question-types/short-answer.md`, "Pre-validation"). An invalid submission shows the feedback of the first matching `preReject` pattern that has one. Otherwise, if no `preAccept` pattern matches, it shows the feedback of the first `preAccept` pattern that has one (a format hint). Fill in short answer blanks follow the same rules. Pattern feedback in `patterns.md` and in the schemas now refers to the selection rule of short-answer.md, "Feedback", instead of "the pattern that decided the response".
- `incorrectFeedback` for the short answer blanks of fill in: a field of the blank in the AST, and a map from blank id to string in the frontmatter (a shorthand, like `preAccept` and `preReject`). An unknown blank id is `undefined-blank`.
- Additional Rules rows of short answer: an empty pattern line (`parse-error`), a `[short-answer/preAccept]` or `[short-answer/preReject]` block (`forbidden-block-element`), and `automation` in the frontmatter (`invalid-frontmatter-field`) or in YAML/JSON (`schema-error`). A note says that the table lists diagnostics only. One sentence each states the minimum of a pattern list, the visible character rule of `incorrectFeedback` and the redundant regex anchor. A SHOULD NOT sentence in "Grading" covers `no-correct-answer`.
- Grading vectors: a `feedback` key in `examples/grading/short-answer.yaml` and the new file `examples/grading/short-answer-prevalidation.yaml`. New valid example: `fill-in/incorrect-feedback`.
- Short answer response (`docs/responses.md`, "Short answer and essay"): the response is a string. Any other value (a number, a boolean, a list, a mapping) is a malformed response. `""` and a string of only spaces are graded like any other response; only `null` skips. Grading vectors in `examples/grading/short-answer.yaml` cover them, with the new score `"malformed"`.
- Exact literal with a backtick (`docs/references/patterns.md`, "Exact literals"; `docs/question-types/short-answer.md`, "Content"): the literal follows the CommonMark code span. A run of N backticks opens it, the first run of exactly N backticks closes it, and one space is removed from each end when both ends have one and the content is not only spaces. `` `` `date` `` `` is the literal `` `date` ``. The grammar has a `FENCE` terminal in place of the single backtick. New valid examples `short-answer/exact-backtick` and `short-answer/exact-backtick-run`, the model-only invalid example `short-answer-fence-mismatch`, and grading vectors.
- The `patternString` schema cannot compare the length of the opening and closing runs of backticks (it needs a backreference, which portable JSON Schema validators lack). It checks that a pattern that opens with a backtick also closes with one; the models check the rest and report `schema-error`.
- Exam `grading` (`docs/exam.md`, "Grading"): short answer, numeric, essay and ordering have no `grading` field. The exam `grading` does not apply to them, and the mapping form has no key for them (`schema-error`). New invalid example `exam-grading-short-answer-key`.
- Glossary entries: Exact literal, Inexact literal, Pattern, Pre-validation, Settled response.
