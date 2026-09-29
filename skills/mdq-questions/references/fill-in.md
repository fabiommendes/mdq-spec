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

[^planet/short-answer]: Jupiter       # short answer blank

[^planet/short-answer/accept]:        # or with accept/reject lists
* Jupiter
* `Jove`
  > Archaic, but accepted.

[^planet/short-answer/reject]:
* Saturn
  > Second largest, but not the largest.
* *
  > Not a planet of the Solar System.
```

Choice blanks take the full [multiple choice](multiple-choice.md#choice-anatomy)
item syntax, including feedback. Numeric and short answer blanks have no
feedback syntax.

## Where blanks may appear

Only in a plain-text run of an ordinary paragraph. Not in headings, list items,
table cells, blockquotes, code blocks, and not inside inline markup — so
`**start [^blank] end**` is invalid. Put the emphasis around the text, not
around the blank.

## Frontmatter

| Field   | Values                                             |
| ------- | -------------------------------------------------- |
| shuffle | `true` to allow shuffling the inner choices         |
| grading | `symmetric` (default), `partial`, `all-or-nothing`  |

## Grading

Each blank is graded by its own type's rules and yields a score in -1..1 (only
choice blanks can go negative). An empty blank scores 0. Then:

* `partial`: mean of the blank scores, negatives taken as 0.
* `all-or-nothing`: 1 only if every blank is fully correct.
* `symmetric`: plain mean, negatives included.
