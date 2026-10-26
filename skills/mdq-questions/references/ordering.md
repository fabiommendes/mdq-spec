# Ordering

Sort lines into the right order. The `[ordering]:` block is **always written in
the correct order** — it is the answer key, and implementations shuffle it
before showing it to the student.

````md
Sort the lines below into a program that prints the first 10 Fibonacci numbers.

[ordering]:
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
`content: text`). The body always decides: never write `content` or `highlight`
in the frontmatter (error). In a list, a nested item is a line of its own and its
indentation level is its nesting depth; an ordered sub-list is an error. An item that only holds a nested list adds a
level without being a line (`- - Bahia` is level 1), which is how a nested
distractor goes alone in `## [extra]`. In `[ordering]`, `## [accept]` and
`## [reject]` the first line is level 0 and a line goes at most one level deeper
than the previous (`invalid-outline-level`). For free indentation use a fenced
block.
Trailing whitespace of a line is dropped.

## Extra sections

All optional, all using the same block type as the main block. A code fence in
a section has the language of the `[ordering]` fence or none (it inherits it);
another language is an error. They come after
the epilogue, if there is one, and they are contiguous: no prose between two
sections or after the last one.

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
interleave. Compare lines after normalization (including what `lenient`
implies) in the rules below:

* A `[reject]` must never hold the same lines as the `[ordering]` block or as an
  `[accept]` (error).
* An `[accept]` may omit lines, but must not hold a distractor, a foreign line
  or extra copies of a line the `[ordering]` block lacks (error).
* An `[accept]` that repeats the `[ordering]` block is redundant (warning).
* A `[reject]` that needs a line `[ordering]` plus `[extra]` do not offer can
  never match (warning).
* A distractor that equals a key line after normalization is a spare copy.
* The tag is `[ordering]:`, with a colon (`[ordering]` alone is an error). The
  block after it starts on the next line; a blank line between them is an
  error. A section heading with no block under it is an error.
* A section heading may be indented up to 3 spaces, end with spaces or `##`, or
  be setext (`[extra]` underlined by `---`). Prefer `## [extra]`.

## Frontmatter

| Field          | Values                                                    |
| -------------- | --------------------------------------------------------- |
| indentation    | `fixed` (default), `lenient`, `strict`                     |
| unmatched      | `incorrect` (default) or `manual`                          |
| normalizations | `dedent` (flattens every level to 0), `skip-blanks`        |

* `fixed` keeps the authored indentation and the student cannot change it. The
  level still identifies the line, so a distractor may differ from a key line
  by indentation alone.
* `lenient` and `strict` show every line at level 0 at first; `fixed` shows
  the authored level.
* `lenient` lets the student indent freely but ignores it when grading.
* `strict` lets the student indent and grades it — use it for code where
  indentation carries meaning.

`content` and `highlight` are not frontmatter fields here. Only in YAML or JSON
they exist: `content` (`code` or `text`) is required, `highlight` is optional
and only with `content: code`. A code fence with no language is valid but gets
an info: give it one.

## Grading

A response matching the answer key or an `## [accept]` block is correct; one
matching `## [reject]` is wrong. Anything else scores 0 (`unmatched: incorrect`,
the default). Write `unmatched: manual` to send it to the instructor.
