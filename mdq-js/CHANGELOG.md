# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This package uses [Semantic Versioning](https://semver.org/). Before 1.0.0, a
minor version can have incompatible changes.

Each release states the version of the
[MDQ specification](https://github.com/fabiommendes/mdq-spec/blob/main/CHANGELOG.md)
that it implements.

## [Unreleased]

Implements part of the unreleased MDQ specification.

### Changed

- The index of `DictLoader` only holds the sources that `load` accepts as a question: a mapping with `tags` as a string, or with a model rule broken, is left out, and a `tags` string is no longer split at commas. `resolveExam` also applies the model rules (a shared question id is an error).

- The question parser is split like mdq-py (`parser/question.ts`, `blocks.ts`, `tags.ts`, `choices.ts`, `frontmatter.ts`, `numeric.ts`, `spaces.ts`; `letters.ts`, `markdown.ts`, `exact.ts`, `include-keys.ts` at the top). Multiple-choice, multiple-selection, true-false, essay and numeric bodies follow the new format: the stem is every block before the body (no `preamble`), an essay's `input` is `content`, a numeric value takes an exponent, a choice marker is normalized with NFKC, tags are lower case, and a tag in the epilogue is `detached-tag`.
- A frontmatter key that is not a field of the question type is an `invalid-frontmatter-field` error diagnostic (was the `unknown-frontmatter-key` warning). A `redundant-id` warning reports `id` in the frontmatter and as a slug.
- The comment of the frontmatter is trimmed.
- The exam include block key `include-all` is renamed to `includeAll` (Zod schema, parser, `resolveExam`). `include-all` is now an unknown field (`unknown-include-field`).
- Empty free-text fields (`comment`, `epilogue`, `answerKey`, `instructions`, feedback) are now schema errors, and an empty frontmatter comment string is not stored.
- Refreshed the bundled schema (description text only).
- The short-answer, fill-in, ordering and exam parsers are ported from mdq-py, and the old parser is gone. `ConflictingAnswerKeyError` is removed: `accept` and `reject` in the frontmatter are invalid fields. The exam parser reports `malformed-separator`, and `setext-heading` only outside `stem` and `epilogue`. A `title: null` in the exam frontmatter is dropped.

### Added

- `load`, `parse` and `assertValid` (`loading.ts`), ported from mdq-py: YAML, JSON and Markdown text or a mapping in, `{document, diagnostics}` out. A Zod issue is a `schema-error` with a path in the form of mdq-py (no union tag), a model rule keeps its own code, a repeated JSON key is a `json-syntax-error`, a `null` of an optional field is absent, and `start` and `duration` take their canonical form. `ParseError` has the `line` of its node, and `InvalidDocumentError` is new.
- The model rules of `BaseQuestion` and of the exam (`models/base.ts`, `models/exam.ts`): `blank-text`, `malformed-locale`, `malformed-uuid`, `forbidden-block-element` (also a setext H1 in the stem, the epilogue and the exam instructions), `malformed-start`, `invalid-duration` and `duplicate-question-id`. `validateDocument` runs them after Zod and reports each as a `custom` issue with the rule's code in `params.code`.
- The model rules of each question family (`models/choice.ts`, `numeric.ts`, `text.ts`, `fill-in.ts`, `ordering.ts`): choice ids and texts, true/false markers, numeric answers and decimal places, short answer patterns (`block-start-pattern`, `invalid-regex`), the essay answer key, fill-in blanks and markers, and ordering answers and outlines. `load` reports `malformed-numeric-answer` and `malformed-true-false-marker` for the values that the schema pattern rejects first. A `null` in the `grading` map of an exam is a `schema-error`, as in mdq-py.
- Pattern matching, ported from mdq-py: `RegexPattern` and the regex allow-list (`models/regex.ts`), the exact and inexact comparison (`matches`, `normalizeText`, `settleResponse`, `scoreText` in `models/text.ts`), and `scoreResponse` for short answer questions and for fill-in questions with short answer blanks.
- `findUnicodeSpaces` (the `non-ascii-whitespace` lint of the source), `reconstructBlocks`, `findForbiddenElements`, `findAnswerKeyForbiddenElements`, `findStrayChoiceMarkers`, `parseNumericAnswer` and `parseNumericString`.
- Parser for multiple-choice, multiple-selection, true-false, essay,
  numeric, short-answer, ordering and fill-in questions (`parseQuestion`,
  `parseQuestionDocument`), including an essay's optional
  `## [answer-key]` epilogue section, a numeric body's
  `sign? value abstol? reltol?` expression grammar, and a short-answer body's `[short-answer]`,
  `[short-answer/accept]` and `[short-answer/reject]` blocks and
  frontmatter pattern lists. Ordering questions are parsed too, with
  their `## [extra]`, `## [accept]` and `## [reject]` sections and the
  indentation unit inferred across all blocks. Fill-in blanks are read
  from their `[^id]:` definitions (choice list, numeric, short answer and
  its accept/reject lists), and the definitions of one blank merge. The
  parser keeps only the choice ids that the source declares, and reads the
  frontmatter with the YAML 1.2 Core schema, like mdq-py.
- Parser for exams (`parseExam`, `parseExamDocument`): the H1 title, the
  instructions, `===` and `---` question blocks, `include` and
  `includeAll` entries, `locale`/`author` inheritance, and the canonical
  `start` and `duration`.
  `parseDocument` tells an exam from a question (`isExam`) and parses it.
- `Diagnostic` and the parser warnings: `parseDocument`,
  `parseQuestionDocument` and `parseExamDocument` take a list to append
  `redundant-id`, `detached-tag`, `setext-heading`, `malformed-separator`
  and `separator-before-include` to.
- `ParseError.code` and `ParseError.path`, with `YamlSyntaxError`
  (`yaml-syntax-error`), `ForeignChoiceMarkerError`
  (`foreign-choice-marker`) and `UndefinedBlankError` (`undefined-blank`).
- Zod schemas and validators for questions and exams.
- Types for student responses.
- `resolveExam`, which replaces the `include` and `includeAll` entries of an
  exam with the questions a `QuestionBank` holds, with `DictLoader` as the
  in-memory bank, `selectRandom` as the default `includeAll` choice, an
  `empty-include-all` warning through `ResolveOptions.warnings`, and
  `IncludeNotFoundError`. The `includeAll` query language: `parseQuery`,
  `Query`, `isStandardQuery` and `QuerySyntaxError`.

### Changed

- A numeric value, fraction part or tolerance no longer accepts leading
  zeros (`007`, `00.5`), matching the spec grammar.
- A numeric `unit` accepts any non-space, non-bracket, non-parenthesis
  characters, including Unicode (`µm`, `°C`, `km/h`).
- A numeric question's or fill-in blank's `answer` now also accepts a
  string in the numeric body's grammar (e.g. `"1/3"`, `"-0.25"`), not just
  a number.
- `id`, `include` and `includeAll` keep their YAML type: the parser no
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
- The spec audit (mdq-spec `844dc01` and before):
  - A short-answer body always gives `accept`; `oneOf`, `regex` and
    `openEnded` are gone from the schema and the parser. A pattern on the
    tag line is the one `accept` entry (`/re/` keeps its delimiters), and
    the two accept spellings count as one block, declared at most once.
    `unmatched` and `incorrectFeedback` are short-answer and fill-in
    fields.
  - A blank `[ ]` multiple-choice marker omits `score`; `correct` is
    required in multiple-selection and true-false, so `[ ]` writes
    `correct: false`. A marker outside the type's grammar is a
    `ForeignChoiceMarkerError`, not an unmarked choice.
  - `grading` and `shuffle` of a question accept `inherit`; an exam has
    `shuffle`.
  - The frontmatter follows the YAML 1.2 Core schema: `yes`, `no`,
    `2026-03-10` and `1:30` are strings, `010` is 10, `0o10` is 8. A null
    field is absent (an exam's null `title` is kept). A repeated key is a
    `YamlSyntaxError`.
  - An ATX heading keeps its `#` markers in `preamble`, `stem`, `epilogue`
    and `answerKey`. A `[text](url)` or `[text][ref]` link is never a slug
    or a choice id. A lone `#` in the frontmatter is `comment: ""`. A
    second `## [answer-key]` is a parse error.
  - A numeric question with `domain: decimal`, declared or inferred,
    carries `decimalPlaces`: the places written in the value and in the
    absolute tolerance, whichever is larger. A tolerance kind written twice
    is a parse error.
  - Fill-in `preAccept`/`preReject` map blank ids to pattern lists; a key
    that is not a blank is an `UndefinedBlankError`. A choice blank's list
    must start on the line after its tag. A numeric blank infers
    `decimalPlaces` like a numeric question.
  - Ordering observations (`>` feedback, `!` comment) are read from the raw
    lines: adjacent blocks with different prefixes are separate, repeated
    or interleaved prefixes are a parse error. An ordering `ul` item is one
    line. A block between the content and a section is a parse error.
  - An exam is an exam only when its first non-blank line after the
    frontmatter is the H1. A `---` pair in block position opens a block
    even when its YAML is broken. A blank `answerKey` passes the schema.
  - `tags` must be unique; `weight` must be a number; a true-false marker
    is one code point, also outside the BMP; `patternString` requires a
    complete backtick span.

### Fixed

- `isExam` ignores lines inside code blocks, so `# comment` in a fenced
  block no longer makes a question load as an exam.
- A trailing code line of Unicode whitespace (NBSP) is kept in the
  reconstructed text. Only spaces and tabs count as blank, as in
  CommonMark.

- An `[essay]` tag followed by `## [answer-key]` with no blank line in
  between is still an answer key.
