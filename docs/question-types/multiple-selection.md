# Multiple selection

## Example

Multiple selection questions are represented by an unordered list with an ASCII-art
rendition of a checkbox. The correct answers are marked with `[x]` and incorrect
ones are left blank. Without a `type` in the frontmatter, a list is multiple
selection when a value is `x` or `X`, or when no rule for another type applies,
as in a list whose values are all blank (see
[type inference](question-base.md#type-inference)). A `*` or a percentage
makes the list multiple choice.

```md
Which cities were capitals of Brazil?

* [ ] Lisbon
* [x] Brasília
* [ ] São Paulo
* [ ] Buenos Aires
* [x] Rio de Janeiro
```

## Frontmatter

Multiple selection questions accept the following extra arguments in the
frontmatter:

| Field   | Type                 | Description                         |
| ------- | -------------------- | ----------------------------------- |
| type    | "multiple-selection" | The type discriminator              |
| shuffle | boolean or "inherit" | True if choices can be shuffled[^1] |
| grading | grading              | The grading strategy to use.[^1]    |

[^1]: Grading is `"partial" | "all-or-nothing" | "symmetric" | "inherit"`.
Default is `"inherit"`, which takes the strategy from the exam, and is
`"symmetric"` outside an exam. `shuffle` is `boolean | "inherit"` with the
same rule: `"inherit"` is the default and resolves to `false` outside an
exam. See [exam inheritance](../exam.md#inheritance).


## Body

Body consists of a [choice list](../references/choices.md) of at least two
items. Each item follows the `item` rule of
[Choice lists](../references/choices.md#item), with the values:

```lark
value : ws
      | ws? ("x" | "X") ws?
```


## Choices

Choices follow [Choice lists](../references/choices.md): the item layout, the
`text`, `id`, `feedback` and `comment` fields, and the rules for duplicate
texts, duplicate ids and derived ids.

Multiple selection adds the field `correct`, derived from `value`: `[x]` is
`true` and `[ ]` is `false`. The field is REQUIRED in the AST. Unlike multiple
choice, where a blank `[ ]` omits `score`, every choice here is a verdict
and states it explicitly:

```yaml
choices:
  - text: Brasília
    correct: true
  - text: Lisbon
    correct: false
```

A question MAY mark any number of choices as correct, including none or all.
Implementations MAY report, at the `info` level, a question with no correct
choice (`no-correct-choice`), since the empty response (`[]`, nothing ticked) then scores 1, and
a question with every choice correct (`all-choices-correct`), since ticking
every choice then scores 1.

## Feedback

Unlike [multiple choice](multiple-choice.md#feedback), where the picked choice
always shows its feedback, a multiple-selection question shows feedback only
for the choices the student judged **wrongly** -- in either direction:

* a choice ticked that should not have been, and
* a choice left unticked that should have been ticked.

A correctly judged choice never shows feedback, so a student who answers
perfectly sees none. The second case means feedback can appear for a choice the
student never ticked, which is intended: leaving a choice unticked asserts that
it is false, and a missed correct answer is the mistake most worth explaining.

Feedback is listed in the order the choices appear in the document, never in
the order the student marked them. A skipped question shows no feedback at all,
because its grading formula never runs.


## Grading

The `grading` field of the frontmatter selects one of the three strategies
below. It can be set in the question, or left as `"inherit"`, the default,
which takes the strategy from the exam: the exam's `grading`, or its entry for
`multiple-selection` when it is a map (see [exam grading](../exam.md#grading)). The
strategy is `"symmetric"` outside an exam, and in an exam that does not set one
for multiple selection (no `grading`, or a map without a `multiple-selection`
key).

A choice is **judged correctly** when the student ticked it and it is correct,
or left it unticked and it is incorrect. Every choice is judged, since an
unticked choice asserts that the choice is false -- see the note below the
table.

* **partial**: Each choice judged correctly gives a point. The total is
  normalized to the range `[0, 1]` by dividing by the total number of choices.
* **all-or-nothing**: The student must tick all correct choices and leave all
  incorrect choices unticked to get a point. Any mistake gives zero points.
  There is no `no-mistakes` strategy here: an unticked choice is a verdict,
  not an abstention, so it would give the same scores.
* **symmetric**: Each choice judged correctly gives a point, and each choice
  judged wrongly subtracts a point. The total is normalized to the range
  `[-1, 1]` by dividing by the total number of choices.


**Examples**:

Consider four choices `a`, `b`, `c` and `d`, with the answer key `{a, c}`: `a`
and `c` are correct. The table shows, for a few sets of ticked choices, how
many choices are judged correctly and the score under each grading strategy.

| Ticked   | Judged correctly | "partial" | "all-or-nothing" | "symmetric" |
| -------- | :--------------: | :-------: | :--------------: | :---------: |
| `{a, c}` |        4         |    1.0    |       1.0        |     1.0     |
| `{b, d}` |        0         |    0.0    |       0.0        |    -1.0     |
| `{a, b}` |        2         |    0.5    |       0.0        |     0.0     |
| `{a}`    |        3         |   0.75    |       0.0        |     0.5     |
| `{b}`    |        1         |   0.25    |       0.0        |    -0.5     |
| `{}`     |        2         |    0.5    |       0.0        |     0.0     |

`partial` is the "judged correctly" count over 4; `symmetric` is that count
minus the choices judged wrongly, over 4.

For multiple-selection questions, an unticked choice always means **false**.
The typical UI, which is a list of checkboxes, naturally enforces this
convention. A student cannot abstain on a single choice: every choice gets a
verdict. If abstention is necessary, use [true/false](true-false.md)
questions.

## Additional Rules

| Field              | Level    | Code                       | Rule                                                      |
| ------------------ | -------- | -------------------------- | --------------------------------------------------------- |
| choices            | error    | schema-error               | must have at least two choices (schema)                   |
| choices[].id       | error    | schema-error               | must be a valid slug (schema)                             |
| choices[].correct  | error    | schema-error               | must be declared in every choice (schema)                 |
| grading            | error    | schema-error               | must be one of the strategies above, or `inherit` (schema) |
| choices[]          | error    | foreign-choice-marker      | must use a value allowed in a multiple selection list     |
| choices[].text     | error    | blank-text                 | must have at least one visible character                  |
| choices[].feedback | error    | blank-text                 | must have at least one visible character                  |
| choices[].comment  | error    | blank-text                 | must have at least one visible character                  |
| choices[].text     | error    | duplicate-choice-text      | must be unique among the choices of the question          |
| choices[].id       | error    | duplicate-choice-id        | must be unique among the choices of the question          |
| choices[]          | error    | parse-error                | carries at most one feedback block and one comment block  |
| choices[]          | error    | parse-error                | must not use the empty marker `[]`                        |
| choices[].text     | info     | visually-identical-choices | is visually equivalent to another choice[^2]              |
| choices            | info     | no-correct-choice          | no choice is correct                                      |
| choices            | info     | all-choices-correct        | every choice is correct                                   |
| choices[].id       | info     | missing-choice-id          | has no id in the document[^3]                             |

[^2]: Visual equivalence is not defined by this spec, see
[choice text](../references/choices.md#choice-text).
[^3]: Derived ids are only as stable as the slugifier that produced them.
