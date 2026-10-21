--- ISSUE 1 ---
# [Spec] Define the fill-in stem and where a blank may appear

**Labels:** high, medium, low

## Problem

The spec does not say which paragraphs form the stem, and allows two behaviors for a `[^slug]` in the wrong place. Options: (a) the stem is the last paragraph before the definitions; a `[^slug]` in an earlier paragraph is an error with a clear message. (b) The stem is every block from the first paragraph with a blank up to the definitions; blanks may appear in several paragraphs. Recommended: (b), since cloze texts often span paragraphs. In both cases, give one outcome per context: code (fenced, indented, code span) is literal text; a heading, list item, table cell, blockquote, emphasis or link text of the stem gives `misplaced-blank`; the inline parse of the whole paragraph comes first; `[^x](url)` and `[^x][ref]` are links.

## Evidence

- `docs/question-types/fill-in.md:155-160`: Prose allows two behaviors for a misplaced blank; the rules table and the corpus require specific codes

  ```markdown
  illegal. A `[^slug]` found in any of them is not a blank: implementations MUST
  either reject the document or leave the text exactly as written, and MUST NOT
  silently drop it.
  ```
- `docs/question-types/fill-in.md:137-148`: The spec does not say which paragraphs form the stem, so blanks in two paragraphs fail

  ```markdown
  stem  : inline_md? (blank inline_md?)+
  blank : "[^" SLUG "]"
  ```
- `docs/question-types/fill-in.md:155-157`: No example exercises blanks in list items, table cells, blockquotes or a preamble paragraph

  ```markdown
  At the block level, the hosting block MUST be an ordinary paragraph. Blanks in
  ```
- `docs/question-types/fill-in.md:142`: `blank` matches the text of a link `[^x](url)`

  ```lark
  blank : "[^" SLUG "]"
  ```
- `docs/question-types/fill-in.md:168-172`: Split reading of `**start [^blank] end**` is legal under the stem rule

  ```markdown
  interpreted as an unclosed bold element `**start `, followed by a blank and then
  the text ` end**`. In both approaches, the result would be illegal according to
  the spec, so both parsing strategies are valid.
  ```

## Impact

- **Prose allows two behaviors for a misplaced blank; the rules table and the corpus require specific codes:** Two conforming implementations can give different lint codes, or one accepts a document the other rejects. The corpus fixes behavior that the spec does not state.
- **The spec does not say which paragraphs form the stem, so blanks in two paragraphs fail:** Authors write cloze texts that span paragraphs. The result is an error that names the wrong cause, and another implementation can accept the same document.
- **No example exercises blanks in list items, table cells, blockquotes or a preamble paragraph:** These MUST rules are not checked by the shared tests.
- **`blank` matches the text of a link `[^x](url)`:** The grammar and the markdown parser disagree on whether the stem has a blank, so an implementation that follows the grammar reports `undefined-blank` for a valid link.
- **Split reading of `**start [^blank] end**` is legal under the stem rule:** The text allows a parsing strategy that gives a different result from the corpus.

## Suggested fix

- **Prose allows two behaviors for a misplaced blank; the rules table and the corpus require specific codes:** Give one outcome per context in a table: for example, fenced code, indented code and code spans are literal text; a `[^slug]` in a heading, list item, table cell or blockquote of the stem, or inside emphasis or link text, is `misplaced-blank`. Remove 'either ... or'.
- **The spec does not say which paragraphs form the stem, so blanks in two paragraphs fail:** State the rule: either the stem is the last paragraph before the definitions (and a `[^slug]` in an earlier paragraph gives a specific error), or the stem is every block from the first paragraph with a blank to the definitions. Add an example to the corpus.
- **No example exercises blanks in list items, table cells, blockquotes or a preamble paragraph:** Add valid or invalid examples for each block kind once the behavior is settled.
- **`blank` matches the text of a link `[^x](url)`:** Add the lookahead of `CHOICE_ID` to the rule (`"]"` not followed by `(` or `[`), and say in the text that `[^x](url)` and `[^x][ref]` are links.
- **Split reading of `**start [^blank] end**` is legal under the stem rule:** Require the markdown inline parse of the whole paragraph first, and state that a blank inside any inline element is `misplaced-blank`. Remove the claim that both strategies agree.

## Acceptance criteria

