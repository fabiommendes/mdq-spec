---
type: issue
status: active
tags: [mdq, audit, spec, true-false-essay]
relatedTo: [dev/audit2/brief.md]
---
# Findings: true-false-essay

## Summary
- Checked 140 examples: valid/true-false 23 (14 with `.mdq.md`), valid/essay 82 (62 with `.mdq.md`), invalid true-false 6 + model-only 5, invalid essay 17 + model-only 7, plus `grading/true-false.yaml` (12 rows, all recomputed, all correct).
- Every `.yaml` has only keys the schemas allow. The derivable lint codes match in every valid example: `missing-id`, `missing-title`, `missing-choice-id`, `missing-answer-key`, `uniform-true-false-answers`, `ignored-highlight`, `code-input-without-highlight`.
- Conformance problems: 1 high and 3 medium. `essay-slug-not-first-element` contradicts the literal "first paragraph" exception. `true-false-symbol-marker` lists only one of its two foreign markers. Two answer-key behaviours (an empty section, a repeated section) have no spec sentence behind them.
- Main spec defects: base.md says every text field has `minLength: 1`, but the schema and corpus disagree. Unknown frontmatter keys are dropped, but base.md says frontmatter is copied as-is. The `id` false-friend rule contradicts the locale table. Type inference has no rule for non-letter values. The true/false response shape excludes the `null` that the grading file uses.
- Main gaps: no `locale: en` example. The grading file has no skip, malformed or feedback rows. There is no `duplicate-choice-id` or `blank-choice-text` example for true-false. Nothing covers `answerKey` in the frontmatter or variant answer-key headings. `grading/essay.yaml` is missing (sketch under TFE-E7).

## Conformance findings

### TFE-C1 `[Q3]` after a code fence is pinned as forbidden, but it is "the first paragraph" (severity: high)
- Files: `examples/invalid/essay-slug-not-first-element.mdq.md`, `.lint.json` (`forbidden-block-element` at `stem`)
- Spec: `docs/question-types/base.md` "Forbidden elements": "Paragraph that starts with optional `ws` + `[`, except the first paragraph". `docs/lint-codes.md` `forbidden-block-element`: "except the very first paragraph of the combined preamble+stem".
- Problem: The document is a fenced code block and then `[Q3] Explique ...`. That paragraph is the first paragraph of the document and of preamble+stem, so both texts exempt it. The corpus rejects it, which matches the Slug rule ("If the first element is a paragraph element") and not the forbidden-elements rule. Read literally, the exception also covers the first paragraph of the epilogue ("The block elements MUST follow the same rules as the block elements of the preamble"). That reading would accept `essay-forbidden-paragraph-epilogue` and `essay-two-tags`.
- Fix: In base.md and lint-codes.md, replace "except the first paragraph" with "except the first block element of the question, when it is a paragraph (the slug position)". State that the epilogue has no exception.

### TFE-C2 `true-false-symbol-marker` lists one foreign marker out of two (severity: medium)
- Files: `examples/invalid/true-false-symbol-marker.mdq.md`, `.lint.json`
- Spec: base.md "Type inference": "every value MUST belong to the `value` rule of that type ... a `[?]` anywhere is a `foreign-choice-marker` error". Brief: the lint file lists every required diagnostic.
- Problem: `[✓]` (choice 0) and `[✗]` (choice 1) are both non-letters, but only `["choices", 0]` is listed. `true-false-blank-marker` reports the offending index, so the convention is one diagnostic per value.
- Fix: Add `foreign-choice-marker` at `["choices", 1]`, or state in the spec that reporting stops at the first foreign value. See also TFE-S5.

### TFE-C3 An empty `## [answer-key]` section is pinned as "no answer key" with no spec sentence (severity: medium)
- Files: `examples/valid/essay/empty-answer-key.{mdq.md,yaml,lint.json}`
- Spec: essay.md "Answer key": "The answer key section is optional ... It starts with an `H2` heading with the text `## [answer-key]`". Nothing covers an empty section.
- Problem: A second reasonable reading is `answerKey: ""`. That is schema-valid (`essay.yaml` `answerKey` has no `minLength`) and gives `blank-text-field` instead of `missing-answer-key`.
- Fix: Add to essay.md: "An `## [answer-key]` heading with no content after it defines no `answerKey`."

