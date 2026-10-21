--- ISSUE 1 ---
# [Spec] Define the `[essay]` paragraph and the `## [answer-key]` section in the grammar

**Labels:** medium, low

## Problem

The essay grammar is one literal, and the answer key section has no grammar at all. What the tag paragraph is, how the answer key heading is spelled, where the section ends, what an empty or repeated section is, and which field it fills are known only from the corpus and mdq-py. Recommended: write `essay_block` and `answer_key` rules, state that the section runs to the end of the question and fills `answerKey`, document an empty section as an absent answer key (corpus behavior), a second section as `parse-error`, and that a footnote belongs to the field it is in. Decide whether a setext `[answer-key]` heading is valid (recommended: yes, as CommonMark reads it as H2) and whether type tag names can be slugs (recommended: yes, and a paragraph of only `[essay]` is always the tag).

## Evidence

- `docs/question-types/essay.md:30-36`: Essay grammar does not say it applies to a paragraph, so it accepts the content of a list item

  ```markdown
  The body consists of a single `[essay]` tag.
  ```
- `docs/question-types/essay.md:59-61`: The answer key section has no grammar, and its heading variants and extent are not specified

  ```markdown
  It starts with an `H2` heading with the text `## [answer-key]`
  ```
- `docs/question-types/essay.md:92-95`: An empty or repeated answer key section has no documented rule

  ```markdown
  | answerKey | error    | blank-text                   | if defined, must have at least one visible character       |
  ```
- `docs/question-types/essay.md:53-78`: The text never maps the answer key section to the `answerKey` field

  ```markdown
  ## Answer key
  ```
- `docs/question-types/question-base.md:194`: SLUG accepts `essay`, so `[essay]` at the start of the first paragraph is a slug

  ```lark
  SLUG: /[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*/
  ```
- `docs/question-types/essay.md:59-61`: Essay spec does not say how footnotes resolve across the stem, epilogue and answer key

  ```markdown
  The answer key section is placed below the `[essay]` tag and any existing
  ```

## Impact

- **Essay grammar does not say it applies to a paragraph, so it accepts the content of a list item:** The block context of the tag comes from implementation behavior and a footnote, not from the grammar.
- **The answer key section has no grammar, and its heading variants and extent are not specified:** Two implementations can split the same document into a different epilogue and answer key.
- **An empty or repeated answer key section has no documented rule:** The corpus enforces a rule the spec does not state, and an empty section, which is almost always an unfinished question, passes with only the `missing-answer-key` info at most.
- **The text never maps the answer key section to the `answerKey` field:** A reader of the Markdown spec cannot tell which field holds the answer key, or that it is a field of the body and therefore invalid in the frontmatter (`invalid-frontmatter-field`).
- **SLUG accepts `essay`, so `[essay]` at the start of the first paragraph is a slug:** Contrived inputs where the spec gives two readings of the same bracket.
- **Essay spec does not say how footnotes resolve across the stem, epilogue and answer key:** The student view renders a dangling footnote, or a host that renders the whole document shows text from the answer key.

## Suggested fix

- **Essay grammar does not say it applies to a paragraph, so it accepts the content of a list item:** State that the body is a paragraph whose only content is the rule, for example `essay_block : ws? "[essay]" ws? nl`, and that a list item or heading is not the tag. State that a later `[essay]` paragraph is a forbidden element of the epilogue, and list the parse errors in the Additional Rules table, as other types do.
- **The answer key section has no grammar, and its heading variants and extent are not specified:** Add a grammar rule, for example `answer_key : "##" ws "[" "answer-key" "]" ws? nl md_block+`. State that the heading is an ATX H2 alone on its line (decide on the setext form; CommonMark reads both as H2), and that the section holds every block after it, headings included except H1, up to the end of the question (end of file, or the next block in an exam).
- **An empty or repeated answer key section has no documented rule:** Add a rule for a second section (`parse-error`) to the table. For the empty section, two readings are defensible: (a) an empty section is an absent answer key, reported only as `missing-answer-key`, as the corpus decides (examples/valid/essay/empty-answer-key.mdq.md); (b) it is a defined but blank field, `blank-text`, as for `title:` with only spaces. Recommended: (a), since `## [answer-key]` with nothing after it is a common template placeholder, and state it in the text and the table.
- **The text never maps the answer key section to the `answerKey` field:** Add one sentence: the blocks of the section, without the heading, are the `answerKey` string, with the same normalization license as `stem` and `epilogue`. Add the YAML form of the example.
- **SLUG accepts `essay`, so `[essay]` at the start of the first paragraph is a slug:** State whether a type tag name such as `essay` can be a slug, and that a paragraph of only `[essay]` is always the essay tag.
- **Essay spec does not say how footnotes resolve across the stem, epilogue and answer key:** State that a footnote definition belongs to the field it is in, and lint a reference defined in another field.

## Acceptance criteria

- [ ] essay.md has grammar rules for the tag paragraph and the answer key section
- [ ] The text states the extent of the section and that it fills `answerKey`
- [ ] The Additional Rules table lists the second-section and tag-paragraph errors
- [ ] The corpus has examples for a section with headings inside and for the empty section
- [ ] scripts/spec_audit.py passes

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] Define the response format of a "text" essay

