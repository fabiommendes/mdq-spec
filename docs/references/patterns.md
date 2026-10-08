# Patterns

A **pattern** is a string that says which responses it matches. Patterns are
the entries of the `accept`, `reject`, `preAccept` and `preReject` lists of a
[short answer](../question-types/short-answer.md) question and of a
[short answer blank](../question-types/fill-in.md#short-answer-blanks) of a
fill-in question. The same rules apply in the body and in the frontmatter.

## Pattern string

A pattern string is written in a small mini-language. Its delimiters choose
how it is matched:

| Pattern       | Matched as                                                |
| ------------- | --------------------------------------------------------- |
| `` `...` ``   | an [exact literal](#exact-literals)                       |
| `/.../flags`  | a [regular expression](#regular-expressions)              |
| anything else | a plain literal, compared [inexactly](#inexact-literals)  |

A pattern string is plain text, never markdown. It cannot be empty.

A literal answer that starts with `/` MUST be enclosed in backticks, otherwise
it is read as a regex:

```md
Where is the `env` program in a Linux system?

[short-answer]: `/usr/bin`
```

Without the backticks, `/usr/bin` is the regex `usr` with the flags `b`, `i`
and `n`.

### Inexact literals

A plain literal is matched **inexactly**. The comparison ignores case,
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
   of the general category `Mn`, normalize to NFC, and then replace each code
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

The normalization forms and the general category come from the Unicode data of
the implementation. Unicode does not change them for a code point that is
already assigned, so two implementations can differ only for a code point that
one of them does not know. The tables do not have this problem. For this
reason, an implementation MUST use the `caseFolding` table and not the case
folding of its runtime.

### Diacritics

The `diacritics` field selects how plain literals, the ones compared inexactly,
treat diacritics:

* `"fold"` is the default. It strips diacritics from both the pattern and the
  response before comparing them, so an inexact `Brasília` accepts `Brasilia`.
* `"keep"` preserves them, so an inexact `Brasília` no longer accepts
  `Brasilia`. It skips step 3 of the inexact comparison and no other step, so
  `í` written as one code point and as `i` plus a combining acute still
  compare equal, and `Straße` still accepts `STRASSE`.

The field applies to the plain literals of every pattern list: `accept`,
`reject`, `preAccept` and `preReject`, in the body or in the frontmatter. It
does not apply to other patterns. A backtick-enclosed literal is already
compared verbatim, a regex uses its own `n` flag instead (see
[Regex flags](#regex-flags)).
Case folding and whitespace normalization are unaffected either way.

A [short answer](../question-types/short-answer.md#diacritics) question and a
[fill-in](../question-types/fill-in.md#frontmatter) question declare the field.
In a fill-in question, it applies to all of its short answer blanks.

### Exact literals

A pattern enclosed in backticks is matched **exactly**. An implementation MUST
apply these steps to the declared answer and to the response, and then compare
the two results literally -- code point for code point:

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

A pattern is a regex if it starts with a `/` after stripping spaces and tabs.
A regex must be closed by a `/` as well, and may include optional flags after
the closing `/`. The syntax and the flags are described in the [Regex](#regex)
section.

## Pattern lists

A pattern list is an array of patterns, in the frontmatter or in a body block.
The order of the entries matters for feedback, see
[Feedback](../question-types/short-answer.md#feedback).

### Object form

In the frontmatter, each entry is either a pattern string or an object:

```json
{ "pattern": "string", "feedback": "string", "comment": "string" }
```

Only `pattern` is required. `feedback` is shown to the student whose response
the pattern decided, and `comment` is a note to other instructors.

### Pattern items

In the body, a pattern list is a markdown unordered list. Each item holds one
pattern:

* The first line of the item is the **pattern line**. It holds the pattern
  string.
* Lines that start with `>` are the feedback.
* Lines that start with `!` are the comment.

An item carries at most one feedback block and at most one comment block, in
either order. They MUST NOT interleave.

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
* A line that starts with `!` belongs to the comment.
* Any other line continues the part that the line before it belongs to. A
  line after the pattern line continues the pattern, and a line after a
  feedback line continues the feedback.
* A blank line inside the item is ignored.

To join the lines of a part, an implementation removes the `>` or `!` marker
and the `ws` after it, and replaces each line ending, together with the
indentation of the next line, with one U+0020.

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

The content of a single-line block continues in the same way. The lines after
the tag line, up to the first blank line, continue the pattern:
`[short-answer]: Rio` followed by a line with `Negro` is the pattern
`Rio Negro`.

A pattern is plain text, so a backslash or two spaces at the end of a line are
part of the pattern and do not make a hard line break. The space that replaces
a line ending is significant in an [exact literal](#exact-literals) and in a
[regex](#regex). Authors SHOULD write those on one line.

The blocks that hold these lists, and the single-line form, are described in
the [short answer body](../question-types/short-answer.md#body).


## Regex

Regex patterns follow a subset of the JavaScript syntax, followed by optional
flags (which might differ from JavaScript). The `/` delimiters are REQUIRED:
they are what marks a pattern as a regex rather than a literal string, in a
pattern line and in a frontmatter `pattern-list` alike. This section describes
the supported regex syntax and semantics, and the differences from the
JavaScript syntax.

The restrictions below are intended to make the regex more portable across
different programming languages and select a good subset of the JavaScript regex
syntax that is widely supported.

* anchor delimiters (`^`/`$`): Are supported and optional. All regular
  expressions are implicitly anchored at both ends, so `^` and `$` are not
  required. For example, the regex `/abc/` in MDQ is equivalent to `/^abc$/` in
  JavaScript and would not match `xabc` or `abcx`. The `f` and `b` flags remove
  implicit anchors -- see [Regex flags](#regex-flags) -- but an anchor the
  author wrote is always honoured, so `/^abc/f` still matches only at the
  start. 
* Character class intersections: are NOT supported. Example:
  `/[a-z&&[^aeiou]]/`. This is an invalid MDQ regex. Other character classes are
  supported, including negated classes, e.g., `/[^aeiou]/`.
* Special characters: are supported, including `\d`, `\D`, `\s`, `\S`, `\w`, and
  `\W` and have the same semantics as in JavaScript.
* Non-capturing groups: are supported, e.g., `/(?:abc)/`, but python-style 
  named groups are NOT supported, e.g., `/(?P<name>abc)/`.
* Unicode: Unicode characters are allowed in the regex. Unicode escape sequences 
  are also supported, e.g., `ሴ`, but users SHOULD NOT assume UTF-16 encoding
  and surrogate pairs should not be relied upon. Write the unicode character 
  directly in the regex, when possible.
* Standard hex escaping is supported, e.g., `\x12`, but other more obscure
  escape sequences MAY NOT be supported, e.g., `\cA`, `\123`, `\p{...}`,
  `\P{...}`, `\k<name>`.
* Positive and negative lookahead assertions are supported, e.g., `/(?=abc)/` and
  `/(?!abc)/`, but positive and negative lookbehind assertions are NOT supported,
  e.g., `/(?<=abc)/` and `/(?<!abc)/`.

This dialect is not the one the MDQ grammar itself uses. See
[Regex dialect](grammar.md#regex-dialect).


### Regex flags

Matching is **case-sensitive by default**; `i` turns that off. This is the one
place where the default differs from a bare `[short-answer]` answer, which is
compared inexactly and therefore ignores case. A regex says exactly what it
matches, so it gets no implicit leniency.

The following regex flags are supported:

* `i`: Case-insensitive matching.
* `n`: Strip diacritics from both the pattern and the response before
  matching: normalize to NFD, remove each code point of the general category
  `Mn`, and normalize to NFC. The `letters` table of the
  [inexact comparison](#inexact-literals) does not apply, because a
  replacement such as `æ` to `ae` changes what a regex means. Independent of
  the question's `diacritics` field, which never reaches a regex.
* `f`: Substring (find) matching. Removes both implicit anchors, so the pattern
  matches anywhere in the response.
* `b`: Beginning matching. Removes the implicit trailing anchor, so the pattern
  matches any prefix of the response.

`f` and `b` differ only in the leading anchor, and combining them is the same
as `f` alone. Neither removes an anchor written by the author: under `f`,
`/^abc/` still matches only at the start and `/abc$/` only at the end.

The following flags are accepted, but ignored: `m`, `g`, `s`, `u`, `v`, `y`,
`d`. Implementations MAY warn about those stale flags, but SHOULD accept the
input. Note that `s` (dotAll) is ignored rather than honoured, so `.` never
matches a newline; a response spanning lines should be matched with an explicit
class such as `[\s\S]`.

Any other flag is an error, and so is a flag that appears more than once:
`/brasil/x` and `/brasil/ii` are both invalid regexes.