### TFE-C4 Two answer-key sections are pinned as `parse-error`, but essay.md does not define where the section ends (severity: medium)
- Files: `examples/invalid/essay-two-answer-keys.{mdq.md,lint.json}`; also `valid/essay/answer-key-multi-block` (an H3 inside the key)
- Spec: essay.md: "The answer key section is placed below the `[essay]` tag and any existing epilogue block. It starts with an `H2` heading". There is no end rule, no repetition rule, and no rule for headings inside the key.
- Problem: Another reading is "the section runs to the end of the file". Then the second `## [answer-key]` and `Condensação.` are part of the key text, and the document is valid. An H2 or H1 inside the key is also unspecified.
- Fix: Specify that the section runs to end of file, that a second `## [answer-key]` heading is a `parse-error`, and whether an H1 or H2 inside the key is allowed.

### TFE-C5 Stale or private references in corpus comments (severity: low)
- Files: `invalid/model-only/essay-blank-text-field.yaml` (cites `dev/specs/to-do/lint-on-models.md`, which is not in git); `invalid/essay-malformed-uuid.yaml` (cites `mdq.models._base`, an implementation module); `invalid/model-only/true-false-marker-disagrees-with-correct.yaml` ("true-false.md:210"; the rule is now at line 232); `invalid/model-only/true-false-marker-disagrees-provisional.*` (the file name uses "provisional", but the spec term is WARNING).
- Spec: true-false.md "Body": "The letters are divided into 3 categories: TRUE, FALSE and WARNING."
- Fix: Cite spec section names instead of line numbers or private files. Rename the file to `true-false-marker-disagrees-warning`.

## Exhaustiveness gaps

### TFE-E1 The `en` row of the locale table is never exercised (severity: medium)
- Spec: true-false.md "Locale" table: `en` -> `T`/`F`.
- Missing: The pt row (`locale-mismatch`, `locale-pt`) and the es row (`locale-es`) are covered. No example has `locale: en`. Proposed `valid/true-false/locale-en.mdq.md`: `locale: en`, with `[T]`, `[F]` and `[V]` statements. Expect `locale-mismatched-true-false-marker` at `choices[2].marker` only. Also untested: whether lowercase `t` under `pt` gets the warning (proposed `locale-pt-lowercase.yaml`: `marker: t`, `locale: pt-BR`).

### TFE-E2 `grading/true-false.yaml` has no skip, malformed or feedback rows (severity: medium)
- Spec: responses.md "Skipping": "A response of `null` means the question was skipped. It scores 0 without the grading formula running, and therefore triggers no feedback." responses.md "True/false": "if an id is not present in the question, it MUST be rejected as a malformed response." true-false.md "Feedback": "shows feedback for every statement the student got wrong **and** for every statement they left unjudged ... A skipped question ... shows no feedback at all".
- Missing:
  - `marks: null` -> `score: 0`, as distinct from `marks: {}` -> 0.
  - `marks: { z: true }` (unknown id) -> `"malformed"`.
  - `marks: { a: "T" }` (not a boolean) -> `"malformed"`.
  - `marks: [a, c]` (not a mapping) -> `"malformed"`.
  - An expected feedback list per row, e.g. `{ marks: { a: true, b: true }, feedback: [b, c, d] }`. Feedback appears in document order and is empty for `null`.
  - `all-or-nothing` on three statements, `{a: true}` -> `"1/3"`.
  - A question with no `grading` field (inherit -> symmetric).
- The header must also define `"malformed"` the way `numeric.yaml` does.

### TFE-E3 No true-false example for `duplicate-choice-id` or `blank-choice-text` (severity: medium)
- Spec: true-false.md "Additional Rules": "choices[].id | critical | must be unique"; "choices[].text | critical | must not be empty". lint-codes lists both codes for true-false.
- Missing: `invalid/true-false-duplicate-choice-id.mdq.md` (`* [T] [a] ...` / `* [F] [a] ...` -> `duplicate-choice-id` at `choices[1].id`). `invalid/model-only/true-false-blank-choice-text.yaml` (`text: "  "` -> `blank-choice-text`).