**Labels:** high

## Problem

`input: text` is a rich text editor, but neither essay.md nor responses.md says whether the response string is Markdown, HTML or plain text. Options: (a) CommonMark source for `text`, verbatim text for `plain` and `code`; (b) leave it to the host. Recommended: (a), since MDQ is Markdown and a host with an HTML editor can convert.

## Evidence

- `docs/question-types/essay.md:47-50, docs/responses.md:38`: The response format of a "text" essay is not defined

  ```markdown
  "text" indicates that the response should be a rich text input, potentially
  supporting markdown or other formatting.
  ```

## Impact

Two hosts that exchange responses (an LMS, a grader, an exporter) can store the same answer as Markdown in one and as HTML in the other. A renderer cannot tell which it received, and raw HTML in a response is also an injection risk when the host renders it as Markdown.

## Suggested fix

State in `docs/responses.md` and in Input that the response of every essay is a string, and that for `input: text` it is CommonMark source. A host whose editor produces HTML converts it before it stores the response. `plain` and `code` responses are verbatim text.

## Acceptance criteria

- [ ] responses.md and essay.md state the format of the response for each `input`
- [ ] A corpus response example exists for an essay

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Document essay grading, response and answer key visibility in essay.md

**Labels:** medium, low, info

## Problem

The essay Grading section is one sentence. The automation, the pending state, the [0, 1] score range, the exam `grading` exclusion and the response shape live in three other documents, and the text does not say when the answer key can be shown. Recommended: add Automation and Response sections as ordering has, and state that the answer key MUST NOT be shown before the student submits and MAY be shown after, even while pending. Also decide whether MDQ covers response length limits (recommended: no; state that they go in the stem or `meta`).

## Evidence

- `docs/question-types/essay.md:80-82`: The Grading section does not give the score range, automation or response

  ```markdown
  Essay questions are graded manually.
  ```
- `docs/question-types/essay.md:55-57`: When the answer key may be shown to students is not defined

  ```markdown
  key section is optional and serves as a guide for the instructor to grade the 
  responses and may be presented as feedback to the students.
  ```
- `docs/question-types/essay.md:15-22`: No fields for response size or attachments

  ```markdown
  | input     | string  | Either "code", "text" or "plain"[^2]      |
  ```

## Impact

- **The Grading section does not give the score range, automation or response:** A reader of the essay document cannot learn how an essay is scored or what its response looks like without reading three other documents.
- **When the answer key may be shown to students is not defined:** A host can show the model answer while the exam is open, and the rule that a pending response shows no feedback seems to forbid showing it at all until the instructor grades.
- **No fields for response size or attachments:** Authors write length limits in the stem (`essay-tag-with-text` shows the attempt), where no host can enforce them.

## Suggested fix

- **The Grading section does not give the score range, automation or response:** Expand Grading: the automation is `manual`, every response is pending until the instructor gives a score in [0, 1], the exam `grading` does not apply and `penalty` does. Add a Response section that links to `responses.md`.
- **When the answer key may be shown to students is not defined:** State that the answer key MUST NOT be shown to the student before they submit the response, and that it MAY be shown after, even while the response is pending.
- **No fields for response size or attachments:** Decide whether MDQ covers these. If yes, add optional `minWords`/`maxWords` fields; if no, state that limits belong in the stem or in `meta`.

## Acceptance criteria

- [ ] essay.md has Grading, Automation and Response sections with links to responses.md and exam.md
- [ ] The text states when the answer key may be shown

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Use one placement for `## [name]` sections relative to the epilogue

**Labels:** medium

## Problem

Essay puts its answer key after the epilogue; ordering puts its sections right after the body and the epilogue after them. The exam rules about `---` and setext headings name only the epilogue, although mdq-py applies them to the answer key. Options: (a) sections always after the epilogue, as question-base.md describes; (b) sections always right after the body. Recommended: (a), since it agrees with question-base.md and the essay corpus; ordering then follows in its own audit. Extend the exam rules to every block after the body.

