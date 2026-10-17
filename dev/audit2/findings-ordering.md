---
type: issue
status: active
tags: [mdq, audit, spec, ordering]
relatedTo: [dev/audit2/brief.md]
---
# Findings: ordering

## Summary
- Checked 37 valid examples (`examples/valid/ordering/*.mdq.md` + `.yaml` + `.lint.json`), 19 invalid (`examples/invalid/ordering-*`) and 2 model-only (`examples/invalid/model-only/ordering-*`). There is no `examples/grading/ordering.yaml`.
- Indentation unit and levels recomputed with my own script for all 37 valid examples (gcd, tab = 4, default 4, across all blocks): 37/37 match the `.yaml`. Keys, enums and shapes match `schema/ordering.yaml` by eye. All 9 ordering lint codes appear with the right severity.
- Main conformance problem: the observations grammar. Two valid examples put a blank line between the `>` and `!` blocks, which the grammar does not allow. The prose sentence "once a `!` comment block has started, a `>` line ends the observations" contradicts "either order", the grammar, `reject-feedback.mdq.md` and the doc's own example.
- Main spec gaps: no rule or code for a `reject` equal to the `[ordering]` block (the grading rules give both 1 and 0); `ul` indentation and nesting undefined; level of a whitespace-only line undefined; "malformed" ordering response undefined; blank line after `[ordering]` not pinned.
- Grading corpus is missing entirely (sketch in ORDERING-E1).

## Conformance findings

### ORDERING-C1 Blank line between feedback and comment blocks violates the grammar (severity: high)
- Files: `examples/valid/ordering/reject-feedback.mdq.md` (blank line between the `!` block and the `>` block), `examples/valid/ordering/full-metadata.mdq.md` (blank line between the `>` block and the `!` block).
- Spec: `docs/question-types/ordering.md` "Body":
  `observations : feedback comment? nl* | comment feedback? nl*`, `feedback : (ws? ">" ws? md_inline* nl)+`, `comment : (ws? "!" ws? md_inline* nl)+`.
- Problem: the grammar allows no `nl` between `feedback` and `comment`. A blank line ends `feedback`/`comment`, and `nl*` then must be followed by `content`. A grammar-conforming parser rejects both files (`parse-error`). The corpus pins them as valid with `feedback` + `comment`.
- Fix: change the grammar, e.g. `observations : feedback nl* (comment nl*)? | comment nl* (feedback nl*)?`. `ordering-two-feedback-blocks.mdq.md` stays invalid under this grammar.

### ORDERING-C2 Lazy continuation of the feedback blockquote is not specified (severity: medium)
- Files: `examples/valid/ordering/observations-adjacent.mdq.md` (`> A saída...` directly followed by `! Erro mais comum.`); its `.yaml` comment: "The `!` line is not a lazy continuation of the blockquote."
- Spec: `ordering.md` "Accepted/rejected answers": "The optional feedback message is provided in a markdown blockquote."
- Problem: in CommonMark, `! Erro mais comum.` after a `>` paragraph line is a lazy continuation line, so the blockquote holds both lines and there is no comment. The example follows the line-based grammar, but the prose says "markdown blockquote". Two readers get different `feedback`/`comment`.
- Fix: state in the prose that observations are read line by line from the source: a line that starts with `!` (after optional `ws`) is never a lazy continuation of a `>` block, and the reverse.

### ORDERING-C3 Implementation reference in a corpus file (severity: low)
- Files: `examples/invalid/model-only/ordering-accept-reject-overlap.yaml` header: "only rejected by `OrderingQuestion.check_accept_and_reject_disjoint`".
- Spec: corpus is implementation-neutral (`docs/question-types/base.md` "AST representation").
- Fix: cite `ordering.md#additional-rules` only, as the `-lenient` sibling does.

### ORDERING-C4 Diagnostic paths are inconsistent across the alternative codes (severity: low)
- Files: `model-only/ordering-accept-reject-overlap*.lint.json` use `["accept", 0]`. `accept-repeats-answer-key.lint.json` and `duplicate-alternative-lines.lint.json` use `[..., i, "lines"]`. `reject-without-feedback.lint.json` uses `["reject", 0]`.
- Spec: `docs/lint-codes.md` defines no paths. The three "same lines" codes all compare `lines`.
- Fix: use `[..., i, "lines"]` for all three "same lines" codes, or document the path convention. The spec should also say which side `accept-reject-overlap` points at.

