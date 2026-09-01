# List of issues and tasks to be done for the mdq project.

## Small tasks

* Add tests with questions that use fenced blocks of code, tables, lists, and other markdown block elements.
* Improve support for the markdown related hypothesis strategies. Must be more
  precise when generating valid markdown code for various elements.

## Large tasks

Those need discussion and design.

* Representation of marked student responses for all question types. 
* Grading support for auto-gradable questions.
* Associative (matching) question type.
* Allow the exam to set a default `grading` strategy for its questions. 
* Derived guessing penalty for multiple-choice, e.g. `-1/(n-1)` for wrong
  choices, so instructors do not have to write negative scores by hand.
* Per-blank weights in fill-in questions.
* Strategies to fill in missing question ids automatically (by position, by
  filename stem, by title slug). For now grading simply raises on a document
  that is not addressable.
* Per-blank feedback placement for fill-in questions. Feedback is currently a
  flat list, which a UI cannot position next to the blank it belongs to.


## Architectural improvements

* Permanent: go through the non-justified `# type: ignore` comments or `Any` and
  see if they can be removed. If not, add a comment explaining why it is
  necessary. If unsure, add a # TODO comment.
* Formalize the Dicts used in the parser module using TypedDicts.
* Move the obligatory validations in the linter to the Pydantic models themselves.
* Add a `.lint()` method to the models and implement the validations there. The
  linter module will be a utility module that the `.lint()` methods can use
  similarly to how the `.render()` methods use the render module.


## Maintenance

* Permanent: go through the FIXME/TODO items. If it is an easy fix, fix it.
  Otherwise, remove the comment and save it in the corresponding section in the
  backlog.
* Automate the job of creating a jsonschema with all the models.
* Find opportunities to remove redundant tests and fixtures in the test suite.


## Uncategorized issues

* A fenced code block nested inside a multiple-choice/multiple-selection/
  true-false/fill-in choice loses its line breaks: `MDQParser.parse_item`
  folds every continuation line of a choice into single-space-joined prose,
  the same rule used for preamble/stem text, so the code stops being valid
  fenced Markdown once parsed. See
  `mdq/examples/valid/multiple-choice/fenced-code-choice.mdq.md` (marked
  `NOT_YET_SUPPORTED` in `tests/test_parser.py`). Fixing it needs the choice
  parser to track fence state per continuation line (like the module
  already does per top-level block via `.map`) instead of blindly
  stripping/joining every line.
* GFM pipe tables are not recognized as a block by the parser: `mdq/parser.py`
  builds `MarkdownIt("commonmark")` with no table extension, so a pipe table
  in a preamble/stem/epilogue is just an ordinary paragraph to markdown-it,
  and its rows get soft-wrap-collapsed into a single line of prose. See
  `mdq/examples/valid/numeric/table-preamble.mdq.md` (marked
  `NOT_YET_SUPPORTED` in `tests/test_parser.py`). Needs a table extension
  (e.g. the `tables` plugin from `mdit-py-plugins`, a new dependency) enabled
  on the `MarkdownIt` instance; once enabled, `MDQParser.raw_text`'s existing
  fallback to raw-line reconstruction for any non-paragraph block should
  preserve the table verbatim with no further changes.


## Non-goals

* E-judge (auto-graded programming) question type.