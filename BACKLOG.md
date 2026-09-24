# List of issues and tasks to be done for the mdq project.

## Small tasks

* [ ] Convert all type anotations in mdq.cli to use Annotaded[] pattern instead
  of setting typer.Option/Argument as the default value.
* [ ] `render.yield_frontmatter` dumps YAML with `allow_unicode` off and keys
  sorted, so rendering any question with accents produces
  `author: "F\xE1bio Mac\xEAdo Mendes"` and reorders the frontmatter the author
  wrote. Affects every question type, not just the recently added ordering.

## Large tasks

Those need discussion and design.

* [ ] Line numbers in diagnostics. The parser records a `path -> line` source
  map as it builds a document from Markdown (`node.map`), so any diagnostic
  with a path (model or lint) gets a line. For YAML input, walk the node tree
  from `yaml.compose()` (`start_mark.line`). Investigate first: corner cases of
  PyYAML reading JSON (JSON is not a strict YAML subset), and existing JSON
  parsers that already track positions. Writing our own JSON parser is
  acceptable; writing a YAML parser is not.

* [x] Representation of marked student responses for all question types. 
* [x] Basic grading support for auto-gradable questions.
* [x] Add the grading option for the relevant question types.
* [ ] Allow the exam to set a default `grading` strategy for its questions. 
* [x] Derived guessing penalty for multiple-choice, e.g. `-1/(n-1)` for wrong
  choices, so instructors do not have to write negative scores by hand.
* [x] Strategies to fill in missing question ids automatically (by position, by
  filename stem, by title slug). For now grading simply raises on a document
  that is not addressable.
* [ ] Per-blank weights in fill-in questions.
* [ ] Per-blank feedback placement for fill-in questions. Feedback is currently a
  flat list, which a UI cannot position next to the blank it belongs to.
* [ ] Associative (matching) question type.


## Architectural improvements

* **Permanent:** go through the non-justified `# type: ignore` comments or `Any` and
  see if they can be removed. If not, add a comment explaining why it is
  necessary. If unsure, add a # TODO comment.
* **Permanent:** go through all xfail tests and verify if the expected failures
  can be fixed in the current state of the codebase. Ensure that if the xfail
  should remain, it documents the reason why it is expected to fail and what are
  the blocking issues to fix it.
* [x] Formalize the Dicts used in the parser module using TypedDicts.
* [ ] Move the obligatory validations in the linter to the Pydantic models themselves.
* [ ] Add a `.lint()` method to the models and implement the validations there. The
  linter module will be a utility module that the `.lint()` methods can use
  similarly to how the `.render()` methods use the render module.


## Maintenance

* **Permanent:** go through the FIXME/TODO items. If it is an easy fix, fix it.
  Otherwise, remove the comment and save it in the corresponding section in the
  backlog.
* [x] Automate the job of creating a jsonschema with all the models.
* [ ] Find opportunities to remove redundant tests and fixtures in the test suite.
* [ ] Create the test function that reads examples/grading/*.yaml files and run the corresponding tests
* [ ] Create the examples/grading/*.yaml files for all question types with examples that cover all corner cases

## Specification

* [ ] Write the section "AST representation" in the spec document for all question types.


## Uncategorized issues

None for now!


## Non-goals

* E-judge (auto-graded programming) question type.


## Conversions

* [x] Convert multiple choice questions to/from AIKEN
* [x] Convert question types to/from GIFT
* [x] Convert question types to/from Moodle XML
