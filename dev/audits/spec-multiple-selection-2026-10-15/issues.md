--- ISSUE 1 ---
# [Spec] Define the bracket at the start of a choice item

**Labels:** medium, low

## Problem

The spec defines each type's `value` rule, but not the generic bracket that type inference and `foreign-choice-marker` read before the type is known. So `[]`, `[xx]`, a list of only blank and `[?]` values, and `[x](url)` have no stated result. Options: (a) declare one shared rule for the leading bracket in grammar.md, relax type inference rule 4 to 'no other rule applies: multiple selection', and state that `[]` is a `parse-error` (what mdq-py does); (b) treat any non-matching bracket as text, so the list is not a choice list. Recommended: (a), since it matches mdq-py and the corpus and never drops a body in silence.

## Evidence

- `docs/question-types/question-base.md:213-216`: Type inference has no rule for a list of blank and unknown values

  ```md
  1. a value is `*` or a percentage: multiple choice;
  2. a value is `x` or `X`: multiple selection;
  3. a value is a letter: true/false;
  4. every value is blank: multiple selection.
  ```
- `docs/question-types/multiple-selection.md:42-44`: Empty brackets `[]` in a choice list have no rule

  ```lark
  value : ws
        | ws? ("x" | "X") ws?
  ```
- `docs/question-types/multiple-selection.md:43-44`: No grammar defines the generic bracket that counts as a value for type inference and foreign-choice-marker

  ```lark
  value : ws
        | ws? ("x" | "X") ws?
  ```
- `docs/question-types/multiple-selection.md:42`: The value bracket is read as a value when a link destination or reference follows it

  ```lark
  item      : ws? "[" value "]" ws? (CHOICE_ID ws?)? md_inline* nl lazy_line* (blank_line* observations)?
  ```

## Impact

- **Type inference has no rule for a list of blank and unknown values:** Two implementations can infer different types, or none, and report different codes for the same document.
- **Empty brackets `[]` in a choice list have no rule:** `[]` is a likely typo for `[ ]`. Implementations can disagree on the code, and one could read the list as prose and drop the question body.
- **No grammar defines the generic bracket that counts as a value for type inference and foreign-choice-marker:** Implementations can report different codes, or infer a different body, for the same malformed marker.
- **The value bracket is read as a value when a link destination or reference follows it:** Contrived input, but the grammar and the markdown layer disagree on whether the item is a choice.

## Suggested fix

- **Type inference has no rule for a list of blank and unknown values:** Relax rule 4 to 'no other rule applies: multiple selection' (what mdq-py does), and add an invalid example with only blank and unknown values.
- **Empty brackets `[]` in a choice list have no rule:** State in question-base.md, Type inference, that `[]` in a choice list is a `parse-error`, as mdq-py does, and add a multiple-selection invalid example.
- **No grammar defines the generic bracket that counts as a value for type inference and foreign-choice-marker:** Declare a shared rule for the bracket at the start of a choice item (for example `"[" /[^\]\r\n]*/ "]"`, minus what CHOICE_ID or a link would take) that type inference and `foreign-choice-marker` use.
- **The value bracket is read as a value when a link destination or reference follows it:** State that a value bracket followed by `(` or `[` is still the value (and the rest is text), or add the same lookahead to the value bracket and define the result.

## Acceptance criteria

- [ ] grammar.md declares the leading bracket rule used by type inference and foreign-choice-marker
- [ ] question-base.md type inference covers a list of blank and unknown values
- [ ] The spec states the code for `[]` and for a value bracket followed by `(` or `[`
- [ ] Invalid examples cover `[]` and blank-plus-`[?]` in a multiple-selection list

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] Make lazy_line exclude marker lines and test the one-block rule

**Labels:** medium

## Problem

`lazy_line` matches `>` and `!` lines, so the item grammar accepts two feedback blocks, which the prose forbids; no multiple-selection example tests it, and mdq-py merges the blocks. Fix the terminal with a negative lookahead for marker and block-start lines, and add invalid examples.

## Evidence

- `docs/references/grammar.md:105`: lazy_line accepts feedback and comment lines, so the item grammar accepts two feedback blocks

  ```lark
  lazy_line     : ws? md_inline+ nl
  ```
