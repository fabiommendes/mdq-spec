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

It is also possible to declare more complex rules by specifying precisely which
strings are accepted and which ones are rejected, including using regular
expressions.

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
  > You forgot the accent on the "i".
  ! If an accept and reject rule match the same string, the accept rule takes precedence.
  ! Hence this item is a no-op.
```

A response that matches no pattern is incorrect, and `incorrectFeedback`
supplies its feedback. See [Grading](#grading) and [Feedback](#feedback).


## Frontmatter

Short answer questions accept the following extra arguments in the
frontmatter:

| Field      | Type           | Description                                |
| ---------- | -------------- | ------------------------------------------ |
| type       | "short-answer" | The type discriminator                     |
| preAccept  | pattern-list   | Patterns a submission must match [^3]      |
| preReject  | pattern-list   | Patterns a submission must not match [^4]  |
| diacritics | string         | Either "fold" (the default) or "keep" [^5] |
| unmatched  | string         | Either "incorrect" or "manual": what happens to a response that matches no pattern [^13] |
| incorrectFeedback | string  | Feedback for an incorrect response that no pattern gave feedback to [^14] |

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

[^3]: Frontmatter-only -- there is no `[short-answer/preAccept]` block, and
a document with one has the `forbidden-block-element` error. If
given, every string that does NOT match at least one `preAccept`
pattern is considered invalid. Semantically, this is a pre-validator and
systems SHOULD warn students about the invalidity of their answer before
accepting a submission. It plays no part in grading. See
[Pre-validation](#pre-validation) for the feedback of an invalid submission.

[^4]: Frontmatter-only, like `preAccept`: a `[short-answer/preReject]` block is
a `forbidden-block-element` error. Similar rules, but flags invalid
submissions instead.
Every string that DOES match a `preReject` rule is considered invalid. In
pre-validation, if a string matches both `preAccept` and `preReject`, it is
considered rejected. Note this precedence rule is the opposite of the one
used by `accept`/`reject` when grading.

[^5]: See [Diacritics](#diacritics).

[^13]: Frontmatter-only. If absent, it is `"incorrect"` for a question with
at least one `accept` pattern and `"manual"` for a question with none. See
[Grading](#grading).

[^14]: Frontmatter-only. Inline markdown, like the feedback of a pattern. It
MUST have at least one visible character (`blank-text`). See
[Feedback](#feedback).


## Diacritics

The `diacritics` field selects how plain literals, the ones compared inexactly,
treat diacritics: `"fold"` (the default) strips them and `"keep"` preserves
them. It applies to the plain literals of every pattern list, and to no other
pattern. See [Diacritics](../references/patterns.md#diacritics).

A [fill-in](fill-in.md#short-answer-blanks) question accepts the same field. It
applies to all of its short answer blanks.


## Body

The body holds two kinds of block. `[short-answer]` lists the patterns of the
correct responses, and `[short-answer/reject]` lists the patterns of known
incorrect responses. A question MUST have at least one of the two blocks,
`[short-answer]` or `[short-answer/reject]`, in any order. Each block appears
at most once. `[short-answer/accept]` is an alias of `[short-answer]`, so a
document MUST NOT use both spellings.

A question with only a `[short-answer/reject]` block is valid. It has no
`accept` list, so `unmatched` defaults to `manual`: the instructor grades the
responses that no reject pattern settles, see [Grading](#grading). A question
with no block at all has no body, which is a `parse-error`. The `[short-answer]`
block MAY be empty.

Both blocks follow the same grammar:

```lark
accept_block : ws? "[" "short-answer" "/accept"? "]" ws? ":" ws? patterns?
reject_block : ws? "[" "short-answer" "/reject" "]" ws? ":" ws? patterns
patterns     : content | nl lazy_content | nl pattern_list
content      : exact | regex | inexact
exact        : FENCE EXACT_TEXT (nl ws? LAZY_EXACT_TEXT)* FENCE ws?
regex        : REGEX_LINE ws?
             | REGEX_OPEN (nl ws? LAZY_TEXT)* nl ws? REGEX_CLOSE ws?
