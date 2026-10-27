---
type: issue
status: todo
tags: [spec, questions, randomization]
relatedTo: [docs/question-types/question-base.md, docs/exam.md]
---

# Parametrized questions

A host such as Codehood wants each student to get a different version of the
same question, to make copying harder in graded exams and to allow repeated
practice. Today only `shuffle` varies a question, and only the order of its
choices.

Proposal: a question declares parameters (integer ranges, choices from a
list, values computed from other parameters) that its stem, choices and
answer key reference. The host passes a seed (for example, derived from the
student and the exam) and the library renders and grades the question for
that seed, deterministically.

To decide:

* Syntax for declaring and referencing parameters, and how much computation
  is allowed (a tiny expression language vs. none at all).
* Which question types support it (numeric is the obvious first).
* How a response records the seed so it can be regraded later.
* Whether `shuffle` becomes a special case of the same seed.
