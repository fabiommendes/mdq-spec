# Short answer

A short typed response, compared against one or more patterns.

```md
What is the capital of Brazil?

[short-answer]: Brasília
```

By default matching is **inexact**: case, diacritics and surrounding/repeated
whitespace are ignored, so `brasilia` is accepted.

## Pattern forms

Used in the body and in the frontmatter alike:

| Written as    | Matched as                                      |
| ------------- | ----------------------------------------------- |
| `Brasília`    | plain string, inexact (the usual choice)          |
| `` `math.isnan` `` | exact literal — case and punctuation matter |
| `/[Bb]ras[íi]lia/i` | regex, anchored at both ends              |
| `*`           | wildcard, matches anything (last reject item)     |

Demand an exact answer for code, spelling or orthography questions:

```md
Which **Python** function checks if a number is NaN?

[short-answer]: `math.isnan`
```

## Accept / reject lists

For finer control, list patterns with feedback. Order matters: the first
matching pattern supplies the feedback.

```md
What is the capital of Brazil?

[short-answer/accept]:
* /[Bb]ras[íi]lia/i
  > Good call!

[short-answer/reject]:
* Buenos Aires
  > That's the capital of Argentina!
* Rio de Janeiro
  > It used to be, but not since 1960.
* *
  > Sorry, that is not the correct answer.
```

At most one `[short-answer]`, one `accept` and one `reject` block per question;
a bare `[short-answer]` is just a one-item accept list. An accept match always
beats a reject match.

## Regex

JavaScript-like syntax, anchored at both ends (so `/abc/` does not match
`xabc`), **case-sensitive by default**. Flags:

* `i` — ignore case.
* `n` — ignore diacritics.
* `f` — match anywhere in the response (substring).
* `b` — match a prefix.

Not supported: lookbehind, named groups, `\p{...}`, class intersections.
`m g s u v y d` are accepted but ignored.

## Frontmatter

| Field      | Description                                              |
| ---------- | -------------------------------------------------------- |
| accept     | Same list as the `[short-answer/accept]` block (use one or the other, never both) |
| reject     | Same list as the `[short-answer/reject]` block            |
| preAccept  | Response must match one of these to be *submittable* — validation only, not grading |
| preReject  | Response must match none of these to be submittable       |
| diacritics | `fold` (default) or `keep` to require the accents         |

List entries are pattern strings or `{ pattern: ..., feedback: ... }` objects.

## Grading

Always binary: 1 or 0. An unmatched response goes to the instructor unless the
reject list ends with `*` (or there is no reject block at all). An empty
`[short-answer]:` with no patterns means fully manual grading.
