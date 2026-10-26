# Short answer

## Example

Short answer questions expect a short textual response.

```md
What is the capital of Brazil?

[short-answer]: Brasília
```

By default, the matching is **inexact**: it ignores case, diacritics, invisible
characters, the difference between typographic and ASCII quotes and dashes, and
the amount of whitespace. See
[Inexact literals](../references/patterns.md#inexact-literals) for the exact
steps.

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

It is also possible to list precisely which strings are accepted and which
ones are rejected, with patterns that include regular expressions.

```md
---
incorrectFeedback: Sorry, that is not the correct answer.
---

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
  > The accent goes on the "i".
  ! When a response matches an accept pattern and a reject pattern, the accept
  ! pattern takes precedence, so `Brasilia` and `Brasília` are correct. This
  ! item only catches a misplaced accent, such as `Bràsilia` or `Brasilía`.
```

A response that matches no pattern is incorrect, and `incorrectFeedback`
supplies its feedback. See [Grading](#grading) and [Feedback](#feedback).


## Frontmatter

Short answer questions accept the following extra fields in the
frontmatter:

| Field      | Type           | Description                                |
| ---------- | -------------- | ------------------------------------------ |
| type       | "short-answer" | The type discriminator                     |
| preAccept  | pattern-list   | Patterns a submission must match [^1]      |
| preReject  | pattern-list   | Patterns a submission must not match [^2]  |
| diacritics | string         | Either "fold" (the default) or "keep" [^3] |
| unmatched  | string         | Either "incorrect" or "manual": what happens to a response that matches no pattern [^4] |
| incorrectFeedback | string  | Feedback for an incorrect response that no pattern gave feedback to [^5] |

`pattern-list` is an array of at least one pattern; an empty array is the
`schema-error` of the table below. Each entry is either a pattern string
or an object with a `pattern`, a `feedback` and a `comment`. See
[Patterns](../references/patterns.md) for the pattern strings, the object form
and the regex dialect. The regex flags are NOT the same as in JavaScript.

`accept` and `reject` are fields of the YAML and JSON form. In Markdown the
`[short-answer/accept]` and `[short-answer/reject]` blocks set them, and the
frontmatter MUST NOT hold them: a frontmatter key that is not in the table
above is the `invalid-frontmatter-field` error, see
[Frontmatter](question-base.md#frontmatter). Every string that matches a
`reject` pattern is incorrect, unless it also matches an `accept` pattern, see
[Grading](#grading).

[^1]: Frontmatter-only -- there is no `[short-answer/preAccept]` block, and
a Markdown document with one has the `parse-error` error. If
given, every string that does NOT match at least one `preAccept`
pattern is considered invalid. Semantically, this is a pre-validator and
systems SHOULD warn students about the invalidity of their answer before
accepting a submission. It plays no part in grading. See
[Pre-validation](#pre-validation) for the feedback of an invalid submission.

[^2]: Frontmatter-only, like `preAccept`: a `[short-answer/preReject]` block is
a `parse-error` error. Similar rules, but flags invalid
submissions instead.
Every string that DOES match a `preReject` pattern is considered invalid. In
pre-validation, if a string matches both `preAccept` and `preReject`, it is
considered rejected. Note this precedence rule is the opposite of the one
used by `accept`/`reject` when grading.

[^3]: See [Diacritics](#diacritics).

[^4]: Frontmatter-only. If absent, it is `"incorrect"` for a question with
at least one `accept` pattern and `"manual"` for a question with none. See
[Grading](#grading).

[^5]: Frontmatter-only. Block Markdown (paragraphs allowed), like the feedback of
a pattern, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).
It MUST have at least one visible character (`blank-text`). See
[Feedback](#feedback).


## Diacritics

The `diacritics` field selects how inexact literals treat diacritics:
`"fold"` (the default) strips them and `"keep"` preserves them. It applies to
the inexact literals of every pattern list, and to no other pattern. See [Diacritics](../references/patterns.md#diacritics).

A [fill-in](fill-in.md#short-answer-blanks) question accepts the same field. It
applies to all of its short answer blanks.


## Body

The body holds two kinds of block. `[short-answer]` lists the patterns of the
correct responses, and `[short-answer/reject]` lists the patterns of known
incorrect responses. A question MUST have at least one of the two blocks,
`[short-answer]` or `[short-answer/reject]`, in any order. Each block appears
at most once. `[short-answer/accept]` is an alias of `[short-answer]`, so a
document MUST NOT use both spellings.

The tags follow the convention of [Body tags](question-base.md#body-tags): a
tag with a colon requires a pattern, and a tag without a colon has none.
`[short-answer]` MAY be written without a colon. That block has no pattern,
see [Block with no pattern](#block-with-no-pattern). `[short-answer/reject]`
MUST have a colon, since it MUST declare at least one pattern.

A question with only a `[short-answer/reject]` block is valid. It has no
`accept` list, so `unmatched` defaults to `manual`: the instructor grades the
responses that no reject pattern settles, see [Grading](#grading). A question
with no block at all has no body, which is a `parse-error`.

In the YAML and JSON form, `accept` and `reject` are both optional. A missing
`accept` is the same as a `[short-answer]` block with no pattern, and a missing
`reject` is the same as no `[short-answer/reject]` block. A question with
neither, and with the default `unmatched`, is `manual`.

The blocks follow this grammar:

```lark
accept_block : bare_accept | colon_accept
bare_accept  : ws? "[" "short-answer" "/accept"? "]" ws?
colon_accept : ws? "[" "short-answer" "/accept"? "]" ws? ":" ws? patterns
reject_block : ws? "[" "short-answer" "/reject" "]" ws? ":" ws? patterns
patterns     : content | nl ws? lazy_content | nl pattern_list
content      : exact | regex | inexact
exact        : FENCE EXACT_TEXT FENCE ws?
             | FENCE EXACT_OPEN (nl ws? LAZY_EXACT_MID)* nl ws? LAZY_EXACT_TEXT FENCE ws?
regex        : REGEX_LINE ws?
             | REGEX_OPEN (nl ws? LAZY_TEXT)* nl ws? REGEX_CLOSE ws?
inexact      : PLAIN_TEXT (nl ws? LAZY_TEXT)*
lazy_content : lazy_exact | regex | lazy_inexact
lazy_exact   : LAZY_FENCE EXACT_TEXT FENCE ws?
             | LAZY_FENCE EXACT_OPEN (nl ws? LAZY_EXACT_MID)* nl ws? LAZY_EXACT_TEXT FENCE ws?
lazy_inexact : LAZY_PLAIN_TEXT (nl ws? LAZY_TEXT)*
pattern_list : pattern_item+

FENCE           : /`+/
EXACT_TEXT      : /[^`\n\r]+(`+[^`\n\r]+)*/
EXACT_OPEN      : /[^`\n\r]+(`+[^`\n\r]*)*/
PLAIN_TEXT      : /[^`\/ \t\r\n][^\r\n]*/
REGEX_LINE      : /\/[^\r\n]*\/[A-Za-z]*/
REGEX_OPEN      : /\/[^\r\n]*/
REGEX_CLOSE     : LAZY_START /[^\r\n]*\/[A-Za-z]*/ | /\/[A-Za-z]*/
LAZY_TEXT       : LAZY_START /[^\r\n]*/
LAZY_EXACT_MID  : LAZY_START /[^`\r\n]*(`+[^`\r\n]*)*/
LAZY_EXACT_TEXT : LAZY_START /[^`\r\n]*(`+[^`\r\n]+)*/
LAZY_FENCE      : /`{1,2}/
LAZY_PLAIN_TEXT : /(?!>|!(?!\[)|[*+-][ \t]|0{0,8}1[.)][ \t]|#{1,6}([ \t]|(?=[\r\n]))|~{3}|(\*[ \t]*){3,}(?=[\r\n])|(-[ \t]*){3,}(?=[\r\n])|(_[ \t]*){3,}(?=[\r\n]))[^`\/ \t\r\n][^\r\n]*/
```

The rules `ws` and `nl`, and the terminal `LAZY_START`, are defined in
[Common grammar rules](../references/grammar.md). `pattern_item` is an item of
a markdown unordered list, see
[Pattern items](../references/patterns.md#pattern-items). `lazy_content` is the
`content` on the line after a tag with a colon and no text. It reads the same
three forms, but its first line MUST be a lazy line, as `LAZY_START` tests it:
a `>`, `!` or `#` line, a list item or a fence is not content there.
`LAZY_FENCE` and `LAZY_PLAIN_TEXT` carry that test. A regex starts with `/`,
which `LAZY_START` always passes, so `lazy_content` reuses `regex`.

The two `FENCE` terminals of `exact` have the same length N, and no run of
backticks inside the text has length N. A context-free grammar cannot say it,
so it is a rule of the text, see [Content](#content). The same holds for the
closing run: it follows text on its line, so a line of the literal never
starts with a run of exactly N backticks. `EXACT_TEXT` is not empty, so the
opening run is followed by text on its line. A line before the last may end
with a run of backticks of another length than N (`EXACT_OPEN` and
`LAZY_EXACT_MID`).

`PLAIN_TEXT` cannot start with `/`, so content that starts with `/` is a
`regex` or a parse failure. `REGEX_LINE` ends at the last `/` of the line, and
`REGEX_CLOSE` at the last `/` of the last line. A grammar failure on content
that starts with `/` is an `invalid-regex`, not a `parse-error`: the regex has
no closing `/`. A grammar failure on content that opens with a backtick is a
`parse-error` in the Markdown body, see [Content](#content). The grammar does not check the spaces
and tabs at the ends of a pattern string, nor the visible character rule, nor
that the content of a pattern item is not a block other than a paragraph (an
item such as `* > Brasília`, see [Pattern items](../references/patterns.md#pattern-items)).
See [Pattern string](../references/patterns.md#pattern-string).

A block takes its patterns in one of two forms:

* **Single line**: the `content` after the colon is one pattern, with no
  feedback and no comment.
* **List**: a markdown unordered list that starts on the line right after the
  tag. Each item is one pattern, with optional feedback and comment lines. A
  list that starts on the line right after the pattern list, with no blank
  line, is a `parse-error`: see
  [Lists after a content list](question-base.md#lists-after-a-content-list).

Both forms produce the same list: `[short-answer]: Brasília` and a
`[short-answer]:` followed by the single item `* Brasília` are the same
document, with `accept: ["Brasília"]`. The pattern keeps its delimiters
(`` ` `` or `/`).

The list MUST start on the line right after the tag, with no blank line in
between. A tag with a colon and no text on its line, followed by a blank
line, is a `parse-error`: the answer key would not be part of the block, and
the list would show to the student as an epilogue element. The message says
that the content MUST start on the line right after the tag. A tag with content
on its line MUST NOT be followed by a list without a blank line. With a blank
line, the list is an epilogue element.

```md
[short-answer]:
* Brasília
* /Bras[íi]lia DF/i
```

```md
[short-answer]:

* Brasília
```

The first block accepts two patterns. The second is a `parse-error`.

A tag with a colon MUST have a pattern, on its line or in a list on the line
right after it. `[short-answer]:` at the end of the body, or followed by a blank
line and any block, is a `parse-error`. The message says to write the answer
on the line after the tag, or to use `[short-answer]` for a manual question.
A `[short-answer/reject]` block MUST declare at least one pattern, so it has a
colon and a pattern. Only the accept block may have no pattern, see
[Block with no pattern](#block-with-no-pattern).

### Content

The content is one pattern string, interpreted as plain text (never
markdown). Bare content is matched inexactly, backtick-enclosed content
exactly and content delimited by `/` is a regex. See
[Pattern string](../references/patterns.md#pattern-string).

An exact literal can span lines: each line ending becomes one U+0020, which
is significant, see
[Continuation lines](../references/patterns.md#continuation-lines). Authors
SHOULD write an exact literal or a regex on one line: a literal on more than one
line gets the `multi-line-pattern` warning, see
[Continuation lines](../references/patterns.md#continuation-lines).

An exact literal follows the CommonMark code span, with one more rule on line
endings. A run of N backticks opens
it, and the first run of exactly N backticks after it closes it. The closing
run MUST end the pattern. Runs of other lengths inside are text. If the content
starts and ends with a space and is not only spaces, one space is removed from
each end. This is the way to write a backtick in an exact literal:

```md
Which shell syntax runs a command and uses its output?

[short-answer]: `` `date` ``
```

The answer is `` `date` ``, with its backticks: the two spaces next to the
fence are removed. The pattern ``` ``a`b`` ``` is the literal `` a`b ``, and
```` ```a``b``` ```` is the literal ``` a``b ```.

An exact literal MUST NOT open at the end of a line: text follows the opening
run on the same line. By symmetry, the closing run MUST NOT start a
continuation line: text precedes it on its line. The line endings of a literal
exist for word wrap. A literal that opens or closes at a line ending would need
a rule on whether the space at its edge is removed, so the format does not
allow it. Both cases are a `parse-error`, as any other incomplete exact
literal in the Markdown body:

```md
[short-answer]: `Rio
Negro`
```

The first example is the literal `Rio Negro`, with the `multi-line-pattern`
warning. A tag line with only a backtick,
followed by `Rio Negro` and a closing backtick, is a `parse-error`, and so is
`Rio Negro` followed by a line that holds only the closing backtick.

Note that `PLAIN_TEXT` cannot begin with a backtick, so content that opens
with one MUST be a complete exact literal; there is no way to write an inexact
answer starting with a backtick, and no need for one. Content that opens with
a backtick and is not a complete literal is a `parse-error` in the Markdown
body, and a `schema-error` in the YAML, JSON and frontmatter form. This holds when
the closing run has another length than the opening run, when text follows the
closing run, and when no closing run exists. Examples are
`` `math.isnan` (x) ``, `` `math.isnan `` and ``` ``x` ```. The error holds in
the single-line form and in the list form.

### Block with no pattern

A `[short-answer]` block MAY have no pattern. It is written without a colon,
as a paragraph whose only content is the tag, like the
[essay](essay.md#body) tag:

```md
Name a biome of central Brazil.

[short-answer]
```

The question then has no `accept` list. If it has no `reject` list either, the
instructor grades every response, see [Grading](#grading). `[short-answer]:`
with a colon and no pattern is a `parse-error`, see
[Body tags](question-base.md#body-tags).

A list on the line right after `[short-answer]` is a `parse-error`: the colon is
missing, and the list would show to the student as an epilogue element. So is a
`>` or `!` line right after the tag, as after a tag with a colon. This holds for
all four bare tags: `[short-answer]`, `[short-answer/accept]` and, in a
[fill-in](fill-in.md#short-answer-blanks) question, `[^id/short-answer]` and
`[^id/short-answer/accept]`. Only the line right after the tag counts.

A paragraph that starts with the bare tag and holds more text, on the same line
(`[short-answer] Cerrado`) or on a lazy line after it, is a `parse-error` too.
It is neither a block with no pattern nor a block with a pattern. The message is
free; it SHOULD suggest `[short-answer]:`. A block of another kind, or a list
after a blank line, is an epilogue element.


### Pattern lines

Each item of a list holds one pattern on its first line, the pattern line,
followed by optional `>` feedback and `!` comment lines. A pattern line is a
pattern string, with the same meaning as the content of a single-line block.
The pattern, the feedback and the comment can continue on the next lines, and
so can the content of a single-line block, see
[Continuation lines](../references/patterns.md#continuation-lines).
See [Pattern items](../references/patterns.md#pattern-items).

The lines after the content of a single-line block follow these rules:

| Line right after the content                       | Result                          |
| -------------------------------------------------- | ------------------------------- |
| Lazy line (`LAZY_START`), up to a blank line       | continues the content           |
| Setext underline[^6] (a line of `=` characters, or of `-` characters such as `---`) | `parse-error` |
| `>` line, or `!` line (not `![`)                   | `parse-error`                   |
| List item                                          | `parse-error`                   |
| ATX heading, fenced code, HTML block, thematic break (`***`, `___`, `- - -`) | ends the block, goes to the epilogue |

A lazy line right after a tag with a colon and no text on its line is the
content: `[short-answer]:` followed by `Brasília` on the next line is the same
as `[short-answer]: Brasília`. The normative rule
for a lazy line is the paragraph continuation of CommonMark. `LAZY_START` is an
approximation of it, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).
A line of `>` or `!` with four or more columns of indentation cannot start a
block quote or a comment, so it is continuation text, not a `parse-error`. A `>` or `!` line
right after a tag with a colon and no text on its line (`[short-answer]:` then
`> x`) is a `parse-error` as well, as it is after content. A `>` or `!` line is not feedback or a comment
in the single-line form: it has no container to hold them, and a blank line
before it would make the block quote ambiguous with a block quote of the
epilogue. Use the list form for feedback.


## Regex

A pattern delimited by `/` is a regular expression, written in a subset of the
JavaScript syntax with its own flags. See
[Regex](../references/patterns.md#regex) and
[Regex flags](../references/patterns.md#regex-flags). Before a regex matches,
the response is normalized to NFC and the `UNICODE_SPACE` code points are
removed from its ends, see
[Regex subject](../references/patterns.md#regex-subject). An anchor that the
regex already has implicitly, such as a leading `^` without the `f` flag, is
redundant and gets the `redundant-regex-anchor` info, see
[Regex flags](../references/patterns.md#regex-flags).


## Grading

Grading is driven by the `accept` and `reject` patterns. The `preAccept` and
`preReject` patterns are pre-submission validators and never contribute to a
score.

**The automatic score is binary**: a settled response is either correct or
incorrect, worth 1 or 0, and nothing in between. An instructor who wants to
award partial credit has to grade manually: the score that an instructor gives
to a pending response is in [0, 1], see [responses.md](../responses.md#pending).

A response is **settled** when the question decides if it is correct. An
implementation MUST apply the rules below in order, and stop at the first one
that applies:

1. The response matches a pattern of `accept`: it is correct.
2. The response matches a pattern of `reject`: it is incorrect.
3. The response matches no pattern. The `unmatched` field decides: with
   `"incorrect"` the response is incorrect, and with `"manual"` it is not
   settled and the instructor grades it.

If a question does not declare `unmatched`, its value is `"incorrect"` when the
question has at least one `accept` pattern, and `"manual"` when it has none. A
question with no correct answer to compare with cannot mark a response as
correct, so it leaves the responses to the instructor.

A question SHOULD NOT declare `unmatched: "incorrect"` when it has no `accept`
pattern: no response can be correct, because every response is incorrect, by a
`reject` pattern or by `unmatched`. Such a question is valid, and gets the
`no-correct-answer` warning.

The `reject` list only says which responses are known to be incorrect, usually
to give them feedback. It does not change what happens to the other
responses.

### Automation

The **automation** of a question tells how many responses it settles:

| Automation       | The question settles                  | Condition                                                                            |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `automatic`      | every response                        | `unmatched` is `"incorrect"`                                                         |
| `semi-automatic` | the responses that match a pattern    | `unmatched` is `"manual"` and the question has at least one `accept` or `reject` pattern |
| `manual`         | no response                           | `unmatched` is `"manual"` and the question has no pattern                            |

`automation` is not a field of the document. It MUST NOT appear in the
frontmatter of a question (`invalid-frontmatter-field`), or in its YAML or
JSON form (`schema-error`). An implementation computes it from `accept`,
`reject` and `unmatched`, and SHOULD offer it as a read-only property of the
question. `preAccept` and `preReject` validate a submission and play no part
in it. Every question type has an automation, see
[Automation](question-base.md#automation).

An implementation that scores responses MUST NOT give a score to a response
that is not settled. It reports the response as pending, in the same way as a
response to an essay question, see [responses.md](../responses.md#pending).

### Examples

Automatic. The instructor knows the correct answers:

```md
What is the capital of Brazil?

[short-answer]: Brasília
```

`Salvador` matches no pattern. The question has an `accept` pattern, so
`unmatched` is `"incorrect"`.

Automatic, with feedback for known incorrect answers:

```md
---
incorrectFeedback: This city was never the capital.
---

What is the capital of Brazil?

[short-answer]: Brasília

[short-answer/reject]:
* Rio de Janeiro
  > It was the capital until 1960.
```

`Rio de Janeiro` is incorrect and gets its own feedback. `Manaus` is
incorrect and gets `incorrectFeedback`.

Semi-automatic. The instructor knows some correct and some incorrect answers:

```md
---
unmatched: manual
---

Name a biome of central Brazil.

[short-answer]:
* Cerrado
* Pantanal

[short-answer/reject]:
* Savana
  > Savanna is the general term. Name the Brazilian biome.
```

`Cerrado` is correct and `Savana` is incorrect. `Mata Atlântica` matches no
pattern and goes to the instructor.

Semi-automatic. The instructor knows only some correct answers:

```md
---
unmatched: manual
---

Name a biome of central Brazil.

[short-answer]:
* Cerrado
* Pantanal
```

Semi-automatic. The instructor knows only some incorrect answers:

```md
Name a biome of central Brazil.

[short-answer]

[short-answer/reject]:
* Savana
  > Savanna is the general term. Name the Brazilian biome.
```

There is no `accept` pattern, so `unmatched` is `"manual"`. `Savana` is
incorrect, and the instructor grades every other response.

Manual:

```md
Name a biome of central Brazil.

[short-answer]
```

No response is settled. The question works like a one-line essay.


## Feedback

The feedback of a settled response is the feedback of the first pattern that
defines a feedback message among the patterns that match the response in the
list that decided the outcome. A correct response draws its feedback from
`accept`, and an incorrect one from `reject`. A response that matches an
accept pattern is correct even when it also matches a reject pattern, and so
takes the feedback of the accept pattern, even if that pattern has no feedback.
The order in which the patterns are defined is important.

An incorrect response that no pattern gave feedback to shows the
`incorrectFeedback` of the question, if the question declares one. It MUST
have at least one visible character (`blank-text`). This covers
a response that matches no pattern, under `unmatched: incorrect`, and a
response that matches a `reject` pattern with no feedback. A response that is
not settled shows no feedback, because nothing has decided it yet.

### Pre-validation

`preAccept` and `preReject` validate a submission before it is accepted, see
[Frontmatter](#frontmatter). A submission is invalid when it matches a
`preReject` pattern, or when `preAccept` is declared and the submission
matches none of its patterns. An implementation shows the feedback of an
invalid submission by these rules, in order, and stops at the first one that
applies:

1. The submission matches a `preReject` pattern: the feedback of the FIRST
   matching `preReject` pattern that defines a feedback message.
2. The submission matches no `preAccept` pattern: the feedback of the FIRST
   `preAccept` pattern that defines a feedback message. No pattern matched, so
   this feedback is a format hint, for example `Write the year with four
   digits.` on the pattern `/\d{4}/`.

If the rule that applies finds no feedback, no pattern feedback is shown: the
submission is still invalid, and the system SHOULD say so in its own words.
`preReject` comes first, as in the precedence of
[the frontmatter](#frontmatter). A valid submission shows no pre-validation
feedback. A [fill-in](fill-in.md#short-answer-blanks) short answer blank uses
the same rules for its own `preAccept` and `preReject` lists.

## Additional Rules

| Field                                | Level    | Code                   | Rule                                                                                |
| ------------------------------------ | -------- | ---------------------- | ----------------------------------------------------------------------------------- |
| accept, reject, preAccept, preReject | error    | schema-error           | a pattern list, when present, has at least one pattern (schema)                     |
| accept, reject, preAccept, preReject | error    | schema-error           | a pattern string is not empty (schema)                                              |
| accept, reject, preAccept, preReject | error    | schema-error           | in a YAML, JSON or frontmatter pattern string, one that opens with a backtick is a complete exact literal (schema)[^7] |
| accept, reject                       | error    | parse-error            | in the Markdown body, a pattern that opens with a backtick is a complete exact literal, and it does not open at the end of a line nor close at the start of a line[^8] |
| accept, reject, preAccept, preReject | error    | block-start-pattern    | an inexact pattern must not start a block other than a paragraph in CommonMark[^9] |
| accept, reject, preAccept, preReject | error    | blank-text             | a pattern string must have at least one visible character[^10]                      |
| {accept,reject,preAccept,preReject}[].{feedback,comment} | error | blank-text | if defined, must have at least one visible character                     |
| accept, reject, preAccept, preReject | error    | invalid-regex          | every `/`-delimited pattern must be a valid MDQ regex[^11]                           |
| accept, reject, preAccept, preReject | error    | invalid-regex          | a regex flag must be a supported or an ignored flag, and must not repeat[^12]       |
| accept, reject                       | error    | parse-error            | each body block may be defined at most once[^13]                                    |
| accept, reject                       | error    | parse-error            | a tag with content must not be followed by a list without a blank line              |
| accept, reject                       | error    | parse-error            | a tag with a colon must have a pattern on its line or in a list on the line right after it (a blank line before the list included) |
| accept                               | error    | parse-error            | a list, or a `>` or `!` line, must not start on the line right after a tag without a colon |
| accept                               | error    | parse-error            | a bare tag must not be followed by text, on its line or on a lazy line |
| reject                               | error    | parse-error            | the tag must have a colon |
| accept, reject                       | error    | parse-error            | a `>` or `!` line must not follow the content or a tag line with a colon, without a blank line |
| accept, reject                       | error    | parse-error            | a setext underline (`=` or `-` characters) must not follow the content[^6] |
| accept, reject                       | error    | parse-error            | the Markdown body must have at least one of the `[short-answer]` and `[short-answer/reject]` blocks |
| reject                               | error    | parse-error            | must declare at least one pattern |
| accept, reject                       | error    | parse-error            | an item carries at most one feedback block and one comment block                    |
| accept, reject                       | error    | parse-error            | a pattern line must not be empty[^14]                                               |
| accept, reject                       | error    | parse-error            | the content of an item must start a paragraph in CommonMark, not another block[^15]  |
| preAccept, preReject                 | error    | parse-error            | there is no `[short-answer/preAccept]` or `[short-answer/preReject]` tag, in the single-line form or in the block form[^16] |
| accept, reject                       | error    | parse-error            | a tag is in lower case, and a tag with a reserved label has a known suffix, see [Body tags](question-base.md#body-tags) |
| accept, reject                       | error    | parse-error            | a list must not start on the line right after a pattern list, see [Lists after a content list](question-base.md#lists-after-a-content-list) |
| epilogue                             | error    | detached-tag           | a tag must not come after the epilogue started, see [Body tags](question-base.md#tags-after-the-epilogue-starts) |
| accept, reject                       | error    | invalid-frontmatter-field | must not be in the frontmatter; the body blocks set them                       |
| automation                           | error    | invalid-frontmatter-field | must not be in the frontmatter                                                   |
| automation                           | error    | schema-error           | must not be a field of the YAML or JSON form                                        |
| diacritics                           | error    | schema-error           | must be "fold" or "keep" (schema)                                                   |
| unmatched                            | error    | schema-error           | must be "incorrect" or "manual" (schema)                                            |
| unmatched                            | warning  | no-correct-answer      | should not be "incorrect" when the question has no `accept` pattern[^17]               |
| incorrectFeedback                    | error    | blank-text             | if defined, must have at least one visible character                                |
| accept, reject                       | warning  | multi-line-pattern     | an exact literal or a regex in the Markdown body should be on one line[^18]         |
| accept, reject, preAccept, preReject | info     | redundant-regex-anchor | an anchor that is already implicit is redundant[^19]                                 |
| accept, reject, preAccept, preReject | info     | ignored-regex-flag     | carries a flag that is accepted but ignored[^20]                                    |
| accept, reject, preAccept, preReject | info     | unmatchable-regex-escape | under the `n` flag, has an escape that the strip changes[^21]                     |

The table lists diagnostics only, see
[Additional Rules](question-base.md#additional-rules). The MAY permissions of
the type (a `[short-answer/reject]` block, a `[short-answer]` block with no
pattern) and the SHOULD about `automation` as a read-only property have no row,
because they cannot fail.

[^6]: A line of only `=` or only `-` characters, with up to three spaces of
indentation and optional trailing spaces and tabs, right after the content
(also after its continuation lines). In CommonMark it turns the tag line into a
heading, so there is no definition. With four or more spaces of indentation the
line is continuation text. It applies to the single-line form and to a list
item.
[^7]: For example, `` `math.isnan` (x) ``, `` `math.isnan `` and ``` ``x` ```.
In the Markdown body, in the single-line and in the list form, these patterns
are a `parse-error`. The schema
checks that the pattern opens and closes with a backtick. It cannot compare
the length of the two runs, so the models check the rest.
[^8]: The body form only. A pattern string of the YAML, JSON and frontmatter
form has no line ending at all, so a literal of it never opens or closes at a
line ending. A body pattern that is not a complete literal is a `schema-error`
in that form.
[^9]: A block quote, an ATX heading, a list item (`*`, `-`, `+`, `1.`), a
fenced code block, an HTML block or a thematic break, in every form: YAML, JSON,
frontmatter, the single-line tag and the blanks of a fill-in question. The
schema cannot say it, because the check needs a CommonMark parser. In a pattern
item of the Markdown body it is a `parse-error` (the item content row). Write an exact
literal (`` `# Brasília` ``) or a regex. See
[Pattern string](../references/patterns.md#pattern-string).
[^10]: Without a visible character, as
[grammar.md](../references/grammar.md#visible-characters) defines it. For an
exact literal, the text between the backticks is checked. `"   "`, an exact
literal of one space and a lone U+200B are `blank-text`. An empty string is
a `schema-error`.
[^11]: The supported syntax is the closed table of
[Regex](../references/patterns.md#regex). A construct that the table does not
list is an `invalid-regex`, also when JavaScript or Python accepts it.
[^12]: For example, `/brasil/x` and `/brasil/ii` are invalid. See
[Regex flags](../references/patterns.md#regex-flags).
[^13]: `[short-answer/accept]` is an alias of `[short-answer]`, so a document
with both has the block twice.
[^14]: An item such as `*` followed by a feedback line has no pattern.
[^15]: A block quote, an ATX heading, a list, a fenced or indented code block,
an HTML block or a thematic break. The item `* > Brasília` is a block quote
in CommonMark, so it is not a pattern. Write an exact literal instead:
`` * `> Brasília` ``. A pattern is plain text, so `\#` is the pattern `\#` and
not `#`. See [Pattern items](../references/patterns.md#pattern-items).
[^16]: `preAccept` and `preReject` are frontmatter fields, see
[Frontmatter](#frontmatter). A line `[short-answer/preAccept]: b` is a tag with a
reserved label and an unknown suffix, see
[Reserved tag names](question-base.md#reserved-tag-names). It is not a link
reference definition.
[^17]: No response can be correct: every response is incorrect, by a `reject`
pattern or by `unmatched`. The lint code is `no-correct-answer`.
[^18]: The line ending between two lines of the pattern becomes a U+0020 that
is part of the exact literal or of the regex. An inexact literal ignores the
amount of whitespace, so it has no row. See
[Continuation lines](../references/patterns.md#continuation-lines).
[^19]: Without the `f` flag, a leading `^` is implicit. Without the `f` or `b`
flag, a trailing `$` is implicit. See
[Regex flags](../references/patterns.md#regex-flags).
[^20]: `m`, `g`, `s`, `u`, `v`, `y` and `d` are accepted for compatibility and
have no effect, see [Regex flags](../references/patterns.md#regex-flags).
[^21]: An escape that denotes a code point (`\uXXXX`, `\xXX`, `\u{...}`) is
never changed by `n`. If the strip changes that code point (a combining mark of
the `nonspacing` table, or a code point whose NFD holds one, such as U+00E1), the
response cannot contain it. See [Regex flags](../references/patterns.md#regex-flags).
