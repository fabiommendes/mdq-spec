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
- Responses (`docs/responses.md`): in a multiple selection or true/false
  response, `null` is the same as an absent key, and any other non-boolean
  value (`"T"`, `1`) is a malformed response.
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
