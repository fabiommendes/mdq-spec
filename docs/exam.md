# Exam

## Example

Exam are files that contain a set of questions, usually for assessment purposes. 
They MAY start with a YAML frontmatter, similar to the one used in question 
files, and immediately followed by a H1 heading with the exam title.

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
id: q2
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

| Field  | Type               | Description                                              |
| ------ | ------------------ | -------------------------------------------------------- |
| type   | "exam"             | The type discriminator[^1]                               |
| title  | string             | The exam title. Usually written as the H1 instead.       |
| id     | string or number   | Slug identifier. Usually written in the H1 instead.[^2]  |
| uuid   | string             | A universally unique identifier.[^3]                     |
| course | string             | The course code for the exam                             |
| author | string             | Exam author. Inherited by the questions.                 |
| locale | string             | A locale specification (e.g., pt-BR). Inherited.[^4]     |
| tags   | string[] or string | A list of strings or a single comma delimited string.    |
| meta   | object             | Mapping of strings to arbitrary JSON.                    |
| penalty | "none", "capped" or "full" | The exam's clamping policy. Defaults to "none".[^5] |

[^1]: Redundant in practice: an exam is recognized by its H1 title, which a
    question can never have.
[^2]: Same rules as a question id -- see
    [generic fields](question-types/generic.md).
[^3]: Must be a valid UUID.
[^4]: Must be a valid IETF BCP 47 language tag.
[^5]: See [Penalty](#penalty) below.

All properties in the frontmatter are optional. `title` and `id` may be given
either in the frontmatter or in the H1 heading; if both are set, the
frontmatter takes precedence, consistently with the rule for questions.


## The title

The exam title is a required H1 heading that either starts the document or
follows the frontmatter.

The title identifies the exam and MAY include a slug id in square brackets. The
usual format is `# [slug] Title`, where `slug` is a unique identifier for the exam and
`Title` is the human-readable title of the exam. The slug is optional, but if
present, it MUST be unique across all exams in the course. The slug is used to
generate the exam URL and to reference the exam in other documents.


## Body

Zero or more paragraphs of instructions followed by a block of questions. Any
markdown block element is allowed except:

- H1 headings
- A fenced block between `---` (Like a YAML frontmatter)
  
## Question block

Each question block consists of either a separator followed by the source code for
a question, or a id frontmatter. The id frontmatter is a YAML block that 
contains the property:

| Field   | Type   | Description                            |
| ------- | ------ | -------------------------------------- |
| include | string | The unique identifier for the question |


The separator is a line with three equal signs `===` preceeded by a blank line and is used to separate
questions in the exam. IF the question starts with a YAML frontmatter, the
separator is optional.


## Question ids

Questions are numbered by the order their blocks appear in the document, and a
question that does not declare an `id` is given an implicit one: `q1` for the
first block, `q2` for the second, and so on.

Every block occupies a position, including an `include`. So in an exam whose
first block is an `include` and whose second is an inline question, the inline
question is `q2` -- the implicit id always matches the position the student
sees, never a separate count of inline questions only.

An `include` is a reference to a question that already has an identity of its
own, so it is never renamed by this rule.


## Inheritance

A question inside an exam inherits two fields from the exam frontmatter when it
does not declare them itself:

| Field  | Inherited | Notes                                                  |
| ------ | --------- | ------------------------------------------------------ |
| locale | yes       | An exam is normally written in a single language.      |
| author | yes       | The exam author is the author of its questions.        |
| tags   | no        | Tags classify a question individually.                 |

A question that declares either field keeps its own value. No other field is
inherited: `title`, `id`, `uuid`, `course`, and `meta` belong to whichever
document declares them.


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


## Empty exams

An exam MAY contain zero questions -- it is a well-formed document, and useful
while an assessment is being drafted. Implementations SHOULD emit a warning for
it, since an exam with no questions cannot be answered.

