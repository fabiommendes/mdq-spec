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

## Response by question type

| Question type      | Response                                           |
| ------------------ | -------------------------------------------------- |
| multiple-choice    | the id of the chosen choice                        |
| multiple-selection | a mapping of choice id to boolean                  |
| true-false         | a mapping of statement id to boolean               |
| numeric            | a number, or a string holding an exact rational    |
| short-answer       | the text the student wrote                         |
| essay              | the text the student wrote                         |
| fill-in            | a mapping of blank id to that blank's own response |


### Multiple choice

The id of the choice the student picked.

```yaml
response: paris
```

An id that names a choice not present in the question MUST be rejected as a
malformed response, not scored as wrong.


### Multiple selection

A mapping from choice id to what the student marked. Given a question whose
choices are `lisbon`, `brasilia`, `sao-paulo` and `rio-de-janeiro`:

```yaml
response:
  brasilia: true
  rio-de-janeiro: true
```

An absent key means the student did not tick that choice, and in a
multiple-selection question **not ticking asserts false**. The response above
is therefore exactly equivalent to spelling every choice out:

```yaml
response:
  lisbon: false
  brasilia: true
  sao-paulo: false
  rio-de-janeiro: true
```

Like before, if an id is not present in the question, it MUST be rejected as a
malformed response.


### True/false

A mapping from statement id to the judgement the student made. Unlike multiple
selection, an absent key is **not** a false: it is an abstention, and the
student may deliberately leave a statement unjudged.

```yaml
response:
  earth-is-flat: false
  humans-descend-from-apes: true
  the-earth-is-billions-of-years-old: true
  # light-travels-instantly-through-space is abstained, so simply absent
```

Like before, if an id is not present in the question, it MUST be rejected as a
malformed response.


### Numeric

The value the student entered.

```yaml
response: 998
```

A string carries an exact rational, which no float can represent. It MUST be
used when the question's `domain` is `fraction` and the value is not exactly
representable as a decimal:

```yaml
response: "1/3"
```

The response of decimal values may also be represented as a string, which systems
MAY flag the system to use decimal arithmetic instead of floating point. The string MUST be a valid decimal.

```yaml
response: "3.1415"
```

Finally, the response can be a struct with a number and a unit. 

```yaml
response:
  value: 3.1415
  unit: rad
```

Implementations MUST always consider the unit valid if it matches the unit
declared in the question. If the question does not declare a unit, then the
response MUST be rejected as malformed.

Implementations MAY do unit conversions and rewrite the response to a canonical
form, but they MUST reject a response with a unit that is not compatible with
the question's unit with grade zero.

A value the question cannot represent is a malformed response, never a wrong
answer: a decimal where `domain` is `integer`, a unit other than the declared
one, or a precision that violates `decimalPlaces`. Implementations MAY reject
or truncate the last of these, but MUST do so before grading.


### Short answer and essay

The text the student wrote, before normalisation.

```yaml
response: "brasília"
```

Short answers are normalised before matching -- case folded, unicode
normalised, whitespace collapsed -- so the response is stored as typed, not as
compared. 


### Fill in the blanks

A mapping from blank id to that blank's response, each taking whatever its own
type takes. For a question whose blanks are `capital` (a choice blank) and
`size` (a numeric blank):

```yaml
response:
  capital: brasilia
  size: 2750000
```


## Skipping

A response of `null` means the question was skipped. It scores 0 without the
grading formula running, and therefore triggers no feedback.

```yaml
response: null
```

`null` is not the same as an empty mapping. On a multiple-selection question,
`{}` means the student considered the question and ticked nothing -- an
assertion that every choice is false, which under symmetric grading may score
below zero and will explain every answer they missed. `null` means they never
engaged with it at all.

```yaml
response: null   # skipped: scores 0, no feedback
response: {}     # answered "none of these": graded normally
```


## Responses to an exam

An exam attempt is a mapping from question id to response.

```yaml
response:
  ms-capitals:
    brasilia: true
    rio-de-janeiro: true
  essay-answer-key: "The greenhouse effect is a natural process that..."
  num-unit: null
```

A question absent from the mapping is skipped: it scores 0 and stays in the
denominator of the exam total, exactly as an explicit `null` would.

A response with a key not present in the exam MUST be rejected as non-gradable
and not silently ignored.

Responses to manually-graded questions are accepted and ignored. An LMS should
not have to strip essay answers out of its response map before grading, and
those questions are reported as pending rather than scored.


## Errors

Every failure below means "this is not ready to be graded", never "the student
answered badly" -- a wrong answer is a score, not an error.

| Condition                                         | Error               |
| ------------------------------------------------- | ------------------- |
| a question or choice has no id                    | `MissingIdError`    |
| an exam still holds an unresolved `include`       | `UnresolvedInclude` |
| a response the question cannot represent          | `ResponseError`     |
| a key naming no question in the exam              | `ResponseError`     |
| a score asked of an essay or `openEnded` question | `NotAutoGradable`   |
