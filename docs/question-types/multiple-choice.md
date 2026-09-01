# Multiple choice

## Example

Multiple choice questions are represented by an undorered list with an ASCII-art
rendition of a radio button. The correct answers are marked with `[*]`.

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

| Field   | Type              | Description                     |
| ------- | ----------------- | ------------------------------- |
| type    | "multiple-choice" | The type discriminator          |
| shuffle | boolean           | True if choices can be shuffled |


## Body

Body consists of an unordered list of items. Each item follows the grammar:

```
item  : ws? '[' value ']' markdown+
value : ws
      | ws? '*' ws?
      | ws? percent ws?

percent : /[+-]?\d+(\.\d+)?%/
```

`markdown` represent any markdown element nested inside the item.


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

In the example, `a` and `b` are obviously visually equivalent (spaces are not
meaningful in a paragraph context), but `c` and `d` are clearly not. One can
argue for or against the equivalence between `a` and `b` with `c`, depending
on the context.

Both the feedback and comments can span several lines, each one preceeded by
their corresponding punctuation. Both are optional.

```md
* [value] [choice-id] Choice text
  > Multi
  > line
  > feedback.
  ! Comments to other instructors.
  ! Another line of comments.
```
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
stable assignmet should preserve the choice id assignments for the following
operations:

* Reordering of choices - each choice preserve its original ids.
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

Most slugifiers will remove puctuation marks, making all the options above
coallesce to the empty string. It is easy to envision enconding schemes like
replacing the symbol by a description -- e.g., `! -> bang`, `? -> question` --,
that will work in this case. However, those generally make the slug larger than
the subsummed text, which is rarely what we want.

The slugifiers should therefore work for all "typical cases", but we keep it
intentionally vague what a "typical" case means. You know when you see it:

```md
Which one is the largest river in the world?
* [*] Amazon
* [ ] Nile
  > Amazon is much larger by volume of water, but it was recently discovered 
  > that it is larger by length.
* [ ] Mississipi
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
