---
type: issue
status: active
tags: [mdq, audit, spec, fill-in]
relatedTo: [dev/audit2/brief.md]
---
# Findings: fill-in

## Summary
- Checked 27 valid examples (24 `.mdq.md` + 3 YAML-only, each with `.yaml` + `.lint.json`), 21 `examples/invalid/fill-in-*` and 4 `examples/invalid/model-only/fill-in-*`.
- All `.mdq.md` -> `.yaml` mappings and schema shapes agree with the spec. 21 of the 25 invalid examples are uncontroversial.
- Two invalid examples get a code the spec does not support: duplicate definitions (C1) and `comment: ""` (C2). Four pin one of two readings the spec allows: C1, C4 (code span), C5 (heading), C6 (unknown kind).
- There is no `examples/grading/fill-in.yaml`. I recomputed the worked table in fill-in.md "Grading": all 21 cells are correct (sketch in E1).
- Main spec gaps: what an empty blank is in a response, and whether an empty `manual` blank is pending (S4). The block-level misplaced-blank rule allows two outcomes and has no error code (S1). A Markdown numeric blank has no way to set `domain`/`decimalPlaces` (S5).
- Main coverage gaps: the grading file; image alt / list / table / blockquote / preamble-paragraph positions; the delegated choice and short-answer errors at blank paths.

## Conformance findings

### FILLIN-C1 Duplicate definitions pinned as `parse-error`, spec gives `duplicate-blank-id` (severity: high)
- Files: `examples/invalid/fill-in-two-choice-definitions.{mdq.md,lint.json}`, `examples/invalid/fill-in-two-kinds-one-blank.{mdq.md,lint.json}`
- Spec: fill-in.md "Additional Rules": "blanks[].id | critical | must be unique within the question". lint-codes.md Errors: "`duplicate-blank-id` | fill-in | Two blanks declare the same `id`." That table "do[es] not include parser errors". The only Markdown-level uniqueness rule is [^5]: "One `[^id/short-answer]` (or its alias ...) and one `[^id/short-answer/reject]`", which covers short-answer blocks only.
- Problem: two `[^bioma]:` choice definitions, or `[^estados/numeric]` plus `[^estados]:`, each match `blank_def` exactly and produce two blanks with the same id. No sentence makes this a grammar violation. An implementation that emits `duplicate-blank-id` at `["blanks",1,"id"]` conforms to the text, but the corpus pins `parse-error`. In the corpus, `duplicate-blank-id` can only come from YAML.
- Fix: either state in "Blank definitions" that a slug MUST be defined at most once (except for the accept + reject pair of a short answer blank) and that a violation is a `parse-error`, or change both lint files to `duplicate-blank-id`.

