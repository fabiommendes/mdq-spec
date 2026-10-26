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

- Short answer patterns (committee decision D15, breaking): an inexact pattern that starts a CommonMark block other than a paragraph (`# Brasília`, `> x`, `- x`, `1. x`, `<div>`, a lone `*`) is a `block-start-pattern` error (new lint code) in every form (YAML, JSON, frontmatter, single-line tag, fill-in blanks); in a Markdown pattern item it stays a `parse-error`. Authors write an exact literal or a regex. `patterns.md` "Pattern string" has the rule; `short-answer.md` has a new row. New examples `invalid/model-only/short-answer-block-start-pattern` and `invalid/short-answer-block-start-pattern-single-line`.
- True/false letters (audit findings F45 to F48, breaking): `E` and `Y` move to `FALSE_LETTER`. A document that used `[E]` or `[Y]` for true now grades the other way, with no warning. The initial of a yes or no word is not a conflict. The lists of `true-false.md` and the annex are normative, and the criterion is a guide. The `pt` row accepts `E` for false and the `tr` row accepts `Y`. `S` leaves the accepted columns of `hi`, `ar`, `bn`, `ur`, `ta` and `fa`, and `D` leaves `fa`. New false friends: `G` under `ko`, `B` under `bn` and `ja`, `K` under `gu`. Accepted columns follow practice; false friend columns follow practice and romanization. A TRUE letter can be a false friend through a romanization (`B` under `bn`). The `P`, `K`, `G`, `C`, `N`, `H` and `J` reasons change. `valid/true-false/locale-pt-cebraspe` has `E` as false; `locale-hi-indic` gets `unlisted-true-false-marker`; `global-markers` gains `E` and `y`. New examples `valid/true-false/false-friend-true-letter` and `locale-tr-yanlis`.
- Numeric (audit findings F60, F61, F65 and F66): `+- p%` is `p / 100` in exact decimal arithmetic on the spelling, stored as the nearest double, so `1000 +- 0.7%` is `relative: 0.007` and accepts 1007; the precision limit is about 15 significant digits. `tolerance: {}` is a `schema-error` (`minProperties: 1`, also for fill-in numeric blanks). A `unit` with no visible character is `blank-text`, in a numeric question and in a numeric blank. The footnote of `domain-mismatch` says the lint reads the tolerance by value in every form. New examples `valid/numeric/relative-tolerance-decimal-shift`, `invalid/numeric-empty-tolerance`, `invalid/numeric-invisible-unit` and `invalid/fill-in-numeric-blank-invisible-unit`; `grading/numeric.yaml` gains a percentage vector.
- Fill-in (audit findings F85, F86 and F89): a pending fill-in response shows no feedback, also for settled blanks (`fill-in.md` "Feedback" points to `responses.md` "Pending"); the pending examples of `grading/fill-in.yaml` have `feedback: []`. `fill-in.md` "Frontmatter" says why the five map fields are maps and `unmatched` and `diacritics` are scalars. The "Additional Rules" table of `fill-in.md` holds only fill-in rows and rows whose code or rule differs from the embedded type: it no longer restates five short answer rows, gains `schema-error` rows for `unmatched` and `diacritics`, and ends with the note on the MAY permissions. A blank with no definition is an `undefined-blank`.
- Ordering and misc (audit findings F110, F113, F116, F117, F40, F16, F102, F90, W4-F38): the language of an ordering fence is the first word of its info string, after CommonMark backslash and entity processing, compared with case (`python {.numberLines}` has `highlight: python`; `Python` under `python` is a `parse-error`). An empty ordering list item (`*`, `*` with spaces, top level or nested) is a `parse-error`; a blank line exists only in a code block. `extra`, `accept` and `reject` must have an entry when present (`schema-error`). A line text has no leading or trailing space or tab and no line break (schema `pattern`), and is not empty with `content: text` (`empty-ordering-line`, new lint code). `shuffle: false` means an implementation must not change the order of the choices; the four choice schemas say "must not" instead of "should never". A bare `normalizations` string is a comma-delimited list, as `tags`. An essay answer key section with no block defines no answer key; any other content, such as an HTML comment, is defined. `grammar.md` gains "Markdown dialect" (CommonMark plus GFM tables, strikethrough and bare URL autolinks); `fill-in.md` says an HTML block is literal text, the text between inline HTML tags is a blank, and strikethrough is `misplaced-blank`. A percentage uses `INTEGER` or `DECIMAL`: `[050%]` is a `foreign-choice-marker`. New examples `valid/ordering/fence-info-string`, `valid/ordering/normalizations-comma-string`, `valid/multiple-choice/shuffle-false`, `valid/essay/answer-key-html-comment`, `valid/fill-in/blank-in-inline-html`, `invalid/ordering-fence-language-case`, `invalid/ordering-empty-item`, `ordering-empty-item-spaces`, `ordering-empty-item-nested`, `ordering-empty-item-extra`, `invalid/essay-answer-key-zwsp`, `invalid/fill-in-html-block-blank`, `invalid/fill-in-strikethrough-blank`, `invalid/multiple-choice-percent-leading-zero`, `invalid/multiple-selection-percent-leading-zero`, `invalid/short-answer-pre-reject-block`, `invalid/short-answer-pre-reject-single-line` and, in `invalid/model-only/`, `ordering-empty-extra`, `ordering-empty-accept`, `ordering-empty-reject`, `ordering-line-leading-space`, `ordering-line-trailing-space`, `ordering-line-break` and `ordering-text-empty-line`.
- Exam (audit findings F19, F21 and F101): the base rules of every shared field (`id`, `uuid`, `locale`, `title`, `author`, `tags`, `meta`) apply to the exam, so `unsplit-tag-list` covers the exam `tags`; `description` and `course` have `blank-text` rows. `exam.md` defines the `===` separator with a grammar terminal, and the new warning `malformed-separator` covers a line of `=` that is not a separator (`====`, `   ===`, `= = =`). `unsafe-thematic-break` covers the essay `answerKey` and the ordering `extra`, `accept` and `reject` sections; `scripts/spec_audit.py` accepts `any section` as a pseudo field. New examples `valid/exam/separator-trailing-spaces`, `separator-four-equals`, `separator-indented`, `separator-spaced`, `unsplit-tags`, `valid/essay/thematic-break-answer-key` and `invalid/model-only/exam-empty-course`.

