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

- Question types: multiple choice, multiple selection, true/false, short
  answer, numeric, fill in the blanks, essay and ordering.
- Exams: several questions in one file, includes from a question bank,
  inherited fields, grading defaults, penalty, `start` and `duration`.
- Representation and scoring of student responses (`docs/responses.md`).
- Lint codes for problems the schema cannot express (`docs/lint-codes.md`).
- JSON Schema for every document type, and a bundle of all of them in
  `schema/mdq.schema.json`.
- Shared corpus of valid and invalid examples, with the expected parse and
  lint results.

### Changed

- `blank-choice-text` (a choice's `text` with no visible character) is an
  `error` now, not a `warning`.
- `multiple-choice-many-correct-choices` is an `info` now, not a `warning`:
  a question MAY mark any number of choices as correct.
- An extra field in an `include`/`include-all` exam block is an `error`
  now (`unknown-include-field`), not a dropped-and-warned key.
- `locale` and `uuid`, when present, MUST be well-formed (`malformed-locale`,
  `malformed-uuid`), for both questions and exams. The `locale` BCP 47
  pattern is case-insensitive and accepts variant/extension/private-use
  subtags. `uuid-unknown-version`/`uuid-unknown-variant` stay warnings, for
  a well-formed UUID with unusual nibbles.
- `Exam` now runs the base `id`/`uuid`/`locale`/`title` lint rules
  (`unsafe-id`, `uuid-unknown-version`/`uuid-unknown-variant`,
  `locale-lookalike-language`, `blank-text-field` on `title`,
  `missing-id`/`missing-title`), per exam.md's "Additional Rules".
- A question or exam `id`, and an `include` target, only need to be a
  non-empty string in the schema. An id SHOULD still be url-safe: one that
  is not gets the `unsafe-id` warning and is written in the frontmatter,
  not inline as `[id]`. Choice and blank ids stay url-safe slugs.
- `true-false-marker-disagrees-with-correct` also fires for a PROVISIONAL
  marker paired with `correct: false`: PROVISIONAL markers represent true.
- `docs/lint-codes.md`: clarified the intro, `forbidden-block-element`'s
  exceptions, `misplaced-blank`'s image-alt-text case, and added `fill-in`
  to the question-types column of the choice/numeric/short-answer rules a
  fill-in blank inherits from the question type it declares.
- A numeric question's/blank's `answer` MAY now be a string, for a document
  written directly as JSON/YAML/dict that needs an exact fraction or
  decimal a `float` cannot represent (e.g. `"1/3"`). It MUST follow the
  same `sign? value` grammar as a numeric body's value, and a fraction's
  denominator MUST NOT be zero; a malformed one is the new
  `malformed-numeric-answer` error (numeric.md, "Answer representation").
- Numeric units are now any character except whitespace and the brackets
  `(`, `)`, `[`, `]` (`^[^\s()\[\]]+$`), not the ASCII-only `\w` class,
  admitting units like `µm`, `°C`, `km/h`, and `Ω`.
