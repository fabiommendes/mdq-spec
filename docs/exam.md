# Exam

## Example

Exams are files that contain a set of questions, usually for assessment
purposes. They MAY start with a YAML frontmatter, similar to the one used in
question files, immediately followed by a H1 heading with the exam title.

````md
---
course: CS101
---

# [midterm] Midterm Exam

One or more paragraphs of instructions for the exam.

---
include: recursion-01
---

---
include-all: recursion AND NOT draft EXCEPT recursion-07
max: 2
---

---
id: factorial
---
Convert this iterative algorithm to a recursive one.

```python
def factorial(n):
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result
```

[essay]

===

Judge the statements

* [V] Any iterative algorithm can be implemented recursively.
* [F] Recursion tends to be more memory efficient than iteration.
````

## Frontmatter

Exams accept the following arguments in the frontmatter

| Field       | Type                       | Description                                                                   |
| ----------- | -------------------------- | ----------------------------------------------------------------------------- |
| type        | "exam"                     | The type discriminator[^1]                                                    |
| title       | string                     | The exam title. Usually written as the H1 instead.                            |
| description | string                     | Can be used in listings to provide a little more detail than the title alone. |
| id          | string                     | Slug identifier. Usually written in the H1 instead.[^2]                       |
| uuid        | string                     | A universally unique identifier.[^3]                                          |
| course      | string                     | The course code for the exam                                                  |
| author      | string                     | Exam author. Inherited by the questions.                                      |
| locale      | string                     | A locale specification (e.g., pt-BR). Inherited.[^4]                          |
| tags        | string[] or string         | A list of strings or a single comma delimited string.                         |
| meta        | object                     | Mapping of strings to arbitrary JSON.                                         |
| penalty     | "none", "capped" or "full" | The exam's clamping policy. Defaults to "none".[^5]                           |
| grading     | grading or map             | A grading strategy, or a map from question type to strategy. Defaults to "symmetric".[^6] |
| shuffle     | boolean                    | Whether the choices of the questions can be shuffled. Defaults to false.[^6]  |
| start       | string                     | The start time of the exam (e.g., "2024-06-01T09:00:00").[^7]                 |
| duration    | string                     | The duration of the exam (e.g., "90m" for 90 minutes).[^8]                    |

[^1]: Redundant in practice: an exam is recognized by its H1 title, which a
    question can never have.
[^2]: Same rules as a question id -- see
    [generic fields](question-types/question-base.md).
