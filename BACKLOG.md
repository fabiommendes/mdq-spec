# List of issues and tasks to be done for the mdq project.

## Small tasks

None for now!

## Large tasks

Those need discussion and design.

* [ ] Representation of marked student responses for all question types. 
* [ ] Grading support for auto-gradable questions.
* [ ] Associative (matching) question type.
* [ ] Allow the exam to set a default `grading` strategy for its questions. 
* [ ] Derived guessing penalty for multiple-choice, e.g. `-1/(n-1)` for wrong
  choices, so instructors do not have to write negative scores by hand.
* [ ] Per-blank weights in fill-in questions.
* [x] Strategies to fill in missing question ids automatically (by position, by
  filename stem, by title slug). For now grading simply raises on a document
  that is not addressable.
* [ ] Per-blank feedback placement for fill-in questions. Feedback is currently a
  flat list, which a UI cannot position next to the blank it belongs to.


## Architectural improvements

* [ ] Permanent: go through the non-justified `# type: ignore` comments or `Any` and
  see if they can be removed. If not, add a comment explaining why it is
  necessary. If unsure, add a # TODO comment.
* [x] Formalize the Dicts used in the parser module using TypedDicts.
* [ ] Move the obligatory validations in the linter to the Pydantic models themselves.
* [ ] Add a `.lint()` method to the models and implement the validations there. The
  linter module will be a utility module that the `.lint()` methods can use
  similarly to how the `.render()` methods use the render module.


## Maintenance

* [ ] Permanent: go through the FIXME/TODO items. If it is an easy fix, fix it.
  Otherwise, remove the comment and save it in the corresponding section in the
  backlog.
* [x] Automate the job of creating a jsonschema with all the models.
* [ ] Find opportunities to remove redundant tests and fixtures in the test suite.


## Uncategorized issues

None for now!


## Non-goals

* E-judge (auto-graded programming) question type.