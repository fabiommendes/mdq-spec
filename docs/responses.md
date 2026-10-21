# Responses

A **response** is what a student marked for a question. MDQ does not define a
human-readable format to represent responses. It is rather defined as a
YAML-like document with a schema.

Responses structures are the inputs to the grading functions, and this document
is their whole specification.

The shapes below are written as YAML for legibility, however any other
equivalent format can be used in practice. 


## Addressability

A response names the thing it refers to by `id` to avoid issues with shuffling
of choices or question ordering. This makes ids a precondition for grading that
is NOT enforced by parsing. A document in which every question and every choice
carries an id is called **addressable**. Grading refuse a document that is not,
but implementations MAY provide schemes for filling in ids automatically, when
possible.

An id in a response that is not present in the question MUST be rejected as a
malformed response. This applies to every response that is keyed by id or
refers to ids: multiple choice, multiple selection, true/false, fill in the
blanks, and the choice blank of a fill in. An unknown id is always a logic
error in the application, so it is never ignored and never scored as wrong.

## Response by question type

| Question type      | Response                                           |
| ------------------ | -------------------------------------------------- |
| multiple-choice    | the id of the chosen choice                        |
| multiple-selection | the set of ticked choice ids, as a list            |
| true-false         | a mapping of statement id to boolean               |
| numeric            | a number, a string, or a `{value, unit}` mapping   |
| short-answer       | the text the student wrote                         |
| essay              | the text the student wrote, as a string            |
| fill-in            | a mapping of blank id to that blank's own response |
| ordering           | a list of `[indentation level, text]` pairs        |


### Multiple choice

The id of the choice the student picked.

```yaml
response: paris
```

