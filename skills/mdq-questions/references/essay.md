# Essay

Free-text response, graded manually. The body is the single tag `[essay]`.

```md
Describe how the greenhouse effect works and how it affects the climate.

[essay]
```

## Frontmatter

| Field     | Values                                                  |
| --------- | ------------------------------------------------------- |
| content   | `text` (rich text), `plain` (no formatting), `code`      |
| highlight | Language for `content: code`, e.g. `python`              |

## Answer key

Optional, after the `[essay]` tag and any epilogue. Guides the instructor. Never
show it to the student before the response is submitted. It runs to the end of
the question and can hold headings (but not an H1). Write only one section.

```md
Write a function that computes the n-th Fibonacci number.

[essay]

## [answer-key]
A straightforward iterative solution keeps the two previous values and loops n
times, running in O(n) time and O(1) space.
```

Use `highlight` only together with `content: code`.

The tag paragraph holds only `[essay]`. Put length limits in the stem.