### TFE-E4 Marker cases with no example (severity: low)
- Spec: lint-codes `true-false-marker-disagrees-with-correct`: "a FALSE-category marker with `correct: true`, or a TRUE- or WARNING-category marker with `correct: false`". `malformed-true-false-marker`: "it is empty, longer, or not a letter". true-false.md: "never `X` or `x`".
- Missing:
  - A TRUE-category marker with `correct: false` (`marker: V`, `correct: false`).
  - A CJK FALSE marker with `correct: true` (`marker: 错`).
  - `marker: ""` (`malformed-true-false-marker`, which also breaks the schema `minLength`).
  - `marker: x` (`reserved-true-false-marker`).
  - Uniform all-false statements (`uniform-true-false-answers`).
  - Markers in a document with no `marker` but with a `locale` (no warnings).

### TFE-E5 Combining-mark and non-NFC markers in Markdown source (severity: medium)
- Spec: true-false.md "Body": "A base letter followed by a combining mark is two code points and is not a valid marker."
- Missing: `true-false-combining-mark-marker` exists only as YAML. A `.mdq.md` with `* [É] ...` (E + U+0301) shows which error the parser gives: `foreign-choice-marker` or `malformed-true-false-marker`. TFE-S5 explains why the spec cannot answer this today. A `.mdq.md` with `[Å]` (U+212B) would cover `non-nfc-true-false-marker` from source.

### TFE-E6 True-false document fields with no example (severity: low)
- Spec: true-false.md "Frontmatter": `grading` is `"partial" | "all-or-nothing" | "symmetric" | "inherit"`, `shuffle` is `boolean | "inherit"`.
- Missing: Only `grading: symmetric` and `shuffle: false` appear. Add `grading: all-or-nothing` and `shuffle: true` to an existing example. Also add an epilogue paragraph after the choice list (`valid/true-false/epilogue.mdq.md`), which tests where the list ends. There is no choice-id-followed-by-link case either (`* [T] [Pantanal](url) é ...` -> text, no id).