- `docs/question-types/multiple-selection.md:156`: No multiple-selection example has a second feedback or comment block, and mdq-py merges them

  ```markdown
  | choices[]          | error    | parse-error                | carries at most one feedback block and one comment block  |
  ```

## Impact

- **lazy_line accepts feedback and comment lines, so the item grammar accepts two feedback blocks:** The grammar does not encode the one-block-of-each-kind rule that it appears to encode; the restriction exists only in prose.
- **No multiple-selection example has a second feedback or comment block, and mdq-py merges them:** The rule is not tested, and the reference implementation violates it without the suite noticing.

## Suggested fix

- **lazy_line accepts feedback and comment lines, so the item grammar accepts two feedback blocks:** Make `lazy_line` exclude lines that start a feedback line, a comment line or a block that interrupts a paragraph, for example with a terminal that has a negative lookahead for these starts.
- **No multiple-selection example has a second feedback or comment block, and mdq-py merges them:** Add invalid examples for a choice with two feedback blocks (separated by a blank line, and by a comment block), expecting `parse-error`.

## Acceptance criteria

- [ ] lazy_line in grammar.md rejects lines that start with `>`, `!` (not `![`), a list marker, `#` or a fence
- [ ] Invalid multiple-selection examples with two feedback blocks (separated by a blank line, and by a comment) expect parse-error
- [ ] spec_audit.py passes

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Bound the indentation in the choice item and feedback grammars

**Labels:** low

## Problem

`ws?` before the value and before `>`/`!` is unbounded, while the prose and CommonMark limit it. Options: (a) bound it in the rules; (b) state once in grammar.md that item grammars apply to the item content after CommonMark removes the list marker and its padding, and keep the three-space rule for markers. Recommended: (b), it keeps the snippets short and matches what markdown-it gives the implementations.

## Evidence

- `docs/references/grammar.md:103-104`: feedback_line and comment_line accept any indentation before the marker

  ```lark
  feedback_line : ws? ">" ws? md_inline* nl
  comment_line  : ws? COMMENT_MARK ws? md_inline* nl
  ```
- `docs/question-types/multiple-selection.md:42`: The item rule accepts any indentation before the value

  ```lark
  item      : ws? "[" value "]"
  ```

## Impact

- **feedback_line and comment_line accept any indentation before the marker:** A reader of the grammar alone gets a different choice text and feedback than the prose and CommonMark give. The Python implementation also reads the over-indented line as feedback, which suggests the grammar is what implementers follow.
- **The item rule accepts any indentation before the value:** The grammar accepts a choice that a markdown renderer shows as code.

## Suggested fix

- **feedback_line and comment_line accept any indentation before the marker:** Bound the indentation in the rule (for example `INDENT: / {0,3}/`, with a note on how a tab counts), or state next to the snippet that `ws?` before a marker is limited by the Marker rule.
- **The item rule accepts any indentation before the value:** State the limit for the `ws?` before the value (CommonMark: at most four spaces after the list marker), or state that the grammar applies to the item content after CommonMark removes the marker and its padding.

## Acceptance criteria

- [ ] grammar.md states how indentation before the value and the markers is bounded
- [ ] A choice indented as code and a feedback line indented four columns have a stated result

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Make the multiple-selection Choices section self-contained

**Labels:** medium, low

## Problem

Choices imports multiple-choice#choices without saying which parts apply, the info rules on the count of correct choices exist only in the table, and the page does not say when a list is inferred as multiple selection. Options: (a) list the shared parts and add the missing paragraphs to multiple-selection.md; (b) move the shared choice rules (text, id, feedback, comment, duplicates, visual equivalence, derived ids) to one shared section that multiple choice, multiple selection and true/false reference. Recommended: (b), it also removes the risk that an edit to multiple choice changes multiple selection.

## Evidence

- `docs/question-types/multiple-selection.md:60-61`: Choices section does not say which parts of multiple-choice#choices apply

  ```md
  Choices follow the same structure as [Multiple choice questions](multiple-choice.md#choices),
  respecting the rules for the allowed `values` inside the initial square brackets.
  ```
- `docs/question-types/multiple-selection.md:158-159`: Text never states the no-correct-choice and all-choices-correct lints

  ```md
  | choices[].correct  | info     | no-correct-choice          | at least one choice should be correct                     |
  | choices[].correct  | info     | all-choices-correct        | not every choice should be correct                        |
  ```