## Evidence

- `docs/question-types/essay.md:59-60, docs/question-types/ordering.md:166-168`: Essay places its answer key section after the epilogue, ordering places its sections before it

  ```markdown
  The answer key section is placed below the `[essay]` tag and any existing
  epilogue block.
  ```
- `docs/exam.md:161-165`: Exam rules about `---` and setext headings do not cover the essay answer key

  ```markdown
  Inside an exam, the epilogue of a question MUST NOT use `---` as a thematic
  break.
  ```

## Impact

- **Essay places its answer key section after the epilogue, ordering places its sections before it:** Authors must learn two placements for the same `## [name]` construct, and a parser cannot share the section logic.
- **Exam rules about `---` and setext headings do not cover the essay answer key:** Implementations can accept a `---` in an answer key, and a later question then starts inside it.

## Suggested fix

- **Essay places its answer key section after the epilogue, ordering places its sections before it:** Choose one placement for `## [name]` sections relative to the epilogue and use it in question-base.md, essay.md and ordering.md.
- **Exam rules about `---` and setext headings do not cover the essay answer key:** Extend the exam rules to every block after the body, the answer key included.

## Acceptance criteria

- [ ] question-base.md, essay.md and ordering.md state the same placement
- [ ] exam.md applies the `---` and setext rules to the answer key
- [ ] A corpus exam example has an essay with an answer key

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Use one field name for the code/text choice of essay and ordering

**Labels:** medium

## Problem

Essay `input` and ordering `content` select the same `code`/`text` mode, with the same `highlight` rules. Options: (a) keep both and document why (essay describes the editor, ordering describes the lines); (b) rename one. Recommended: (a), since the meanings differ (`plain` exists only for an editor) and a rename breaks documents; add one sentence to each document.

## Evidence

- `docs/question-types/essay.md:21, docs/question-types/ordering.md:98`: Essay `input` and ordering `content` hold the same code/text choice under different names

  ```markdown
  | input     | string  | Either "code", "text" or "plain"[^2]      |
  ```

## Impact

Authors who write both types must remember two names for one concept.

## Suggested fix

Use one field name for the code/text choice in both types, or document why they differ.

## Acceptance criteria

- [ ] essay.md and ordering.md explain the relation between `input` and `content`, or one field is renamed with a changelog entry

--- END ISSUE 5 ---

--- ISSUE 6 ---
# Mechanical fixes

**Labels:** mechanical, medium, low

## Problem

Each fix below follows from its finding and needs no design decision, so they can be applied together in one pass and reviewed by reading the diff. Severity still applies: a mechanical fix can matter a lot.

### F1 (medium): Essay grammar rejects an indented [essay] tag and trailing spaces

`docs/question-types/essay.md:35`

```lark
essay : "[essay]"
```

**Suggested fix:** Write the rule as `essay : ws? "[essay]" ws?`, as the numeric and short-answer rules do.

### F11 (low): A warning rule is written as "must"

`docs/question-types/essay.md:24, docs/question-types/essay.md:91-94, docs/question-types/ordering.md:339`

```markdown
| highlight | warning  | ignored-highlight            | must be omitted unless `input` is "code"                   |
```

**Suggested fix:** Write "should be omitted unless ..." in both tables, and in footnote 1 add that the property SHOULD be omitted.

### F20 (low): Essay spec says both that essays may require and that they always use manual grading

`docs/question-types/essay.md:55, docs/question-types/essay.md:82`

```markdown
Essay questions are usually open-ended, and may require manual grading.
```

**Suggested fix:** Replace "may require manual grading" with a statement that every essay response is graded by the instructor.

### F28 (low): schema/essay.yaml gives `highlight` a validation role the spec does not have

`schema/essay.yaml:32-33`

```yaml
Programming language used for syntax highlighting and, where
          supported, validation.
```

**Suggested fix:** Remove the validation clause from the schema, or describe the behavior in essay.md.

### F29 (low): schema/essay.yaml rejects an empty `highlight`, the spec does not say so

`schema/essay.yaml:35`

```yaml
minLength: 1
```

**Suggested fix:** Add the constraint to the essay frontmatter table or footnote [^1].

## Acceptance criteria

- [ ] F1: Essay grammar rejects an indented [essay] tag and trailing spaces
- [ ] F11: A warning rule is written as "must"
- [ ] F20: Essay spec says both that essays may require and that they always use manual grading
- [ ] F28: schema/essay.yaml gives `highlight` a validation role the spec does not have
- [ ] F29: schema/essay.yaml rejects an empty `highlight`, the spec does not say so

--- END ISSUE 6 ---
