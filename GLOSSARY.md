---
type: glossary
status: active
---

# Glossary

MDQ is a file format for declaring questions and exams in Markdown, together
with the JSON/YAML representation those documents transform into. This glossary
fixes the vocabulary the format, the schemas and the implementations all share.

---

## Abstention

Leaving one individual statement of a true or false question unjudged. Only true or false admits it; a multiple-selection choice left unticked asserts "false".

- tags: answering
- avoid: no-mark
- related: Skip

## Accept

A field that declares correct responses. In short answer and fill-in blanks, a
list of patterns: a response that matches one is correct. In ordering, the
`## [accept]` sections: other correct orders of the lines, part of the answer
key.

- tags: fields
- avoid: allow
- related: Reject, Pattern, Answer key

## Addressable

A document in which every question and every choice carries an id, so a
response can name what it refers to. Parsing never requires it; grading always
does. `with_ids()` (mdq-py) makes a document addressable.

- tags: document-states
- avoid: gradable, identified, id-complete
- related: Derived id

## All-or-nothing

A grading strategy scoring 1 only when every part is correct, and 0 otherwise.

- tags: grading
- avoid: binary
- related: Grading strategy

## Answer key

What an instructor declared as correct for a question, whether a machine can
check it (`answer`, `accept`, per-choice `score`) or only a human can
(an essay's `answerKey`). Carrying one does not make a question auto-gradable.

- tags: answering
- avoid: solution, the correct answer
- related: Correct response
- pt: gabarito

## Automation

How many responses a question settles without the instructor: `automatic`
(every response), `semi-automatic` (only the responses that match an answer
key) or `manual` (none). Derived from the fields, never written in the
document.

- tags: grading
- avoid: auto-gradable, manually-graded, open-ended, objective, subjective
- related: Pending response, Settled response
- code: mdq.types.Automation

## Blank

A gap `[^slug]` in the stem of a fill-in question, where the student writes or
picks a response. Each blank carries its own answer key: choices, patterns or
a number.

- tags: documents
- avoid: gap, slot
- related: Fill-in
- code: mdq.models.Blank

## Body

The part of a question between the stem and the epilogue whose form depends on
the question type, such as a choice list or an `[ordering]` block. Required.

- tags: documents
- related: Stem, Epilogue, Question type

## Choice list

An unordered list whose every item starts with a choice marker. The body of multiple choice, multiple selection and true or false. See `docs/references/choices.md`.

- tags: documents
- avoid: checkbox list, option list
- related: Choice marker

## Choice marker

The bracket at the start of a choice item, such as `[x]` or `[ ]`, not
followed by `(` or `[`. Its content is the value.

- tags: documents
- avoid: checkbox, checkmark
- related: Choice list

## Content

A field whose meaning depends on the `type`. In essay, the kind of response
(`code`, `text` or `plain`), set in the frontmatter. In ordering, the kind of
the lines (`code` or `text`), set by the body.

- tags: fields
- code: mdq.types.EssayContent, mdq.types.OrderingContent

## Correct response

A response that scores 1, derived from the answer key, in the shape of a
response. Regex patterns give none. See `docs/public-form.md`.

- tags: answering
- related: Answer key, Response

## Declared answer

An ordering an ordering question declares: the answer key (`[ordering]` and
`## [accept]`) or a `## [reject]` section. A response is graded by the first
declared answer it matches.

- tags: answering
- related: Answer key, Accept, Reject

## Derived id

An id that the author did not write, given to a choice (from its text) or to
a question in an exam (`q<position>`) to make the document addressable.
A derived choice id is not portable across implementations or versions.

- tags: document-states
- avoid: implicit id, generated id, auto id
- related: Addressable

## Diagnostic

A problem found while loading a document, with a severity (error, warning,
info), a code and a location. An error means no document was built.

- tags: documents
- avoid: lint warning, validation error
- code: mdq.Diagnostic

## Epilogue

The optional paragraphs after the body of a question.

- tags: documents
- related: Stem, Body

## Essay

A question type that expects a free text, usually graded by the instructor.

- tags: question-types
- related: Question type, Automation
- code: mdq.models.EssayQuestion

## Exact literal

A pattern enclosed in backticks, compared code point for code point after NFC
and the removal of the Unicode spaces at its ends. Follows the CommonMark code
span, so N backticks can hold a backtick.

- tags: patterns
- avoid: verbatim string, quoted string
- related: Pattern, Inexact literal

## Exam

A set of questions given to students together, recognised by its H1 title.

- tags: documents
- avoid: test, quiz, assessment
- related: Question, Include
- code: mdq.models.Exam

## Exam score

The weighted mean of the question scores after `penalty`. Pending while any
response is pending; a *provisional score* is the same mean over the settled
questions only.

- tags: grading
- avoid: total, final grade, exam grade, result
- related: Score, Weight, Penalty policy
- code: mdq.models.ExamScore

## Exam-context field

A field describing a question's role within one exam rather than the question
itself, and therefore overridable by an include. `weight` is the only one.

- tags: fields
- avoid: exam field, local override
- related: Question-intrinsic field, Weight

## Feedback

Remedial text attached to a choice and shown to the student after grading. What triggers it depends on the question type: in multiple choice the choice picked, whatever it scored; in multiple selection and true or false only the ones judged wrongly, plus unjudged statements in true or false.

- tags: grading
- avoid: explanation, rationale

## Fill-in

A question type whose stem holds blanks the student fills in.

- tags: question-types
- related: Blank, Question type
- code: mdq.models.FillInQuestion

## Grading strategy

How a question with several parts reduces those parts to one score. Spelled `grading`, and carried only by multiple choice, multiple selection, true or false and fill-in.

- tags: grading
- avoid: grading mode, scoring method, algorithm
- related: Symmetric, Partial, All-or-nothing, No-mistakes
- code: mdq.types.GradingStrategy

## Include

An entry in an exam that references a question defined elsewhere, rather than
carrying it inline.

- tags: documents
- avoid: reference, link
- related: Exam, Resolved
- code: mdq.models.Include, mdq.models.IncludeAll

## Inexact literal

A pattern that is neither enclosed in backticks nor delimited by `/`. The
comparison ignores case, diacritics, invisible characters, typographic quotes
and dashes, and the amount of whitespace.

- tags: patterns
- avoid: plain match, fuzzy match
- related: Pattern, Exact literal

## Inherit

The value of `grading` and `shuffle` in a question when the author does not
set them: take the exam's value, or `symmetric` and `false` outside an exam.

- tags: grading
- avoid: unset
- related: Grading strategy

## Malformed response

A response the question cannot represent, such as a decimal where the domain
is integer or a unit that is not the declared one. Rejected before grading, so
never a wrong answer.

- tags: answering
- avoid: invalid answer, bad input

## Multiple choice

A question type whose student picks one choice of a choice list. Correct
choices are marked `[*]`.

- tags: question-types
- related: Choice list, Question type
- code: mdq.models.MultipleChoiceQuestion

## Multiple selection

A question type whose student ticks any number of choices of a choice list.
Correct choices are marked `[x]`.

- tags: question-types
- related: Choice list, Question type
- code: mdq.models.MultipleSelectionQuestion

## No-mistakes

A grading strategy scoring 0 on any wrong judgement, and otherwise giving
credit for the parts judged right. An abstention is not a wrong judgement.

- tags: grading
- avoid: strict partial
- related: Grading strategy, Abstention

## Numeric

A question type that expects one number, compared to the answer key within an
optional tolerance.

- tags: question-types
- related: Tolerance, Numeric domain, Question type
- code: mdq.models.NumericQuestion

## Numeric domain

The set of numbers a numeric question works in, spelled `domain`: `integer`,
`decimal` or `fraction`. A response outside it is a malformed response.

- tags: fields
- avoid: number type
- related: Numeric, Malformed response
- code: mdq.types.NumericDomain

## Ordering

A question type whose student sorts a list of lines. The `[ordering]` block
holds the lines in the correct order.

- tags: question-types
- related: Declared answer, Question type
- code: mdq.models.OrderingQuestion

## Partial

A grading strategy whose score stays between 0 and 1 while still awarding
credit for parts. A contract about the range, not a shared formula. Each
question type defines its own.

- tags: grading
- avoid: proportional, weighted, partial credit
- related: Grading strategy

## Pattern

A string that says which responses it matches: an exact literal, an inexact
literal or a regex. The entry of the `accept`, `reject`, `preAccept` and
`preReject` lists of short answer questions and blanks.

- tags: patterns
- avoid: rule, matcher, answer string
- related: Exact literal, Inexact literal, Pre-validation
- code: mdq.models.AnswerPattern

## Penalty policy

An exam's rule for whether negative scores survive, spelled `penalty`. The only
place clamping happens.

- tags: grading
- avoid: floor
- related: Exam score
- code: mdq.types.PenaltyPolicy

## Pending response

A response the question does not settle. It has no score until the instructor
gives one.

- tags: grading
- avoid: ungraded, unmatched response
- related: Settled response

## Pre-validation

The check of a submission against `preAccept` and `preReject` before it is
accepted. A submission that fails is invalid. It never contributes to a score.

- tags: patterns
- avoid: input validation, pre-grading
- related: Pattern

## Presentation label

The opaque id of a choice in the presented form, derived from the seed, the
question id and the choice id. Responses from the client use it.

- tags: answering
- avoid: shuffled id, alias
- related: Presented form

## Presented form

The public form for one seed: choices in their shuffled order, with
presentation labels in place of their ids. See `docs/public-form.md`.

- tags: answering
- related: Public form, Presentation label
- code: mdq.models.Presentation, mdq.models.ExamPresentation

## Public form

A question as a student may see it: the document without the answer key,
feedback, comments, `author` and `meta`. See `docs/public-form.md`.

- tags: answering
- related: Presented form

## Query

The expression of an `includeAll` entry that selects the questions to add,
usually by tag. MDQ recommends a query language but does not enforce one.

- tags: documents
- avoid: filter, selector
- related: Include, Question bank
- code: mdq.models._query.Query

## Question

The smallest assessable unit of MDQ, identified by an `id` and discriminated by its `type`.

- tags: documents
- avoid: item, problem, exercise
- code: mdq.models.Question

## Question bank

The source of the questions that includes take, looked up by id or by query.

- tags: documents
- related: Include, Query
- code: mdq._banks.QuestionBank

## Question type

The kind of a question, spelled `type`, which selects its body, its fields and
how it is graded. Inferred from the body when the frontmatter does not set it.

- tags: documents
- related: Question
- code: mdq.types.QuestionType

## Question-intrinsic field

A field belonging to the question wherever it appears, and never rewritten by
the exam including it.

- tags: fields
- avoid: question field, inherent field
- related: Exam-context field

## Reject

A field that declares responses known to be incorrect. In short answer and
fill-in blanks, a list of patterns: a response that matches one is incorrect,
unless it also matches `accept`. In ordering, the `## [reject]` sections:
incorrect orders of the lines, usually with feedback.

- tags: fields
- avoid: deny
- related: Accept, Pattern, Declared answer

## Resolved

An exam whose every entry is a question rather than an `include` still pointing
elsewhere. Includes resolve before a document becomes a model, so grading
always does.

- tags: document-states
- avoid: expanded, inlined, flattened
- related: Include

## Response

What a student marked for a question. Never the correct value.

- tags: answering
- avoid: submission, attempt
- code: mdq.types.QuestionResponse

## Score

What a response to a single question is worth, on a scale from -1 to 1.

- tags: grading
- avoid: grade, mark, points
- code: mdq.models.QuestionScore

## Seed

A string the host chooses for each student and exam. It fixes the order of
the choices and the presentation labels of the presented form.

- tags: answering
- related: Presented form, Presentation label

## Settled response

A response the question decides: it has a score. The opposite of a *pending
response*.

- tags: grading
- avoid: graded response, resolved response
- related: Pending response

## Short answer

A question type that expects a short text, compared to a list of patterns.

- tags: question-types
- related: Pattern, Question type
- code: mdq.models.ShortAnswerQuestion

## Shuffle

The field that says whether the choices of a question can be presented in
another order. The presented form applies it.

- tags: fields
- avoid: randomize
- related: Inherit, Presented form, Seed

## Skip

The absence of a response to a whole question, distinct from a response that
happens to mark nothing.

- tags: answering
- avoid: unanswered
- related: Abstention

## Statement

One item of a true or false question, which the student judges true or false. Marked `[T]` or `[F]` in the answer key.

- tags: documents
- avoid: assertion, proposition
- related: True or false, Abstention
- code: mdq.models.Statement

## Stem

Every block between the frontmatter and the question body: the text the
student reads before answering.

- tags: documents
- avoid: preamble, introduction, question text

## Symmetric

A grading strategy whose score may fall below zero, because judging a part
wrongly subtracts from judging another rightly.

- tags: grading
- avoid: penalised, negative marking, right-minus-wrong
- related: Grading strategy

## Tolerance

The distance from the answer key within which a numeric response is still
correct, absolute or relative to the answer.

- tags: grading
- avoid: margin, error margin
- related: Numeric
- code: mdq.models.Tolerance

## True or false

A question type whose student judges each statement of a choice list true or
false. Spelled `true-false` only as the value of `type`.

- tags: question-types
- avoid: true/false
- related: Statement, Choice list, Question type
- code: mdq.models.TrueFalseQuestion

## Unicode space

A Unicode `White_Space` code point outside ASCII, such as U+00A0. The grammar
reads it as text. See `docs/references/grammar.md`.

- tags: documents
- avoid: whitespace

## Weight

How much a question counts towards its exam, relative to the other questions.

- tags: grading
- avoid: coefficient
- related: Exam score, Exam-context field
