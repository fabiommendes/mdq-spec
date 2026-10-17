---
type: issue
status: active
tags: [mdq, audit, spec, exam]
relatedTo: [dev/audit2/brief.md]
---
# Findings: exam

## Summary
Checked 41 valid exams (`examples/valid/exam/*.lint.json`), 7 `.resolved.yaml`, 6 bank questions, 31 `invalid/exam-*`, 8 `invalid/model-only/exam-*`, 3 `invalid/syntax/*`. Recomputed all 11 canonical durations, 6 canonical starts and the 7 resolutions from the bank tags: all match. Inheritance of `locale`/`author` is carried on every inline question. Every `.yaml` passes the exam schema checks I did by hand (keys, `start`/`duration` patterns, `questions` present).
Main problems: (1) the `---` in an epilogue rule is `critical` and `warning` at the same time, has no code, and the corpus pins `parse-error` for it; (2) the canonical `start` form (`Z`, seconds) and the YAML-side forms of `start`/`duration` are not stated, so some examples pin behavior that only exists in the examples; (3) no rule says whether a `---` block is an include block or an inline question, and no grammar exists for the H1; (4) `include-all.resolved.yaml` pins an order the spec calls implementation-defined; (5) there is no exam-level grading example, and nothing tests query precedence, the "`max` after removal" rule, or when `duplicate-question-id` runs relative to `include-all`.

## Conformance findings

### EXAM-C1 Resolved file pins an implementation-defined order (severity: medium)
- Files: `examples/valid/exam/include-all.resolved.yaml`
- Spec: `docs/exam.md` "Include all": "The source of the questions (the question bank), the order of the matched questions, and which questions `max` keeps are implementation-defined."
- Problem: block 1 (`biome AND NOT draft EXCEPT pantanal-02`, `max: 2`) adds two questions. The file pins `amazonia-01, pantanal-01`. A conforming resolver can return `pantanal-01, amazonia-01`. The other `.resolved.yaml` files add at most one question per block, so this is the only file affected.
- Fix: say in the corpus convention that the ids from one `include-all` compare as a set (or as a multiset per block), or have the block match one question only.

### EXAM-C2 `---` in an epilogue pinned as `parse-error`, a code the rule does not give (severity: medium)
- Files: `examples/invalid/exam-thematic-break-in-epilogue.{mdq.md,lint.json}`
- Spec: `docs/exam.md` "Question and include blocks": "Inside an exam, the epilogue of a question MUST NOT use `---` as a thematic break." / "two such lines in a row are read as a frontmatter or include block whatever lies between them: when that content is not valid YAML, the exam fails with `yaml-syntax-error`". "Additional Rules": "| epilogue | critical | must not use `---` as a thematic break inside an exam |" (no code).
- Problem: the only error code the prose gives is `yaml-syntax-error`. The example has no closing `---` (the next line is `===`), so it fails as an unclosed frontmatter. `parse-error` is plausible, but no sentence says so. A reader who applies the critical rule directly reports a rule-specific code. See also EXAM-S1.
- Fix: in exam.md, say that an unclosed block is `parse-error`. Also give the critical rule a code, or delete it (EXAM-S1).

### EXAM-C3 Canonical `start` behavior pinned with no rule (severity: medium)
- Files: `examples/valid/exam/start-utc.yaml` (`Z` -> `'2026-03-10T09:00:00+00:00'`), `start-without-seconds.yaml` (`09:00` -> `09:00:00`), `scheduled.yaml` (space -> `T`)
- Spec: `docs/exam.md` "Duration and Start Time": "both fields are normalized to a canonical ISO 8601 form. `start` keeps its UTC offset, if any (`2026-03-10T09:00:00-03:00`), and a `start` with a date only stays a date (`2026-03-10`)."
- Problem: the prose does not define the canonical form. A reader can keep `Z` ("keeps its UTC offset") and keep `09:00` (ISO 8601 allows reduced precision). Two such readers produce a different `.yaml` than the corpus pins.
- Fix: state the canonical form in exam.md: `YYYY-MM-DDTHH:MM:SS[.f]±HH:MM`, `Z` written as `+00:00`, seconds always present, and what happens to fractional seconds.

