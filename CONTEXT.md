# MDQ

MDQ is a file format for declaring questions and exams in Markdown, together
with the JSON/YAML representation those documents transform into. This glossary
fixes the vocabulary the format, the schemas and the implementations all share.

## Documents

**Question**:
A single assessable item, identified by an `id` and discriminated by its `type`.
_Avoid_: item, problem, exercise

**Exam**:
A set of questions gathered for assessment, recognised by its H1 title.
_Avoid_: test, quiz, assessment

**Include**:
An entry in an exam that references a question defined elsewhere, rather than
carrying it inline.
_Avoid_: reference, link, import

## Answering

**Response**:
What a student marked for a question. Never the correct value.
_Avoid_: answer, submission, attempt

**Answer key**:
The correct answer an instructor declared for a question, whether a machine can
check it (`answer`, `oneOf`, `regex`, per-choice `score`) or only a human can
(an essay's `answerKey`). Carrying one does not make a question auto-gradable.
_Avoid_: solution, the correct answer, gabarito

**Skip**:
The absence of a response to a whole question, distinct from a response that
happens to mark nothing.
_Avoid_: blank, empty, unanswered

**Abstention**:
Leaving one individual true-false statement unjudged. Only true-false admits
it; a multiple-selection choice left unticked asserts "false".
_Avoid_: skip, blank, no-mark

**Malformed response**:
A response the question cannot represent — a decimal where the domain is
integer, a unit that isn't the declared one. Rejected before grading, so never
a wrong answer.
_Avoid_: invalid answer, bad input

## Document states

**Addressable**:
A document in which every question and every choice carries an id, so a
response can name what it refers to. Parsing never requires it; grading always
does.
_Avoid_: gradable, identified, id-complete

**Resolved**:
An exam whose every entry is a question rather than an `include` still pointing
elsewhere. Includes resolve before a document becomes a model, so grading
always does.
_Avoid_: expanded, inlined, flattened

## Grading

**Auto-gradable question**:
A question declaring an answer key a machine can check. Every type except
essay, and short-answer only when not `openEnded`.
_Avoid_: keyed question, objective question

**Manually-graded question**:
A question with no machine-checkable answer key. It may still carry one written
for a human, as an essay's `answerKey` is.
_Avoid_: unkeyed question, subjective question, open question

**Score**:
What a response to a single question is worth, on a scale from -1 to 1.
_Avoid_: grade, mark, points, credit

**Grading strategy**:
How a question with several parts reduces those parts to one score. Spelled
`grading`, and carried only by multiple-selection, true-false and fill-in.
_Avoid_: grading mode, scoring method, algorithm

**Symmetric**:
A grading strategy whose score may fall below zero, because judging a part
wrongly subtracts from judging another rightly.
_Avoid_: penalised, negative marking, right-minus-wrong

**Partial**:
A grading strategy whose score stays between 0 and 1 while still awarding
credit for parts. A contract about the range, not a shared formula — each
question type defines its own.
_Avoid_: proportional, weighted, partial credit

**All-or-nothing**:
A grading strategy scoring 1 only when every part is correct, and 0 otherwise.
_Avoid_: strict, exact, binary

**Feedback**:
Remedial text attached to a choice and shown to the student after grading.
What triggers it depends on the question type: in multiple-choice the choice
picked, whatever it scored; in multiple-selection and true-false only the ones
judged wrongly, plus unjudged statements in true-false.
_Avoid_: explanation, rationale, comment

**Weight**:
How much a question counts towards its exam, relative to the other questions.
_Avoid_: points, value, marks

**Penalty policy**:
An exam's rule for whether negative scores survive, spelled `penalty`. The only
place clamping happens.
_Avoid_: clamping, floor, negative marking

**Exam score**:
What a whole exam is worth, covering its auto-gradable questions only, alongside the
share of the exam's weight that figure accounts for and the questions still
awaiting a human.
_Avoid_: total, final grade, result

## Fields

**Exam-context field**:
A field describing a question's role within one exam rather than the question
itself, and therefore overridable by an include. `weight` is the only one.
_Avoid_: exam field, local override

**Question-intrinsic field**:
A field belonging to the question wherever it appears, and never rewritten by
the exam including it.
_Avoid_: question field, inherent field
