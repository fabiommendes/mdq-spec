---
type: issue
status: backlog
tags: [mdq-py, parser]
relatedTo: [mdq-py/mdq/_parser/_exam.py, mdq-py/mdq/_parser/_question.py]
kind: enhancement
created: 2026-11-03
creator: claude
---

# Move exam parsing into MDQParser

From the architecture review of 2026-09-23 (candidate C4, "worth exploring").

Exam parsing is a parallel free-function path (`parse_exam` and its helpers
in `mdq-py/mdq/_parser/_exam.py`) with its own frontmatter handling, next to
`MDQParser` in `_parser/_question.py`. `_parser/_exam.py:115` still has the
comment "FIXME: move this logic to the MDQParser and reuse their methods".

Proposal: one parser class, one frontmatter pass and one cursor for both
kinds of document.