- [ ] The spec states which blocks form the stem
- [ ] Each context of a `[^slug]` has one outcome and one code
- [ ] The corpus has a case for a list item, a table cell, a blockquote and a multi-paragraph stem

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] State the parse rules of the blank definitions

**Labels:** medium

## Problem

State that the definitions form one sequence of blocks, that a stem references each id at most once (or that repeated references share one input), and give a `parse-error` rule for each malformed definition: blank line before the choice list, text on a choice tag line (with a hint to use `/short-answer`), unknown kind suffix, unit on a non-numeric tag, a second definition of an id, and a list item right after short answer content.

## Evidence

- `docs/question-types/fill-in.md:208-210`: The spec does not say whether blank definitions must be contiguous

  ```markdown
  Definitions may appear in any order, and that order need not match the order
  the stem references them.
  ```
- `docs/question-types/fill-in.md:185-187`: A blank referenced more than once in the stem has no rule

  ```markdown
  Every blank referenced by the stem MUST be defined, and every definition MUST
  be referenced by the stem.
  ```
- `docs/question-types/fill-in.md:481-482, docs/question-types/fill-in.md:206, docs/question-types/fill-in.md:226, docs/question-types/fill-in.md:302-304`: Several Markdown parse errors of blank definitions are only in the corpus

  ```markdown
  | blanks[]             | error    | parse-error        | a short answer blank defines each block at most once[^5]           |
  ```

## Impact

- **The spec does not say whether blank definitions must be contiguous:** An author who puts an explanation between definitions gets an error that points at the stem, not at the definition.
- **A blank referenced more than once in the stem has no rule:** An implementation can render two inputs bound to one key, render one, or reject the document.
- **Several Markdown parse errors of blank definitions are only in the corpus:** An implementation that reads only the spec can accept these documents or report other codes.

## Suggested fix

- **The spec does not say whether blank definitions must be contiguous:** State that the definitions form one sequence of blocks, separated only by blank lines, and that the first other block starts the epilogue. Consider a dedicated lint for a definition tag in the epilogue.
- **A blank referenced more than once in the stem has no rule:** State that each blank id appears at most once in the stem, with an error code (for example `duplicate-blank-reference`), or state that repeated references share one input.
- **Several Markdown parse errors of blank definitions are only in the corpus:** State each rule in the text with MUST and add a `parse-error` row per case: blank line before the choice list, text on a choice tag line, unknown kind suffix, unit on a non-numeric tag, a second definition of an id (any kind), and a list item right after short answer content.

## Acceptance criteria

- [ ] Each corpus case of a malformed definition has a row in the Additional Rules table
- [ ] The spec says whether a paragraph may separate two definitions
- [ ] The spec has a rule for a repeated `[^id]` in the stem

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Map the fill-in strategy to the choice blank strategy

**Labels:** high, medium

## Problem

A choice blank is graded 'under the strategy the fill-in question declares', but multiple choice has no `no-mistakes` or `all-or-nothing`. Recommended: use the exam table (`partial`, `no-mistakes`, `all-or-nothing` give multiple choice `partial`; `symmetric` gives `symmetric`), and say that the example column holds the `symmetric` blank scores.

## Evidence

- `docs/question-types/fill-in.md:407-410`: Under no-mistakes and all-or-nothing, the multiple choice strategy for a choice blank is not stated

  ```markdown
  * A **choice blank** is graded like a
    [multiple choice](multiple-choice.md#grading) question, under the strategy
    the fill-in question declares.
  ```
- `docs/question-types/fill-in.md:438-439`: The example table claims one set of blank scores for every strategy, but the wrong pick scores differ by strategy

  ```markdown
  The "blank scores" column lists what each blank scored on its own, in that
  order, and every strategy is computed from those three numbers.
  ```

## Impact

- **Under no-mistakes and all-or-nothing, the multiple choice strategy for a choice blank is not stated:** An implementation can raise an error, or score the blank with `symmetric`, for a fill-in under `no-mistakes`.
- **The example table claims one set of blank scores for every strategy, but the wrong pick scores differ by strategy:** Readers can conclude that a choice blank scores -0.5 under `partial` and that the clamp in `partial` is what removes it.

## Suggested fix

