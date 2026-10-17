---
type: issue
status: active
tags: [mdq, audit, spec, choices]
relatedTo: [dev/audit2/brief.md]
---
# Findings: choices (multiple-choice, multiple-selection) + base

## Summary
- Checked 22 MC + 10 MS valid examples, 11 invalid + 3 model-only MC/MS examples, 2 grading files (16 MC blocks, 9 MS blocks), and 16 base invalid (`question-*`, `extra-fields`) + 54 base valid examples. None of the base examples uses a choice question: they all use essay.
- Every `.mdq.md` -> `.yaml` mapping and every `.lint.json` in the MC/MS area agrees with at least one reading of the spec. I recomputed every row of the MC symmetric table, the MS table, the exam.md Penalty numbers and every grading example. All are correct.
- Main defects: base.md says `comment`/feedback have `minLength: 1`, but the schema and the corpus disagree (high). base.md says to keep empty comma-split tags, but the corpus drops them (high). The spec does not say which bracket contents count as a "value" for type inference, so `[]` is `parse-error` but `[essay]`/`[?]` is `foreign-choice-marker`. The spec does not say which checkbox list is the body. The MS item grammar has no feedback/comment rules.
- Main gaps: the grading files have no skipped (`null`), malformed (unknown id, wrong type) or default-strategy cases, and the MS file cannot express `null` vs `{}`. No example covers feedback selection. No invalid example covers a bad percent form other than `[150%]`, or a blank or duplicate choice text written in Markdown.

## Conformance findings

### CHO-C1 Corpus comments point at a non-public file (severity: low)
- Files: `examples/invalid/model-only/multiple-choice-duplicate-choice-id.yaml`, `examples/invalid/model-only/multiple-selection-duplicate-choice-text.yaml`
- Spec: AGENTS.md: `dev/` "is ignored and stays local".
- Problem: the comments cite `dev/specs/to-do/unique-ids.md`. That file is not in the published corpus.
- Fix: cite `docs/question-types/multiple-choice.md`, "Additional Rules" (`choices[].id` / `choices[].text` "must be unique").

### CHO-C2 `[]` is `parse-error`, but `[essay]` and `[?]` are `foreign-choice-marker` (severity: medium)
- Files: `examples/invalid/multiple-choice-empty-brackets.lint.json` (`parse-error`, path `[]`), `examples/invalid/essay-tag-in-list.lint.json` and `examples/invalid/multiple-selection-unknown-marker.lint.json` (`foreign-choice-marker`)
- Spec: base.md "Type inference": "A body that is an unordered list whose every item starts with `[value]` is a choice list ... Once the type is known ... a `[?]` anywhere is a `foreign-choice-marker` error."
- Problem: `[]`, `[?]` and `[essay]` are all outside every `value` rule. The corpus treats `[]` as a grammar failure and the other two as foreign markers. No sentence separates them. `* [essay]` matches none of the 4 inference rules, so its type is never "known", and the foreign-marker rule as written does not apply. See CHO-S2.
- Fix: decide in the spec (CHO-S2), then align `multiple-choice-empty-brackets`. With the reading "any `[...]` not followed by `(`/`[` is a marker candidate", it becomes `foreign-choice-marker` at `["choices",0]`.

### CHO-C3 `multiple-choice-two-checkbox-lists` pins an unstated body-selection rule (severity: medium)
- Files: `examples/invalid/multiple-choice-two-checkbox-lists.mdq.md` / `.lint.json` (`forbidden-block-element` at `["epilogue"]`)
- Spec: base.md: "The markdown document is divided into 5 sections in this exact order: a YAML front-matter, introduction, body, epilogue ..." No sentence says which of two candidate lists is the body.
- Problem: the path `epilogue` implies the FIRST checkbox list is the body. That makes the stem `Lembre as regras do jogo:` and the type multiple-selection. A reader who takes the last list (the one after the question sentence) reports `["preamble"]`. Both readers reject the document, but with different paths.
- Fix: add the rule to base.md "Body". See CHO-S3.

### CHO-C4 Line joining of multi-line feedback/comment is pinned without a rule (severity: medium)
- Files: `examples/valid/multiple-choice/comments.yaml` (comment = two `!` lines joined by a space), `examples/valid/multiple-choice/feedback.yaml` (`>-` folded), `examples/valid/multiple-selection/feedback.yaml`
- Spec: multiple-choice.md "Choices": "Both the feedback and comments can span several lines, each one preceded by their corresponding punctuation." base.md grants the join license only to `preamble`/`epilogue`/`stem` and the frontmatter comment string.
- Problem: an implementation that keeps `\n` between the lines produces a different `feedback`/`comment` string than the corpus pins.
- Fix: state in multiple-choice.md "Choices" that the lines of a feedback/comment are joined with single spaces (or extend the base.md normalization license to them).