### EXAM-C4 `setext-heading` reported once for two setext headings (severity: low)
- Files: `examples/valid/exam/setext-heading.{mdq.md,lint.json}`
- Spec: `docs/exam.md`: "Implementations SHOULD warn about a setext heading in the instructions or in a question of an exam (`setext-heading`)."
- Problem: the instructions hold two setext headings: "Read every question carefully." over `---`, and "id: q1" over the second `---`. The lint file lists one diagnostic at `["instructions"]`. The spec does not say if there is one diagnostic per heading or one per field.
- Fix: state "one per field" in lint-codes.md, or add the second entry.

### EXAM-C5 `unknown-include-field` path is arbitrary when both forms are present (severity: low)
- Files: `examples/invalid/exam-include-and-include-all.lint.json` (`["questions",0,"include"]`)
- Spec: `docs/lint-codes.md` `unknown-include-field`: "declares a field other than `include`, or `include-all`/`max`".
- Problem: if the block is read as an `include-all`, the unknown field is `include`. If it is read as an `include`, the unknown field is `include-all`. The spec does not choose a reading.
- Fix: define the path for this case (for example, the path of the block, `["questions",0]`), or add a rule that the first key wins.

### EXAM-C6 `max` alone pinned as `parse-error` (severity: medium)
- Files: `examples/invalid/exam-max-alone.{mdq.md,lint.json}`
- Spec: `docs/exam.md` "Question and include blocks": "An include block holds exactly one of the two forms below. No other field is allowed."
- Problem: no sentence says what makes a `---` block an include block. Each of these readings gives a different code: (a) a block with no `include`/`include-all` key is a question frontmatter with no body: `parse-error` (the pinned code); (b) a block with only include fields is an `IncludeAll` without its required key: `schema-error`; (c) `max` without `include-all`: `unknown-include-field`. See EXAM-S4.
- Fix: add the classification rule to exam.md, then confirm the code.

### EXAM-C7 Missing H1 pinned as `schema-error` at `[]` (severity: low)
- Files: `examples/invalid/exam-type-without-h1.lint.json`
- Spec: `docs/exam.md` "The title": "The exam title is a required H1 heading". Footnote 1: "an exam is recognized by its H1 title".
- Problem: no code is given for a missing H1. The pinned result only follows if the document is read as a question whose `type: exam` fails the question schemas. `wrong-kind` or `parse-error` are also defensible.
- Fix: state the reading in exam.md ("without an H1 the document is a question; `type: exam` is then a `schema-error`").

### EXAM-C8 Example comments cite implementation internals or sections that do not exist (severity: low)
- Files: `invalid/model-only/exam-zero-duration.yaml` ("exam.md, \"Scheduling\"": no such section); `valid/exam/setext-heading.yaml` ("exam.md, \"Questions\"": no such section); `valid/exam/thematic-break-in-question.yaml` (`_split_exam_blocks`); `valid/exam/midterm.yaml` (`with_ids()`); `invalid/exam-unknown-include-field.yaml` (`mdq.models.Include`); `invalid/model-only/exam-duplicate-question-id.yaml` (`dev/specs/to-do/unique-ids.md`); `valid/exam/scheduled.yaml` ("The YAML timestamp keeps its UTC offset", but base.md "Frontmatter" says "a timestamp such as `2026-03-10` ... [is a] plain string").
- Problem: the corpus is shared by two implementations and should cite only the spec.
- Fix: rewrite these comments to cite only `docs/` sections.

### EXAM-C9 `exam-two-h1` does not test two H1 headings (severity: low)
- Files: `examples/invalid/exam-two-h1.mdq.md`
- Spec: base.md "Forbidden elements": "H1 headings."
- Problem: the second H1 is inside question 0, between its first paragraph and the body (pinned at `stem`). The case of two exam titles in a row is covered by `exam-h1-in-instructions`. The file name is misleading.
- Fix: rename the file to `exam-h1-in-question.mdq.md`.

## Exhaustiveness gaps