inexact      : PLAIN_TEXT (nl ws? LAZY_TEXT)*
lazy_content : ws? LAZY_TEXT (nl ws? LAZY_TEXT)*
pattern_list : pattern_item+

FENCE           : /`+/
EXACT_TEXT      : /[^`\n\r]+(`+[^`\n\r]+)*/
PLAIN_TEXT      : /[^`\/ \t\r\n][^\r\n]*/
REGEX_LINE      : /\/[^\r\n]*\/[A-Za-z]*/
REGEX_OPEN      : /\/[^\r\n]*/
REGEX_CLOSE     : LAZY_START /[^\r\n]*\/[A-Za-z]*/ | /\/[A-Za-z]*/
LAZY_TEXT       : LAZY_START /[^\r\n]*/
LAZY_EXACT_TEXT : LAZY_START /[^`\r\n]*(`+[^`\r\n]+)*/
```

The rules `ws` and `nl`, and the terminal `LAZY_START`, are defined in
[Common grammar rules](../references/grammar.md). `pattern_item` is an item of
a markdown unordered list, see
[Pattern items](../references/patterns.md#pattern-items).

The two `FENCE` terminals of `exact` have the same length N, and no run of
backticks inside the text has length N. A context-free grammar cannot say it,
so it is a rule of the text, see [Content](#content). The same holds for the
closing run: it follows text on its line, so a line of the literal never
starts with a run of exactly N backticks. `EXACT_TEXT` is not empty, so the
opening run is followed by text on its line.

`PLAIN_TEXT` cannot start with `/`, so content that starts with `/` is a
`regex` or a parse failure. `REGEX_LINE` ends at the last `/` of the line, and
`REGEX_CLOSE` at the last `/` of the last line. A grammar failure on content
that starts with `/` is an `invalid-regex`, not a `parse-error`: the regex has
no closing `/`. A grammar failure on content that opens with a backtick is a
`schema-error`, see [Content](#content). The grammar does not check the spaces
and tabs at the ends of a pattern string, nor the visible character rule. See
[Pattern string](../references/patterns.md#pattern-string).

A block takes its patterns in one of two forms:

* **Single line**: the `content` after the colon is one pattern, with no
  feedback and no comment.
* **List**: a markdown unordered list that starts on the line right after the
  tag. Each item is one pattern, with optional feedback and comment lines.

Both forms produce the same list: `[short-answer]: Brasília` and a
`[short-answer]:` followed by the single item `* Brasília` are the same
document, with `accept: ["Brasília"]`. The pattern keeps its delimiters
(`` ` `` or `/`).

The list MUST start on the line right after the tag, with no blank line in
between. A list after a blank line is not part of the block: it is an
epilogue element. Implementations SHOULD warn about it, since it is a likely
mistake (`detached-answer-list`). A tag with content on its line MUST NOT be
followed by a list without a blank line.

```md
[short-answer]:
* Brasília
* /Bras[íi]lia DF/i
```

```md
[short-answer]:

* Brasília
```

The first block accepts two patterns. The second declares a question with no
`accept` pattern and a list in the epilogue, and gets the warning.

