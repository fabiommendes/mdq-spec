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

### Changed

- One severity per lint code. A Unicode space in prose (not U+0085, U+2028, U+2029, and not in a syntax position) now reports the new `non-ascii-whitespace-in-prose` code (`info`); `non-ascii-whitespace` is always `warning`. A blank `preamble`, `epilogue` or `stem` now reports the new `blank-content-field` code (`error`); `blank-text-field` is always `warning`.
- Free-text fields (`comment`, `preamble`, `epilogue`, `answerKey`, `instructions`, feedback and choice/pattern comments) must not be the empty string (`minLength: 1`). Whitespace only stays the `blank-text-field` warning. An empty frontmatter comment string is not stored.
- A blank (whitespace-only) exam `instructions` now reports `blank-content-field` (`error`), like `preamble`, `epilogue` and `stem`.
- Consistency pass over `docs/`, `schema/` and `examples/`: broken anchors and duplicate footnotes fixed, the ordering observation grammar allows blank lines between the `>` and `!` blocks, and the `id` false-friend, `[150%]`, `x` marker and regex-escape wording is made explicit. Renamed examples `exam-two-h1` to `exam-h1-in-question` and `true-false-marker-disagrees-provisional` to `true-false-marker-disagrees-warning`.

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

- Short-answer questions and short-answer blanks of fill-in lose the fields
  `oneOf` and `regex`. `accept` is the only answer list.
- `[short-answer]` is the accept block and `[short-answer/accept]` is an
  alias. A block takes one pattern on the tag line or a list right after it.
  A list after a blank line is an epilogue element
  (`detached-answer-list`). Using both spellings, or a pattern and a list on
  one block, is an error. A `[short-answer]` block with content MUST NOT be
  combined with `accept` in the frontmatter (`conflicting-accept`).
- Short-answer blanks get `openEnded`, with the same rule as the question.
- Lint code `shadowed-answers` is removed. Lint code `detached-answer-list`
  is added.
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
- `docs/lint-codes.md`, "Load errors": `schema-error` covers every JSON
  Schema rule without a code of its own (a missing or unknown field, a wrong
  type, a value out of range, a pattern mismatch). Implementations no longer
  report their validator's own error types.
- New errors `invalid-duration` (an exam `duration` that is not positive
  or not in an accepted form), `malformed-start` (an exam `start` that is
  not ISO 8601) and `malformed-true-false-marker` (a marker that is not a
  single letter). New examples `invalid/model-only/exam-zero-duration` and
  `invalid/model-only/true-false-non-letter-marker`.
- A frontmatter value keeps its YAML type (base.md, exam.md): `id`, and an
  exam block's `include`/`include-all`, MUST be YAML strings. `id: 2024` or
  `include: yes` is an error (`schema-error`), not the string `"2024"` or
  `"True"`. A null `id` is absent. The `essay/numeric-id` example is gone;
  new invalid examples `question-id-not-string` and `exam-ids-not-strings`.
- `examples/invalid/` may hold `.mdq.md` documents. Each has a `.lint.json`
  with every diagnostic `load` reports, errors included, and a `.yaml`
  sibling, if present, reports the same ones.
- A YAML mapping MUST NOT repeat a key (base.md, exam.md): in a question or
  exam frontmatter, in an exam block's frontmatter, and in a YAML document.
  It is `yaml-syntax-error`, not last-value-wins. A JSON object that repeats
  a key is `json-syntax-error`. New invalid examples
  `question-duplicate-key` and `exam-block-duplicate-key`.
- base.md: a null `id` or `tags` is the same as an absent field.
- `skills/mdq-questions`: the numeric reference states the current unit rule
  (any character except whitespace and `(`, `)`, `[`, `]`) and the answer
  representation.
- The pattern mini-language (exact, inexact, regex and wildcard patterns,
  the object and list-item forms) and the regex dialect move from
  short-answer.md and fill-in.md to `docs/references/patterns.md`. A regex
  flag that is neither supported (`i`, `n`, `f`, `b`) nor ignored (`m`,
  `g`, `s`, `u`, `v`, `y`, `d`), or a repeated flag, is now an error
  (`invalid-regex`). New invalid examples `short-answer-unknown-regex-flag`
  and `short-answer-repeated-regex-flag`.
