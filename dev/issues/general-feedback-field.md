---
type: issue
status: todo
tags: [spec, convert, feedback]
relatedTo: [docs/question-types/question-base.md, mdq-py/mdq/convert/_base.py]
---

# A spec field for general feedback

The GIFT and Moodle XML converters keep general feedback (`####text`,
`<generalfeedback>`) in `meta.generalFeedback`, a key that the converters
define and the spec does not. Moodle shows this text to every student after
the attempt; it often holds the worked solution.

Evaluate a spec field (option (g) of the review committee, D05):
`generalFeedback` in question-base, shown after grading, for every type. It
needs a schema entry, a Markdown form, corpus examples, and support in mdq-py
and mdq-js. The converters would then map to it instead of `meta`.