## Exhaustiveness gaps

### CHO-E1 Grading files lack skipped, malformed and default-strategy cases (severity: medium)
- Spec: responses.md "Skipping": "A response of `null` means the question was skipped. It scores 0 ..."; "Multiple choice": "An id that names a choice not present in the question MUST be rejected as a malformed response"; "Multiple selection": "if an id is not present in the question, it MUST be rejected as a malformed response"; multiple-choice.md [^1]: default `"inherit"` "is `"symmetric"` outside an exam".
- Missing (both `examples/grading/multiple-choice.yaml` and `multiple-selection.yaml`):
  - `response: null` -> `score: 0`, for each strategy.
  - unknown id -> `"malformed"` (MC `response: z`; MS `{z: true}`).
  - wrong response type -> `"malformed"` (MC `response: [a, b]`; MS `{a: "yes"}`).
  - a block with no `grading` key, which must grade as symmetric.
- The MS format `ticks: string[]` cannot express `null`, an explicit `false` key (`{a: true, b: false}` must equal `ticks: [a]`), or a non-boolean value. Switch to `response: <mapping> | null` as in true-false.yaml (`marks`), and add `score: "malformed"` to both headers as numeric.yaml does.

### CHO-E2 Grading: all-correct, none-correct and all-unspecified questions (severity: medium)
- Spec: multiple-selection.md "Grading"; responses.md "`{}` means the student considered the question and ticked nothing"; multiple-choice.md "symmetric ... clamped to the range `[-1, 0]`".
- Missing:
  - MS all-correct `{a: T, b: T, c: T}`: `ticks: []` -> partial 0, symmetric -1, all-or-nothing 0.
  - MS none-correct `{a: F, b: F, c: F}`: `ticks: []` -> 1.0 under every strategy. This is the only case where `{}` is the right answer.
  - MC symmetric with every score unspecified `{a: null, b: null}` -> `a: 0`.
  - MC all-correct `{a: 1, b: 1, c: 1}` under each strategy.

### CHO-E3 Feedback selection has no example (severity: medium)
- Spec: multiple-choice.md "Feedback": "for the choice they picked -- whatever that choice scored"; multiple-selection.md "Feedback": "judged **wrongly** -- in either direction", "listed in the order the choices appear in the document", "A skipped question shows no feedback at all".
- Missing: a `feedback:` expectation per grading example, e.g. MS key `[T, F, T, F]`, ticks `[b]` -> feedback of `a`, `b`, `c` in document order; `null` -> none; a perfect answer -> none. MC: picking the correct choice still shows its feedback.

### CHO-E4 Percent forms: invalid spellings and boundaries (severity: medium)
- Spec: multiple-choice.md `percent : /[+-]?[0-9]+([.][0-9]+)?%/`; "A percentage that would put `score` outside [-1, 1] ... makes the question malformed."
- Missing:
  - `invalid/multiple-choice-score-below-range.mdq.md` with `* [-150%] Hélio` -> `schema-error` at `["choices",0,"score"]`.
  - `[100.5%]`, just above the bound.
  - `invalid/multiple-choice-bad-percent.mdq.md` with `[50]`, `[.5%]`, `[50 %]`, `[5O%]`. The expected code depends on CHO-S2.
  - valid `[-0%]` and `[050%]`. The grammar accepts both. Pin `score: 0` / `0.5`, or forbid them (CHO-S8).

### CHO-E5 Choice-text and id uniqueness/blankness written in Markdown (severity: medium)
- Spec: multiple-choice.md "The choice text MUST NOT be empty. And all choice texts MUST be unique", and the `[a] foo bar` / `[b] foo  bar` example; lint-codes `duplicate-choice-text`: "the same once whitespace is normalized outside code spans".
- Missing:
  - `invalid/multiple-choice-duplicate-choice-text.mdq.md` with `* [ ] foo bar` / `* [*] foo  bar` -> `duplicate-choice-text` at `["choices",1,"text"]`. This also settles CHO-S5.
  - A code-span pair (`` `foo bar` `` / `` `foo  bar` ``), which must NOT be a duplicate.
  - `invalid/multiple-choice-blank-text.mdq.md` with `* [*]   ` (only spaces after the value). Is it `parse-error` (grammar `md_inline+`) or `blank-choice-text`?
  - A duplicate `[id]` written in Markdown, and duplicate ids for MS.
  - `blank-choice-text` for MS.
  - A single choice written in Markdown (`minItems: 2`).