An id not present in the question is a malformed response, see
[Addressability](#addressability).


### Multiple selection

The set of choice ids the student ticked, written as a list. Given a question
whose choices are `lisbon`, `brasilia`, `sao-paulo` and `rio-de-janeiro`:

```yaml
response: [brasilia, rio-de-janeiro]
```

An id absent from the list means the student did not tick that choice, and in a
multiple-selection question **not ticking asserts false**. The response above
therefore judges `lisbon` and `sao-paulo` as false. Order does not matter. An
id that appears more than once counts as one tick.

An id not present in the question is a malformed response, see
[Addressability](#addressability). A value that is not a list of ids, such as
a mapping, is also a malformed response.


### True/false

A mapping from statement id to the judgement the student made. Unlike multiple
selection, an absent key is **not** a false: it is an abstention, and the
student may deliberately abstain on a statement.

```yaml
response:
  earth-is-flat: false
  humans-descend-from-apes: true
  the-earth-is-billions-of-years-old: true
  # light-travels-instantly-through-space is abstained, so simply absent
```

An id not present in the question is a malformed response, see
[Addressability](#addressability).

A `null` value is the same as an absent key: an abstention. Any other value that
is not a boolean, such as `"T"` or `1`, makes the response a malformed response,
not a statement judged wrongly.

```yaml
response:
  earth-is-flat: false
  humans-descend-from-apes: null  # same as an absent key
```


### Numeric

The value the student entered.

```yaml
response: 998
```

A response is a number, a string, or a struct with a number (or string) and a
unit. A number is read as its shortest decimal form, and a string as the exact
value it spells, see
[Exact arithmetic](question-types/numeric.md#exact-arithmetic). A response sent
as the number `3.1415` and as the string `"3.1415"` are the same.

A fraction can only be a string, as no float holds it exactly:

```yaml
response: "1/3"
```

A decimal can also be a string. It is read as the exact decimal it spells, so a
string keeps digits that a float would lose:

```yaml
response: "3.1415"
```

A string response follows the `sign? numeric_value` grammar of
[numeric.md](question-types/numeric.md#body): an optional exponent
(`"6.022e23"`, `"1E-3"`), no comma, no group separator and no space, and a
fraction has a nonzero denominator and no exponent. The exponent has at most
3 digits. The string is not trimmed:
`" 5"` is malformed, and the host removes the spaces before it calls the
grading. A response with an exponent is a decimal, so a question with the
domain `integer` takes it by value: `"1e3"` is valid and `"1e-3"` is
malformed.

A response whose modulus is above the largest finite double (about 1.8e308),
such as `"1e400"`, or that is not zero but rounds to 0 as a double, such as
`"1e-400"`, is malformed (a `ResponseError`). The reason: both runtimes read
the number as a double before the exact arithmetic. `"1.7e308"` is valid.

Which responses are valid depends on the question's `domain`, the declared one
or the inferred one:

| domain     | `5`, `"5"`, `5.0`, `"5.0"` | `5.5`, `"5.5"`   | `"1/3"`   | non-finite |
| ---------- | -------------------------- | ---------------- | --------- | ---------- |
| `integer`  | valid                      | malformed        | malformed | malformed  |
| `fraction` | valid                      | valid (scored)   | valid     | malformed  |
| `decimal`  | valid                      | valid            | malformed | malformed  |

* An `integer` question judges the value: `4.0` and `"4.0"` are valid, as is
  `"4/2"`, and `5.5` and `"1/3"` are not whole.
* A `decimal` question does not take a fraction, such as `"1/3"` or `"4/2"`:
  a fraction is a string that spells a ratio, and a decimal field does not
  produce it.
* A `fraction` question takes any finite number or string. A response that does
  not equal the answer, such as `5.5` or `"0.5"`, is scored 0.
* A non-finite number (infinity, NaN) is malformed in every domain.

Finally, the response can be a struct with a number and a unit. Its `value` is
a response of the forms above, and `unit` is a string or absent:

```yaml
response:
  value: 3.1415
  unit: rad
```

The unit follows one rule:

* A unit equal to the declared unit, compared as an exact string after NFC
  normalization, is valid. An absent unit is also valid, and a number with no
  unit is in the declared unit.
* Any other unit is a malformed response (`ResponseError`). A unit on a
  question that declares none is also malformed.

Conversion between units, if a host wants it, happens before the grading and is
outside this specification, see
[Unit conversion](question-types/numeric.md#unit-conversion).

A value the question cannot represent is a malformed response, never a wrong
answer: any "malformed" cell of the table, a struct with an unknown key, or a
unit other than the declared one. A response with more decimal places than the
question's `decimalPlaces` is not malformed: it is rounded before grading, see
[numeric.md](question-types/numeric.md#decimal-places).


### Short answer and essay

The text the student wrote, before normalization.

```yaml
response: "brasília"
```

The response is a string. Any other value (a number, a boolean, a list or a
mapping) is a malformed response (`ResponseError`), never converted to text:
`1960` and `1960.0` would become different texts, and each runtime formats a
number in its own way. `""` and a string of only spaces are responses like any
other: they are graded by the rules of the question and are not a skip, since
only `null` skips the question, see [Skipping](#skipping). The string can hold
line breaks. The same holds for a short answer blank of a fill in.

The response is stored as typed. Each kind of pattern (inexact, exact and
regex) prepares the response in its own way before it compares. A regex
sees the response in NFC, without the `UNICODE_SPACE` code points at its
ends. See
[patterns](references/patterns.md).

An essay response follows the `content` field of the question. With `plain` or
`code`, the response is the text the student wrote, verbatim. With `text`, the
format of the string (Markdown, HTML or another) depends on the host, and MDQ
does not define it. See [essay](question-types/essay.md#response).


### Fill in the blanks

A mapping from blank id to that blank's response, each taking whatever its own
type takes. For a question whose blanks are `capital` (a choice blank) and
`size` (a numeric blank):

```yaml
response:
  capital: brasilia
  size: 2750000
```

A numeric blank takes any numeric response, with the same validity table and
unit rule as a [numeric question](#numeric): its `domain` and `unit` are those
of the blank.

A blank id not present in the question is a malformed response, see
[Addressability](#addressability). The same holds for a choice blank: the value
must be the id of one of its choices.

A blank the response does not answer is an **empty blank**: its key is missing
or its value is `null`. An empty blank scores 0 under every strategy and shows
no feedback, see [Grading](question-types/fill-in.md#grading). `{}` is a
response with every blank empty: it scores 0 and is not a skip, because only
`null` skips the question, see [Skipping](#skipping). `""` is not an empty
blank: for a short answer blank it is text like any other.

A value of the wrong type for a blank is a malformed response
(`ResponseError`), by the rule of the blank's type: a string for a short answer
blank, a choice id for a choice blank, a numeric response for a numeric blank.
A response that is not a mapping is malformed too.


### Ordering

The lines the student submitted, in the order they submitted them. Each line is
an `[indentation level, text]` pair: the level counts indentation units
(code) or is the nesting depth (list), not spaces, and the text carries no
leading indentation of its own.

```yaml
response:
  - [0, "x, y = 1, 1"]
  - [0, "for _ in range(10):"]
  - [1, "print(x)"]
  - [1, "aux = x + y"]
  - [1, "x = y"]
  - [1, "y = aux"]
```

Ordering lines carry no id, so they are compared by content. A response is
malformed (`ResponseError`) when it:

* holds a line that is not in the presented pool: the `[ordering]` lines and the
  `## [extra]` lines together;
* uses a line more times than the pool offers it;
* under `indentation: fixed`, carries a level other than the authored level of
  that line;
* with `content: text`, is not a valid outline: the first line is not at level
  0, or a line is more than one level deeper than the line before it.

A line is identified in the pool as follows. Under `fixed` it is the pair of
level and text, so a pool line at another level is a different line. Under
`lenient` and `strict` the student may change levels, so only the text
identifies a line. With the `skip-blanks` normalization, blank lines are left
out on both sides. This check uses the lines as submitted, before the other
normalizations.

A response MAY leave pool lines out: it is graded normally, like an
`## [accept]` section that omits lines. A response MAY hold a distractor from
the `extra` lines -- that is a wrong answer, not a malformed response.

The indentation level is always present. Under `indentation: fixed` it is the
authored level, which the student cannot change, and it takes part in the
comparison like the text; it is ignored only when the question normalizes it
away with `dedent`, listed or implied by `indentation: lenient`.

## Skipping

A response of `null` means the question was skipped. It scores 0 without the
grading formula running, and therefore triggers no feedback.

```yaml
response: null
```

`null` is not the same as an empty list. On a multiple-selection question,
`[]` means the student considered the question and ticked nothing -- an
assertion that every choice is false, which under symmetric grading may score
below zero and will explain every answer they missed. `null` means they never
engaged with it at all.

```yaml
response: null   # skipped: scores 0, no feedback
response: []     # answered "none of these": graded normally
```


## Responses to an exam

An exam attempt is a mapping from question id to response.

```yaml
response:
  ms-capitals: [brasilia, rio-de-janeiro]
  essay-answer-key: "The greenhouse effect is a natural process that..."
  num-unit: null
```

A question absent from the mapping is skipped: it scores 0 and stays in the
denominator of the exam total, exactly as an explicit `null` would.

A response with a key not present in the exam MUST be rejected as non-gradable
and not silently ignored.

### Pending

A response is **pending** when the question does not settle it: every response
to an essay question, a response to a `manual` short answer question, a
response that matches no pattern of a short answer question with
`unmatched: manual`, an ordering response that matches no answer key under
`unmatched: manual`, and a fill-in response with a pending blank. See
[Automation](question-types/question-base.md#automation).

A pending response has no score until the instructor supplies one, and shows
no feedback. For a fill in, the instructor scores each pending blank in the
range `[0, 1]`, and the question's `grading` strategy then combines the blank
scores as usual, see [Grading](question-types/fill-in.md#grading). An exam-level scorer accepts it and reports it as pending rather
than scored. An LMS should not have to strip essay answers out of its response
map before grading.


## Errors

Every failure below means "this is not ready to be graded", never "the student
answered badly" -- a wrong answer is a score, not an error.

| Condition                                         | Error               |
| ------------------------------------------------- | ------------------- |
| a question or choice has no id                    | `MissingIdError`    |
| an exam still holds an unresolved `include`       | `UnresolvedInclude` |
| a response the question cannot represent          | `ResponseError`     |
| an id in a response not present in the question   | `ResponseError`     |
| an ordering line outside the presented pool, used more often than the pool offers it, (under `fixed`) at another level, or (with `content: text`) not a valid outline | `ResponseError` |
| a key naming no question in the exam              | `ResponseError`     |
| a score asked of a pending response                | `NotAutoGradable`   |
