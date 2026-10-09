# Ordering

Ordering questions ask the student to sort a list of textual lines according
to some criteria.

The lines in the `[ordering]` block are ALWAYS written in the correct order:
the block is the answer key. Students are never shown that order --
implementations MUST present the lines shuffled, in a random or pseudo-random
arrangement, together with any distractors declared in the `## [extra]`
section.

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


## Frontmatter

Ordering questions accept the following extra arguments in the
frontmatter:

| Field          | Type            | Description                                                                |
| -------------- | --------------- | -------------------------------------------------------------------------- |
| type           | "ordering"      | The type discriminator.                                                    |
| content        | string          | Either "code" or "text". Inferred from the body when omitted[^1].          |
| highlight      | string          | Programming language of "code" content. Inferred from the body[^2].        |
| indentation    | Indentation     | Whether students may change the indentation of each line[^3].              |
| unmatched      | Unmatched       | What happens to a response no answer key matches[^4].                      |
| normalizations | Normalization[] | Transformations applied before comparing responses to the answer keys[^5]. |

[^1]: `content = "code" | "text"`. Both fields are OPTIONAL, and when given
they override what the body implies. See [body](#body) for how the value is
inferred.

[^2]: Ignored when `content` is not "code", as in [essay](essay.md).

[^3]: `Indentation = "fixed" | "lenient" | "strict"`. `"fixed"` (the default)
presents each line with the indentation it was authored with and does not let
the student change it. `"lenient"` lets the student change indentation, but
ignores it when grading -- it implies the `dedent` normalization. `"strict"`
lets the student change indentation and takes it into account when grading.

[^4]: `Unmatched = "manual" | "incorrect"`. `"manual"` (the default) leaves a
response that matches no answer key ungraded, for the instructor to score by
hand. `"incorrect"` scores it 0. A response that does match an answer key is
graded automatically either way, so this field decides nothing else. See
[grading](#grading).

[^5]: `Normalization = "dedent" | "skip-blanks"`. Defaults to the empty list. A
single normalization MAY be written as a bare string instead of a one-item
list, exactly as `tags` allows in [base](question-base.md#frontmatter); like `tags`,
that is a frontmatter spelling only, and the parsed document always holds a
list. The list is a set: order carries no meaning and an entry MUST NOT repeat.


## Body

The body consists of an `[ordering]` tag followed either by a code block or a
markdown `ul` element holding the lines to be ordered. The `content` and
`highlight` frontmatter fields are inferred from this block when they are not
declared, and a declared value wins.

The body has a very simple grammar:

```lark
ordering : "[" "ordering" "]" nl content section*
content  : md_code_block | md_ul

section : ordering_extra | ordering_accept | ordering_reject

ordering_extra  : "##" ws "[" "extra" "]" nl+ content
ordering_accept : "##" ws "[" "accept" "]" nl+ observations? content
ordering_reject : "##" ws "[" "reject" "]" nl+ observations? content

observations : feedback nl* comment? nl*
             | comment nl* feedback? nl*

feedback : (ws? ">" ws? md_inline* nl)+
comment  : (ws? "!" ws? md_inline* nl)+
```

`md_code_block`, `md_ul` and `md_inline` are respectively markdown
representations of fenced code blocks, unordered lists and inline markdown. The
rules `ws` and `nl` are defined in [Common grammar rules](../references/grammar.md).

If the block following the `[ordering]` tag is a fenced code block, the
question infers `content: "code"`, and the fence's language, if any, becomes
`highlight`.

If it is a `ul` list, the question infers `content: "text"`. Each line is
derived from the respective list item, preserving its markdown source verbatim.
An item is exactly one line: an item with a continuation line or a second
paragraph is an error (`parse-error`), whatever the rendered markdown shows.
That source is what a response is compared against, so two lines that render
identically but are written differently -- `*emphasis*` and `_emphasis_`, say
-- are two distinct lines. Implementations SHOULD raise an info-level notice
when a question holds such a pair, since a student ordering the rendered text
cannot tell them apart.

Each line carries an indentation level -- a non-negative integer, not a count
of spaces -- derived as described in [indentation](#indentation). Two lines
with the same text and the same level are the same line, and a question MAY
repeat one: duplicates are shown to the student as that many separate copies
to be ordered.

The sections below follow the content block directly. The epilogue, if any,
comes after the last section; prose between the block and a section is an
error (`parse-error`).

The body can also contain additional sections that specify extra lines,
alternative answers or known incorrect answers with feedback. These sections
are placed after the `[ordering]` block.


### Extra lines

There can be at most one `## [extra]` section following the main `[ordering]`
block and it must use the same content block type (code block or `ul` list).
The highlight of fenced code blocks is ignored.

Its lines are distractors: they are shuffled in among the answer key's lines
and MUST NOT appear in a correct response. A distractor MAY repeat a line of
the `[ordering]` block; that simply hands the student spare copies of a line
they do need, and a correct response still uses it exactly as many times as
the `[ordering]` block does.


### Accepted/rejected answers

The accept/reject blocks start with a `## [accept]` or `## [reject]` header,
followed by optional observations and the content block. As before, the content
block must be of the same type as the main `[ordering]` block, but repeated
sections are allowed. A question SHOULD NOT declare two sections whose content
blocks hold the same lines once **all forms of normalization** have been
applied -- every entry of `normalizations`, plus whatever the `indentation`
field implies -- and MUST NOT declare an accepted and a rejected section whose
content blocks hold the same lines after that same normalization.

The optional feedback message is provided in a markdown blockquote. The
observation part MAY also contain instructor comments. It uses a syntax similar
to blockquote sections, but prefixes each line with a `!` instead of a `>`.

A section carries at most one feedback block and at most one comment block, in
either order. They MUST NOT interleave: once both blocks have appeared, a further `>` or
`!` line is a `parse-error`.

Some markdown parsers accept indented blockquotes like below

```md
> Some
 > spurious
  > indentation
   > in the
    > blockquote

    > This is an indented code block. Confused?
```

It is up to the implementation to decide if it should ignore the indentation,
issue a warning or even an error. Implementations MUST always accept blockquotes
with no indentation. Regardless of how implementations handle indentation,
they MUST handle comment blocks `!` in the same way.

Authors SHOULD avoid indenting blockquotes and comment blocks with spaces.


## Indentation

The `indentation` field controls whether the student can change the indentation
of the lines in the response and whether it is taken into account for grading:

* `"fixed"` (the default): each line keeps the indentation it was authored
  with and the student cannot change it. The level is part of what identifies
  a line, so two lines with the same text at different levels are different
  lines, and a distractor may differ from a line of the answer key by its
  level alone.
* `"lenient"`: the student may change indentation freely, but it is ignored
  when grading. This implies the `dedent` normalization, whether or not
  `normalizations` lists it.
* `"strict"`: the student may change indentation, and it is compared like the
  rest of the line.

Indentation levels take part in the comparison under `"fixed"` and
`"strict"`; only `dedent`, listed or implied by `"lenient"`, removes them.

The **indentation unit** is inferred from the lines of the question. It
considers all lines in the `[ordering]`, `## [extra]`, `## [accept]` and
`## [reject]` blocks, normalizes a tabulation as 4 spaces, and takes the
greatest common divisor of the leading whitespace of every non-blank line that
is indented at all. Non-indented lines contribute a 0 and are therefore left
out, which keeps the divisor greater than zero.

If no indented line exists, the unit is 4 spaces.

A line's **indentation level** is its leading whitespace divided by that unit,
and that level -- not the raw whitespace -- is what a response carries and
what `"strict"` compares.


## Normalizations

The following normalizations can be applied before comparing a response to an
answer key:

- `dedent`: flattens every line to indentation level 0, so that indentation
  takes no part in the comparison. It does not keep the relative indentation
  of the lines: `dedent` removes all of it, not only the part the lines share.
- `skip-blanks`: ignores blank lines.

Normalizations apply to BOTH sides of the comparison: the student's response
and every answer key (the `[ordering]` block and every `## [accept]` and
`## [reject]` section alike). They never alter what is presented to the
student, only what is compared.

`indentation: "lenient"` implies `dedent`, since indentation the student is
free to change cannot also decide the grade.


## Feedback

A response that matches an accepted or a rejected answer shows that section's
feedback, if it declares one. The `[ordering]` block itself carries no
feedback syntax, and neither does `## [extra]`.

Implementations MAY supply a generic message when the matched section declares
no feedback -- a "Congratulations!" for the answer key or an accepted answer,
and an equivalent notice for a rejected one. A response left for manual
grading shows no feedback, since nothing has decided it yet.

Instructor comments (`!` lines) are never shown to students.


## Grading

Grading compares the response to the answer keys **by content**: lines carry no
id, so a line is identified by its text -- its raw markdown source, when the
content is a `ul` list -- and by its indentation level, unless `dedent` is in
effect (listed in `normalizations`, or implied by `indentation: "lenient"`).
Repeated lines are compared in the order they appear, so a question with
duplicates accepts exactly as many copies as it declares.

After all forms of normalization:

* A response matching the `[ordering]` block or any `## [accept]` section is
  correct, with a score of `1`.
* A response matching any `## [reject]` section is incorrect, with a score of
  `0`.

If no answer key matches, the outcome depends on `unmatched`:

* `"manual"` (the default): the response is pending, exactly as a response to
  an [essay](essay.md) or to a `manual` [short answer](short-answer.md) is.
  It has no score until the instructor supplies one.
* `"incorrect"`: the response is incorrect, with a score of `0`.

The score is always binary -- `1` or `0`, with no partial credit for a nearly
correct ordering.

### Automation

The [automation](question-base.md#automation) of an ordering question follows
`unmatched`: `automatic` with `"incorrect"`, and `semi-automatic` with
`"manual"`, because the answer key always settles the responses that match it.
It is a derived property and never a field of the document.


## Response

The response to an ordering question is the list of lines the student
submitted, in the order they submitted them, each written as an
`[indentation level, text]` pair. See
[responses](../responses.md#ordering) for the full shape.


## Additional Rules

| Field                 | Level    | Code                         | Rule                                                              |
| --------------------- | -------- | ---------------------------- | ----------------------------------------------------------------- |
| lines                 | critical | schema-error                 | must have at least two lines (schema)                             |
| lines[]               | critical | schema-error                 | each line must be a `[level, text]` pair (schema)                 |
| lines[]               | critical | schema-error                 | `level` must be a non-negative integer (schema)                   |
| accept, reject        | critical | schema-error                 | an alternative must have at least one line (schema)               |
| accept, reject        | critical | accept-reject-overlap        | the same lines must not be both accepted and rejected[^9]         |
| extra, accept, reject | critical | parse-error                  | must use the same content block type as `[ordering]`[^6]          |
| extra                 | critical | parse-error                  | at most one `## [extra]` section may be declared                  |
| accept, reject        | critical | parse-error                  | a section carries at most one feedback and one comment block[^7]  |
| content               | critical | schema-error                 | must be a known content type (schema)                             |
| indentation           | critical | schema-error                 | must be a known indentation mode (schema)                         |
| normalizations        | critical | schema-error                 | must list known normalizations, each at most once (schema)        |
| highlight             | warning  | ignored-highlight            | must be omitted unless `content` is "code"                        |
| accept, reject        | warning  | duplicate-alternative-lines  | two sections should not hold the same lines, fully normalized[^9] |
| accept                | warning  | accept-repeats-answer-key    | should not repeat the `[ordering]` block's own lines              |
| indentation           | warning  | redundant-strict-indentation | `"strict"` is pointless when `dedent` is normalized away[^8]      |
| lines, extra          | info     | blank-ordering-line          | a line should not be blank unless `skip-blanks` is normalized     |
| highlight             | info     | unknown-highlight-language   | should be a recognized language identifier[^11]                   |
| reject                | info     | reject-without-feedback      | should declare feedback, which is its whole purpose               |
| lines, extra          | info     | visually-identical-lines     | two lines should not render alike while differing in source[^10]  |

[^6]: A code block and a `ul` list cannot be compared line for line.
[^7]: They may appear in either order but MUST NOT interleave, see
[accepted/rejected answers](#acceptedrejected-answers).
[^8]: `dedent` flattens every line to level 0, so nothing is left for
`"strict"` to compare, and `"strict"` then grades exactly as `"lenient"`.
`indentation: "lenient"` implies `dedent` and therefore never combines with
`"strict"` in the first place.
[^9]: All forms of normalization: every entry of `normalizations`, plus what
the `indentation` field implies.
[^10]: Lines are compared by their raw markdown source, so a student ordering
the rendered text cannot tell such a pair apart.
[^11]: Any alias of a [Pygments](https://pygments.org/) lexer is a recognized
language identifier -- Pygments' own lexer aliases are the reference list.
