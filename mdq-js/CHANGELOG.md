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

- Parser for multiple-choice, multiple-selection, true-false, essay,
  numeric, short-answer, ordering and fill-in questions (`parseQuestion`,
  `parseQuestionDocument`), including an essay's optional
  `## [answer-key]` epilogue section, a numeric body's
  `sign? value abstol? reltol?` expression grammar
  (`parseNumericExpression`), and a short-answer body's `oneOf`/`regex`
  value, `[short-answer/accept]`/`[short-answer/reject]` pattern blocks and
  frontmatter pattern lists, raising `ConflictingAnswerKeyError` when a
  list is declared both ways. Ordering questions are parsed too, with
  their `## [extra]`, `## [accept]` and `## [reject]` sections and the
  indentation unit inferred across all blocks. Fill-in blanks are read
  from their `[^id]:` definitions (choice list, numeric, short answer and
  its accept/reject lists), and the definitions of one blank merge. The
  parser keeps only the choice ids that the source declares, and reads the
  frontmatter as YAML 1.1, like mdq-py.
- Zod schemas and validators for questions and exams.
- Types for student responses.

### Changed

- A numeric value, fraction part or tolerance no longer accepts leading
  zeros (`007`, `00.5`), matching the spec grammar.
- A numeric `unit` accepts any non-space, non-bracket, non-parenthesis
  characters, including Unicode (`µm`, `°C`, `km/h`).
- A numeric question's or fill-in blank's `answer` now also accepts a
  string in the numeric body's grammar (e.g. `"1/3"`, `"-0.25"`), not just
  a number.
- `id`, `include` and `include-all` keep their YAML type: the parser no
  longer converts `id: 2024` to `"2024"`, so the schema rejects it. A null
  `id` counts as absent.
- Grammar whitespace is only spaces and tabs, as the spec now defines it.
  Another Unicode space (U+00A0, U+3000, U+FEFF, ...) where the grammar
  expects whitespace is text, so `[short-answer]:` followed by U+00A0 is not
  trimmed, and `[ short-answer ]:` is not a tag. A leading BOM is removed.
  A numeric `unit` excludes every Unicode space.
- A numeric body's `answer` is a string when a number would lose the
  written value: a fraction (`3/4` gives `"3/4"`), an integer outside the
  32-bit range, and a decimal that the nearest double does not give back,
  including one with a trailing zero (`2.50` gives `"2.50"`). A `+` sign
  is dropped. `domain` and `decimalPlaces` do not change.
- A numeric body's domain is `decimal` when its absolute tolerance is
  written with a decimal point (`0 +- 0.01`, `42 +- 3.5`), whatever the
  form of the value. A relative tolerance does not change the domain.
- Parse error messages quote the source text as mdq-py does (Python
  `repr`), so both implementations give the same message.

### Fixed

- `isExam` ignores lines inside code blocks, so `# comment` in a fenced
  block no longer makes a question load as an exam.
- A trailing code line of Unicode whitespace (NBSP) is kept in the
  reconstructed text. Only spaces and tabs count as blank, as in
  CommonMark.

- A bare `[short-answer]:` block now only defaults to `openEnded: true`
  after its trailing `[short-answer/accept]`/`[short-answer/reject]`
  blocks are read, and only when none of `oneOf`, `regex`, `accept`,
  `reject` or `openEnded` is present anywhere.