[^3]: Must be a valid UUID.
[^4]: Must be a valid IETF BCP 47 language tag.
[^5]: See [Penalty](#penalty) below.
[^6]: See [Grading](#grading) below.
[^7]: A valid ISO 8601 date or date-time. See [Duration and Start Time](#duration-and-start-time).
[^8]: An ISO 8601 duration without years or months, `HH:MM`, or `Xd Yh Zm`.
    See [Duration and Start Time](#duration-and-start-time).

All properties in the frontmatter are optional. `title` and `id` may be given
either in the frontmatter or in the H1 heading; if both are set, the
frontmatter takes precedence, consistently with the rule for questions.

As for a question, a mapping MUST NOT repeat a key, in the exam frontmatter
and in the frontmatter of every block (`yaml-syntax-error`). A value keeps its
YAML type and is never converted: `id`, and the `include` and `include-all` of
a block, MUST be YAML strings (`id: "2024"`, not `id: 2024`; `include-all: "7"`,
not `include-all: 7`). See [Frontmatter](question-types/question-base.md#frontmatter)
for the YAML schema.


## The title

The exam title is a required H1 heading that either starts the document or
follows the frontmatter.

The title identifies the exam and MAY include a slug id in square brackets. The
usual format is `# [slug] Title`, where `slug` is a unique identifier for the exam and
`Title` is the human-readable title of the exam. The slug is optional, but if
present, the host system SHOULD keep it unique across the exams of a course.
MDQ does not check this, since a single document cannot see the other exams.
The slug is used to generate the exam URL and to reference the exam in other
documents.


## Body

Zero or more paragraphs of instructions followed by zero or more question
blocks. Any markdown block element is allowed in the instructions except:

- H1 headings
- A fenced block between `---` (like a YAML frontmatter)

## Question and include blocks

A question block is one of:

- An inline question: the source of a question, with the same syntax as a
  question file.
- An include block: a YAML block between `---` lines that selects questions
  stored outside the exam. See [Include](#include) and
  [Include all](#include-all).

Any block MAY be preceded by a `===` separator, which is a line with three
equal signs preceded by a blank line. An inline question that does not contain
a frontmatter block MUST be preceded by a separator. If the inline question has
a frontmatter block, the separator is optional. An include block SHOULD NOT be
preceded by a separator, since its `---` lines already mark where it starts.
This rule helps distinguish between the instructions and the first question,
and between the epilogue of a question and the next one.

The `---` line that opens a frontmatter or include block MUST also be preceded
by a blank line, unless it is the first line of the file or follows a `===`
separator. MDQ is a subset of CommonMark, and CommonMark reads a `---` (or
`===`) line right after a paragraph as the underline of a setext heading, not
as a block boundary. The block is then swallowed into the text before it:

```md
Read every question carefully.
---
id: q1
---
```

Here the instructions become the heading "Read every question carefully."
followed by `id: q1` as text, and the exam has no question. Implementations
SHOULD warn about a setext heading in the instructions or in a question of an
exam (`setext-heading`).

Inside an exam, the epilogue of a question MUST NOT use `---` as a thematic
break. Use `***` or `___` instead. After the body of a question, a `---` line
starts the frontmatter of the next block, so a thematic break followed by text
that YAML can read as a mapping (like `Nota: leia com atenção.`) would start a
new question.

Elsewhere in an exam, a `---` line after a blank line is a thematic break, as
in CommonMark. But two such lines in a row are read as a frontmatter or include
block whatever lies between them: when that content is not valid YAML, the
exam fails with `yaml-syntax-error` instead of reading it as text. A thematic
break written with `-` is therefore unsafe in any document that may end up
inside an exam. Implementations SHOULD warn about one (`unsafe-thematic-break`)
and authors SHOULD write `***` or `___`, which are plain thematic breaks in
every position.

An include block holds exactly one of the two forms below. No other field is
allowed.

### Include

| Field   | Type   | Description                        |
| ------- | ------ | ---------------------------------- |
| include | string | The id of the question to include. |

`include` adds a single question to the exam by its id.

### Include all

| Field       | Type    | Description                                              |
| ----------- | ------- | -------------------------------------------------------- |
| include-all | string  | A query. Adds all questions that match it.               |
| max         | integer | Optional. The maximum number of questions to add. Min 1. |

`include-all` adds every question that matches a query. MDQ does not enforce a
query language, but it recommends the language below. A query that does not
follow it is a warning, not an error. An implementation that cannot read the
query adds no questions for that block.

```lark
query      : logic ("EXCEPT" slugs)?

?logic     : logic "OR" logic_and
           | logic_and
?logic_and : logic_and "AND" logic_not
           | logic_not
?logic_not : "NOT" logic_not
           | atom
?atom      : TAG
           | "(" logic ")"

slugs      : SLUG ("," SLUG)*

TAG        : /(?!(AND|OR|NOT|EXCEPT)(?![^(),\t\n\v\f\r \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]))[^(),\t\n\v\f\r \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/

%import common.WS
%ignore WS
```

A `TAG` matches a question when it is equal to one of the question's `tags`.
The comparison is exact and case-sensitive. The keywords `AND`, `OR`, `NOT` and
`EXCEPT` are uppercase only: `and` is an ordinary tag. `NOT` binds tighter than
`AND`, and `AND` binds tighter than `OR`. `EXCEPT` removes the questions with
the listed ids from the result. A `SLUG` has the same format as the value of
`include`.

`SLUG` and `UNICODE_SPACE` are defined in
[Common grammar rules](references/grammar.md). A `TAG` holds no parenthesis,
no comma and no `UNICODE_SPACE`. The query ignores only the Lark `WS`: space,
tab, form feed, carriage return and line feed. A query with any other
`UNICODE_SPACE` does not follow the language.

Tags do not use a `#` prefix: YAML reads an unquoted value that starts with
`#` as a comment. A tag that contains a `UNICODE_SPACE`, a comma or a
parenthesis cannot be written in a query.

An `include-all` never adds a question that the exam already contains by
other means: the target of an `include`, an inline question with the same
declared `id`, or a question added by an earlier `include-all`. This lets an
author include some questions explicitly and fill the remaining positions with
a query. `max` applies after these questions are removed.

The source of the questions (the question bank), the order of the matched
questions, and which questions `max` keeps are implementation-defined. A host
system MAY, for example, draw a different random subset for each student.

## Question ids

Questions are numbered by the order they appear in the exam after includes
resolve. A question that does not declare an `id` keeps none as parsed -- these
ids are only derived when a consumer needs an addressable exam (grading, say):
`q1` for the first question, `q2` for the second, and so on.

Every question occupies a position, including an included one. An `include`
occupies one position, and an `include-all` occupies one position for each
question it adds. So in an exam whose first block is an `include-all` that adds
three questions and whose second block is an inline question, the inline
question's derived id is `q4` -- it always matches the position the student
sees, never a separate count of inline questions only.

Since an `include-all` can add a different number of questions each time it
resolves, the derived id of an inline question after it is not stable. Such a
question SHOULD declare its own `id`.

An included question already has an identity of its own, so it is never
renamed by this rule. A question in the bank that declares no `id` takes the
id the bank found it by, whether it came in through `include` or
`include-all`.

Question ids MUST be unique within the exam. The rule applies after includes
resolve, and accounts for the derived id a question with no declared `id`
would get, so all of these make the exam malformed:

* Two inline questions that declare the same `id`.
* Two `include` blocks that reference the same question.
* An inline question whose `id` is the same as the id of an included question.
* A declared `id` that is the same as the derived id of another question. For
  example, if the first block declares `id: q2`, the second block cannot use
  its derived id `q2`. A derived id always matches the position, so it is
  never renamed to avoid a collision.

The overlap of an `include-all` with other blocks is not an error: the
`include-all` leaves out those questions, see [Include all](#include-all).


## Inheritance

A question inside an exam inherits two fields from the exam frontmatter when it
does not declare them itself:

| Field  | Inherited | Notes                                             |
| ------ | --------- | ------------------------------------------------- |
| locale | yes       | An exam is normally written in a single language. |
| author | yes       | The exam author is the author of its questions.   |
| tags   | no        | Tags classify a question individually.            |

A question that declares either field keeps its own value. The parsed
document carries the inherited value on each question, as if the question had
declared it; the exam keeps its own copy too.

`grading` and `shuffle` are inherited in a different way: the question field
takes the value `"inherit"`, which is its default, and then the exam's value
applies. A question outside an exam resolves `"inherit"` to `"symmetric"`
for `grading` and to `false` for `shuffle`. See [Grading](#grading) below.

No other field is inherited: `title`, `description`, `id`, `uuid`, `course`,
and `meta` belong to whichever document declares them.


## Penalty

A question's score ranges from -1 to 1. Whether a negative score survives into
the exam is decided once, by the exam, through `penalty`. A question never
clamps its own score, so an instructor can read a question's score without
knowing anything about the exam that will eventually contain it.

`penalty` accepts three values. `"none"`, the default, floors each question
score at 0 before weighting it into the total. `"capped"` keeps the full,
possibly negative, question values, but floors the exam total at 0. `"full"`
floors nothing, at either level.

The floor does not make the grading strategies agree. For a
multiple-selection question, `"symmetric"` is `2 * partial - 1`, so the two
differ whenever the score is positive: the markings `[T, F, _, _]` of the
example in [multiple selection](question-types/multiple-selection.md#grading)
score 0.75 under `"partial"` and 0.5 under `"symmetric"`, with any `penalty`.
Under `"none"` the floor only removes the negative part of a `"symmetric"`
score, so `[F, T, _, _]` scores 0.25 under `"partial"` and 0 under
`"symmetric"`.

A question scored outside an exam -- from a question bank, say, with no exam
around it -- returns its raw value with no policy applied at all, since there
is no exam to apply one.

## Grading

The optional `grading` field in the exam frontmatter sets the grading strategy
for all questions in the exam whose `grading` is `"inherit"`, the default. It
accepts the three strategies of the `grading` field of a question, `"partial"`,
`"all-or-nothing"` or `"symmetric"`, but not `"inherit"`. It can also be a
mapping of question types to grading strategies, so that each question type can
be graded differently.

The mapping takes the shape:

```
grading:
  multiple-selection: <method>
  true-false: <method>
  fill-in: <method>
  multiple-choice: <method>
```

All keys are optional and missing keys are treated as `"symmetric"`. The value
for each key is one of the three grading strategies. The exam's `grading` field
is ignored if the question declares a strategy of its own.

The optional `shuffle` field works the same way for the `shuffle` field of the
questions: a question with `shuffle: "inherit"` (the default) takes the exam's
value, and the exam's value defaults to `false`.

## Exam score

The exam score is the weighted mean of its question scores:

```
score = Σ wᵢ · pᵢ / Σ wᵢ
```

where `wᵢ` is the `weight` of question `i` (1 by default, see
[base.md](question-types/question-base.md#frontmatter)) and `pᵢ` its score after the
per-question step of [penalty](#penalty): `max(0, sᵢ)` under `"none"`, the raw
`sᵢ` under `"capped"` and `"full"`. Under `"capped"` the result is then floored
at 0. The score is in [0, 1] under `"none"` and `"capped"`, and in [-1, 1]
under `"full"`.

A question with no response, or with the response `null`, is skipped: it
scores 0 and keeps its weight in the denominator (see
[responses.md](responses.md#skipping)). When the total weight is 0, because
every question has `weight: 0` or the exam has no question, the score is 0.

A [pending response](responses.md#pending) leaves the exam score pending: the
exam has no score until the instructor settles every pending question. An
implementation reports which questions are pending, and MAY report a
provisional score, computed by the same formula over the settled questions
only, with their weights alone. A provisional score MUST be labelled as such.

An exam-level scorer reports more than the number: the score of each question,
the pending and the skipped questions, the total weight and the penalty
applied, so that a host system can show the breakdown or finish the grading.

## Duration and Start Time

The `start` and `duration` fields in the frontmatter define when the exam begins
and how long it lasts. The `start` field must be a valid ISO 8601 date or
date-time string; the date and the time MAY be separated by a space instead of
`T`, as RFC 3339 allows, so `start: 2026-03-10 09:00:00-03:00` needs no quotes.
If not timezone-aware, it is assumed to be in the local time.

The `duration` field can use ISO 8601 durations (e.g., `P1DT2H30M`). Only
fixed-length units are allowed -- weeks, days, hours, minutes and seconds --
since years and months have no fixed length. It also accepts strings like
`HH:MM` representing hours and minutes and strings like `Xd Yh Zm` where each
component represents days, hours, and minutes respectively. At least one
component must be present, and the duration must be positive.

The exact grammar is shown below.

```lark
duration     : iso_duration | hh_mm | xd_yh_zm
iso_duration : "P" date_part ("T" time_part)?
             | "PT" time_part
date_part    : INT "W" (INT "D")?
             | INT "D"
time_part    : INT "H" (INT "M")? (SECONDS "S")?
             | INT "M" (SECONDS "S")?
             | SECONDS "S"
hh_mm        : /[0-9]{1,2}/ ":" /[0-5][0-9]/
xd_yh_zm     : INT "d" (ws? INT "h")? (ws? INT "m")?
             | INT "h" (ws? INT "m")?
             | INT "m"
INT          : /[0-9]+/
SECONDS      : /[0-9]+([.][0-9]+)?/
```

The rule `ws` is defined in [Common grammar rules](references/grammar.md).

In the YAML 1.2 Core schema MDQ uses, `1:30` is the string `"1:30"`, not the
YAML 1.1 base-60 integer `90`, so `HH:MM` needs no quotes.

In the parsed document, both fields are normalized to a canonical ISO 8601
form. `start` keeps its UTC offset, if any (`2026-03-10T09:00:00-03:00`), and
a `start` with a date only stays a date (`2026-03-10`). `duration` carries each
component into the largest unit that holds it, omits zero components, and
never uses weeks: `90m`, `1:30` and `PT90M` all become `PT1H30M`, `24h`
becomes `P1D`, and `P1W` becomes `P7D`.

## Empty exams

An exam MAY contain zero questions -- it is a well-formed document, and useful
while an assessment is being drafted. Implementations SHOULD emit a warning for
it, since an exam with no questions cannot be answered.

## Additional Rules

The rules for `id`, `uuid`, `locale` and `title` in
[generic fields](question-types/question-base.md#additional-rules) also apply to the
exam frontmatter.

| Field           | Level    | Code                            | Rule                                                                                                                                                                                                              |
| --------------- | -------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| questions[].id  | critical | duplicate-question-id           | must be unique within the exam after includes resolve[^9]                                                                                                                                                         |
| start           | critical | malformed-start                 | must be an ISO 8601 date or date-time, see [Duration and Start Time](#duration-and-start-time)                                                                                                                    |
| duration        | critical | invalid-duration                | must be a positive ISO 8601 duration without years or months, `HH:MM` or `Xd Yh Zm`                                                                                                                               |
| instructions    | critical | blank-content-field             | must have at least one visible character                                                                                                                                                                          |
| questions[].epilogue | critical | parse-error                     | must not use `---` as a thematic break inside an exam                                                                                                                                                             |
| questions[]     | critical | unknown-include-field           | an include block allows only `include`, or `include-all` with `max`                                                                                                                                               |
| questions[].max | critical | schema-error                    | must be a positive integer (schema)                                                                                                                                                                               |
| questions       | warning  | exam-without-questions          | should contain at least one question[^10]                                                                                                                                                                         |
| instructions, questions[].{preamble,stem,epilogue} | warning  | setext-heading                  | should not contain a setext heading, see [Question and include blocks](#question-and-include-blocks)                                                                                                              |
| instructions    | warning  | unsafe-thematic-break           | should not write a thematic break with `-`, see [Question and include blocks](#question-and-include-blocks); the same rule for questions is in [generic fields](question-types/question-base.md#additional-rules) |
| questions[].include-all | warning  | empty-include-all               | should add at least one question when it resolves                                                                                                                                                                 |
| questions[].id  | warning  | undeclared-id-after-include-all | should be declared on an inline question after `include-all`                                                                                                                                                      |
| questions[]     | warning  | separator-before-include        | an include block should not be preceded by `===`                                                                                                                                                                  |
| questions[].include-all | warning  | nonstandard-include-query       | should follow the recommended query language                                                                                                                                                                      |

[^9]: See [Question ids](#question-ids). Overlap with an `include-all` is not
    a violation, since the `include-all` leaves out the repeated questions.
[^10]: See [Empty exams](#empty-exams).

