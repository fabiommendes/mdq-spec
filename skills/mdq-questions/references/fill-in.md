# Fill in the blanks

A sentence with gaps. Each `[^slug]` in the stem is a blank, and every blank
gets a definition below.

```md
The capital of Brazil is [^capital]. It has roughly [^size] inhabitants.

[^capital]:
* [ ] Lisbon
* [*] Brasília
* [ ] São Paulo
* [ ] Rio de Janeiro

[^size/numeric]: 2750000 +- 10%
```

Every blank in the stem must be defined, and every definition must be
referenced. Definitions may come in any order. Reference each blank once: a
repeated `[^slug]` in the stem is an error.

## Blank kinds

The suffix in the tag picks the kind; a bare `[^slug]:` is a choice blank.

```md
[^city]:                              # choice blank: list starts on the NEXT line
* [ ] Salvador
* [*] Brasília
  > Since 1960.

[^length/numeric(km)]: 6400 +- 5%     # numeric blank, same syntax as [numeric]

[^river/short-answer]: Amazon         # short answer blank, one pattern

[^planet/short-answer]:               # or a list right after the tag
* Jupiter
* `Jove`
  > Archaic, but accepted.

[^planet/short-answer/reject]:
* Saturn
  > Second largest, but not the largest.
```

Choice blanks take the full [multiple choice](multiple-choice.md#choice-anatomy)
item syntax, including feedback. Short answer blanks take the short answer
pattern item syntax, including feedback. Numeric blanks have no feedback
syntax in the tag: use the `incorrectFeedback` map of the frontmatter.

The tag line of a choice blank is empty and the list follows on the next line.
`[^capital]: Brasília` is a `parse-error`: write `[^capital/short-answer]:`.

Short answer blanks follow the [short answer](short-answer.md) rules:
`[^slug/short-answer]` is the accept block (`/accept` is an alias),
`[^slug/short-answer/reject]` the reject block, each at most once per blank,
with one pattern on the tag line or a list right after the tag. A list after a
blank line is epilogue text (`detached-answer-list`), a reject block needs at
least one pattern, and a blank needs at least one of the two blocks (only a
reject block is valid, and the accept block may be empty). Without accept
patterns, `unmatched` defaults to `manual`: the instructor grades the responses
that no reject pattern settles. `unmatched` in the frontmatter applies to every short
answer blank.

The definitions are one run of blocks separated only by blank lines. A
definition tag line after any other block is epilogue text, and it is the error
`detached-blank-definition`: move the paragraph after the definitions.

## Where blanks may appear

Only in a plain-text run of an ordinary paragraph. Not in headings, list items,
table cells, blockquotes, code blocks, and not inside inline markup — so
`**start [^blank] end**` is invalid. Put the emphasis around the text, not
around the blank.

## Frontmatter

| Field      | Values                                                   |
| ---------- | -------------------------------------------------------- |
| shuffle    | `inherit` (default: the exam's value, else `false`), `true`, `false` |
| grading    | `inherit` (default: the exam's value, else `symmetric`), `symmetric`, `partial`, `no-mistakes`, `all-or-nothing` |
| diacritics | `fold` (default) or `keep`, for every short answer blank |
| unmatched  | `incorrect` or `manual`, for every short answer blank    |
| preAccept  | map of blank id to pattern list, pre-validation only     |
| preReject  | map of blank id to pattern list, pre-validation only     |
| incorrectFeedback | map of blank id to the feedback of an incorrect response with no pattern feedback |
| domain     | map of numeric blank id to `integer`, `decimal` or `fraction`; normally inferred |
| decimalPlaces | map of numeric blank id to the precision of the comparison           |

`preAccept` and `preReject` have no body block. Write them in the
frontmatter, keyed by the blank id; every key must be a short answer blank (`incorrectFeedback` also takes a numeric
blank):

```yaml
preAccept:
  state: ["/^[A-Za-z ]+$/"]
preReject:
  season:
    - pattern: "/\\d+/"
      feedback: Write the season, not a month number.
incorrectFeedback:
  state: That is not a state of the Southeast.
```

`incorrectFeedback` follows the same rule: the key is a short answer blank or a
numeric blank (not a choice blank), and the text means what it means in a short
answer or numeric question. A numeric blank shows it for a well-formed response
outside the tolerance.

`domain` and `decimalPlaces` are for numeric blanks only. Use them to declare
what the tag cannot say, for example a `decimal` blank with an integer answer:

```yaml
domain:
  height: decimal
decimalPlaces:
  height: 1
```

## Grading

Each blank is graded by its own type's rules and yields a score in -1..1 (only
choice blanks can go negative). An empty blank (missing key or `null`) scores
0. A choice blank uses the multiple choice `partial` scores under `partial`,
`no-mistakes` and `all-or-nothing` (a wrong pick is 0) and `symmetric` scores
under `symmetric`. Then:

* `partial`: mean of the blank scores, negatives taken as 0.
* `no-mistakes`: 0 if any filled blank scores below 1; otherwise the mean, an
  empty blank counting 0.
* `all-or-nothing`: 1 only if every blank is fully correct.
* `symmetric`: plain mean, negatives included.
