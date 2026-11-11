# Rubric items

A **rubric** is the list of items that decides the score of a question. A
**rubric item** is one criterion, with a value in relative points, that test
cases or the instructor apply. A [code](../question-types/code.md) question
declares its items in two places: the `## [rubric]` section, in a list, and the
[annotations](../question-types/code.md#annotations) of its test sources, in
comment lines. Both places use the item syntax of this document. Each type that
uses a rubric defines where the items are, what each modifier does and how the
score comes out of the items.

## Item

```lark
rubric_item     : (RUBRIC_VALUE ws?)? (modifier ws?)* criterion
modifier        : "{" MODIFIER_NAME "}"
criterion       : CRITERION_START md_inline*

RUBRIC_VALUE    : /\[[+-]?([1-9][0-9]*|0)([.][0-9]+)?\](?![(\[])/
MODIFIER_NAME   : /[a-z]+(-[a-z]+)*/
CRITERION_START : /(?!\{)(?!>)(?!!(?!\[))(?!\[(?![^\[\]\r\n]*\][(\[]))[^ \t\r\n]/
```

The rule `ws` is defined in [Common grammar rules](grammar.md). `md_inline` is
any markdown inline element except a line ending. A rubric item has four parts,
in this order: an optional value, optional modifiers, the criterion and, on the
lines that follow, optional feedback and comment.

```md
[+3] {example} Pass the examples of the statement
```

The item above has the value 3, the modifier `example` and the criterion
`Pass the examples of the statement`.

## Value

The value is a number between square brackets, with no space inside them. It
is the `RUBRIC_VALUE` terminal: an optional sign (`+` or `-`) and a required
number, an `INTEGER` or a `DECIMAL` (see [Tokens](grammar.md#tokens)). A value
has no exponent. It is the form of the `percent` value of a
[multiple choice](choices.md) choice, without the `%`.

| Written      | Value | Kind                                    |
| ------------ | ----- | --------------------------------------- |
| `[3]`, `[+3]` | 3    | credit                                  |
| `[2.5]`      | 2.5   | credit                                  |
| `[-2]`       | -2    | discount                                |
| `[0]`        | 0     | counts for nothing, see the type        |
| not written  | 1     | credit                                  |

`[3]` and `[+3]` are the same value, and `[-0]` is `[0]`. A bracket followed by
`(` or `[`, such as `[3](https://example.com)`, starts a markdown link and is
not a value, as for a [choice marker](choices.md#choice-marker). The values of
a rubric are **relative points**: the type normalizes them by the sum of the
positive values, so the scale is the choice of the author.

## Modifiers

A modifier is a lower case name between braces, with no space inside them. The
modifiers come after the value and before the criterion, one for each pair of
braces, with optional spaces between them. A `{` that follows the value or a
modifier always starts a modifier: a criterion that starts with `{` writes
`\{`.

| Modifier  | Place                              | Meaning                                              |
| --------- | ---------------------------------- | ---------------------------------------------------- |
| `manual`  | an item of `## [rubric]`           | The instructor applies the item. This is its binding. |
| `public`  | an annotation of a test source     | The student sees the test cases of the region and runs them before the submission. |
| `example` | an annotation of a test source     | Implies `public`. The host also shows the cases of the region in the stem. |

A name that is not in the table is an error (`invalid-rubric-item`). So is a
modifier in the wrong place, and a modifier that repeats in one item.
`{public}` with `{example}` is valid, and the same as `{example}` alone. The
**binding** of an item says what applies it. An item of the `## [rubric]`
section MUST have the binding `{manual}`: an item with no binding is an error.
An item of a test source needs none: the test cases of its region apply it.

## Criterion

The criterion is the text of the item, as markdown inline elements. It MUST
have at least one visible character (`blank-text`). The first character
decides some cases:

* A `{` starts a modifier, see [Modifiers](#modifiers).
* A `>`, or a `!` not followed by `[`, is the start of a feedback or comment
  line, so a criterion does not start with them. Escape the character
  (`\>`) to write one.
* A `[` is an error (`invalid-rubric-item`), unless it starts an inline, full
  or collapsed link: `[text](url)`, `[text][ref]` or `[text][]`. A bracket
  that is a malformed value, such as `[ 3 ]`, `[3,5]` or `[50%]`, would give
  the item the value 1 and a criterion with the bracket, so it is an error. A
  `[slug]` is an error too: it is the place of an item id, which a later
  version of MDQ can use. A shortcut reference (`[ref]`) is not a link here. A
  criterion that starts with a literal bracket writes `\[`, as in `\[3,5] x`.

The item has no id in this version. The host identifies an item by its place
in the document, see the type.

## Feedback and comment

An item can carry feedback for the student and a comment for other
instructors. Both follow the rules of
[Feedback and comment lines](grammar.md#feedback-and-comment-lines): an item
has at most one feedback block and at most one comment block, in either order,
each with at least one visible character (`blank-text`). Where the lines go
depends on the place of the item: in a list item they follow the item as in a
[choice](choices.md#item), and in an annotation each line has its own `mdq:`
marker. Whether and when the student sees the feedback is a policy of the host.

## AST

A rubric item of a list is an object with these fields. They are the fields of
a [choice](choices.md#ast), with `value` and `binding` in place of the field
that records the verdict.

| Field      | Source in the item                                                       |
| ---------- | ------------------------------------------------------------------------ |
| `value`    | The number of the value. Absent if the item has no value: it is 1.       |
| `binding`  | The binding modifier: `manual`.                                          |
| `text`     | The criterion, without the value, the modifiers and the `ws` after them. |
| `feedback` | The value of the feedback block. Absent if none.                         |
| `comment`  | The value of the comment block. Absent if none.                          |

The other modifiers are not fields of a list item: they are valid only in an
annotation, which is part of the text of a test source.
