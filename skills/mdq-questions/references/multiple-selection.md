# Multiple selection

"Tick all that apply". Same list syntax as multiple choice, but the marker is
`[x]` for a choice that should be ticked and `[ ]` for one that should not.

```md
Which cities were capitals of Brazil?

* [ ] Lisbon
* [x] Brasília
* [ ] São Paulo
* [x] Rio de Janeiro
```

Choices take the same `[choice-id]`, `>` feedback and `!` comment syntax as
[multiple choice](multiple-choice.md#choice-anatomy). Percentages are NOT
allowed — a choice is either ticked or not.

## Frontmatter

| Field   | Values                                             |
| ------- | -------------------------------------------------- |
| shuffle | `true` to allow shuffling the choices               |
| grading | `symmetric` (default), `partial`, `all-or-nothing`  |

## Grading

An unticked box asserts "false", so every choice is always judged. With 4
choices and answer key `[x, , x, ]`:

* `partial`: correct judgements / 4, in 0..1.
* `all-or-nothing`: 1 only if every box matches, else 0.
* `symmetric`: (correct - wrong) / 4, in -1..1.

Feedback is shown only for choices judged **wrongly** — including a correct
choice the student failed to tick. A perfect answer shows no feedback.

## Gotchas

* There is no "leave it blank" for the student. If abstaining must be possible,
  use a [true/false](true-false.md) question instead.
