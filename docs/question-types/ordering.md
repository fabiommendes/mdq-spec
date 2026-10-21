# Ordering

Ordering questions ask the student to sort a list of textual lines according
to some criteria.

The lines in the `[ordering]` block are ALWAYS written in the correct order:
the block holds the correct order. Students are never shown that order --
implementations MUST present the lines shuffled, in a random or pseudo-random
arrangement, together with any distractors declared in the `## [extra]`
section.

The *answer key* is the `[ordering]` block and the `## [accept]` sections:
the orderings that are correct. The *declared answers* are the answer key and
the `## [reject]` sections: every ordering the question declares, correct or
not.

## Example

A simple ordering question that asks to build valid code.

````md
Sort the lines below to create a program that prints the first 10 Fibonacci
numbers on the screen.

[ordering]
```python
x, y = 1, 1
for _ in range(10):
    print(x)
    aux = x + y
    x = y
    y = aux
```
````

Ordering questions may specify extra distractor lines, feedback and known
alternative answers. A full example is shown below:

````md
---
indentation: strict
unmatched: manual
normalizations:
    - skip-blanks
---

Sort the lines below to create a program that prints the first 10 Fibonacci
numbers on the screen.

[ordering]
```python
x, y = 1, 1
for _ in range(10):
    print(x)
    aux = x + y
    x = y
    y = aux
```

## [extra]
```python
y = x + y
x = aux
```

## [accept]

! The print and auxiliary lines can be reordered. This is an instructor
! comment, not feedback.

```python
x, y = 1, 1
for _ in range(10):
    aux = x + y
    print(x)
    x = y
    y = aux
```

## [reject]

! Forgetting the aux variable is a common mistake.
> This creates a sequence of powers of two since the y = x + y uses the updated
> value of x and in each iteration y = x + y is equivalent to y = 2 * y.
> You must store the temporary computation in an auxiliary variable to avoid this.

```python
x, y = 1, 1
for _ in range(10):
    print(x)
    x = y
    y = x + y
```
````

The lines can also be a `ul` list. This example uses text lines, an extra
distractor and an accepted alternative that leaves a line out:

````md
---
id: ordering-ul-example
---

Order the stages of ecological succession on bare rock in the Atlantic Forest,
from the first to the last.

[ordering]
* Lichens colonize the bare rock.
* Mosses grow on the thin layer of soil.
* Grasses and small herbs take root.
* Shrubs and pioneer trees take over.
* A mature forest forms.

## [extra]
* The forest returns to bare rock.

## [accept]

! Skipping the grass stage is a valid shortcut in humid areas.

* Lichens colonize the bare rock.
* Mosses grow on the thin layer of soil.
* Shrubs and pioneer trees take over.
* A mature forest forms.
````



A nested `ul` list gives indentation levels. Each nested item is a line of its
own and its level is its nesting depth:

````md
---
id: ordering-nested-ul-example
indentation: strict
---

Order the outline of the Brazilian regions and some of their states, as
they would appear in a geography textbook.

[ordering]
* Região Norte
  * Amazonas
  * Pará
* Região Nordeste
  * Bahia
    * Salvador
  * Ceará
````


## Frontmatter

Ordering questions accept the following extra arguments in the
frontmatter:

| Field          | Type            | Description                                                                |
| -------------- | --------------- | -------------------------------------------------------------------------- |
| type           | "ordering"      | The type discriminator.                                                    |
| indentation    | Indentation     | Whether students may change the indentation of each line[^1].              |
| unmatched      | Unmatched       | What happens to a response no declared answer matches[^2].                 |
| normalizations | Normalization[] | Transformations applied before comparing responses to the declared answers[^3]. |