- Ids and comments (audit findings F10, F91 and F11): a question or exam `id` stays a SHOULD match for `SLUG` (`unsafe-id`); `grammar.md` says why, and that `SLUG` is the format of the body slug, choice ids, blank ids and the exam H1 slug. The `EXCEPT` list of `exam.md` takes `ID`, with the format of `TAG`, no longer `SLUG`: `EXCEPT questão-1` follows the language, and an id with a space, a comma or a parenthesis cannot be listed. Blank ids are case-sensitive; the new warning `case-variant-blank-id` covers two ids that differ only in ASCII case, and `undefined-blank` for a stem reference with another case SHOULD point to the definition. The frontmatter comment string is stripped of leading and trailing whitespace, and an empty result is not stored; its `blank-text` row applies to YAML and JSON input only. New examples `valid/fill-in/case-variant-blank-id`, `valid/exam/except-accented-id`, `valid/multiple-choice/comment-only-spaces`, `comment-empty-lines` and `comment-stripped`; `invalid/model-only/essay-blank-comment` is now YAML only.

- Body tags (audit findings F2 and F88, breaking): one convention in the new section "Body tags" of `question-base.md`. A tag with a colon requires content, on its line or in a block on the very next line. A tag without a colon has no content. A blank line between a tag with a colon and its content is a `parse-error` in every type; a tag with a colon and no content is a `parse-error`. The warning `detached-answer-list` is removed: a short answer list after a blank line is now a `parse-error`, not an epilogue element (the answer key leaked to the student). A short answer with content on its tag line, then a blank line and a list, is still valid: the list is the epilogue, with no warning.
- Ordering (breaking): the tag is `[ordering]:`, with a colon. `[ordering]` without a colon is a `parse-error` whose message suggests `[ordering]:`, with no alias. Section headings (`## [extra]`, `## [accept]`, `## [reject]`) do not change.
- Short answer and short answer blank (breaking): a block with no pattern is written without a colon, `[short-answer]` and `[^id/short-answer]`, as a paragraph that holds only the tag, like `[essay]`. `[short-answer]:` and `[^id/short-answer]:` with no content are a `parse-error`. `[short-answer/reject]` and `[^id/short-answer/reject]` have no form without a colon. A list on the line right after a tag without a colon is a `parse-error`. New examples `invalid/short-answer-blank-line-before-list` (replaces `valid/short-answer/detached-list`), `short-answer-empty-tag-blank-line-text`, `short-answer-empty-tag-end-of-body`, `short-answer-reject-without-colon`, `short-answer-list-without-colon`, `fill-in-short-answer-blank-line-before-list`, `fill-in-short-answer-empty-colon`, `fill-in-short-answer-reject-without-colon`, `ordering-without-colon` and `ordering-text-after-colon`. Every ordering example, doc and skill uses `[ordering]:`; `valid/short-answer/manual`, `reject-only` and `valid/fill-in/open-blank` use the tag without a colon.
- Body tags, case and reserved names (audit findings F17, F3 and F74, breaking): the section "Body tags" of `question-base.md` has three new rules. A tag is lower case in every type: `[Numeric]: 26`, `[Short-Answer]: x`, `[^cap/Short-Answer]: x`, `[Ordering]:` and `[Essay]` are a `parse-error` that tells the tag to write. A label that starts with a type name or is `^id/...` is reserved: a tag with an unknown suffix (`[short-answer/foo]: b`, `[^cap/foo]: x`) is a `parse-error` "unknown tag", and `[short-answer/preAccept]: b` is one with a message that says `preAccept` and `preReject` are frontmatter fields only; it used to pass as a link reference definition. "Forbidden elements" defines the tag line by the reserved list. Ordinary link reference definitions stay valid.
- Misplaced tag (audit findings F3 and F74, breaking): the lint code `detached-blank-definition` is renamed `detached-tag`, and every type uses it for a known tag after the epilogue started (a `[short-answer/reject]:` after a paragraph, a second `[numeric]:`, an `[ordering]:` or `[essay]` tag in the epilogue, a blank definition after a block that is not a definition). `forbidden-block-element` stays for the other forbidden elements. Example `invalid/fill-in-detached-blank-definition` is now `invalid/fill-in-detached-tag`; `invalid/essay-two-tags` and `invalid/short-answer-pre-accept-block` change their code.
- Lists after a content list (audit finding F75, breaking): a list on the line right after a content list (short answer pattern list, fill-in blank pattern list, choice blank list, ordering `ul`), with no blank line, is a `parse-error`. In CommonMark a change of marker starts a new list, and that list used to go to the epilogue in silence. With a blank line the list is an epilogue element.
- Exact literal in the Markdown body (audit finding F18, breaking): a pattern that opens with a backtick and is not a complete exact literal, including a literal that opens at the end of a line or whose closing run starts a continuation line, is a `parse-error`, no longer a `schema-error`. The YAML, JSON and frontmatter form is unchanged. The `.lint.json` of the `*-exact-opens-at-line-end*`, `short-answer-exact-closes-at-line-start`, `short-answer-partial-backtick` and `short-answer-fence-mismatch` examples change; the last one moves out of `invalid/model-only/`.
- New invalid examples: `numeric-tag-uppercase`, `fill-in-tag-uppercase`, `short-answer-list-marker-change`, `ordering-ordered-list-after-ul`, `short-answer-pre-accept-single-line`, `short-answer-unknown-tag-suffix`, `short-answer-reject-after-epilogue` and `numeric-tag-in-epilogue`.

