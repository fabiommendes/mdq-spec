# 0.1.0

* Basic question parsing for multiple choice, true/false and multiple selection
  questions.
* Basic parsing for essay questions.


# 0.2.0

* Question additional validation and error reporting.


# Backlog

Issues that do not have a milestone. They should be considered for future
releases.

* Representation of marked answers for all question types. Those are arbitrary
  answer marked by the student and not necessarily the answer key. 
* Compute the score for each question type that can automatically graded. Do not
  compute complicated routines such as programming questions or essay questions.
* Associative (matching) question type. Removed from `QuestionType` in 0.2.0
  because it had no schema, no docs and no examples; re-add once specified.
* E-judge (auto-graded programming) question type.
* Allow the exam to set a default `grading` strategy for its questions. For now
  the exam cannot influence how an individual question is graded.
* Derived guessing penalty for multiple-choice, e.g. `-1/(n-1)` for wrong
  choices, so instructors do not have to write negative scores by hand.
* Per-blank weights in fill-in questions.
* Strategies to fill in missing question ids automatically (by position, by
  filename stem, by title slug). For now grading simply raises on a document
  that is not addressable.
* Per-blank feedback placement for fill-in questions. Feedback is currently a
  flat list, which a UI cannot position next to the blank it belongs to.