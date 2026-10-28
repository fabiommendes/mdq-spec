# Public form

The **public form** of a question is the question as a student may see it. A
host sends it to the student's browser or app: it holds what the student needs
to answer the question, and nothing that gives away the answer.

The **correct responses** of a question are the responses that score 1, each
in the shape of [responses.md](responses.md). They are derived from the answer
key. A host uses them, for example, to show the solution after the exam.

This document defines both. There is no JSON schema for them: this document
and the cases of [`examples/public.yaml`](../examples/public.yaml) are their
whole specification. The Python implementation offers them as the methods
`public()` and `correct_responses()` of each question class. These names are
not normative.

The public form of an exam is not defined.


## General rules

The public form is a mapping with the same shape as the YAML and JSON form of
the question: the same camelCase keys and the same nesting. It removes the
private fields and adds a few derived values.

| Rule              | Public form                                                          |
| ----------------- | -------------------------------------------------------------------- |
| Values            | Plain JSON values: mappings, lists, strings, numbers, booleans.      |
| Public field      | Copied as the document holds it.                                     |
| Private field     | Removed, at every depth.                                             |
| Absent field      | Omitted. It is never `null`.                                         |
| Configuration     | Copied as written, not resolved: `grading: inherit` stays `inherit`. |
| Default value     | Not added, except for the derived values of this document.           |
| Choice without id | The public form is not defined (`MissingIdError`).                   |

The public form MUST hold no private field. The tables below list every field
of each question type: a field is either public, private or replaced by a
derived value.

### Addressability

