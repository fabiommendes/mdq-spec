# Multiple choice

## Example

Multiple choice questions are represented by an unordered list with an ASCII-art
rendition of a radio button. Correct choices are marked with `[*]`.

```md
What is the capital of Brazil?

* [ ] Lisbon
* [*] Brasília
* [ ] São Paulo
* [ ] Buenos Aires
* [ ] Rio de Janeiro
```

## Frontmatter

Multiple choice questions accept the following extra arguments in the
frontmatter:

| Field   | Type              | Description                      |
| ------- | ----------------- | -------------------------------- |
| type    | "multiple-choice" | The type discriminator           |
| shuffle | boolean or "inherit"           | True if choices can be shuffled[^1] |
| grading | grading           | The grading strategy to use.[^1] |

[^1]: Grading is `"partial" | "all-or-nothing" | "symmetric" | "inherit"`.
Default is `"inherit"`, which takes the strategy from the exam, and is
`"symmetric"` outside an exam. `shuffle` is `boolean | "inherit"` with the
same rule: `"inherit"` is the default and resolves to `false` outside an
exam. See [exam inheritance](../exam.md#inheritance).


## Body

Body consists of an unordered list of items. Each item follows the grammar:

```lark
item          : ws? "[" value "]" ws? (CHOICE_ID ws?)? md_inline* nl lazy_line* (blank_line* observations)?
value         : ws
              | ws? "*" ws?
              | ws? percent ws?
percent       : ("+" | "-")? (INTEGER | DECIMAL) "%"
```

`CHOICE_ID` is defined in [Common grammar rules](../references/grammar.md#tokens):
a bracket right after the value that matches it is always the choice id. In
`* [*] [brasilia]`, `brasilia` is the id and the text is empty, which is a
`blank-choice-text` error.

`md_inline` represents any markdown inline element except new lines (which are
represented explicitly by `nl`). The rules `ws`, `nl`, `lazy_line`,
`blank_line`, `observations`, `INTEGER` and `DECIMAL` are defined in
[Common grammar rules](../references/grammar.md). The choice text continues on
the `lazy_line`s after its first line, so a `>` or `!` line always ends it, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).


## Choices

Each choice may represent additional information besides its text.

```md
* [value] [choice-id] Choice text
  > Feedback text to the students.
  ! Comments to other instructors.
```
The feedback and the comment are optional, and each can span several lines.
They follow the rules of
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines):
a line without a marker continues the block before it, a blank line ends it,
and a line that starts with `![` is an image, not a comment.

```md
* [value] [choice-id] Choice text
  > Multi
  > line
  > feedback.
  ! Comments to other instructors.
  ! Another line of comments.
```

Each item becomes one object of the `choices` list in the AST:

```yaml
choices:
  - id: brasilia
    text: Brasília
    score: 1
    feedback: Brasília has been the capital since 1960.
    comment: Students often pick Rio de Janeiro, the capital until 1960.
  - text: São Paulo
```

| Field      | Source in the item                                                           |
| ---------- | ---------------------------------------------------------------------------- |
| `text`     | The text of the item (see below).                                            |
| `id`       | The `CHOICE_ID`, without the brackets. Absent if the item has none.          |
| `score`    | Derived from `value`, see the score rules below. Absent for a blank value.   |
| `feedback` | The value of the `feedback` block (see below). Absent if none.              |
| `comment`  | The value of the `comment` block (see below). Absent if none.               |

The `text` is the source of the item after the removal of the value, the
choice id, the `ws` after them, the feedback and the comment. Its lines join
as the lines of a paragraph, and so do the lines of the `feedback` and
`comment` blocks, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).

The choice text MUST NOT be empty. And all choice texts MUST be unique. Two
texts are the same when they are equal after each run of whitespace outside
code spans is replaced by one space (`duplicate-choice-text`).
Implementations MAY report choices that have different textual representations,
but that are visually identical when rendered to HTML. It is out of the scope of
this document to define visual equivalence of markdown snippets, but we point to
some obvious cases:

```md
* [ ] [a] foo bar
* [ ] [b] foo  bar
* [ ] [c] `foo bar`
* [ ] [d] `foo  bar`
* [ ] [e] *foo bar*
* [ ] [f] _foo bar_
```

In the example, `a` and `b` are duplicates (spaces are not meaningful in a
markdown paragraph context), but `c` and `d` are not, since spaces are
meaningful in a code span. `e` and `f` are not duplicates, but they are visually
identical. `b` and `c` are visually different, but depending on formatting and
the rendering system they might still appear equivalent to a human reader.