### TFE-E7 `examples/grading/essay.yaml` is missing; the spec needs it (severity: medium)
- Spec: responses.md "Pending": "every response to an essay question". "Skipping": "A response of `null` ... scores 0". exam.md "Exam score": "A pending response leaves the exam score pending ... MAY report a provisional score".
- Missing: Nothing pins that every string is pending, including `""` and whitespace. Nothing pins `null` -> skipped (0, not pending), a non-string -> malformed, or that `answerKey` and `input: code` do not change this. Nothing pins the exam-level result. Sketch, following the `short-answer.yaml` convention (`"pending"` as a string; the brief's `score: null` convention is not used by any existing file):

      # examples: { response: string | null | any, score: 0 | "pending" | "malformed" }[]
      questions:
        - name: "Always pending"
          question: { type: essay, id: ciclo-agua, stem: Explique o ciclo da água. }
          examples:
            - { response: "Evaporação, condensação e precipitação.", score: "pending" }
            - { response: "", score: "pending" }
            - { response: "   ", score: "pending" }
            - { response: null, score: 0 }          # skipped, not pending
            - { response: 42, score: "malformed" }
            - { response: [a, b], score: "malformed" }
        - name: "Answer key and code input do not settle it"
          question: { type: essay, id: fib, stem: Escreva fib(n)., input: code,
                      highlight: python, answerKey: "def fib(n): ..." }
          examples:
            - { response: "def fib(n): ...", score: "pending" }

  Also needed, as an exam-level file (e.g. `grading/exam.yaml`): an exam with a true-false question (weight 1, score 0.5) and an essay (weight 2, pending). The exam score is pending, and the provisional score is `0.5`, computed over the settled weight only.

### TFE-E8 `answerKey` in the Markdown frontmatter, alone or together with the section (severity: medium)
- Spec: base.md "Frontmatter": "If there is a collision of a field that is specified both in the frontmatter and elsewhere, the frontmatter takes precedence." Compare short-answer, where the same collision for `accept` is the `conflicting-accept` load error.
- Missing: `valid/essay/answer-key-frontmatter.mdq.md` (`answerKey: ...` in the frontmatter and no section). `valid/essay/answer-key-precedence.mdq.md` (both; the frontmatter wins and no diagnostic is emitted). Without the second example, a reader can transfer the `conflicting-accept` behaviour.

### TFE-E9 Variant answer-key headings and other bracketed headings after `[essay]` (severity: medium)
- Spec: essay.md: "It starts with an `H2` heading with the text `## [answer-key]`". base.md: "Heading starting with optional `ws` + `[`" is forbidden.
- Missing: `# [answer-key]`, `### [answer-key]`, `## [Answer-Key]`, `## [answer-key] Gabarito`, `## [ answer-key ]` and `## [rubrica]` after `[essay]`. Each presumably gives `forbidden-block-element` at `epilogue`, but none is pinned. Proposed `invalid/essay-answer-key-h3.mdq.md`: `[essay]`, a blank line, `### [answer-key]`, `Evaporação.`

### TFE-E10 Forbidden-element cases the essay vehicles skip (severity: medium)
- Spec: base.md "Forbidden elements" (four bullets).
- Missing:
  - A non-first preamble paragraph that starts with a markdown link (`[Amazonia](url) é ...`). By the literal rule this is forbidden, unlike the Slug rule, which exempts links. Pin either outcome.
  - A paragraph indented by `ws` before `[`.
  - An H1 in the epilogue.
  - An all-`[` unordered list in a Markdown epilogue (only `model-only/essay-forbidden-list.yaml` exists, for the preamble).

### TFE-E11 `highlight` with the default input; unknown keys that belong to another type (severity: low)
- Spec: essay.md: "highlight | warning | must be omitted unless `input` is "code"", and `input` is "text" when omitted. lint-codes `unknown-frontmatter-key`: "not recognized for this document/question type".
- Missing: An essay with `highlight: python` and no `input` -> `ignored-highlight`. An essay `.mdq.md` with `shuffle: true` or `automation: manual` in the frontmatter, which shows whether these are dropped with `unknown-frontmatter-key` or give an error (see TFE-S2).

## Spec defects

### TFE-S1 The "`minLength: 1` on every text field" claim does not match the schema or the corpus (severity: high)
- Spec: base.md "Additional Rules": "every text field (`title`, `author`, `comment`, choice text, feedback and the like) MUST NOT be the empty string (`minLength: 1`)". Against this, `schema/question-base.yaml` gives `comment`, `preamble` and `epilogue` no `minLength`. `schema/true-false.yaml` gives `Choice.feedback` and `Choice.comment` no `minLength`. `schema/essay.yaml` gives `answerKey` none and says "A blank value is a warning ... not a schema error, like `title`", but `title` has `minLength: 1`.
- Problem: `valid/essay/blank-comment.yaml` pins `comment: ''` as valid with `blank-text-field`. Under base.md it is a schema error. `answerKey: ""` and `feedback: ""` are equally undetermined.
- Fix: Either add `minLength: 1` to these fields and move `blank-comment` to `invalid/` (a bare `#` comment string then gives no `comment`), or reword base.md to list exactly the fields that have `minLength`. Remove "like `title`" from `essay.yaml`.

### TFE-S2 `unknown-frontmatter-key` contradicts "translated as-is" (severity: medium)
- Spec: base.md "Markdown to AST mapping": "all fields in the frontmatter are translated as-is to fields in the AST, with two exceptions". lint-codes: "`unknown-frontmatter-key` ... A frontmatter key is not recognized ... and was dropped." lint-codes `schema-error`: "a missing or unknown field".
- Problem: The rule that drops a key appears only in the lint table. Under base.md, `difficulty: hard` reaches the AST and gives `schema-error` (as `invalid/extra-fields.yaml` does for YAML). The corpus (`valid/essay/unknown-frontmatter-key.*`) drops it. A third case is base.md "Automation": "It MUST NOT appear in the frontmatter". If unknown keys are dropped, `automation:` in a frontmatter is only a warning.
- Fix: List the drop rule as a third exception in base.md and state that it does not apply to YAML or JSON documents. Decide whether `automation` in a frontmatter is dropped or is an error.

### TFE-S3 The `id` false-friend rule assumes a mismatch notice that the table cannot produce (severity: medium)
- Spec: true-false.md "Locale": "implementations SHOULD warn about `S` under `id` with a dedicated warning, not only the usual mismatch notice". The same section says: "A `locale` whose language subtag is not in the table has no expectation, and no warning is issued." `id` is not in the table.
- Problem: "not only" implies two warnings. The table rule implies none. `valid/true-false/false-friend-*.lint.json` pins only `false-friend-true-false-marker`, and the comment says "beyond the usual locale-mismatch notice".
- Fix: Replace "not only the usual mismatch notice" with "`false-friend-true-false-marker`; `id` has no row in the table, so no `locale-mismatched-true-false-marker` is issued". Alternatively, add an `id` row (`B`/`S`?), but that conflicts with `S` = TRUE.

### TFE-S4 `locale-mismatched-true-false-marker` is undefined for letters outside the row (severity: medium)
- Spec: true-false.md: "if `locale: pt-BR`, it may expect `V` and `F` ... and could issue a warning if `T` is used instead". lint-codes: "A marker is unusual for the question's `locale`".
- Problem: These cases are unstated: `S` or `s` under `pt`/`es`/`en`; a WARNING letter (`W`) under `pt`, which may need `unlisted-` plus `locale-mismatched-` or only one of them; a CJK letter under `en`; lowercase `v` under `pt`.
- Fix: State "Under a language in the table, every marker other than the row's two letters (either case) gets `locale-mismatched-true-false-marker`, independently of `unlisted-true-false-marker`", or the chosen rule. Add an example (`W` under `pt-BR`).

### TFE-S5 Type inference has no outcome when no value is `*`, `%`, `x` or a letter (severity: medium)
- Spec: base.md "Type inference": rules 1-4, then "Once the type is known ... every value MUST belong to the `value` rule". It has no rule for `[✓]`, `[✗]`, `[essay]`, `[?]`, or `[É]` (two code points).
- Problem: For `* [✓] ... * [✗] ...` (`invalid/true-false-symbol-marker`) and `* [essay]` (`invalid/essay-tag-in-list`), no type is known, so "foreign" is undefined. Other readings are `parse-error`, or `forbidden-block-element` (the list is an unordered list whose items all start with `[`, with no body). The corpus picks `foreign-choice-marker`.
- Fix: Add rule 5: "otherwise the list is still a choice list of unknown type, and every value is a `foreign-choice-marker` error."

### TFE-S6 The true-false item grammar does not define feedback or comments (severity: medium)
- Spec: true-false.md "Body": `item : ws? "[" value "]" ws? (choice_id ws?)? markdown+`, where "`markdown` represent any markdown element nested inside the item". Compare multiple-choice.md: `... md_inline+ nl extra_lines? (feedback? comments? | comments feedback)`, and true-false.md "Choices": "Choices follow the same structure from Multiple choice".
- Problem: Under the true-false grammar, a `  > Fica no interior ...` line is a nested blockquote in the statement text. `valid/true-false/feedback`, `choice-ids` and `cjk-markers` pin it as `feedback`.
- Fix: Reuse the multiple-choice `item` rule, with the true-false `value`.

### TFE-S7 The true/false response shape excludes the `null` that the grading file uses (severity: high)
- Spec: responses.md table: "true-false | a mapping of statement id to boolean". "Errors": "a response the question cannot represent | `ResponseError`". Against this, `grading/true-false.yaml` header: "A statement with no marking is an abstention, written either as an absent key or as an explicit `null`", with rows `{ a: true, b: false, c: null, d: null }` -> 0.5.
- Problem: An implementation that follows responses.md rejects `c: null` as malformed. The corpus scores it.
- Fix: In responses.md "True/false", add: "A `null` value is an abstention, the same as an absent key."

### TFE-S8 Essay "every response is pending" against `null` = skipped (severity: low)
- Spec: responses.md "Pending": "every response to an essay question". "Skipping": "A response of `null` means the question was skipped. It scores 0". base.md: essay is `manual`, "every response is pending".
- Problem: Whether `null` on an essay counts as pending or skipped depends on whether `null` is "a response". exam.md ("A question with no response, or with the response `null`, is skipped") points to skipped.
- Fix: In "Pending", add: "`null` is never pending: it is a skip."

### TFE-S9 Stale wording in `schema/true-false.yaml` and lint-codes (severity: low)
- Spec: `schema/true-false.yaml` `marker.description`: "`answer` carries the meaning, but the letter itself is needed to warn about PROVISIONAL letters". The field is `correct` and the category is WARNING. lint-codes `reserved-true-false-marker`: "Marker `X` is reserved", but true-false.md says "never `X` or `x`".
- Fix: Change to "`correct` carries the meaning ... WARNING letters", and to "Marker `X` or `x`".

## Checked and fine
- Grading table of true-false.md, all 18 cells recomputed (key `[T,F,T,F]`): partial `1, 0, .5, .5, 0, 0`; all-or-nothing `1, 0, 0, .5, 0, 0` (proportional when every marked statement is correct); symmetric `1, -1, 0, .5, -.5, 0`. The doc and `grading/true-false.yaml` agree. The extra rows also check out: explicit-null symmetric 0.5/0, all-or-nothing 0.25/0, three statements partial `1/3`, `2/3`, symmetric 0/-1.
- Letter categories: TRUE `T V S t v s 对 真`, FALSE `F f 错 偽` (`global-markers`, `cjk-markers`); WARNING `W`, `N`, `𝐓` (U+1D413, `Lu`), `Å` (U+212B, `Lu`, not NFC). I checked the code points and categories with `unicodedata`.
- Lint codes: `unlisted-true-false-marker` (3 files), `non-nfc-true-false-marker`, `false-friend-true-false-marker` (`S`/`id` and `s`/`id-ID`), `locale-mismatched-true-false-marker` (pt-BR, es), no warning under a locale outside the table (`de`, `zh-Hans-CN`), `reserved-true-false-marker` (`X`), `malformed-true-false-marker` (`TRUE`, `E`+U+0301, `1`), `true-false-marker-disagrees-with-correct` (FALSE+true, WARNING+false), `uniform-true-false-answers`, `visually-identical-choices`, `duplicate-choice-text`, `blank-choice-feedback`/`-comment`, `missing-choice-id`. All severities match lint-codes.md.
- `marker` is optional in YAML (`no-markers.yaml`, ids present, no marker warnings). Markers are stored verbatim in their case (`lowercase-markers`). Whitespace inside the value brackets, tabs included, is allowed (`spaced-markers`). `[T] [slug]` choice ids work. `>`/`!` feedback and comments work in either order. `minItems: 2` and the required `correct` are covered. `[ ]` in a letter list is `foreign-choice-marker`.
- Essay: all three `input` values (`code`, `text`, `plain`), plus the default; `highlight` with code; `ignored-highlight` (text, plain); `code-input-without-highlight`; `unknown-highlight-language`; `missing-answer-key`; blank `answerKey` -> `blank-text-field` warning; answer key after the epilogue, without a blank line, and with several blocks; answer key before the body -> `forbidden-block-element`.
- Essay body: the indented tag and trailing ws are valid. `[ essay ]`, `[Essay]`, `[essay] text`, `> [essay]`, a NBSP before the tag and a missing body are all `parse-error`. `* [essay]` and a second `[essay]` are errors.
- Base rules through essay: H1 in the preamble and in the stem (YAML); `## [x]` heading; `[x]` paragraph in the preamble and the epilogue; all-`[` list (YAML); partly bracketed and ordered lists allowed; `[^1]` epilogue exception; slug and link precedence; `[Prova 1]` and `[ Q1 ]` as text; blank stem, preamble and epilogue errors; `malformed-locale` (empty, `pt_BR`); `malformed-uuid`; unknown `input` -> `schema-error`; `unknown-frontmatter-key` (Markdown) against `invalid/extra-fields.yaml` (YAML `schema-error`).
- Every valid `.yaml` in the area has only the keys `question-base.yaml` plus the type schema allow, and has `type` and `stem` (plus `choices`, each with `text` and `correct`).
