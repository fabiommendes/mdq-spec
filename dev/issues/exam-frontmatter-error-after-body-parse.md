---
type: issue
status: todo
tags: [mdq-py, diagnostics, frontmatter, exam]
relatedTo: [mdq-py/mdq/_parser/_exam.py, mdq-py/mdq/_parser/_question.py]
---

# Exam frontmatter errors appear only after the body parses

A question now reports its `invalid-frontmatter-field` errors together with
the `parse-error` of its body. `parse_exam` does not: with an invalid body,
the frontmatter errors of an exam appear only in a second run. Do the same
for exams.
