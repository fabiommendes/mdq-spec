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
| id          | string or number           | Slug identifier. Usually written in the H1 instead.[^2]                       |
| uuid        | string                     | A universally unique identifier.[^3]                                          |
| course      | string                     | The course code for the exam                                                  |
| author      | string                     | Exam author. Inherited by the questions.                                      |
| locale      | string                     | A locale specification (e.g., pt-BR). Inherited.[^4]                          |
| tags        | string[] or string         | A list of strings or a single comma delimited string.                         |
| meta        | object                     | Mapping of strings to arbitrary JSON.                                         |
| penalty     | "none", "capped" or "full" | The exam's clamping policy. Defaults to "none".[^5]                           |
| grading     | grading                    | The grading strategy to use for the exam. Defaults to "symmetric".[^6]        |
| start       | string                     | The start time of the exam (e.g., "2024-06-01T09:00:00").[^7]                 |
| duration    | string                     | The duration of the exam (e.g., "90m" for 90 minutes).[^8]                    |

[^1]: Redundant in practice: an exam is recognized by its H1 title, which a
    question can never have.
[^2]: Same rules as a question id -- see
    [generic fields](question-types/base.md).
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

Inside an exam, the epilogue of a question MUST NOT use `---` as a thematic
break. Use `***` or `___` instead. After the body of a question, a `---` line
starts the frontmatter of the next block, so a thematic break followed by text
that YAML can read as a mapping (like `Nota: leia com atenção.`) would start a
new question.

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
renamed by this rule.

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

A question that declares either field keeps its own value. No other field is
inherited: `title`, `description`, `id`, `uuid`, `course`, and `meta` belong to
whichever document declares them.


## Penalty

A question's score ranges from -1 to 1. Whether a negative score survives into
the exam is decided once, by the exam, through `penalty`. A question never
clamps its own score, so an instructor can read a question's score without
knowing anything about the exam that will eventually contain it.

`penalty` accepts three values. `"none"`, the default, floors each question
score at 0 before weighting it into the total. `"capped"` keeps the full,
possibly negative, question values, but floors the exam total at 0. `"full"`
floors nothing, at either level.

Under the default `"none"`, a multiple-selection question's `"symmetric"` and
`"partial"` grading strategies produce identical exam totals, since the exam
floors each question at 0 regardless of which one produced it. The two only
diverge once the exam sets `"capped"` or `"full"`.

A question scored outside an exam -- from a question bank, say, with no exam
around it -- returns its raw value with no policy applied at all, since there
is no exam to apply one.

## Grading

The optional `grading` field in the exam frontmatter sets the grading strategy
for all questions in the exam that do not declare their own. It accepts the same
values as the `grading` field in the question frontmatter: `"partial"`,
`"all-or-nothing"`, or `"symmetric"`, but it can also be a mapping of question
types to grading strategies, so that each question type can be graded
differently.

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
is ignored if the question declares its own.

## Duration and Start Time

The `start` and `duration` fields in the frontmatter define when the exam begins
and how long it lasts. The `start` field must be a valid ISO 8601 date or
date-time string. If not timezone-aware, it is assumed to be in the local time.

The `duration` field can use ISO 8601 durations (e.g., `P1DT2H30M`). Only
fixed-length units are allowed -- weeks, days, hours, minutes and seconds --
since years and months have no fixed length. It also accepts strings like
`HH:MM` representing hours and minutes and strings like `Xd Yh Zm` where each
component represents days, hours, and minutes respectively. At least one
component must be present, and the duration must be positive.

The exact grammar is shown below.

```lark
duration: iso_duration | hh_mm | xd_yh_zm
iso_duration: "P" (INT "W")? (INT "D")? ("T" (INT "H")? (INT "M")? (SECONDS "S")?)?
hh_mm: /[0-9]{1,2}/ ":" /[0-5][0-9]/
xd_yh_zm: (INT "d")? " "* (INT "h")? " "* (INT "m")?
INT: /[0-9]+/
SECONDS: /[0-9]+([.][0-9]+)?/
```

MDQ reads `1:30` as the string `"1:30"`, not as the YAML 1.1 base-60 integer
`90`, so `HH:MM` needs no quotes.

In the parsed document, both fields are normalized to a canonical ISO 8601
form. `start` keeps its UTC offset, if any (`2026-03-10T09:00:00-03:00`).
`duration` carries each component into the largest unit that holds it and
omits zero components: `90m`, `1:30` and `PT90M` all become `PT1H30M`, and
`24h` becomes `P1D`.

## Empty exams

An exam MAY contain zero questions -- it is a well-formed document, and useful
while an assessment is being drafted. Implementations SHOULD emit a warning for
it, since an exam with no questions cannot be answered.

## Additional Rules

The rules for `id`, `uuid`, `locale` and `title` in
[generic fields](question-types/base.md#additional-rules) also apply to the
exam frontmatter.

| Field          | Level    | Rule                                                         |
| -------------- | -------- | ------------------------------------------------------------ |
| questions[].id | critical | must be unique within the exam after includes resolve[^9]    |
| duration       | critical | must be positive                                             |
| epilogue       | critical | must not use `---` as a thematic break inside an exam        |
| questions      | warning  | should contain at least one question[^10]                    |
| include-all    | warning  | should add at least one question when it resolves            |
| questions[].id | warning  | should be declared on an inline question after `include-all` |
| questions[]    | warning  | an include block should not be preceded by `===`             |
| include-all    | warning  | should follow the recommended query language                 |

[^9]: See [Question ids](#question-ids). Overlap with an `include-all` is not
    a violation, since the `include-all` leaves out the repeated questions.
[^10]: See [Empty exams](#empty-exams).