## Exhaustiveness gaps

### ORDERING-E1 No `examples/grading/ordering.yaml` (severity: medium)
- Spec: `ordering.md` "Grading", "Normalizations", "Indentation"; `docs/responses.md` "Ordering", "Skipping", "Pending", "Errors".
- Missing: the whole file. Note: the existing grading files write pending as `score: "pending"` (`short-answer.yaml` header), not `score: null` as the brief says. The sketch follows the corpus. Sketch:
  - Base question: lines `[[0,"n = int(input())"],[0,"if n > 0:"],[1,"print(n)"]]`, one `accept` (a real alternative order), one `reject` with feedback.
    - answer key -> 1; accept -> 1; reject -> 0; no match (default `manual`) -> "pending"; subset of the lines -> "pending"; `[]` -> pending or malformed? (S6); `null` -> 0 (skipped, no feedback).
  - `unmatched: incorrect`: no match -> 0; answer key -> 1; reject -> 0.
  - `fixed` (default): right order with `[0,"print(n)"]` instead of `[1,...]` -> 0/pending or malformed? (S6).
  - `lenient`: any levels, right order -> 1; `[5,"print(n)"]` -> 1.
  - `strict`: right order, wrong level -> pending; right order and levels -> 1. `strict` + `dedent`: wrong level -> 1.
  - `skip-blanks` (lines with a `[0,""]`): blank omitted -> 1; blank moved -> 1; two blanks -> 1. Without `skip-blanks`: blank omitted -> pending.
  - Duplicates (`print(a)` twice): two copies -> 1; one copy -> pending; three copies -> malformed? (S6).
  - Distractor present (`extra: [[0,"print(a * 2)"]]`, `unmatched: incorrect`): answer key + distractor -> 0, not malformed (responses.md "Ordering"). Spare copy of a needed line in `extra`: answer key using each line as often as `lines` -> 1.
  - Malformed shapes: not a list; `[[0,"x","y"]]`; `[[-1,"x"]]`; `[[1.5,"x"]]`; `[[0,"unknown line"]]` (S6).

### ORDERING-E2 Blank line between `[ordering]` and the content block (severity: medium)
- Spec: `ordering : "[" "ordering" "]" nl content section*` (no `nl+`, unlike the sections).
- Missing: an example that decides the case. Every corpus file has the block directly after the tag. Propose `examples/invalid/ordering-blank-after-tag.mdq.md` (`[ordering]`, empty line, fenced block) or a valid one, depending on S3.

### ORDERING-E3 `ul` items that are not one line (severity: medium)
- Spec: "An item is exactly one line: an item with a continuation line or a second paragraph is an error (`parse-error`)".
- Missing: only the continuation line is covered (`ordering-multiline-item`). Propose:
  - `invalid/ordering-item-second-paragraph.mdq.md`: `* a` / blank / `  more` / `* b`.
  - `invalid/ordering-nested-item.mdq.md`: `* a` / `    * b` / `* c`. Depends on S4.
  - A loose list (`* a` / blank / `* b`): each item is still one line, so this can go either way. Pin it.
  - Mixed markers (`* a` / `- b`): CommonMark reads two lists. Pin it as `parse-error` or as valid.

### ORDERING-E4 Declared `content` that contradicts the body (severity: medium)
- Spec: "The `content` and `highlight` frontmatter fields are inferred from this block when they are not declared, and a declared value wins."
- Missing: `content: text` with a fenced body (is the fence language still inferred as `highlight`, and does `ignored-highlight` fire?), and `content: code` with a `ul` body. Propose `valid/ordering/declared-content-text.mdq.md`. Depends on S8.

