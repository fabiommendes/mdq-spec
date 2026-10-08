---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, whitespace, dialect, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, docs/references/grammar.md]
---

# Cycle F3.6 — Grammar whitespace is spaces and tabs

## Goal

Port the grammar whitespace change of the spec (root `cb677ec`) and mdq-py
(`ac13b51`). The common reference is `docs/references/grammar.md`: read it
first. It defines the regex dialect, the terminals (`ws`, `nl`,
`UNICODE_SPACE`, `UNIT`, `SLUG`, ...) and the strip rule.

Out of scope:

* The `non-ascii-whitespace` lint (`mdq-py/mdq/_parser/_spaces.py`): F5/F6.
* The exam query `_TOKEN_RE` (`models/_query.py`): F4.2, see
  `10-banks.md`.
* Everything that mdq-py deliberately left with `\s` or a plain `strip()`
  (answer normalization, duplicate-text lint, `\S` patterns, lint
  heuristics, `_normalize_tags`, the fence info string).

## Rules to port

* `ws` is `[ \t]`. Every other Unicode space is text where the grammar has
  `ws`. `nl` is `\r\n|\r|\n`; `splitLines` in `src/parser/tree.ts` already
  matches.
* A leading U+FEFF is removed before parsing (`_split_frontmatter`). A U+FEFF
  anywhere else is text.
* Every trim of a grammar token, and every blank-line check in the parser,
  trims `" \t"` only. Where Python calls `strip(" \t")`, TypeScript calls
  `strip(text, " \t")`: give `strip` in `src/parser/text.ts` an optional
  `chars` argument, as Python's `str.strip(chars)`. Without `chars` it keeps
  its current behavior (Python's default whitespace), for the places that
  mdq-py left unchanged. Same for `rstrip`.
* markdown-it trims paragraph and heading content with the host language
  trim, and JavaScript `trim` removes U+FEFF and U+00A0. `MDQParser.raw_text`
  puts the trimmed Unicode spaces back (`_restore_trimmed`, `inline_source`).
  Port that, so `" [short-answer]: X"` with a leading U+00A0 is text, not a
  tag.
* Tag brackets have no inner spaces: `[ short-answer ]:` and
  `[short-answer / accept]:` are not tags (`base.md`).
* Patterns that changed, each to `[ \t]` or `UNICODE_SPACE` exactly as in
  mdq-py: `SLUG_PREFIX_RE`, `CHOICE_ID_PREFIX_RE`, `ITEM_MARKER_RE`,
  `PLAIN_ITEM_RE`, the list-item start in `_split_list_items`,
  `SHORT_ANSWER_RE`, `NUMERIC_TAG_RE`, `BLANK_RE`, `BRACKET_ITEM_RE`,
  `UNIT_RE`, `NUM_VALUE_RE`, `TOL_TERM_RE`, and the exam patterns of
  `src/parser/exam.ts`. Replace the `SPACE` class of `text.ts` with the
  grammar classes, or keep it only where mdq-py kept Python whitespace.
* A short-answer pattern is a regex if it starts with `/` after
  `strip(" \t\r\n")` (`models/_text.py`); check where mdq-js decides this.
* Schema: the unit pattern is `[^()\[\]UNICODE_SPACE]+`
  (`src/schema/common.ts`, `UNIT_PATTERN`). `src/mdq.schema.json` is already
  regenerated.

## Reference

* `docs/references/grammar.md`, `docs/question-types/base.md`.
* `mdq-py/mdq/_markdown.py` (`split_lines`), `mdq-py/mdq/_parser/`
  (`_question.py` `raw_text`, `_restore_trimmed`, `inline_source`;
  `_frontmatter.py` `_split_frontmatter`; `_choices.py`; `_numeric.py`;
  `_exam.py`), `mdq-py/mdq/models/_text.py`, `_numeric.py`.
* `git show ac13b51` and `git show cb677ec` from the repo root.
* Tests: `mdq-py/tests/test_whitespace.py` (skip the lint part).

## Acceptance criteria

Batch 1:

1. `strip`/`rstrip` accept `chars`; every grammar trim and blank-line check
   in `src/parser/` uses `" \t"`, and the leading BOM is removed.
2. Every pattern listed above follows mdq-py; a Unicode space where the
   grammar has `ws` makes the line text, as in Python.

Batch 2:

3. `rawText` restores the Unicode spaces that markdown-it trimmed, and tags
   with inner spaces are not tags.
4. The unit pattern of the schema follows `schema/`, and every
   `test_whitespace.py` parser case gives the Python result.
