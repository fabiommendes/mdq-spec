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
referenced. Definitions may come in any order.

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
syntax.

Short answer blanks follow the [short answer](short-answer.md) rules:
`[^slug/short-answer]` is the accept block (`/accept` is an alias),
`[^slug/short-answer/reject]` the reject block, each at most once per blank,
with one pattern on the tag line or a list right after the tag. A list after a
blank line is epilogue text (`detached-answer-list`), a reject block needs at
least one pattern, and an empty accept block leaves the blank to the
instructor. `unmatched` in the frontmatter applies to every short answer blank.

## Where blanks may appear

Only in a plain-text run of an ordinary paragraph. Not in headings, list items,
table cells, blockquotes, code blocks, and not inside inline markup — so
`**start [^blank] end**` is invalid. Put the emphasis around the text, not
around the blank.

## Frontmatter

| Field      | Values                                                   |
| ---------- | -------------------------------------------------------- |
| shuffle    | `inherit` (default: the exam's value, else `false`), `true`, `false` |
| grading    | `inherit` (default: the exam's value, else `symmetric`), `symmetric`, `partial`, `all-or-nothing` |
| diacritics | `fold` (default) or `keep`, for every short answer blank |
| unmatched  | `incorrect` or `manual`, for every short answer blank    |
| preAccept  | map of blank id to pattern list, pre-validation only     |
| preReject  | map of blank id to pattern list, pre-validation only     |

`preAccept` and `preReject` have no body block. Write them in the
frontmatter, keyed by the blank id; every key must be a short answer blank:

```yaml
preAccept:
  state: ["/^[A-Za-z ]+$/"]
preReject:
  season:
    - pattern: "/\\d+/"
      feedback: Write the season, not a month number.
```

## Grading

Each blank is graded by its own type's rules and yields a score in -1..1 (only
choice blanks can go negative). An empty blank scores 0. Then:

* `partial`: mean of the blank scores, negatives taken as 0.
* `all-or-nothing`: 1 only if every blank is fully correct.
* `symmetric`: plain mean, negatives included.