### EXAM-E1 No exam-level grading example (severity: medium)
- Spec: `docs/exam.md` "Exam score", "Penalty". `docs/responses.md` "Responses to an exam", "Skipping", "Pending", "Errors".
- Missing: `examples/grading/` has no `exam.yaml`. None of the following is tested: the weighted mean, weight 0, the three penalties with negative question scores, skipped `null` and absent keys, a pending question, the provisional score, an unknown key, or an unresolved include. Sketch for `examples/grading/exam.yaml`, with question scores given directly so that the file tests only the exam step:
  ```yaml
  exams:
    - name: weighted mean with skips and weight 0
      questions: {a: {weight: 2}, b: {}, c: {}, d: {}, e: {weight: 0}}
      response: {a: 1, b: -0.5, c: null, e: 1}     # c skipped (null), d skipped (absent)
      expect:
        none:   {score: 0.4}      # (2*1 + 0 + 0 + 0 + 0*1) / 5
        capped: {score: 0.3}      # (2 - 0.5) / 5
        full:   {score: 0.3}
        skipped: [c, d]
    - name: negative total
      questions: {a: {}, b: {}}
      response: {a: -1, b: 0.5}
      expect: {none: {score: 0.25}, capped: {score: 0}, full: {score: -0.25}}
    - name: total weight 0
      questions: {a: {weight: 0}, b: {weight: 0}}
      response: {a: 1, b: -1}
      expect: {none: {score: 0}, capped: {score: 0}, full: {score: 0}}
    - name: empty exam
      questions: {}
      response: {}
      expect: {none: {score: 0}}
    - name: pending question
      questions: {a: {}, b: {type: essay}, c: {weight: 2}}
      response: {a: 1, b: "texto", c: 0.5}
      expect: {none: {score: null, pending: [b], provisional: "2/3"}}   # (1 + 2*0.5) / 3
    - name: pending with a skipped question
      questions: {a: {}, b: {type: essay}}
      response: {a: null, b: "texto"}
      expect: {none: {score: null, pending: [b], provisional: 0}}
    - name: exam strategy applied to an inherit question
      exam: {grading: partial}
      questions: {ms: {type: multiple-selection, choices: [T, F, F, F]}}   # exam.md, "Penalty" example
      response: {ms: {c1: true}}           # markings [T, F, _, _]
      expect: {none: {score: 0.75}}        # 0.5 under symmetric
    - name: unknown key
      questions: {a: {}}
      response: {a: 1, zz: 1}
      expect: error ResponseError
    - name: unresolved include
      questions: [{include: cerrado-01}]
      response: {}
      expect: error UnresolvedInclude
  ```
  Add an unresolved `include-all` case too, after EXAM-S7 decides its error.

### EXAM-E2 Operator precedence has no example where it changes the result (severity: medium)
- Spec: `docs/exam.md` "Include all": "`NOT` binds tighter than `AND`, and `AND` binds tighter than `OR`."
- Missing: every query in `query-language.mdq.md` uses parentheses or a form where precedence does not change the result. Add `include-all: wetland OR forest AND draft`. Against the bank it matches `pantanal-01, pantanal-02, mata-atlantica-01`. Left-to-right evaluation matches `mata-atlantica-01` only. Add also `NOT draft AND forest` (`amazonia-01`; `NOT (draft AND forest)` would add all the other bank questions).

### EXAM-E3 Case-sensitive tags (severity: low)
- Spec: "The comparison is exact and case-sensitive."
- Missing: `include-all: Biome` adds nothing (`empty-include-all`) against a bank tagged `biome`.

### EXAM-E4 "`max` applies after these questions are removed" has no test that tells the readings apart (severity: medium)
- Spec: `docs/exam.md` "Include all".
- Missing: in `include-all.mdq.md` the query has 3 matches, 1 is removed and `max: 2` keeps the 2 that remain. Applying `max` before the removal can give the same result. Proposed `max-after-removal.mdq.md`: `include: amazonia-01`, `include: pantanal-01`, then `include-all: biome AND NOT draft EXCEPT pantanal-02` with `max: 1`. The block must add exactly `cerrado-01`.

### EXAM-E5 `include` after an `include-all` that matches the same question (severity: medium)
- Spec: "An `include-all` never adds a question that the exam already contains by other means: the target of an `include` ..."
- Missing: every example puts the `include` before the `include-all`. Add `include-all: forest AND NOT draft` followed by `include: amazonia-01`. Expected result: `[amazonia-01]` and `empty-include-all`, not `duplicate-question-id`.