The `content` and `highlight` fields are not frontmatter fields of an ordering
question: the [body](#body) always sets them. A frontmatter that declares
either is an error (`invalid-frontmatter-field`), as is any other unknown key.
(The [essay](essay.md#content) type keeps both fields, because there they
describe the editor of the student.)

[^1]: `Indentation = "fixed" | "lenient" | "strict"`. `"fixed"` (the default)
presents each line with the indentation it was authored with and does not let
the student change it. `"lenient"` lets the student change indentation, but
ignores it when grading -- it implies the `dedent` normalization. `"strict"`
lets the student change indentation and takes it into account when grading.
Under `"lenient"` and `"strict"` the lines are first shown at level 0. See
[indentation](#indentation).

[^2]: `Unmatched = "manual" | "incorrect"`. `"manual"` (the default) leaves a
response that matches no declared answer ungraded, for the instructor to score
by hand. `"incorrect"` scores it 0. A response that does match a declared
answer is graded automatically either way, so this field decides nothing else.
See [grading](#grading).

[^3]: `Normalization = "dedent" | "skip-blanks"`. Defaults to the empty list. A
single normalization MAY be written as a bare string instead of a one-item
list, exactly as `tags` allows in [base](question-base.md#frontmatter); like `tags`,
that is a frontmatter spelling only, and the parsed document always holds a
list. The list is a set: order carries no meaning and an entry MUST NOT repeat.


## Body

The body consists of an `[ordering]` tag followed either by a code block or a
markdown `ul` element holding the lines to be ordered. The `content` and
`highlight` fields of the question are always derived from this block.

The body has a very simple grammar:

```lark
ordering : ws? "[" "ordering" "]" ws? nl content epilogue? (blank_line* section)*
content  : md_code_block | md_ul

section : ordering_extra | ordering_accept | ordering_reject

ordering_extra  : ws? "##" ws "[" "extra" "]" ws? ("#"+ ws?)? nl blank_line* content
ordering_accept : ws? "##" ws "[" "accept" "]" ws? ("#"+ ws?)? nl blank_line* (observations blank_line*)? content
ordering_reject : ws? "##" ws "[" "reject" "]" ws? ("#"+ ws?)? nl blank_line* (observations blank_line*)? content
```

`md_code_block` and `md_ul` are respectively markdown representations of
fenced code blocks and unordered lists. The rules `ws`, `nl`, `blank_line` and
`observations` are defined in [Common grammar rules](../references/grammar.md).
The "same content block type" rule and the "at most one `## [extra]`" rule are
not part of the grammar: an implementation checks them after parsing (see
[Additional Rules](#additional-rules)).

The content block MUST start on the line that follows the `[ordering]` tag,
with no blank line in between, as in
[fill in the blanks](fill-in.md#choice-blanks); otherwise the question is a
`parse-error`. The tag line accepts up to 3 spaces of indentation and trailing
spaces. A section heading follows the
[heading rule of type-specific sections](question-base.md#epilogue). A section
MUST hold a content block: a heading with none is a `parse-error`.

If the block following the `[ordering]` tag is a fenced code block, the
question has `content: "code"`, and the fence's language, if any, becomes
`highlight`. A fence with no language leaves `highlight` out. An
implementation SHOULD report, at the info level, a language that is not a
recognized identifier (`unknown-highlight-language`)[^8].

If it is a `ul` list, the question has `content: "text"` and no `highlight`.
Each line is
derived from the respective list item, preserving its markdown source verbatim,
without its trailing whitespace. A nested list item is a line of its own: it
does not become part of its parent item. A nested list MUST be a `ul` too, as
the body itself is (`*`, `-` and `+` markers MAY be mixed); an ordered
sub-list is an error (`parse-error`), as an ordered list body is.
An item is exactly one line: an item with a continuation line or a second
paragraph is an error (`parse-error`), whatever the rendered markdown shows.
That source is what a response is compared against, so two lines that render
identically but are written differently -- `*emphasis*` and `_emphasis_`, say
-- are two distinct lines. Implementations MAY report, at the info level,
a question that holds such a pair, since a student ordering the rendered text
cannot tell them apart.

Each line carries an indentation level -- a non-negative integer, not a count
of spaces -- derived as described in [indentation](#indentation). In a `ul`
list, the level of a line is the nesting depth of its item. Two lines
with the same text and the same level are the same line, and a question MAY
repeat one: duplicates are shown to the student as that many separate copies
to be ordered.

The epilogue, if any, sits between the content block and the first section,
as in every question type (see [epilogue](question-base.md#epilogue)). The
sections are contiguous after it: only another section can follow a section.
Prose after a section, whether it sits between two sections or after the last
one, is an error (`parse-error`); a section ends with its content block and
has no place for prose of its own, besides its observations. The epilogue MUST
NOT contain a `## [extra]`, `## [accept]` or `## [reject]` heading, since such
a heading starts the first section.

The body can also contain additional sections that specify extra lines,
alternative answers or known incorrect answers with feedback. The fence of a
section MUST use the same language as the `[ordering]` fence, or none, in which
case it inherits that language. A fence with another language is a
`parse-error`: the whole question is shown with one `highlight`.

In the YAML and JSON form there is no body to derive the fields from.
`content` is a required field there, either `"code"` or `"text"`. `highlight`
is OPTIONAL, it MUST NOT be empty, and it is allowed only when `content` is
`"code"`; otherwise the document is a `schema-error`.


### Extra lines

There can be at most one `## [extra]` section following the main `[ordering]`
block and it must use the same content block type (code block or `ul` list).
A fence of the section follows the language rule of the [body](#body).

Its lines are distractors: they are shuffled in among the lines of the `[ordering]` block
and MUST NOT appear in a correct response. A distractor MAY repeat a line of
the `[ordering]` block; that simply hands the student spare copies of a line
they do need, and a correct response still uses it exactly as many times as
the `[ordering]` block does. Distractors are compared after normalization: a
distractor that becomes equal to a line of the `[ordering]` block -- for example, one
that differs only by level under `indentation: "lenient"` -- is a spare copy of
that line.


### Accepted/rejected answers

The accept/reject blocks start with a `## [accept]` or `## [reject]` header,
followed by optional observations and the content block. As before, the content
block must be of the same type as the main `[ordering]` block and, for a code
block, must follow the language rule of the [body](#body), but repeated
sections are allowed. Rules below compare lines after **all forms of
normalization** -- every entry of `normalizations`, plus whatever the
`indentation` field implies:

* A question SHOULD NOT declare two sections that hold the same lines.
* An `## [accept]` section SHOULD NOT hold the same lines as the `[ordering]`
  block: it is already correct.
* The lines of an `## [accept]` section MUST be a subset of the lines of the
  `[ordering]` block, counting copies. An accepted answer MAY leave lines out,
  but it MUST NOT hold a distractor, a line the `[ordering]` block lacks, or
  more copies of a line than the `[ordering]` block has.
* A `## [reject]` section MUST NOT hold the same lines as the `[ordering]`
  block or as an `## [accept]` section: the answer key is correct by
  definition.
* A `## [reject]` section SHOULD NOT use a line, or more copies of a line, than
  the `[ordering]` block and the `## [extra]` section offer together. Students
  never see such a line, so no response can match the section.

A `## [reject]` section SHOULD declare feedback: its purpose is to tell the
student why that ordering is wrong. Implementations SHOULD report one without
it at the info level (`reject-without-feedback`).

The optional feedback message is a markdown block quote (`>` lines). The
observation part MAY also contain instructor comments (`!` lines). A section
carries at most one feedback block and at most one comment block, in either
order. Both follow the rules of
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines),
which also define the indentation allowed before the markers.


## Indentation

The `indentation` field controls whether the student can change the indentation
of the lines in the response and whether it is taken into account for grading:

* `"fixed"` (the default): each line keeps the indentation it was authored
  with and the student cannot change it. The level is part of what identifies
  a line, so two lines with the same text at different levels are different
  lines, and a distractor may differ from a line of the `[ordering]` block by its
  level alone.
* `"lenient"`: the student may change indentation freely, but it is ignored
  when grading. This implies the `dedent` normalization, whether or not
  `normalizations` lists it.
* `"strict"`: the student may change indentation, and it is compared like the
  rest of the line.

Indentation levels take part in the comparison under `"fixed"` and
`"strict"`; only `dedent`, listed or implied by `"lenient"`, removes them.

`"strict"` is pointless when `dedent` is listed in `normalizations`: nothing is
left to compare, and the question grades as under `"lenient"`. A question
SHOULD NOT combine them. Implementations SHOULD warn about it
(`redundant-strict-indentation`)[^7].

### Code blocks

The **indentation unit** of a code block is inferred from the lines of the
question. It considers all lines in the `[ordering]`, `## [extra]`,
`## [accept]` and `## [reject]` blocks, measures the leading whitespace in
columns, and takes the greatest common divisor of the leading whitespace of
every non-blank line that is indented at all. Non-indented lines contribute a
0 and are therefore left out, which keeps the divisor greater than zero.

A tab in the leading whitespace follows the CommonMark tab stops: it advances
to the next column that is a multiple of 4. So `"  \t"` and `"\t"` are both 4
columns wide, and `" \t  "` is 6.

If no indented line exists, the unit is 4 spaces.

A line's **indentation level** is its leading whitespace divided by that unit,
and that level -- not the raw whitespace -- is what a response carries and
what `"strict"` compares.

### Lists

The unit and the greatest common divisor apply to fenced code blocks only. In
a `ul` list (the `[ordering]` block and the `## [extra]`, `## [accept]` and
`## [reject]` sections alike), the level of a line is the nesting depth of its
item: top-level items are at level 0, their children at level 1, their
grandchildren at level 2, and so on. The width of the indentation in the source
and the marker of each item play no part.

An item whose only content is a nested list is not a line. It adds one level of
depth, as CommonMark reads it: `- - Bahia` is the line `[1, "Bahia"]`, and
`- - - Salvador` is `[2, "Salvador"]`. This is how an author writes a nested
distractor alone in `## [extra]`, where it has no parent item:

```md
## [extra]
- - Bahia
- - - Salvador
```

With `content: text`, the `[ordering]` block and each `## [accept]` and
`## [reject]` section MUST be a valid outline: the first line is at level 0 and
each line is at most one level deeper than the line before it. `## [extra]` is
exempt, because it is a pool of loose lines. A response with `content: text`
follows the same rule. Code blocks are not affected: their levels come from the
[indentation unit](#code-blocks) and may jump.

A list cannot show precise indentation. When an author needs it, a fenced code
block is the tool.

### Whitespace

The trailing whitespace of every line is removed, in code blocks and in lists.
A line that holds only whitespace is a blank line: level 0, empty text.

### Presentation

The initial presentation of the lines depends on `indentation`:

* `"fixed"`: each line is shown at its authored level.
* `"lenient"` and `"strict"`: every line is shown at level 0, because the
  authored level would give away part of the answer. The student sets the
  levels.


## Normalizations

The following normalizations can be applied before comparing a response to an
answer key:

- `dedent`: flattens every line to indentation level 0, so that indentation
  takes no part in the comparison. It does not keep the relative indentation
  of the lines: `dedent` removes all of it, not only the part the lines share.
- `skip-blanks`: ignores blank lines.

Normalizations apply to BOTH sides of the comparison: the student's response
and every declared answer (the `[ordering]` block and every `## [accept]` and
`## [reject]` section alike). They never alter what is presented to the
student, only what is compared.

`indentation: "lenient"` implies `dedent`, since indentation the student is
free to change cannot also decide the grade.

A blank line in the `[ordering]` block or in `## [extra]` counts as a line when
comparing, unless `skip-blanks` is listed. It is easy to write one by accident,
so implementations SHOULD report it at the info level (`blank-ordering-line`)
when `skip-blanks` is not listed.


## Feedback

A response that matches an accepted or a rejected answer shows that section's
feedback, if it declares one. The `[ordering]` block itself carries no
feedback syntax, and neither does `## [extra]`.

Implementations MAY supply a generic message when the matched section declares
no feedback -- a "Congratulations!" for the answer key,
and an equivalent notice for a rejected one. A response left for manual
grading shows no feedback, since nothing has decided it yet.

When a response matches more than one declared answer, only the feedback of the
first match in document order is shown (see [grading](#grading)).

Instructor comments (`!` lines) are never shown to students.


## Grading

Grading compares the response to the declared answers **by content**: lines carry no
id, so a line is identified by its text -- its raw markdown source, when the
content is a `ul` list -- and by its indentation level, unless `dedent` is in
effect (listed in `normalizations`, or implied by `indentation: "lenient"`).
A response matches a declared answer when the two sequences of lines are equal
after full normalization.

After all forms of normalization:

* A response matching the `[ordering]` block or any `## [accept]` section is
  correct, with a score of `1`.
* A response matching any `## [reject]` section is incorrect, with a score of
  `0`.

A response can match more than one declared answer only when the question
triggers the warnings `duplicate-alternative-lines` or
`accept-repeats-answer-key`. Then the first match in document order wins: the
`[ordering]` block first, then the sections in the order they appear.

If no declared answer matches, the outcome depends on `unmatched`:

* `"manual"` (the default): the response is pending, exactly as a response to
  an [essay](essay.md) or to a `manual` [short answer](short-answer.md) is.
  It has no score until the instructor supplies one.
* `"incorrect"`: the response is incorrect, with a score of `0`.

The score is always binary -- `1` or `0`, with no partial credit for a nearly
correct ordering.

### Automation

The [automation](question-base.md#automation) of an ordering question follows
`unmatched`: `automatic` with `"incorrect"`, and `semi-automatic` with
`"manual"`, because a declared answer always settles the responses that match it.
It is a derived property and never a field of the document.


## Response

The response to an ordering question is the list of lines the student
submitted, in the order they submitted them, each written as an
`[indentation level, text]` pair. See
[responses](../responses.md#ordering) for the full shape.

The response MUST come from the lines the student was shown: the `[ordering]`
and `## [extra]` lines together, the pool. A response is malformed
(`ResponseError`), and is not graded, when it:

* holds a line that is not in the pool;
* uses a line more times than the pool offers it;
* under `indentation: "fixed"`, carries a level other than the authored level
  of that line;
* with `content: text`, is not a valid outline: the first line is not at
  level 0, or a line is more than one level deeper than the line before it.

Under `"fixed"` a line in the pool is the pair of level and text. Under
`"lenient"` and `"strict"` the student may change levels (see
[indentation](#indentation)), so only the text identifies a line. With
`skip-blanks`, blank lines are left out on both sides. A response MAY leave
lines out: it is graded normally, as an `## [accept]` section that omits lines
is.


## Additional Rules

| Field                 | Level    | Code                         | Rule                                                              |
| --------------------- | -------- | ---------------------------- | ----------------------------------------------------------------- |
| lines                 | error    | schema-error                 | must have at least two lines (schema)                             |
| lines[]               | error    | schema-error                 | each line must be a `[level, text]` pair (schema)                 |
| lines[]               | error    | schema-error                 | `level` must be a non-negative integer (schema)                   |
| accept, reject        | error    | schema-error                 | an alternative must have at least one line (schema)               |
| accept, reject        | error    | accept-reject-overlap        | the same lines must not be both accepted and rejected[^4]         |
| accept                | error    | accept-outside-answer-key    | must be a subset of the `[ordering]` block's lines[^4]            |
| lines, accept, reject | error    | invalid-outline-level        | with `content: text`, the first line is at level 0 and no line is more than one level deeper than the previous one[^10] |
| extra, accept, reject | error    | parse-error                  | must use the same content block type as `[ordering]`[^5]         |
| extra, accept, reject | error    | parse-error                  | a code fence must use the language of the `[ordering]` fence or none |
| extra                 | error    | parse-error                  | at most one `## [extra]` section may be declared                  |
| accept, reject        | error    | parse-error                  | a section carries at most one feedback and one comment block[^6]  |
| extra, accept, reject | error    | parse-error                  | only a section can follow a section; the epilogue goes before it  |
| lines                 | error    | parse-error                  | the `[ordering]` block must start on the line right after its tag |
| extra, accept, reject | error    | parse-error                  | a section must have a content block                               |
| content               | error    | schema-error                 | is required in YAML and JSON (schema)                             |
| content               | error    | schema-error                 | must be a known content type (schema)                             |
| highlight             | error    | schema-error                 | must be omitted unless `content` is "code" (schema)               |
| highlight             | error    | schema-error                 | must not be empty (schema)                                        |
| indentation           | error    | schema-error                 | must be a known indentation mode (schema)                         |
| unmatched             | error    | schema-error                 | must be a known unmatched mode (schema)                           |
| normalizations        | error    | schema-error                 | must list known normalizations, each at most once (schema)        |
| accept, reject        | warning  | duplicate-alternative-lines  | two sections should not hold the same lines, fully normalized[^4] |
| accept                | warning  | accept-repeats-answer-key    | should not repeat the `[ordering]` block's own lines[^4]          |
| reject                | warning  | unreachable-alternative      | should not use lines the `[ordering]` and `extra` blocks lack[^4] |
| indentation           | warning  | redundant-strict-indentation | `"strict"` is pointless when `dedent` is normalized away[^7]      |
| lines, extra          | info     | blank-ordering-line          | a line is blank and `skip-blanks` is not normalized               |
| highlight             | info     | unknown-highlight-language   | is not a recognized language identifier[^8]                       |
| reject                | info     | reject-without-feedback      | declares no feedback, which is its whole purpose                  |
| lines, extra          | info     | visually-identical-lines     | two lines render alike but differ in source[^9]                   |

[^4]: All forms of normalization: every entry of `normalizations`, plus what
the `indentation` field implies. The `[ordering]` block counts as an accepted
answer for `accept-reject-overlap`.
[^5]: A code block and a `ul` list cannot be compared line for line.
[^6]: They may appear in either order, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).
[^7]: `dedent` flattens every line to level 0, so nothing is left for
`"strict"` to compare, and `"strict"` then grades exactly as `"lenient"`.
`indentation: "lenient"` implies `dedent` and therefore never combines with
`"strict"` in the first place.
[^8]: Any alias of a [Pygments](https://pygments.org/) lexer is a recognized
language identifier -- Pygments' own lexer aliases are the reference list.
[^9]: Lines are compared by their raw markdown source, so a student ordering
the rendered text cannot tell such a pair apart.
[^10]: In Markdown, an item that only holds a nested list adds a level without
    being a line, so `- a` followed by `- - - b` gives the levels 0 and 2, and
    `- - a` alone gives a first line at level 1. Both are errors. The rule is
    checked on the model, so it applies to YAML and JSON as well.