### CHO-E6 Item grammar alternatives not exercised (severity: medium)
- Spec: multiple-choice.md `item ... nl extra_lines? (feedback? comments? | comments feedback)`, `feedback_line : ">" md_inline+ nl extra_lines?`.
- Missing:
  - Lazy continuation of a feedback line (an `extra_lines` line after `> ...` without `>`): is it feedback or text?
  - Interleaved `> a` / `! b` / `> c`, which the grammar rejects: expect `parse-error`.
  - A blank line inside an item.
  - An image line `![alt](x)` under a choice (CHO-S7).
  - An MS item with nested `markdown+` (code block, sub-list).

### CHO-E7 Frontmatter enum values (severity: low)
- Spec: [^1] of both docs: grading `"partial" | "all-or-nothing" | "symmetric" | "inherit"`, `shuffle` `boolean | "inherit"`.
- Missing in MC/MS:
  - `grading: symmetric` and `grading: inherit` written out. Is `inherit` kept in the YAML or dropped?
  - `shuffle: false` and `shuffle: inherit`.
  - MS with `all-or-nothing`.
  - Invalid: `grading: bogus`, `shuffle: "yes"` -> `schema-error`.

### CHO-E8 Foreign-marker variants (severity: low)
- Spec: base.md "Type inference" rules 1-4.
- Missing:
  - `type: multiple-choice` forced on a list with `[x]`.
  - A letter in an MC list (`[*]` + `[V]`).
  - `[?]` in an MC list.
  - A list whose every value is `[?]`. No inference rule applies.

### CHO-E9 Schema cross-type fields (severity: low)
- Spec: both schemas `additionalProperties: false` on `Choice`, `required: [type, choices]`.
- Missing:
  - An MC choice with `correct: true`, and an MS choice with `score: 1` -> `schema-error`.
  - A YAML MC without `choices`.
  - `score: "50%"` (a string).
  - `feedback: ""` (pins CHO-S1).

## Spec defects

### CHO-S1 `minLength: 1` claimed in prose, missing in the schema (severity: high)
- Spec: base.md "Additional Rules": "every text field (`title`, `author`, `comment`, choice text, feedback and the like) MUST NOT be the empty string (`minLength: 1`)". `schema/question-base.yaml`: `comment`, `preamble` and `epilogue` have no `minLength`. `schema/multiple-choice.yaml`, `schema/multiple-selection.yaml`: `Choice.feedback` and `Choice.comment` have no `minLength`.
- Problem: `feedback: ""` is a `schema-error` per base.md and only `blank-choice-feedback` per the schema. `examples/valid/essay/blank-comment.yaml` pins `comment: ''` as VALID (warning `blank-text-field`), which contradicts base.md.
- Fix: add `minLength: 1` to these fields (and give a bare `#` comment string a rule), or remove `comment`/feedback from the base.md sentence.

### CHO-S2 The set of "values" for type inference is undefined (severity: medium)
- Spec: base.md "Type inference": "a value is a letter: true/false"; "every value MUST belong to the `value` rule of that type ... or a `[?]` anywhere is a `foreign-choice-marker` error".
- Problem: `[]`, `[ab]`, `[50]`, `[essay]`, `[Q1]` and `[?]` match none of the four rules, so "once the type is known" never happens. The corpus resolves them differently (CHO-C2).
- Fix: define a marker token (e.g. `"[" /[^\[\]\r\n]*/ "]"` not followed by `(`/`[`). A list whose every item starts with a marker is a choice list. If no rule applies, report `foreign-choice-marker` at the first item that is not blank.

### CHO-S3 Body selection with several candidate lists (severity: medium)
- Spec: base.md "Body": "The body is one or more block-level markdown elements that are specific to each question type."
- Problem: no rule says which list is the body when two lists qualify (CHO-C3).
- Fix: "The body is the first block, after the stem, that matches the type's body syntax."

### CHO-S4 The MS item grammar has no feedback/comment rules (severity: medium)
- Spec: multiple-selection.md `item : ws? "[" value "]" ws? (choice_id ws?)? markdown+`, "`markdown` represent any markdown element nested inside the item", against "Choices follow the same structure from Multiple choice questions".
- Problem: read literally, `> ...` is a nested blockquote inside the choice text and `! ...` is plain text, but `examples/valid/multiple-selection/feedback.*` treats them as feedback/comment. The two grammars also differ on nested blocks: `markdown+` vs `md_inline+`.
- Fix: reuse the MC `item` rule with the MS `value` rule.