A student answers a choice by its id, see
[Addressability](responses.md#addressability). So the public form requires an
id on each choice of a multiple choice, multiple selection or true/false
question, and on each choice of a choice blank. If a choice has no id, an
implementation MUST fail with `MissingIdError`, as grading does.

An implementation MUST NOT derive the missing ids when it builds the public
form: grading does not derive them, so it would reject the responses that use
them. A host first derives the ids, writes them into the document and stores
it, see [Choice id](references/choices.md#choice-id). Then it builds the
public form.

The question itself does not need an id: a standalone question has a public
form.


## Base fields

| Field    | Public form |
| -------- | ----------- |
| type     | public      |
| id       | public      |
| uuid     | public      |
| title    | public      |
| stem     | public      |
| epilogue | public      |
| tags     | public      |
| locale   | public      |
| weight   | public      |
| author   | private     |
| meta     | private     |
| comment  | private     |

The fields are defined in [question-base.md](question-types/question-base.md).


## Fields by question type

Each table lists the fields of the type, in addition to the base fields.

### Multiple choice, multiple selection and true/false

| Field   | Public form                                   |
| ------- | --------------------------------------------- |
| shuffle | public                                        |
| grading | public                                        |
| choices | each choice with only its `id` and `text`     |

The other fields of a choice are private: `score` (multiple choice), `correct`
(multiple selection and true/false), `marker` (true/false), `feedback` and
`comment`. The order of the choices is the order of the document. A host
shuffles them if `shuffle` asks for it.

### Numeric

| Field             | Public form                                      |
| ----------------- | ------------------------------------------------ |
| unit              | public                                           |
| domain            | the effective domain, always present             |
| decimalPlaces     | the effective decimal places, when they exist    |
| answer            | private                                          |
| tolerance         | private                                          |
| incorrectFeedback | private                                          |

The effective `domain` is the declared domain, or else the domain inferred
from the answer, see [Number type/domain](question-types/numeric.md#number-typedomain).
The effective `decimalPlaces` is the declared value, or else the inferred
value, see [Decimal places](question-types/numeric.md#decimal-places). When
there is neither, the field is omitted. The parser of the Markdown form
already writes the inferred values, so a Markdown and a YAML source of the
same question give the same public form.

### Short answer

| Field             | Public form                                      |
| ----------------- | ------------------------------------------------ |
| preAccept         | each pattern without its `comment`               |
| preReject         | each pattern without its `comment`               |
| diacritics        | public                                           |
| unmatched         | public                                           |
| accept            | private                                          |
| reject            | private                                          |
| incorrectFeedback | private                                          |

`preAccept` and `preReject` validate a submission before the student sends it,
see [Pre-validation](question-types/short-answer.md#pre-validation). A pattern
written as a string stays a string. A pattern written as an object keeps its
`pattern` and its `feedback`.

`diacritics` is public because it also applies to the inexact literals of
`preAccept` and `preReject`, see [Diacritics](references/patterns.md#diacritics).
A client that validates the submission needs it.

### Essay

| Field     | Public form |
| --------- | ----------- |
| content   | public      |
| highlight | public      |
| answerKey | private     |

### Fill in the blanks

| Field             | Public form                                        |
| ----------------- | -------------------------------------------------- |
| shuffle           | public                                             |
| grading           | public                                             |
| diacritics        | public                                             |
| unmatched         | public                                             |
| blanks            | each blank by the table below, in document order   |

Each blank keeps the fields of its kind in this table. Its other fields are
private.

| Blank kind   | Public fields                                                       |
| ------------ | ------------------------------------------------------------------- |
| choice       | `id`, `type`, `choices` (each with only its `id` and `text`)        |
| numeric      | `id`, `type`, `unit`, `domain` (effective), `decimalPlaces` (effective) |
| short answer | `id`, `type`, `preAccept`, `preReject` (each pattern without its `comment`) |

The private fields of a blank are `score`, `feedback` and `comment` of a
choice, `answer`, `tolerance`, `accept`, `reject` and `incorrectFeedback`.
The effective `domain` and `decimalPlaces` follow the rules of a
[numeric question](#numeric).

### Ordering

| Field             | Public form                                      |
| ----------------- | ------------------------------------------------ |
| content           | public                                           |
| highlight         | public                                           |
| indentation       | public                                           |
| unmatched         | public                                           |
| normalizations    | public                                           |
| pool              | derived, see [Pool](#pool)                       |
| lines             | private                                          |
| extra             | private                                          |
| accept            | private                                          |
| reject            | private                                          |
| incorrectFeedback | private                                          |

#### Pool

The `pool` replaces `lines` and `extra`. It holds the lines that the student
sorts: the `[ordering]` lines and the `## [extra]` lines together, as in
[Response](question-types/ordering.md#response). Each entry is an
`[indentation level, text]` pair, the shape of a line of a
[response](responses.md#ordering).

| Rule       | Pool                                                                    |
| ---------- | ----------------------------------------------------------------------- |
| Content    | The `[ordering]` lines and the `## [extra]` lines.                      |
| Level      | The authored level under `fixed`. 0 under `lenient` and `strict`.       |
| Text       | Verbatim: no normalization is applied.                                  |
| Blank line | Kept, also with `skip-blanks`.                                          |
| Duplicate  | A line that occurs more than once is one entry for each occurrence.     |
| Distractor | Not marked: an `## [extra]` line looks like any other line.             |
| Order      | Sorted by text, in Unicode code point order, then by level.             |

The level follows [Presentation](question-types/ordering.md#presentation): under
`lenient` and `strict` the authored level would give away part of the answer.

The text is compared by code points, not by the rules of a locale and not by
UTF-16 code units. The order only makes the public form deterministic, and
it does not depend on the answer. A host MUST still shuffle the pool before it
shows it to the student, see [Ordering](question-types/ordering.md).


## Correct responses

The correct responses of a question are a list of full responses. Each one
scores 1 when it is graded as the response to the question. The list is
empty when the question declares no correct response that can be written down.

Fill in the blanks is the one exception: its correct responses are a mapping
from blank id to the correct responses of that blank. A list of full responses
would hold every combination of the blank responses.

| Question type      | Correct responses                                                   |
| ------------------ | ------------------------------------------------------------------- |
| multiple-choice    | the ids of the choices whose `score` is 1                            |
| multiple-selection | one response: the ids of the choices with `correct: true`           |
| true-false         | one response: each statement id mapped to its `correct` value      |
| numeric            | one response: the `answer` as the document holds it         |
| short-answer       | the text of each literal pattern of `accept`                        |
| essay              | one response: the `answerKey`, or none when it is absent            |
| fill-in            | each blank id mapped to the correct responses of the blank          |
| ordering           | the lines of the `[ordering]` block, then of each `## [accept]`     |

The rules for each type:

* **Multiple choice**: a choice is correct when its score is 1, see
  [Choices](question-types/multiple-choice.md#choices). An omitted score is
  never 1 under any grading strategy. A question with no such choice has no
  correct response: the list is empty.
* **Multiple selection**: the list holds one response, the list of the ids of
  the choices with `correct: true`, in document order.
* **True/false**: the list holds one response, a mapping with every
  statement id.
* **Numeric**: the list holds one response, the `answer` as a number or a
  string, as the document holds it. It has no unit: a number with no unit is
  in the declared unit, see [Numeric](responses.md#numeric). The tolerance
  plays no part. One exception: a fraction answer under the `decimal` domain
  is not a valid response (a `decimal` question takes no fraction), so the
  response is the answer rounded to `decimalPlaces`, written as a decimal
  string: `1/3` with 2 places gives `"0.33"`. See
  [Fraction answer under `decimal`](question-types/numeric.md#fraction-answer-under-decimal).
* **Short answer**: the inexact and exact literals of `accept`, in document
  order, without their delimiters. The text of an inexact literal is the
  pattern without the spaces and tabs at its ends. The text of an exact
  literal is defined in [Exact literals](references/patterns.md#exact-literals).
  A regex is left out. A question with no literal in `accept` has no correct
  response.
* **Essay**: the answer key is a model answer. A response to an essay is
  always [pending](responses.md#pending), so this response does not score 1
  automatically.
* **Fill in the blanks**: every blank id is a key. A choice blank follows the
  rule of multiple choice, a numeric blank the rule of numeric, and a short
  answer blank the rule of short answer. A blank with no correct response maps
  to an empty list.
* **Ordering**: the `[ordering]` block and each `## [accept]` section, in
  document order, is one response. Each line is an
  `[indentation level, text]` pair, with its authored level and its text
  verbatim. These are the answer key of the question, see
  [Ordering](question-types/ordering.md).

A correct response scores 1 unless an earlier pattern or section of the same
question shadows it. The lint warnings of the question report these cases,
for example `duplicate-alternative-lines`.


## Example

Given this multiple choice question:

```yaml
id: capital-do-brasil
type: multiple-choice
stem: Which city is the capital of Brazil?
author: Darcy Ribeiro
choices:
  - id: brasilia
    text: Brasília
    score: 1
    feedback: Brasília has been the capital since 1960.
  - id: rio-de-janeiro
    text: Rio de Janeiro
    comment: The capital until 1960.
```

The public form is:

```yaml
id: capital-do-brasil
type: multiple-choice
stem: Which city is the capital of Brazil?
choices:
  - id: brasilia
    text: Brasília
  - id: rio-de-janeiro
    text: Rio de Janeiro
```

The correct responses are:

```yaml
- brasilia
```

Given this ordering question with `indentation: lenient`:

```yaml
type: ordering
stem: Sort the lines to print the first terms of the Fibonacci sequence.
content: code
highlight: python
indentation: lenient
lines:
  - [0, "x, y = 1, 1"]
  - [0, "for _ in range(10):"]
  - [1, "print(x)"]
  - [1, "x, y = y, x + y"]
extra:
  - [1, "x, y = x + y, y"]
```

The public form is:

```yaml
type: ordering
stem: Sort the lines to print the first terms of the Fibonacci sequence.
content: code
highlight: python
indentation: lenient
pool:
  - [0, "for _ in range(10):"]
  - [0, "print(x)"]
  - [0, "x, y = 1, 1"]
  - [0, "x, y = x + y, y"]
  - [0, "x, y = y, x + y"]
```

The correct responses are:

```yaml
- - [0, "x, y = 1, 1"]
  - [0, "for _ in range(10):"]
  - [1, "print(x)"]
  - [1, "x, y = y, x + y"]
```
