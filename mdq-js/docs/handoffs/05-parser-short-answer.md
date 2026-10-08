---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, short-answer, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/04-parser-numeric.md]
---

# Cycle F3.3 — Short-answer body

## Goal

Port the `[short-answer]` body, its pattern blocks
(`[short-answer/accept]`, `[short-answer/reject]` and the other variants) and
the pattern lists in the frontmatter, so that every short-answer example
parses to exactly its `.yaml`.

Out of scope: short-answer fill-in blanks (F3.5), regex validation
(`models/_regex.py`, F5), matching and scoring (F7).

## Public API

No change to `parseQuestionDocument`, `parseQuestion`, `isExam`. New error in
`src/errors.ts` (stub exists):

```ts
class ConflictingAnswerKeyError extends ParseError { readonly code: "conflicting-accept" }
```

Every other failure is a plain `ParseError` with the Python message.

## Reference

* `mdq-py/mdq/_parser/_question.py`: `parse_short_answer_body`,
  `parse_trailing_pattern_blocks`, `parse_short_answer_pattern_blocks`,
  `_pattern_entry`, `SHORT_ANSWER_RE`, and how `parse_question` dispatches.
* `mdq-py/mdq/_parser/_frontmatter.py`: `_copy_pattern_lists` and the
  short-answer keys in `apply_type_specific_frontmatter`
  (`mdq-py/mdq/_parser/_question.py`).
* `mdq-py/mdq/errors.py`: `ConflictingAnswerKey`.
* `docs/question-types/short-answer.md`.

## Acceptance criteria

Batch 1:

1. Every `examples/valid/short-answer/*.mdq.md` and `exam/bank/amazonia-01`
   parse to exactly their `.yaml`.
2. Pattern lists in the frontmatter are copied as Python does.

Batch 2:

3. Each error path of the reference raises the same class with the same
   message: a repeated block, a second `[short-answer]` block, a pattern
   block without a list, an unknown variant, and a list declared both in the
   frontmatter and in a block (`ConflictingAnswerKeyError`).