### CHO-S5 Duplicate vs visually identical text (severity: medium)
- Spec: multiple-choice.md: "all choice texts MUST be unique. Implementations MAY reject choices that ... are visually identical ... `a` and `b` are visually equivalent". lint-codes `duplicate-choice-text` (error): "same once whitespace is normalized outside code spans".
- Problem: `foo bar` / `foo  bar` is "MAY reject" in the prose and "MUST reject" in lint-codes.
- Fix: say in "Choices" that texts are compared after whitespace normalization outside code spans (MUST), and keep "MAY" for other visual equivalence.

### CHO-S6 `blank-choice-text` severity vs "empty" and base.md (severity: low)
- Spec: multiple-choice.md "The choice text MUST NOT be empty"; base.md "A string of only whitespace passes the schema and is the `blank-text-field` warning instead"; lint-codes `blank-choice-text` (error): "no visible (non-whitespace) character".
- Problem: whitespace-only is not "empty". The choice rule escalates base.md's warning to an error without a sentence that says so.
- Fix: write the rule as "must have at least one visible character", and make base.md say choice text is an exception.

### CHO-S7 Item grammar ambiguities (severity: medium)
- Spec: `extra_lines : (md_inline* nl)+`, `feedback_line : ">" md_inline+ nl extra_lines?`, `comment_line : "!" md_inline+ nl extra_lines?`.
- Problem:
  - (a) `> x` matches both `extra_lines` and `feedback_line`.
  - (b) `![mapa](mapa.png)` on a continuation line parses as a comment with the text `[mapa](mapa.png)`.
  - (c) `md_inline*` allows blank lines inside an item, and their meaning is not stated.
- Fix: exclude lines that start with `>`/`!` from `extra_lines`. State that `![` is an image (or require `! `). Decide on blank lines.

### CHO-S8 Percent token allows leading zeros and `-0` (severity: low)
- Spec: `percent : /[+-]?[0-9]+([.][0-9]+)?%/`; grammar.md "`INTEGER` and `DECIMAL` have no sign and no leading zeros."
- Problem: `[007%]`, `[-0%]` and `[50.00%]` are valid, which is inconsistent with the shared tokens. The value of `[-0%]` is not stated.
- Fix: `percent : /[+-]?/ (INTEGER | DECIMAL) "%"`, and say `-0%` is `score: 0`.

### CHO-S9 Out-of-range percent has no named code (severity: low)
- Spec: multiple-choice.md "makes the question malformed". The corpus uses `schema-error` (`multiple-choice-score-out-of-range.lint.json`).
- Fix: add "(`schema-error`)" to the sentence.

### CHO-S10 `multiple-choice-many-correct-choices` has no rule row (severity: low)
- Spec: lint-codes "More than one choice has a `score >= 1`". multiple-choice.md "Additional Rules" has no such row.
- Fix: add `choices[].score | info | more than one choice has a score of 1`.

### CHO-S11 The frontmatter table type of `shuffle` (severity: low)
- Spec: the table says "`shuffle | boolean`", against [^1] "`shuffle` is `boolean | "inherit"`" (both docs).
- Fix: write `boolean or "inherit"` in the table.

## Base

The base examples requested all use essay as vehicle, not a choice question. I audited them against base.md anyway.

### BASE-C1 `tags` comma-splitting drops empty entries without a rule (severity: high)
- Files: `examples/valid/essay/tags-empty-string.yaml` (`""` -> `[]`), `examples/valid/essay/tags-string-empty-entries.yaml` (`"agua, , clima,"` -> `[agua, clima]`)
- Spec: base.md: "`tags` written as a single comma-delimited string becomes the list of its parts, each stripped of surrounding whitespace"; "tags | warning | each entry must have at least one visible character".
- Problem: read literally, the result is `[agua, "", clima, ""]` with two `blank-tag` warnings. The corpus drops the empty parts.
- Fix: add "empty parts are dropped" to base.md, or change the examples.

### BASE-C2 Forced type vs a foreign body tag (severity: medium)
- Files: `examples/invalid/question-type-disagrees-with-body.*` (`type: numeric`, body `[essay]`) -> `schema-error` at `["answer"]`
- Spec: base.md "Type inference" covers only choice values. "Forbidden elements": "Paragraph that starts with optional `ws` + `[`, except the first paragraph".
- Problem: `forbidden-block-element` at `["epilogue"]` is an equally valid reading. The spec has no rule for a forced type whose body tag belongs to another type.
- Fix: add a sentence and a code (e.g. extend `foreign-choice-marker` to body tags).