- `redundant-regex-anchor`, `ignored-regex-flag`, `accept-wildcard` and
  `unreachable-reject` also cover the `preAccept` and `preReject` lists of
  a short-answer question and of a short-answer blank. New examples
  `short-answer/pre-validation-regex-lints`,
  `short-answer/pre-validation-wildcard` and `fill-in/pre-validation-lints`.
- patterns.md, "Inexact literals": the inexact comparison is now six exact
  steps. It removes invisible code points (controls and
  `Default_Ignorable_Code_Point`), replaces Latin letters with no
  decomposition (`ø` to `o`, `æ` to `ae`), replaces typographic quotes and
  dashes with the ASCII ones, uses the full case folding of Unicode and
  takes `UNICODE_SPACE` as whitespace in place of `/\s+/`. The tables are in
  `docs/references/inexact-tables.json`, generated by
  `scripts/inexact_tables.py` from Unicode 18.0.0 and CLDR 48. New vectors in
  `examples/matching/inexact.yaml`.
- patterns.md: an exact literal MUST normalize the pattern and the response
  to NFC (it was optional) and trims only `UNICODE_SPACE` from their ends.
  New vectors in `examples/matching/exact.yaml`. The regex `n` flag removes
  combining marks and does not use the `letters` table.
- Short-answer questions and short-answer blanks lose the field `openEnded`.
  Every question type has an **automation** (`automatic`, `semi-automatic`
  or `manual`), a derived property that never appears in the frontmatter or
  in the YAML/JSON form (base.md, "Automation"). Short-answer gains the field
  `unmatched` (`incorrect` or `manual`, the same field as ordering): what
  becomes of a response that matches no pattern. When absent, it is
  `incorrect` for a question with an `accept` pattern and `manual` for one
  without. Fill-in takes `unmatched` for all of its short-answer blanks.
  A `reject` list no longer changes what happens to the other responses.
- Short-answer gains `incorrectFeedback`: the feedback of an incorrect
  response that no pattern gave feedback to.
- The `*` wildcard is removed. `*` is an ordinary literal, and no longer
  needs backticks. The lint codes `accept-wildcard` and `unreachable-reject`
  are removed; `short-answer-not-gradable` is replaced by `no-correct-answer`
  (no `accept` pattern with `unmatched: incorrect`).
- responses.md defines a **pending** response: one the question does not
  settle. It has no score and no feedback until the instructor grades it.
- Corpus: `short-answer/open-ended` is now `manual`; `not-gradable` is now
  `no-correct-answer`; `accept-wildcard`, `unreachable-reject`,
  `pre-validation-wildcard` and `invalid/short-answer-open-ended-with-accept`
  are removed; new `short-answer/semi-automatic`, `short-answer/reject-only`,
  `fill-in/unmatched-manual`, `invalid/short-answer-unknown-unmatched` and
  `invalid/short-answer-automation-field`.
- patterns.md, "Continuation lines": a pattern, a feedback and a comment can
  continue on the next lines of the item, and each line ending becomes one
  space. The text only described the first line. New examples
  `short-answer/continuation-lines` and `fill-in/continuation-lines`.
- short-answer.md and lint-codes.md: a document that writes `accept` or
  `reject` both in the frontmatter and in the body is always an error
  (`conflicting-accept`). The text let an implementation accept it. The code
  no longer mentions `preAccept`/`preReject`, which have no body block.
- fill-in.md, "Feedback": a short answer blank carries feedback on its
  patterns, under the short answer rule. The section said it had no feedback
  syntax, which contradicted the grammar and the example above it.
- numeric.md and fill-in.md grammars: a tag followed by `:` may have spaces
  before the colon, as base.md, "Bracketed tags", already said and as the
  short-answer grammar already allowed.
- base.md, "Markdown to AST mapping": the exceptions to "fields are
  translated as-is" are listed (`tags` as a comma-delimited string, the
  per-type shorthands). Footnote 8 no longer cites a `locale` pattern that
  does not exist. schema/exam.yaml and schema/question-base.yaml no longer
  say that a numeric `id` is read as a string.
