---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, numeric, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/03-parser-essay.md]
---

# Cycle F3.2 — Numeric body

## Goal

Port the `[numeric]:` body and its expression grammar, so that every numeric
example parses to exactly its `.yaml`.

Out of scope: numeric fill-in blanks (cycle F3.5 reuses
`parseNumericExpression`), scoring.

## Public API

No change to `parseQuestionDocument`, `parseQuestion`, `isExam`. New module,
named after `_numeric.py`:

```ts
// src/parser/numeric.ts
interface NumericExpression { answer; domain?; decimalPlaces?; tolerance? }
function parseNumericExpression(expression: string): NumericExpression;
```

## Reference

* `mdq-py/mdq/_parser/_numeric.py`: `_parse_numeric_expression`,
  `NUM_VALUE_RE`, `TOL_TERM_RE`.
* `mdq-py/mdq/_parser/_question.py`: `parse_numeric_body`, `NUMERIC_TAG_RE`.
* `docs/question-types/numeric.md`.

## Dialect

* Digits are ASCII (`[0-9]`), in Python and in TypeScript. `[numeric]: ٣`
  is a parse error.
* Leading zeros (`007`) are accepted, as in Python, although the spec
  grammar forbids them.
* Units: the character class of a unit waits for a decision (the JSON Schema
  pattern is ASCII, Python accepts Unicode letters). Only ASCII units are in
  scope.

## Acceptance criteria

Batch 1:

1. Every `examples/valid/numeric/*.mdq.md` and `exam/bank/pantanal-02`
   parse to exactly their `.yaml`.
2. A malformed numeric body raises `ParseError`, as Python does.

Batch 2:

3. `parseNumericExpression` returns the same value as Python for a table of
   expressions: signs, integers, decimals, fractions, both tolerances in
   both orders, whitespace variants, and malformed input.