A question MAY mark any number of choices as correct, and typically marks
exactly one. There is no upper limit, although a question in which every choice
is correct is unusual enough that implementations MAY warn about it. The count
does not change how the question is answered -- the student still picks a
single choice -- only how it is graded, see [Grading](#grading).

Each choice carries a `score` on a scale from -1 to 1, derived from `value` in
the body syntax above: `*` is 1. A percentage is its own fraction, so `[50%]` is
0.5 and `[-25%]` is -0.25. A percentage that would put `score` outside [-1, 1]
-- `[150%]`, say -- makes the question malformed (`schema-error`, the score is out of range). `[0%]` is an explicit
zero; a blank value, `[ ]`, omits `score` from the document.

A question can have negative scores, but the exam aggregation method may clamp
it to non-negative values depending on the exam settings. Question authors have
no control over this (see [exam](../exam.md#penalty)).

An omitted value is treated differently depending on the `grading` parameter in
the frontmatter and will be discussed in detail in the [Grading](#grading)
section.

The choice id is a slugified identifier for the choice so we can refer to it by
content, and not by position. It follows the same rules for slugs mentioned
before. If given, the choice ids for each choice MUST be unique.

The id is not mandatory. An implementation MAY derive url-safe identifiers from
the text content when it needs an addressable document (e.g., mdq-py:
`with_ids()`); but it is not part of the parse step itself. This transformation
SHOULD be stable in practical applications, although there might be edge cases
where it cannot be guaranteed. A stable assignment should preserve the choice id
assignments for the following operations:

* **Reordering of choices:** each choice preserves its original id.
* **Addition of new choices:** existing choices preserve their original ids.
* **Removal of choices:** if a choice is removed, the remaining ones should keep
  their previous ids.
* **Editing of feedback or comments:** any edit (inclusion, deletion or
  modification) to the feedback and comments of a choice keeps its id.

Since the transformation from an *arbitrary string* of text to a *url-safe
string* is inherently lossy, it is generally not possible to preserve those
properties for all cases if we want practical slugs. For instance:

```md
Which one is the exclamation mark?
* [*] !
* [ ] ?
* [ ] ¿
* [ ] ¡
```

Most slugifiers will remove punctuation marks, making all the options above
coalesce to the empty string. It is easy to envision encoding schemes like
replacing the symbol by a description -- e.g., `! -> bang`, `? -> question` --,
that will work in this case. However, those generally make the slug larger than
the subsumed text, which is rarely what we want.

The slugifiers should therefore work for all "typical cases", but we keep it
intentionally vague what a "typical" case means. You know when you see it:

```md
Which one is the largest river in the world?
* [*] Amazon
* [ ] Nile
  > Amazon is much larger by water volume, but it was recently discovered 
  > that it might also be larger by length by quite a margin.
* [ ] Mississippi
  > Not even close!
* [ ] Yellow River
```

## Feedback

Feedback is shown to the student after grading, for the choice they picked --
whatever that choice scored. A correct pick shows its feedback just as a wrong
one does, so feedback on the right answer is a good place to explain why it is
right.

Other question types trigger feedback differently: see
[multiple selection](multiple-selection.md#feedback),
[true/false](true-false.md#feedback) and [fill in the blanks](fill-in.md#feedback).


## Grading

There are three grading strategies for multiple choice questions. The grading
strategy is ignored if the marked choice defines a score, and the question is
graded according to that score. Otherwise (i.e., for omitted scores), it uses the
following rules:

* **partial**: Unspecified scores are treated as 0.
* **all-or-nothing**: Unspecified scores are treated as 0[^2].
* **symmetric** (default): Unspecified scores are computed in such a way that
  the average score of randomly picking choices is zero. This depends on the
  number of choices and the number of choices with specified scores. The value
  derived this way is clamped to the range `[-1, 0]`. The clamp applies to the
  score assigned to each unspecified choice, not to the question's final grade.
  With `S` the sum of the specified scores and `u` the number of choices with
  an unspecified score, each unspecified choice scores
  `min(0, max(-1, -S / u))`. An explicit `[0%]` is a specified score: it
  counts in `S` and not in `u`.

**Examples**:

Marking a choice with a score defined in the body of the question overrides the
grading strategy. Consider the following answer keys (a list with each choice
score) and the effect of marking a choice with an omitted score.

| Answer Key       | "partial" | "all-or-nothing" | "symmetric" |
| ---------------- | :-------: | :--------------: | :---------: |
| `[1, _, _, _]`   |   0.00    |       0.00       |    -0.33    |
| `[1, 1, _, _]`   |   0.00    |       0.00       |    -1.00    |
| `[1, 0.5, _, _]` |   0.00    |       0.00       |    -0.75    |
| `[1, 0, _, _]`   |   0.00    |       0.00       |    -0.50    |
| `[1, 1, 1, _]`   |   0.00    |       0.00       |    -1.00    |
| `[1, -1, _, _]`  |   0.00    |       0.00       |    0.00     |
| `[1, -1, -1, _]` |   0.00    |       0.00       |    0.00     |

The results are truncated to 2 decimal places for clarity, but the actual 
results should be computed with full precision.

[^2]: This is identical to the "partial" strategy and only exists for 
compatibility reasons with the other question types.

## Additional Rules

| Field              | Level    | Code                                 | Rule                                                      |
| ------------------ | -------- | ------------------------------------ | --------------------------------------------------------- |
| choices            | critical | schema-error                         | must have at least two choices (schema)                   |
| choices[].id       | critical | schema-error                         | must be a valid slug (schema)                             |
| choices[].score    | critical | schema-error                         | must be between -1 and 1 (schema)                         |
| choices[].feedback | critical | schema-error                         | must not be an empty string (schema)                      |
| choices[]          | critical | foreign-choice-marker                | must use a value allowed in a multiple choice list        |
| choices[].text     | critical | blank-choice-text                    | must not be empty                                         |
| choices[].text     | critical | duplicate-choice-text                | must be unique among the choices of the question          |
| choices[].id       | critical | duplicate-choice-id                  | must be unique among the choices of the question          |
| choices[]          | critical | parse-error                          | carries at most one feedback block and one comment block  |
| choices[].feedback | warning  | blank-choice-feedback                | must have at least one visible character                  |
| choices[].comment  | warning  | blank-choice-comment                 | must have at least one visible character                  |
| choices[].text     | info     | visually-identical-choices           | should not be visually equivalent to another choice[^3]   |
| choices[].score    | info     | multiple-choice-no-correct-choice    | at least one choice should have a score of 1              |
| choices[].score    | info     | all-choices-correct                  | not every choice should be correct                        |
| choices[].score    | info     | multiple-choice-many-correct-choices | more than one choice has a score of 1                     |
| choices[].id       | info     | missing-choice-id                    | should be defined in the document, instead of derived[^4] |

[^3]: Visual equivalence is not defined by this spec, see [choices](#choices).
[^4]: Derived ids are only as stable as the slugifier that produced them.