- ordering.md, "Indentation" and "Grading": under `indentation: fixed` the
  indentation level identifies a line, as under `strict`; only `dedent`,
  listed or implied by `lenient`, removes it. Before, `fixed` ignored the
  level, so a distractor that differed from a key line only by indentation
  was accepted. `dedent` is defined as flattening every line to level 0; the
  text also said it removed only the common indentation.
- numeric.md, "Decimal places": `decimalPlaces` is the precision of the
  comparison. The response and the answer are rounded to it, half away from
  zero in decimal arithmetic, before the tolerance test; a response with
  more digits is never malformed. When absent, it is inferred as the larger
  of the decimal places written in the value and in the absolute tolerance
  (`0 +- 0.01` gives 2). responses.md no longer calls such a response
  malformed. The domain table has no `fraction` absolute tolerance, which
  the grammar and the schema never allowed.
- exam.md, "Exam score": the formula of the exam score (weighted mean of
  the question scores after `penalty`), skipped questions, zero total
  weight, the range, and pending responses with an optional provisional
  score. Before, only a footnote of base.md said "weighted mean".
- schema/exam.yaml: an exam entry may be an ordering question. The `Entry`
  union lacked `ordering.yaml`, so an exam with one failed the schema while
  exam.md and the implementations accepted it. New example
  `exam/with-ordering`.
- base.md, "Frontmatter": the frontmatter and YAML documents follow the
  YAML 1.2 Core schema. `yes`, `no`, `on`, `off`, timestamps and `1:30` are
  plain strings and `010` is the decimal 10; the spec did not say which
  YAML it meant, and the two implementations disagreed on exactly these
  forms. exam.md, "Duration and Start Time": `start` may separate the date
  and the time with a space. New example `multiple-choice/yaml-core-schema`;
  `invalid/exam-ids-not-strings` no longer uses `include: yes`, which is a
  valid string now.
- exam.md, "Penalty": the text said that under `penalty: none` the
  `symmetric` and `partial` strategies of a multiple-selection question give
  the same exam total. They differ for every positive score; the floor only
  removes the negative part.
- Choice ids are in the item grammar of multiple-choice.md,
  multiple-selection.md and true-false.md (`choice_id : "[" SLUG "]"`), and
  base.md, "Slug", makes the `SLUG` terminal a MUST. A bracket followed by
  `(` or `[` is a markdown link, not an id or a slug. New examples
  `multiple-choice/link-choice` and `essay/link-stem`.
- base.md, "Type inference": the rules that pick multiple choice, multiple
  selection or true/false from the choice values are now written down, and
  a value outside the `value` rule of the resulting type is a
  `foreign-choice-marker` error instead of an unmarked choice. New invalid
  examples `multiple-choice-foreign-marker`, `multiple-selection-forced-star`,
  `multiple-selection-unknown-marker`, `true-false-blank-marker` and
  `fill-in-foreign-marker`.
- multiple-choice.md, "Choices": `[ ]` omits `score` from the document and
  the grading strategy decides its value; `[0%]` is an explicit zero. The
  text said an omitted value is 0, against the "Grading" section. The
  symmetric column of the grading table had `[1, 1, _, _]` as -0.50; it is
  -1.00. The corpus no longer writes `score: 0` for a `[ ]` choice.
- fill-in.md, "Frontmatter": `preAccept` and `preReject` of a short answer
  blank are written in the question's frontmatter, as a map from the blank
  id to the pattern list. The schema had the lists on the blank, but
  Markdown had no way to write them, so a render lost them. In JSON they
  stay fields of the blank. A key that is not a declared blank is an
  `undefined-blank` error. New examples `fill-in/pre-validation-lints.mdq.md`,
  `invalid/fill-in-pre-accept-undefined-blank` and
  `invalid/fill-in-pre-reject-on-numeric-blank`.
