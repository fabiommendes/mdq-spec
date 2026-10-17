---
type: spec
status: draft
tags: [mdq, ids, slugify, addressable, models, loading]
relatedTo: [unique-ids, loading-module, GLOSSARY.md, docs/exam.md]
---

# Derived ids move from the parser to the models

Python only (`mdq-py/`) plus the shared corpus and docs. Do NOT touch
`mdq-js/`. Do this after `unique-ids.md` is merged.

## Problem

- The markdown parser derives ids that the author did not write:
  - choice ids from the choice text (`_assign_choice_ids`, `_slugify` in
    `mdq/parser.py`);
  - implicit question ids `q1`, `q2`, ... in exams (about `parser.py:2148`).
- A document loaded from YAML/JSON data never gets these ids. The same
  document has different ids depending on its source format.
- The parser's `_slugify` does not disambiguate: `Brasília`/`Brasilia` and
  `São Paulo!`/`São Paulo?` get the same id. `mdq/slugify.py` has a strategy
  that does (`loose`), but nothing uses it.

## Rules

### The parser keeps only explicit ids

- The parser no longer derives choice ids or implicit question ids. A choice
  or question without an explicit id has `id` absent (`None`) in the parsed
  document.
- Remove `_assign_choice_ids`' derivation, `_slugify`, `_slugify_choice_text`
  and `_fold_ascii` if nothing else uses them. If other code uses them (e.g.
  the exam slug), keep them and say so in the report.

### `with_ids()`

- Every question model and `Exam` get `with_ids(self) -> Self`.
- It returns a new model. It never changes `self`.
- The result is **addressable** (see `GLOSSARY.md`): every question and every
  choice has an id. The docstring explains that in plain words; do not rely
  on the glossary term alone, because external users do not know it.
- Explicit ids are never changed.
- Choice ids: the choices without an id get one from `mdq.slugify.loose`
  over their texts, with `forbid` = the explicit choice ids of the same
  question. The same applies to the choices of a fill-in choice blank.
- Single-glyph choices: the parser names them today with its
  `SYMBOL_NAMES`/`DIGIT_NAMES` tables (`-` -> `hyphen`, `4` -> `four`; see
  `examples/valid/multiple-selection/all-correct.yaml` and
  `none-correct.yaml`). `loose` has no such table, so it would give `item`,
  `item-2`. Move the tables into `mdq/slugify.py` as the first slug candidate
  for a single-glyph text, so these ids stay the same.
- Exam: each inline question without an id gets `q<position>`, where the
  position counts every block, includes too (`docs/exam.md` § Question ids).
  Then `with_ids()` runs on every question.
- `with_ids()` cannot fail. All collisions are model validation errors,
  detected at load time:
  - duplicate explicit ids (`unique-ids.md`);
  - derived choice ids cannot collide, because of `loose` and `forbid`;
  - a declared question id equal to the implicit id of another block (e.g.
    block 1 declares `id: q2`, and block 2 has no id). The `Exam` validator
    computes the implicit ids from positions, without filling them, and
    reports `duplicate-question-id` at `("questions", <index of the block
    without id>)`.
- `with_ids()` is idempotent: `d.with_ids().with_ids() == d.with_ids()`.

### `load` and `parse`

- New keyword: `ids: Literal["fill", "keep"] = "keep"`.
  - `keep`: the document as written.
  - `fill`: `Loaded.document` is `document.with_ids()`.
- Lint runs on the document as written, in both modes.
- The same keyword on `parse`, and the same overloads on `kind`.

### Callers

- `mdq show` and `mdq export`: `ids="fill"`.
- `mdq validate`: `ids="keep"` (the default).
- Grading and scoring: out of scope. Record in `BACKLOG.md` that grading
  entry points must require an addressable document and raise
  `MissingIdError` otherwise.

## Corpus

- The `.yaml` siblings of `.mdq.md` examples lose the ids the parser derived
  before. Remove only the derived ones; keep ids that the `.mdq.md` writes
  explicitly.
- The md/yaml pair tests compare `load(md)` and `load(yaml)` with the
  default `ids="keep"`, and also compare the two after `with_ids()`.
- Before editing the siblings, list every file and every id removed in the
  report.

## Docs

- `docs/exam.md` § Question ids: say that implicit ids are assigned when a
  consumer needs an addressable exam (e.g. for grading), and that the parsed
  document keeps them absent.
- `docs/question-types/multiple-choice.md` (and the other choice types, if
  they repeat the text): say that derived choice ids are not part of the
  parsed document.
- `GLOSSARY.md` § Addressable: add that `with_ids()` makes a document
  addressable.
- `BACKLOG.md`: add "mdq-js: move id derivation from the parser to the
  models, as in mdq-py".

## Tests

- Parser: a choice or question without an explicit id has `id is None` after
  `load(...)`.
- `with_ids()`:
  - `Brasília`/`Brasilia` and `São Paulo!`/`São Paulo?` get different ids;
  - a derived id never takes an explicit id of the same question;
  - the ids do not depend on choice order (reordering the choices gives
    each text the same id);
  - an exam assigns `q<position>` counting includes;
  - it does not change the original model;
  - it is idempotent;
  - it gives the same result for the markdown and the YAML form of a
    document.
- `load(..., ids="fill")` returns an addressable document; `ids="keep"`
  returns the ids as written.
- Exam validator: block 1 `id: q2` and block 2 without id is an error at
  `("questions", 1)`, from both markdown and YAML sources.
- Move the parser-disambiguation tests out of `tests/test_unique_ids.py`,
  rewritten for `with_ids()`.

## Done means

- The same document, from markdown or YAML, gives the same model, with and
  without `with_ids()`.
- `with_ids()` never derives two equal ids.
- `uv run pytest` (except the known `test_hypothesis` failure) and
  `uv run mypy mdq` pass.
