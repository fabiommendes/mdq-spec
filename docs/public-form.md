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

The **presented form** of a question is its public form with the choices in a
seeded order and an opaque label in the place of each choice id, see
[Presented form](#presented-form). Without it, an id such as `correct` gives the
answer away to anyone who reads the traffic between the client and the host.

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
id on each choice of a multiple choice, multiple selection or true or false
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

### Multiple choice, multiple selection and true or false

| Field   | Public form                                   |
| ------- | --------------------------------------------- |
| shuffle | public                                        |
| grading | public                                        |
| choices | each choice with only its `id` and `text`     |

The other fields of a choice are private: `score` (multiple choice), `correct`
(multiple selection and true or false), `marker` (true or false), `feedback` and
`comment`. The order of the choices is the order of the document. The
[presented form](#presented-form) shuffles them if `shuffle` asks for it.

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
from the answer, see [Domain](question-types/numeric.md#domain).
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
| unmatched         | the effective value, always present              |
| accept            | private                                          |
| reject            | private                                          |
| incorrectFeedback | private                                          |

The effective `unmatched` is the declared value, or else the default, see
[Grading](question-types/short-answer.md#grading). The default depends on
`accept`, which is private: without it, a client cannot tell if a response
that matches no pattern goes to manual grading.

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
| unmatched         | removed, see the short answer blank below          |
| blanks            | each blank by the table below, in document order   |

Each blank keeps the fields of its kind in this table. Its other fields are
private.

| Blank kind   | Public fields                                                       |
| ------------ | ------------------------------------------------------------------- |
| choice       | `id`, `type`, `choices` (each with only its `id` and `text`)        |
| numeric      | `id`, `type`, `unit`, `domain` (effective), `decimalPlaces` (effective) |
| short answer | `id`, `type`, `preAccept`, `preReject` (each pattern without its `comment`), `unmatched` (effective) |

The private fields of a blank are `score`, `feedback` and `comment` of a
choice, `answer`, `tolerance`, `accept`, `reject` and `incorrectFeedback`.
The effective `domain` and `decimalPlaces` follow the rules of a
[numeric question](#numeric).

The default of `unmatched` is per blank: it depends on the `accept` of the
blank, see [Short answer blanks](question-types/fill-in.md#short-answer-blanks).
So each short answer blank holds its effective `unmatched`, always present:
the value the question declares, or else the default of the blank. The
question-level `unmatched` is resolved into the blanks and is not in the
public form. A choice blank and a numeric blank have no `unmatched`.

### Ordering

| Field             | Public form                                      |
| ----------------- | ------------------------------------------------ |
| content           | public                                           |
| highlight         | public                                           |
| indentation       | public                                           |
| unmatched         | the effective value, always present              |
| normalizations    | public                                           |
| pool              | derived, see [Pool](#pool)                       |
| maxLevel          | derived, see [Max level](#max-level)             |
| lines             | private                                          |
| extra             | private                                          |
| accept            | private                                          |
| reject            | private                                          |
| incorrectFeedback | private                                          |

The effective `unmatched` is the declared value, or else `incorrect`, as in a
short answer question.

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

#### Max level

`maxLevel` is the highest indentation level that the student may set. It is
present under `lenient` and `strict`, and absent under `fixed`, because then
the student cannot change the levels.

| Rule  | Max level                                                                                 |
| ----- | ----------------------------------------------------------------------------------------- |
| Lines | Every line of `[ordering]`, `## [extra]`, each `## [accept]` and each `## [reject]`.      |
| Level | The authored level, before normalization.                                                 |
| Value | The highest level of these lines, plus 1.                                                 |

A `## [reject]` section can hold a deeper line to give feedback to an
over-indentation, so every declared line counts. The +1 lets the student make
a plausible over-indentation mistake, and does not show the exact depth of
the answer.

`maxLevel` is a presentation limit only. A host MAY stop the student from
setting a deeper level. It does not change the validity or the grading of a
response: a response line deeper than `maxLevel` does not make the response
malformed, and the response is graded as usual. Under `strict` that response
matches no declared answer. Under `lenient` the levels are ignored when
grading.


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
* **True or false**: the list holds one response, a mapping with every
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


## Presented form

The **presented form** of a question is its public form for one student: the
choices are in an order that depends on a **seed**, and each choice id is
replaced by a **presentation label**, an opaque value derived from the seed.
The ids of authoring, such as `correct` or `c1`, do not reach the client.

The threat is a student who reads the API or the network traffic. The screen
does not matter, because a client does not show ids. The labels also make the
order of the choices repeatable: the host builds the same presented form from
the same seed at each request, and keeps no state.

The seed is a string that the host chooses for each student and exam. It MUST
be unpredictable for the student: the host derives it with a secret, for
example `HMAC(secret, username + ":" + exam_id)`. An implementation does not
handle secrets.

### Scopes

A **scope** is a set of choices that get their labels together. Only the types
below have a scope.

| Type                  | Scope                         | Key parts                    |
| --------------------- | ----------------------------- | ---------------------------- |
| multiple-choice       | the choices of the question   | `[qid, choice id]`           |
| multiple-selection    | the choices of the question   | `[qid, choice id]`           |
| true-false            | the statements of the question | `[qid, choice id]`          |
| fill-in, choice blank | the choices of the blank      | `[qid, blank id, choice id]` |

`qid` is the `id` of the question, or the empty string when it has none. The
other types (numeric, short answer, essay and ordering) and the blanks that are
not choice blanks have no scope: their presented form is their public form.
An ordering question has no scope because its lines have no id and its pool is
public and canonical, see [Pool](#pool). The host still shuffles the pool.

### Label

| Rule     | Presented form                                                                          |
| -------- | --------------------------------------------------------------------------------------- |
| Input    | The seed and the key parts, joined by U+0000, in UTF-8.                                 |
| Digest   | The SHA-256 of the input, as 64 lowercase hex digits.                                   |
| Label    | The first 8, 16, 32 or 64 digits of the digest: the shortest of these prefixes that no other digest of the scope shares. |
| Length   | Per choice. A choice that collides with no other keeps 8 digits, even when two others collide. |
| Seed     | A seed that holds U+0000 is rejected (`ValueError`). A key part is a `SLUG` and never holds it. |
| Syntax   | A label is hex, so it matches `SLUG`: the presented form is a valid public form.        |
| Stable   | A label depends only on the seed, the key parts and the digests of the other choices of the scope. Adding a choice changes at most the label of the choice that collides with it (and gives the new one a longer label). Removing or rewriting a choice does not change the others, except that a label may become shorter when its collision goes away. |

### Order

| `shuffle` | Order of the choices of a scope                                             |
| --------- | --------------------------------------------------------------------------- |
| `true`    | Sorted by label, as strings. It is the order of the digests.                |
| `false`   | The order of the document. The labels still replace the ids.                |

The sort by label equals the sort by digest: if `n1 < n2`, the label of length
`n1` is unique among the `n1`-prefixes of the scope, so two labels always differ
within the shorter length.

The effective `shuffle` is the one the question gets in its exam (see
[Inheritance](exam.md#inheritance)), or the question's own value outside an
exam, with `inherit` read as `false`. In a fill-in question, it applies to
every choice blank. The order of the questions of an exam is not shuffled.

### Presentation

| Rule      | Presented form                                                                      |
| --------- | ----------------------------------------------------------------------------------- |
| Fields    | The public form, with no other change. The ids of the question and of the blanks stay. |
| Choices   | In each scope, in the order above, each with its label in the place of its `id`.     |
| Ids       | Like the public form, it requires an [addressable](#addressability) question.       |
| Exam      | The presented form of each question, in the order of the exam.                      |

A host SHOULD write the derived ids into the document before it presents it,
see [Addressability](responses.md#addressability): derived ids change between
implementations and versions, and the labels change with them.

### Presented responses

A **presented response** is a response of [responses.md](responses.md) with the
labels in the place of the choice ids. The client sends it, and the host
translates it before it grades and stores it.

| Type               | Presented response                                                          |
| ------------------ | --------------------------------------------------------------------------- |
| multiple-choice    | the label of the chosen choice                                              |
| multiple-selection | the list of the labels of the ticked choices                                |
| true-false         | a mapping of label to boolean (or `null`)                                   |
| fill-in            | a mapping of blank id to response, with a label as the value of a choice blank |
| other types        | the response, without change                                                |

| Translation                     | Rule                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------- |
| Presented to real               | Each label becomes its id. A label that is not in its scope is a malformed response (`ResponseError`), also when the choice was removed after the student answered. |
| Real to presented               | Each id becomes its label, to show a stored response again. An id that is not in the question is a `ResponseError`. |
| `null`, other types, other blanks | Not changed, in both directions.                                           |
| Exam                            | Each response is translated by the question of its key. A key that names no question is a `ResponseError`. |
| Stored response                 | The host always stores the real response. Grading does not change.           |

### Presented form example

The question below has `shuffle: true`. The seed is `s3cr3t` and the question
id is `encontro-das-aguas`.

```yaml
id: encontro-das-aguas
type: multiple-choice
stem: Which two rivers meet near Manaus without mixing for several kilometers?
shuffle: true
choices:
  - { id: correct, text: Negro and Solimões, score: 1 }
  - { id: wrong-1, text: Madeira and Tapajós }
  - { id: wrong-2, text: Xingu and Araguaia }
  - { id: wrong-3, text: Tocantins and São Francisco }
```

The input of the first choice is `s3cr3t`, U+0000, `encontro-das-aguas`,
U+0000 and `correct`. In Python, `hashlib.sha256("s3cr3t\0encontro-das-aguas\0correct".encode()).hexdigest()`
gives the digests below. The first 8 digits of each are distinct, so every label
has 8 digits.

| Choice id | Digest                                                             | Label      |
| --------- | ------------------------------------------------------------------ | ---------- |
| `correct` | `f412a1389066f23b987db02fad237220c460afeb883bd03fc09e675c87f93d6f` | `f412a138` |
| `wrong-1` | `7589d6762b56b4ac54ebe0f76b75fe8c401e2ee6cf2749a03a43be16316a506e` | `7589d676` |
| `wrong-2` | `78426fb7a20e80de37151833eaf95266fc83afb4559f4fbeab55a1c47f226085` | `78426fb7` |
| `wrong-3` | `16a68ed68ba568067ecc40491ef6a6307a532336d1c6dc4d32f3261296854642` | `16a68ed6` |

The labels sorted as strings are `16a68ed6`, `7589d676`, `78426fb7` and
`f412a138`, so the presented form is:

```yaml
id: encontro-das-aguas
type: multiple-choice
stem: Which two rivers meet near Manaus without mixing for several kilometers?
shuffle: true
choices:
  - { id: 16a68ed6, text: Tocantins and São Francisco }
  - { id: 7589d676, text: Madeira and Tapajós }
  - { id: 78426fb7, text: Xingu and Araguaia }
  - { id: f412a138, text: Negro and Solimões }
```

A student who picks the last choice sends `f412a138`. The host translates it
into `correct` and grades it as usual. The cases of
[`examples/presentation.yaml`](../examples/presentation.yaml) are the vectors of
this section. The Python implementation offers `question.presentation(seed)` and
`exam.presentation(seed)`, with the methods `public()`, `to_response()` and
`to_presented()`. These names are not normative.


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
unmatched: incorrect
maxLevel: 2
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