- base.md: a stem of a single ellipsis is no longer a placeholder that an
  implementation MAY replace by a default statement. It is a stem like any
  other. Lint code `unexpanded-stem-ellipsis` is removed, and so is the
  example `multiple-choice/ellipsis-stem`.
- essay.md: `input` defaults to `text`, as the schema already said.
- true-false.md, "Locale": the letters expected for each language subtag
  (`en` T/F, `pt` V/F, `es` V/F) are listed. Other subtags have no
  expectation. This is the table behind
  `locale-mismatched-true-false-marker`.
- base.md: a `null` value in any optional field is the same as an absent
  field, in every document and in nested objects. `weight: null` is
  `weight: 1`. Before, only `id` and `tags` had this rule. New example
  `multiple-choice/null-fields`.
- `grading` and `shuffle` of multiple-choice, multiple-selection, true-false
  and fill-in questions accept `inherit`, their new default: the question
  takes the exam's value, and `symmetric` or `false` outside an exam. The
  exam gets a `shuffle` field (default `false`) with the same role as its
  `grading`. An omitted `shuffle` no longer leaves the system free to
  choose. New example `exam/inherited-grading`.
- true-false.md: the PROVISIONAL category is renamed WARNING. Its letters
  still read as true and still warn, but the spec no longer says a later
  revision may reassign them. Lint code `provisional-true-false-marker` is
  renamed `unlisted-true-false-marker`; example `true-false/provisional-marker`
  is renamed `true-false/unlisted-marker`.
- exam.md, "Duration and Start Time": the duration grammar requires at least
  one component, so `P`, `PT` and the empty string are out. The canonical
  duration never uses weeks (`P1W` is `P7D`), and a date-only `start` stays
  a date.
- exam.md, "Include all": a bank question with no `id` takes the id the bank
  found it by. "Inheritance": the parsed document carries the inherited
  `locale` and `author` on each question.
- exam.md, "Questions": the `---` that opens a frontmatter or include block
  MUST be preceded by a blank line, as the `===` separator already was.
  Without it, CommonMark reads the line as a setext heading underline and
  the block is swallowed into the text before it. New lint code
  `setext-heading` (warning) and example `exam/setext-heading`.
- fill-in.md, "Where blanks may appear": a `[^slug]` in the preamble or the
  epilogue is literal text, never a blank.
- base.md, "Additional Rules": the schema's `minLength: 1` on text fields and
  `minItems` on lists are stated in prose, and each question type lists its
  minimums (two choices, two statements, two lines, one blank, one pattern).
- `examples/grading/multiple-choice.yaml`: a choice with a declared `0.5`
  scores `0.5` under `partial` and `all-or-nothing` too, and the
  all-or-nothing cases now declare that strategy.
  `examples/grading/true-false.yaml`: `mark` is `marks`.
- base.md [^4]: `locale` MUST be a *well-formed* BCP 47 tag, by the RFC 5646
  grammar alone (`langtag`, `privateuse`, grandfathered), with no check of
  the registry. `brasil` is well-formed; `pt_BR` is not. The invalid example
  `model-only/essay-malformed-locale` now uses `pt_BR`.
- Corpus: `multiple-choice/composite-ids` now declares choice ids;
  `multiple-selection/none-correct` and `multiple-choice/many-correct-choices`
  no longer say multiple-choice needs exactly one correct choice;
  `invalid/extra-fields` has a stem, so the unknown key is its only fault;
  `invalid/model-only/ordering-accept-reject-overlap` repeats an alternative,
  not the answer key; dead `docs/adr` references removed.
- Lint paths: `code-input-without-highlight` points at `highlight`, the
  missing field, and `undeclared-id-after-include-all` at
  `questions[i].id`, as the other missing-field codes do.
- `choices[].correct` is required in multiple-selection and true/false:
  every choice states its verdict, even when false. Only multiple-choice
  omits `score` for a blank `[ ]`. Schema, `multiple-selection/*.yaml` and
  new invalid examples `multiple-selection-choice-without-correct` and
  `true-false-choice-without-correct`.
- base.md: the normalization licence of `preamble`/`stem`/`epilogue` also
  covers the frontmatter comment string, which MAY be joined into one line.
