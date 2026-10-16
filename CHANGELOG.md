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
  `COMMENT_LINE`, `CHOICE_ID`, `UNICODE_SPACE`), the feedback and comment
  lines, the definition of a visible character, and a regex dialect that
  matches the same characters in Python, JavaScript and JSON Schema.
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
