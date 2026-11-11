# Responses

A **response** is what a student marked for a question. MDQ does not define a
human-readable format to represent responses. It is rather defined as a
YAML-like document.

Responses structures are the inputs to the grading functions. There is no JSON
schema for them: this document and the cases of
[`examples/grading/`](../examples/grading/) are their whole specification.

The shapes below are written as YAML for legibility, however any other
equivalent format can be used in practice. 


## Addressability

A response names the thing it refers to by `id` to avoid issues with shuffling
of choices or question ordering. This makes ids a precondition for grading that
is NOT enforced by parsing. A document in which every question and every choice
carries an id is called **addressable**. Grading refuses a document that is not,
but implementations MAY provide schemes for filling in ids automatically, when
possible.

The ids that an implementation derives from the choice text are not portable
across implementations or versions, see
[Choice id](references/choices.md#choice-id). A host SHOULD write them into the
document before it collects responses.

An id in a response that is not present in the question MUST be rejected as a
malformed response. This applies to every response that is keyed by id or
refers to ids: multiple choice, multiple selection, true or false, fill in the
blanks, and the choice blank of a fill in. An unknown id is always a logic
error in the application, so it is never ignored and never scored as wrong.

A host that shows the [presented form](public-form.md#presented-form) of a
question receives **presented responses** from the client: the same responses,
with the label of each choice in the place of its id. The host translates them
into the responses of this document before it grades and stores them. A label
that is not in the question is a malformed response, like an unknown id. Grading
takes only the responses of this document.

## Response by question type

| Question type      | Response                                           |
| ------------------ | -------------------------------------------------- |
| multiple-choice    | the id of the chosen choice                        |
| multiple-selection | the set of ticked choice ids, as a list            |
| true-false         | a mapping of statement id to boolean               |
| numeric            | a number, a string, or a `{value, unit}` mapping   |
| short-answer       | the text the student wrote                         |
| essay              | the text the student wrote, as a string            |
| code               | the content of the submitted file, as a string     |
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


### True or false

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
[Addressability](#addressability). A value that is not a mapping, such as a
list of ids, is also a malformed response.

A `null` value is the same as an absent key: an abstention. Any other value that
is not a boolean, such as `"T"` or `1`, makes the response a malformed response,
not a statement judged wrongly.

The empty mapping `{}` and a mapping where every value is `null` abstain on
every statement. They are graded, not skipped: only a `null` response is a
skip, see [Skipping](#skipping). They show the feedback of every statement.

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


### Code

The content of the file the student submitted, as a string, as the student wrote
it.

```yaml
response: "def valor_conta(kwh, bandeira):\n    return kwh * 0.8\n"
```

Any other value (a number, a boolean, a list or a mapping) is a malformed
response (`ResponseError`), as for a short answer. `""` is a response, not a
skip: the runner runs it, and only `null` skips the question, see
[Skipping](#skipping).

The grading of a code question takes more than the response. It takes the
[runner report](runner-report.md) that a runner produced for the response, and
the scores that the instructor gave to the manual items of the rubric: one
score in `[0, 1]` for each item of the `rubric` list, by its position, or `null`
for an item with no score yet. A question with no rubric item takes one score of
the instructor for the whole response, as an essay does. The grading fails when
a test source of the question is unresolved (`UnresolvedTestSource`), and when
the report is not valid for the question (`ReportError`). The score is defined
in [code](question-types/code.md#grading). The grading checks the test sources
first, then the scores of the instructor (`ValueError`), then the report
(`ReportError`).

The scores of the instructor MUST fit the question. The list of scores has
exactly one entry for each item of `rubric`, and each entry is `null` or a
number in `[0, 1]`. The single score for the whole response is a number in
`[0, 1]`, and only a question with no rubric item at all takes it: the question
has no item in `rubric` and no item in its test sources, implicit items
included. Any other case is a host error (`ValueError`), as for the scores of a
pending fill-in blank.


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
* under `indentation: lenient` or `strict` with `content: text`, is not a
  valid outline: the first line is not at level 0, or a line is more than one
  level deeper than the line before it.

A line is identified in the pool as follows. Under `fixed` it is the pair of
level and text, so a pool line at another level is a different line. Under
`lenient` and `strict` the student may change levels, so only the text
identifies a line. With the `skip-blanks` normalization, blank lines are left
out on both sides. This check uses the lines as submitted, before the other
normalizations.

Under `fixed` the student cannot change levels, so a `content: text` response
that is not a valid outline is not malformed. It is a wrong answer: it is
graded, matches no declared answer, and falls under `unmatched` (score 0 for
`incorrect`, pending for `manual`).

A response MAY leave pool lines out: it is graded normally, like an
`## [accept]` section that omits lines. The empty list `[]` is a response, not
a skip: it matches no declared answer, so it scores 0 under
`unmatched: incorrect` (the default) and is pending under `unmatched: manual`. A response MAY hold a distractor from
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

A code question of an exam takes, besides its response, its
[runner report](runner-report.md) and the scores of the instructor, as it does
alone. How the host gives them to the scorer, by question id, is not defined.

### Pending

A response is **pending** when the question does not settle it: every response
to an essay question, a response to a code question that has a manual rubric
item (with a value other than 0) with no score of the instructor, or that has no
rubric item and no score of the instructor, or whose report has the status
`runner-error` (the failure is of the infrastructure, so the response is never
0), a response to a `manual` short answer question, a response that matches no pattern of a short answer question with
`unmatched: manual`, an ordering response that matches no declared answer
under `unmatched: manual`, and a fill-in response with a pending blank. See
[Automation](question-types/question-base.md#automation).

A pending response has no score until the instructor supplies one, and shows
no feedback. The score of an instructor for a pending response is in the range
`[0, 1]`, for every question type. For a code question, the instructor scores
each manual item of the rubric in that range, and the formula of the question
combines them with the tests, see [Score](question-types/code.md#score). For a fill in, the instructor
scores each pending blank in that range, and the question's `grading` strategy
then combines the blank scores as usual, see [Grading](question-types/fill-in.md#grading). An
exam-level scorer accepts it and reports it as pending rather than scored. An
LMS should not have to strip essay answers out of its response map before
grading.

A host can still read the
[blank scores](question-types/fill-in.md#blank-scores) of a pending fill-in
response, for example on a review screen: the settled blanks have their score
and feedback, the pending ones have none. When the instructor has scored the
pending blanks, the host passes those scores with the response to get the
question score, see [Blank scores](question-types/fill-in.md#blank-scores).


## Errors

The error names below are the class names of the Python implementation. They
are not normative: an implementation names its errors as its language asks, but
it MUST fail in each condition of the table.

Every failure below means "this is not ready to be graded", never "the student
answered badly" -- a wrong answer is a score, not an error. The exception is a
host error: the host called the operation with a wrong argument. A host error
is not a grading error, so a host that catches grading errors does not hide its
own bugs.

| Condition                                         | Error               |
| ------------------------------------------------- | ------------------- |
| a question or choice has no id                    | `MissingIdError`    |
| an exam still holds an unresolved `include`       | `UnresolvedInclude` |
| a response the question cannot represent          | `ResponseError`     |
| an id in a response not present in the question   | `ResponseError`     |
| an ordering line outside the presented pool, used more often than the pool offers it, (under `fixed`) at another level, or (under `lenient` or `strict`, with `content: text`) not a valid outline | `ResponseError` |
| a key naming no question in the exam              | `ResponseError`     |
| a score asked of a pending response                | `NotAutoGradable`   |
| a code question graded with an unresolved test source | `UnresolvedTestSource` |
| a code question graded with a report that is not valid for it, or with no report while it has a test source, see [Errors](runner-report.md#errors) | `ReportError` |
| a fill-in pending blank with no instructor score, see [Blank scores](question-types/fill-in.md#blank-scores) | `NotAutoGradable` |
| a fill-in instructor score for an id that is not a pending blank, or outside `[0, 1]` (host error) | `ValueError` |
| a code instructor score list with a length other than the items of `rubric`, or a score outside `[0, 1]` (host error) | `ValueError` |
| a code single instructor score, for a question that has a rubric item, or outside `[0, 1]` (host error) | `ValueError` |
