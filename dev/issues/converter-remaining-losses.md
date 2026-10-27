---
type: issue
status: todo
tags: [mdq-py, convert, banks]
relatedTo: [mdq-py/mdq/convert/_gift.py, mdq-py/mdq/_banks.py]
---

# Remaining silent losses after the review bug round

- GIFT export drops the `incorrectFeedback` of a numeric question with no
  warning (Moodle XML writes it as a `*` answer at 0%).
- A literal short-answer pattern with an inner `*` raises on export (it would
  be a wildcard in Moodle). Decide whether to escape it or keep the error.
- `FileLoader` raises `UnicodeDecodeError` for a bank file that is not UTF-8,
  while an invalid question is skipped silently. Skip it too, or report it.
- Moodle `[html]` and HTML text are copied verbatim: an HTML block swallows the
  following lines. Documented in the mdq-py README; a converter to Markdown
  (committee D03 option a) is possible later.
