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

A unit is any text without whitespace or the brackets `(`, `)`, `[`, `]`, such
as `kg`, `km/h`, `°C` or `µm`. Write it inside the tag, never after the value.

## Frontmatter

| Field         | Description                                         |
| ------------- | --------------------------------------------------- |
| unit          | Same as the `(unit)` in the tag                      |
| domain        | `integer`, `decimal` or `fraction` — normally inferred |
| decimalPlaces | Precision of the comparison: the response is rounded to it before the tolerance test. Inferred from the digits of the value and of the absolute tolerance; only meaningful for `decimal` |

The domain is inferred from how the value and absolute tolerance are written
(the wider of the two wins: integer < fraction < decimal). A percentage
tolerance does not change it.

## Answer in YAML/JSON

The parsed `answer` is a number, or a string in the body syntax when a number
would lose information:

| Body                     | `answer`                                           |
| ------------------------ | -------------------------------------------------- |
| `42`, `-1`               | `42`, `-1`                                         |
| `390000000000`           | `"390000000000"` (outside the 32-bit range)        |
| `1/3`, `3/4`             | `"1/3"`, `"3/4"` (a fraction is always a string)   |
| `0.25`, `-273.15`        | `0.25`, `-273.15`                                  |
| `2.50`, `2.0`            | `"2.50"`, `"2.0"` (a trailing zero is kept)        |
| `3.14159265358979323846` | a string (more digits than a float holds)          |

`domain` still records how the value is written. When you write YAML/JSON by
hand, either form is valid, but a string must follow the body syntax
(`sign? value`, no zero denominator). With `domain: fraction`, write the
answer as a fraction string (`"3/4"`) or an integer, never as a decimal such as
`0.75`.

## Grading

Binary: inside the tolerance scores 1, anything else 0. There is no `grading`
field and no partial credit — widen the tolerance to be lenient.

## Gotchas

* Always give a tolerance for decimal or fraction answers; otherwise the number
  of digits the student types decides the grade.
* A relative tolerance on an answer of `0` accepts only an exact `0`.
* `5%` is five percent; a `relative: 5` in the parsed form would be 500%.
