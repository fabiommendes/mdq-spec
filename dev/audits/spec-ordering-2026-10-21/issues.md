--- ISSUE 1 ---
# [Spec] Ordering: consistency rules between the answer key, distractors and alternatives

**Labels:** high, medium, low

## Problem

Define, after full normalization, how `[ordering]`, `## [extra]`, `## [accept]` and `## [reject]` may relate. Recommended: error when a reject equals the key (extend `accept-reject-overlap`); error when an accept uses a line only available as a distractor; warning when an alternative uses a line or more copies than the presented pool has; warning when a distractor equals a key line after normalization; state `accept-repeats-answer-key` in prose.

## Evidence

- `docs/question-types/ordering.md:209-210`: A `## [reject]` section may repeat the answer key, which is then both correct and incorrect

  ```markdown
  field implies -- and MUST NOT declare an accepted and a rejected section whose
  content blocks hold the same lines after that same normalization.
  ```
- `docs/question-types/ordering.md:194-198`: Ordering: an accept section may use a distractor that MUST NOT appear in a correct response

  ```markdown
  Its lines are distractors: they are shuffled in among the answer key's lines
  and MUST NOT appear in a correct response.
  ```
- `docs/question-types/ordering.md:203-210`: Alternatives may use lines the student cannot produce, with no diagnostic

  ```markdown
  The accept/reject blocks start with a `## [accept]` or `## [reject]` header,
  followed by optional observations and the content block. As before, the content
  block must be of the same type as the main `[ordering]` block, but repeated
  ```
- `docs/question-types/ordering.md:225-229`: Ordering: a distractor that equals a key line after normalization silently becomes a spare copy

  ```markdown
  lines, and a distractor may differ from a line of the answer key by its
    level alone.
  ```
- `docs/question-types/ordering.md:346`: `accept-repeats-answer-key` is not described in the prose, and its normalization is not stated

  ```markdown
  | accept                | warning  | accept-repeats-answer-key    | should not repeat the `[ordering]` block's own lines              |
  ```

## Impact

- **A `## [reject]` section may repeat the answer key, which is then both correct and incorrect:** Grading line 297-300 says a response matching the `[ordering]` block scores 1 and a response matching any `## [reject]` scores 0: for this document both apply and the spec does not say which wins. Implementations can disagree.
- **Ordering: an accept section may use a distractor that MUST NOT appear in a correct response:** The MUST NOT is not enforceable and contradicts the grading rule for accepted sections. Authors cannot tell if a distractor may be part of an alternative correct answer.
- **Alternatives may use lines the student cannot produce, with no diagnostic:** A typo in an alternative silently disables its feedback or its credit; the author gets no warning.
- **Ordering: a distractor that equals a key line after normalization silently becomes a spare copy:** An author who intended a distractor gets a question where it is not one.
- **`accept-repeats-answer-key` is not described in the prose, and its normalization is not stated:** A reader of the prose cannot find the rule, and the table row reads as a raw comparison.

## Suggested fix

- **A `## [reject]` section may repeat the answer key, which is then both correct and incorrect:** Extend the MUST NOT to the `[ordering]` block: a `## [reject]` section must not hold the answer key's lines after full normalization (error, `accept-reject-overlap` or a new code). Add an invalid corpus example.
- **Ordering: an accept section may use a distractor that MUST NOT appear in a correct response:** Decide one: (a) an accept section must not use a line that is only available as a distractor (new error code in the table), or (b) reword line 195 so that a distractor is not part of the answer key, but an accept section may use it.
- **Alternatives may use lines the student cannot produce, with no diagnostic:** Add a rule (warning, e.g. `unreachable-alternative`): every line of an alternative, after normalization, must be available in the presented pool with enough copies. Add valid/invalid corpus examples.
- **Ordering: a distractor that equals a key line after normalization silently becomes a spare copy:** Say that distractors are compared after normalization, and add a warning when a distractor is equal to a key line after normalization.
- **`accept-repeats-answer-key` is not described in the prose, and its normalization is not stated:** Add the SHOULD NOT to the Accepted/rejected answers prose and the [^9] footnote to the table row.

