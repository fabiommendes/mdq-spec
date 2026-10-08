# Ordering

Sort lines into the right order. The `[ordering]` block is **always written in
the correct order** — it is the answer key, and implementations shuffle it
before showing it to the student.

````md
Sort the lines below into a program that prints the first 10 Fibonacci numbers.

[ordering]
```python
x, y = 1, 1
for _ in range(10):
    print(x)
    aux = x + y
    x = y
    y = aux
```
````

The block after the tag is either a fenced code block (implies `content: code`,
and the fence language becomes `highlight`) or an unordered list (implies
`content: text`).

## Extra sections

All optional, all using the same block type as the main block.

````md
## [extra]                  # distractor lines, mixed in, must NOT be used
```python
y = x + y
```

## [accept]                 # an alternative correct order; may repeat
! Instructor comment: the print and aux lines can be swapped.
```python
x, y = 1, 1
for _ in range(10):
    aux = x + y
    print(x)
    x = y
    y = aux
```

## [reject]                 # a known wrong order, worth explaining; may repeat
> Without the auxiliary variable this produces powers of two.
```python
x, y = 1, 1
for _ in range(10):
    print(x)
    x = y
    y = x + y
```
````

`>` lines are student feedback, `!` lines are instructor comments; they may not
interleave. The same lines must never appear as both accepted and rejected.

## Frontmatter

| Field          | Values                                                    |
| -------------- | --------------------------------------------------------- |
| content        | `code` or `text` — inferred from the body                  |
| highlight      | Language, for `content: code` — inferred from the fence    |
| indentation    | `fixed` (default), `lenient`, `strict`                     |
| unmatched      | `manual` (default) or `incorrect`                          |
| normalizations | `dedent` (flattens every level to 0), `skip-blanks`        |

* `fixed` keeps the authored indentation and the student cannot change it. The
  level still identifies the line, so a distractor may differ from a key line
  by indentation alone.
* `lenient` lets the student indent freely but ignores it when grading.
* `strict` lets the student indent and grades it — use it for code where
  indentation carries meaning.

## Grading

A response matching the answer key or an `## [accept]` block is correct; one
matching `## [reject]` is wrong. Anything else goes to the instructor, unless
`unmatched: incorrect` scores it 0.
