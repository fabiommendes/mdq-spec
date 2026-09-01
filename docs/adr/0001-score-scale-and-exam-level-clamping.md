# Question scores range from -1 to 1, and only exams clamp them

A question's score ranges from -1 to 1, where negative values exist so that
guessing can be made to cost something. Whether those negatives survive is
decided once, by the exam, through `penalty: "none" | "capped" | "full"`
(default `"none"`): floor each question at 0 before weighting, keep the full
values but floor the exam total, or floor nothing. Questions never clamp
themselves, and a question scored outside an exam returns its raw value with no
policy applied at all.

## Considered options

Clamping at the question level was the obvious alternative, and it is what the
schema looks like it wants — most types cannot produce a negative score anyway.
It was rejected because clamping in two places compounds: an instructor reading
a question could no longer predict what it contributes to a grade without also
knowing the exam's policy and the order the two rules apply in. Confining
clamping to the exam keeps every question independently explicable, which is
also why no per-question override of `penalty` exists.

## Consequences

Under the default `penalty: "none"`, a multiple-selection question's
`"symmetric"` and `"partial"` strategies produce identical exam totals, since
the exam floors each question at 0 regardless. The distinction only becomes
observable under `"capped"` or `"full"`. This is expected, not a bug.

Negative scores are reachable only two ways: an instructor writing a negative
`Choice.score` — in multiple-choice, or in a fill-in choice blank, which `$ref`s
the same definition — or `"symmetric"` grading. `Choice.score` is bounded to
[-1, 1] in the schema so a typo becomes a malformed question rather than a
silently clamped grade.
