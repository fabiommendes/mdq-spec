# Numeric

## Example

Numeric questions expect a single numeric answer. They declare both the correct
answer and tolerance.

```md
How many grams of water are there in a liter?

[numeric(g)]: 1000
```

## Frontmatter

Numeric questions accept the following extra arguments in the
frontmatter

| Field         | Type      | Description                                     |
| ------------- | --------- | ----------------------------------------------- |
| type          | "numeric" | The type discriminator                          |
| unit          | string    | Unit of the response, if given                  |
| domain        | string    | Either "integer", "decimal" or "fraction"       |
| decimalPlaces | integer   | Number of decimal places for decimal values[^1] |

[^1]: Must be greater than or equal to zero. The precision of the
comparison, see [Decimal places](#decimal-places). Only meaningful when the
domain is `decimal`.


## Body

Body consists of a tag enclosed in square brackets followed by the expected
numeric value and tolerance.

Here are some examples:

```md
# Simple integer
[numeric]: 42

# Decimal number with exact value
[numeric]: 3.14

# Decimal number with tolerances
[numeric]: 3.14 +- 0.1

# Decimal number with relative tolerance
[numeric]: 3.14 +- 5%

# Decimal number with relative and absolute tolerances
[numeric]: 3.14 +- 5% +- 0.1

# Fraction
[numeric]: -1/3

# Unit specification
[numeric(kg)]: 5.5 +- 0.1
```

The grammar is 

```lark
answer       : ws? "[" "numeric" unit? "]" ws? ":" numeric_body
numeric_body : ws? sign? value tolerances?
tolerances   : ws? abstol (ws? reltol)?
             | ws? reltol (ws? abstol)?
value        : INTEGER
             | DECIMAL
             | fraction
sign         : "+" | "-"
abstol       : "+-" ws? (INTEGER | DECIMAL)
reltol       : "+-" ws? (INTEGER | DECIMAL) "%"
unit         : "(" UNIT ")"
fraction     : INTEGER "/" INTEGER
```

The rule `ws` and the terminals `INTEGER`, `DECIMAL` and `UNIT` are defined in
[Common grammar rules](../references/grammar.md).

## Answer representation

The Markdown surface syntax above produces a value that MAY be represented
as a JSON number: a body fraction like `[numeric]: 1/3` is represented in
JSON as a string because there is no safe floating-point representation. A
value like `0.25` MAY be converted to a floating point number or kept as
a decimal. Numeric conversions SHOULD NOT be attempted when there is loss
of precision.

A conversion loses precision when the shortest decimal form of the
nearest floating-point number differs from the digits as written. `0.1`
and `0.25` convert; `2.50` (the trailing zero is a significant digit)
and `3.14159265358979323846` (more digits than a float holds) stay
strings. A fraction always stays a string, even one with an exact
floating-point value such as `3/4`.

An integer number like `42` or `-1` SHOULD be coerced to an integral value.
It SHOULD be kept as a string if it is not representable in the 32-bit signed
integer range.

The [number type/domain](#number-typedomain) field is unaffected by the
decision to coerce the string representation to a number or not.

A document written directly as JSON/YAML/dict, rather than parsed from
Markdown, can choose freely between numeric and string representations.
A string answer MUST match the `sign? value` grammar above, and a
fraction's denominator MUST NOT be zero.
When `domain` is `fraction`, such a document SHOULD give `answer` as a
fraction string (`"3/4"`) or as an integer (`2` or `"2"`). A number that is
not whole, such as `0.75`, is a decimal and contradicts the domain.

## Number type/domain

If not given in the frontmatter, the domain is inferred from how the value and
the absolute tolerance are written, using coercion rules similar to C's:
the wider of the two wins. C has no fractions, so we place `fraction` between
`integer` and `decimal`.

| value      | abstol     | domain     |
| ---------- | ---------- | ---------- |
| `integer`  | `integer`  | `integer`  |
| `integer`  | `decimal`  | `decimal`  |
| `fraction` | `integer`  | `fraction` |
| `fraction` | `decimal`  | `decimal`  |
| `decimal`  | any        | `decimal`  |

The absolute tolerance is an `INTEGER` or a `DECIMAL`, never a fraction (see
the grammar above and `tolerance.absolute` in the schema, a number).

Equivalently, rank the domains `integer` < `fraction` < `decimal` and take the
maximum. If no absolute tolerance is given, the domain is the domain of the
value alone.

The relative tolerance takes no part in this: `[numeric]: 42 +- 5%` is an
`integer` question, even though 5% of 42 is not a whole number. A percentage
describes how far off a response may be, not what kind of number is being
asked for.


## Tolerances

There are two independent ways of specifying the numeric tolerances of the
responses:

* Absolute tolerance: The response is accepted if `|answer - response| ≤ abstol`.
* Relative tolerance: The response is accepted if `|answer - response| ≤ tol`, 
  where tol is calculated as `|answer| ⨉ percentage_number ÷ 100`.

If both tolerances are defined, a response is accepted if it passes ANY of those
criteria. When the domain is `decimal`, the response and the answer are first
rounded to [`decimalPlaces`](#decimal-places).

## Decimal places

`decimalPlaces` is the precision of the comparison of a `decimal` question.
Before the tolerance test, the response and the answer are rounded to that
many decimal places, half away from zero, in decimal arithmetic (never in
binary floating point: `2.675` rounds to `2.68`). A response with more digits
than `decimalPlaces` is not malformed and is never rejected for it; rounding
decides. A host system MAY also use the value to lay out its input widget, but
that is outside this specification.

When the frontmatter does not give `decimalPlaces` and the domain is
`decimal`, it is inferred from the body: the larger of the number of decimal
places written in the value and in the absolute tolerance. `2.50 +- 0.01` and
`0 +- 0.01` both give 2; `3.14 +- 0.1` gives 2; `1.5 +- 1` gives 1. The parsed
document carries the inferred value. The field has no meaning for an
`integer` or `fraction` question (`ignored-decimal-places`).


## Unit conversion

Numeric questions may declare units for the responses. Implementations MAY
perform the correct transformations (e.g., if the student respond 1kg in an
answer that expects g, it could treat it as 1000g), or use it just as a visual
cue in the response input field.

Units are non-empty strings that may hold any character except a
`UNICODE_SPACE` and the brackets `(`, `)`, `[`, `]`. This is the `UNIT`
terminal of [Common grammar rules](../references/grammar.md).

This admits units an ASCII-only class would reject, such as `µm`, `°C`,
`km/h`, and `Ω`.


## Grading

Grading is binary: a response inside the accepted tolerance scores 1, and any
other response scores 0. There is no partial credit for being close -- the
tolerance is the only notion of closeness the format has, and widening it is
how an instructor expresses leniency.

Numeric questions therefore take no `grading` field: the strategies of the
choice-based question types have nothing to select between. If unit conversion
is performed (see [Unit conversion](#unit-conversion)), it happens before the
tolerance test, as does the rounding to [`decimalPlaces`](#decimal-places).


## Additional Rules

| Field              | Level    | Rule                                                       |
| ------------------ | -------- | ---------------------------------------------------------- |
| answer             | warning  | must be a whole number when `domain` is "integer"[^6]      |
| tolerance.relative | warning  | must not be given when `answer` is zero[^2]                |
| domain             | info     | when declared, should not be narrower than the values[^3]  |
| tolerance.relative | info     | is a fraction, so a value above 1 is likely a mistake[^4]  |
| decimalPlaces      | info     | is ignored unless `domain` is "decimal"[^7]                |
| tolerance          | info     | should be defined for a `decimal` or `fraction` answer[^5] |

[^2]: The relative tolerance is `|answer| ⨉ relative`, which is 0 for a zero
answer, so only an exact 0 would be accepted.
[^3]: See [number type/domain](#number-typedomain). A declared domain MAY be
wider than the values need: `decimal` fits an integer answer, and `fraction`
fits an integer (see [answer representation](#answer-representation)). It is a
mismatch only when it is narrower: `integer` or `fraction` with a number that
is not whole, or `integer` with a fraction string. The check reads values, not
how a number is spelled in YAML or JSON, so `4.0` is whole.
[^4]: `0.05` is 5%, not 0.05%; `5` would accept a response 500% off.
[^5]: An exact comparison of a non-integer response is rarely what the author
means, since the number of digits the student types decides the outcome.
[^6]: A string answer is judged by its value: `"7/2"` is not whole, `"4/2"` is.
[^7]: The declared domain, or the one inferred from the answer and the absolute
tolerance when `domain` is not given.