- Ordering `unmatched` default (audit finding F1, breaking): it follows the short answer rule. An ordering question always has an answer key, so the default is `"incorrect"`, no longer `"manual"`, and the derived automation is `automatic`. An author who wants to review the orderings the author did not foresee writes `unmatched: manual`. `ordering.md`, `schema/ordering.yaml`, `responses.md` and the skill follow. Example `valid/ordering/unmatched-incorrect` is now `unmatched-manual`; `valid/ordering/full-metadata` and `grading/ordering.yaml` change.
- `highlight` (audit findings F4 and F99, breaking): `highlight` without `content: code` is a `schema-error` in essay too, with `content: text`, `content: plain` or no `content` (the default is "text"). The warning `ignored-highlight` is removed. `schema/essay.yaml` has the same `if`/`then` as `schema/ordering.yaml`. The valid examples `essay/ignored-highlight` and `essay/ignored-highlight-plain` are now `invalid/essay-highlight-with-text`, `essay-highlight-with-plain` and `essay-highlight-without-content`.
- Ordering has the info `code-content-without-highlight` for a code fence with no language, as essay has. The `.lint.json` of `valid/ordering/fence-without-language` and `section-heading-indented` change.
- `essay.md` and `ordering.md` have a "Content" table with the values of `content`, who sets them and what they mean.
- Ordering `incorrectFeedback` (audit finding F5): a new frontmatter field, with the meaning it has in short answer. It is the feedback of an incorrect response that no `## [reject]` section gave feedback to. The `[ordering]:` block takes no `>` or `!` lines, since they are ambiguous with the epilogue; `ordering.md` says so. New examples `valid/ordering/incorrect-feedback` and `invalid/model-only/ordering-blank-incorrect-feedback`; `grading/ordering.yaml` records `feedback`.
- Regex and patterns (audit findings F72, F73, F76, F27, F28 and F79, breaking): `patterns.md` "Regex" has a closed table of supported constructs, with the edge rules for `{`, `]` and `-`. A construct outside the table is an `invalid-regex`, also when JavaScript or Python accepts it: named groups (`(?<n>...)`), backreferences, `\0`, inline modifiers, atomic groups, possessive quantifiers, `{,n}`, a lone `{`, `}` or `]`, `[]`, `[^]`, `\A`, `\Z`, `\a`, `\-` outside a class, and every identity escape of a letter or digit. `.` matches any code point except U+000A, U+000D, U+2028 and U+2029. `inexact-tables.json` gains the `nonspacing` table (the `Mn` ranges of Unicode 18.0.0, generated by `scripts/inexact_tables.py`): step 3 of the inexact comparison and the `n` flag read it, not the runtime; the text no longer says the general category is stable. A pattern item whose content starts a block that is not a paragraph in CommonMark (block quote, ATX heading, list, code block, HTML block, thematic break) is a `parse-error`; the message suggests an exact literal, and `\#` stays `\#`. `LAZY_START` takes any character after four columns of indentation, and excludes an ordered list start with up to eight leading zeros (`01.`). New warning `multi-line-pattern` for an exact literal or a regex of the Markdown body on more than one line. New examples `matching/regex.yaml`, `valid/short-answer/multi-line-patterns`, `valid/multiple-choice/feedback-indented-bullet`, `feedback-indented-heading`, `feedback-indented-fence`, 31 `invalid/short-answer-regex-*`, six `invalid/short-answer-item-*` and `invalid/multiple-choice-lazy-zero-ordered-list`; `grading/short-answer.yaml` and `matching/inexact.yaml` gain vectors for the line terminators and the `nonspacing` table.
- Second spec audit (2026-10-26), text and corpus:
  - The `[ordering]` block and each `## [accept]` entry that is empty after normalization are an error, the new lint code `empty-ordering-answer`. An empty `## [reject]` stays valid.
  - The exam frontmatter stores its comment string as `comment`, as a question (`schema/exam.yaml`). An exam with no title gives `missing-title` (info); the H1 text is optional. A `start` without offset is a floating local time.
  - Regex: shorthand classes (`\w`, `\d`, `\s`, `\b`) fold under `i` like any class. A `\uHHHH` escape in the surrogate range D800-DFFF is an `invalid-regex`. Advice: write `[&\x26]` for `&&`.
  - Hard breaks (two or more trailing spaces, or `\`, before the line ending) are kept in the stem, the epilogue and the instructions. Only soft breaks join into one space (a MUST).
  - Every pattern line of a `[short-answer]:` list is a syntax position (non-ASCII whitespace is reported there). Ordering lines, `## [accept]` and `## [reject]` items and choice text are prose.
  - A `[^x]` inside an autolink (`<https://...>`, bare URL, `www.` address) is literal text, as in code. A Markdown fill-in with no blank in the stem gives `blanks: []` and the `schema-error` at `blanks`.
  - A paragraph that starts with a bare `[short-answer]` and holds more text, and a `>` or `!` line right after a bare short answer tag, are a `parse-error`. An ordering `ul` item that is not a single paragraph is a `parse-error`. A schema `if` on empty ordering text requires `level: 0`.
  - True/false locale table: `V` leaves `ru`, `M` leaves `bn`, `B` leaves `mr`, `K` leaves `sw`. Under those locales `ru V`, `bn M` and `mr B` get `locale-mismatched-true-false-marker`, and `sw K` gets `unlisted-true-false-marker`. `H` leaves the `sw` false friends, `否` joins the `zh` ones, `fil` is a separate row. A YAML or JSON `marker` with whitespace around the letter is `malformed-true-false-marker`. Rule text: a false friend enters by practice or by a Latin romanization.
  - Derived choice ids are not portable between implementations or versions: a host SHOULD write them into the document before it collects responses. `4.0` and `2.50` stay strings; `+- 0` is valid. `relative-tolerance-over-one` keeps its code in every form. The first pattern with feedback among the matching patterns of the deciding list gives the feedback. The tables of Additional Rules list document diagnostics only. `responses.md` is normative with `examples/grading/`; error names are not.
  - New and extended examples under `examples/valid`, `examples/invalid` and `examples/matching`, and grading cases for ordering, `true` as a numeric response and pattern feedback.

### Fixed

- Choice marker values (audit findings F23 and F24): one pipeline, normalize (NFKC, then ASCII lowercase), then validate, then interpret. A character whose NFKC form is a space is `ws` in the marker, so `[U+00A0]` is `[ ]`. A true/false marker must be one code point of `LETTER` after normalization: `[ﬁ]` is a `foreign-choice-marker`, no longer a WARNING letter. New examples `valid/multiple-selection/nbsp-blank-marker`, `invalid/true-false-ligature-marker` and `invalid/true-false-nbsp-marker`.
- Ordering line identity (audit findings F106 and F107): one definition per `indentation` mode, in the new section "Line identity" of `ordering.md`. Under `fixed` a line is the pair of level and text; under `lenient` and `strict` it is the text only. `accept-outside-answer-key` and `unreachable-alternative` follow it, so a `strict` reject that uses a pool line at another level no longer gets a false `unreachable-alternative`. Under `fixed`, a `content: text` response that is not a valid outline is no longer a `ResponseError`: it is graded, matches no declared answer and falls under `unmatched`. Under `lenient` and `strict` it stays a `ResponseError`. New examples `valid/ordering/strict-reject-other-level` and `grading/ordering.yaml`.
- Spec audit of 2026-10-21, fixes with one possible outcome. Text only, no rule of mdq-py changes. Patterns: `/água/n` also accepts `água`; ignored regex flags MUST be accepted; the `b` flag and the space of an exact literal are reworded; "plain literal" is now "inexact literal". Short answer: the YAML form may omit both pattern lists; the opening example says which responses its reject item catches; new rows for `diacritics`, `accept`/`reject` in the frontmatter and the feedback and comment of a pattern. Numeric: the range of a double is a `parse-error` in Markdown and `malformed-numeric-answer` in YAML/JSON only; every tolerance lint has a sentence. Fill-in: a map field that is not a mapping is a `parse-error`; a short answer blank defined twice takes the position of its first definition; one definition per grammar rule, with a `BLANK` terminal. Essay: new Feedback section. Ordering: new AST section with the YAML form of the full example; `[]` is a response, not a skip; a reject also scores its ordering 0. Responses: an instructor score of a pending response is in [0, 1]; `{}` in true/false is graded. Choice types: `grading` and `shuffle` rows in every table; the language subtag is case-insensitive. Grammar: section headings require a space before the closing `#` sequence and have a setext form; `?logic_not` keeps the `NOT` node. The NULLABLE paragraph is removed. New examples `invalid/true-false-empty-brackets`, `true-false-two-feedback-blocks`, `essay-answer-key-frontmatter`, `essay-empty-highlight`, `ordering-unknown-unmatched`, `short-answer-empty-accept-list`, `short-answer-no-block`, `short-answer-automation-frontmatter`, `fill-in-incorrect-feedback-on-choice-blank`, `fill-in-short-answer-exact-opens-at-line-end`, `fill-in-automation-frontmatter`, `fill-in-automation-field` and `fill-in-incorrect-feedback-not-a-map`.
- Ordering outline levels (`ul` body): an item whose only content is a nested list is not a line, it adds one level (`- - Bahia` is `[1, "Bahia"]`), so a nested distractor can stand alone in `## [extra]`. With `content: text`, the `[ordering]` block and each `## [accept]` and `## [reject]` section MUST start at level 0 and go at most one level deeper per line, in Markdown and in YAML/JSON; `## [extra]` is exempt and code blocks are not affected. The new error `invalid-outline-level` reports it. A text response with the same fault is a `ResponseError`. Examples: `valid/ordering/extra-nested-distractors`, `invalid/model-only/ordering-text-*`, `invalid/ordering-text-*`.
- Ordering text and indentation: in a `ul` body (and in `## [extra]`, `## [accept]` and `## [reject]` lists) a nested item is a line of its own and its level is its nesting depth (0, 1, 2...); the indentation unit and the greatest common divisor apply to fenced code blocks only. An ordered sub-list is a `parse-error`, like an ordered list body. The trailing whitespace of each line is removed, and a whitespace-only line is a blank line. A tab in leading whitespace follows the CommonMark tab stops (next multiple of 4), replacing "a tabulation is 4 spaces". Initial presentation: `fixed` shows the authored level; `lenient` and `strict` show every line at level 0. New complete example with a nested list in `ordering.md`. New examples `valid/ordering/nested-list-two-levels`, `nested-list-three-levels`, `nested-list-sections`, `trailing-whitespace`, `tab-stops-mixed` and `invalid/ordering-nested-ordered-list`.

- Ordering sections: the `[ordering]` tag line is `ws? "[" "ordering" "]" ws? nl`, and the content block MUST start on the next line; a blank line between them is a `parse-error` (breaking: mdq-py accepted it), as in fill-in. A section heading (`## [extra]`, `## [accept]`, `## [reject]` and the essay `## [answer-key]`) follows CommonMark `H2` in one rule in `question-base.md`: up to 3 spaces of indentation, trailing spaces, an ATX closing sequence and a setext form. The ordering grammar allows blank lines before a section (`(blank_line* section)*`, the full example now parses). A section with no content block is a `parse-error`. A sentence in `ordering.md` states that the "same content block type" and "at most one `## [extra]`" rules are checked after parsing. The exam `setext-heading` warning points at the section (`answerKey`, `extra`, `accept`/`reject` with the index), and the exam `---` error says "epilogue or section". New examples `valid/ordering/tag-indented-trailing-spaces`, `section-heading-indented`, `section-heading-trailing-spaces`, `section-heading-closing-sequence`, `section-heading-setext`, `blank-line-before-section`, and `invalid/ordering-blank-line-after-tag`, `ordering-extra-without-block`, `ordering-accept-without-block`, `ordering-reject-without-block`.
- Ordering: a `## [reject]` section that holds the same lines as the `[ordering]` block, once fully normalized, is an `accept-reject-overlap` error (the answer key is an accepted answer). The lines of an `## [accept]` section MUST be a subset of the `[ordering]` block's lines, counting copies, once fully normalized: a distractor, a foreign line or an extra copy is the new error `accept-outside-answer-key` (this resolves the conflict with "distractors MUST NOT appear in a correct response"). A `## [reject]` section that uses a line, or more copies of a line, than `[ordering]` plus `## [extra]` offer is the new warning `unreachable-alternative`. Distractors are compared after normalization: one that becomes equal to a key line is a spare copy. `accept-repeats-answer-key` now has its sentence in the prose and the footnote on full normalization. New complete example with a `ul` list in `ordering.md`. New examples `invalid/model-only/ordering-reject-equals-answer-key`, `ordering-reject-equals-answer-key-lenient`, `ordering-accept-with-distractor`, `ordering-accept-foreign-line`, `valid/ordering/accept-omits-line` and `unreachable-reject`.
- Ordering: a response is malformed (`ResponseError`) when it holds a line outside the presented pool (`[ordering]` plus `## [extra]` lines), uses more copies of a line than the pool offers, or, under `indentation: fixed`, carries a level other than the authored one. Under `lenient` and `strict` the pool is compared by text only. A response that leaves lines out is valid and graded normally. When a response matches several declared answers, the first in document order wins and only its feedback is shown. "Repeated lines are compared in the order they appear" is replaced: a response matches a declared answer when the two sequences of lines are equal after full normalization. `responses.md` no longer claims ordering is the only type whose response names nothing by id.
- Ordering: the epilogue now sits between the `[ordering]` block and the first section (`## [extra]`, `## [accept]`, `## [reject]`), as in every other type; before, it came after the last section (breaking: a document in the old order is a `parse-error`). The sections are contiguous, and prose between two sections or after the last one is a `parse-error`. The ordering grammar has an `epilogue?` after the content. `question-base.md` states that sections specific to a type come after the epilogue. Exam: the rule against `---` (and the `setext-heading` warning) covers every block after the body: epilogue, essay answer key and ordering sections. Examples: `valid/ordering/epilogue` uses the new order; `invalid/ordering-epilogue-before-section` is removed (it is now valid); new `invalid/ordering-epilogue-after-section`, `invalid/ordering-prose-between-sections` and `invalid/exam-thematic-break-in-answer-key`.
- Essay: the field `input` is now `content`, as in ordering (breaking: a document with `input:` is a `schema-error`, and an `invalid-frontmatter-field` in a Markdown source). The values stay per type: essay takes `code`, `text` or `plain`, ordering takes `code` or `text`. The lint code `code-input-without-highlight` is now `code-content-without-highlight`. `ignored-highlight` is a `should` rule in essay and ordering (warning). Examples renamed: `essay-unknown-input` to `essay-unknown-content`, `input-text-frontmatter` to `content-text-frontmatter`, `plain-input` to `plain-content`.
- Ordering `content` and `highlight` (breaking): they are no longer frontmatter fields. In Markdown the body always sets them (a fenced code block is `content: code` and its language the `highlight`; a `ul` list is `content: text`), and a frontmatter that declares either is an `invalid-frontmatter-field` error. In YAML and JSON `content` is required (no `default: text`) and `highlight` is allowed only when `content` is `code` (a `schema-error` otherwise, and when it is empty). The fence of `## [extra]`, `## [accept]` and `## [reject]` must use the language of the `[ordering]` fence or none (it inherits it); another language is a `parse-error`. Essay keeps both fields. `ignored-highlight` is now an essay rule only. `ordering.md`: the answer key is the `[ordering]` block and the `## [accept]` sections, and the declared answers add the `## [reject]` sections; the rules that lived only in the Additional Rules table (`reject-without-feedback`, `blank-ordering-line`, `unknown-highlight-language`, `redundant-strict-indentation`) have a sentence in the prose; new rows for `unmatched`, the section fence language and the YAML `content` and `highlight` rules. Examples: removed `valid/ordering/declared-highlight-wins` and `ignored-highlight`; `valid/ordering/extra-other-highlight` moved to `invalid/ordering-extra-other-highlight`; every ordering YAML or JSON example now carries `content`; `valid/ordering/full-metadata` drops `content` and `highlight` from the frontmatter. New examples `valid/ordering/extra-inherits-highlight`, `valid/exam/ordering-sections`, `invalid/ordering-accept-language-without-main-language`, `ordering-frontmatter-content`, `ordering-frontmatter-highlight`, `ordering-missing-content`, `ordering-highlight-with-text-content`, `ordering-empty-highlight` and `invalid/exam-thematic-break-in-ordering-section`.
- Essay: the grammar is `ws? "[essay]" ws?` and applies to a paragraph; a list item or a heading is not the tag. A paragraph with only `[essay]` is always the tag, and `essay` is a valid slug. The new `answer_key` rule: an ATX or setext `H2` `[answer-key]`, then every block (headings included, except `H1`) up to the end of the question. An empty section defines no answer key, and a second section is a `parse-error`. An `H1` in the answer key is a `forbidden-block-element`. A footnote definition belongs to the field where it is. The answer key MUST NOT be shown before the student submits the response. No fields for length or attachments. New sections Content, Grading, Automation and Response, and a YAML example of the answer key. New examples `answer-key-inner-headings`, `answer-key-setext`, `tag-slug-essay`, `footnote-stem-defined-in-answer-key`, `invalid/essay-answer-key-h1` and `invalid/essay-input-frontmatter`.
- Essay response: for `content` `plain` and `code` it is the text verbatim; for `text` its format depends on the host (`responses.md`).
- Schema `essay.yaml`: the description of `highlight` no longer mentions validation, and says that an empty value is a `schema-error`.
- Short answer and fill-in short answer blank: a setext underline (`===` or `---`) right after the content of a definition is a `parse-error`, because CommonMark turns the tag line into a heading. A `>` or `!` line with four or more columns of indentation continues the content (`LAZY_START` fix, with `MARK_INDENT` for the marker lines). `LAZY_START` is an approximation of the CommonMark paragraph continuation. An exact literal cannot open at the end of a line, and its closing run cannot start a continuation line (`schema-error`). New examples `short-answer-setext-after-content`, `short-answer-setext-after-continuation`, `fill-in-short-answer-setext-after-content`, `short-answer-exact-opens-at-line-end`, `short-answer-exact-opens-at-line-end-item`, `short-answer-exact-closes-at-line-start` and `valid/short-answer/indented-quote-continuation`.
- Fill-in stem: each blank id appears at most once; a repeated `[^id]` is the new error `duplicate-blank-reference`. New `parse-error` rules in the Additional Rules: a blank line between a choice tag and its list, text on the tag line of a choice definition, an unknown kind suffix, a unit on a non-numeric tag, a second definition of an id, a list item after the content of a short answer definition.
- Grammars: `pattern_item` starts after the list marker (no `LIST_MARK`), as `item` does. The numeric `value` rule is now `numeric_value`, so the fill-in grammar has no two rules `value`. A change of bullet character starts a new list, as in CommonMark (`grammar.md`).
- Fill-in grading: an empty blank is a missing key or a `null` value; `{}` is a response with every blank empty (score 0, not a skip); a value of the wrong type for a blank is a malformed response. For a pending fill-in, the instructor scores each pending blank in `[0, 1]` and the strategy combines the blank scores. A choice blank is scored with the multiple choice `partial` under `partial`, `no-mistakes` and `all-or-nothing`, and with `symmetric` under `symmetric`; the "blank scores" column of the example table holds the `symmetric` values.
- Short answer question and short answer blank: a body needs at least one of the `[short-answer]` (or `/accept`) and `[short-answer/reject]` blocks. A block with only a reject block is valid, and `unmatched` defaults to `manual` without accept patterns. New examples `valid/fill-in/reject-only-blank` and `valid/short-answer/reject-block-only`.
- Fill-in: the blank definitions form one contiguous sequence of blocks. A blank definition tag line in the epilogue is the new error `detached-blank-definition`. New example `invalid/fill-in-detached-blank-definition`.
- Fill-in stem: one outcome per context for a `[^slug]` (table in `fill-in.md`). Code (fenced, indented, code span) is literal text. A `[^slug]` in a heading, list item, table cell, blockquote, emphasis, strong, link text or image alt text is `misplaced-blank`; the parser reads the inline markup of the whole paragraph first. `[^x](url)` and `[^x][ref]` are links: the `blank` rule excludes a `]` followed by `(` or `[`. Examples: `fill-in-misplaced-blank-code-span` is now valid (`blank-in-code-span-is-text`); new examples for list item, table cell, blockquote and link; every example name with `preamble` now says `stem`.
- Numeric grammar: the denominator of a fraction is a new `DENOMINATOR` terminal
  that excludes zero, so `[numeric]: 1/0` is a `parse-error` by the grammar.
- Fill-in grammar: `choice_def` and `numeric_def` accept leading whitespace, and
  the two copies of each rule are equal. `numeric_def` no longer has two `ws?`
  in a row.
- Numeric arithmetic: the answer, the response and the tolerances are exact
  rationals. A number is read by its shortest decimal form; the rounding and
  the tolerance test are exact. The relative tolerance uses the answer before
  the rounding, and no tolerance is rounded. `+- p%` is `tolerance.relative:
  p / 100`.
- Numeric inference from YAML/JSON values: a string is read by its spelling, a
  number by its shortest decimal form, but a number of whole value (`5`, `4.0`)
  is an `integer` with 0 decimal places.
- Numeric units: the unit of a response is the declared one (exact string after
  NFC) or absent. Any other unit, or a unit on a question with none, is a
  malformed response. The conversion belongs to the host, before the grading.
  The unit in the tag is source text.
- Numeric responses: a table of the responses each `domain` takes. A fraction
  in a `decimal` question is malformed, and so is a non-finite number. A
  response string is exactly `sign? value` and is not trimmed.
- Numeric `answer` and tolerances must be finite (`malformed-numeric-answer`
  for `.inf` and `.nan`).
- Grading vectors for all the rules above in `examples/grading/numeric.yaml`
  (new questions only), and three invalid documents with a non-finite number.
- Numeric lint codes: `answer-outside-domain` also covers `domain: fraction`
  (an answer that is neither whole nor a fraction string). `domain-mismatch`
  only reports a decimal absolute tolerance under `integer` or `fraction`.
  `missing-tolerance` only reports a `decimal` domain. The warning rules say
  "should". The Tolerances section states that tolerances are not negative, and
  the rules of "Answer representation" have no diagnostic.
- Block indentation: the `ws?` at the start of a block is at most three spaces
  (a tab expands to the next multiple of four columns), as in a list item. More
  makes an indented code block, as in CommonMark.
- Numeric docs: the tolerance is optional. Schema descriptions of `domain`,
  `decimalPlaces` and `tolerance.relative` now agree with the spec.

- Numeric exponent limit: the `EXPONENT` terminal has at most 3 digits. A value
  or tolerance above the largest finite double (about 1.8e308), or not zero but
  rounding to 0 as a double (`1e-999`), is malformed: `parse-error` in
  Markdown, `malformed-numeric-answer` in a document, a malformed response in
  grading. The schema patterns follow. New examples and grading vectors.
- Numeric decimal places of a fraction (audit findings F58 and F59): a fraction has no decimal places of its own, so under `decimal` only the absolute tolerance gives them. A fraction answer under `decimal`, with no `decimalPlaces` and no absolute tolerance with places, is the new error `missing-decimal-places`. New section "Fraction answer under `decimal`" in `numeric.md`. New examples `valid/numeric/fraction-decimal-places`, `invalid/numeric-fraction-decimal-places-missing` and a grading vector in `grading/numeric.yaml`.

### Added

- Grading corpus `examples/grading/fill-in.yaml`: the rows of the example table for the four strategies, empty blanks, `{}`, malformed responses, pending blanks and the feedback order.
- Numeric scientific notation, in the form of a JSON number: a `number` is an
  `INTEGER` or `DECIMAL` with an optional `EXPONENT` (`6.022e23`, `1E-3`,
  `2.5e+4`, `1e05`). The value, both tolerances, the string `answer` and the
  string of a response take it. A fraction takes none. A spelling with an
  exponent is `decimal`; the decimal places are `max(0, d - e)`. The schema
  pattern of `answer` follows. `examples/invalid/numeric-exponent` is now
  `examples/valid/numeric/exponent`, and the string response `"1e3"` is valid
  in the grading vectors. New examples and vectors.
- The Body of numeric lists the spellings it rejects on purpose (U+2212, `±`,
  decimal comma, digit group separator) and the `parse-error` row in
  Additional Rules. Examples for each one.
- Numeric blank `incorrectFeedback`, through the `incorrectFeedback` map of the
  fill-in frontmatter, with the meaning it has in a numeric question. The
  `NumericBlank` schema has the property. New examples.
- Numeric `incorrectFeedback`: feedback for an incorrect response. Never shown
  for a correct, malformed or skipped response. It has a frontmatter field, a
  schema property, grading vectors with a `feedback` key and examples.
- Fill-in frontmatter maps `domain` and `decimalPlaces` (blank id to value), to
  declare them for a numeric blank written in Markdown. They have the
  `undefined-blank` error for an unknown id and the `schema-error` for a blank
  of another kind. New examples for each case.
- File extensions `.mdq.md`, `.md` and `.mdq`.
- Question types: multiple choice, multiple selection, true/false, short
  answer, numeric, fill in the blanks, essay and ordering.
- Exams: several questions in one file, includes from a question bank,
  inherited fields, grading defaults, penalty, `start` and `duration`.
- Grading strategies per question type: `partial` and `symmetric` for all,
  `all-or-nothing` for multiple selection, true/false and fill in, and
  `no-mistakes` (no credit after a mistake, an abstention is no mistake) for
  true/false and fill in. A scalar exam `grading` maps to each type by a
  table.
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
- Normalized value of a choice marker (`docs/references/choices.md`): NFKC,
  then ASCII lowercase, before type inference. `[Ｘ]` is `x` and `[Ｆ]` is
  false. `marker` keeps the letter as written, without the `ws` around it.
- True/false letters are terminals (`TRUE_LETTER`, `FALSE_LETTER`,
  `WARNING_LETTER`) on the normalized value. `LETTER` is a General_Category
  (`Lu`, `Ll`, `Lt`, `Lo`, not `Lm`), an exception to the regex dialect of the
  grammar. Validity is measured on the written text and meaning on the
  normalized value. `[ˇ]` and `[ー]` are `foreign-choice-marker`.
- True/false letter sets (`docs/question-types/true-false.md`, "Body"). The
  meaning of a letter never depends on `locale`. TRUE: `T V B D Đ` and 对 對 真
  是 В 참 ص स স ब ఒ ச ถ સ. FALSE: `F M` and 错 錯 偽 非 Н 거 خ غ ग ম च త த ผ ખ.
  Every other letter, `S` included, is a WARNING letter and reads as true. A
  letter joins TRUE or FALSE only when it has no conflict in actual practice:
  a romanization alone does not count. The annex
  (`docs/annex/true-false-spellings.md`) lists 38 languages, the sources and
  the classification of each candidate letter.
- True/false grading terms (`docs/question-types/true-false.md`, "Grading"):
  a statement is judged correctly, judged wrongly or an abstention. The info
  `uniform-true-false-answers` covers every statement with the same `correct`
  value, reported at `choices`.
- Responses (`docs/responses.md`): a multiple selection response is the list
  of ticked choice ids. In a true/false response, `null` is the same as an
  absent key, and any other non-boolean value (`"T"`, `1`) is a malformed
  response. An id not present in the question is a malformed response for
  every type that uses ids.
- Choice items (`docs/references/choices.md`, "Item"): a block other than the
  first paragraph, the feedback and the comment is a `parse-error`.
- True/false locale table and rules (`docs/question-types/true-false.md`,
  "Locale"): one row per language, with the TRUE and FALSE letters accepted
  and the false friends. `T` and `F` are canonical. A false friend (a letter
  that means false in that language but true globally, such as `S` under `id`
  and `vi`, or `E` under `pt`) gets only `false-friend-true-false-marker`. A
  letter the row accepts gets no warning. Any other WARNING letter gets only
  `unlisted-true-false-marker`. A TRUE or FALSE letter the row does not accept
  gets `locale-mismatched-true-false-marker` (SHOULD). A writer without
  `marker` SHOULD write `T` or `F`.
- True/false `marker` rules (`docs/question-types/true-false.md`, "Choices"):
  the category of `marker` MUST agree with `correct`, and `marker` MUST NOT be
  `X`. These rules, and the letter check, apply to the `marker` field of model
  input. A markdown bracket value that is not allowed gets only
  `foreign-choice-marker`. The schema keeps only the length of `marker`; a rule
  with its own code is reported instead of `schema-error`.
- Lint code `non-nfkc-true-false-marker` (`info`): the marker is not its own
  NFKC form.
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
- Frontmatter rule (`docs/question-types/question-base.md`): a Markdown
  frontmatter may hold only the fields of the frontmatter table of its
  question type and of the base table. Any other key, a field the body sets
  (`stem`, `choices`, `accept`, the `unit` of a numeric question, ...) or an
  unknown key, is the error `invalid-frontmatter-field` (it replaces the
  warning `unknown-frontmatter-key`). `accept` and `reject` leave the
  frontmatter table of short answer, and `unit` the one of numeric: the body
  sets them (`[short-answer]`, `[numeric(unit)]`). The lint code
  `conflicting-accept` no longer exists. YAML and JSON are unchanged.
- Lint code `redundant-id` (`warning`): `id` set in the frontmatter and as a
  slug. The frontmatter wins, whether the values are equal or not.
- Frontmatter schemas in the bundle (`$defs/frontmatter-<type>`, one per
  question type and for the exam), built from the frontmatter tables by
  `scripts/schema_bundle.py`. `scripts/spec_audit.py` checks the frontmatter
  of every `.mdq.md` example against them.
- Pre-validation feedback for short answer (`docs/question-types/short-answer.md`, "Pre-validation"). An invalid submission shows the feedback of the first matching `preReject` pattern that has one. Otherwise, if no `preAccept` pattern matches, it shows the feedback of the first `preAccept` pattern that has one (a format hint). Fill in short answer blanks follow the same rules. Pattern feedback in `patterns.md` and in the schemas now refers to the selection rule of short-answer.md, "Feedback", instead of "the pattern that decided the response".
- `incorrectFeedback` for the short answer blanks of fill in: a field of the blank in the AST, and a map from blank id to string in the frontmatter (a shorthand, like `preAccept` and `preReject`). An unknown blank id is `undefined-blank`.
- Additional Rules rows of short answer: an empty pattern line (`parse-error`), a `[short-answer/preAccept]` or `[short-answer/preReject]` block (`forbidden-block-element`), and `automation` in the frontmatter (`invalid-frontmatter-field`) or in YAML/JSON (`schema-error`). A note says that the table lists diagnostics only. One sentence each states the minimum of a pattern list, the visible character rule of `incorrectFeedback` and the redundant regex anchor. A SHOULD NOT sentence in "Grading" covers `no-correct-answer`.
- Grading vectors: a `feedback` key in `examples/grading/short-answer.yaml` and the new file `examples/grading/short-answer-prevalidation.yaml`. New valid example: `fill-in/incorrect-feedback`.
- Short answer response (`docs/responses.md`, "Short answer and essay"): the response is a string. Any other value (a number, a boolean, a list, a mapping) is a malformed response. `""` and a string of only spaces are graded like any other response; only `null` skips. Grading vectors in `examples/grading/short-answer.yaml` cover them, with the new score `"malformed"`.
- Exact literal with a backtick (`docs/references/patterns.md`, "Exact literals"; `docs/question-types/short-answer.md`, "Content"): the literal follows the CommonMark code span. A run of N backticks opens it, the first run of exactly N backticks closes it, and one space is removed from each end when both ends have one and the content is not only spaces. `` `` `date` `` `` is the literal `` `date` ``. The grammar has a `FENCE` terminal in place of the single backtick. New valid examples `short-answer/exact-backtick` and `short-answer/exact-backtick-run`, the model-only invalid example `short-answer-fence-mismatch`, and grading vectors.
- The `patternString` schema cannot compare the length of the opening and closing runs of backticks (it needs a backreference, which portable JSON Schema validators lack). It checks that a pattern that opens with a backtick also closes with one; the models check the rest and report `schema-error`.
- Exam `grading` (`docs/exam.md`, "Grading"): short answer, numeric, essay and ordering have no `grading` field. The exam `grading` does not apply to them, and the mapping form has no key for them (`schema-error`). New invalid example `exam-grading-short-answer-key`.
- Glossary entries: Exact literal, Inexact literal, Pattern, Pre-validation, Settled response.