### EXAM-E6 `duplicate-question-id` with `include-all` and derived ids (severity: medium)
- Spec: "The rule applies after includes resolve, and accounts for the derived id a question with no declared `id` would get".
- Missing: (a) `[include-all: biome AND savanna, {stem only}, {id: q2}]`. Unresolved, nothing can be decided. Resolved, the inline question without an id is `q2` and collides. Is `load` silent and `resolve` the step that reports it? (b) `include: q2` at position 1 followed by an inline question without an id at position 2. (c) A declared id equal to the derived id of an earlier question (`[{stem}, {id: q1}]`). See EXAM-S16.

### EXAM-E7 Title variants (severity: medium)
- Spec: `docs/exam.md` "The title". `schema/exam.yaml` does not list `title` in `required`.
- Missing: `# [slug]` with no text (`title-slug-only.mdq.md`); a frontmatter `title` with an H1 that has only the slug; an empty `#` H1; a YAML exam with no `title` (`missing-title` at `["title"]` is not tested on any exam); an H1 bracket that is not a SLUG (`# [prova/1] Prova`).

### EXAM-E8 Separator rules (severity: medium)
- Spec: "An inline question that does not contain a frontmatter block MUST be preceded by a separator." / "a line with three equal signs preceded by a blank line".
- Missing: (a) two choice questions with no `===` between them. The second stem and its list fall into the first epilogue, so `forbidden-block-element` is expected (`exam-missing-separator.mdq.md`). (b) `===` right after a paragraph, which is a setext H1: `setext-heading` plus `forbidden-block-element`? (c) `---` right after the H1 with no blank line. (d) `separator-before-include` on an `include-all` block (only `include` is tested).

### EXAM-E9 `---` positions not covered (severity: medium)
- Spec: "Elsewhere in an exam, a `---` line after a blank line is a thematic break ... But two such lines in a row are read as a frontmatter or include block".
- Missing: `---` in the epilogue of the last question (EOF, never closed); `---` + `Nota: leia.` + `---` in an epilogue, which silently opens a new block (what is pinned?); `---` + plain text + `---` in the instructions (the content is a YAML scalar, not a mapping: which code?); `unsafe-thematic-break` at `instructions` and at `epilogue` with `- - -`; `setext-heading` at `questions[i].epilogue`.

### EXAM-E10 Duration grammar and canonical form (severity: low)
- Spec: the `duration` Lark grammar and "carries each component into the largest unit".
- Missing, valid: `1h30m` (no `ws`), `1d 30m`, `P1W2D` (`date_part : INT "W" (INT "D")?` -> `P9D`), `PT90S` -> `PT1M30S`, `PT3600S` -> `PT1H`, `48h` -> `P2D`, `25h` -> `P1DT1H`, `P0DT1H` -> `PT1H`. Invalid: `30s` (no seconds in the shorthand), `2H`, `pt2h`, `P`, `PT`, `100:00`, `-PT1H`, `duration: 90` (a YAML integer: `schema-error` or `invalid-duration`?).

### EXAM-E11 `start` forms (severity: low)
- Missing: fractional seconds (`09:00:00.5`), `-0300` (no colon: the schema rejects it, ISO 8601 basic format accepts it), lowercase `t`/`z` (RFC 3339 accepts both), a space separator with no offset, and a YAML-written exam with `start: "2026-03-10 09:00:00"` (see EXAM-S2).

### EXAM-E12 Frontmatter fields and values not exercised (severity: low)
- Spec: `docs/exam.md` "Frontmatter" table.
- Missing: `meta`; `tags` as a comma-delimited string; `type: exam` in a Markdown frontmatter with an H1; a clean, well-formed `uuid`; blank `author`; `locale-lookalike-language`; `shuffle: inherit` and `shuffle: "yes"` (both `schema-error`); a `grading` mapping with all four keys; `include: 42` (only `include-all: 7` is tested); `include: ""`; an unknown field next to `include-all`; `include-all: "   "` (passes `minLength`, nonstandard?); unbalanced parentheses; `EXCEPT` followed by a non-SLUG; an unknown exam frontmatter key (EXAM-S12); a frontmatter comment string on an exam (EXAM-S10).

### EXAM-E13 Inheritance edge cases (severity: low)
- Spec: "A question that declares either field keeps its own value."
- Missing: a question that declares `locale` only and inherits `author`, and the reverse. Inheritance of included questions after resolution (EXAM-S9).

## Spec defects

