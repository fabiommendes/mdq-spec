# MDQ

MDQ is a file format for declaring questions and exams in Markdown, together
with the JSON/YAML representation those documents transform into. This glossary
fixes the vocabulary the format, the schemas and the implementations all share.

## Documents

### Question
A single assessable item, identified by an `id` and discriminated by its `type`.
_Avoid_: item, problem, exercise

### Exam
A set of questions gathered for assessment, recognised by its H1 title.
_Avoid_: test, quiz, assessment

### Include
An entry in an exam that references a question defined elsewhere, rather than
carrying it inline.
_Avoid_: reference, link, import

### Choice list
An unordered list whose every item starts with a choice marker. The body of
multiple choice, multiple selection and true/false. See
`docs/references/choices.md`.
_Avoid_: checkbox list, option list

### Choice marker
The bracket at the start of a choice item, such as `[x]` or `[ ]`, not
followed by `(` or `[`. Its content is the value.
_Avoid_: checkbox, checkmark

### Diagnostic
A problem found while loading a document, with a severity (error, warning,
info), a code and a location. An error means no document was built.
_Avoid_: lint warning, validation error

### Stem
Every block between the frontmatter and the question body: the text the
student reads before answering.
_Avoid_: preamble, introduction, question text

### Unicode space
A Unicode `White_Space` code point outside ASCII, such as U+00A0. The grammar
reads it as text. See `docs/references/grammar.md`.
_Avoid_: whitespace, blank


## Answering

### Response
What a student marked for a question. Never the correct value.
_Avoid_: answer, submission, attempt

### Answer key
The correct answer an instructor declared for a question, whether a machine can
check it (`answer`, `accept`, per-choice `score`) or only a human can
(an essay's `answerKey`). Carrying one does not make a question auto-gradable.
_Avoid_: solution, the correct answer, gabarito

### Declared answer
An ordering an ordering question declares: the answer key (`[ordering]` and
`## [accept]`) or a `## [reject]` section. A response is graded by the first
declared answer it matches.

### Skip
The absence of a response to a whole question, distinct from a response that
happens to mark nothing.
_Avoid_: blank, empty, unanswered

### Abstention
Leaving one individual true-false statement unjudged. Only true-false admits
it; a multiple-selection choice left unticked asserts "false".
_Avoid_: skip, blank, no-mark

### Malformed response
A response the question cannot represent — a decimal where the domain is
integer, a unit that isn't the declared one. Rejected before grading, so never
a wrong answer.
_Avoid_: invalid answer, bad input

## Document states

### Addressable
A document in which every question and every choice carries an id, so a
response can name what it refers to. Parsing never requires it; grading always
does. `with_ids()` (mdq-py) makes a document addressable.
_Avoid_: gradable, identified, id-complete

### Derived id
An id that the author did not write, given to a choice (from its text) or to
a question in an exam (`q<position>`) to make the document addressable.
A derived choice id is not portable across implementations or versions.
_Avoid_: implicit id, generated id, auto id

### Resolved
An exam whose every entry is a question rather than an `include` still pointing
elsewhere. Includes resolve before a document becomes a model, so grading
always does.
_Avoid_: expanded, inlined, flattened


## Grading

### Automation
How many responses a question settles without the instructor: `automatic`
(every response), `semi-automatic` (only the responses that match an answer
key) or `manual` (none). Derived from the fields, never written in the
document.
_Avoid_: auto-gradable, manually-graded, open-ended, objective, subjective

### Pending response
A response the question does not settle. It has no score until the instructor
gives one.
_Avoid_: ungraded, unmatched response

### Settled response
A response the question decides: it has a score. The opposite of a *pending
response*.
_Avoid_: graded response, resolved response

### Score
What a response to a single question is worth, on a scale from -1 to 1.
_Avoid_: grade, mark, points, credit

### Exam score
The weighted mean of the question scores after `penalty`. Pending while any
response is pending; a *provisional score* is the same mean over the settled
questions only.
_Avoid_: total, final grade, exam grade, result

### Grading strategy
How a question with several parts reduces those parts to one score. Spelled
`grading`, and carried only by multiple-choice, multiple-selection, true-false
and fill-in.
_Avoid_: grading mode, scoring method, algorithm

### Symmetric
A grading strategy whose score may fall below zero, because judging a part
wrongly subtracts from judging another rightly.
_Avoid_: penalised, negative marking, right-minus-wrong

### Partial
A grading strategy whose score stays between 0 and 1 while still awarding
credit for parts. A contract about the range, not a shared formula. Each
question type defines its own.
_Avoid_: proportional, weighted, partial credit

### All-or-nothing
A grading strategy scoring 1 only when every part is correct, and 0 otherwise.
_Avoid_: strict, exact, binary

### No-mistakes
A grading strategy scoring 0 on any wrong judgement, and otherwise giving
credit for the parts judged right. An abstention is not a wrong judgement.
_Avoid_: strict partial, zero tolerance

### Inherit
The default value of `grading` and `shuffle` in a question: take the exam's
value, or `symmetric` and `false` outside an exam.
_Avoid_: unset, default, none

### Feedback
Remedial text attached to a choice and shown to the student after grading.
What triggers it depends on the question type: in multiple-choice the choice
picked, whatever it scored; in multiple-selection and true-false only the ones
judged wrongly, plus unjudged statements in true-false.
_Avoid_: explanation, rationale, comment

### Weight
How much a question counts towards its exam, relative to the other questions.
_Avoid_: points, value, marks

### Penalty policy
An exam's rule for whether negative scores survive, spelled `penalty`. The only
place clamping happens.
_Avoid_: clamping, floor, negative marking


## Patterns

### Exact literal
A pattern enclosed in backticks, compared code point for code point after NFC
and the removal of the Unicode spaces at its ends. Follows the CommonMark code
span, so N backticks can hold a backtick.
_Avoid_: verbatim string, quoted string

### Inexact literal
A pattern that is neither enclosed in backticks nor delimited by `/`. The
comparison ignores case, diacritics, invisible characters, typographic quotes
and dashes, and the amount of whitespace.
_Avoid_: plain match, fuzzy match

### Pattern
A string that says which responses it matches: an exact literal, an inexact
literal or a regex. The entry of the `accept`, `reject`, `preAccept` and
`preReject` lists of short answer questions and blanks.
_Avoid_: rule, matcher, answer string

### Pre-validation
The check of a submission against `preAccept` and `preReject` before it is
accepted. A submission that fails is invalid. It never contributes to a score.
_Avoid_: input validation, pre-grading

## Fields

### Accept and reject
Fields whose meaning depends on the `type`. In short answer and fill in blanks,
a list of patterns. In ordering, a list of alternative orders of the lines.
_Avoid_: allow and deny

### Content
A field whose meaning depends on the `type`. In essay, the kind of response
(`code`, `text` or `plain`), set in the frontmatter. In ordering, the kind of
the lines (`code` or `text`), set by the body.
_Avoid_: format, kind

### Exam-context field
A field describing a question's role within one exam rather than the question
itself, and therefore overridable by an include. `weight` is the only one.
_Avoid_: exam field, local override

### Question-intrinsic field
A field belonging to the question wherever it appears, and never rewritten by
the exam including it.
_Avoid_: question field, inherent field
