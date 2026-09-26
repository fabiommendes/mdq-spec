# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This package uses [Semantic Versioning](https://semver.org/). Before 1.0.0, a
minor version can have incompatible changes.

Each release states the version of the
[MDQ specification](https://github.com/fabiommendes/mdq-spec/blob/main/CHANGELOG.md)
that it implements.

## [Unreleased]

Implements part of the unreleased MDQ specification.

### Added

- Parser for every question type (`parseQuestion`, `parseQuestionDocument`).
- Zod schemas and validators for questions and exams.
- Types for student responses.