### FILLIN-C2 `comment: ""` on a choice is accepted with a warning, base.md forbids it (severity: high)
- Files: `examples/valid/fill-in/choice-blank-lints.{yaml,lint.json}` (blank `b`, choice 1)
- Spec: base.md "Additional Rules": "every text field (`title`, `author`, `comment`, choice text, feedback and the like) MUST NOT be the empty string (`minLength: 1`)". But schema/multiple-choice.yaml `Choice.comment` and `Choice.feedback` have no `minLength`, and neither does question-base.yaml `comment`.
- Problem: under the prose, `comment: ""` is a `schema-error`. Under the schema, it is the `blank-choice-comment` warning the corpus pins. The two normative sources disagree.
- Fix: add `minLength: 1` to `Choice.comment`/`feedback` (and to the pattern object's `feedback`/`comment` in short-answer.yaml) and change the example to `"  "`. Or remove those fields from the base.md sentence.

### FILLIN-C3 `detached-answer-list` raised after a tag that has content (severity: medium)
- Files: `examples/valid/fill-in/epilogue-nested-list.{mdq.md,lint.json}`
- Spec: short-answer.md "Body": "The list MUST start on the line right after the tag ... A list after a blank line is not part of the block: it is an epilogue element. Implementations SHOULD warn about it, since it is a likely mistake". The only example there uses an empty tag. lint-codes.md: "A `[short-answer]` tag is followed by a blank line and a list."
- Problem: `[^animal/short-answer]: capybara` has its pattern on the tag line, so a list could never be its pattern list ("A tag with content on its line MUST NOT be followed by a list"). A later list is not "a likely mistake", but the corpus warns anyway. The short-answer corpus (`short-answer/detached-list`) only covers the empty-tag case. A reader who limits the warning to empty tags produces only missing-id/title.
- Fix: say in short-answer.md whether the warning requires an empty tag. If it does, drop the diagnostic here; if not, add a short-answer example with content + blank line + list.

### FILLIN-C4 Blank in a stem code span: `misplaced-blank` vs literal text (severity: medium)
- Files: `examples/invalid/fill-in-misplaced-blank-code-span.{mdq.md,lint.json}`
- Spec: fill-in.md L103-104: "Fenced code is the one case where leaving it alone is obviously right -- a blank inside code is literal text." L118: "The same reasoning rules out link text, image alt text, emphasis and inline code". lint-codes.md `misplaced-blank`: "... or a code span."
- Problem: "a blank inside code is literal text" reads as covering code spans. Under that reading, `` `[^capital]` `` is text and the only diagnostic is `unreferenced-blank` at `["blanks",0,"id"]`. The corpus pins `misplaced-blank` at `["stem"]`.
- Fix: see S2.

### FILLIN-C5 Blank in a preamble heading: the stem has no blank, the corpus picks `unreferenced-blank` (severity: medium)
- Files: `examples/invalid/fill-in-misplaced-blank-heading.{mdq.md,lint.json}`
- Spec: fill-in.md "Stem": `stem : inline_md? (blank inline_md?)+` requires at least one blank. L101-102: a `[^slug]` in a heading "is not a blank: implementations MUST either reject the document or leave the text exactly as written".
- Problem: the stem `Complete a frase do título.` breaks the stem grammar, so `parse-error` is a valid reading. "Reject the document" with `misplaced-blank` is another. The corpus pins `unreferenced-blank`, while the file name says "misplaced-blank".
- Fix: decide what a stem with no blank and a blank in a non-paragraph block produce (see S1), then rename or re-code the example.

### FILLIN-C6 Unknown blank kind: `parse-error` vs epilogue text + `undefined-blank` (severity: medium)
- Files: `examples/invalid/fill-in-unknown-blank-kind.{mdq.md,lint.json}`
- Spec: base.md "Bracketed tags": a bracket that is not a tag is "left alone as ordinary inline text". base.md "Forbidden elements" exempts a paragraph that starts with `[^`. fill-in.md gives `blank_def` only three alternatives and never says what an unmatched `[^x/kind]:` is.
- Problem: `[^resposta/essay]:` does not match `blank_def`, so a reader can treat it as an epilogue paragraph. The stem marker is then undefined (`undefined-blank` at `["stem"]`). The corpus pins `parse-error`. For a unit, the spec does say "is not valid syntax" (`fill-in-unit-on-short-answer-tag`); for an unknown kind it says nothing.
- Fix: add "A `[^slug/...]:` tag whose suffix is not `numeric`, `short-answer`, `short-answer/accept` or `short-answer/reject` is a parse error."

### FILLIN-C7 Comment claims an integer beyond 32 bits, but the value fits (severity: low)
- Files: `examples/valid/fill-in/numeric-blank-forms.yaml`
- Spec: numeric.md "Answer representation": "It SHOULD be kept as a string if it is not representable in the 32-bit signed integer range."
- Problem: the comment says "an integer beyond 32 bits", but `203000000` < 2147483647, and the YAML correctly keeps it a number. No fill-in example covers the string case.
- Fix: use e.g. `2030000000000 +- 1%` with `answer: '2030000000000'`, or fix the comment.

### FILLIN-C8 Stale references in model-only comments (severity: low)
- Files: `examples/invalid/model-only/fill-in-misplaced-blank.yaml` cites "fill-in.md:301", which is now in "Grading" (the rule is at L95-120). `examples/invalid/model-only/fill-in-duplicate-blank-id.yaml` cites "dev/specs/to-do/unique-ids.md", a git-ignored path.
- Fix: cite section names ("Where blanks may appear", "Additional Rules").

### FILLIN-C9 Integer absolute tolerance written as int or float, inconsistently (severity: low)
- Files: written as a float in `mixed-blanks.yaml` (`95 +- 5` -> `5.0`) and `numeric-blank-forms.yaml` (`+- 100` -> `100.0`); written as an int in `unmatched-manual.yaml` (`6 +- 1` -> `1`) and `numeric-unit-slash.yaml` (`80 +- 5` -> `5`).
- Spec: base.md "A value keeps its YAML type and is never converted". numeric.md coerces only `answer`, and says nothing about the absolute tolerance.
- Problem: a comparison that checks types fails on one of the two groups. The numeric corpus has the same split.
- Fix: state how an `INTEGER` absolute tolerance is represented and normalize the corpus.

### FILLIN-C10 `no-correct-answer` path differs from the short-answer corpus (severity: low)
- Files: `fill-in/short-answer-blank-lints.lint.json` uses `["blanks",1]`; `short-answer/no-correct-answer.lint.json` uses `["unmatched"]`.
- Spec: lint-codes.md says "the question (or short answer blank) has no `accept` pattern" and gives no path.
- Fix: document the blank-level path in lint-codes.md.

## Exhaustiveness gaps

### FILLIN-E1 No grading file; worked table recomputed (severity: medium)
- Spec: fill-in.md "Grading" and "Automation"; responses.md "Fill in the blanks", "Skipping", "Pending".
- Missing: `examples/grading/fill-in.yaml`. I recomputed the table with river = short answer, length = numeric and city = a 3-choice blank. A wrong symmetric pick scores (0-1)/2 = -0.5. All 21 cells match; the exact values are 2/3, 1/2, 1/3, 1/6 and -1/6.
- Sketch, using the `"pending"`/`"malformed"` convention of short-answer.yaml/numeric.yaml (the brief's `score: null`):

```yaml
questions:
  - name: "Three kinds, table of fill-in.md"
    question:
      blanks:
        - { id: river, type: short-answer, accept: [Amazonas] }
        - { id: length, type: numeric, answer: 6400, tolerance: { relative: 0.05 } }
        - { id: city, type: multiple-choice, choices: [{id: manaus, text: Manaus, score: 1}, {id: belem, text: Belém}, {id: santarem, text: Santarém}] }
    examples:
      - { response: { river: Amazonas, length: 6500, city: manaus }, score: { partial: 1, all-or-nothing: 1, symmetric: 1 } }
      - { response: { river: Amazonas, length: 6400, city: belem }, score: { partial: "2/3", all-or-nothing: 0, symmetric: "1/2" } }
      - { response: { river: Amazonas, length: 9000, city: manaus }, score: { partial: "2/3", all-or-nothing: 0, symmetric: "2/3" } }
      - { response: { river: Amazonas, length: 9000 }, score: { partial: "1/3", all-or-nothing: 0, symmetric: "1/3" } }   # city empty
      - { response: { length: 6400, city: belem }, score: { partial: "1/3", all-or-nothing: 0, symmetric: "1/6" } }         # river empty
      - { response: { river: Tietê, length: 9000, city: belem }, score: { partial: 0, all-or-nothing: 0, symmetric: "-1/6" } }
      - { response: {}, score: { partial: 0, all-or-nothing: 0, symmetric: 0 } }
      - { response: { river: null, length: null, city: null }, score: 0 }            # empty as null (S4)
      - { response: { river: "", length: 6400, city: manaus }, score: "?" }          # empty as "" (S4)
      - { response: null, score: 0 }                                                  # skipped
      - { response: { river: Amazonas, estado: AM }, score: "malformed" }             # unknown blank id (S4)
      - { response: { city: recife }, score: "malformed" }                            # unknown choice id
  # Explicit negative choice (belem: -1) under partial: {Amazonas, 6400, belem} -> partial 2/3, symmetric 1/3
  # [50%] choice picked, others right -> partial 5/6, all-or-nothing 0, symmetric 5/6
  # unmatched: manual, river "Negro" -> "pending"; river empty -> 1/2 or "pending" (S4)
  # Open blank (no accept): any response -> "pending"
  # Numeric blank, domain integer, response 6400.5 -> "malformed"
```
- Also missing: feedback-order cases (definition order vs stem order; a skipped question shows no feedback). The corpus has no format for feedback yet.

### FILLIN-E2 Misplaced-blank positions not exercised (severity: medium)
- Covered so far: emphasis, link, code span and heading (Markdown); strong (YAML only); fenced code in the preamble and an epilogue paragraph (valid).
- Missing:
  - Strong in Markdown: `A capital é **[^capital]**.`
  - Image alt text: `![mapa de [^estado]](mapa.png)`.
  - A list item as the stem block: `* A capital é [^capital].`
  - A table row as the stem block: `| Capital | [^capital] |`.
  - A blockquote as the stem block: `> A capital é [^capital].`
  - Fenced code as the stem block.
  - `fill-in-blank-in-preamble`: two paragraphs that each hold a blank, both defined. The first paragraph is preamble, so its blank is `unreferenced-blank`. This is the likely "two-paragraph stem" mistake.

### FILLIN-E3 Numeric-blank fields and forms (severity: medium)
- Missing:
  - Declared `domain: fraction` with `answer: 2`.
  - Declared `domain: decimal` with a meaningful `decimalPlaces`.
  - A string decimal `answer: "2.50"`.
  - An integer beyond 32 bits kept as a string (C7).
  - A fraction with a tolerance (`1/3 +- 0.01`).
  - `malformed-numeric-answer` on a blank (`"01"`, `"1/0"`) at `["blanks",0,"answer"]`.
  - A numeric blank without `answer`.

### FILLIN-E4 Choice-blank errors inherited from multiple choice, at blank paths (severity: medium)
- Missing:
  - `duplicate-choice-id`, `duplicate-choice-text` and `blank-choice-text` in a blank.
  - `[150%]` (score out of range).
  - A choice blank with a single choice (schema `minItems: 2`).
  - `blanks: []`.
  - A blank without `type`.
  - `foreign-choice-marker` with `[?]`.
  - A valid `[0%]` choice.

### FILLIN-E5 Short-answer-blank errors and forms (severity: medium)
- Missing, Markdown:
  - An empty reject block.
  - A reject block followed by a detached list.
  - Content on the tag line and a list right after it.
  - The same accept spelling twice. `fill-in-blank-both-accept-spellings` and `fill-in-two-accept-lists` both test alias + canonical, which duplicates coverage.
  - An empty pattern line; a partial backtick.
  - `invalid-regex` at `["blanks",0,"accept",0]`, and inside a `preAccept` map entry.
  - A repeated regex flag.
- Missing, valid:
  - A pattern item with a `!` comment line.
  - A single-line exact literal on the tag line.
  - `ws` around the colon (`[^x] :`).
  - A blank defined by a reject block only (S6).

### FILLIN-E6 `preAccept`/`preReject` maps (severity: low)
- Missing:
  - A key on a choice blank (schema-error `["blanks",0,"preAccept"]`).
  - `undefined-blank` from a `preReject` key.
  - The object form with `feedback` (the spec's own `season` example).
  - A list instead of a map (S8).
  - A question-level `preAccept` in a YAML-direct document.

### FILLIN-E7 Enum values and automation levels (severity: low)
- Missing:
  - Explicit `grading: inherit`, `shuffle: false`/`inherit` and `diacritics: fold`.
  - A fill-in where every blank is manual (automation `manual`).
  - `unmatched: incorrect` written in Markdown.

## Spec defects

### FILLIN-S1 Block-level misplaced blank: two allowed outcomes, no code for one, conflicting preamble rule (severity: high)
- Spec: L101-103 "MUST either reject the document or leave the text exactly as written". L122-124: "A `[^slug]` in the preamble or in the epilogue is literal text ... MUST leave it as written". lint-codes `misplaced-blank` lists inline positions only.
- Problem: headings, lists, tables and blockquotes sit in the preamble or epilogue, where L122 forbids rejecting. The only exception is a non-paragraph stem block, which gets the `stem-not-a-paragraph` warning. The "reject" branch has no error code, and two conforming implementations report different codes.
- Fix: preamble and epilogue blocks are literal. A non-paragraph stem block that holds `[^slug]` is `misplaced-blank` at `["stem"]`. Extend the lint-codes description.

### FILLIN-S2 Code span: literal text or misplaced blank (severity: medium)
- Spec: L103-104 "a blank inside code is literal text" vs L118 "rules out ... inline code" and lint-codes "or a code span".
- Fix: "Fenced code in the preamble or epilogue is literal text; a code span in the stem is a `misplaced-blank`."

### FILLIN-S3 Does a misplaced marker count as a reference? (severity: medium)
- Spec: "every definition MUST be referenced by the stem" vs [^4] "A `[^id]` found anywhere else is not a blank".
- Problem: in the misplaced-blank examples, the only marker of `capital` is misplaced. If it "is not a blank", `capital` is also `unreferenced-blank`, but the corpus lists only `misplaced-blank`.
- Fix: state the rule and align the lint files.

### FILLIN-S4 Fill-in response: empty blank, pending empty blank, unknown blank id (severity: high)
- Spec: "A blank the student left empty scores 0 under every strategy." responses.md "A mapping from blank id to that blank's response" defines neither "empty" nor what happens with unknown keys. Every other mapping response says "if an id is not present in the question, it MUST be rejected as a malformed response".
- Problem:
  - (a) Empty can mean an absent key, `null` or `""`. Under `unmatched: manual`, `""` matches no pattern, so it is pending instead of 0.
  - (b) An empty blank under `manual` can read as 0 ("under every strategy") or as pending ("settled only when ... every blank is settled").
  - (c) A response key that is not a blank id: malformed, or ignored?
  - (d) A malformed blank response: does it make the whole question malformed?
- Fix: "An absent key or `null` is an empty blank. It scores 0 and is settled. An unknown key, or a blank response its type rejects, makes the response malformed." Decide `""` explicitly.

### FILLIN-S5 Numeric blank `domain`/`decimalPlaces`: no Markdown syntax, inference not stated (severity: medium)
- Spec: fill-in.md delegates only "`numeric_body` and `unit`" and the answer representation. numeric.md infers both fields and "The parsed document carries the inferred value".
- Problem: the corpus writes the inferred `domain` and `decimalPlaces` into each blank, but fill-in.md never says so. A Markdown author also cannot declare either field for a blank, and the spec does not say that either.
- Fix: state the inference and that the fields can only be declared in YAML/JSON, or add frontmatter maps like `preAccept`.

### FILLIN-S6 Short-answer blank with only a reject block (severity: medium)
- Spec: short-answer.md "A question MUST have a `[short-answer]` block". fill-in.md says only "A blank MUST define each block at most once".
- Problem: `[^b/short-answer/reject]:` alone may be valid or an error. In YAML, blank `b` of `short-answer-blank-lints.yaml` has only `reject`.
- Fix: state it and add an example.

### FILLIN-S7 Same blank referenced twice in the stem (severity: medium)
- Spec: [^3] "Otherwise the stem's `[^id]` marker is ambiguous". The response has one value per id.
- Problem: `O [^x] ... [^x]` is neither allowed nor forbidden, and it is not clear whether such a blank counts once or twice. `model-only/fill-in-duplicate-blank-id.yaml` repeats a marker incidentally.
- Fix: forbid it, or state that both positions share one response and the blank counts once.

### FILLIN-S8 Definitions after epilogue elements; non-map `preAccept` (severity: low)
- Problem: after a detached list (an epilogue element), it is not clear whether a later `[^b]:` is still body or an error. The code for `preAccept: ["x"]` (list form) in fill-in frontmatter is also unstated.
- Fix: the epilogue starts after the last definition, and a definition after an epilogue element is a `parse-error`. Give the code for a non-map `preAccept`.

### FILLIN-S9 Grammar and wording inconsistencies (severity: low)
- `choice_def` is defined twice: at L136 with `ws?` before `:`, at L163 without it. L163 also uses `blank` with a different meaning from the stem rule.
- L113-116 "In both approaches, the result would be illegal": under the split approach, the marker sits in a plain text run, and no rule makes that illegal.
- The table text says "every strategy is computed from those three numbers", then "Under `partial` ... that same wrong pick scores 0".
- fill-in.md says "rounded" but multiple-choice.md says "truncated". For -1/6 this gives -0.17 vs -0.16.
- "`blanks` preserves the order the definitions appear" does not say which definition sets the position of a blank defined twice (accept + reject). `mixed-blanks.yaml` uses the first. The feedback order inherits this.

## Checked and fine
- **Stem:** a stem starting with a blank, as the first paragraph or after a preamble. `[^ a]` and `[^-x]` are text. Blanks in the epilogue, an epilogue code span and preamble fenced code stay literal. A blockquote in the preamble works.
- **Definitions:**
  - All three kinds.
  - Bare `[^slug]:` is a choice blank.
  - The `/accept` alias.
  - Separate accept and reject definitions merge into one blank.
  - When definitions come in a different order from the stem, `blanks` keeps definition order.
  - Single-line and list patterns, and continuation lines.
  - Regex and exact patterns.
  - An open blank (no accept pattern).
- **Units:** `(km)`, `(km/h)`, `(°C)` and `(hab/km²)`. A unit on a short-answer tag is a `parse-error`; a `unit` field on a short-answer blank is a `schema-error`.
- **Numeric inference:** domain and decimalPlaces are inferred correctly, both tolerances are parsed, and a fraction stays a string.
- **Choice blanks:** `[*]`, `[50%]`, `[-25%]`, `[ ]`, choice ids, and feedback and comment in both orders. Choice ids are scoped per blank.
- **Lint codes at blank paths, with the right severities:** every choice, numeric and short-answer lint listed for fill-in in lint-codes.md, including `detached-answer-list` (but see C3).
- **Errors:**
  - `undefined-blank` from a stem marker and from a `preAccept` key ([^8] path).
  - `unreferenced-blank`, `duplicate-blank-id` (YAML), and `misplaced-blank` for 4 inline positions.
  - `foreign-choice-marker`.
  - `preReject` on a numeric blank.
  - A blank id that is not a SLUG, and a missing blank id.
  - A blank line before the choices.
  - Interleaved `>` and `!` lines.
  - Two reject blocks, and alias + canonical accept.
- **Question fields:** `diacritics`, `unmatched`, all three grading strategies, and `shuffle: true`. `preAccept`/`preReject` maps move onto the blanks.
- **Schema:** every valid `.yaml` uses only allowed keys, and stem markers and blank ids match one-to-one.
- **Grading table:** all 21 cells are correct.
