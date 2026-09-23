# Multiple selection

## Example

Multiple selection questions are represented by an unordered list with an ASCII-art
rendition of a checkbox. The correct answers are marked with `[x]` and incorrect
ones are left blank.

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
frontmatter

| Field   | Type                 | Description                      |
| ------- | -------------------- | -------------------------------- |
| type    | "multiple-selection" | The type discriminator           |
| shuffle | boolean              | True if choices can be shuffled  |
| grading | grading              | The grading strategy to use.[^1] |

[^1]: Grading is `"partial" | "all-or-nothing" | "symmetric"`. Default is `"symmetric"`.


## Body

Body consists of an unordered list of items. Each item follows the grammar:

```
item  : ws? "[" value "]" markdown+
value : ws
      | ws? ("x" | "X") ws?
```

`markdown` represent any markdown element nested inside the item.


## Choices

Choices follow the same structure from [Multiple choice questions](multiple-choice.md#choices),
respecting the rules for the allowed `values` inside the initial square brackets.

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

The grading strategy is set in the frontmatter.

A choice is **judged correctly** when the student ticked it and it is correct,
or left it unticked and it is incorrect. Every choice is judged, since an
unticked choice asserts that the choice is false -- see the note below the
table.

* **partial**: Each choice judged correctly gives a point. The total is
  normalized to the range `[0, 1]` by dividing by the total number of choices.
* **all-or-nothing**: The student must tick all correct choices and leave all
  incorrect choices unticked to get a point. Any mistake gives zero points.
* **symmetric**: Each choice judged correctly gives a point, and each choice
  judged wrongly subtracts a point. The total is normalized to the range
  `[-1, 1]` by dividing by the total number of choices.


**Examples**:

Consider the answer key: `[T, F, T, F]`, the table shows a few combinations
of student markings and the resulting score for each grading strategy. The
"expands to" column applies the unticked-means-false convention, and "judged
correctly" counts the choices that then agree with the answer key.

| Markings       |  Expands to    | Judged correctly | "partial" | "all-or-nothing" | "symmetric" |
| -------------- | -------------- | :--------------: | :-------: | :--------------: | :---------: |
| `[T, F, T, F]` | --             |        4         |    1.0    |       1.0        |     1.0     |
| `[F, T, F, T]` | --             |        0         |    0.0    |       0.0        |    -1.0     |
| `[T, T, F, F]` | --             |        2         |    0.5    |       0.0        |     0.0     |
| `[T, F, _, _]` | `[T, F, F, F]` |        3         |   0.75    |       0.0        |     0.5     |
| `[F, T, _, _]` | `[F, T, F, F]` |        1         |   0.25    |       0.0        |    -0.5     |
| `[_, _, _, _]` | `[F, F, F, F]` |        2         |    0.5    |       0.0        |     0.0     |

`partial` is the "judged correctly" count over 4; `symmetric` is that count
minus the choices judged wrongly, over 4.

For multiple-selection questions, the absence of any markings always implies
**false**. The typical UI, which is a list of checkboxes, naturally enforces
this convention by leaving unchecked boxes to represent false choices. There
is no way to explicitly leave it unmarked. If that is necessary, prefer using
[true/false](true-false.md) questions.

## Additional Rules

| Field              | Level    | Rule                                                      |
| ------------------ | -------- | --------------------------------------------------------- |
| choices[].text     | critical | must be unique among the choices of the question          |
| choices[].id       | critical | must be unique among the choices of the question          |
| choices[].feedback | warning  | must have at least one visible character                  |
| choices[].comment  | warning  | must have at least one visible character                  |
| choices[].text     | info     | should not be visually equivalent to another choice[^2]   |
| choices[].correct  | info     | at least one choice should be correct                     |
| choices[].correct  | info     | not every choice should be correct                        |
| choices[].id       | info     | should be defined in the document, instead of derived[^3] |

[^2]: Visual equivalence is not defined by this spec, see
[multiple choice](multiple-choice.md#choices).
[^3]: Derived ids are only as stable as the slugifier that produced them.