## Acceptance criteria

- [ ] ordering.md states each relation and the table has a row per rule
- [ ] Each rule has a valid or invalid corpus example
- [ ] mdq-py reports each case

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] Ordering: define malformed responses, matching and feedback precedence

**Labels:** medium, low

## Problem

State which ordering responses are `ResponseError` (line not in the pool, too many copies, changed level under `fixed`) and whether a response may leave lines out. Define matching as equality of the normalized sequences and say which section's feedback wins when several match (recommended: first in document order, answer key first).

## Evidence

- `docs/responses.md:267-276`: Which responses are malformed versus wrong is not defined for ordering

  ```markdown
  carry none, so they are compared by content, and a line the question repeats is
  matched as many times as it appears. A response may hold a distractor from the
  question's `extra` lines -- that is a wrong answer, not a malformed response.
  ```
- `docs/question-types/ordering.md:274-276`: Feedback is unspecified when a response matches more than one section

  ```markdown
  A response that matches an accepted or a rejected answer shows that section's
  feedback, if it declares one. The `[ordering]` block itself carries no
  ```
- `docs/question-types/ordering.md:292-293`: Ordering: "compared in the order they appear" for repeated lines adds nothing and is unclear

  ```markdown
  Repeated lines are compared in the order they appear, so a question with
  duplicates accepts exactly as many copies as it declares.
  ```

## Impact

- **Which responses are malformed versus wrong is not defined for ordering:** Other response types reject unknown ids as malformed (responses.md:23-27); for ordering, a response the UI could never produce may be silently graded or sent to manual grading, depending on the implementation.
- **Feedback is unspecified when a response matches more than one section:** Different hosts show different feedback for the same response.
- **Ordering: "compared in the order they appear" for repeated lines adds nothing and is unclear:** Readers may look for a matching algorithm that does not exist.

## Suggested fix

- **Which responses are malformed versus wrong is not defined for ordering:** Add a rule: a response is a sub-multiset of the presented lines (key plus extra), under `fixed` each level equals the authored level, otherwise `ResponseError`. State that omitting lines is allowed (Parsons-style) or not. Add the cases to the Errors table.
- **Feedback is unspecified when a response matches more than one section:** Say that the first matching answer in document order wins (answer key first, then sections), or that all matching feedback is shown.
- **Ordering: "compared in the order they appear" for repeated lines adds nothing and is unclear:** State that a response matches an answer key when the two sequences are equal after normalization, and drop the order sentence.

## Acceptance criteria

- [ ] responses.md lists the malformed ordering cases
- [ ] ordering.md defines matching without the 'order they appear' sentence
- [ ] Feedback precedence is stated

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Ordering grammar: tag line, blank lines and section headings

**Labels:** medium, low

## Problem

Align the ordering grammar with CommonMark and with essay: `ws?` around `[ordering]`, optional blank line after the tag, ATX heading variants, setext H2 as in essay (written once in question-base.md), and a decision for empty sections (absent, as essay, or parse-error). Either encode the same-block-type and single-extra rules in the grammar or say they are checked after parsing.

## Evidence

- `docs/question-types/ordering.md:141`: Ordering tag rule has no ws? around [ordering], unlike other tags and the CommonMark paragraph

  ```lark
  ordering : "[" "ordering" "]" nl content epilogue? section*
  ```
- `docs/question-types/ordering.md:141`: Ordering grammar rejects a blank line between [ordering] and its content block

  ```lark
  ordering : "[" "ordering" "]" nl content epilogue? section*
  ```
- `docs/question-types/ordering.md:146-148, docs/question-types/essay.md:99-100`: Ordering section headings reject CommonMark ATX variants and whitespace-only blank lines

  ```lark
  ordering_extra  : "##" ws "[" "extra" "]" nl+ content
  ordering_accept : "##" ws "[" "accept" "]" nl+ (observations blank_line*)? content
  ordering_reject : "##" ws "[" "reject" "]" nl+ (observations blank_line*)? content
  ```
