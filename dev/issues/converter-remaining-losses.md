---
type: issue
status: todo
tags: [mdq-py, convert]
relatedTo: [mdq-py/mdq/convert/_moodle_xml.py]
---

# Remaining silent losses after the review bug round

- Moodle `[html]` and HTML text are copied verbatim: an HTML block swallows the
  following lines. Documented in the mdq-py README; a converter to Markdown
  (committee D03 option a) is possible later.
- GIFT export drops the `incorrectFeedback` of a short-answer question
  (`block_from_short`) and of short-answer and numeric blanks of a fill-in,
  with no warning. GIFT has no safe form for it: the importer reads `*` in a
  short answer as a literal. Decide: raise, warn (the converters have no
  warning mechanism yet), or accept the loss and document it.
