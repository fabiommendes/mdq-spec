# Multiple choice

## Example

Multiple choice questions are represented by an unordered list with an ASCII-art
rendition of a radio button. Correct choices are marked with `[*]`. Without a
`type` in the frontmatter, a list is multiple choice only when a value is `*`
or a percentage (see [type inference](question-base.md#type-inference)). A list
whose values are all blank needs `type: multiple-choice`.

```md
What is the capital of Brazil?

* [ ] Lisbon
* [*] Brasília
* [ ] São Paulo
* [ ] Buenos Aires
* [ ] Rio de Janeiro
```

## Frontmatter

Multiple choice questions accept the following extra fields in the
frontmatter:

| Field   | Type                 | Description                         |
| ------- | -------------------- | ----------------------------------- |
| type    | "multiple-choice"    | The type discriminator              |
| shuffle | boolean or "inherit" | True if choices can be shuffled[^1] |
| grading | "partial", "symmetric" or "inherit" | The grading strategy to use.[^1] |

[^1]: Grading is `"partial" | "symmetric" | "inherit"`.
Default is `"inherit"`, which takes the strategy from the exam, and is
`"symmetric"` outside an exam. `shuffle` is `boolean | "inherit"` with the
same rule: `"inherit"` is the default and resolves to `false` outside an
exam. See [exam inheritance](../exam.md#inheritance).

**Shuffle.** With `shuffle: true`, an implementation that presents the question
MAY show the choices in any order. With `shuffle: false`, it MUST NOT change
their order. This rule is for hosts: no lint checks it.


## Body

Body consists of a [choice list](../references/choices.md) of at least two
items. Each item follows the `item` rule of
[Choice lists](../references/choices.md#item), with the values:

```lark
value         : ws
              | ws? "*" ws?
              | ws? percent ws?
percent       : ("+" | "-")? (INTEGER | DECIMAL) "%"
```

`INTEGER` and `DECIMAL` are defined in
[Common grammar rules](../references/grammar.md#tokens).


## Choices

Choices follow [Choice lists](../references/choices.md): the item layout, the
`text`, `id`, `feedback` and `comment` fields, and the rules for duplicate
texts, duplicate ids and derived ids. Multiple choice adds the field `score`:

```yaml
choices:
  - id: brasilia
    text: Brasília
    score: 1
    feedback: Brasília has been the capital since 1960.
    comment: Students often pick Rio de Janeiro, the capital until 1960.
  - text: São Paulo
```

A question MAY mark any number of choices as correct, and typically marks
exactly one. A choice is correct when its score is 1. Implementations MAY
report the unusual counts, at the `info` level: no correct choice
(`no-correct-choice`), more than one (`many-correct-choices`), and every choice
(`all-choices-correct`). A question where every choice is correct also has
more than one correct choice, so it gets both `all-choices-correct` and
`many-correct-choices`. The count does not change how the question is answered -- the student still picks a
single choice -- only how it is graded, see [Grading](#grading).

A choice can carry a `score` on a scale from -1 to 1, derived from `value` in
the body syntax above: `*` is 1. A percentage is its own fraction, so `[50%]` is
0.5 and `[-25%]` is -0.25. The number of a percentage is an `INTEGER` or a
`DECIMAL`, so it has no leading zero: `[050%]` is not a percentage and is a
`foreign-choice-marker` error. A percentage that would put `score` outside [-1, 1]
-- `[150%]`, say -- makes the question malformed (`schema-error`, the score is out of range). `[0%]` is an explicit
zero; a blank value, `[ ]`, omits `score` from the document.

A question can have negative scores, but the exam aggregation method may clamp
them to non-negative values depending on the exam settings. Question authors have
no control over this (see [exam](../exam.md#penalty)).

An omitted value is treated differently depending on the `grading` parameter in
the frontmatter and will be discussed in detail in the [Grading](#grading)
section.

## Feedback

Feedback is shown to the student after grading, for the choice they picked --
whatever that choice scored. A correct pick shows its feedback just as a wrong
one does, so feedback on the right answer is a good place to explain why it is
right.

A skipped question shows no feedback at all, because its grading formula never
runs.

Other question types trigger feedback differently: see
[multiple selection](multiple-selection.md#feedback),
[true/false](true-false.md#feedback) and [fill in the blanks](fill-in.md#feedback).


## Grading

The `grading` field of the frontmatter selects one of the two strategies
below. It can be set in the question, or left as `"inherit"`, the default,
which takes the strategy the exam's `grading` gives for multiple choice: its
`multiple-choice` entry when it is a map, or the translation of a scalar by the
table of [exam grading](../exam.md#grading). The strategy is `"symmetric"`
outside an exam, and in an exam that does not set one for multiple choice (no
`grading`, or a map without a `multiple-choice` key).

The grading strategy is ignored if the picked choice defines a score, and the question is
graded according to that score, under every strategy: a picked `[50%]` choice
scores 0.5, also under partial. Otherwise (i.e., for omitted scores), it uses the
following rules:

* **partial**: Unspecified scores are treated as 0.
* **symmetric**: Unspecified scores are computed in such a way that
  the average score of randomly picking choices is zero. This depends on the
  number of choices and the number of choices with specified scores. The value
  derived this way is clamped to the range `[-1, 0]`. The clamp applies to the
  score assigned to each unspecified choice, not to the question's final grade.
  With `S` the sum of the specified scores and `u` the number of choices with
  an unspecified score, each unspecified choice scores
  `min(0, max(-1, -S / u))`. An explicit `[0%]` is a specified score: it
  counts in `S` and not in `u`.

**Examples**:

Picking a choice with a score defined in the body of the question overrides the
grading strategy. Consider the following answer keys (a list with each choice
score) and the effect of picking a choice with an omitted score.

| Answer Key       | "partial" | "symmetric" |
| ---------------- | :-------: | :---------: |
| `[1, _, _, _]`   |   0.00    |    -0.33    |
| `[1, 1, _, _]`   |   0.00    |    -1.00    |
| `[1, 0.5, _, _]` |   0.00    |    -0.75    |
| `[1, 0, _, _]`   |   0.00    |    -0.50    |
| `[1, 1, 1, _]`   |   0.00    |    -1.00    |
| `[1, -1, _, _]`  |   0.00    |    0.00     |
| `[1, -1, -1, _]` |   0.00    |    0.00     |

The results are rounded to 2 decimal places for clarity, but the actual 
results should be computed with full precision.

## Public form

In the [public form](../public-form.md), each choice keeps only its `id` and `text`: `score`, `feedback`
and `comment` are private. Every choice MUST have an id. The
[correct responses](../public-form.md#correct-responses) are the ids of the choices whose score is 1.


## Additional Rules

| Field              | Level    | Code                       | Rule                                                      |
| ------------------ | -------- | -------------------------- | --------------------------------------------------------- |
| choices            | error    | schema-error               | must have at least two choices (schema)                   |
| choices[].id       | error    | schema-error               | must be a valid slug (schema)                             |
| grading            | error    | schema-error               | must be `partial`, `symmetric` or `inherit` (schema)      |
| shuffle            | error    | schema-error               | must be a boolean or `inherit` (schema)                   |
| choices[].score    | error    | schema-error               | must be between -1 and 1 (schema)                         |
| choices[]          | error    | foreign-choice-marker      | must use a value allowed in a multiple choice list        |
| choices[].text     | error    | blank-text                 | must have at least one visible character                  |
| choices[].feedback | error    | blank-text                 | must have at least one visible character                  |
| choices[].comment  | error    | blank-text                 | must have at least one visible character                  |
| choices[].text     | error    | duplicate-choice-text      | must be unique among the choices of the question          |
| choices[].id       | error    | duplicate-choice-id        | must be unique among the choices of the question          |
| choices[]          | error    | parse-error                | carries at most one feedback block and one comment block  |
| choices[]          | error    | parse-error                | holds only its first paragraph, the feedback and the comment, see [Item](../references/choices.md#item) |
| choices[]          | error    | parse-error                | must not use the empty marker `[]`                        |
| choices[].text     | info     | visually-identical-choices | is visually equivalent to another choice[^2]              |
| choices            | info     | no-correct-choice          | no choice has a score of 1                                |
| choices            | info     | all-choices-correct        | every choice is correct                                   |
| choices            | info     | many-correct-choices       | more than one choice has a score of 1                     |
| choices[].id       | info     | missing-choice-id          | has no id in the document[^3]                             |

[^2]: Visual equivalence is not defined by this spec, see [choice text](../references/choices.md#choice-text).
[^3]: Derived ids are only as stable as the slugifier that produced them, and
are not portable across implementations, see
[Choice id](../references/choices.md#choice-id).