- `docs/question-types/ordering.md:142-144`: Ordering grammar accepts mixed content types and two [extra] sections

  ```lark
  content  : md_code_block | md_ul
  
  section : ordering_extra | ordering_accept | ordering_reject
  ```
- `docs/question-types/ordering.md:146`: An empty `## [extra]` section is a parse-error with no rule, unlike essay's empty section

  ```lark
  ordering_extra  : "##" ws "[" "extra" "]" nl+ content
  ```

## Impact

- **Ordering tag rule has no ws? around [ordering], unlike other tags and the CommonMark paragraph:** Readers cannot tell whether indentation or trailing spaces on the tag line are an error. The grammar and the reference implementation disagree.
- **Ordering grammar rejects a blank line between [ordering] and its content block:** Same snippet, two different rules for the same layout. An implementer who follows the grammar rejects documents that mdq-py accepts.
- **Ordering section headings reject CommonMark ATX variants and whitespace-only blank lines:** The grammar is stricter than both CommonMark and the reference implementation, and inconsistent with the essay section heading.
- **Ordering grammar accepts mixed content types and two [extra] sections:** Two parse-error rules exist only in the table. Low impact because the table is explicit.
- **An empty `## [extra]` section is a parse-error with no rule, unlike essay's empty section:** The behaviour of empty type sections differs between the two types that have them, and the error is not documented.

## Suggested fix

- **Ordering tag rule has no ws? around [ordering], unlike other tags and the CommonMark paragraph:** Write `ws? "[" "ordering" "]" ws? nl`, as the essay tag does.
- **Ordering grammar rejects a blank line between [ordering] and its content block:** Decide whether a blank line may separate the tag from its block. If yes, use `blank_line*` after the tag line; if no, state it in prose and add an invalid example.
- **Ordering section headings reject CommonMark ATX variants and whitespace-only blank lines:** Write the heading as in essay, for example `ws? "##" ws "[" "extra" "]" ws? nl blank_line*`, and state whether a closing sequence is accepted. Apply the essay decision on setext to every type section (a setext H2 `[extra]` + `---` is the same section, with the `setext-heading` lint), and write it once in question-base.md, since docs/exam.md already applies the setext rule to ordering sections.
- **Ordering grammar accepts mixed content types and two [extra] sections:** Either split the rule by content type (`code_body | ul_body`, each with its own section rules) and limit `ordering_extra` to one occurrence, or add a sentence after the snippet that these two rules are checked after parsing.
- **An empty `## [extra]` section is a parse-error with no rule, unlike essay's empty section:** Decide whether an empty `## [extra]`/`## [accept]`/`## [reject]` is absent (as essay) or a `parse-error`; add the rule to the table and an example.

## Acceptance criteria

- [ ] The grammar accepts every layout mdq-py and CommonMark accept for the chosen rules
- [ ] Empty sections have a table row and an example
- [ ] Lark tests pass for the new snippet

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Ordering: line text and indentation of list items and whitespace

**Labels:** medium, low

## Problem

Define how a `ul` item gets its level (nested lists: depth or marker column, or parse-error), whether trailing whitespace is part of the text, the level of whitespace-only lines, tab expansion, and the indentation shown to the student under `lenient` and `strict` (recommended: level 0 under `strict`).

## Evidence

- `docs/question-types/ordering.md:159-162, docs/question-types/ordering.md:239-244`: Nested `ul` items: how a text line gets an indentation level is not specified

  ```markdown
  An item is exactly one line: an item with a continuation line or a second
  paragraph is an error (`parse-error`), whatever the rendered markdown shows.
  ```