- `docs/question-types/multiple-selection.md:5-7`: Multiple selection does not state how a choice list is inferred as multiple selection

  ```markdown
  Multiple selection questions are represented by an unordered list with an ASCII-art
  rendition of a checkbox. The correct answers are marked with `[x]` and incorrect
  ones are left blank.
  ```

## Impact

- **Choices section does not say which parts of multiple-choice#choices apply:** Readers and porters can apply multiple-choice-only rules (score derivation, single pick, many-correct-choices) to multiple selection.
- **Text never states the no-correct-choice and all-choices-correct lints:** The rule exists only in the table; the level and the rationale cannot be checked against the text.
- **Multiple selection does not state how a choice list is inferred as multiple selection:** A reader of this page cannot tell that a list with no `[x]` is still multiple selection, or that one `[*]` turns the whole list into multiple choice.

## Suggested fix

- **Choices section does not say which parts of multiple-choice#choices apply:** List the shared rules explicitly (text, id, feedback, comment, duplicates, visual equivalence, derived ids) and say that `correct` replaces the `score` row of the AST table; or move the shared choice rules to one shared section that both types reference.
- **Text never states the no-correct-choice and all-choices-correct lints:** Add a paragraph to Choices: any number of choices MAY be correct, including none or all; implementations MAY report `no-correct-choice` and `all-choices-correct` at the info level, with the reason above.
- **Multiple selection does not state how a choice list is inferred as multiple selection:** Add a sentence after the example that summarizes the inference rules for multiple selection and links to question-base.md#type-inference, as multiple-choice.md does.

## Acceptance criteria

- [ ] multiple-selection.md states which choice rules apply and that score rules do not
- [ ] The text states no-correct-choice and all-choices-correct with MAY at the info level
- [ ] multiple-selection.md summarizes its type inference and links to question-base.md#type-inference

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Clarify the grading table notation of multiple selection

**Labels:** low

## Problem

The table uses T, F and _ for a two-state question. Recommended: write markings as ticked sets and drop the 'Expands to' column.

## Evidence

- `docs/question-types/multiple-selection.md:120-132`: The T, F and _ notation of the grading table is not defined

  ```md
  | `[T, F, _, _]` | `[T, F, F, F]` |        3         |   0.75    |       0.0        |     0.5     |
  ```

## Impact

Readers can think that multiple selection has a third state, which the same document denies.

## Suggested fix

