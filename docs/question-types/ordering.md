# Ordering

Ordering questions ask the student to sort a list of textual lines according
to some criteria.

The lines in the `[ordering]` block are ALWAYS written in the correct order:
the block holds the correct order. Implementations that present the question
MUST present the lines shuffled, in a random or pseudo-random arrangement,
together with any distractors declared in the `## [extra]` section. The
arrangement MAY coincide with a correct order (a random arrangement of `n`
distinct lines does with probability `1/n!`), and a host MAY draw again. This
rule binds hosts: no lint checks it.

The *answer key* is the `[ordering]` block and the `## [accept]` sections:
the orderings that are correct. The *declared answers* are the answer key and
the `## [reject]` sections: every ordering the question declares, correct or
not.

## Example

A simple ordering question that asks to build valid code.

````md
Sort the lines below to create a program that prints the first 10 Fibonacci
numbers on the screen.

[ordering]:
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

[ordering]:
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
> This creates a sequence of powers of two, since y = x + y uses the updated
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

[ordering]:
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

[ordering]:
* Região Norte
  * Amazonas
  * Pará
* Região Nordeste
  * Bahia
    * Salvador
  * Ceará
````


## Frontmatter

Ordering questions accept the following extra fields in the
frontmatter:

| Field          | Type            | Description                                                                |
| -------------- | --------------- | -------------------------------------------------------------------------- |
| type           | "ordering"      | The type discriminator.                                                    |
| indentation    | Indentation     | Whether students may change the indentation of each line[^1].              |
| unmatched      | Unmatched       | What happens to a response no declared answer matches[^2].                 |
| incorrectFeedback | string       | Feedback for an incorrect response that no `## [reject]` section gave feedback to[^3]. |
| normalizations | Normalization[] | Transformations applied before comparing responses to the declared answers[^4]. |

