# Exams

An exam is one file holding several questions. It starts with an H1 title
(optionally with a slug) and separates questions with `===`.

````md
---
course: CS101
locale: pt-BR
---

# [midterm] Midterm Exam

One or more paragraphs of instructions.

---
include: recursion-01
---

---
id: q2
---
Convert this iterative algorithm into a recursive one.

```python
def factorial(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
```

[essay]

===

Judge the statements.

* [V] Any iterative algorithm can be implemented recursively.
* [F] Recursion tends to be more memory efficient than iteration.
````

* The `===` separator needs a blank line before it. It is optional when the
  question starts with its own frontmatter.
* `include: <id>` pulls in a question defined elsewhere and occupies a position
  like any other block.
* Questions without an `id` get `q1`, `q2`, ... by position.
* The exam body may not use H1 headings (the title is the only one).

## Frontmatter

Besides the usual `title`, `id`, `uuid`, `tags`, `meta`:

| Field   | Description                                                |
| ------- | ---------------------------------------------------------- |
| course  | Course code                                                 |
| author  | Inherited by the questions                                  |
| locale  | Inherited by the questions, e.g. `pt-BR`                    |
| grading | Grading strategy for the questions with `grading: inherit` (the default); may also be a mapping of question type to strategy |
| shuffle | `shuffle` for the questions with `shuffle: inherit` (the default); `false` by default |
| penalty | `none` (default), `capped` or `full`                         |

Only `author` and `locale` are copied into the questions; a question that
declares either keeps its own. `grading` and `shuffle` reach a question through
its own `inherit` value, which is the default, so a question that writes
`grading: partial` or `shuffle: false` ignores the exam.

```yaml
grading:
  multiple-choice: all-or-nothing
  true-false: partial
```

`penalty` decides what happens to a negative question score: `none` floors each
question at 0, `capped` keeps negatives but floors the exam total at 0, `full`
floors nothing.
