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

## Tokens

```lark
SLUG         : /[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*/
INTEGER      : /[1-9][0-9]*|0/
DECIMAL      : /([1-9][0-9]*|0)[.][0-9]+/
UNIT         : /[^()\[\]\t\n\v\f\r \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/
COMMENT_LINE : /#[^\r\n]*(\r\n|\r|\n)/
```

* `SLUG` is the format of question ids, choice ids, blank ids and exam slugs.
  Implementations MAY accept more characters under an option flag. See
  [Slug](../question-types/base.md#slug).
* `INTEGER` and `DECIMAL` have no sign and no leading zeros. The rules that use
  them add the sign.
* `UNIT` is a unit of measurement. It holds any character except
  `UNICODE_SPACE` and the brackets `(`, `)`, `[` and `]`. See
  [Unit conversion](../question-types/numeric.md#unit-conversion).
* `COMMENT_LINE` is one line of the comment string of the frontmatter. See
  [Frontmatter](../question-types/base.md#frontmatter).

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

### The `non-ascii-whitespace` lint

The grammar reads a Unicode space as text. Markdown parsers, editors and the
string functions of each language can read the same character as whitespace or
as a line break. The result of a document with Unicode spaces can therefore
change from one implementation to another. The lint code `non-ascii-whitespace`
reports each Unicode space in the document. For this check, a U+FEFF that is
not at the start of the file also counts as a Unicode space: it is invisible,
and JavaScript `\s` matches it.

The check skips:

* fenced and indented code blocks,
* code spans,
* the YAML frontmatter of the document, and of each question of an exam,
* a U+FEFF at the start of the file.

The severity is **warning** for:

* U+0085, U+2028 and U+2029 at any position. Many editors show them as line
  breaks.
* A Unicode space in a syntax position (see below).

The severity is **info** for all other Unicode spaces. Prose can use them on
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
