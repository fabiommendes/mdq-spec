# Patterns

A **pattern** is a string that says which responses it matches. Patterns are
the entries of the `accept`, `reject`, `preAccept` and `preReject` lists of a
[short answer](../question-types/short-answer.md) question and of a
[short answer blank](../question-types/fill-in.md#short-answer-blanks) of a
fill-in question. The same rules apply in the body and in the frontmatter.

## Pattern string

A pattern string is written in a mini-language. Read it in these steps,
in this order:

1. Remove the spaces and tabs from the start and from the end of the string.
   This applies to every pattern, so `"  `x`"` is the exact literal `x`.
2. The delimiters of the result choose how the pattern is matched:

   | Pattern       | Matched as                                                |
   | ------------- | --------------------------------------------------------- |
   | `` `...` ``   | an [exact literal](#exact-literals), with N backticks on each side |
   | `/.../flags`  | a [regular expression](#regular-expressions)              |
   | anything else | an [inexact literal](#inexact-literals)                   |

A pattern string is plain text, never markdown. Four rules limit it:

* It cannot be empty (`schema-error`).
* It MUST have a visible character, see
  [Visible characters](grammar.md#visible-characters). `"   "`, an exact
  literal of one space (`` ` ` ``) and a lone U+200B have none, and the error
  is `blank-text`. For an exact literal, the text between the backticks is
  checked, after the removal of one space at each end, see
  [Exact literals](#exact-literals). The rule holds for every pattern list, in the body and in the
  frontmatter, and for the blanks of a fill-in question.
* If it opens with a backtick, it MUST be a complete exact literal:
  `` `math.isnan` (x) `` is a `schema-error`, and so is ``` ``x` ```. In the
  Markdown body, the error is a `parse-error`. A pattern string never contains
  a line ending.
* An inexact literal MUST NOT start a CommonMark block other than a
  paragraph: a block quote, an ATX heading, a list item (`*`, `-`, `+`,
  `1.`), a fenced code block, an HTML block or a thematic break. `# Brasília`,
  `> x`, `- x`, `1. x`, `<div>` and a lone `*` are errors, in every form: YAML,
  JSON, frontmatter, the single-line tag and the blanks of a fill-in question.
  The error is `block-start-pattern`, and in a pattern item of the Markdown
  body it is a `parse-error`, see [Pattern items](#pattern-items). The message suggests
  an exact literal (`` `# Brasília` ``) or a regex. The rule reads the pattern
  after step 1, and holds only for an inexact literal: an exact literal and a
  regex never start a block. This keeps the Markdown and the YAML forms
  equivalent, so a question always has a list form.

A literal answer that starts with `/` MUST be enclosed in backticks, otherwise
it is read as a regex:

```md
Where is the `env` program in a Linux system?

[short-answer]: `/usr/bin`
```

Without the backticks, `/usr/bin` is the regex `usr` with the flags `b`, `i`
and `n`, because the last `/` closes the regex, see
[Regular expressions](#regular-expressions).

### Inexact literals

An inexact literal is matched **inexactly**. The comparison ignores case,
diacritics, invisible characters, the difference between typographic and ASCII
quotes and dashes, and the amount of whitespace.

Stripping diacritics accepts `Brasilia` for `Brasília`. The question's
`diacritics` field can turn it off, see [Diacritics](#diacritics).

An implementation MUST apply the steps below, in this order, to the pattern
and to the response. The pattern matches the response when the two results are
the same sequence of code points.

1. Normalize to NFKC.
2. Remove each ignorable code point: a code point in a range of the
   `ignorable` table.
3. Only if `diacritics` is `"fold"`: normalize to NFD, remove each code point
   in a range of the `nonspacing` table, normalize to NFC, and then replace each code
   point that is a key of the `letters` table with its value.
4. Replace each code point that is a key of the `punctuation` table with its
   value.
5. Replace each code point that is a key of the `caseFolding` table with its
   value, and then normalize to NFC.
6. Replace each sequence of `UNICODE_SPACE` code points with one U+0020, and
   remove a U+0020 from the start and from the end. `UNICODE_SPACE` is the
   class defined in [grammar.md](grammar.md#unicode-spaces).

A table replaces each code point of its input once. It does not apply again to
the text that a replacement gives.

The tables are in [inexact-tables.json](inexact-tables.json). The script
`scripts/inexact_tables.py` generates the file from fixed versions of Unicode
and of the CLDR, which the `unicode` and `cldr` keys record:

| Table         | Content                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `ignorable`   | Inclusive ranges `[first, last]` of code points: the C0 and C1 controls that are not in `UNICODE_SPACE`, and the code points with the Unicode property `Default_Ignorable_Code_Point` |
| `nonspacing`  | Inclusive ranges `[first, last]` of code points: the nonspacing marks, that is, the general category `Mn` of the Unicode version that the `unicode` key records |
| `letters`     | The Latin letters of the CLDR `Latin-ASCII` transform that have no decomposition, such as `ø` to `o` and `æ` to `ae` |
| `punctuation` | The quotes and dashes of the same transform, and U+2212 MINUS SIGN       |
| `caseFolding` | The full case folding of Unicode: the `C` and `F` mappings of `CaseFolding.txt` |

Some examples, with the default `diacritics`:

| Pattern        | Response                 | Result   | Step |
| -------------- | ------------------------ | -------- | ---- |
| `Brasília`     | `BRASILIA`               | match    | 3, 5 |
| `H2O`          | `H₂O`                    | match    | 1    |
| `Manaus`       | `Mana`, U+200B, `us`     | match    | 2    |
| `Ørsted`       | `Orsted`                 | match    | 3    |
| `Straße`       | `STRASSE`                | match    | 5    |
| `caixa d'água` | `caixa d’água`           | match    | 4    |
| `pau-brasil`   | `pau–brasil`             | match    | 4    |
| `Rio Negro`    | `Rio`, U+00A0, `Negro`   | match    | 1, 6 |
| `Rio Negro`    | `Rio`, U+001F, `Negro`   | no match | 2    |
| `Brasília-DF`  | `Brasília DF`            | no match |      |

U+001F is a control and not a space: step 2 removes it, and the response
becomes `RioNegro`. Punctuation other than the quotes and dashes of the
`punctuation` table is significant.

The normalization forms come from the Unicode data of the implementation.
Unicode does not change them for a code point that is already assigned, so two
implementations can differ only for a code point that one of them does not
know. The general category is not stable in this way: the category of an
assigned code point can change between versions of Unicode. For this reason,
an implementation MUST use the `nonspacing` table and not the general category
of its runtime, and it MUST use the `caseFolding` table and not the case
folding of its runtime.

### Diacritics

The `diacritics` field selects how inexact literals treat diacritics:

* `"fold"` is the default. It strips diacritics from both the pattern and the
  response before comparing them, so an inexact `Brasília` accepts `Brasilia`.
* `"keep"` preserves them, so an inexact `Brasília` no longer accepts
  `Brasilia`. It skips step 3 of the inexact comparison and no other step, so
  `í` written as one code point and as `i` plus a combining acute still
  compare equal, and `Straße` still accepts `STRASSE`.

The field applies to the inexact literals of every pattern list: `accept`,
`reject`, `preAccept` and `preReject`, in the body or in the frontmatter. It
does not apply to other patterns. A backtick-enclosed literal is already
compared verbatim, a regex uses its own `n` flag instead (see
[Regex flags](#regex-flags)).
Case folding and whitespace normalization are unaffected either way.

A [short answer](../question-types/short-answer.md#diacritics) question and a
[fill-in](../question-types/fill-in.md#frontmatter) question declare the field.
In a fill-in question, it applies to all of its short answer blanks.

### Exact literals

A pattern enclosed in backticks is matched **exactly**. The literal follows the
code span of CommonMark:

* A run of N backticks opens the literal. The first run of exactly N backticks
  after it closes it, and it MUST end the pattern (after the spaces and tabs
  that step 1 of [Pattern string](#pattern-string) removes).
* A run of another length inside the literal is text. This is the way to write
  a backtick.
* If the text between the two runs starts and ends with a space, and is not
  only spaces, one space is removed from each end.
* The opening run MUST be followed by text on the same line, and the closing
  run MUST follow text on its line. In the body, a literal that opens at the
  end of a line, or whose closing run starts a continuation line, is a
  `parse-error`. Line endings in a literal exist for word wrap. Opening or
  closing at a line ending would need a rule on whether the space at the edge
  is removed. A pattern string of the YAML, JSON and frontmatter form has no
  line ending, so the rule is already met there.

| Pattern             | Exact literal |
| ------------------- | ------------- |
| `` `math.isnan` ``  | `math.isnan`  |
| ``` `` `date` `` ```  | `` `date` `` |
| ``` ``a`b`` ```     | `` a`b ``     |
| ```` ```a``b``` ```` | ``` a``b ``` |
| ``` `` ` `` ```    | `` ` ``       |

A pattern that opens with a backtick and is not a complete literal is a
`schema-error`: ``` ``x` ``` has no closing run of two backticks. In the
Markdown body it is a `parse-error` instead, as the grammar of the body does
not match it.

An implementation MUST apply these steps to the text of the literal, as
defined above, and to the response, and then compare the two results
literally -- code point for code point:

1. Normalize to NFC.
2. Remove the `UNICODE_SPACE` code points from the start and from the end.

Case, interior whitespace and punctuation are all significant, so
`` `math.isnan` `` accepts neither `Math.isnan` nor `math . isnan`.

Trimming the ends is required because leading and trailing whitespace cannot be
represented reliably in markdown.

The normalization is required for a similar reason. A document saved in NFD
and the same document saved in NFC are indistinguishable to a reader, and which
one an editor or input method produces is not something an author or a student
controls. The form is NFC and not NFKC: `` `fim` `` does not accept the
ligature `ﬁm`.

### Regular expressions

Read a pattern string with the steps of [Pattern string](#pattern-string),
which remove the spaces and tabs from both ends first. Then:

1. The pattern is a regex if the result starts with `/`.
2. The **last** `/` of the result closes the regex. The text between the first
   and the last `/` is the regex body.
3. The text after the last `/` is the flags. The [Regex flags](#regex-flags)
   section says which flags are valid. No flags is valid.
4. A result with only one `/` has no closing `/`. It is an unclosed regex, and
   the error is `invalid-regex`.
   The grammar of the [short answer body](../question-types/short-answer.md#body)
   rejects it too, and a grammar failure on a pattern that starts with `/` is
   reported as `invalid-regex`.

An unescaped `/` in the body is valid, so `/a/b/` has the body `a/b` and no
flags, and `/https?://www\.gov\.br/` has the body `https?://www\.gov\.br`.
Authors write URLs and paths often, and the escape `\/` would make them hard
to read. The same rule explains the `/usr/bin` example above: the last `/`
closes the regex, so the body is `usr` and the flags are `bin`.

This differs from a JavaScript regex literal, where an unescaped `/` ends the
body. An implementation MUST NOT use a JavaScript literal parser to split the
body from the flags. It MUST find the last `/` of the string. The escape `\/`
in the body stays valid and means a `/`.

The syntax of the body is described in the [Regex](#regex) section.

## Pattern lists

A pattern list is an array of patterns: the `accept` and `reject` lists are
set by body blocks in Markdown, and the `preAccept` and `preReject` lists by
the frontmatter. In YAML and JSON all four are fields.
The order of the entries matters for feedback, see
[Feedback](../question-types/short-answer.md#feedback).

### Object form

In the YAML and JSON form and in the frontmatter (`preAccept` and
`preReject`), each entry is either a pattern string or an object. A body block
has no object form, see [Pattern items](#pattern-items):

```json
{ "pattern": "string", "feedback": "string", "comment": "string" }
```

Only `pattern` is required. `feedback` is shown by the selection rule of
[Feedback](../question-types/short-answer.md#feedback): the first pattern that
matches and has feedback, in the list that decided the outcome. A `preAccept`
or `preReject` pattern follows
[Pre-validation](../question-types/short-answer.md#pre-validation). `comment`
is a note to other instructors.

### Pattern items

In the body, a pattern list is a markdown unordered list. Each item holds one
pattern:

* The first line of the item is the **pattern line**. It holds the pattern
  string.
* Lines that start with `>` are the feedback.
* Lines that start with `!` are the comment.

An item carries at most one feedback block and at most one comment block, in
either order. Both follow the rules of
[Feedback and comment lines](grammar.md#feedback-and-comment-lines).

The content of the item MUST start a paragraph in CommonMark. If it starts a
block quote, an ATX heading, a list, a fenced or indented code block, an HTML
block or a thematic break, the item is a `parse-error`, as for a
[choice item](choices.md). The item `* > Brasília` is a block quote, not the
pattern `> Brasília`. The message suggests an exact literal: `` * `> Brasília` ``.
A pattern is plain text, so `\#` is the pattern `\#` and not `#`. The
single-line form (`[short-answer]: > Brasília`) is a `block-start-pattern` for the same
reason, see [Pattern string](#pattern-string).

```lark
pattern_item : ws? content nl (blank_line* observations)?
```

The rule starts after the list marker and its padding, as the grammar of any
list item does, see
[Content of a list item](grammar.md#content-of-a-list-item).

The `content` rule is the one of the
[short answer body](../question-types/short-answer.md#body), with its
continuation lines. It has three forms: `exact`, `regex` and `inexact`. The `observations` and `blank_line` rules are defined in
[Feedback and comment lines](grammar.md#feedback-and-comment-lines). A short
answer blank of a [fill-in](../question-types/fill-in.md#short-answer-blanks)
question uses the same rule.

```md
[short-answer/reject]:
* Rio de Janeiro
  > It used to be, but it is not anymore.
  ! Capital until 1960.
```

### Continuation lines

The pattern, the feedback and the comment of an item can each take more than
one line:

* A line that starts with `>` belongs to the feedback.
* A line that starts with `!` (but not `![`) belongs to the comment.
* Any other line continues the part that the line before it belongs to. A
  line after the pattern line continues the pattern, and a line after a
  feedback line continues the feedback.
* A blank line ends the part before it. After it, only the feedback or the
  comment can start. Any other line is a `parse-error`.
* A line that starts with a tag (a reserved label and a colon, such as
  `[short-answer/reject]:`) is not a continuation line: it is a `parse-error`.
  Write a blank line before the tag.
* A setext underline (a line of only `=` or only `-` characters, with up to
  three spaces of indentation and optional trailing spaces and tabs) right
  after the lines of the pattern is a `parse-error`: in CommonMark it turns
  the pattern lines into a heading. After a feedback or comment line it is
  continuation text, because a setext underline cannot continue a block quote
  by laziness.

To join the lines of the pattern, an implementation replaces each line
ending, together with the indentation of the next line, with one U+0020. The
feedback and the comment join as
[Feedback and comment lines](grammar.md#feedback-and-comment-lines) defines,
which gives the same result for lines without a hard line break.

```md
[short-answer/reject]:
* Rio de
  Janeiro
  > It used to be, but
  > it is not anymore.
  ! Capital until 1960,
  when Brasília replaced it.
```

This item has the pattern `Rio de Janeiro`, the feedback
`It used to be, but it is not anymore.` and the comment
`Capital until 1960, when Brasília replaced it.`

The content of a single-line block continues with the same lazy lines. The
rules are:

* A line that is not a `>` line, a `!` line or a blank line, and that does not
  start a block that interrupts a paragraph (a `LAZY_START` line, see
  [Feedback and comment lines](grammar.md#feedback-and-comment-lines))
  continues the content. It does so up to the first blank line. This holds
  also after a tag line with a colon and no text: the line after
  `[short-answer]:` is the content, and the line after
  `[short-answer/reject]:` is its pattern.
* A line that starts with `>`, or with `!` (but not `![`) and has up to three
  spaces of indentation, right after the
  content, or right after a tag line with a colon and no text, is a
  `parse-error`. With four or
  more columns of indentation the line is continuation text. The message suggests the list form: `* pattern`
  with the `>` or `!` lines indented under it.
* A list item right after the content is a `parse-error`.
* A line that starts with a tag (a reserved label between brackets and a colon,
  such as `[short-answer/reject]:`) right after the content or after a pattern
  line is a `parse-error`: `LAZY_START` excludes it. The message says to put a
  blank line before the tag. Another link reference definition, such as
  `[ibge]: https://www.ibge.gov.br`, continues the content.
* A setext underline right after the content (`[short-answer]: Rio` followed
  by `===`), also after its continuation lines, is a `parse-error`: in
  CommonMark the tag line would become a heading, so there would be no
  definition. The same holds for the tag line of a fill-in short answer blank.
* An ATX heading, a fenced code block, an HTML block or a thematic break
  right after the content ends the block. It goes to the epilogue, as in
  CommonMark.

For example, `[short-answer]: Rio` followed by a line with `Negro` is the
pattern `Rio Negro`, and `[short-answer]:` followed by a line with `Brasília`
is the pattern `Brasília`.

A `>` or `!` line is not feedback or a comment here. The single-line form has
no container that holds observations, as the item of a list does. A blank
line before the `>` line would not help: the block quote would then be
ambiguous with a block quote of the epilogue. The list form gives each
pattern its own container.

A pattern is plain text, so a backslash or two spaces at the end of a line are
part of the pattern and do not make a hard line break. The space that replaces
a line ending is significant in an [exact literal](#exact-literals) and in a
[regex](#regex). Authors SHOULD write those on one line, and the warning
`multi-line-pattern` reports the ones that do not. An
[inexact literal](#inexact-literals) ignores the amount of whitespace, so a
line ending does not change it and it has no warning.

The blocks that hold these lists, and the single-line form, are described in
the [short answer body](../question-types/short-answer.md#body).


## Regex

A regex body is a subset of the JavaScript syntax with the `u` flag, followed
by optional flags (which might differ from JavaScript). The subset is the
closed table below: a body is valid only if every construct of it is a row of
the table. A construct that is not in the table is an `invalid-regex`, also
when JavaScript or Python accepts it. The reason for the subset is
portability: a body that follows the table has the same meaning in every
engine, so an implementation checks the body against the table and then
compiles it, as JavaScript with the `u` flag or as Python after a translation.

The `/` delimiters are REQUIRED: they are what marks a pattern as a regex
rather than a literal string, in a pattern line and in a frontmatter
`pattern-list` alike. The last `/` of the pattern closes the regex, see
[Regular expressions](#regular-expressions).

### Supported constructs

| Kind       | Construct                    | Meaning                                                       |
| ---------- | ---------------------------- | ------------------------------------------------------------- |
| Atom       | a code point that is not a syntax character | that code point. The syntax characters are `\` `^` `$` `.` `*` `+` `?` `(` `)` `[` `]` `{` `}` `\|`. `/` is not one |
| Atom       | `.`                          | any code point except U+000A, U+000D, U+2028 and U+2029, see [Code point mode](#code-point-mode) |
| Escape     | `\` and a syntax character, or `\/` | that character                                         |
| Escape     | `\t` `\n` `\v` `\f` `\r`     | U+0009, U+000A, U+000B, U+000C and U+000D                     |
| Escape     | `\xHH`                       | the code point with two hex digits                            |
| Escape     | `\uHHHH`                     | the code point with four hex digits. A value from `D800` to `DFFF` (a surrogate) is an `invalid-regex` |
| Escape     | `\u{H...}`                   | the code point with one to six hex digits, at most `10FFFF`. A surrogate (`D800` to `DFFF`) is an `invalid-regex` |
| Shorthand  | `\d` `\D` `\w` `\W` `\s` `\S` | see [Shorthand classes](#shorthand-classes)                  |
| Class      | `[items]`, `[^items]`        | one code point that is, or is not, in the items. At least one item is REQUIRED |
| Class item | a code point other than `\` and `]` | that code point. `[` is a literal here                 |
| Class item | an escape of this table, `\-`, or `\b` | the escape of its row. `\-` is U+002D and `\b` is U+0008 |
| Class item | `\d` `\D` `\w` `\W` `\s` `\S` | the shorthand class                                          |
| Class item | `first-last`                 | the code points from `first` to `last`. Both are one code point or an escape, and `first` is not after `last` |
| Group      | `(...)`, `(?:...)`           | a capturing group, and a non-capturing group                  |
| Alternation | `a\|b`                      | `a` or `b`. Any side can be empty                             |
| Quantifier | `*` `+` `?`                  | zero or more, one or more, zero or one                        |
| Quantifier | `{n}` `{n,}` `{n,m}`         | `n` times, `n` or more, `n` to `m` times. `n` and `m` are ASCII digits and `n` is not greater than `m` |
| Quantifier | a quantifier and `?`         | the lazy form of the quantifier                               |
| Assertion  | `^` `$`                      | the start and the end of the response, see [Semantics](#semantics) |
| Assertion  | `\b` `\B`                    | a word boundary, and a position that is not one               |
| Assertion  | `(?=...)` `(?!...)`          | positive and negative lookahead                               |

These edge rules complete the table:

* `{` is valid only as the first character of a complete quantifier. A `{` that
  does not open one (`/negro{/`, `/ne{,3}gro/`) is an `invalid-regex`. Write
  `\{` for the character. A `}` and a `]` outside a class are also invalid:
  write `\}` and `\]`.
* A quantifier follows an atom, a class or a group. It does not follow another
  quantifier (except the `?` of the lazy form), an assertion, the start of the
  body, `(`, or `|`. So `/ne++gro/` and `/ne*+gro/` (possessive quantifiers)
  are invalid, and `/ne+?gro/` is a lazy quantifier.
* In a class, `]` always closes the class, even as the first item. `[]` and `[^]`
  are invalid, and the code point `]` is written `\]`. A `-` is a literal when
  it is the first or the last item of the class, or when it follows a range.
  Between two items it makes a range: `[a-z]` is a range, and `[a-]` and
  `[-a]` are not. `\-` is a literal `-` in every position of a class, and it is invalid
  outside a class.
* A shorthand class is not the end of a range: `[a-\d]` and `[\d-z]` are
  invalid. `[\d-]` is valid.
* In a class, `&&` is an `invalid-regex`: it is the class intersection
  operator of other dialects, for example `/[a-z&&[^aeiou]]/`. To put two
  ampersands in a class, write one of them as `\x26`: `[&\x26]`. Outside a
  class, `&&` is two literal ampersands (`\x26\x26` is the same).
* An escape that is not in the table is an `invalid-regex`. This includes the
  escapes that JavaScript with `u` accepts, such as `\0`, a backreference
  (`\1`, `\k<name>`) and `\cA`, `\p{...}` and `\P{...}`; and the escapes that
  only Python has, such as `\A`, `\Z` and `\a`. A letter or a digit after `\`
  is never an identity escape.
* A group construct that is not `(`, `(?:`, `(?=` or `(?!` is an
  `invalid-regex`. This includes named groups (`(?<name>...)` and
  `(?P<name>...)`), lookbehind (`(?<=...)` and `(?<!...)`), atomic groups
  (`(?>...)`), inline modifiers (`(?i:...)`) and comments (`(?#...)`).
* An unbalanced `(` or `)` is an `invalid-regex`.
* A `\uHHHH` or `\u{...}` escape of a surrogate (`D800` to `DFFF`) is an `invalid-regex`,
  and so is the escape pair `\uD83D\uDE00`. Write the character `😀` or
  `\u{1F600}`.

### Semantics

These rules say how a valid body matches:

* anchor delimiters (`^`/`$`): are supported and optional. All regular
  expressions are implicitly anchored at both ends, so `^` and `$` are not
  required. For example, the regex `/abc/` in MDQ is equivalent to `/^abc$/` in
  JavaScript and would not match `xabc` or `abcx`. The `f` and `b` flags remove
  implicit anchors -- see [Regex flags](#regex-flags) -- but an anchor the
  author wrote is always honored, so `/^abc/f` still matches only at the
  start.
* Character class intersections are NOT supported, see the edge rules above.
  Other character classes are supported, including negated classes, e.g.,
  `/[^aeiou]/`.
* Shorthand classes are fixed explicit classes, see
  [Shorthand classes](#shorthand-classes).
* Unicode: a regex runs in [code point mode](#code-point-mode). Unicode
  characters are allowed in the regex. Write the character directly, when
  possible.

### Code point mode

An implementation MUST match a regex over code points, as JavaScript does with
the `u` flag:

* `.` matches one code point, except the four line terminators of JavaScript:
  U+000A LINE FEED, U+000D CARRIAGE RETURN, U+2028 LINE SEPARATOR and U+2029
  PARAGRAPH SEPARATOR. An emoji is one character, so `/./` accepts `😀` and
  `/../` does not. U+0085 NEXT LINE, U+000B and U+000C are not line terminators
  here, so `.` matches them. An implementation whose engine reads `.`
  differently MUST translate it to the class `[^\n\r\u2028\u2029]`.
* `i` uses the simple case folding of Unicode. `/s/i` accepts `ſ` (U+017F) and
  `/k/i` accepts U+212A KELVIN SIGN. The shorthand classes below fold like any
  other class, as in JavaScript with `ui`: `/\w/i` accepts `ſ` and U+212A, and
  `\b` folds in the same way.
* `\u{1F600}` is one code point.

A JavaScript implementation MUST compile every regex with the `u` flag.

### Shorthand classes

Python and JavaScript disagree on `\d`, `\w`, `\s` and `\b`. Python reads `\d`
as any decimal digit of Unicode (`٣` is one) and `\s` differs from JavaScript
on U+0085, U+001C to U+001F and U+FEFF. To give the same result in every
runtime, an implementation MUST read the shorthand classes as the explicit
classes below. They apply inside a character class too, so `[\d_]` is
`[0-9_]`.

| Escape    | Class                                                        |
| --------- | ------------------------------------------------------------ |
| `\d`, `\D` | `[0-9]` and its complement                                   |
| `\w`, `\W` | `[A-Za-z0-9_]` and its complement                            |
| `\s`, `\S` | `UNICODE_SPACE` and its complement                           |
| `\b`, `\B` | a word boundary, and a position that is not one, both defined by `\w` (and folded by `i` as `\w` is) |

`UNICODE_SPACE` is the class of
[grammar.md](grammar.md#unicode-spaces): 25 code points, without U+FEFF. A
complement matches any code point outside the class, including a code point
that is not a letter or a digit. In a character class, a shorthand class MUST
NOT be the end of a range: `[a-\d]` is an `invalid-regex`.

A consequence is that `/\w+/` does not accept `José`, because `é` is not in
`[A-Za-z0-9_]`. Use the `n` flag (`/\w+/n`), which strips the diacritics of the
response first, or an explicit class such as `[A-Za-zÀ-ÿ]`.

U+FEFF is not in `UNICODE_SPACE`, so `/a\sb/` does not accept `a`, U+FEFF, `b`.
Only the [regex subject](#regex-subject) steps trim the ends, and they trim
`UNICODE_SPACE` only.

This dialect is not the one the MDQ grammar itself uses. See
[Regex dialect](grammar.md#regex-dialect).


### Regex subject

An implementation MUST prepare the response in these steps, in order, before
it matches a regex against it:

1. Normalize to NFC.
2. Remove the `UNICODE_SPACE` code points from the start and from the end.
3. If the `n` flag is set, strip the diacritics, see [Regex flags](#regex-flags).

These are the two steps of an [exact literal](#exact-literals), followed by
the `n` flag. The regex then matches the result. Interior whitespace is not
changed, so `/Rio Negro/` does not accept `Rio  Negro`, and a regex that
needs it can use `\s+`.

The reason is that whitespace at the ends of a response and the NFC or NFD
form depend on the keyboard and the operating system of the student, not on
the answer. An author who needs specific spaces at the ends can ask for the
answer in string notation, such as `" a "`, and match the quotes.


### Regex flags

Matching is **case-sensitive by default**; `i` turns that off. A regex, like an
exact literal, gets none of the normalizations of an
[inexact literal](#inexact-literals): case, diacritics, interior whitespace,
invisible characters, quotes and dashes are all significant, unless a flag
says otherwise. A regex says exactly what it matches, so it gets no implicit
leniency.

The following regex flags are supported:

* `i`: Case-insensitive matching.
* `n`: Strip diacritics. To strip is to normalize to NFD, remove each code
  point in a range of the `nonspacing` table, and normalize to NFC. The flag strips:
  * the response, after the steps of the [regex subject](#regex-subject);
  * the literal characters of the regex body, so `/água/n` accepts `agua` and
    also accepts `água`.

  The flag does not strip an escape that denotes a code point: `\uXXXX`,
  `\xXX` and `\u{...}`. Such an escape is always that exact code point. No
  other escape changes meaning either, so `\.` stays a literal dot.

  The `letters` table of the [inexact comparison](#inexact-literals) does not
  apply, because a replacement such as `æ` to `ae` changes what a regex means.
  The flag is independent of the question's `diacritics` field, which never
  reaches a regex.

  An author who writes a code point has a specific intent, and the flag must
  not change it. The consequence is that an escape for a code point that the
  strip changes (a combining mark, or a letter such as U+00E1) cannot match
  the stripped response. An implementation reports it with the info lint
  `unmatchable-regex-escape`. It is info and not a warning because the escape
  is harmless inside a class such as `[\u00E1a]`, where `a` still matches.
* `f`: Substring (find) matching. Removes both implicit anchors, so the pattern
  matches anywhere in the response.
* `b`: Beginning matching. Removes the implicit trailing anchor, so the response
  matches when the pattern matches a prefix of it.

`f` and `b` differ only in the leading anchor, and combining them is the same
as `f` alone. Neither removes an anchor written by the author: under `f`,
`/^abc/` still matches only at the start and `/abc$/` only at the end.

The following flags are accepted, but ignored: `m`, `g`, `s`, `u`, `v`, `y`,
`d`. Implementations MUST accept the input, and MAY report those stale flags
(`ignored-regex-flag`, info). The `u` and `v` flags have no effect because the
[code point mode](#code-point-mode) is always on. Note that `s` (dotAll) is ignored rather than honored, so `.` never
matches one of the four line terminators of [Code point mode](#code-point-mode);
a response spanning lines should be matched with an explicit class such as
`[\s\S]`.

Any other flag is an error, and so is a flag that appears more than once:
`/brasil/x` and `/brasil/ii` are both invalid regexes.
