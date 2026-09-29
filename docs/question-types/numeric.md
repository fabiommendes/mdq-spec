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

[^1]: Must be greater than or equal to zero.


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
answer       : ws? "[" "numeric" unit? "]" ":" numeric_body
numeric_body : ws? sign? value tolerances?
tolerances   : ws? abstol (ws? reltol)?
             | ws? reltol (ws? abstol)?
value        : INTEGER
             | DECIMAL
             | fraction
sign         : "+" | "-"
abstol       : "+-" ws? (INTEGER | DECIMAL)
reltol       : "+-" ws? (INTEGER | DECIMAL) "%"
unit         : "(" NAME ")"
fraction     : INTEGER "/" INTEGER

NAME         : /[^\s()\[\]]+/
INTEGER      : /[1-9][0-9]*|0/
DECIMAL      : /([1-9][0-9]*|0)[.][0-9]+/
```

## Answer representation

The Markdown surface syntax above always yields a JSON number: a body
fraction like `[numeric]: 1/3` becomes its floating-point value, and
`domain: fraction` records how it was written (see
[number type/domain](#number-typedomain)) -- a `float` cannot represent
a fraction exactly.

A document written directly as JSON/YAML/dict, rather than parsed from
Markdown, MAY instead give `answer` as a string to keep that precision,
e.g. `"1/3"` or `"-0.25"`. The string MUST match the `sign? value`
grammar above, and a fraction's denominator MUST NOT be zero.

## Number type/domain

If not given in the frontmatter, the domain is inferred from the representation
of the value and of the absolute tolerance, using coercion rules similar to C's:
the wider of the two wins. C has no fractions, so we place `fraction` between
`integer` and `decimal`.

| value      | abstol     | domain     |
| ---------- | ---------- | ---------- |
| `integer`  | `integer`  | `integer`  |
| `integer`  | `fraction` | `fraction` |
| `integer`  | `decimal`  | `decimal`  |
| `fraction` | `fraction` | `fraction` |
| `fraction` | `decimal`  | `decimal`  |
| `decimal`  | any        | `decimal`  |

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
criteria.


## Unit conversion

Numeric questions may declare units for the responses. Implementations MAY
perform the correct transformations (e.g., if the student respond 1kg in an
answer that expects g, it could treat it as 1000g), or use it just as a visual
cue in the response input field.

Units are non-empty strings that may hold any character except
whitespace and the brackets `(`, `)`, `[`, `]`, i.e., the Regex

```regex
^[^\s()\[\]]+$
```

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
tolerance test.


## Additional Rules

| Field              | Level    | Rule                                                       |
| ------------------ | -------- | ---------------------------------------------------------- |
| answer             | warning  | must be a whole number when `domain` is "integer"          |
| tolerance.relative | warning  | must not be given when `answer` is zero[^2]                |
| domain             | info     | should agree with the domain inferred from the document[^3]|
| tolerance.relative | info     | is a fraction, so a value above 1 is likely a mistake[^4]  |
| decimalPlaces      | info     | is ignored unless `domain` is "decimal"                    |
| tolerance          | info     | should be defined for a `decimal` or `fraction` answer[^5] |

[^2]: The relative tolerance is `|answer| ⨉ relative`, which is 0 for a zero
answer, so only an exact 0 would be accepted.
[^3]: See [number type/domain](#number-typedomain). A declared domain never widens
the value written in the body -- it only contradicts it.
[^4]: `0.05` is 5%, not 0.05%; `5` would accept a response 500% off.
[^5]: An exact comparison of a non-integer response is rarely what the author
means, since the number of digits the student types decides the outcome.