- **Under no-mistakes and all-or-nothing, the multiple choice strategy for a choice blank is not stated:** Add a mapping: a choice blank is scored with multiple choice `partial` under `partial`, `no-mistakes` and `all-or-nothing`, and with `symmetric` under `symmetric`, as in the exam table at `docs/exam.md:346-351`.
- **The example table claims one set of blank scores for every strategy, but the wrong pick scores differ by strategy:** Say that the column holds the `symmetric` blank scores and that the wrong pick scores 0 under the other strategies, or show both values.

## Acceptance criteria

- [ ] fill-in.md maps each strategy to a multiple choice strategy
- [ ] The example table says which strategy the blank scores column uses

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Define the empty blank and the pending fill-in response

**Labels:** high, medium

## Problem

State in docs/responses.md that a missing key and `null` are an empty blank, that `{}` is a response with every blank empty (not a skip), and that a value of the wrong type is malformed by the rule of the blank type. State that the instructor scores each pending blank in [0, 1] and the strategy combines the scores. Add examples/grading/fill-in.yaml.

## Evidence

- `docs/question-types/fill-in.md:403`: An empty blank in the response is not defined

  ```markdown
  A blank the student left empty scores 0 under every strategy.
  ```
- `docs/question-types/fill-in.md:357-360`: For a pending fill-in, the spec does not say what score the instructor supplies

  ```markdown
  A response to
  the question is settled only when the response to every blank is settled; if
  a blank leaves its response to the instructor, the whole question is pending.
  ```
- `docs/question-types/fill-in.md:389`: No grading corpus for fill-in

  ```markdown
  ## Grading
  ```

## Impact

- **An empty blank in the response is not defined:** The strategies `no-mistakes` and `all-or-nothing` treat an empty blank differently from a wrong one, so the score depends on a rule the spec does not give.
- **For a pending fill-in, the spec does not say what score the instructor supplies:** An LMS cannot tell which value to ask the instructor for, and `no-mistakes` gives different results for a blank score of 0.5.
- **No grading corpus for fill-in:** mdq-py and mdq-js can diverge on fill-in scores and feedback without any shared test failing.

## Suggested fix

- **An empty blank in the response is not defined:** In `docs/responses.md`, Fill in the blanks: a missing key and a `null` value are an empty blank; `{}` is a response with every blank empty (the question is not skipped); a value of the wrong type is a malformed response by the rule of the blank's type. Add response cases to the grading corpus.
- **For a pending fill-in, the spec does not say what score the instructor supplies:** State that the instructor scores each pending blank, in [0, 1], and that the strategy then combines the blank scores as usual.
- **No grading corpus for fill-in:** Add examples/grading/fill-in.yaml covering the table rows, empty blanks, pending blanks and feedback order.

## Acceptance criteria

- [ ] docs/responses.md defines an empty blank
- [ ] The pending rule says what the instructor scores
- [ ] examples/grading/fill-in.yaml covers the example table, empty blanks, pending blanks and feedback order

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Settle the accept block of a short answer blank

**Labels:** medium

## Problem

A short answer question MUST have an accept block, but a blank can have only a reject block. Options: (a) require `[^id/short-answer]` for every short answer blank; (b) allow a reject-only blank and say so. Recommended: (a), the same rule as the question. Also reword line 314-315: without accept patterns, `unmatched` defaults to `manual`, so the instructor grades what no reject pattern settles.

## Evidence

- `docs/question-types/fill-in.md:306-308`: A short answer blank with only a reject block is not addressed, unlike a short answer question that MUST have an accept block

  ```markdown
  A short answer blank has the two blocks of a short answer question:
  ```
- `docs/question-types/fill-in.md:314-315`: A blank with an empty accept block does not always leave its responses to the instructor

  ```markdown
  `[^slug/short-answer]` block has no pattern has no `accept` list, and the
  instructor grades its responses, see [Automation](#automation).
  ```

## Impact

- **A short answer blank with only a reject block is not addressed, unlike a short answer question that MUST have an accept block:** One implementation may require the accept block by inheritance, another may not.
- **A blank with an empty accept block does not always leave its responses to the instructor:** Readers may think reject patterns or `unmatched` have no effect on an empty accept block.

## Suggested fix

- **A short answer blank with only a reject block is not addressed, unlike a short answer question that MUST have an accept block:** State whether the accept block is required for a blank, and add an example either way.
- **A blank with an empty accept block does not always leave its responses to the instructor:** Say that the blank has no accept list and that `unmatched` defaults to `manual`, so the instructor grades the responses that no reject pattern settles.

