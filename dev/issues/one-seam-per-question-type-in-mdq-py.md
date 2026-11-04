---
type: issue
status: backlog
tags: [mdq-py, architecture]
relatedTo: [mdq-py/mdq/models/_base.py, mdq-py/mdq/types.py]
kind: enhancement
created: 2026-11-03
creator: claude
---

# One seam per question type in mdq-py

From the architecture review of 2026-09-23 (candidate C3, "worth exploring").

Each question type is a key in several dispatch sites, in more than one
style: `isinstance(..., XQuestion)` chains in `mdq-py/mdq/convert/_gift.py`,
`_moodle_xml.py`, `_aiken.py`, `mdq-py/mdq/models/_exam.py`,
`_presentation.py` and `_base.py` (14 sites on 2026-11-03), string
dispatch in `mdq-py/mdq/_parser/_question.py`, and the `QuestionType`
literal in `mdq-py/mdq/types.py` that `QUESTION_TYPES` derives from. Nothing
checks that `QuestionType` agrees with the `type` tags of the `Question`
union in `models/_exam.py`.

Proposal: the model class is the seam for type-specific behaviour other than
parsing, and one registry maps type tag to class and scaffold template.
Open question: do the per-type body parsers move behind this seam or stay in
`_parser/`? A first step with no design cost: a test that `QUESTION_TYPES`
equals the tags of the `Question` union.
