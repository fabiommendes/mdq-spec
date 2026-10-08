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
frontmatter

| Field      | Type           | Description                                |
| ---------- | -------------- | ------------------------------------------ |
| type       | "short-answer" | The type discriminator                     |
| accept     | pattern-list   | Patterns of correct answers [^1]           |
| reject     | pattern-list   | Patterns of incorrect answers [^2]         |
| preAccept  | pattern-list   | Patterns a submission must match [^3]      |
| preReject  | pattern-list   | Patterns a submission must not match [^4]  |
| diacritics | string         | Either "fold" (the default) or "keep" [^5] |
| unmatched  | string         | Either "incorrect" or "manual": what happens to a response that matches no pattern [^13] |
| incorrectFeedback | string  | Feedback for an incorrect response that no pattern gave feedback to [^14] |

`pattern-list` is an array of patterns. Each entry is either a pattern string
or an object with a `pattern`, a `feedback` and a `comment`. See
[Patterns](../references/patterns.md) for the pattern strings, the object form
and the regex dialect. The regex flags are NOT the same as in JavaScript.

`accept` and `reject` are the canonical form of the `[short-answer/accept]`
and `[short-answer/reject]` blocks -- writing the block and writing the
frontmatter field are two spellings of the same thing, and a document MUST NOT
use both spellings for the same list. A document that does is invalid, and an
implementation MUST reject it with the `conflicting-accept` error.

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

[^13]: Frontmatter-only. If absent, it is `"incorrect"` for a question with
at least one `accept` pattern and `"manual"` for a question with none. See
[Grading](#grading).

[^14]: Frontmatter-only. Inline markdown, like the feedback of a pattern. See
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
incorrect responses. A question MUST have a `[short-answer]` block and MAY
have one `[short-answer/reject]` block, in any order. Each block appears at
most once. `[short-answer/accept]` is an alias of `[short-answer]`, so a
document MUST NOT use both spellings.

Both blocks follow the same grammar:

```lark
accept_block : "[" "short-answer" "/accept"? "]" ws? ":" ws? patterns?
reject_block : "[" "short-answer" "/reject" "]" ws? ":" ws? patterns
patterns     : content | nl pattern_list
content      : exact | inexact
exact        : "`" EXACT_TEXT "`" ws?
inexact      : PLAIN_TEXT
pattern_list : pattern_item+

EXACT_TEXT   : /[^`\n\r]+/
PLAIN_TEXT   : /[^` \t\r\n][^\r\n]*/
```

The rules `ws` and `nl` are defined in
[Common grammar rules](../references/grammar.md). `pattern_item` is an item of
a markdown unordered list, see
[Pattern items](../references/patterns.md#pattern-items).

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

A `[short-answer]` block with content and an `accept` field in the
frontmatter are two spellings of the same list, and a document MUST NOT use
both. The same holds for `[short-answer/reject]` and `reject`.

### Content

The content is one pattern string, interpreted as plain text (never
markdown). Bare content is matched inexactly, backtick-enclosed content
exactly and content delimited by `/` is a regex. See
[Pattern string](../references/patterns.md#pattern-string).

Note that `PLAIN_TEXT` cannot begin with a backtick, so content that opens
with one MUST be a complete backtick-enclosed span; there is no way to write
an inexact answer starting with a backtick, and no need for one.

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


## Regex

A pattern delimited by `/` is a regular expression, written in a subset of the
JavaScript syntax with its own flags. See
[Regex](../references/patterns.md#regex) and
[Regex flags](../references/patterns.md#regex-flags).


## Grading

Grading is driven by the `accept` and `reject` patterns, whether they are
written as body blocks or as frontmatter fields. The `preAccept` and
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

The `reject` list only says which responses are known to be incorrect, usually
to give them a feedback. It does not change what happens to the other
responses.

### Automation

The **automation** of a question tells how many responses it settles:

| Automation       | The question settles                  | Condition                                                                            |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| `automatic`      | every response                        | `unmatched` is `"incorrect"`                                                         |
| `semi-automatic` | the responses that match a pattern    | `unmatched` is `"manual"` and the question has at least one `accept` or `reject` pattern |
| `manual`         | no response                           | `unmatched` is `"manual"` and the question has no pattern                            |

`automation` is not a field of the document. It MUST NOT appear in the
frontmatter of a question, or in its YAML or JSON form, and a document that
declares it has an unknown key. An implementation computes it from `accept`,
`reject` and `unmatched`, and SHOULD offer it as a read-only property of the
question. `preAccept` and `preReject` validate a submission and play no part
in it. Every question type has an automation, see
[Automation](base.md#automation).

An implementation that scores responses MUST NOT give a score to a response
that is not settled. It reports the response as pending, in the same way as a
response to an essay question, see [responses.md](../responses.md#pending).

### Examples

Automatic. The instructor knows the correct answers:

```md
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

An incorrect response that no pattern gave a feedback to shows the
`incorrectFeedback` of the question, if the question declares one. This covers
a response that matches no pattern, under `unmatched: incorrect`, and a
response that matches a `reject` pattern with no feedback. A response that is
not settled shows no feedback, because nothing has decided it yet.

## Additional Rules

| Field                                | Level    | Rule                                                            |
| ------------------------------------ | -------- | --------------------------------------------------------------- |
| accept, reject, preAccept, preReject | critical | a pattern list, when present, has at least one pattern (schema) |
| accept, reject, preAccept, preReject | critical | every `/`-delimited pattern must be a valid MDQ regex[^6]       |
| accept, reject, preAccept, preReject | critical | a regex flag must be a supported or an ignored flag, and must not repeat[^12] |
| accept, reject                       | critical | must not be written as a body block and a frontmatter field[^7] |
| accept, reject                       | critical | each body block may be defined at most once[^11]                |
| accept, reject                       | critical | a tag with content must not be followed by a list without a blank line |
| reject                               | critical | must declare at least one pattern; a list after a blank line is an epilogue element |
| accept, reject                       | critical | feedback and comment lines of an item must not interleave           |
| accept                               | warning  | a list after a blank line is an epilogue element, not the pattern list |
| unmatched                            | critical | must be "incorrect" or "manual"                                 |
| unmatched                            | warning  | must not be "incorrect" when the question has no `accept` pattern[^8] |
| incorrectFeedback                    | warning  | if defined, must have at least one visible character            |
| accept, reject, preAccept, preReject | info     | an anchor that is already implicit is redundant[^9]             |
| accept, reject, preAccept, preReject | info     | should not carry a flag that is accepted but ignored[^10]       |

[^6]: The supported syntax is the subset described in
[Regex](../references/patterns.md#regex): the pattern must compile and must
stay inside that subset.
[^7]: Writing the block and writing the field are two spellings of the same
list. A document that uses both is invalid (`conflicting-accept`).
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
