# `grading: "partial"` names a range contract, not a shared algorithm

`grading` accepts `"symmetric" | "partial" | "all-or-nothing"` on
multiple-selection, true-false and fill-in. `"symmetric"` means the score may go
below zero; `"partial"` means it stays between 0 and 1 while still awarding
credit for individual parts. Deliberately, `"partial"` does **not** denote one
formula: each question type defines its own, and they genuinely differ —
multiple-selection floors its symmetric result, true-false counts correct marks
over total statements, fill-in floors the mean of its blanks.

## Considered options

The first attempt gave the value one meaning everywhere: "the fraction of parts
you got right, with no subtraction". That is a rule a reader can hold in their
head, and it was rejected anyway, because it grades identical data differently
from what the types actually need. True-false admits abstention and
multiple-selection does not, so "correct ÷ total" and "floored symmetric" are
not interchangeable: for five items keyed `[T,T,F,F,F]` and a response marking
everything true, the first yields 0.4 and the second 0.0. Forcing one formula
would have meant one of the two types grading in a way its own response model
contradicts.

Naming the range rather than the algorithm keeps a single word meaning a single
promise — *this cannot return a negative* — which is the property an instructor
choosing between the values actually cares about, and the property the exam's
`penalty` policy composes with.

## Consequences

Every question type carrying `grading` must document its own `"partial"` and
`"symmetric"` formulas explicitly; the value name does not imply them. A reader
comparing two types' docs will find different arithmetic under the same word,
and that is intended.

`GradingStrategy` lives as a shared `$defs` entry in `question-base.yaml` so the
value names have one canonical definition, but `question-base.yaml` declares no
`grading` property — types that do not grade in parts reject the field outright
rather than accepting one that would mean nothing.
