---
type: note
status: active
tags: [mdq, spec, lint-codes, decisions]
relatedTo: [docs/lint-codes.md, docs/exam.md, docs/question-types]
---

# Lint codes vs spec: open decisions

From the audit of `docs/lint-codes.md` against `docs/exam.md` and
`docs/question-types/*` (2026-09-28). The first batch (Q1-Q4: blank choice
text, many correct choices, include extra keys, locale/uuid MUST) is done. The second batch (false-friend wording, normalized overlap, domain
from answer and abstol, redundant anchor wording) is done 2026-09-29.
These items need a decision from the human.

## Rules with no code

- A `reject` entry with the same lines as the `[ordering]` block
  (`ordering.md:304`, `333`).
- Ordering `normalizations` MUST NOT repeat (`ordering.md:128`). Only the
  schema checks it (`uniqueItems`).
- "Authors SHOULD avoid indenting blockquotes and comment blocks"
  (`ordering.md:232`).
- `ShortAnswerQuestion` rejects `openEnded` together with `oneOf`/`regex`/
  `accept`/`reject` with a raw `value_error` (`models/_text.py`). The spec
  does not state this rule. Write the rule and give it a code, or drop it.
- `unsafe-id` covers the question id but not choice ids
  (`multiple-choice.md:110`: choice ids follow the slug rules).

## Codes with a weak spec basis

- `unknown-frontmatter-key` on questions: no spec text covers unknown keys.
- `shadowed-answers`, `short-answer-not-gradable`, `redundant-regex-anchor`
  depend on `regex`, `oneOf`, `openEnded`. These fields are in the rules
  table of `short-answer.md` (377-386), but not in its frontmatter table
  (68-75).

## Naming

- Multiple choice uses `multiple-choice-no-correct-choice`; multiple
  selection uses `no-correct-choice`.
