# Responses are keyed by id, and an absent key means "not marked"

A response names what it refers to by id -- the chosen choice's id in
multiple-choice, a mapping of choice id to boolean in multiple-selection and
true-false, a mapping of blank id to response in fill-in. Where a key could
appear and does not, it means the student did not mark that choice, and each
question type reads that through its own answer model. `null` means the whole
question was skipped. The full specification is in
[docs/responses.md](../responses.md).

## Considered options

**Positional lists** were the first shape on the table, and they are more
compact and closer to how the Markdown reads: `[false, true, true, false]`
lines up with the four statements on the page. They were rejected because
`shuffle` exists. When choices are presented in a shuffled order, the student's
list is in presentation order while the key is in document order, and nothing
in a positional response records which. The failure mode is a silently wrong
grade rather than an error, which is the worst kind available.

Keying by id costs something real: ids are optional in the format, so grading
acquires a precondition the schemas do not express -- see *addressable* in
[CONTEXT.md](../../CONTEXT.md). We accepted that rather than requiring ids of
every document, because the consuming system is better placed to supply them
than the author is: it knows the filename, the database key and the attempt.

**Requiring every key to be present** was the alternative to the absence rule,
with an explicit `null` for anything unmarked. It makes a typo'd id and a
deliberate skip distinguishable, which is genuinely safer. It lost because
responses are produced by software rather than authored by hand, so the
verbosity buys little, and the same protection is achieved at the exam level,
where a key naming no question *is* rejected.

## Consequences

The same YAML means different things in different types. A multiple-selection
and a true-false response are both `dict[str, bool]`, and in both an absent key
means "did not mark" -- but multiple-selection reads not-marking as an
assertion of false, while true-false reads it as an abstention that scores
nothing and forfeits an all-or-nothing question. Implementations MUST NOT share
one interpretation between the two types.

`null` and `{}` are meaningfully different on multiple-selection, and this is
the distinction most likely to be reported as a bug. `null` skips: it scores 0
without running the grading formula, and so produces no feedback. `{}` is a
real answer meaning "none of these": it is graded normally, may score below
zero under symmetric grading, and triggers the feedback of every correct choice
the student missed.

Because ids are load-bearing, renaming a choice renames the thing responses
point at. Choice ids are derived from choice text, so an instructor fixing a
typo changes the id, and stored responses stop matching. Grading is defined
against the question version the response was produced from; re-scoring an old
response against an edited question is out of scope, and belongs with question
versioning if that is ever taken up.
