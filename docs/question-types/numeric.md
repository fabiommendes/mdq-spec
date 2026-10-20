# Numeric

## Example

Numeric questions expect a single numeric answer. They declare the correct
answer and, optionally, a tolerance.

```md
How many grams of water are there in a liter?

[numeric(g)]: 1000
```

## Frontmatter

Numeric questions accept the following extra arguments in the
frontmatter:

| Field         | Type      | Description                                     |
| ------------- | --------- | ----------------------------------------------- |
| type          | "numeric" | The type discriminator                          |
| domain        | string    | Either "integer", "decimal" or "fraction"       |
| decimalPlaces | integer   | Number of decimal places for decimal values[^1] |
| incorrectFeedback | string | Feedback for an incorrect response[^8]          |

[^1]: Must be greater than or equal to zero. The precision of the
comparison, see [Decimal places](#decimal-places). Only meaningful when the
domain is `decimal`.

[^8]: Inline Markdown, as the `incorrectFeedback` of a
[short answer](short-answer.md#feedback) question. It MUST have at least one
visible character (`blank-text`). See [Feedback](#feedback).

`unit` is a field of the YAML and JSON form. In Markdown only the
`[numeric(unit)]` tag sets it, see [Body](#body), and a `unit` key in the
frontmatter is the `invalid-frontmatter-field` error.


## Body

The body consists of a tag enclosed in square brackets followed by the expected
numeric value and, optionally, a tolerance.

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

# Scientific notation
[numeric]: 6.022e23 +- 0.001e23

# Unit specification
[numeric(kg)]: 5.5 +- 0.1
```

The grammar is:

```lark
answer       : ws? "[" "numeric" unit? "]" ws? ":" numeric_body
numeric_body : ws? sign? value tolerances? ws?
tolerances   : ws? abstol (ws? reltol)?
             | ws? reltol (ws? abstol)?
value        : number
             | fraction
number       : (INTEGER | DECIMAL) EXPONENT?
sign         : "+" | "-"
abstol       : "+-" ws? number
reltol       : "+-" ws? number "%"
unit         : "(" UNIT ")"
fraction     : INTEGER "/" DENOMINATOR
```

The rule `ws` and the terminals `INTEGER`, `DECIMAL`, `EXPONENT`,
`DENOMINATOR` and `UNIT` are defined in
[Common grammar rules](../references/grammar.md).

A `number` is an `INTEGER` or a `DECIMAL`, with an optional exponent in the
form of a JSON number: `6.022e23`, `1E-3`, `2.5e+4`, `1e05`. The value and both
tolerances take it. The exponent MAY have leading zeros. A fraction takes no
exponent: `1e3/2` does not match the grammar. The exponent has at most 3
digits: `1e1000` is a `parse-error`. A `number` also MUST fit the range of a
double, see [Answer representation](#answer-representation).

The parser rejects the spellings below with a `parse-error`. The message says
which spelling to write instead:

| Spelling                            | Example           | Write      |
| ----------------------------------- | ----------------- | ---------- |
| U+2212 MINUS SIGN                   | `−5`              | `-5`       |
| Plus-minus sign `±` (U+00B1)        | `3.14 ± 0.1`      | `3.14 +- 0.1` |
| Decimal comma                       | `3,14`            | `3.14`     |
| Digit group separator (a space)     | `1 000`           | `1000`     |

The unit in the tag is source text. The parser does no inline Markdown
processing on it: `[numeric(m\*s)]` has the unit `m\*s` (with the backslash),
and ``[numeric(`m`)]`` has the unit `` `m` `` (with the backticks).

A fraction with a zero denominator, such as `[numeric]: 1/0`, does not match
the grammar: it is a `parse-error`. The same value written as the string
`"1/0"` in a JSON/YAML document is the `malformed-numeric-answer` error, see
[Answer representation](#answer-representation).

## Answer representation

The rules of this section about the output of the parser, marked SHOULD,
have no diagnostic: they do not apply to the document, and no lint code
reports them.

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

A value with an exponent follows the same test, on the mantissa: `6.022e23`
and `1E-3` convert to the numbers `6.022e+23` and `0.001`, but `1.50e3` stays
a string because of the trailing zero of the mantissa after the point. An
exponent never makes a number an integer: `1e3` is not an `INTEGER`, so it is
never coerced to the integral value `1000`.

The value and both tolerances MUST fit the range of a double. A number whose
modulus is above the largest finite double (about 1.8e308), such as `1e400`,
is malformed. A number that is not zero but rounds to 0 as a double, such as
`1e-999`, is also malformed. In Markdown it is a `parse-error`. In a
JSON/YAML document it is the `malformed-numeric-answer` error. A string
`answer` whose exponent has more than 3 digits is the same error. The reason:
both runtimes read a number as a double before the exact arithmetic (JavaScript
gives `Infinity` or `0`), so they cannot agree on a value outside this range.
A fraction is checked as its numerator and its denominator. `1.7e308` is valid.

An integer number like `42` or `-1` SHOULD be coerced to an integral value.
It SHOULD be kept as a string if it is not representable in the 32-bit signed
integer range.

The [number type/domain](#number-typedomain) field is unaffected by the
decision to coerce the string representation to a number or not.

A document written directly as JSON/YAML/dict, rather than parsed from
Markdown, can choose freely between numeric and string representations.
A string answer MUST match the `sign? value` grammar above, with the
optional exponent, and a fraction's denominator MUST NOT be zero. A number `answer`, and both
tolerances, MUST be finite: YAML `.inf` and `.nan` (or `Infinity` and `NaN`
in a lenient JSON parser) are the `malformed-numeric-answer` error.
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

A `number` spelled with an exponent is `decimal`, as a `DECIMAL` is: `1e3` and
`6.022e23` are `decimal`, whatever the mantissa. This is about the spelling,
in a Markdown body or in a string. A YAML or JSON number has no spelling, see
below.

The absolute tolerance is a `number`, never a fraction (see
the grammar above and `tolerance.absolute` in the schema, a number).

In a YAML or JSON document, the `answer` and the absolute tolerance are
values, and the form is read from the value:

* A string is read as it is spelled: `"4.0"` is a `DECIMAL`, `"1/3"` a
  fraction, `"5"` an `INTEGER`, and `"6.022e23"` has an exponent, so it is
  `decimal`.
* A number is read by its [shortest decimal form](#exact-arithmetic), but a
  number of whole value is an `integer`. So `5` and `4.0` are `integer`, and
  `3.14` is `decimal`. The exponent plays no part: `1e22` is whole, so
  `integer`, and `1.5e-3` is `decimal`.

A YAML or JSON number of whole value counts as `integer` because JavaScript
cannot tell `4.0` from `4`: `JSON.parse("4.0")` gives `4`. To get a `decimal`
question with a whole answer, set `domain: decimal` or write the answer as the
string `"4.0"`.

The parsed document carries the inferred `domain`: the field is written out,
not only inferred at grading time.

Equivalently, rank the domains `integer` < `fraction` < `decimal` and take the
maximum. If no absolute tolerance is given, the domain is the domain of the
value alone.

The relative tolerance takes no part in this: `[numeric]: 42 +- 5%` is an
`integer` question, even though 5% of 42 is not a whole number. A percentage
describes how far off a response may be, not what kind of number is being
asked for.


## Exact arithmetic

The answer, the response and both tolerances are exact rationals. Rounding and
the tolerance test are exact: they never use binary floating point.

* A string is read as the exact value it spells (`"2.675"`, `"1/3"`).
* A number is read as its shortest decimal form: the shortest decimal string
  that gives the same double back. This is `repr` in Python and
  `Number.prototype.toString` in JavaScript. The JSON number `2.675` is the
  rational 2675/1000, not the binary value nearest to it.

A response sent as the number `2.675` and one sent as the string `"2.675"` are
the same value.

## Tolerances

There are two independent ways of specifying the numeric tolerances of the
responses:

* Absolute tolerance: The response is accepted if `|answer - response| ≤ abstol`.
* Relative tolerance: The response is accepted if
  `|answer - response| ≤ |answer| × relative`.

Both tolerances are not negative. A relative tolerance is a fraction, not a
percentage: in Markdown, `+- p%` is stored as `tolerance.relative: p / 100`, so
`+- 5%` is `relative: 0.05`. Two cases are flagged by a diagnostic, see
[Additional Rules](#additional-rules): a relative tolerance around a zero
answer (`relative-tolerance-around-zero`), and a `decimal` question without
tolerance (`missing-tolerance`).

If both tolerances are defined, a response is accepted if it passes ANY of those
criteria. When the domain is `decimal`, the response and the answer are first
rounded to [`decimalPlaces`](#decimal-places). Only the response and the answer
are rounded:

* The relative tolerance uses the answer before the rounding. With
  `answer: 0.04`, `decimalPlaces: 1` and `relative: 0.5`, the tolerance is
  `0.04 × 0.5 = 0.02`, not 0.
* The tolerances are never rounded.

The test is exact, see [Exact arithmetic](#exact-arithmetic): `3.14 +- 0.1`
accepts `3.24`, because `|3.14 - 3.24| = 0.1` exactly.

## Decimal places

`decimalPlaces` is the precision of the comparison of a `decimal` question.
Before the tolerance test, the response and the answer are rounded to that
many decimal places, half away from zero, in exact decimal arithmetic (never in
binary floating point: `2.675` rounds to `2.68`). A response with more digits
than `decimalPlaces` is not malformed and is never rejected for it; rounding
decides. A host system MAY also use the value to lay out its input widget, but
that is outside this specification.

When the frontmatter does not give `decimalPlaces` and the domain is
`decimal`, it is inferred from the value and from the absolute tolerance: the
larger of the number of decimal places of the two. The decimal places of a
`number` are `max(0, d - e)`, where `d` is the count of digits after the
decimal point of the mantissa (0 if there is none) and `e` is the exponent
(0 if there is none). So `6.022e23` has 0 places and `1.5e-3` has 4. `2.50 +- 0.01` and
`0 +- 0.01` both give 2; `3.14 +- 0.1` gives 2; `1.5 +- 1` gives 1.

In Markdown the places are the digits as written. In a YAML or JSON document:

* A string counts as written, with the formula above: `"2.50"` has 2 places
  and `"1.5e-3"` has 4.
* A number counts the places of its shortest decimal form, but a number of
  whole value has 0 places (`5` and `4.0`), see
  [Number type/domain](#number-typedomain). The shortest form of a JSON
  number MAY have an exponent (`repr(1e-7)` is `'1e-07'` in Python), and
  the formula is the same: the places do not depend on how the platform
  writes the number. `1e-7` and `0.0000001` both have 7 places, and `1.5e-7`
  has 8.

The parsed document carries the inferred value. The field has no meaning for an
`integer` or `fraction` question (`ignored-decimal-places`).


## Unit conversion

Numeric questions may declare a unit. The unit is a label for the answer: it
is not converted during grading. A response is in the declared unit or has no
unit, see [Numeric](../responses.md#numeric) in the responses. If a host wants
to accept other units (for example, `1 kg` for a question in `g`), the host
converts the response to the declared unit before it calls the grading. The
conversion is outside this specification, and MDQ has no unit library. The
host MAY also use the unit as a visual cue in the input field.

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
choice-based question types have nothing to select between. The rounding to
[`decimalPlaces`](#decimal-places) happens before the tolerance test. A host
converts units before the grading, see [Unit conversion](#unit-conversion).


## Feedback

A numeric question has one feedback message, `incorrectFeedback`. It is shown
for an incorrect response: a well-formed response outside the accepted
tolerance, that is, a score of 0. It is never shown for:

* a correct response,
* a malformed response, which is an error and has no score (see
  [Numeric](../responses.md#numeric)), and
* a skipped question, because the grading never runs
  (see [Skipping](../responses.md#skipping)).

The message is the same for every incorrect response. Feedback for known wrong
values is outside this specification.


## Additional Rules

| Field              | Level    | Code                           | Rule                                                               |
| ------------------ | -------- | ------------------------------ | ------------------------------------------------------------------ |
| answer             | error    | parse-error                    | a Markdown body must match the grammar of [Body](#body), which rejects U+2212, `±`, the decimal comma and the digit group separator |
| answer             | error    | malformed-numeric-answer       | a string must be a valid `sign? value`, with a nonzero denominator; a number must be finite; the value must fit the range of a double |
| tolerance.absolute | error    | malformed-numeric-answer       | must be finite and fit the range of a double                       |
| tolerance.relative | error    | malformed-numeric-answer       | must be finite and fit the range of a double                       |
| answer             | warning  | answer-outside-domain          | should be a whole number when `domain` is "integer", and a whole number or a fraction string when `domain` is "fraction"[^6] |
| tolerance.absolute | error    | schema-error                   | must not be negative (schema)                                      |
| tolerance.relative | warning  | relative-tolerance-around-zero | should not be given when `answer` is zero[^2]                      |
| tolerance.relative | info     | relative-tolerance-over-one    | is a fraction, so a value above 1 is likely a mistake[^4]          |
| domain             | info     | domain-mismatch                | is "integer" or "fraction" and `tolerance.absolute` is a decimal[^3] |
| decimalPlaces      | error    | schema-error                   | must not be negative (schema)                                      |
| decimalPlaces      | info     | ignored-decimal-places         | is ignored unless `domain` is "decimal"[^7]                        |
| incorrectFeedback  | error    | blank-text                     | if defined, must have at least one visible character               |
| unit               | error    | schema-error                   | must not contain whitespace or brackets (schema)                   |
| tolerance          | info     | missing-tolerance              | is not defined when `domain` is "decimal"[^5]                      |

[^2]: The relative tolerance is `|answer| × relative`, which is 0 for a zero
answer, so only an exact 0 would be accepted.
[^3]: See [number type/domain](#number-typedomain). A tolerance is a
decimal when it is not whole (`0.5`, not `1.0`: see the inference of the
domain). A declared domain MAY be wider than
the values need: `decimal` fits an integer answer, and `fraction` fits an
integer (see [answer representation](#answer-representation)). A non-whole
answer under a narrower domain is `answer-outside-domain`, not this code.
[^4]: `0.05` is 5%, not 0.05%; `5` would accept a response 500% off.
[^5]: The domain is the declared one or the inferred one. An exact comparison
of a decimal response is rarely what the author means, since the number of
digits the student types decides the outcome. A `fraction` or `integer`
question compares exact values and no digit count is involved, so it has no
such diagnostic.
[^6]: A string answer is judged by its value: `"7/2"` is not whole, `"4/2"` is.
Under `fraction`, a fraction string is always valid. Any other answer that is
not whole, such as `0.75` or `"0.75"`, is a decimal and contradicts the
domain.
[^7]: The declared domain, or the one inferred from the answer and the absolute
tolerance when `domain` is not given.