- `docs/question-types/ordering.md:239-250, docs/question-types/ordering.md:261`: Trailing and whitespace-only lines: what the line text keeps is not specified

  ```markdown
  considers all lines in the `[ordering]`, `## [extra]`, `## [accept]` and
  `## [reject]` blocks, normalizes a tabulation as 4 spaces, and takes the
  greatest common divisor of the leading whitespace of every non-blank line that
  ```
- `docs/question-types/ordering.md:230-234`: Initial indentation shown to the student under `lenient` and `strict` is not specified

  ```markdown
  * `"lenient"`: the student may change indentation freely, but it is ignored
    when grading. This implies the `dedent` normalization, whether or not
    `normalizations` lists it.
  * `"strict"`: the student may change indentation, and it is compared like the
    rest of the line.
  ```

## Impact

- **Nested `ul` items: how a text line gets an indentation level is not specified:** Text questions with indentation (outlines, nested steps) have no defined parse; a second implementation may reject nested lists or flatten them.
- **Trailing and whitespace-only lines: what the line text keeps is not specified:** An alternative copied with invisible trailing spaces silently never matches; implementations can split on these edge cases.
- **Initial indentation shown to the student under `lenient` and `strict` is not specified:** Hosts present the same `strict` question with different difficulty.

## Suggested fix

- **Nested `ul` items: how a text line gets an indentation level is not specified:** Decide: either nested list items are separate lines whose level comes from nesting depth (or marker column), or any nested list is a `parse-error`. State it in Body and Indentation and add valid/invalid corpus examples.
- **Trailing and whitespace-only lines: what the line text keeps is not specified:** State that trailing whitespace is stripped (or kept) and that blank lines are level 0 with empty text; say whether tabs expand to a fixed 4 columns or to the next tab stop.
- **Initial indentation shown to the student under `lenient` and `strict` is not specified:** State that under `lenient` and `strict` the lines are presented at level 0 (recommended for `strict`, since indentation is part of the answer), or at the authored level, and add it to the Indentation section.

## Acceptance criteria

- [ ] Body and Indentation sections cover nested lists, whitespace and tabs
- [ ] Initial presentation under each indentation mode is stated
- [ ] Corpus has a nested-list example

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Ordering: meaning and default of `content` and `highlight`

**Labels:** medium

## Problem

Decide what a declared `content` that disagrees with the body does (recommended: error, since the block already decides it), whether the fence language is inferred as `highlight` under `content: text`, and the default of `content` in the YAML/JSON form (align with the schema `default: text` or drop it).

## Evidence

- `docs/question-types/ordering.md:134-136, docs/question-types/ordering.md:106-108`: A declared `content` that disagrees with the body block has no defined meaning

  ```markdown
  markdown `ul` element holding the lines to be ordered. The `content` and
  `highlight` frontmatter fields are inferred from this block when they are not
  declared, and a declared value wins.
  ```
- `docs/question-types/ordering.md:155-157`: Ordering: a fence language inferred as `highlight` triggers `ignored-highlight` under a declared `content: text`

  ```markdown
  If the block following the `[ordering]` tag is a fenced code block, the
  question infers `content: "code"`, and the fence's language, if any, becomes
  `highlight`.
  ```
- `schema/ordering.yaml:51-60`: schema/ordering.yaml: `content` default "text" is not in the spec

  ```yaml
          default: text
  ```

## Impact

- **A declared `content` that disagrees with the body block has no defined meaning:** Two hosts render the same document differently; an author cannot predict what `content: text` over a code block does.
- **Ordering: a fence language inferred as `highlight` triggers `ignored-highlight` under a declared `content: text`:** Authors get a warning about a field they did not write, which they can only silence by removing the fence language.
- **schema/ordering.yaml: `content` default "text" is not in the spec:** A YAML document with code lines and no `content` is read as text by one implementation and possibly rejected or inferred differently by another.

## Suggested fix

- **A declared `content` that disagrees with the body block has no defined meaning:** Either make a mismatch an error (`content` must agree with the block type; the field is then only useful in the JSON/YAML form), or define `content` as presentation only (`text` = render each line as inline Markdown, `code` = verbatim monospace) independent of the block. Add a corpus example for the chosen rule.
- **Ordering: a fence language inferred as `highlight` triggers `ignored-highlight` under a declared `content: text`:** State that `highlight` is inferred from the fence only when `content` is "code" (declared or inferred), or that `ignored-highlight` applies only to a declared `highlight`.
- **schema/ordering.yaml: `content` default "text" is not in the spec:** State in ordering.md that `content` defaults to "text" in the YAML/JSON form (and that the Markdown form infers it), or drop the schema default.

## Acceptance criteria

- [ ] ordering.md states the rule and the default
- [ ] Schema description and default agree with it
- [ ] Corpus example for the mismatch case

--- END ISSUE 5 ---

--- ISSUE 6 ---
# [Spec] Ordering: rules table prose and corpus coverage

**Labels:** low

## Problem

Add a prose sentence for each table-only rule (`reject-without-feedback`, `blank-ordering-line`, `unknown-highlight-language`, `redundant-strict-indentation`) and add exam examples with ordering sections and epilogue, plus examples for the cases decided in the other issues.

## Evidence

- `docs/question-types/ordering.md:347-350`: Ordering: several table rules have no prose in the document

  ```markdown
  | reject                | info     | reject-without-feedback      | declares no feedback, which is its whole purpose                  |
  ```
- `examples/valid/exam/with-ordering.mdq.md:10-16`: Ordering corpus: no example of sections inside an exam, nested lists or content overrides

  ```markdown
  [ordering]
  ```

## Impact

- **Ordering: several table rules have no prose in the document:** Readers of the prose miss these rules.
- **Ordering corpus: no example of sections inside an exam, nested lists or content overrides:** The edge cases above are untested in both implementations.

## Suggested fix

- **Ordering: several table rules have no prose in the document:** Add one sentence per rule in the matching section (Accepted/rejected answers, Normalizations, Indentation, Frontmatter).
- **Ordering corpus: no example of sections inside an exam, nested lists or content overrides:** Add exam and question examples for these cases once their rules are decided.

## Acceptance criteria

- [ ] Every table row has a matching sentence in the prose
- [ ] An exam example has an ordering question with sections

--- END ISSUE 6 ---

--- ISSUE 7 ---
# Mechanical fixes

**Labels:** mechanical, high, low

## Problem

Each fix below follows from its finding and needs no design decision, so they can be applied together in one pass and reviewed by reading the diff. Severity still applies: a mechanical fix can matter a lot.

### F1 (high): Ordering grammar rejects blank lines between sections, including the spec's own full example

`docs/question-types/ordering.md:141`

```lark
ordering : "[" "ordering" "]" nl content epilogue? section*
```

**Suggested fix:** Allow blank lines before each section, for example `ordering : "[" "ordering" "]" nl content epilogue? (blank_line* section)*`. With this change the full example parses, and prose after a section is still rejected.

### F17 (low): Reject sections are called answer keys

`docs/question-types/ordering.md:263-265, docs/question-types/ordering.md:302`

```markdown
Normalizations apply to BOTH sides of the comparison: the student's response
and every answer key (the `[ordering]` block and every `## [accept]` and
`## [reject]` section alike). They never alter what is presented to the
```

**Suggested fix:** Use 'answer key' only for `[ordering]` and `## [accept]`, and a separate term (e.g. 'declared answers' or 'sections') when rejects are included.

