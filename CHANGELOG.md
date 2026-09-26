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