### ORDERING-E5 Section order and missing content in a section (severity: low)
- Spec: `section*` (any order); `ordering_accept : ... nl+ observations? content`.
- Missing:
  - Valid: `## [extra]` after `## [reject]` (`valid/ordering/extra-after-reject.mdq.md`).
  - Invalid: a section with observations and no content block (`invalid/ordering-section-without-block.mdq.md`).
  - Invalid: `reject` content type mismatch. Only `accept` and `extra` are covered.
  - Invalid: `! c` / `> f` / `! c2` (comment-feedback-comment) and two comment blocks (`! a` / blank / `! b`).

### ORDERING-E6 Schema constraints with no invalid example (severity: low)
- Missing:
  - `extra: []` (`Lines.minItems: 1`).
  - `reject: [{lines: []}]`.
  - An `Alternative` with an unknown key, e.g. `score: 0.5` (`additionalProperties: false`).
  - `feedback: ""` and `comment: ""` (`minLength: 1`).
  - `highlight: ""`.
  - `unmatched: never` (enum).
  - A level written as a string, `["1", "x"]`.
  - Markdown sources: an empty fence after `[ordering]`, or a one-line fence (`lines` `minItems: 2` reached from Markdown).

### ORDERING-E7 Valid-side combinations not exercised (severity: low)
- Missing:
  - `indentation: fixed` and `unmatched: manual` written explicitly.
  - `normalizations: [dedent]` with `fixed`.
  - `lenient` with an explicit `dedent` (no lint expected).
  - Both normalizations together.
  - `normalizations: []`.
  - Mixed tab and space indentation (`\t  ` = 6).
  - Duplicate lines in a `ul`.
  - An empty `ul` item (`*` alone): `blank-ordering-line` on text content.
  - A fence info string with more than the language (```` ```python linenums ````).
  - `ignored-highlight` with an unknown language: do both codes fire?
  - `accept-reject-overlap` from a Markdown source.
  - `##[accept]` without a space (S9).

## Spec defects

### ORDERING-S1 "`!` then `>` ends the observations" contradicts "either order" (severity: high)
- Files: `examples/valid/ordering/reject-feedback.mdq.md`; `ordering.md` lines 75-80 (its own `## [reject]` example: `!` line, then `>` lines).
- Spec: "A section carries at most one feedback block and at most one comment block, in either order. They MUST NOT interleave: once a `!` comment block has started, a `>` line ends the observations." The grammar has `comment feedback? nl*`.
- Problem: under the second sentence, the `>` in `! ... > ...` ends the observations. The next token is not `content`, so the doc example and `reject-feedback.mdq.md` become `parse-error`. The first sentence, the grammar and both files say this order is valid.
- Fix: "once both blocks have appeared, a further `>` or `!` line is an error (`parse-error`)".

### ORDERING-S2 A `reject` equal to the answer key has no rule and an undefined score (severity: high)
- Spec: "Grading": "A response matching the `[ordering]` block or any `## [accept]` section is correct, with a score of `1`. A response matching any `## [reject]` section is incorrect, with a score of `0`." Additional Rules cover only accept-vs-reject (`accept-reject-overlap`) and accept-vs-answer-key (`accept-repeats-answer-key`, warning).
- Problem: a reject that holds the `[ordering]` lines, after full normalization, gets both 1 and 0. No precedence is stated, unlike short-answer.md "the first rule that applies". No code and no example.
- Fix: add a critical rule (e.g. `reject-repeats-answer-key`, error) with model-only examples, including one that matches only after `lenient`/`skip-blanks`.

### ORDERING-S3 Blank lines in the body grammar (severity: medium)
- Spec: `ordering : "[" "ordering" "]" nl content section*` vs `ordering_extra : "##" ws? "[" "extra" "]" nl+ content`. The prose says only "an `[ordering]` tag followed either by a code block or a markdown `ul` element".
- Problem: the grammar forbids a blank line after `[ordering]` but allows one after a section header. It also has no `nl` between `content` and `section`, although every example has a blank line there. A reader of the prose accepts `[ordering]` + blank + block. A reader of the grammar rejects it.
- Fix: decide, and write `nl+` (or state the rule in prose). Allow blank lines between `content` and `section`. Add E2.

### ORDERING-S4 Indentation of `ul` items is undefined (severity: medium)
- Spec: "takes the greatest common divisor of the leading whitespace of every non-blank line that is indented at all"; "Each line is derived from the respective list item, preserving its markdown source verbatim."
- Problem:
  - For a `ul`, the spec does not say what "leading whitespace" is. It could be the spaces before the marker (` * a`, legal in CommonMark up to 3 spaces), the spaces after the marker (`*   a`), or a nested item (`    * b`, which markdown reads as a sublist, i.e. a continuation of the previous item).
  - `brazil-timeline.yaml` asserts "List items carry no indentation of their own, so every line sits at level 0". The spec does not say this.
  - `strict` on text content is therefore undefined.
- Fix: state that `ul` lines are always level 0 and a nested list is `parse-error`, or define levels from nesting depth. State whether the extra spaces after the marker are part of the text.

### ORDERING-S5 Level and blankness of a whitespace-only line (severity: medium)
- Spec: the gcd is over "every non-blank line that is indented at all"; "A line's indentation level is its leading whitespace divided by that unit"; `blank-ordering-line`: "A `lines`/`extra` entry is blank"; `skip-blanks`: "ignores blank lines".
- Problem: a code line of only 2 spaces with unit 4 is left out of the gcd, but its level is 0.5, not an integer (schema `type: integer`). The spec does not say whether "blank" includes whitespace-only lines.
- Fix: "A blank line (empty or only `ws`) is `[0, ""]`." Add an example.

### ORDERING-S6 Malformed ordering response is undefined (severity: medium)
- Spec: responses.md "Errors": "a response the question cannot represent | `ResponseError`"; "Ordering": "A response may hold a distractor ... that is a wrong answer, not a malformed response."
- Problem: no rule for:
  - a line that is in neither `lines` nor `extra`;
  - more copies of a line than the question offers;
  - under `fixed`, a level that differs from the authored one ("the student cannot change it");
  - text with leading whitespace ("the text carries no leading indentation of its own");
  - an empty list.
  Implementations will choose between `ResponseError`, 0 and pending.
- Fix: list the malformed cases in `responses.md` "Ordering", then pin them in E1.

### ORDERING-S7 Alternatives that use unavailable lines or distractors have no rule (severity: medium)
- Spec: "Extra lines": "Its lines are distractors: they ... MUST NOT appear in a correct response." The `full-metadata.yaml` comment says the reject's distractor "is declared in `## [extra]` so the student can actually build it".
- Problem:
  - An `accept` that uses an `extra` line breaks a MUST, but has no code.
  - An `accept`/`reject` that uses a line in neither `lines` nor `extra`, or more copies than offered, can never match. No lint reports it.
- Fix: add a critical rule (accept uses a distractor) and a warning (unreachable alternative), with codes and examples.

### ORDERING-S8 "A declared value wins" for `content` is underspecified (severity: medium)
- Spec: "The `content` and `highlight` frontmatter fields are inferred from this block when they are not declared, and a declared value wins." Footnote 2: highlight is "Ignored when `content` is not "code"".
- Problem: with `content: text` and a fenced body, it is not defined whether the fence language is still inferred into `highlight`. If it is, `ignored-highlight` fires on a value the author never wrote. `content: code` with a `ul` body: it is not defined whether the lines are still the raw item source.
- Fix: say that `highlight` is inferred only when the effective `content` is `code`. Or make a contradicting `content` an error.

### ORDERING-S9 `ws?` after `##` (severity: low)
- Spec: `"##" ws? "[" "extra" "]"` (same for accept/reject).
- Problem: CommonMark needs a space after `##`, so `##[accept]` is a paragraph, not a heading.
- Fix: use `ws`.

### ORDERING-S10 Grammar-only rows in "Additional Rules" have no code (severity: low)
- Spec: rows "must use the same content block type as `[ordering]`", "at most one `## [extra]` section may be declared", "a section carries at most one feedback and one comment block" (critical). base.md: "This section documents only the rules that are NOT captured by the JSON schema and requires additional programatic support".
- Problem: these rows cannot be broken by a YAML document, and the corpus reports them as `parse-error`. The table does not say so.
- Fix: mark them "(grammar, `parse-error`)", as the schema rows say "(schema)".

### ORDERING-S11 Prose before a section: `parse-error` or `forbidden-block-element` (severity: low)
- Spec: ordering.md: "prose between the block and a section is an error (`parse-error`)". base.md "Forbidden elements": "Heading starting with optional `ws` + `[`" in the epilogue.
- Problem: in `ordering-epilogue-before-section.mdq.md`, the paragraph is an epilogue followed by `## [extra]`, which is a forbidden heading in the epilogue. Both codes apply. The corpus pins `parse-error`.
- Fix: say in base.md or lint-codes.md that the type-specific `parse-error` wins.

### ORDERING-S12 `unmatched` default differs from short answer (severity: low)
- Spec: ordering.md footnote 4: "`"manual"` (the default)". short-answer.md "Grading": "its value is `"incorrect"` when the question has at least one `accept` pattern, and `"manual"` when it has none."
- Problem: an ordering question always has an answer key, so the short-answer rule would give `incorrect`. The two docs are each explicit, so there is no contradiction, but the defaults are inconsistent across types (automation `semi-automatic` by default).
- Fix: confirm this is intended, or align with short answer.

### ORDERING-S13 Minor wording and schema items (severity: low)
- Schema `content` has `default: text`. The prose gives no default for a YAML document with no body. State it.
- `schema/ordering.yaml` lines 101 and 110 both declare `uniqueItems: true` on `normalizations`. Remove one.
- "The highlight of fenced code blocks is ignored" is said only for `## [extra]`, not for `## [accept]`/`## [reject]` fences, nor how the language is taken from an info string with several words.
- "Repeated lines are compared in the order they appear" adds nothing to a sequence comparison. Remove it or explain it.
- "two sections whose content blocks hold the same lines" (SHOULD NOT) includes `## [extra]`, but `duplicate-alternative-lines` covers only accept/accept and reject/reject.
- `blank-extra-line.yaml` pins that a blank line before the closing fence is a line `[0, ""]`. The spec does not say how fence content splits into lines.

## Checked and fine
- Indentation unit gcd across all four blocks, tab = 4, default 4, level = whitespace / unit: recomputed for all 37 valid examples, all match (`indentation-gcd` unit 2, `indentation-unit-across-sections` 2, `lenient-indentation` 1, `tab-indentation` 4, others 4).
- Inference: fence -> `content: code` + `highlight` from the language (`fibonacci`, `tilde-fence`); fence without language -> no `highlight`; `ul` -> `content: text`; declared `highlight` wins; extra fence language ignored; `-`/`+` markers.
- `ul` text is the raw source (`*Lei Áurea*` kept); one-line item rule (continuation); ordered list body rejected; no block rejected.
- Sections: extra code/ul, accept, reject, repeated accepts, at most one extra, same block type for extra/accept, epilogue after the last section and with no sections, prose before a section -> `parse-error`.
- Observations: feedback only, comment only, feedback+comment adjacent, comment+feedback, `> ! >` interleaving rejected, two feedback blocks rejected.
- Normalizations: bare string -> list, list form, repeated entry -> `schema-error`, unknown entry -> `schema-error`; both sides normalized (`accept-repeats-after-*`, `duplicate-accepts-after-dedent`, `ordering-accept-reject-overlap-lenient`); `lenient` implies `dedent`.
- Lint codes and severities match lint-codes.md and the Additional Rules levels: `accept-reject-overlap` (error), `accept-repeats-answer-key`, `duplicate-alternative-lines`, `redundant-strict-indentation`, `ignored-highlight` (warning), `blank-ordering-line` (lines and extra), `reject-without-feedback`, `visually-identical-lines` (within lines and across lines/extra), `unknown-highlight-language` (info). `missing-id`/`missing-title` present exactly when absent.
- Schema: `lines` `minItems: 2`, `Alternative.lines` `minItems: 1`, `Line` pair shape (3 items, negative level, non-integer level), `content`/`indentation` enums: each has an invalid example with the right path. All valid `.yaml` keys are in question-base ∪ ordering.
- Duplicates in `lines`, distractor repeating a needed line, distractor differing only by level.
- Response shape `[level, text]`: ordering.md, responses.md and schema `Line` agree. Automation (`unmatched` -> automatic/semi-automatic) agrees with base.md and responses.md "Pending".
