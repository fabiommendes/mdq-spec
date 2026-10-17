# Common grammar rules

The grammar snippets in [exam.md](../exam.md) and in the
[question types](../question-types/) use the
[Lark](https://github.com/lark-parser/lark) format. This document defines the
rules and terminals that several snippets share. A snippet that uses them does
not define them again.

## Regex dialect

Python, JavaScript and JSON Schema do not agree on the shorthand classes `\s`,
`\w` and `\d`. JavaScript `\s` matches U+FEFF and Python `\s` does not. Python
`\s` matches U+0085 and U+001C to U+001F, and JavaScript `\s` does not. If the
grammar used `\s`, the same document would parse differently in each
implementation.

The terminals of this spec use only explicit character classes. Each class
below matches the same characters in Python `re`, in JavaScript `RegExp` and in
a JSON Schema `pattern`.

One terminal is an exception: `LETTER` is defined by Unicode General_Category,
which Python `re` does not support, see [Tokens](#tokens). A snippet uses the
name and does not define it.

This rule is about the grammar of MDQ. The regexes that authors write in
short-answer patterns follow the subset of JavaScript defined in
[patterns.md](patterns.md#regex).

## Whitespace and line endings

```lark
ws : /[ \t]+/
nl : /\r\n|\r|\n/
```

`ws` matches spaces and tabs only. `nl` matches the three line endings of
CommonMark. Implementations MUST NOT split lines on other characters. For
example, Python `str.splitlines()` also splits on U+000C, U+0085 and U+2028, so
it does not read MDQ lines correctly.

The last line of a file can end without a line ending. Implementations read
it as if it ended with `nl`.

Where the grammar expects `ws` or `nl`, every other character is text. After
`[short-answer]:`, a U+00A0 followed by `Brasília` is the answer U+00A0
`Brasília`, and not the answer `Brasília`.

A U+FEFF at the start of a file is a byte order mark. Implementations MUST
remove it before they parse the file.

### Start and end of a block

CommonMark removes only spaces and tabs from the start and the end of a
paragraph. Some Markdown parsers remove more. markdown-it, for example, removes
every character that the host language calls whitespace: `str.strip()` in
Python and `String.prototype.trim()` in JavaScript.

When a rule starts with `ws?` at the start of a block, implementations MUST
read the source text and accept only spaces and tabs there. A paragraph that
starts with U+00A0 followed by `[short-answer]: Brasília` is text. It is not a
short-answer tag.

### Content of a list item

The grammar of a list item, such as a choice or a pattern item, applies to the
content of the item as CommonMark gives it: after the removal of the list
marker and its padding. The `ws?` at the start of the item, and before the
marker of a feedback or comment line, stands for the indentation that
CommonMark allows there: at most three spaces, with a tab expanded to the next
multiple of four columns. More indentation makes the line code, or a
continuation line, as in CommonMark.

```md
*      [x] Rio
* [ ] Santos
```

With five or more spaces after the list marker, the content of the first item
is an indented code block, so the item is not a choice and the list is not a
choice list.

## Tokens

```lark
SLUG         : /[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*/
INTEGER      : /[1-9][0-9]*|0/
DECIMAL      : /([1-9][0-9]*|0)[.][0-9]+/
UNIT         : /[^()\[\]\t\n\v\f\r \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/
COMMENT_LINE : /#[^\r\n]*(\r\n|\r|\n)/
CHOICE_ID    : /\[[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*\](?![(\[])/
```

* `SLUG` is the format of question ids, choice ids, blank ids and exam slugs.
  Implementations MAY accept more characters under an option flag. See
  [Slug](../question-types/question-base.md#slug).
* `INTEGER` and `DECIMAL` have no sign and no leading zeros. The rules that use
  them add the sign.
* `UNIT` is a unit of measurement. It holds any character except
  `UNICODE_SPACE` and the brackets `(`, `)`, `[` and `]`. See
  [Unit conversion](../question-types/numeric.md#unit-conversion).
* `COMMENT_LINE` is one line of the comment string of the frontmatter. See
  [Frontmatter](../question-types/question-base.md#frontmatter).
* `LETTER` is one code point whose Unicode General_Category is `Lu`, `Ll`,
  `Lt` or `Lo`. It is not `Lm` (modifier letters, such as `ˇ` and `ー`), `Nl`
  (`〇`), `Nd`, `So` or `Sm`. This is the only terminal that no explicit
  character class can express, so it is an exception to the
  [regex dialect](#regex-dialect): the snippets use the name without a
  definition. The Unicode version is recent, and implementations use the tables
  of their own platform. Two implementations MAY disagree on a letter that a
  recent version of Unicode assigned.
* `CHOICE_ID` is a `SLUG` between square brackets, at the start of a choice
  item, right after its value (see [Choice lists](choices.md)). Where the grammar of the item accepts a
  `CHOICE_ID`, a bracket that matches it is always the choice id, and never
  part of the choice text. A bracket followed by `(` or `[` does not match: it
  starts a markdown link (`[text](url)`, `[text][ref]`) and is part of the
  text. For a choice text that starts with a shortcut reference link, write it
  as a collapsed one: `[brasilia][]`.

## Feedback and comment lines

Several bodies attach feedback for the student and a comment for other
instructors to an element: a choice of a [choice list](choices.md) (multiple
choice, multiple selection and true/false), a choice of a fill-in
[choice blank](../question-types/fill-in.md), a [pattern item](patterns.md#pattern-items)
and a section of [ordering](../question-types/ordering.md). All of them use
the rules below.

```lark
observations  : feedback (blank_line* comment)?
              | comment (blank_line* feedback)?
feedback      : feedback_line (feedback_line | lazy_line)*
comment       : comment_line (comment_line | lazy_line)*
feedback_line : ws? ">" ws? md_inline* nl
comment_line  : ws? COMMENT_MARK ws? md_inline* nl
lazy_line     : ws? LAZY_START md_inline* nl
blank_line    : ws? nl

COMMENT_MARK  : /!(?!\[)/
LAZY_START    : /(?!>|!(?!\[)|[*+-][ \t]|1[.)][ \t]|#{1,6}([ \t]|(?=[\r\n]))|`{3}|~{3}|(\*[ \t]*){3,}(?=[\r\n])|(-[ \t]*){3,}(?=[\r\n])|(_[ \t]*){3,}(?=[\r\n]))[^ \t\r\n]/
```

`md_inline` is any markdown inline element except a line ending.
`LAZY_START` is the first character of a lazy line. It is not a feedback or
comment marker, and it does not start a block that interrupts a paragraph: a
bullet list item, an ordered list item that starts with `1`, an ATX heading, a
fenced code block or a thematic break. An HTML block also interrupts a
paragraph; the terminal does not test it.

A `feedback` block is a CommonMark block quote. A `comment` block follows the
same rules, with `!` in place of `>`. MDQ adds the `!` block; CommonMark does
not define it. The rules are:

* **Marker.** A `>` line is a feedback line, and a `!` line is a comment line.
  The `ws` after the marker is optional, as in CommonMark. Before the marker,
  the line can have up to three spaces of indentation, relative to the content
  of the list item that holds it. With four or more, the line is not a
  feedback or comment line.
* **Images.** A line that starts with `![` is not a comment line: `![` starts a
  markdown image. A comment that starts with `[` needs a space after the
  marker: `! [IBGE](https://www.ibge.gov.br)`.
* **Empty marker lines.** A line with only the marker, such as `>`, is part of
  the block. As in a block quote, it separates two paragraphs of the block.
* **Lazy lines.** A line without a marker continues the block before it, as a
  CommonMark lazy continuation line. This applies only if the line is not
  blank and does not start a block that interrupts a paragraph: a list item, a
  fenced code block, an ATX heading, a thematic break, an HTML block, a
  feedback line or a comment line.
* **Blank lines.** A blank line ends the block. Blank lines MAY separate the
  element from its first block, and the two blocks from each other.
* **One block of each kind.** An element has at most one feedback block and
  at most one comment block, in either order. A second block of the same kind
  is a `parse-error`. This is also true when a blank line separates the two
  blocks, or when a block of the other kind is between them.

The value of a block is its lines, each without the marker and the `ws` after
it, and a lazy line without the `ws` at its start. The lines join into one
string as markdown joins the lines of a paragraph:

* A soft line break, with the `ws` before it and the indentation of the next
  line, becomes one U+0020.
* A hard line break (two or more spaces, or a backslash, at the end of the
  line) keeps its line ending, and the spaces or the backslash before it.
* An empty marker line becomes a blank line, which separates two paragraphs.

```md
* [ ] Nile
  > The Amazon is larger
  by water volume.
  >
  > Its length is still debated.
```

The feedback of this choice is `The Amazon is larger by water volume.`, a
blank line, and `Its length is still debated.`

## Unicode spaces

```lark
UNICODE_SPACE : /[\t\n\v\f\r \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/
```

`UNICODE_SPACE` is the Unicode `White_Space` property: 25 code points. `UNIT`
and the `TAG` of the exam [query language](../exam.md#include-all) exclude
these characters.

A **Unicode space** is a character of `UNICODE_SPACE` outside ASCII. That is,
every character of the class except tab, line feed, vertical tab, form feed,
carriage return and space.

### Visible characters

A **visible character** is a character that is not in `UNICODE_SPACE` and
whose Unicode general category is not `Cc` (control) or `Cf` (format). U+200B,
U+00AD and U+FEFF are format characters, so a string of only these characters
has no visible character. Rules such as `blank-text` use this definition.

### The `non-ascii-whitespace` lint

The grammar reads a Unicode space as text. Markdown parsers, editors and the
string functions of each language can read the same character as whitespace or
as a line break. The result of a document with Unicode spaces can therefore
change from one implementation to another. The lint codes
`non-ascii-whitespace` and `non-ascii-whitespace-in-prose` report each Unicode
space in the document. Each code has one severity. For this check, a U+FEFF that is
not at the start of the file also counts as a Unicode space: it is invisible,
and JavaScript `\s` matches it.

The check skips:

* fenced and indented code blocks,
* code spans,
* the YAML frontmatter of the document, and of each question of an exam,
* a U+FEFF at the start of the file.

The code is `non-ascii-whitespace`, with severity **warning**, for:

* U+0085, U+2028 and U+2029 at any position. Many editors show them as line
  breaks.
* A Unicode space in a syntax position (see below).

The code is `non-ascii-whitespace-in-prose`, with severity **info**, for all
other Unicode spaces. Prose can use them on
purpose: a U+00A0 between a number and its unit (`10 km`), or a U+202F as a
digit group separator (`6 400`).

A Unicode space is in a **syntax position** when it is:

* at the start of a line: before it, there are only spaces, tabs, Unicode
  spaces, list markers (`*`, `+`, `-`, `1.`, `1)`), heading markers (`#`) and
  the line prefixes `>` and `!`;
* at the end of a line: after it, there are only spaces, tabs and Unicode
  spaces;
* on a tag line: a line that starts with a bracketed tag followed by `:`, such
  as `[numeric]:`, `[short-answer]:` or `[^capital/short-answer]:`, including
  the answer after the colon;
* in the bracketed tags at the start of a line and in the spaces after them,
  such as `[*] [ipe]` in a choice item or `[Q1]` before a stem;
* in the first line of an item of an `accept` or `reject` pattern list.