A `[short-answer/reject]` block MUST declare at least one pattern: an empty
tag line, with or without a detached list after it, is an error. Only the
accept block may be empty, see [Block with no pattern](#block-with-no-pattern).

### Content

The content is one pattern string, interpreted as plain text (never
markdown). Bare content is matched inexactly, backtick-enclosed content
exactly and content delimited by `/` is a regex. See
[Pattern string](../references/patterns.md#pattern-string).

An exact literal can span lines: each line ending becomes one U+0020, which
is significant, see
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
allow it. Both cases are a `schema-error`, as any other incomplete exact
literal:

```md
[short-answer]: `Rio
Negro`
```

The first example is the literal `Rio Negro`. A tag line with only a backtick,
followed by `Rio Negro` and a closing backtick, is a `schema-error`, and so is
`Rio Negro` followed by a line that holds only the closing backtick.

Note that `PLAIN_TEXT` cannot begin with a backtick, so content that opens
with one MUST be a complete exact literal; there is no way to write an inexact
answer starting with a backtick, and no need for one. Content that opens with
a backtick and is not a complete literal is a `schema-error`. This holds when
the closing run has another length than the opening run, when text follows the
closing run, and when no closing run exists. Examples are
`` `math.isnan` (x) ``, `` `math.isnan `` and ``` ``x` ```. The error holds in
the single-line form and in the list form.

### Block with no pattern

A `[short-answer]` block MAY have no pattern. The question then has no
`accept` list. If it has no `reject` list either, the instructor grades every
response, see [Grading](#grading).


### Pattern lines

Each item of a list holds one pattern on its first line, the pattern line,
followed by optional `>` feedback and `!` comment lines. A pattern line is a
pattern string, with the same meaning as the content of a single-line block.
The pattern, the feedback and the comment can continue on the next lines, and
so can the content of a single-line block, see
[Continuation lines](../references/patterns.md#continuation-lines).
See [Pattern items](../references/patterns.md#pattern-items).

The lines after the content of a single-line block follow these rules:

| Line right after the content or an empty tag       | Result                          |
| -------------------------------------------------- | ------------------------------- |
| Lazy line (`LAZY_START`), up to a blank line       | continues the content           |
| Setext underline[^19]                              | `parse-error`                   |
| `>` line, or `!` line (not `![`)                   | `parse-error`                   |
| List item                                          | `parse-error`                   |
| ATX heading, fenced code, HTML block, thematic break | ends the block, goes to the epilogue |

A lazy line continues the content also after an empty tag. The normative rule
for a lazy line is the paragraph continuation of CommonMark. `LAZY_START` is an
approximation of it, see
[Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).
A line of `>` or `!` with four or more columns of indentation cannot start a
block quote or a comment, so it is continuation text, not a `parse-error`. A `>` or `!` line
right after an empty tag (`[short-answer]:` then `> x`) is a `parse-error` as
well, as it is after content. A `>` or `!` line is not feedback or a comment
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

**The score is always binary**: a response is either correct or incorrect,
worth 1 or 0, and nothing in between. An instructor who wants to award partial
credit has to grade manually.

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

`Rio de Janeiro` is incorrect and gets its own feedback. `Salvador` is
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

[short-answer]:

[short-answer/reject]:
* Savana
  > Savanna is the general term. Name the Brazilian biome.
```

There is no `accept` pattern, so `unmatched` is `"manual"`. `Savana` is
incorrect, and the instructor grades every other response.

Manual:

```md
Name a biome of central Brazil.

[short-answer]:
```

No response is settled. The question works like a one-line essay.


## Feedback

Feedback is shown to students whose response matches a pattern that defines a
feedback message, in either the `[short-answer]` or the
`[short-answer/reject]` block. The order in which the patterns are defined is
important: the student must receive the feedback of the FIRST pattern that
matches their response AND defines a feedback message.

The list that decided the outcome is the one consulted: a correct response
draws its feedback from `accept`, and an incorrect one from `reject`. A
response that matches an accept rule is correct even when it also matches a
reject rule, and so takes the accept rule's feedback.

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
| accept, reject, preAccept, preReject | error    | schema-error           | a pattern string that opens with a backtick is a complete exact literal (schema)[^15] |
| accept, reject                       | error    | schema-error           | an exact literal must not open at the end of a line, nor close at the start of a line[^20] |
| accept, reject, preAccept, preReject | error    | blank-text             | a pattern string must have at least one visible character[^16]                      |
| accept, reject, preAccept, preReject | error    | invalid-regex          | every `/`-delimited pattern must be a valid MDQ regex[^6]                           |
| accept, reject, preAccept, preReject | error    | invalid-regex          | a regex flag must be a supported or an ignored flag, and must not repeat[^12]       |
| accept, reject                       | error    | parse-error            | each body block may be defined at most once[^11]                                    |
| accept, reject                       | error    | parse-error            | a tag with content must not be followed by a list without a blank line              |
| accept, reject                       | error    | parse-error            | a `>` or `!` line must not follow the content or an empty tag line, without a blank line |
| accept, reject                       | error    | parse-error            | a setext underline must not follow the content or an empty tag line[^19] |
| accept, reject                       | error    | parse-error            | the Markdown body must have at least one of the `[short-answer]` and `[short-answer/reject]` blocks |
| reject                               | error    | parse-error            | must declare at least one pattern; a list after a blank line is an epilogue element |
| accept, reject                       | error    | parse-error            | an item carries at most one feedback block and one comment block                    |
| accept, reject                       | error    | parse-error            | a pattern line must not be empty[^17]                                               |
| preAccept, preReject                 | error    | forbidden-block-element | there is no `[short-answer/preAccept]` or `[short-answer/preReject]` block[^18]    |
| automation                           | error    | invalid-frontmatter-field | must not be in the frontmatter                                                   |
| automation                           | error    | schema-error           | must not be a field of the YAML or JSON form                                        |
| accept                               | warning  | detached-answer-list   | a list after a blank line is an epilogue element, not the pattern list              |
| unmatched                            | error    | schema-error           | must be "incorrect" or "manual" (schema)                                            |
| unmatched                            | warning  | no-correct-answer      | should not be "incorrect" when the question has no `accept` pattern[^8]               |
| incorrectFeedback                    | error    | blank-text             | if defined, must have at least one visible character                                |
| accept, reject, preAccept, preReject | info     | redundant-regex-anchor | an anchor that is already implicit is redundant[^9]                                 |
| accept, reject, preAccept, preReject | info     | ignored-regex-flag     | carries a flag that is accepted but ignored[^10]                                    |
| accept, reject, preAccept, preReject | info     | unmatchable-regex-escape | under the `n` flag, has an escape that the strip changes[^13]                     |

The table lists diagnostics only. The MAY permissions of the type (a
`[short-answer/reject]` block, a `[short-answer]` block with no pattern) and
the SHOULD about `automation` as a read-only property have no row, because
they cannot fail.

[^6]: The supported syntax is the subset described in
[Regex](../references/patterns.md#regex): the pattern must compile and must
stay inside that subset.
[^8]: No response can be correct: every response is incorrect, by a `reject`
pattern or by `unmatched`. The lint code is `no-correct-answer`.
[^9]: Without the `f` flag, a leading `^` is implicit. Without the `f` or `b`
flag, a trailing `$` is implicit. See
[Regex flags](../references/patterns.md#regex-flags).
[^10]: `m`, `g`, `s`, `u`, `v`, `y` and `d` are accepted for compatibility and
have no effect, see [Regex flags](../references/patterns.md#regex-flags).
[^11]: `[short-answer/accept]` is an alias of `[short-answer]`, so a document
with both has the block twice.
[^12]: For example, `/brasil/x` and `/brasil/ii` are invalid. See
[Regex flags](../references/patterns.md#regex-flags).
[^13]: An escape that denotes a code point (`\uXXXX`, `\xXX`, `\u{...}`) is
never changed by `n`. If the strip changes that code point (a combining mark of
category `Mn`, or a code point whose NFD holds one, such as U+00E1), the
response cannot contain it. See [Regex flags](../references/patterns.md#regex-flags).
[^15]: For example, `` `math.isnan` (x) ``, `` `math.isnan `` and ``` ``x` ```.
The same holds for the single-line form and for the list form. The schema
checks that the pattern opens and closes with a backtick. It cannot compare
the length of the two runs, so the models check the rest.
[^16]: Without a visible character, as
[grammar.md](../references/grammar.md#visible-characters) defines it. For an
exact literal, the text between the backticks is checked. `"   "`, an exact
literal of one space and a lone U+200B are `blank-text`. An empty string is
a `schema-error`.
[^17]: An item such as `*` followed by a feedback line has no pattern.
[^18]: The block is an epilogue element that the type forbids. `preAccept` and
`preReject` are frontmatter fields, see [Frontmatter](#frontmatter).
[^19]: A line of only `=` or only `-` characters, with up to three spaces of
indentation and optional trailing spaces and tabs, right after the content
(also after its continuation lines). In CommonMark it turns the tag line into a
heading, so there is no definition. With four or more spaces of indentation the
line is continuation text. It applies to the single-line form and to a list
item.
[^20]: The body form only. A pattern string of the YAML, JSON and frontmatter
form has no line ending at all, which is a `schema-error` already.