- Corpus: `multiple-choice/fenced-code-choice` removed; block elements
  inside a choice are not supported by the grammar (see BACKLOG).
- ordering.md: a `ul` item is exactly one line, and the sections follow
  the content block directly; both faults are `parse-error`. `normalizations`
  has `uniqueItems`. numeric.md: `domain-mismatch` applies to a declared
  domain only.
- Corpus: invalid `multiple-choice-empty-brackets`, `ordering-multiline-item`,
  `ordering-epilogue-before-section`, `ordering-repeated-normalization`,
  `exam-malformed-start`, `exam-invalid-duration`, `exam-h1-in-instructions`,
  `exam-broken-yaml-block`; valid `numeric/inferred-decimal-tolerance`.
- exam.md: a `---` pair in block position is a block even when its content
  is not valid YAML (`yaml-syntax-error`). New warning `unsafe-thematic-break`
  for a thematic break written with `-`; `***` and `___` are safe. Corpus:
  `essay/thematic-break-epilogue`.
- Every invalid example written only as YAML (21 under `examples/invalid/`,
  18 under `examples/invalid/model-only/`) has a `.lint.json` that pins its
  diagnostics. This fixes the expected code and path of
  `accept-reject-overlap`, `blank-choice-text`, `duplicate-blank-id`,
  `duplicate-choice-id`, `duplicate-choice-text`, `duplicate-question-id`,
  `malformed-locale`, `malformed-numeric-answer`,
  `malformed-true-false-marker`, `malformed-uuid`, `misplaced-blank`,
  `reserved-true-false-marker`, `true-false-marker-disagrees-with-correct`,
  `unknown-include-field`, `unreferenced-blank`, `undefined-blank` and
  `invalid-regex`. `accept-reject-overlap` points at the `accept` entry.
- Every valid example has a `.lint.json`; a clean document pins `[]`. Before,
  a missing file meant "no diagnostics". 35 files added.
- `examples/grading/`: every row of the grading tables of multiple-choice.md,
  multiple-selection.md and true-false.md, plus three-choice cases and an
  explicit `null` marking; new `numeric.yaml` (tolerances, rounding,
  fractions, malformed responses) and `short-answer.yaml` (inexact, exact and
  regex patterns, the three grading rules, pending responses).
- Schema: `patternString` requires a pattern that opens with a backtick to be
  a complete backtick-enclosed span (short-answer.md, "Content"); a visible
  character is still required.
- Corpus for short-answer: accept content plus a reject list, the `f` and `b`
  regex flags, a literal asterisk, an exact literal with inner spaces, the
  regex subset (lookahead, non-capturing group, `\x` and `\u` escapes),
  `accept` in the frontmatter with body blocks, `diacritics: keep` next to
  an exact literal and a regex, explicit `diacritics: fold`, an inline slug
  with an indented tag, every ignored regex flag, and the redundant anchor
  cases under `f` and `b`. Invalid: a partial backtick span, an unclosed
  regex in every position, an empty pattern line, `conflicting-accept` in
  its three forms, a `[short-answer/preAccept]` block, repeated blocks, and
  one file per regex construct outside the subset.
- Corpus for fill-in: definitions out of stem order with a reject list
  separated from its accept list, an open short answer blank, regex blanks,
  `shuffle` with `all-or-nothing` and explicit `symmetric`, a choice blank
  with percentages, ids, feedback and comments, a stem that starts with a
  blank, `[^id]` as text in fenced code, a code span and the epilogue,
  `[^ a]` and `[^-x]` as text, numeric blank forms, and one lint file per
  blank kind. Invalid: a blank line before a choice list, a blank in
  emphasis, a link, a code span or a heading, repeated definitions in every
  form, two kinds for one slug, a unit on a short answer tag, an unknown
  kind, and undefined and unreferenced blanks from Markdown.
- Corpus for numeric: `+` sign, negative and unreduced fractions, every
  domain inference pair, tolerance order and spacing, the four int32
  boundaries, `domain`, `decimalPlaces` and `unit` in the frontmatter, a
  `km/h` unit, `answer-outside-domain` with fraction strings, string zeros
  with a relative tolerance, and a wider declared domain. Invalid: leading
  zero, `.5`, `5.`, exponent, trailing text, negative tolerance, two
  relative tolerances, empty or malformed units, `1/0`, `[numeric (kg)]`,
  and a negative tolerance in YAML.