## Acceptance criteria

- [ ] fill-in.md says whether a reject-only blank is valid, with a corpus example
- [ ] Line 314-315 mentions reject patterns and `unmatched`

--- END ISSUE 5 ---

--- ISSUE 6 ---
# [Spec] Make the list grammars follow one convention

**Labels:** medium, low

## Problem

`pattern_item` includes the list marker while the choice `item` does not; two `value` rules collide in a fill-in grammar; a change of bullet character is read as one list. Recommended: drop the marker from `pattern_item` (grammar.md:73-75 already says the item grammar applies after the marker), rename the numeric `value` to `numeric_value`, and state that a change of bullet starts a new list.

## Evidence

- `docs/references/patterns.md:252`: `pattern_item` includes the list marker, `item` does not

  ```lark
  pattern_item : ws? LIST_MARK ws content nl (blank_line* observations)?
  ```
- `docs/question-types/fill-in.md:223-224, docs/question-types/fill-in.md:239-241`: Two `value` rules collide in a fill-in grammar

  ```markdown
  with the `value` rule of [multiple choice](multiple-choice.md#body), and
  ```
- `docs/references/patterns.md:252-254, docs/question-types/fill-in.md:292`: `pattern_list` accepts a change of bullet character

  ```lark
  LIST_MARK    : /[*+-]/
  ```

## Impact

- **`pattern_item` includes the list marker, `item` does not:** The two list rules that fill-in reuses follow opposite conventions; a literal reading of either one rejects the examples of the other.
- **Two `value` rules collide in a fill-in grammar:** The fill-in grammar cannot be assembled from the referenced snippets without renaming a rule.
- **`pattern_list` accepts a change of bullet character:** Grammar and markdown parse disagree on how many lists the block has; the second list may become epilogue content in an implementation that follows the markdown AST.

## Suggested fix

- **`pattern_item` includes the list marker, `item` does not:** Remove `ws? LIST_MARK ws` from `pattern_item` (the list marker belongs to the list, as for `item`), or add it to `item` and change grammar.md:73-75. Pick one convention for both.
- **Two `value` rules collide in a fill-in grammar:** Rename one of the rules, for example `numeric_value` in numeric.md or `choice_value` in the choice types.
- **`pattern_list` accepts a change of bullet character:** State that all items use the same bullet character, or say that the grammar reads consecutive lists with different bullets as one list.

## Acceptance criteria

- [ ] `item` and `pattern_item` follow the same convention
- [ ] No two rules referenced by fill-in share a name
- [ ] The spec says what a change of bullet character does

--- END ISSUE 6 ---

--- ISSUE 7 ---
# [Spec] Align lazy lines and exact literals with CommonMark

**Labels:** medium, low

## Problem

`LAZY_START` ignores setext underlines, excludes some lines that CommonMark continues (indented `>`, empty list items, backtick lines with a backtick in the info string), and `exact` needs text after the opening backticks on the first line. Recommended: follow CommonMark in each case, and state that a tag line that becomes a setext heading is a `parse-error`.

## Evidence

