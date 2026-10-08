---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, numeric, short-answer, schema, tdd]
relatedTo: [mdq-js/docs/handoffs/04-parser-numeric.md, mdq-js/docs/handoffs/05-parser-short-answer.md]
---

# Cycle F3.2b — Numeric grammar changes, short-answer fallback

## Goal

Port the numeric grammar changes of the spec (root `8eb0d78`, mdq-py
`dcb8493`) and the short-answer `openEnded` fix (mdq-py `a6b238d`).

## Changes to port

Parser (`src/parser/numeric.ts`, `src/parser/index.ts`):

* INTEGER is `(?:0|[1-9][0-9]*)` and DECIMAL is `(?:0|[1-9][0-9]*)\.[0-9]+`,
  for the value, both parts of a fraction, and the tolerances. `007`, `00.5`
  and `01/2` are parse errors. A zero denominator stays the parse error
  `zero denominator in numeric body: ...`.
* A body fraction (`[numeric]: 3/4`) still becomes a number with
  `domain: fraction`.
* A unit is `[^\s()\[\]]+`: `µm`, `°C`, `m/s`, `km/h` are valid.
* Choice score percentages (`PERCENT_RE`) do not change: leading zeros stay
  allowed, digits stay ASCII.
* Short answer: the `openEnded` fallback runs after the trailing
  `[short-answer/accept|reject]` blocks. It sets `openEnded: true` only if
  none of `oneOf`, `regex`, `accept`, `reject`, `openEnded` is present, from
  the body, the trailing blocks or the frontmatter.

Schema (`src/schema/`):

* Numeric `answer`, on a question and on a numeric fill-in blank, is a number
  or a string that matches
  `^[+-]?(?:(?:0|[1-9][0-9]*)/[1-9][0-9]*|(?:0|[1-9][0-9]*)\.[0-9]+|0|[1-9][0-9]*)$`.
  A string answer comes only from a dict, YAML or JSON document. Python
  reports a malformed string as the model error `malformed-numeric-answer`;
  in TypeScript the Zod schema rejects it.
* The unit pattern is `^[^\s()\[\]]+$`.

## Reference

* `mdq-py/mdq/_parser/_numeric.py`, `mdq-py/mdq/_parser/_question.py`
  (`NUMERIC_TAG_RE`, `parse_short_answer_body`).
* `schema/numeric.yaml`, `schema/fill-in.yaml`, `docs/question-types/numeric.md`
  ("Answer representation").
* `mdq-py/tests/test_parser.py`: `test_numeric_zero_denominator_is_a_parse_error`,
  `test_bare_short_answer_*`.

## Acceptance criteria

1. The examples that `tests/not-ported.ts` lists as "F3.2b" pass, and the
   entries are removed.
2. Leading zeros in a numeric value, fraction or tolerance raise
   `ParseError`, as Python does. Percent scores keep accepting them.
3. The `test_bare_short_answer_*` cases give the same document in
   TypeScript.
4. `validateDocument` rejects a malformed numeric string answer, on a
   question and on a fill-in blank.