### BASE-C3 Unknown frontmatter key: "translated as-is" vs "dropped" (severity: medium)
- Files: `examples/valid/essay/unknown-frontmatter-key.*` (warning, dropped), `examples/invalid/extra-fields.*` (`schema-error`)
- Spec: base.md "all fields in the frontmatter are translated as-is to fields in the AST, with two exceptions ...", against lint-codes `unknown-frontmatter-key` "... and was dropped".
- Problem: read literally, the key reaches the AST and fails `unevaluatedProperties: false`.
- Fix: add the third exception to base.md "Markdown to AST mapping".

### BASE-C4 `question-tags-not-string` comment implies a string is valid in YAML (severity: low)
- Files: `examples/invalid/question-tags-not-string.yaml`: "`tags` is a list of strings or one comma-separated string"
- Spec: schema `tags: type: array`. The string form is a frontmatter shorthand only.
- Fix: state whether the shorthand applies to YAML/JSON documents, and fix the comment.

### BASE-S1 `tags` uniqueness exists only in the schema (severity: low)
- Spec: schema `uniqueItems: true`. No base.md rule. `examples/invalid/question-duplicate-tags` relies on it. It is also open whether `"agua, agua"` (duplicates after splitting) is an error.
- Fix: add the rule to base.md, with an example.

### BASE-S2 Nil/Max UUID treated as non-standard (severity: low)
- Spec: base.md [^3] "SHOULD correspond to a existing standard". `uuid-nil.lint.json` and `uuid-max.lint.json` warn on both nibbles, but RFC 9562 defines Nil and Max as standard values.
- Fix: state the intent in [^3] or lint-codes.

### BASE-E1 Base invalid gaps (severity: low)
- Missing:
  - `title: ""` / `author: ""` / `id: ""` / `stem: ""` -> `schema-error`.
  - A YAML document without `stem`.
  - `type: multiple-choice` with an `[essay]` body.
  - `tags: "agua, agua"`.

## Checked and fine
- MC symmetric table: all 6 rows recomputed (u = -Σspecified/k, clamped to [-1, 0]). Correct.
- MS table: all 6 rows recomputed (judged-correct 4/0/2/3/1/2). Correct.
- exam.md "Penalty": `2 * partial - 1`, and 0.25 / 0 under `"none"`. Correct.
- MC grading file: all 16 blocks recomputed. Explicit and negative scores override every strategy. all-or-nothing = partial.
- MS grading file: all 9 blocks recomputed, thirds included. `ticks: []` is graded as "all false".
- Score derivation: `*`, `[50%]`, `[-25%]`, `[+50%]`, `[33.5%]`, `[0%]` (explicit 0), `[ ]` (score omitted). `[150%]` -> `schema-error`.
- Whitespace inside value brackets (`[ * ]`, `[ 50% ]`, tab, several spaces). `[X]`, `[ x ]`.
- Choice id vs link (`[Brasilia](...)` is text; `[rio] [Rio](...)` is id + text). An id that is not a SLUG -> `schema-error`.
- Type inference: rules 1, 2 and 4; a forced `type` wins over inference. `foreign-choice-marker` path `["choices", i]`.
- Feedback/comment in both orders, and comment only. Continued choice text. MS epilogue. A bracket-free list in the preamble.
- Lint codes with correct severity and path: `missing-choice-id`, `missing-id`, `missing-title`, `all-choices-correct`, `multiple-choice-many-correct-choices`, `multiple-choice-no-correct-choice` (also for 0.5 + 0.5), `no-correct-choice`, `blank-choice-feedback`, `blank-choice-comment`, `visually-identical-choices`, `blank-choice-text`, `duplicate-choice-id`, `duplicate-choice-text`, `forbidden-block-element`, and `schema-error` for `minItems` and for MS `correct` required.
- `null` frontmatter fields drop out (null-fields). YAML 1.2 Core scalars (yaml-core-schema). `grading`/`shuffle` copied as written.
- Every MC/MS `.yaml` satisfies its schema by eye.
- Base (essay vehicle):
  - Comment-string grammar: all 6 variants.
  - Slug reading and precedence, `[Prova 1]` / `[ Q1 ]` as text, link stem, nbsp after slug.
  - H2 and `[^` footnote allowed in the introduction/epilogue.
  - Warnings: `unsafe-thematic-break`, `stem-not-a-paragraph`, `unsafe-id`, `unsplit-tag-list`, `blank-tag`, `blank-text-field`.
  - Locale forms, `locale-lookalike-language`, uuid version/variant warnings.
  - `weight` 0 and fractional.
  - Wrong field types -> `schema-error`. Duplicate keys, including nested ones -> `yaml-syntax-error`.
