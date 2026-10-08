---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, essay, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/02-parser-bracket-lists-parity.md]
---

# Cycle F3.1 — Essay body

## Goal

Port the `[essay]` body, the `[answer-key]` block and the epilogue, so that
every essay example parses to exactly its `.yaml`. Align the markdown-it
configuration with Python while doing it, because essay examples hold code,
images, links and thematic breaks.

Out of scope: the other tag-based bodies, exams, lint helpers
(`find_forbidden_elements`, `reconstruct_blocks`).

## Public API

No change to `parseQuestionDocument`, `parseQuestion`, `isExam`. A new
error class takes the name of its Python class in `mdq-py/mdq/errors.py` plus
the `Error` suffix, like the existing `MissingFieldError`. For example,
`ConflictingAnswerKey` becomes `ConflictingAnswerKeyError`.

## Reference

Cite Python by file and function name, not by line: the Python layout is
still moving.

* `mdq-py/mdq/_parser/_question.py`: `parse_essay_body`, `parse_answer_key`,
  `find_body_start`, `_matches_tag`, `ESSAY_TAG_RE`, `ANSWER_KEY_RE`, and the
  epilogue handling in `parse_question`.
* `mdq-py/mdq/_markdown.py`: `md = MarkdownIt("gfm-like")`. Reproduce the
  same preset options and enabled rules with markdown-it JS.
* `docs/question-types/essay.md` if the Python code leaves a question open.

## Acceptance criteria

Batch 1:

1. Every `examples/valid/essay/*.mdq.md` parses to exactly its `.yaml`.
2. The essay questions of the exam bank (`exam/bank/cerrado-01`,
   `mata-atlantica-01`, `recursion-01`) parse to exactly their `.yaml`.
3. An `[answer-key]` block that the reference rejects raises the same error
   kind in TypeScript (`ParseError` subclass, with the same field or reason).

Batch 2:

4. The markdown-it instance has the same enabled rules and options as
   Python `gfm-like`: a test lists the block and inline rules of both and
   they agree.