- `docs/references/grammar.md:156`: `LAZY_START` ignores setext heading underlines

  ```lark
  LAZY_START    : /(?!>|!(?!\[)|[*+-][ \t]|1[.)][ \t]|#{1,6}([ \t]|(?=[\r\n]))|`{3}|~{3}|(\*[ \t]*){3,}(?=[\r\n])|(-[ \t]*){3,}(?=[\r\n])|(_[ \t]*){3,}(?=[\r\n]))[^ \t\r\n]/
  ```
- `docs/references/grammar.md:156, docs/question-types/short-answer.md:156`: `LAZY_START` rejects lines that CommonMark reads as paragraph continuation

  ```lark
  lazy_content : ws? LAZY_TEXT (nl ws? LAZY_TEXT)*
  ```
- `docs/question-types/short-answer.md:152`: `exact` rejects a code span that opens at the end of a line

  ```lark
  exact        : FENCE EXACT_TEXT (nl ws? LAZY_EXACT_TEXT)* FENCE ws?
  ```

## Impact

- **`LAZY_START` ignores setext heading underlines:** An implementation that follows the grammar and one that follows the markdown AST disagree on whether the definition exists.
- **`LAZY_START` rejects lines that CommonMark reads as paragraph continuation:** Contrived inputs parse differently in the grammar and in CommonMark.
- **`exact` rejects a code span that opens at the end of a line:** Minimal; authors rarely break a literal right after the fence.

## Suggested fix

- **`LAZY_START` ignores setext heading underlines:** Add the setext underline (`=+` or `-+` with optional trailing ws) to the exclusions of `LAZY_START`, and say what happens to a tag line that becomes a setext heading (for example a `parse-error`).
- **`LAZY_START` rejects lines that CommonMark reads as paragraph continuation:** Limit the `>`/`!` exclusion to at most three columns of indentation, exclude list markers only when non-blank text follows, and exclude a backtick fence only when its info string has no backtick.
- **`exact` rejects a code span that opens at the end of a line:** Make the text on the first line optional (`EXACT_TEXT?`), or state that the opening run must be followed by text on the same line.

## Acceptance criteria

- [ ] LAZY_START excludes setext underlines
- [ ] The counter-examples of F41 parse as continuation
- [ ] An exact literal can open at the end of a line

--- END ISSUE 7 ---

--- ISSUE 8 ---
# Mechanical fixes

**Labels:** mechanical, medium, low

## Problem

Each fix below follows from its finding and needs no design decision, so they can be applied together in one pass and reviewed by reading the diff. Severity still applies: a mechanical fix can matter a lot.

### F19 (medium): The two grammar snippets of `patterns` disagree

`docs/question-types/fill-in.md:197`

```lark
patterns         : answer | nl pattern_list
```

**Suggested fix:** Replace line 197 with `patterns : content | nl lazy_content | nl pattern_list`, as on line 291.

### F32 (medium): Stem rule allows only one inline element between blanks

`docs/question-types/fill-in.md:141`

```lark
stem  : inline_md? (blank inline_md?)+
```

**Suggested fix:** Use `inline_md*` in the rule, or say that `inline_md` is a sequence of inline elements.

### F8 (low): The Blank schema says a bare tag infers its kind from what follows

`schema/fill-in.yaml:76-79`

```yaml
      required here even though the surface syntax may leave it implicit
      (`[^capital]:` infers its kind from the definition that follows,
      while `[^size/numeric]:` states it).
```

**Suggested fix:** Write: '`[^capital]:` is a choice blank, while `[^size/numeric]:` and `[^city/short-answer]:` state their kind.'

### F9 (low): The ShortAnswerBlank description lists answer forms that no longer exist

`schema/fill-in.yaml:125-128, schema/fill-in.yaml:139-141`

```yaml
      exactly like a short-answer question. Carries the same answer
      machinery: a list of accepted responses, a regular expression, or
      `accept`/`reject` pattern lists that can attach feedback.
```

**Suggested fix:** Write: 'Carries the same answer machinery: `accept` and `reject` pattern lists, which can attach feedback.' In `accept`, cite `[^id/short-answer]` (alias `[^id/short-answer/accept]`).

### F10 (low): A choice blank has three names: choice blank, multiple choice blank and type multiple-choice

`docs/question-types/fill-in.md:213-215`

```markdown
## Multiple choice blanks

Multiple-choice blanks are represented by a reference definition followed by a
```

**Suggested fix:** Use 'choice blank' in prose and headings, and state once that its JSON `type` is `multiple-choice`.

### F29 (low): `grading` description omits the per-type entry of an exam grading map

`schema/fill-in.yaml:38-39`

```yaml
`inherit`, the default, takes the exam's `grading` value, and
```

**Suggested fix:** Mention the `fill-in` entry of a grading map.

### F30 (low): `unmatched` description drops the per-blank default

`schema/fill-in.yaml:56-58`

```yaml
Applies to every short answer blank of the question, with the
```

**Suggested fix:** Add: if absent, each blank takes its own default, `incorrect` with an accept pattern and `manual` without one.

## Acceptance criteria

- [ ] F19: The two grammar snippets of `patterns` disagree
- [ ] F32: Stem rule allows only one inline element between blanks
- [ ] F8: The Blank schema says a bare tag infers its kind from what follows
- [ ] F9: The ShortAnswerBlank description lists answer forms that no longer exist
- [ ] F10: A choice blank has three names: choice blank, multiple choice blank and type multiple-choice
- [ ] F29: `grading` description omits the per-type entry of an exam grading map
- [ ] F30: `unmatched` description drops the per-blank default

--- END ISSUE 8 ---