### EXAM-S1 `---` in an epilogue is both `critical` and `warning`, with no code (severity: high)
- Spec: `docs/exam.md` "Additional Rules": "| epilogue | critical | must not use `---` as a thematic break inside an exam |" and "| instructions, questions[].{preamble,stem,epilogue} | warning | should not write a thematic break with `-` ... |". base.md: "| preamble, epilogue, stem | warning | a thematic break should be `***` or `___`, not `---` |".
- Problem: the same table gives `epilogue` both levels. The critical row has no lint code. In practice it cannot be detected: after a body, `---` is read as a block opener, so the result is a new block, `yaml-syntax-error`, or `parse-error`, never "a thematic break in the epilogue". The corpus pins `parse-error` (EXAM-C2).
- Fix: delete the critical row and say instead what the `---` becomes ("after a body, `---` opens the next block; an unclosed block is `parse-error`"). Limit the warning row to `-` breaks that are not `---` (`- - -`) in the epilogue.

### EXAM-S2 YAML-side `start`/`duration` forms contradict the prose (severity: medium)
- Spec: exam.md: "the date and the time MAY be separated by a space instead of `T`" and "It also accepts strings like `HH:MM` ... and strings like `Xd Yh Zm`". `schema/exam.yaml` `start.pattern` requires `T`, and the `duration` description says: "The surface shorthands `HH:MM` and `Xd Yh Zm` allowed in the Markdown document are normalized to this form." lint-codes `invalid-duration`: "one of the accepted forms ...: an ISO 8601 duration ..., `HH:MM` or `Xd Yh Zm`".
- Problem: the prose limits neither form to Markdown. For an exam written in YAML, `duration: 90m` is `schema-error` by the schema, but accepted (and normalized?) by the prose and by `invalid-duration`. The same holds for a `start` with a space.
- Fix: say in exam.md that the shorthands and the space are Markdown-only, and that a YAML/JSON exam must use the canonical form. Then name the code (`invalid-duration`/`malformed-start`, which take precedence over `schema-error`).

### EXAM-S3 Canonical `start` is underspecified (severity: medium)
- Spec: see EXAM-C3. Footnote 7 says "A valid ISO 8601 date or date-time", but the body allows the RFC 3339 space, which ISO 8601 does not have.
- Fix: define the canonical form (see EXAM-C3). Say "ISO 8601 / RFC 3339 profile".

### EXAM-S4 No rule classifies a `---` block (severity: medium)
- Spec: "An include block: a YAML block between `---` lines that selects questions stored outside the exam." The frontmatter of an inline question is also a YAML block between `---` lines.
- Problem: no sentence says "a block whose mapping has `include` or `include-all` is an include block". `max` alone, `include` with an empty value, and a mapping followed by body text are not defined (EXAM-C6).
- Fix: add the rule and the code for each failure.

### EXAM-S5 No grammar for the exam H1 (severity: medium)
- Spec: "The usual format is `# [slug] Title`". "The exam title is a required H1 heading". `schema/exam.yaml`: `title` is not required.
- Problem: not defined: `# [slug]` alone (no title, or `minLength` violation?); a bracket that is not a SLUG; a bracket followed by `(`/`[` (base.md "Slug" has this rule for questions only); an empty `#`; the code for a missing H1 (EXAM-C7).
- Fix: add a Lark rule `title : "#" ws (("[" SLUG "]") (ws TEXT)? | TEXT)` and state each case.

### EXAM-S6 Broken anchor "Questions" (severity: low)
- Spec: exam.md "Additional Rules" ("see [Questions](#questions)", twice), base.md footnote 9 (`exam.md#questions`), lint-codes `unsafe-thematic-break` ("exam.md, \"Questions\""). exam.md has no "Questions" section.
- Fix: point these links to "Question and include blocks".

### EXAM-S7 Unresolved `include` and `include-all` use different names and styles (severity: medium)
- Spec: responses.md "Errors": "| an exam still holds an unresolved `include` | `UnresolvedInclude` |". lint-codes "Load errors": "`unresolved-include-all`: ids were requested for an exam that still holds an `include-all` block".
- Problem: grading an exam that has an unresolved `include-all` is not listed in responses.md. The grading errors are exception class names (`MissingIdError`, `NotAutoGradable`), not kebab-case codes like every other diagnostic. It is not clear whether `UnresolvedInclude` and `unresolved-include-all` are the same condition.
- Fix: list both block kinds in responses.md "Errors", and give the grading errors kebab-case codes.

