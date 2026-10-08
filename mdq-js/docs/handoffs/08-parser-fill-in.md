---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, fill-in, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/07-parser-ordering.md]
---

# Cycle F3.5 — Fill-in body

## Goal

Port the fill-in body: the run of `[^id...]:` blank definitions after the
stem, so that every `examples/valid/fill-in/*.mdq.md` parses to exactly its
`.yaml`. This finishes phase F3.

Out of scope: the model rules (`misplaced-blank`, undefined or unreferenced
markers, `find_forbidden_elements`, F5), lint (F6), scoring (F7).

## Public API

No change to `parseQuestionDocument`, `parseQuestion`, `isExam`. Python has
no module for the fill-in body (it is in `_question.py`), so the code goes
into private methods of the parser class in `src/parser/index.ts`, next to
`parseNumericBody`. Reuse `parseNumericExpression` (`parser/numeric`) and the
helpers of `parser/choices` (`parseItemList` equivalent, `assignChoiceIds`,
`scoreFromValue`, `parsePlainItem`, `patternEntry`, `splitListItems`).

New function in `src/parser/text.ts` (stub exists):

```ts
function repr(text: string): string; // Python's repr() of a str
```

Every failure is a plain `ParseError` with the Python message. Messages that
use `{x!r}` in Python use `repr(x)` in TypeScript. The existing
`malformed list item: ...` message in `src/parser/choices.ts` switches from
`JSON.stringify` to `repr` too.

## Reference

* `mdq-py/mdq/_parser/_question.py`: `parse_fill_in_body`, `_add_blank`,
  `BLANK_RE`, `BLANK_KIND_RE`, `UNIT_RE`, `_matches_tag` (the `blank` tag)
  and the `blank` branch of the tag dispatch in `parse_question`.
* `mdq-py/mdq/_parser/_frontmatter.py`: the fill-in keys (`shuffle`,
  `grading`, `diacritics`).
* `mdq-py/tests/test_parser.py`: `test_parses_minimal_fill_in`,
  `test_numeric_blank_infers_domain_like_a_numeric_question`,
  `test_numeric_unit_with_slash_does_not_break_fill_in_blank_syntax`.
* `docs/question-types/fill-in.md`.

## Runtime differences to watch

* `repr`: Python picks single quotes unless the text has `'` and no `"`.
  It escapes `\\`, the chosen quote, `\n`, `\r`, `\t`, and every character
  that `str.isprintable` rejects (Unicode categories Cc, Cf, Cs, Co, Cn, Zl,
  Zp, and Zs other than the space) as `\xNN` (below U+0100), `\uNNNN` or
  `\UNNNNNNNN`. `é` and emoji stay as they are.
* `rest` is `strip()`ped with `strip` from `parser/text`, not `trim()`.

## Acceptance criteria

Batch 1:

1. Every `examples/valid/fill-in/*.mdq.md` parses to exactly its `.yaml`.
   The `fill-in.` entry of `PARSE` in `tests/not-ported.ts` is removed.
2. Each definition form gives the Python blank: a choice list after `[^id]:`
   (ids, score, feedback, comment); `[^id/numeric]` and
   `[^id/numeric(unit)]` (domain inference, a `/` inside the unit);
   `[^id/short-answer]` (`/re/` without flags to `regex`, anything else to
   `oneOf`); `[^id/short-answer/accept|reject]` lists. Definitions of one
   slug merge into one blank, in the order the slug is first seen.
3. Frontmatter `shuffle`, `grading` and `diacritics` are copied as Python
   does.

Batch 2:

4. Each error path raises `ParseError` with the Python message: an unknown
   kind suffix (including a unit on `short-answer` and a variant on
   `numeric`), `[^id]:` with neither text nor a list, an accept/reject
   definition with inline text or without a list, one slug defined as two
   kinds, a repeated numeric or choice blank, and a repeated field of a
   short-answer blank.
5. `repr` matches Python's `repr()` of a string, and `malformed list item`
   uses it.
