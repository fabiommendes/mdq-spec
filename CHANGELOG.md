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
- Representation and scoring of student responses (`docs/responses.md`).
- Lint codes for problems the schema cannot express (`docs/lint-codes.md`).
- JSON Schema for every document type, and a bundle of all of them in
  `schema/mdq.schema.json`.
- Shared corpus of valid and invalid examples, with the expected parse and
  lint results.
- Common grammar rules (`docs/references/grammar.md`): the terminals that
  several documents share (`ws`, `nl`, `SLUG`, `INTEGER`, `DECIMAL`, `UNIT`,
  `COMMENT_LINE`, `UNICODE_SPACE`) and a regex dialect that matches the same
  characters in Python, JavaScript and JSON Schema.
- Lint code `non-ascii-whitespace`: a Unicode space outside code is a
  `warning` in a syntax position and an `info` inside prose.

### Changed

- The grammar whitespace `ws` is only spaces and tabs, and `nl` is only
  `\r\n`, `\r` and `\n`. Other Unicode spaces and line separators are
  text. A paragraph that starts with U+00A0 before a tag is text, not a tag.
- A byte order mark at the start of a file is removed before parsing.
- The `unit` pattern excludes `UNICODE_SPACE` instead of `\s`. The schema
  `unit` pattern changed to match.
- The exam query `TAG` excludes `UNICODE_SPACE` instead of `\s`. The
  duration terminal `DECIMAL` is now `SECONDS`.
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
- `docs/lint-codes.md`: `blank-choice-feedback`, `blank-choice-comment`,
  `missing-choice-id` and `visually-identical-choices` also apply to a
  fill-in choice blank. A new "Load errors" section lists the codes `load`
  reports when it cannot read a document or build a model.
- Snapshots of the expected lint results for the fill-in examples with
  choice blanks.
- true-false.md: implementations SHOULD warn about `S` under `locale: id`
  with a dedicated warning, instead of "escalating" the mismatch warning.
- ordering.md: an accepted and a rejected section MUST NOT hold the same
  lines after all forms of normalization, not only the same raw lines.
- short-answer.md: `redundant-regex-anchor` covers only an anchor that is
  already implicit given the `f`/`b` flags, in `regex` and in delimited
  `accept`/`reject` entries.
- `docs/lint-codes.md`: `domain-mismatch` infers the domain from the answer
  and the absolute tolerance, as numeric.md says. The `numeric/zero-answer`
  example now derives `domain: decimal`.
- numeric.md, "Answer representation": a numeric body's value is no
  longer always a JSON number. A fraction stays a string (`1/3` is
  `"1/3"`), an integer outside the 32-bit signed range stays a string, and
  a decimal becomes a number only if the number gives back the digits as
  written (`0.25` converts; `2.50` and `3.14159265358979323846` stay
  strings). `domain` does not depend on this choice. A document written
  directly as JSON/YAML/dict may use either form. The `numeric/fraction`
  example now holds `answer: "3/4"`, and new examples cover a large
  integer, a trailing zero, a long decimal, a fraction blank and a
  fraction written as a float.
- `docs/lint-codes.md`: `answer-outside-domain` and
  `relative-tolerance-around-zero` judge a string answer by its value.
- numeric.md: with `domain: fraction`, a JSON/YAML/dict answer SHOULD be a
  fraction string or an integer. An integer answer agrees with `fraction`,
  and a number that is not whole is a decimal only, so `answer: 0.75` with
  `domain: fraction` gets `domain-mismatch` (`numeric/fraction-answer-float`,
  new `numeric/fraction-domain-integer`).
- `ignored-decimal-places` uses the declared domain, or the one inferred
  from the answer and the absolute tolerance, and fires unless it is
  `decimal` (new `numeric/ignored-decimal-places-inferred`).
- `skills/mdq-questions`: the numeric reference states the current unit rule
  (any character except whitespace and `(`, `)`, `[`, `]`) and the answer
  representation.
