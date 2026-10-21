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
[numeric]: 6.022e23            # scientific notation, always decimal
[numeric(kg)]: 5.5 +- 0.1      # with a unit
```

An exponent (`e` or `E`, optional sign, 1 to 3 digits) follows an integer or a decimal,
in the value and in both tolerances: `6.022e23`, `1E-3`, `2.5e+4`, `1e05`. A
fraction takes none. Write other spellings in the plain form, or the parser
gives a `parse-error` with a hint: `-` (not U+2212), `+-` (not `±`), `.` (not a
decimal comma), and no digit group separator (`2995`, not `2 995`). A value must fit a double: no more than about 1.8e308, and not a
nonzero value that rounds to 0 (`1e400` and `1e-999` are errors).

A unit is any text without whitespace or the brackets `(`, `)`, `[`, `]`, such
as `kg`, `km/h`, `°C` or `µm`. Write it inside the tag, never after the value.
The unit is plain text: `[numeric(m\*s)]` has the unit `m\*s`. A response is in
the declared unit or has none; any other unit is a malformed response. MDQ does
not convert units.

## Frontmatter

| Field         | Description                                         |
| ------------- | --------------------------------------------------- |
| domain        | `integer`, `decimal` or `fraction` — normally inferred |
| decimalPlaces | Precision of the comparison: the response is rounded to it before the tolerance test. Inferred from the digits of the value and of the absolute tolerance; only meaningful for `decimal` |
| incorrectFeedback | Feedback for an incorrect response. Never shown for a correct, malformed or skipped response |

The unit is set only by the `(unit)` in the tag. A `unit` key in the frontmatter
is an error (`invalid-frontmatter-field`).

The domain is inferred from how the value and absolute tolerance are written
(the wider of the two wins: integer < fraction < decimal). A percentage
tolerance does not change it. A number with an exponent is `decimal`, and its
decimal places are the digits after the point less the exponent, never below 0
(`6.022e23` has 0, `1.5e-3` has 4). In YAML/JSON a number of whole value (`5`, `4.0`)
is an `integer`; write `domain: decimal` or the string `"4.0"` for a decimal.

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
| `6.022e23`, `1E-3`       | `6.022e+23`, `0.001`                               |
| `1.50e3`                 | `"1.50e3"` (a trailing zero after the point is kept) |

`domain` still records how the value is written. When you write YAML/JSON by
hand, either form is valid, but a string must follow the body syntax
(`sign? numeric_value`, with the optional exponent, no zero denominator). The `answer` and the tolerances must be
finite (no `.inf`, `.nan`). With `domain: fraction`, write the
answer as a fraction string (`"3/4"`) or an integer, never as a decimal such as
`0.75` (`answer-outside-domain`).

## Grading

Binary: inside the tolerance scores 1, anything else 0. There is no `grading`
field and no partial credit — widen the tolerance to be lenient.

## Gotchas

* Always give a tolerance for decimal answers; otherwise the number of digits
  the student types decides the grade. A fraction or integer question compares
  exact values, so it needs none.
* With `domain: integer` or `fraction`, a decimal absolute tolerance
  (`+- 0.5`) is flagged (`domain-mismatch`).
* A relative tolerance on an answer of `0` accepts only an exact `0`.
* `5%` is five percent; a `relative: 5` in the parsed form would be 500%.
* The comparison is exact: `3.14 +- 0.1` accepts `3.24`. The relative tolerance
  uses the answer before the rounding to `decimalPlaces`.