### EXAM-S8 `exam-without-questions` before or after resolution (severity: low)
- Spec: "| questions | warning | should contain at least one question |". exam.md "Empty exams".
- Problem: `query-unicode-space.resolved.yaml` resolves to `questions: []` and reports only `empty-include-all`. The parsed exam is not empty, but the resolved one is. The spec does not say which one the rule checks.
- Fix: state it (likely: the parsed document only).

### EXAM-S9 Inheritance of included questions is not defined (severity: medium)
- Spec: "A question inside an exam inherits two fields ... The parsed document carries the inherited value on each question".
- Problem: it is not said whether a question added by `include`/`include-all` takes the exam `locale`/`author` after resolution. The same question for `grading`/`shuffle` `inherit` matters for grading. `.resolved.yaml` holds only ids, so nothing pins it.
- Fix: state it. If included questions inherit, add `locale` to one resolved example.

### EXAM-S10 Comment string in the exam frontmatter (severity: medium)
- Spec: exam.md: "They MAY start with a YAML frontmatter, similar to the one used in question files". base.md: "The first paragraph of comments MUST be read and stored as a **comment string**." `schema/exam.yaml`: no `comment` property, `additionalProperties: false`.
- Problem: an exam frontmatter that starts with `# ...` has no field to store the comment, and the schema rejects a `comment` field.
- Fix: add `comment` to the exam schema, or say that the exam frontmatter has no comment string.

### EXAM-S11 `instructions` is in the schema but not in the frontmatter table (severity: low)
- Spec: the exam.md "Frontmatter" table has no `instructions`. `schema/exam.yaml` has `instructions`. base.md: "If there is a collision ... the frontmatter takes precedence."
- Problem: it is not defined whether `instructions:` in the frontmatter is allowed, or whether it replaces the body text.
- Fix: state it in exam.md.

### EXAM-S12 Unknown exam key: warning or schema error (severity: low)
- Spec: lint-codes `unknown-frontmatter-key` (warning, "any", which "includes exams"): "is not recognized ... and was dropped". `schema/exam.yaml`: `additionalProperties: false`.
- Problem: a Markdown exam with `semestre: 2026.1` gets a warning (the key is dropped). The same key in a YAML exam is a `schema-error`. This difference is not stated, and neither case has an example.
- Fix: state that the drop is Markdown-only, and add one example of each.

### EXAM-S13 The format of an `include` value is never defined (severity: low)
- Spec: "A `SLUG` has the same format as the value of `include`." `schema/exam.yaml` `include`: `type: string, minLength: 1`.
- Problem: the sentence explains `SLUG` by pointing to `include`, but no sentence says that `include` must be a SLUG. It is not said whether `include: "Cerrado 01"` is valid, `unsafe-id`, or an error.
- Fix: say "`include` holds a question id; a non-SLUG value gets `unsafe-id`" (or "is invalid").

### EXAM-S14 The forbidden elements of the instructions do not match the lint table (severity: low)
- Spec: exam.md "Body": instructions forbid "H1 headings" and "A fenced block between `---` (like a YAML frontmatter)". lint-codes `forbidden-block-element`: "any (`preamble`, `stem`, `epilogue`)".
- Problem: `exam-h1-in-instructions.lint.json` reports `forbidden-block-element` at `instructions`, a field the code does not list. The second exception cannot happen: a `---` block after the instructions is the first question block. It also has no code.
- Fix: add `instructions` to the code. Delete the second exception, or point it to "Question and include blocks".

### EXAM-S15 "MUST be preceded by a blank line" has no error (severity: low)
- Spec: "The `---` line that opens a frontmatter or include block MUST also be preceded by a blank line". The consequence is only the `setext-heading` warning.
- Problem: a MUST that results only in a warning. The number of `setext-heading` diagnostics (one per heading or one per field) is also not stated (EXAM-C4).
- Fix: change the MUST to a description ("is read as a block only if preceded by a blank line"), and state the diagnostic count.