The `content` and `highlight` fields are not frontmatter fields of an ordering
question: the [body](#body) always sets them. A frontmatter that declares
either is an error (`invalid-frontmatter-field`), as is any other unknown key.
See [Content](#content).

[^1]: `Indentation = "fixed" | "lenient" | "strict"`. `"fixed"` (the default)
presents each line with the indentation it was authored with and does not let
the student change it. `"lenient"` lets the student change indentation, but
ignores it when grading -- it implies the `dedent` normalization. `"strict"`
lets the student change indentation and takes it into account when grading.
Under `"lenient"` and `"strict"` the lines are first shown at level 0. See
[indentation](#indentation).

[^2]: `Unmatched = "incorrect" | "manual"`. `"incorrect"` (the default) scores
a response that matches no declared answer 0. `"manual"` leaves it ungraded,
for the instructor to score by hand. A response that does match a declared
answer is graded automatically either way, so this field decides nothing else.
The default follows [short answer](short-answer.md#automation): an ordering
question always has an answer key, so it is `"incorrect"`. See
[grading](#grading).

[^3]: Block Markdown (paragraphs allowed), like the feedback of a
`## [reject]` section, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).
It MUST have at least one visible character
(`blank-text`). See [Feedback](#feedback).

[^4]: `Normalization = "dedent" | "skip-blanks"`. Defaults to the empty list. A
bare string MAY be written instead of a list. It is a comma-delimited list: each
part is stripped of surrounding whitespace, and an empty part after a final comma
is dropped, exactly as for `tags` in [base](question-base.md#frontmatter). So
`dedent, skip-blanks` is the list `[dedent, skip-blanks]`. Like `tags`,
that is a frontmatter spelling only, and the parsed document always holds a
list. The list is a set: order carries no meaning and an entry MUST NOT repeat.


## Body

The body consists of an `[ordering]:` tag followed either by a code block or a
markdown `ul` element holding the lines to be ordered. The `content` and
`highlight` fields of the question are always derived from this block.

The body has a very simple grammar:

```lark
ordering : ws? "[" "ordering" "]" ws? ":" ws? nl content epilogue? section*
content  : md_code_block | md_ul

section : ordering_extra | ordering_accept | ordering_reject

ordering_extra  : section_heading{"extra"} nl blank_line* content
ordering_accept : section_heading{"accept"} nl blank_line* (observations blank_line*)? content
ordering_reject : section_heading{"reject"} nl blank_line* (observations blank_line*)? content

section_heading{name} : blank_line* atx_heading{name}
                      | blank_line+ setext_heading{name}
atx_heading{name}     : ws? "##" ws "[" name "]" (ws ("#"+ ws?)?)?
setext_heading{name}  : ws? "[" name "]" ws? nl ws? "-"+ ws?
```

`md_code_block` and `md_ul` are respectively markdown representations of
fenced code blocks and unordered lists. The rules `ws`, `nl`, `blank_line` and
`observations` are defined in [Common grammar rules](../references/grammar.md).
`section_heading` has two forms: an ATX heading (`## [extra]`) and a setext
heading (`[extra]` followed by a line of `-`). A setext heading MUST follow a
blank line: without one, CommonMark reads `[extra]` as a lazy line of the block
before it (a list item or an epilogue paragraph), so there is no heading.
The "same content block type" rule and the "at most one `## [extra]`" rule are
not part of the grammar: an implementation checks them after parsing (see
[Additional Rules](#additional-rules)).

The tag has a colon, so its content is the block on the next line, see
[Body tags](question-base.md#body-tags). The content block MUST start on the
line that follows the `[ordering]:` tag, with no blank line in between, as in
[fill in the blanks](fill-in.md#choice-blanks); otherwise the question is a
`parse-error`. The tag line has no text after the colon. The tag line accepts up
to 3 spaces of indentation and trailing spaces. `[ordering]` without a colon is
a `parse-error`, and its message suggests `[ordering]:`. There is no alias.
A section heading follows the
[heading rule of type-specific sections](question-base.md#epilogue). A section
MUST hold a content block: a heading with none is a `parse-error`.

If the block following the `[ordering]:` tag is a fenced code block, the
question has `content: "code"`, and the fence's language, if any, becomes
`highlight`. The language of a fence is the first word of its info string: the
text up to the first space or tab, after the backslash and entity processing of
CommonMark. The rest of the info string is ignored. For example, the fence
```` ```python {.numberLines} ```` has the language `python`. Languages are
compared as strings, with case: `Python` and `python` are two languages. A
fence with no language leaves `highlight` out. Implementations
MAY report, at the info level, a language that is not a recognized identifier
(`unknown-highlight-language`)[^5], and a fence with no language
(`code-content-without-highlight`).

If it is a `ul` list, the question has `content: "text"` and no `highlight`.
Each line is
derived from the respective list item, preserving its markdown source verbatim,
without its trailing whitespace. A nested list item is a line of its own: it
does not become part of its parent item. A nested list MUST be a `ul` too, as
the body itself is (`*`, `-` and `+` markers MAY be mixed); an ordered
sub-list is an error (`parse-error`), as an ordered list body is.
An item is exactly one line, and it MUST be one paragraph: an item with a
continuation line or a second paragraph, or one that holds another block
(indented code, a heading, a block quote), is an error (`parse-error`),
whatever the rendered markdown shows.
An item with no text is an error (`parse-error`) too: a list holds no blank
line. An item that has no text of its own but holds a nested list is not a
line, see [indentation](#indentation).
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
case it inherits that language. A fence with another language, or the same
language written with other case, is a `parse-error`: the whole question is shown with one `highlight`.

The `[ordering]` block MUST hold at least two lines. The count is made before
normalization: with `skip-blanks`, blank lines count, even though the comparison
leaves them out. The schema checks it (`minItems`), see
[Additional Rules](#additional-rules).

In the YAML and JSON form there is no body to derive the fields from.
`content` is a required field there, either `"code"` or `"text"`. `highlight`
is OPTIONAL, it MUST NOT be empty, and it is allowed only when `content` is
`"code"`; otherwise the document is a `schema-error`.


### Extra lines

There can be at most one `## [extra]` section following the main `[ordering]`
block and it must use the same content block type (code block or `ul` list).
A fence of the section follows the language rule of the [body](#body).

Its lines are distractors: they are shuffled in among the lines of the `[ordering]` block.
A distractor MAY repeat a line of
the `[ordering]` block; that simply hands the student another copy of a line
they do need. A correct response is any response that is equal to a declared
answer after normalization, whatever pool lines it uses.


### Accepted/rejected answers

The accept/reject blocks start with a `## [accept]` or `## [reject]` header,
followed by optional observations and the content block. As before, the content
block must be of the same type as the main `[ordering]` block and, for a code
block, must follow the language rule of the [body](#body), but repeated
sections are allowed. Rules below compare lines after **all forms of
normalization** -- every entry of `normalizations`, plus whatever the
`indentation` field implies. The two rules that check which lines a section
uses (`## [accept]` against the `[ordering]` block, `## [reject]` against the
pool) identify a line as in [Line identity](#line-identity):

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
* A `## [reject]` section SHOULD NOT use a line that the `[ordering]` block and
  the `## [extra]` section do not offer, or more copies of a line than they offer. Students
  never see such a line, so no response can match the section.

A `## [reject]` section has two purposes. It tells the student why that
ordering is wrong, with its feedback. Under `unmatched: manual`, it also scores
a matching response 0, so the instructor does not have to grade it. A section
without feedback does only the second, so under the default
`unmatched: incorrect` it does nothing. Implementations MAY report, at the info
level, a `## [reject]` section without feedback (`reject-without-feedback`).

The optional feedback message is a markdown block quote (`>` lines). The
observation part MAY also contain instructor comments (`!` lines). A section
carries at most one feedback block and at most one comment block, in either
order. Both follow the rules of
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines),
which also define the indentation allowed before the markers.


## Content

The `content` field tells how the lines are written and shown. Its values are
"code" and "text". An ordering question has no frontmatter `content` and no
default: the body sets it, and a YAML or JSON document MUST state it. The
`highlight` field is allowed only with `content: code`: with "text" it is a
`schema-error`.

| Value  | Set by                          | Meaning                                                                 |
| ------ | ------------------------------- | ----------------------------------------------------------------------- |
| "code" | a fenced code block in the body | Each line is a line of code. The language of the fence is `highlight`.  |
| "text" | a `ul` list in the body         | Each line is a list item, compared by its raw markdown source.          |

The [essay](essay.md#content) type has a `content` field too, with other
meaning and source: there it is an optional frontmatter field with the values
"code", "text" and "plain", and the default "text". Ordering values are a subset
of them.


## AST

The body maps to these fields of the AST:

* The `[ordering]` block is `lines`: a list of `[level, text]` pairs, in the
  correct order.
* The `## [extra]` section is `extra`, a list of pairs of the same shape.
* Each `## [accept]` section is an item of `accept`, and each `## [reject]`
  section is an item of `reject`, in document order. An item is an object with
  the fields `lines` (the content block of the section, as pairs), `feedback`
  (the `>` block) and `comment` (the `!` block). `feedback` and `comment` are
  OPTIONAL.
* The content block sets `content` and `highlight`, see [Body](#body).

The `accept` and `reject` fields of ordering differ in shape and meaning from
the fields of the same name in [short answer](short-answer.md) and in the short
answer blanks of [fill-in](fill-in.md), where an item is a pattern string or an
object with a `pattern`. Here an item is a whole alternative ordering.

The full example of [Example](#example) as YAML:

```yaml
type: ordering
stem: >-
  Sort the lines below to create a program that prints the first 10 Fibonacci
  numbers on the screen.
content: code
highlight: python
indentation: strict
unmatched: manual
normalizations:
  - skip-blanks
lines:
  - [0, "x, y = 1, 1"]
  - [0, "for _ in range(10):"]
  - [1, "print(x)"]
  - [1, "aux = x + y"]
  - [1, "x = y"]
  - [1, "y = aux"]
extra:
  - [0, "y = x + y"]
  - [0, "x = aux"]
accept:
  - lines:
      - [0, "x, y = 1, 1"]
      - [0, "for _ in range(10):"]
      - [1, "aux = x + y"]
      - [1, "print(x)"]
      - [1, "x = y"]
      - [1, "y = aux"]
    comment: >-
      The print and auxiliary lines can be reordered. This is an instructor
      comment, not feedback.
reject:
  - lines:
      - [0, "x, y = 1, 1"]
      - [0, "for _ in range(10):"]
      - [1, "print(x)"]
      - [1, "x = y"]
      - [1, "y = x + y"]
    feedback: >-
      This creates a sequence of powers of two, since y = x + y uses the updated
      value of x and in each iteration y = x + y is equivalent to y = 2 * y.
      You must store the temporary computation in an auxiliary variable to avoid
      this.
    comment: Forgetting the aux variable is a common mistake.
```


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
This is the comparison of a whole answer with a declared answer. Which pool
line a response or a section uses follows [Line identity](#line-identity).

### Line identity

One definition of line identity serves every rule that checks whether lines
come from the `[ordering]` block or the pool: the response checks, and the
lint rules `accept-outside-answer-key` and `unreachable-alternative`.

| `indentation`         | A line is identified by | Two lines with the same text at different levels |
| --------------------- | ----------------------- | ------------------------------------------------ |
| `"fixed"`             | its level and its text  | are different lines                              |
| `"lenient"`, `"strict"` | its text only         | are the same line                                |

The student sets the levels under `"lenient"` and `"strict"`, so the level of
a line cannot decide whether the student can use it. With `skip-blanks`, blank
lines are left out in all modes.

`"strict"` is pointless when `dedent` is listed in `normalizations`: nothing is
left to compare, and the question grades as under `"lenient"`. A question
SHOULD NOT combine them. Implementations SHOULD warn about it
(`redundant-strict-indentation`)[^6].

### Code blocks

The **indentation unit** of a code block is inferred from the lines of the
question. It considers all lines in the `[ordering]`, `## [extra]`,
`## [accept]` and `## [reject]` blocks, measures the leading whitespace in
columns, and takes the greatest common divisor of the leading whitespace of
every non-blank line that is indented at all. Non-indented lines contribute a
0 and are therefore left out, which keeps the divisor greater than zero.

A tab in the leading whitespace follows the CommonMark tab stops: it advances
to the next column that is a multiple of 4. So `"  \t"` and `"\t"` are both 4
columns wide, and `" \t  "` is 6. The columns are counted in the content line,
after CommonMark strips the indentation of the fence: in a fence indented by two
spaces, the source line `  \tc = 2` is the content line `\tc = 2`, 4 columns wide.

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
follows the same rule only under `"lenient"` and `"strict"`: under `"fixed"`
the student cannot change levels, so an invalid outline in a response is a
wrong answer (see [Response](#response)). Code blocks are not affected: their
levels come from the [indentation unit](#code-blocks) and may jump.

A list cannot show precise indentation. When an author needs it, a fenced code
block is the tool.

### Whitespace

The trailing whitespace of every line is removed, in code blocks and in lists.
In a code block, a line that holds only whitespace is a blank line: level 0,
empty text. A list has no blank line, see [body](#body).

In a YAML or JSON document, the text of a line has no leading or trailing
space or tab and no line break. Only the text of a blank line in a code block
is empty. A document that breaks this rule is a `schema-error`. With
`content: text`, an empty line is an `empty-ordering-line`. The level of a
line carries its indentation, so a code line written with leading spaces in
the Markdown form has the text without them.

### Presentation

The initial presentation of the lines depends on `indentation`:

* `"fixed"`: each line is shown at its authored level.
* `"lenient"` and `"strict"`: every line is shown at level 0, because the
  authored level would give away part of the answer. The student sets the
  levels. The [public form](../public-form.md#max-level) gives a `maxLevel`: a
  host MAY stop the student from setting a deeper level. This does not
  change [Response](#response) or [Grading](#grading): a response line deeper
  than `maxLevel` does not make the response malformed. Under `"strict"` that
  response matches no declared answer.


## Normalizations

An `[ordering]` block or an `## [accept]` section that holds no line after
normalization is an error (`empty-ordering-answer`): with `skip-blanks`, a code
block of only blank lines is empty. An `## [reject]` section that is empty after
normalization stays valid, because it can give feedback to an empty submission.

The following normalizations can be applied before comparing a response to a
declared answer:

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

A blank line of a code block in the `[ordering]` block or in `## [extra]` counts as a line when
comparing, unless `skip-blanks` is listed. It is easy to write one by accident,
so implementations MAY report it, at the info level (`blank-ordering-line`),
when `skip-blanks` is not listed.


## Feedback

A response that matches an accepted or a rejected answer shows that section's
feedback, if it declares one. The `[ordering]` block itself carries no
feedback syntax, and neither does `## [extra]`.

Implementations MAY supply a generic message when the matched section declares
no feedback -- a "Congratulations!" for the answer key,
and an equivalent notice for a rejected one. A response left for manual
grading shows no feedback, since nothing has decided it yet.

The `[ordering]` block takes no `>` or `!` lines. A block quote after it would
be ambiguous with a block quote of the epilogue, so the answer key has no
feedback syntax. A host MAY show a generic message for a correct response, as
above.

The `incorrectFeedback` field holds the feedback of an incorrect response that
no `## [reject]` section gave feedback to. Two responses get it: one that
matches no declared answer under `unmatched: "incorrect"`, and one that
matches a `## [reject]` section with no feedback. The feedback of the section,
when it has one, wins. A correct response and a pending response never show
`incorrectFeedback`.

When a response matches more than one declared answer, only the feedback of the
first match in document order is shown (see [grading](#grading)).

Instructor comments (`!` lines) are never shown to students.


## Grading

Grading compares the response to the declared answers **by content**: lines carry no
id. The text of a line is its raw markdown source, when the content is a `ul`
list. A response matches a declared answer when the two sequences of lines are
equal after full normalization.

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

* `"incorrect"` (the default): the response is incorrect, with a score of `0`.
* `"manual"`: the response is pending, exactly as a response to
  an [essay](essay.md) or to a `manual` [short answer](short-answer.md) is.
  It has no score until the instructor supplies one. Use it to review the
  orderings the author did not foresee.

The default follows the rule of [short answer](short-answer.md#automation): it
is `"incorrect"` when the question has an answer key to compare with, and
`"manual"` when it has none. An ordering question always has an answer key, the
`[ordering]` block, so its default is `"incorrect"`.

The automatic score is binary -- `1` or `0`, with no partial credit for a nearly
correct ordering. The score of an instructor for a pending response is in the
range [0, 1], see [Pending](../responses.md#pending).

### Automation

The [automation](question-base.md#automation) of an ordering question follows
`unmatched`: `automatic` with `"incorrect"` (the default), and
`semi-automatic` with `"manual"`, because a declared answer always settles the
responses that match it.
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
* under `indentation: "lenient"` or `"strict"` with `content: text`, is not a
  valid outline: the first line is not at level 0, or a line is more than one
  level deeper than the line before it.

Lines are identified as in [Line identity](#line-identity). With `skip-blanks`,
blank lines are left out on both sides. A response MAY leave lines out: it is
graded normally, as an `## [accept]` section that omits lines is.

Under `"fixed"` the student cannot change levels, so the order of the lines
alone can make a text response a bad outline. That is a wrong answer, not a
malformed response: it is graded, matches no declared answer (every declared
text outline is valid), and falls under `unmatched`. It scores 0 under
`unmatched: incorrect` (the default) and is pending under `unmatched: manual`.

The empty list `[]` is a response, not a skip. It is graded like any other
response. The `[ordering]` block and the `## [accept]` sections are never empty
after normalization (`empty-ordering-answer`), so `[]` is never correct. It
matches a `## [reject]` section that is empty after normalization, and that
section gives feedback to the empty submission. Otherwise it matches no declared
answer: under `unmatched: incorrect` (the default) it scores 0, and under
`unmatched: manual` it is pending.


## Public form

The [public form](../public-form.md) replaces `lines` and `extra` with a `pool`: every line the student
sorts, at level 0 under `lenient` and `strict`, in a fixed order that does not
give away the answer. Under `lenient` and `strict` it adds `maxLevel`, the
deepest level the student may set. `accept`, `reject` and `incorrectFeedback` are private.
The [correct responses](../public-form.md#correct-responses) are the `[ordering]` block and each `## [accept]` section.


## Additional Rules

| Field                 | Level    | Code                         | Rule                                                              |
| --------------------- | -------- | ---------------------------- | ----------------------------------------------------------------- |
| lines                 | error    | schema-error                 | must have at least two lines, counted before normalization (schema) |
| lines[]               | error    | schema-error                 | each line must be a `[level, text]` pair (schema)                 |
| lines[]               | error    | schema-error                 | `level` must be a non-negative integer (schema)                   |
| lines, extra, accept, reject | error | schema-error              | a line text has no leading or trailing space or tab and no line break (schema) |
| lines, extra, accept, reject | error | empty-ordering-line      | with `content: text`, a line text must not be empty               |
| extra, accept, reject | error    | schema-error                 | when present, must have at least one entry (schema)               |
| accept, reject        | error    | schema-error                 | an alternative must have at least one line (schema)               |
| lines, accept         | error    | empty-ordering-answer        | must have at least one line after normalization; an empty `reject` is valid |
| lines, accept, reject | error    | schema-error                 | a line with an empty text must have the level 0 (schema)          |
| accept, reject        | error    | accept-reject-overlap        | the same lines must not be both accepted and rejected[^7]         |
| accept                | error    | accept-outside-answer-key    | must be a subset of the `[ordering]` block's lines, by line identity[^7] |
| lines, accept, reject | error    | invalid-outline-level        | with `content: text`, the first line is at level 0 and no line is more than one level deeper than the previous one[^8] |
| epilogue              | error    | detached-tag                 | a tag must not come after the epilogue started, see [Body tags](question-base.md#tags-after-the-epilogue-starts) |
| lines, extra, accept, reject | error | parse-error             | a list must not start on the line right after a `ul` content block, see [Lists after a content list](question-base.md#lists-after-a-content-list) |
| extra, accept, reject | error    | parse-error                  | must use the same content block type as `[ordering]`[^9]         |
| extra, accept, reject | error    | parse-error                  | a code fence must use the language of the `[ordering]` fence or none |
| extra                 | error    | parse-error                  | at most one `## [extra]` section may be declared                  |
| accept, reject        | error    | parse-error                  | a section carries at most one feedback and one comment block[^10]  |
| extra, accept, reject | error    | parse-error                  | only a section can follow a section; the epilogue goes before it  |
| lines                 | error    | parse-error                  | the `[ordering]:` block must start on the line right after its tag |
| lines                 | error    | parse-error                  | the tag must be `[ordering]:`, with a colon and no text after it  |
| extra, accept, reject | error    | parse-error                  | a section must have a content block                               |
| lines, extra, accept, reject | error | parse-error               | a list must be a `ul` at every level                              |
| lines, extra, accept, reject | error | parse-error               | an item must be exactly one line, and one paragraph: no heading, block quote, code or other block |
| lines, extra, accept, reject | error | parse-error               | a list item must have text, unless it holds a nested list         |
| {accept,reject}[].{feedback,comment} | error | blank-text        | if defined, must have at least one visible character              |
| content, highlight    | error    | invalid-frontmatter-field    | must not be in the frontmatter; the body sets them                |
| automation            | error    | invalid-frontmatter-field    | must not be in the frontmatter                                    |
| automation            | error    | schema-error                 | must not be a field of the YAML or JSON form                      |
| content               | error    | schema-error                 | is required in YAML and JSON (schema)                             |
| content               | error    | schema-error                 | must be a known content type (schema)                             |
| highlight             | error    | schema-error                 | must be omitted unless `content` is "code" (schema)               |
| highlight             | error    | schema-error                 | must not be empty (schema)                                        |
| incorrectFeedback     | error    | blank-text                   | if defined, must have at least one visible character              |
| indentation           | error    | schema-error                 | must be a known indentation mode (schema)                         |
| unmatched             | error    | schema-error                 | must be a known unmatched mode (schema)                           |
| normalizations        | error    | schema-error                 | must list known normalizations, each at most once (schema)        |
| accept, reject        | warning  | duplicate-alternative-lines  | two sections should not hold the same lines, fully normalized[^7] |
| accept                | warning  | accept-repeats-answer-key    | should not repeat the `[ordering]` block's own lines[^7]          |
| reject                | warning  | unreachable-alternative      | should not use lines the `[ordering]` and `extra` blocks lack, by line identity[^7] |
| indentation           | warning  | redundant-strict-indentation | `"strict"` is pointless when `dedent` is normalized away[^6]      |
| lines, extra          | info     | blank-ordering-line          | a line of a code block is blank and `skip-blanks` is not normalized |
| highlight             | info     | unknown-highlight-language   | is not a recognized language identifier[^5]                       |
| highlight             | info     | code-content-without-highlight | is not defined when `content` is "code"                         |
| reject                | info     | reject-without-feedback      | declares no feedback; it explains nothing to the student, and settles its ordering only under `unmatched: manual` |
| lines, extra          | info     | visually-identical-lines     | two lines render alike but differ in source[^11]                   |

The table lists diagnostics only, see
[Additional Rules](question-base.md#additional-rules). The shuffle of the
presented lines and the rules for responses (the pool, the levels) bind hosts and
graders, and have no row here.

[^5]: Any alias of a [Pygments](https://pygments.org/) lexer is a recognized
language identifier -- Pygments' own lexer aliases are the reference list.
[^6]: `dedent` flattens every line to level 0, so nothing is left for
`"strict"` to compare, and `"strict"` then grades exactly as `"lenient"`.
`indentation: "lenient"` implies `dedent` and therefore never combines with
`"strict"` in the first place.
[^7]: `accept-reject-overlap`, `duplicate-alternative-lines` and
`accept-repeats-answer-key` compare whole answers after all forms of
normalization: every entry of `normalizations`, plus what the `indentation`
field implies. The `[ordering]` block counts as an accepted answer for
`accept-reject-overlap`. `accept-outside-answer-key` and
`unreachable-alternative` check which lines a section uses, so they follow
[Line identity](#line-identity): under `"lenient"` and `"strict"` the level of
a line is not compared.
[^8]: In Markdown, an item that only holds a nested list adds a level without
    being a line, so `- a` followed by `- - - b` gives the levels 0 and 2, and
    `- - a` alone gives a first line at level 1. Both are errors. The rule is
    checked on the model, so it applies to YAML and JSON as well.
[^9]: A code block and a `ul` list cannot be compared line for line.
[^10]: They may appear in either order, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).
[^11]: Lines are compared by their raw markdown source, so a student ordering
the rendered text cannot tell such a pair apart.
