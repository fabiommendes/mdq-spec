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
frontmatter

| Field   | Type              | Description                      |
| ------- | ----------------- | -------------------------------- |
| type    | "multiple-choice" | The type discriminator           |
| shuffle | boolean           | True if choices can be shuffled  |
| grading | grading           | The grading strategy to use.[^1] |

[^1]: Grading is `"partial" | "all-or-nothing" | "symmetric"`. Default is `"symmetric"`.


## Body

Body consists of an unordered list of items. Each item follows the grammar:

```
item          : ws? "[" value "]" md_inline+ nl extra_lines? (feedback? comments? | comments feedback)

value         : ws
              | ws? "*" ws?
              | ws? percent ws?
percent       : /[+-]?\d+(\.\d+)?%/

extra_lines   : (md_inline* nl)+
feedback      : feedback_line+
feedback_line : ">" md_inline+ nl extra_lines?
comments      : comment_line+
comment_line  : "!" md_inline+ nl extra_lines?
```

`md_inline` represent any markdown inline element except new lines (which are 
represented explicitly by `nl`).


## Choices

Each choice may represent additional information besides its text.

```md
* [value] [choice-id] Choice text
  > Feedback text to the students.
  ! Comments to other instructors.
```

The choice text MUST NOT be empty. And all choice texts MUST be unique.
Implementations MAY reject choices that have different textual representations,
but that are visually identical when rendered to HTML. It is out of the scope of
this document to define visual equivalence of markdown snippets, but we point to
some obvious cases:

```md
* [ ] [a] foo bar
* [ ] [b] foo  bar
* [ ] [c] `foo bar`
* [ ] [d] `foo  bar`
```

In the example, `a` and `b` are visually equivalent (spaces are not meaningful
in a markdown paragraph context), but `c` and `d` are clearly not. `b` and `c`
are visually different, but depending on formating and the rendering system
they might still appear equivalent to a human reader.

Both the feedback and comments can span several lines, each one preceded by
their corresponding punctuation. Both are optional.

```md
* [value] [choice-id] Choice text
  > Multi
  > line
  > feedback.
  ! Comments to other instructors.
  ! Another line of comments.
```

A question MAY mark any number of choices as correct, and typically marks
exactly one. There is no upper limit, although a question in which every choice
is correct is unusual enough that implementations MAY warn about it. The count
does not change how the question is answered -- the student still picks a
single choice -- only how it is graded, see [Grading](#grading).

Each choice carries a `score` on a scale from -1 to 1, derived from `value` in
the body syntax above: `*` is 1, an omitted value is 0, and a percentage is its
own fraction, so `[50%]` is 0.5 and `[-25%]` is -0.25. A percentage that would
put `score` outside [-1, 1] -- `[150%]`, say -- makes the question malformed,
not a grade that gets clamped down to the range: a choice never clamps its own
score, only the exam containing it can decide whether a negative one survives
(see [exam](../exam.md#penalty)).

The choice id is a slugfied identifier for the choice so we can refer it by
content, and not by position. It follows the same rules for slugs mentioned
before. If given, the choice ids for each choice MUST be unique.

If omitted, implementations MAY provide url-safe identifiers derived from the
text content. This transformation SHOULD be stable in practical applications. A
stable assignment should preserve the choice id assignments for the following
operations:

* Reordering of choices - each choice preserves its original id.
* Addition of new choices - existing choices preserve their original ids.
* Removal of choices - if a choice is removed, the remaining ones should keep
  their previous ids.
* Any edition (inclusion, deletion or modification) to the feedback and comments
  parts of the choice.

Since the transformation from an *arbitrary string* of text to an *url-safe
string* is inherently lossy, it is generally not possible to preserve those
properties for all cases. For instance:

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
  > that it might be also larger by length by quite a margin.
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
graded according to that score. Otherwise, it uses the following rules:

* **partial**: Unspecified scores are treated as 0.
* **all-or-nothing**: Unspecified scores are treated as 0[^2].
* **symmetric**: Unspecified scores are computed in such a way that the
  average score of randomly picking choices is zero. This depends on the number
  of choices and the number of choices with specified scores. The value derived
  this way is clamped to the range `[-1, 0]`. The clamp applies to the score
  assigned to each unspecified choice, not to the question's final grade.

**Examples**:

Marking a choice with a score defined in the body of the question overrides the 
grading strategy. Consider the following answer keys and the effect of marking
a choice that has no score defined in the body of the question. The answer
key is a list with each choice score.

| Answer Key       | "partial" | "all-or-nothing" | "symmetric" |
| ---------------- | :-------: | :--------------: | :---------: |
| `[1, _, _, _]`   |   0.00    |       0.00       |    -0.33    |
| `[1, 1, _, _]`   |   0.00    |       0.00       |    -0.50    |
| `[1, 0.5, _, _]` |   0.00    |       0.00       |    -0.75    |
| `[1, 1, 1, _]`   |   0.00    |       0.00       |    -1.00    |
| `[1, -1, _, _]`  |   0.00    |       0.00       |    0.00     |
| `[1, -1, -1, _]` |   0.00    |       0.00       |    0.00     |

The results are truncated to 2 decimal places for clarity, but the actual 
results should be computed with full precision.

[^2]: This is identical to the "partial" strategy and only exist for 
compatibility reasons with the other question types.

## Additional Rules

| Field              | Level    | Rule                                                        |
| ------------------ | -------- | ----------------------------------------------------------- |
| choices[].text     | critical | must be unique among the choices of the question            |
| choices[].id       | critical | must be unique among the choices of the question            |
| choices[].feedback | warning  | must have at least one visible character                    |
| choices[].comment  | warning  | must have at least one visible character                    |
| choices[].text     | info     | should not be visually equivalent to another choice[^3]     |
| choices[].score    | info     | at least one choice should have a score of 1                |
| choices[].score    | info     | not every choice should be correct                          |
| choices[].id       | info     | should be defined in the document, instead of derived[^4]   |

[^3]: Visual equivalence is not defined by this spec, see [choices](#choices).
[^4]: Derived ids are only as stable as the slugifier that produced them.