### F29 (low): responses.md: ordering is not the only response without ids

`docs/responses.md:267`

```markdown
Ordering is the one question type whose response names nothing by id: its lines
```

**Suggested fix:** Reword: 'Ordering lines carry no id, so they are compared by content'.

### F30 (low): Ordering Additional Rules: no row for an unknown `unmatched` value

`docs/question-types/ordering.md:341-343`

```markdown
| indentation           | error    | schema-error                 | must be a known indentation mode (schema)                         |
```

**Suggested fix:** Add `| unmatched | error | schema-error | must be a known unmatched mode (schema) |`.

### F33 (low): schema/ordering.yaml: `highlight` minLength 1 is not in the spec

`schema/ordering.yaml:62-68`

```yaml
        minLength: 1
```

**Suggested fix:** Add `| highlight | error | schema-error | must not be empty (schema) |` to the table.

## Acceptance criteria

- [ ] F1: Ordering grammar rejects blank lines between sections, including the spec's own full example
- [ ] F17: Reject sections are called answer keys
- [ ] F29: responses.md: ordering is not the only response without ids
- [ ] F30: Ordering Additional Rules: no row for an unknown `unmatched` value
- [ ] F33: schema/ordering.yaml: `highlight` minLength 1 is not in the spec

--- END ISSUE 7 ---
