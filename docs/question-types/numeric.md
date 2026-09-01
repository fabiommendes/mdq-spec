# Numeric

## Example

Numeric questions expect a single numeric answer. They declare both the correct
answer and tolerance.

```md
How many grams of water there is in a liter?

[numeric(g)]: 1000 
```

## Frontmatter

Multiple choice questions accept the following extra arguments in the
frontmatter

| Field         | Type      | Description                                     |
| ------------- | --------- | ----------------------------------------------- |
| type          | "numeric" | The type discriminator                          |
| unit          | string    | Unit of the response, if given                  |
| domain        | string    | Either "integer", "decimal" or "fraction"       |
| decimalPlaces | string    | Number of decimal places for decimal values[^1] |

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

# Unit specification
[numeric(kg)]: 5.5 +- 0.1
```

The grammar is 

```lark
answer   : ws? '[' 'numeric' unit? ']' ':' ws? sign? value ws? abstol ws? reltol
value    : INTEGER
         | FLOAT
         | fraction
sign     : '+' | '-'
abstol   : '+-' DECIMAL
reltol   : '+-' (INTEGER | DECIMAL) '%'
unit     : '(' NAME ')'
fraction : INTEGER '/' INTEGER

NAME    : /[\w.-_]+/
INTEGER : /[1-9][0-9]*|0/
DECIMAL : /([1-9][0-9]*|0)[.][0-9]+/
```

## Number type/domain

If not given in the frontmatter, the domain is inferred from the representation. 
It always assumes the same type of the main numeric value.


## Tolerances

There are two independent ways of specifying the numeric tolerances of the
responses:

* Absolute tolerance: The response is accepted if `|answer - response| ≤ tol`.
* Relative tolerance: The response is accepted if `|answer - response| ≤ abstol`, 
  where tol is calculated as `answer ⨉ percentage_number ÷ 100`.

If both tolerances are defined, a response is accepted if it pass ANY of those
criteria.


## Unit conversion

Numeric questions may declare units for the responses. Implementations MAY
perform the correct transformations (e.g., if the student respond 1kg in an
answer that expects g, it could treat it as 1000g), or use it just as a visual
cue in the response input field.

Units are non-empty strings composed of letters, numbers, `.`, `-`, and `_`,
i.e., the Regex

```regex
^[\w.-_]+$
```