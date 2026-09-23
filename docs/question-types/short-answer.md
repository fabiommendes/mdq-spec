# Short answer

## Example

Short answer questions expect a short textual response.

```md
What is the capital of Brazil?

[short-answer]: Brasília
```

By default, the matching is **inexact**: it ignores case, strips diacritics,
and normalizes whitespace by replacing `/\s+/` with a single space and removing
any whitespace from the start and end.

Stripping diacritics accepts `Brasilia` for `Brasília`. This is deliberate: a
short answer question asks whether the student knows the answer, not whether
they typed the accent, and on many keyboards and phone layouts the accented
form is the harder one to produce. It also subsumes the encoding problem, since
`í` written as one code point and as `i` plus a combining acute both reduce to
`i`.

Some questions do want the accent, though -- a spelling exercise, or a question
about orthography itself. Those set `diacritics: keep` in the frontmatter, or
demand an exact answer with backticks. See [Diacritics](#diacritics).

A short answer question may demand an exact response by enclosing it in
backticks:

```md
Which **Python** function is used to check if a number is NaN?

[short-answer]: `math.isnan`
```

It is also possible to declare more complex rules by specifying precisely which
strings are accepted and which ones are rejected, including using regular
expressions.

```md
What is the capital of Brazil?

[short-answer/accept]:
* /[Bb]ras[íi]lia/i
  > Good call!

[short-answer/reject]:
* Buenos aires
  > That's the capital of Argentina!
  ! Bare strings are normalized as described above.
* Rio de Janeiro
  > It used to be, but it is not anymore.
* Brasilia
  > You forgot the accent on the "i".
  ! If an accept and reject rule match the same string, the accept rule takes precedence.
  ! Hence this item is a no-op.
* *
  > Sorry, that is not the correct answer.
```


## Frontmatter

Short answer questions accept the following extra arguments in the
frontmatter

| Field      | Type           | Description                                |
| ---------- | -------------- | ------------------------------------------ |
| type       | "short-answer" | The type discriminator                     |
| accept     | pattern-list   | Patterns of correct answers [^1]           |
| reject     | pattern-list   | Patterns of incorrect answers [^2]         |
| preAccept  | pattern-list   | Patterns a submission must match [^3]      |
| preReject  | pattern-list   | Patterns a submission must not match [^4]  |
| diacritics | string         | Either "fold" (the default) or "keep" [^5] |

`pattern-list` is an array of patterns. Each entry is either a pattern string
or an object `{ "pattern": string, "feedback": string }`.

A pattern string is written in the same mini-language used by the body's
pattern lines. Its delimiters choose how it is matched:

| Pattern       | Matched as                         |
| ------------- | ---------------------------------- |
| `/.../`       | a regular expression               |
| `` `...` ``   | an exact string                    |
| anything else | a plain string, compared inexactly |

Plain strings use the normalization described at the top of this document. The
regex syntax and its flags are described in the [Regex](#regex) section; the
flags are NOT the same as in JavaScript.

`accept` and `reject` are the canonical form of the `[short-answer/accept]`
and `[short-answer/reject]` blocks -- writing the block and writing the
frontmatter field are two spellings of the same thing, and a document MUST NOT
use both spellings for the same list. A document that does anyway is not
undefined, merely invalid: implementations that choose to accept it MUST follow
the general rule of [generic.md](generic.md#frontmatter) and let the
frontmatter win.

[^1]: A response is correct if it matches any `accept` pattern.

[^2]: Similar rules to `accept`, but flags incorrect answers instead. Every
string that DOES match a reject rule is considered incorrect. If a string
matches both `accept` and `reject`, the accept rule wins and the response is
correct.

[^3]: Frontmatter-only -- there is no `[short-answer/preAccept]` block. If
given, every string that does NOT match at least one `preAccept`
pattern is considered invalid. Semantically, this is a pre-validator and
systems should warn students about the invalidity of their answer before
accepting a submission. It plays no part in grading.

[^4]: Frontmatter-only, like `preAccept`. Similar rules, but flags invalid
submissions instead.
Every string that DOES match a `preReject` rule is considered invalid. In
pre-validation, if a string matches both `preAccept` and `preReject`, it is
considered rejected. Note this precedence rule is the opposite of the one
used by `accept`/`reject` when grading.

[^5]: See [Diacritics](#diacritics).


## Diacritics

The `diacritics` field selects how plain literals, the ones compared inexactly,
treat diacritics:

* `"fold"` is the default. It strips diacritics from both the pattern and the
  response before comparing them, so an inexact `Brasília` accepts `Brasilia`.
* `"keep"` preserves them, so an inexact `Brasília` no longer accepts
  `Brasilia`. The pattern and the response are still normalized to a common
  Unicode form first, so `í` written as one code point and as `i` plus a
  combining acute still compare equal.

The field applies to the plain literals of every pattern list: `accept`,
`reject`, `preAccept` and `preReject`, in the body or in the frontmatter. It
does not apply to other patterns. A backtick-enclosed literal is already
compared verbatim, a regex uses its own `n` flag instead (see
[Regex flags](#regex-flags)), and the `*` wildcard matches every response.
Case folding and whitespace normalization are unaffected either way.

A [fill-in](fill-in.md#short-answer-blanks) question accepts the same field. It
applies to all of its short answer blanks.


## Body

Body consists of one or more blocks starting with the `[short-answer]` tag. The
tag is optionally followed by a `/option` suffix and each suffix declares
one specific variation.

### `[short-answer]` blocks

It follows the grammar:

```lark
short_answer : "[" "short-answer" "]" ws? ":" ws? content?
content      : exact | inexact
exact        : "`" EXACT_TEXT "`" ws?
inexact      : PLAIN_TEXT

EXACT_TEXT   : /[^`\n\r]+/
PLAIN_TEXT   : /[^`\s][^\n\r]*/
```

The content is interpreted as a plain text string (never markdown). Backticks
around it choose the comparison:

* **Bare content** is matched **inexactly**, with the normalization described
  at the top of this document.
* **Backtick-enclosed content** is matched **exactly**. Note that `PLAIN_TEXT`
  cannot begin with a backtick, so content that opens with one MUST be a
  complete backtick-enclosed span; there is no way to write an inexact answer
  starting with a backtick, and no need for one.

For an exact answer, both the declared answer and the response have whitespace
trimmed from their two ends, and are then compared literally -- code point for
code point. Case, interior whitespace and punctuation are all significant, so
`` `math.isnan` `` accepts neither `Math.isnan` nor `math . isnan`.

Trimming the ends is not a weakening of "exact": it is there because leading
and trailing whitespace cannot be represented reliably in the first place.
Markdown collapses runs of spaces, editors strip trailing whitespace, and the
`ws?` before the content already swallows any space after the colon, so a
document has no way to *state* that it wants a leading space. What cannot be
written cannot be matched against. Everything a document can actually express
is compared exactly.

For the same reason, implementations MAY normalize both strings to a common
Unicode representation before comparing them, even in exact mode. A document
saved in NFD and the same document saved in NFC are indistinguishable to a
reader, and which one an editor or input method produces is not something an
author controls. Implementations that do normalize SHOULD use NFC. 

If no PLAIN_TEXT is given, the question is considered to be open-ended, and the
instructor is expected to grade it manually.

A question cannot define the same block twice.


### `[short-answer/accept]` and `[short-answer/reject]` blocks

The syntax of both kinds of blocks is identical:

```lark
accept_reject : "[" "short-answer" "/" ("accept" | "reject") "]" ws? ":" ws? nl? block
```

The suffix is REQUIRED here: without it the tag is the `short_answer` rule
above, which takes a single line of content rather than a list.

The block is a markdown unordered list. In each item, the first line represents a
pattern, and any subsequent lines are interpreted as either feedback (when
prefixed with `>`) or comments (when prefixed with `!`). Feedback and comment
lines are optional, and if present cannot be interleaved. 

A question MUST define at most one `[short-answer/accept]` and one
`[short-answer/reject]` block. They can be defined in any order and combined
with a `[short-answer]` block.

A simple `[short-answer]` block is interpreted as if its content were the only
pattern of the `[short-answer/accept]` block, with no feedback or comments --
keeping its backticks, and so its exactness, if it had any.


### Pattern lines

The pattern line of `accept/reject` items is interpreted as a regex string if it
starts with a `/` after stripping whitespace. A regex line must be closed
by a `/` as well, and may include optional flags after the closing `/`. 

The details of the regex syntax are described in the [Regex](#regex) section.

A pattern line enclosed in backticks is an exact string, with the same meaning
the backticks carry in a `[short-answer]` block.

Any other pattern line is a plain string, matched inexactly, with the same
rules as a bare `[short-answer]` block.

Either block may have a single item with a pattern line of `*`, which acts as
a wildcard matching any response. It belongs as the LAST item of a
`[short-answer/reject]` block, where it supplies the default feedback for a
response that matched nothing else. A wildcard in an accept block is legal but
makes every response correct, which is rarely intended; implementations SHOULD
warn about it. Omitting the reject block entirely is
equivalent to ending it with a wildcard item carrying no feedback: every
response that does not match an accept pattern is incorrect either way. 

If users want to reject an answer with a single `*`, use a regex pattern 
instead, e.g., `/\*/`.

The pattern line cannot be empty.


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
  are also supported, e.g., `\u1234`, but users SHOULD NOT assume UTF-16 encoding
  and surrogate pairs should not be relied upon. Write the unicode character 
  directly in the regex, when possible.
* Standard hex escaping is supported, e.g., `\x12`, but other more obscure
  escape sequences MAY NOT be supported, e.g., `\cA`, `\123`, `\p{...}`,
  `\P{...}`, `\k<name>`.
* Positive and negative lookahead assertions are supported, e.g., `/(?=abc)/` and
  `/(?!abc)/`, but positive and negative lookbehind assertions are NOT supported,
  e.g., `/(?<=abc)/` and `/(?<!abc)/`.


### Regex flags

Matching is **case-sensitive by default**; `i` turns that off. This is the one
place where the default differs from a bare `[short-answer]` answer, which is
compared inexactly and therefore ignores case. A regex says exactly what it
matches, so it gets no implicit leniency.

The following regex flags are supported:

* `i`: Case-insensitive matching.
* `n`: Strip diacritics from both the pattern and the response before
  matching, the way an inexact literal does. Independent of the question's
  `diacritics` field, which never reaches a regex.
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


## Grading

Grading is driven by the `accept` and `reject` patterns, whether they are
written as body blocks or as frontmatter fields. The `preAccept` and
`preReject` patterns are pre-submission validators and never contribute to a
score.

**The score is always binary**: a response is either correct or incorrect,
worth 1 or 0, and nothing in between. An instructor who wants to award partial
credit has to grade manually.

What varies is not the score but how much of the grading is **automated**. A
response is settled automatically when it matches an accept pattern, making it
correct, or a reject pattern, making it incorrect. A response that matches
neither is settled only if the question has no `[short-answer/reject]` block at
all, since an absent reject block carries an implicit trailing wildcard (see
[Pattern lines](#pattern-lines)). Writing the block out replaces that implicit
wildcard with whatever the block actually lists.

This gives three cases:

* **Fully automated**: no reject block, or a reject block whose last item is
  the `*` wildcard. Either way nothing falls through, and the instructor is
  never consulted.
* **Partially automated**: a reject block that does not end in a wildcard.
  Responses matching an accept or reject pattern are settled; anything matching
  neither goes to the instructor. Adding the wildcard back is how an instructor
  closes the question off.
* **Fully manual**: no patterns at all, that is, a single `[short-answer]`
  block with no content. Every response goes to the
  instructor.

The automated portion never awards a fraction of a point -- it simply settles
fewer responses, leaving the rest to be graded by hand.


## Feedback

Feedback is shown to students whose response matches a pattern that defines a
feedback message, in either the `[short-answer/accept]` or the
`[short-answer/reject]` block. The order in which the patterns are defined is
important: the student must receive the feedback of the FIRST pattern that
matches their response AND defines a feedback message.

The list that decided the outcome is the one consulted: a correct response
draws its feedback from `accept`, and an incorrect one from `reject`. A
response that matches an accept rule is correct even when it also matches a
reject rule, and so takes the accept rule's feedback.

## Additional Rules

| Field                              | Level    | Rule                                                             |
| ---------------------------------- | -------- | ---------------------------------------------------------------- |
| regex                              | critical | must be a valid MDQ regex[^6]                                    |
| accept, reject, preAccept, preReject | critical | every `/`-delimited pattern must be a valid MDQ regex[^6]      |
| accept, reject                     | critical | must not be written as a body block and a frontmatter field[^7]  |
| accept, reject, oneOf              | critical | each body block may be defined at most once                      |
| openEnded                          | warning  | must be set when no `accept`, `oneOf` or `regex` is given[^8]    |
| oneOf                              | warning  | is never consulted when `regex` is given                         |
| accept                             | warning  | should not hold a `*` wildcard, which accepts every response     |
| regex                              | info     | a leading `^` or trailing `$` is redundant[^9]                   |
| regex                              | info     | should not carry a flag that is accepted but ignored[^10]        |
| reject                             | info     | a `*` wildcard should be the last item of the list               |

[^6]: The supported syntax is the subset described in [regex](#regex): the
pattern must compile and must stay inside that subset.
[^7]: Writing the block and writing the field are two spellings of the same
list. A document that uses both is invalid; an implementation that accepts it
anyway MUST let the frontmatter win.
[^8]: Nothing can grade such a question, and it is not marked for manual
grading either.
[^9]: Matching is a full match, so both anchors are implicit.
[^10]: `m`, `g`, `s`, `u`, `v`, `y` and `d` are accepted for compatibility and
have no effect, see [regex flags](#regex-flags).