### EXAM-S16 When `duplicate-question-id` is checked if an `include-all` is unresolved (severity: medium)
- Spec: "The rule applies after includes resolve". lint-codes `duplicate-question-id` is in "Errors" ("prevent a question/exam object from being loaded"). `empty-include-all`: "Reported by `Exam.resolve`, not by `load`".
- Problem: derived ids after an `include-all` are unknown at `load`. The spec does not say whether `load` checks only the declared ids and the derived ids before the first `include-all`, or whether `resolve` reports the error (EXAM-E6).
- Fix: state the timing. Also replace the API names (`Exam.resolve`, `load`) in lint-codes.md with neutral terms ("at resolution", "at load").

### EXAM-S17 `empty-include-all` for a nonstandard query (severity: low)
- Spec: lint-codes `empty-include-all`: "nothing matches its query, or every match is already in the exam". `nonstandard-include-query`: "`Exam.resolve` adds no questions for it."
- Problem: `nonstandard-include-query.resolved.yaml` and `query-unicode-space.resolved.yaml` also report `empty-include-all`, but a query that cannot be read is neither case of that definition.
- Fix: add "or the query cannot be read" to the definition.

## Checked and fine
- Frontmatter: `id`/`title` precedence over the H1 (`id-title-in-both`); `course`, `description` not inherited (`scheduled`, `midterm`); `tags` not inherited (`inheritance`); `uuid` malformed (error) and unknown version (warning); `locale` malformed (model-only); duplicate keys in the exam frontmatter and in a block (`yaml-syntax-error`); `id`/`include-all` numbers are `schema-error`.
- `grading`: string and mapping; `inherit` rejected; unknown mapping key rejected (`schema-error` at the mapping and at the key); question-level override (`inherited-grading`). `shuffle: true` inherited and overridden.
- `penalty`: `none` (explicit), `capped`, `full`; unknown value is a `schema-error`.
- Durations recomputed: `24h`->`P1D`, `90m`/`1:30`/`PT90M`->`PT1H30M`, `1d 2h 30m`/`P1DT2H30M`->`P1DT2H30M`, `2h`->`PT2H`, `PT1H30M15.5S` kept, `P1W`->`P7D`, `2h 30m`->`PT2H30M`, `P2W`->`P14D`. Invalid: `1:60`, `""`, `P1M`, `P1Y`, `1y`, `0:00`, `0m`, `PT0S` (model-only), `duas horas`. The schema `duration` pattern accepts the same ISO strings as the Lark `iso_duration`.
- Starts recomputed: date-only stays a date; local time kept; `-03:00` kept; space -> `T`. Invalid: `2026-02-30` (md and model-only), `T25:00:00`, `10/03/2026` -> `malformed-start`.
- Resolutions recomputed against the bank tags (`amazonia-01` biome/forest, `cerrado-01` biome/savanna, `mata-atlantica-01` biome/forest/draft, `pantanal-01`/`pantanal-02` biome/wetland): `include-all`, `include-all-overlaps-inline`, `midterm` (`q3`), `nonstandard-include-query` (`q1`), `query-language` (`NOT NOT`, `EXCEPT` with two slugs, `ANDROID`/`NOTE` as tags), `query-unicode-space` (U+00A0 is nonstandard), `separator-before-include` (`q2`).
- Lowercase `and` is nonstandard; the overlap of an `include-all` with an inline declared id is not an error.
- `undeclared-id-after-include-all` (`include-all`, `nonstandard-include-query`); `separator-before-include`; `setext-heading` + `exam-without-questions`; `unsafe-thematic-break` in a preamble; `***` in an epilogue is safe.
- `duplicate-question-id`: two inline questions (md and YAML), two `include`s, an inline id equal to an `include`, a declared id equal to a derived id.
- `unknown-include-field`: an unknown key, `include`+`max`, `include`+`include-all`. `max`: 0, 2.5, "2" are `schema-error`.
- Empty exams: `title-only`, `no-questions`, `blank-title`, `uuid-unknown-version` -> `exam-without-questions` (warning); `questions: []` is present in every YAML.
- Inheritance: every inline question in `all-question-types`, `inheritance`, `midterm`, `scheduled` carries the inherited `locale`/`author`; a question that declares its own keeps it.
- `forbidden-block-element` for an H1 in the instructions and in a question; `blank-text-field` on the exam `title`; `unsafe-id` on the exam `id`; `missing-id` on the exam (`title-without-slug`).
- `invalid/syntax/*`: `broken.json` and `duplicate-key.json` -> `json-syntax-error`; a top-level list -> `invalid-document`.
