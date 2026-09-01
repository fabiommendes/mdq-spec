# Multiple selection

## Example

Multiple selection questions are represented by an undorered list with an ASCII-art
rendition of a checkbox. The correct answers are marked with `[x]` and incorrect
ones are ommited.

```md
Which cities were capitals of Brazil?

* [ ] Lisbon
* [x] Brasília
* [ ] São Paulo
* [ ] Buenos Aires
* [x] Rio de Janeiro
```

## Frontmatter

Multiple choice questions accept the following extra arguments in the
frontmatter

| Field   | Type                 | Description                     |
| ------- | -------------------- | ------------------------------- |
| type    | "multiple-selection" | The type discriminator          |
| shuffle | boolean              | True if choices can be shuffled |


## Body

Body consists of an unordered list of items. Each item follows the grammar:

```
item  : ws? '[' value ']' markdown+
value : ws
      | ws? ('x' | 'X') ws?
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
