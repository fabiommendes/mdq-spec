# Numeric

A single numeric answer with an optional unit and tolerance.

```md
How many grams of water are in a liter?

[numeric(g)]: 1000
```

## Body forms

```md
[numeric]: 42                  # integer
[numeric]: 3.14                # exact decimal - rarely what you want
[numeric]: 3.14 +- 0.1         # absolute tolerance
[numeric]: 3.14 +- 5%          # relative tolerance (5% of the answer)
[numeric]: 3.14 +- 5% +- 0.1   # both: the response passes if it clears EITHER
[numeric]: -1/3                # fraction
[numeric(kg)]: 5.5 +- 0.1      # with a unit
```

A unit is letters, digits, `.`, `-`, `_` — written inside the tag, never after
the value.

## Frontmatter

| Field         | Description                                         |
| ------------- | --------------------------------------------------- |
| unit          | Same as the `(unit)` in the tag                      |
| domain        | `integer`, `decimal` or `fraction` — normally inferred |
| decimalPlaces | Digits to show/accept; only meaningful for `decimal` |

The domain is inferred from how the value and absolute tolerance are written
(the wider of the two wins: integer < fraction < decimal). A percentage
tolerance does not change it.

## Grading

Binary: inside the tolerance scores 1, anything else 0. There is no `grading`
field and no partial credit — widen the tolerance to be lenient.

## Gotchas

* Always give a tolerance for decimal or fraction answers; otherwise the number
  of digits the student types decides the grade.
* A relative tolerance on an answer of `0` accepts only an exact `0`.
* `5%` is five percent; a `relative: 5` in the parsed form would be 500%.
