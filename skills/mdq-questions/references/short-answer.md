# Short answer

A short typed response, compared against one or more patterns.

```md
What is the capital of Brazil?

[short-answer]: Brasília
```

By default matching is **inexact**: case, diacritics, invisible characters,
typographic quotes and dashes (`’` for `'`, `–` for `-`) and surrounding/repeated
whitespace are ignored, so `brasilia` is accepted.

## Pattern forms

Used in the body, and in the `preAccept` and `preReject` of the frontmatter:

| Written as          | Matched as                                     |
| ------------------- | ---------------------------------------------- |
| `Brasília`          | plain string, inexact (the usual choice)       |
| `` `math.isnan` ``  | exact literal: case and punctuation matter     |
| `/[Bb]ras[íi]lia/i` | regex, anchored at both ends                   |

A literal answer that starts with `/` must be in backticks: `` `/usr/bin` ``.

An exact literal follows the CommonMark code span: N backticks open it and a run
of exactly N backticks closes it. To write a backtick in the answer, use a
longer fence, and put one space inside each end if the answer starts or ends
with a backtick: ``` `` `date` `` ``` is the answer `` `date` ``, and
```` ```a``b``` ```` is ``` a``b ```.

Keep the opening and the closing backtick next to the text. A literal cannot
open at the end of a line, and the closing backtick cannot start a line. If you
wrap a long literal, break it between words.

A line of only `=` or `-` right under the content of a `[short-answer]:` line
is an error: Markdown reads it as a heading underline. Leave a blank line, or
use the list form.

Demand an exact answer for code, spelling or orthography questions:

```md
Which **Python** function checks if a number is NaN?

[short-answer]: `math.isnan`
```

## Accept / reject blocks

`[short-answer]` is the accept block (`[short-answer/accept]` is an alias; use
one spelling). `[short-answer/reject]` lists known wrong answers. A question
needs at least one of the two blocks. With only a reject block, `unmatched`
defaults to `manual`: the instructor grades what no reject pattern settles.
Each block appears at most once and takes either one pattern on the tag line or a bullet
list starting on the line right after the tag. Order matters: the first
matching pattern supplies the feedback.

```md
What is the capital of Brazil?

[short-answer]:
* /[Bb]ras[íi]lia/i
  > Good call!

[short-answer/reject]:
* Buenos Aires
  > That's the capital of Argentina!
* Rio de Janeiro
  > It used to be, but not since 1960.
  ! Most common wrong answer.
* *
  > Sorry, that is not the correct answer.
```

* A tag with a colon needs a pattern: on its line, or in a list that starts on
  the very next line. A blank line before the list is an error (the list would
  leak to the student as epilogue text). `[short-answer]:` with nothing after
  it is an error too.
* A tag with a pattern on its line must not be followed directly by a list.
* `[short-answer]` without a colon is a block with no pattern (manual grading).
  `[short-answer/reject]` always needs the colon and a pattern.
* A reject block needs at least one pattern.
* Per item: at most one `>` feedback block and one `!` comment block, in
  either order, never interleaved.
* An accept match always beats a reject match.

## Regex

JavaScript-like syntax, anchored at both ends (so `/abc/` does not match
`xabc`), **case-sensitive by default**. Flags:

* `i`: ignore case.
* `n`: ignore diacritics.
* `f`: match anywhere in the response (substring).
* `b`: match a prefix.

Not supported: lookbehind, named groups, `\p{...}`, class intersections.
`m g s u v y d` are accepted but ignored. Any other flag, or a repeated flag
(`/abc/ii`), is an error.

## Frontmatter

| Field      | Description                                              |
| ---------- | -------------------------------------------------------- |
| preAccept  | Response must match one of these to be *submittable*: validation only, not grading |
| preReject  | Response must match none of these to be submittable       |
| diacritics | `fold` (default) or `keep` to require the accents         |
| unmatched  | `incorrect` or `manual`: what a response that matches no pattern gets |
| incorrectFeedback | Feedback for an incorrect response without a pattern feedback |

The `preAccept` and `preReject` entries are pattern strings or
`{ pattern: ..., feedback: ..., comment: ... }` objects. The feedback of an
invalid submission is the one of the first matching `preReject` pattern that
has feedback; if none matches, and no `preAccept` pattern matches, it is the
one of the first `preAccept` pattern that has feedback (use it as a format
hint). Feedback of a graded response comes from the first matching pattern
that has feedback, in the list that decided the outcome. `accept` and `reject`
are set only by the `[short-answer]` and `[short-answer/reject]` blocks: as
frontmatter keys they are an error (`invalid-frontmatter-field`), like any key
that is not in the table. There are no `oneOf` or `regex` fields.

## Grading

Always binary: 1 or 0. A response that matches no pattern follows `unmatched`:
`incorrect` (the default when there is an accept pattern) scores 0; `manual`
(the default when there is none) sends it to the instructor. Set
`unmatched: manual` in the frontmatter to grade unknown responses by hand.
`incorrectFeedback` in the frontmatter is the feedback for an incorrect
response that no pattern gave feedback to. A `[short-answer]` tag
with no colon and no patterns means fully manual grading.