Either write the markings as ticked sets (`{a, c}`, `{a}`, `{}`) and drop the 'Expands to' column, or say before the table that `T` and `F` are the `true` and `false` values of the response mapping and `_` is an absent key (see responses.md#multiple-selection). Recommended: ticked sets, since both forms are the same response.

## Acceptance criteria

- [ ] The grading table uses a notation the page defines
- [ ] examples/grading/multiple-selection.yaml still agrees with the table

--- END ISSUE 5 ---

--- ISSUE 6 ---
# [Spec] Phrase info-level rules without 'should'

**Labels:** low

## Problem

The Rule column says 'should' for info rules, which by convention maps to warning. Rephrase them as observations in multiple-selection.md and multiple-choice.md.

## Evidence

- `docs/question-types/multiple-selection.md:157-160`: Rules table uses 'should' for info-level rules

  ```markdown
  | choices[].text     | info     | visually-identical-choices | should not be visually equivalent to another choice[^2]   |
  | choices[].correct  | info     | no-correct-choice          | at least one choice should be correct                     |
  | choices[].correct  | info     | all-choices-correct        | not every choice should be correct                        |
  | choices[].id       | info     | missing-choice-id          | should be defined in the document, instead of derived[^3] |
  ```

## Impact

A reader that maps the wording to a level gets `warning`, not `info`.

## Suggested fix

Phrase the info rules as observations, for example 'is visually equivalent to another choice', 'no choice is correct', 'every choice is correct', 'has no id of its own'.

## Acceptance criteria

- [ ] No info row of the two tables uses 'should' or 'must'

--- END ISSUE 6 ---

--- ISSUE 7 ---
# [Spec] Fill the multiple-selection corpus gaps

**Labels:** low

## Problem

Add `.mdq.md` examples for blank text, whitespace-only duplicate texts and multi-line text and feedback, and grading cases with no or all correct choices and with two choices.

## Evidence

- `docs/question-types/multiple-selection.md:48-50`: Markdown-level blank-text and text-normalization cases are only covered by YAML examples

  ```markdown
  In
  `* [x] [brasilia]`, `brasilia` is the id and the text is empty, which is a
  `blank-text` error.
  ```
- `examples/grading/multiple-selection.yaml:17-115`: Grading corpus has no question with zero or all correct choices, or with two choices

  ```yaml
  questions:
    # The table in multiple-selection.md, "Grading": answer key [T, F, T, F].
  ```

## Impact

- **Markdown-level blank-text and text-normalization cases are only covered by YAML examples:** The parser path that produces these values for multiple selection is not tested.
- **Grading corpus has no question with zero or all correct choices, or with two choices:** Edge cases of the grading formulas that the spec allows are not checked against implementations.

## Suggested fix

- **Markdown-level blank-text and text-normalization cases are only covered by YAML examples:** Add `.mdq.md` invalid examples for `* [x] [id]` with no text and for whitespace-only duplicate texts, and a valid example with multi-line choice text and feedback.
- **Grading corpus has no question with zero or all correct choices, or with two choices:** Add grading cases with keys `{a: false, b: false}` and `{a: true, b: true}` for the three strategies.

## Acceptance criteria

- [ ] The new examples exist and spec_audit.py passes
- [ ] Grading cases cover {a: false, b: false} and {a: true, b: true} under the three strategies

--- END ISSUE 7 ---

--- ISSUE 8 ---
# Mechanical fixes

**Labels:** mechanical, low, info

## Problem

Each fix below follows from its finding and needs no design decision, so they can be applied together in one pass and reviewed by reading the diff. Severity still applies: a mechanical fix can matter a lot.

### F6 (low): 'no way to explicitly leave it unmarked' reads as the opposite of its intent

`docs/question-types/multiple-selection.md:137-141`

```md
There
is no way to explicitly leave it unmarked. If that is necessary, prefer using
[true/false](true-false.md) questions.
```

**Suggested fix:** Reword: 'A student cannot abstain on a single choice: an unticked choice is a false verdict. If abstention is needed, use true/false questions.'

### F7 (low): 'When neither ... and outside an exam' joins two cases with 'and'

`docs/question-types/multiple-selection.md:100-102`

```md
When neither
the question nor the exam sets a strategy, and outside an exam, the strategy
is `"symmetric"`.
```

**Suggested fix:** Write: 'The strategy is `"symmetric"` outside an exam, and in an exam that does not set one for multiple selection (no `grading`, or a map without a `multiple-selection` key).' Apply the same wording in multiple-choice.md.

### F8 (low): Body does not state the two-choice minimum, unlike multiple choice

`docs/question-types/multiple-selection.md:39`

```md
Body consists of an unordered list of items. Each item follows the grammar:
```

**Suggested fix:** Write 'an unordered list of at least two items'.

### F22 (low): Rules table field for count rules is a choice field, but the code reports on the list

`docs/question-types/multiple-selection.md:158-159`

```markdown
| choices[].correct  | info     | no-correct-choice          | at least one choice should be correct                     |
```

**Suggested fix:** Use `choices` in the Field column for both rows.

### F23 (low): Schema grading description omits the per-type map of the exam

`schema/multiple-selection.yaml:33-34`

```yaml
`inherit`, the default, takes the exam's `grading` value, and
          is `symmetric` outside an exam.
```

**Suggested fix:** Write: '`inherit`, the default, takes the exam's `grading` (its `multiple-selection` entry when it is a map, `symmetric` if the entry is missing), and is `symmetric` outside an exam.'

### F24 (info): Schema top-level description lists only `choices` as an extension

`schema/multiple-selection.yaml:7`

```yaml
Extends the common question-base schema with a `choices` field.
```

**Suggested fix:** Write 'with `choices`, `grading` and `shuffle` fields'.

## Acceptance criteria

- [ ] F6: 'no way to explicitly leave it unmarked' reads as the opposite of its intent
- [ ] F7: 'When neither ... and outside an exam' joins two cases with 'and'
- [ ] F8: Body does not state the two-choice minimum, unlike multiple choice
- [ ] F22: Rules table field for count rules is a choice field, but the code reports on the list
- [ ] F23: Schema grading description omits the per-type map of the exam
- [ ] F24: Schema top-level description lists only `choices` as an extension

--- END ISSUE 8 ---
