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

### Changed

- The JSON files are imported with `with { type: "json" }`, so the built package loads in plain Node ESM, not only through a bundler.
- `zod` is a peer dependency (`>=4.3.6 <4.5`), so a consumer that builds schemas over the exported ones shares one zod copy. zod 4.5 changed how union issues are reported, and some diagnostics of `load` differ under it.

### Added

- `scoreBlanks(question, response)` gives the score of each blank of a fill-in response, keyed by blank id, with `null` for a pending blank. It throws `ResponseError` like `scoreResponse`, but not `NotAutoGradable`, so a host can show the settled blanks of a pending response. `QuestionScore.blanks` holds the same map for a settled fill-in response.
- `publicForm(question)` gives the question as a student may see it, without the answer key, feedback, comments, `author` and `meta` (`docs/public-form.md`). A numeric question gets its effective `domain` and `decimalPlaces`; an ordering question gets a sorted `pool` in place of `lines` and `extra`. Short-answer and ordering questions and each short answer blank carry their effective `unmatched`; a fill-in question has none of its own. A choice without an id throws `MissingIdError`. Types: `PublicQuestion` and one per question type.
- `correctResponses(question)` gives the responses that score 1, derived from the answer key. A fill-in question gives a record from blank id to the responses of that blank.
- `mdq/solid`: SolidJS components, first the base ones (`Markdown`, `Score`, `Feedback`, `Mark`). They emit semantic `mdq-*` classes and keep state in `data-*` attributes. Text comes from a `Messages` dictionary (English by default, `ptBR` included), set by the optional `MdqProvider` or by the `messages` prop of each component. The `"solid"` export condition ships JSX for the consumer to compile.
- `MultipleChoice` in `mdq/solid`: renders a `PublicMultipleChoiceQuestion` in `answer`, `readonly` or `review` mode. In review it marks the choices of `result.correct` and the wrong pick, with text for screen readers, and shows every feedback message of the result.
- `TrueFalse` in `mdq/solid`: renders a `PublicTrueFalseQuestion` with one three-state toggle per statement (true, false, abstained). In review it marks each judged statement against `result.correct`. An abstained statement has no key in the response.
- `MultipleSelection` in `mdq/solid`: renders a `PublicMultipleSelectionQuestion` with one checkbox per choice. In review it judges each choice by its ticked state against `result.correct`, so a correct choice left unticked is marked wrong.
- `ShortAnswer` in `mdq/solid`: renders a `PublicShortAnswerQuestion` as one text input. It warns as the student types with `preAccept` and `preReject` (through `prevalidateText`), and in review it marks the verdict and lists the accepted answers. Also `Pending` and the `PendingResult` type for a response that waits for an instructor.
- `Numeric` and `NumericInput` in `mdq/solid`: render a `PublicNumericQuestion` as one box with its unit. The box sends a response string only when the text is a valid response for the domain, and `null` otherwise. In review it marks the verdict from the score and shows the expected value.
- `Essay` in `mdq/solid`: renders a `PublicEssayQuestion` as a text box, and shows the submitted text by `content` (Markdown, plain or code) outside `answer` mode. A pending result shows a badge and no feedback; the answer key is a second panel in review.
- `FillIn` and `ChoiceSelect` in `mdq/solid`: render a `PublicFillInQuestion` as a sentence with its blanks in place (a choice picker, a numeric box or a text box). A `[^slug]` is a blank only in the plain text of a paragraph, as the spec says. In review, `result.blanks` (from `scoreBlanks`) marks each blank as correct, incorrect or pending (an empty blank has no mark) and lists the feedback of each blank under its label; `result.correct` (from `correctResponses`) lists the expected answers per blank. `FillInResult` extends `QuestionScore` with `correct`; `PendingFillInResult` takes `blanks` and `correct`, so a half-pending response still shows its settled blanks. Types: `FillInKey`.
- `Ordering` in `mdq/solid`: renders a `PublicOrderingQuestion`. The student starts from the whole pool and orders it with buttons (move up, move down, leave out, use, and indent and outdent under `lenient` and `strict`) that have the line text in their names, with a polite live region that announces each change and the focus kept on the moved line. A line left out goes to a "Not used" list, which is how a distractor is dropped. A text answer stays a valid outline. `readonly` and `review` show the lines without controls; a review shows every accepted order and no per-line verdict, and its `result` may be pending (`unmatched: manual`).
- `QuestionView` in `mdq/solid`: renders a question with the component of its `type`. A type it does not know gets a note instead.
- `css/plain.css` and `css/daisyui.css`: a `.mdq-markdown` block has no margin at its first and last child, and the feedback in daisyUI keeps the color of its box.
- Every component and `MdqProvider` take `locale` (`"en"` or `"pt-BR"`) to pick a shipped dictionary by name. Unlike `messages`, it survives the serialization of an Astro island's props.
- `mdq/css/plain.css` (minimal, functional styles) and `mdq/css/daisyui.css` (daisyUI 5, through the consumer's Tailwind v4 build).
- `package.json` has an `exports` map: `.`, `./solid` and `./css/*`.
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
- `normalize()` gives what a render and parse give: it strips the spaces around choice texts, patterns and the `feedback` and `comment` of choices, patterns and ordering alternatives, fills `domain` and `decimalPlaces` of numeric questions and blanks and the `marker` of true/false statements, and puts a numeric `answer` in the form a render and parse keep (`"100"` becomes `100`, `"1.50e3"` stays a string). A whole number outside the 32-bit range counts as a float, since a JS number cannot tell `2` from `2.0`.
- A frontmatter `type` that disagrees with the body is one `parse-error` instead of `schema-error` entries. A frontmatter error is reported together with a body `parse-error`, in that order. The message of `invalid-frontmatter-field` says "an essay".

### Removed

- The `js-yaml` dependency. `loadYaml` throws `YamlLoadError` (and `DuplicateKeyError`, which extends it) instead of `YAMLException`.
- `splitFrontmatter`, `extractComment`, `loadFrontmatterYaml`, `normalizeTags`, `buildChoices`, `inferChoiceType`, `parseItem`, `splitListItems` and `BRACKET_ITEM_RE` are no longer exported. `loadYaml` reads YAML text.
- The `preamble` field of a question.

### Fixed

- `isExam` ignores lines inside code blocks, so `# comment` in a fenced block no longer makes a question load as an exam.
- A trailing code line of Unicode whitespace (NBSP) is kept in the reconstructed text.
- An `[essay]` tag followed by `## [answer-key]` with no blank line in between is still an answer key.
