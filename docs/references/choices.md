# Choice lists

The body of a [multiple choice](../question-types/multiple-choice.md),
[multiple selection](../question-types/multiple-selection.md) or
[true/false](../question-types/true-false.md) question is a **choice list**:
an unordered list whose every item is a choice. A
[choice blank](../question-types/fill-in.md) of a fill-in question uses the
same items. This document defines what these lists share. Each question type
defines the `value` rule of its items, the field that records the verdict of a
choice, when feedback is shown, and how the question is graded.

## Choice marker

```lark
CHOICE_MARK : /\[[^\]\r\n]*\](?![(\[])/
```

A **choice marker** is the bracket at the start of the content of a list item.
It holds any text without a `]` or a line ending, and it is not followed by `(`
or `[`. A bracket followed by `(` or `[` starts a markdown link
(`[text](url)`, `[text][ref]`), as for `CHOICE_ID` (see
[Tokens](grammar.md#tokens)). A shortcut reference link, `[IBGE]`, is a choice
marker: write it as a collapsed one, `[IBGE][]`, to keep it a link.

An unordered list is a choice list when every item starts with a choice
marker, after the `ws` the item allows (see
[Content of a list item](grammar.md#content-of-a-list-item)). The text in the
marker is the **value** of the choice. The type of the question comes from the
values (see [type inference](../question-types/question-base.md#type-inference)),
and every value MUST then belong to the `value` rule of that type
(`foreign-choice-marker`).

The **normalized value** of a choice is its value after two steps: NFKC
normalization, then ASCII lowercase (`A` to `Z` only, with no other case
folding). The parser applies them to the value of every choice marker, in
every choice list, before it infers the type of the question. The order is
always the same: normalize, then validate, then interpret. Type inference, the
`value` rules of each type (`foreign-choice-marker`) and the meaning of the
value all use the normalized value. The written text is never checked
against the `value` rule. So `[Ｘ]` (U+FF38) is `x`, `[＊]` is `*` and `[Ｆ]`
(U+FF26) is `f`. A type that keeps the written letter (`marker` in
[true/false](../question-types/true-false.md#choices)) keeps the original
character.

The `ws` of the `value` rule is read on the normalized value. A character
whose NFKC form is a space (U+00A0, U+2003, U+3000) is therefore `ws` here, so
`[` U+00A0 `]` is the same as `[ ]`: an unchecked choice. The marker is the
only place of MDQ where a non-ASCII space acts as `ws` (see
[Start and end of a block](grammar.md#start-and-end-of-a-block)). The
`non-ascii-whitespace` warning still applies to it, because the space is in a
syntax position.

The empty marker, `[]`, is a `parse-error`. It is almost always a mistyped
`[ ]`, and the message of the error can say so.

A list of links is not a choice list, and it is valid in the stem and in
the epilogue:

```md
Use the data of these institutes:

* [IBGE](https://www.ibge.gov.br)
* [INPE](https://www.inpe.br)

Which of these cities are state capitals?

* [x] Manaus
* [ ] Santos
```

## Item

Each item of a choice list follows the grammar:

```lark
item      : ws? "[" value VALUE_END ws? (CHOICE_ID ws?)? md_inline* nl lazy_line* (blank_line* observations)?
VALUE_END : /\](?![(\[])/
```

`value` is defined by each question type. `md_inline` represents any markdown
inline element except new lines (which are represented explicitly by `nl`).
The rules `ws`, `nl`, `lazy_line`, `blank_line`, `observations` and the
terminal `CHOICE_ID` are defined in [Common grammar rules](grammar.md). The
choice text continues on the `lazy_line`s after its first line, so a `>` or
`!` line always ends it, see
[Feedback and comment lines](grammar.md#feedback-and-comment-lines).

A bracket right after the value that matches `CHOICE_ID` is always the choice
id. In `* [x] [brasilia]`, `brasilia` is the id and the text is empty, which is
a `blank-text` error.

Each choice may carry additional information besides its text.

```md
* [value] [choice-id] Choice text
  > Feedback text to the students.
  ! Comments to other instructors.
```

The feedback and the comment are optional, and each can span several lines.
When present, each MUST have at least one visible character (`blank-text`).
They follow the rules of
[Feedback and comment lines](grammar.md#feedback-and-comment-lines):
a line without a marker continues the block before it, a blank line ends it,
and a line that starts with `![` is an image, not a comment.

```md
* [value] [choice-id] Choice text
  > Multi
  > line
  > feedback.
  ! Comments to other instructors.
  ! Another line of comments.
```

An item holds only the first paragraph (with its lazy lines), the feedback and
the comment. Any other block in an item is a `parse-error`. This covers:

* a second paragraph, after a blank line;
* a nested list;
* a code block;
* text after the feedback or the comment, separated from it by a blank line.

````md
* [x] Amazonas

  A second paragraph is a `parse-error`.
* [ ] Nilo
  * A nested list is a `parse-error`.
* [ ] Madeira
  ```sh
  ls -la
  ```
* [ ] Negro
  > Feedback.

  Text after the feedback is a `parse-error`.
````

Write a code span (`` `ls` ``) inside the first paragraph instead.

## AST

Each item becomes one object of the `choices` list in the AST. The question
type adds the field that records the verdict of the choice (`score` in
multiple choice, `correct` in multiple selection and true/false).

| Field      | Source in the item                                                  |
| ---------- | ------------------------------------------------------------------- |
| `text`     | The text of the item (see below).                                   |
| `id`       | The `CHOICE_ID`, without the brackets. Absent if the item has none. |
| `feedback` | The value of the `feedback` block (see below). Absent if none.      |
| `comment`  | The value of the `comment` block (see below). Absent if none.       |

The `text` is the source of the item after the removal of the value, the
choice id, the `ws` after them, the feedback and the comment. Its lines join
as the lines of a paragraph, and so do the lines of the `feedback` and
`comment` blocks, see
[Feedback and comment lines](grammar.md#feedback-and-comment-lines).

## Choice text

The choice text MUST NOT be empty. And all choice texts MUST be unique. Two
texts are the same when they are equal after each run of whitespace outside
code spans is replaced by one space (`duplicate-choice-text`).
Implementations MAY report choices that have different textual representations,
but that are visually identical when rendered to HTML
(`visually-identical-choices`). It is out of the scope of this document to
define visual equivalence of markdown snippets, but we point to some obvious
cases:

```md
* [ ] [a] foo bar
* [ ] [b] foo  bar
* [ ] [c] `foo bar`
* [ ] [d] `foo  bar`
* [ ] [e] *foo bar*
* [ ] [f] _foo bar_
```

In the example, `a` and `b` are duplicates (spaces are not meaningful in a
markdown paragraph context), but `c` and `d` are not, since spaces are
meaningful in a code span. `e` and `f` are not duplicates, but they are visually
identical. `b` and `c` are visually different, but depending on formatting and
the rendering system they might still appear equivalent to a human reader.

## Choice id

The choice id is a slugified identifier for the choice so we can refer to it by
content, and not by position. It matches the `CHOICE_ID` and `SLUG` terminals of
[Tokens](grammar.md#tokens). If given, the choice ids for each choice MUST be unique
(`duplicate-choice-id`).

The id is not mandatory. Implementations MAY report a choice without an id,
at the `info` level (`missing-choice-id`). An implementation MAY derive url-safe identifiers from
the text content when it needs an
[addressable](../responses.md#addressability) document; but it is not part of
the parse step itself. This transformation
SHOULD be stable in practical applications, although there might be edge cases
where it cannot be guaranteed.

Derived ids are NOT portable. The spec gives no algorithm, so two
implementations, or two versions of one implementation, can derive different
ids from the same text. A host SHOULD write the derived ids into the document
(make it addressable) before it collects responses, and grade those responses
against the document with the ids. A response with an id that the question does
not have is rejected, see [Addressability](../responses.md#addressability). A stable assignment should preserve the choice id
assignments for the following operations:

* **Reordering of choices:** each choice preserves its original id.
* **Addition of new choices:** existing choices preserve their original ids.
* **Removal of choices:** if a choice is removed, the remaining ones should keep
  their previous ids.
* **Editing of feedback or comments:** any edit (inclusion, deletion or
  modification) to the feedback and comments of a choice keeps its id.

Since the transformation from an *arbitrary string* of text to a *url-safe
string* is inherently lossy, it is generally not possible to preserve those
properties for all cases if we want practical slugs. For instance:

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
  > that it might also be larger by length by quite a margin.
* [ ] Mississippi
  > Not even close!
* [ ] Yellow River
```