- Corpus for ordering: tab indentation, the indentation unit across blocks
  and by GCD, a fence without language, a declared `highlight`, a `~~~`
  fence, `-` and `+` list markers, an `## [extra]` fence in another
  language and a text `## [extra]`, a repeated line, warnings that fire only
  after normalization, two accept sections with a reject, lint codes on
  `extra`, an epilogue with and without sections, and feedback and comment
  blocks on adjacent lines. Invalid: content type mismatch in `## [extra]`
  and `## [accept]`, two `## [extra]`, two feedback blocks, interleaved
  observations, `[ordering]` with no block or with an ordered list, every
  schema bound of the YAML form, and an accept/reject overlap that appears
  only after `dedent`.
- Corpus for exams: `***` in a question epilogue, `===` before an include,
  `id` and `title` in both places, an H1 without slug, an `include-all` that
  overlaps an inline question, the query language (`OR`, parentheses, `NOT
  NOT`, `EXCEPT` with two slugs, keyword-prefixed tags, a Unicode space),
  `grading` as a string and as a mapping, `penalty: full` and `none`, every
  duration form and carry, `start` forms, empty exams from Markdown,
  inheritance of `author` and `locale`, an unsafe exam id, a blank title, an
  unknown UUID version, and one exam with every question type. Invalid:
  `---` in an epilogue, duplicate ids in all four forms, `include` with
  `include-all` or `max`, `max` alone or out of range, unknown `grading` key
  or `inherit`, unknown `penalty`, six bad durations from Markdown, an
  impossible `start`, a malformed exam UUID, `type: exam` without an H1, and
  a second H1.
- New fixture `<exam>.resolved.yaml` for every exam with include blocks: the
  question ids after resolution against `examples/valid/exam/`, derived ids
  included, and the diagnostics `resolve` reports.
- Schema: a blank `answerKey` is a `blank-text-field` warning, as essay.md
  says, not a schema error; the `minLength` and `pattern` on `answerKey` are
  gone, like on `title`.
- Corpus for the frontmatter: the comment string in every form (broken by a
  blank line, no space after `#`, after blank lines, indented, after the
  first key, alone, empty), null `id` and `tags`, `locale: no` under YAML
  1.2, an unknown key, `weight` zero and fractional, tags as a string with
  empty entries, one tag, an empty string, uppercase hex, nil and max UUIDs,
  locales with script and region, three letters, private use and
  grandfathered, an uppercase locale. Invalid: non-string `title`, `author`,
  `tags`, `type`, `weight` and `meta`, a repeated key in `meta`, a negative
  weight, an unknown `type`, a `type` that disagrees with the body, `type:
  essay` with no body, duplicate tags, an empty locale.
- Corpus for encoding (grammar.md): a byte order mark with and without
  frontmatter, `\r\n` and `\r` line endings, U+000C as text, and
  `non-ascii-whitespace` in each position: U+0085 and U+2028 in prose, U+00A0
  and U+202F in prose, at the start and end of a line, after a slug, U+FEFF
  in the middle, skipped in code and in the frontmatter, and on a
  `[short-answer]:` tag line. Invalid: U+00A0 before `[essay]` and after
  `[numeric]:`.
- Corpus for load errors, under `examples/invalid/syntax/`: JSON that does
  not parse or repeats a key, and a YAML list at the top level
  (`invalid-document`); also a repeated key in an exam frontmatter and a
  frontmatter that is not valid YAML.
- Corpus for essay: an epilogue with an answer key, an answer key with
  several blocks or with text right after the heading, an empty answer key
  section, a blank `answerKey`, `input: text` and `input: plain` with
  `highlight`. Invalid: two `## [answer-key]` sections, an answer key before
  the body, `[essay]` with text, twice, in a list, in a blockquote, or as
  `[Essay]`, and an unknown `input`.
