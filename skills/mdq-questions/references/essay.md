# Essay

Free-text response, graded manually. The body is the single tag `[essay]`.

```md
Describe how the greenhouse effect works and how it affects the climate.

[essay]
```

## Frontmatter

| Field     | Values                                                  |
| --------- | ------------------------------------------------------- |
| input     | `text` (rich text), `plain` (no formatting), `code`      |
| highlight | Language for `input: code`, e.g. `python`                |

## Answer key

Optional, after the `[essay]` tag and any epilogue. Guides the instructor and
may be shown to students.

```md
Write a function that computes the n-th Fibonacci number.

[essay]

## [answer-key]
A straightforward iterative solution keeps the two previous values and loops n
times, running in O(n) time and O(1) space.
```

Use `highlight` only together with `input: code`.
