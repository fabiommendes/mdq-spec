# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This package uses [Semantic Versioning](https://semver.org/). Before 1.0.0, a
minor version can have incompatible changes.

Each release states the version of the
[MDQ specification](https://github.com/fabiommendes/mdq-spec/blob/main/CHANGELOG.md)
that it implements.

## [Unreleased]

Implements part of the unreleased MDQ specification. The library now passes
the whole shared corpus (`examples/`), as mdq-py does.

### Added

- `load(source, {format, kind})` returns `{document, diagnostics}` for YAML, JSON or Markdown text, or a mapping. `parse` returns the raw document, `assertValid` throws `InvalidDocumentError` on an error diagnostic.
- Model rules beyond the Zod schemas (unique ids, regexes that compile, numeric answers, blank markers, ordering outlines, schedule fields). `validateDocument` and `load` report each one with its own diagnostic code.
- `lint(document)`, `lintQuestion` and `lintExam` report the `warning` and `info` diagnostics. `load` adds them to a valid document.
- `scoreResponse` scores every question type, `prevalidate` checks `preAccept` and `preReject`, and `scoreResponses` scores an exam. `gradingFor`, `shuffleFor`, `resolveQuestion`, `effectiveGrading` and `effectiveShuffle` apply the inheritance of an exam.
- A malformed response is a `ResponseError`. A multiple-selection or ordering response must be an array, not a string or a mapping.
- Numeric answers, responses and tolerances use exact arithmetic (new dependency `fraction.js`). No value is held as a `number`.
- Pattern matching for short-answer and fill-in questions: exact and inexact comparison (`matches`, `normalizeText`, `settleResponse`, `scoreText`) and regex patterns (allow-list of flags and syntax).
- `normalize(question)` gives the canonical form of a question. `withIds(document)` fills in choice ids and the positional `q<n>` ids of an exam. `automation(question)` and `blankAutomation(blank, unmatched)` give `automatic`, `semi-automatic` or `manual`.
- `resolveExam` replaces `include` and `includeAll` entries with the questions of a `QuestionBank`. Also `DictLoader`, `selectRandom`, `IncludeNotFoundError`, the `includeAll` query language (`parseQuery`, `Query`, `isStandardQuery`, `QuerySyntaxError`) and an `empty-include-all` warning.
- Exam parser: `parseExam`, `parseExamDocument` and `parseDocument`, which uses `isExam` to tell an exam from a question. It reads the H1 title, instructions, `===` and `---` question blocks, `include` and `includeAll`, `locale` and `author` inheritance, and the canonical `start` and `duration`.
- Parsers for short-answer, ordering and fill-in questions, and for the optional `## [answer-key]` section of an essay.
- `Diagnostic` and parser warnings (`redundant-id`, `detached-tag`, `setext-heading`, `malformed-separator`, `separator-before-include`). The parse functions take a list to append them to.
- `ParseError.code`, `ParseError.path` and `ParseError.line`. New errors: `YamlSyntaxError`, `ForeignChoiceMarkerError`, `UndefinedBlankError`, `InvalidDocumentError`, `MissingIdError` and `UnresolvedInclude`.
- `findUnicodeSpaces`, `reconstructBlocks`, `findForbiddenElements`, `findAnswerKeyForbiddenElements`, `findStrayChoiceMarkers`, `parseNumericAnswer` and `parseNumericString`.
- New dependency `yaml` (YAML 1.2 Core).
- `load` option `ids`: `"fill"` returns `withIds(document)`; an exam with `includeAll` gives an `unresolved-include-all` error.

### Changed

- The question format follows the new spec: the stem is every block before the body (no `preamble`), an essay's `input` is `content`, a numeric value takes an exponent, a choice marker is normalized with NFKC, tags are lower case, and a tag in the epilogue is `detached-tag`.
- The frontmatter and `load` read YAML 1.2 Core: `yes`, `no`, `2026-03-10` and `1:30` are strings, `010` is 10, scalar keys become strings, and a repeated key, a non-scalar key or a tag outside the Core schema is a `yaml-syntax-error`.
- A frontmatter key that is not a field of the question type is an `invalid-frontmatter-field` error. `id` in the frontmatter and as a slug is a `redundant-id` warning.
- The exam key `include-all` is now `includeAll`; `include-all` is an `unknown-include-field` error.
- A short-answer body always gives `accept` (a pattern on the tag line is one entry). `oneOf`, `regex` and `openEnded` are gone from the schema.
- A blank `[ ]` multiple-choice marker omits `score`. A marker outside the grammar of the type is a `ForeignChoiceMarkerError`.
- A numeric `answer` is a string when a number would lose the written value (`3/4`, `2.50`, an integer outside 32 bits), and it also accepts a string in the numeric body grammar. The domain is `decimal` when the absolute tolerance has a decimal point. A `unit` accepts any non-space characters except brackets and parentheses (`µm`, `°C`).
- Grammar whitespace is only space and tab. Another Unicode space is text, and a leading BOM is removed.
- Empty free-text fields (`comment`, `epilogue`, `answerKey`, `instructions`, feedback) are schema errors, and an empty frontmatter comment is not stored. `tags` must be unique and `weight` must be a number.
- A lone digit or symbol as a choice text gets a fixed id (`1` is `one`, `-` is `hyphen`).
- Parse error messages quote the source as Python `repr` does, so they match mdq-py.
- `DictLoader` indexes only the sources that `load` accepts as a question, and `resolveExam` applies the model rules (a shared question id is an error).

### Removed

- The `js-yaml` dependency. `loadYaml` throws `YamlLoadError` (and `DuplicateKeyError`, which extends it) instead of `YAMLException`.
- `splitFrontmatter`, `extractComment`, `loadFrontmatterYaml`, `normalizeTags`, `buildChoices`, `inferChoiceType`, `parseItem`, `splitListItems` and `BRACKET_ITEM_RE` are no longer exported. `loadYaml` reads YAML text.
- The `preamble` field of a question.

### Fixed

- `isExam` ignores lines inside code blocks, so `# comment` in a fenced block no longer makes a question load as an exam.
- A trailing code line of Unicode whitespace (NBSP) is kept in the reconstructed text.
- An `[essay]` tag followed by `## [answer-key]` with no blank line in between is still an answer key.
