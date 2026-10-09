---
type: handoff
status: completed
tags: [mdq, mdq-js, exam, include, includeAll, query, banks]
relatedTo: [mdq-js/docs/handoffs/10-banks.md, mdq-js/docs/sync/roadmap.md]
---

# Cycle F4.1 — `resolveExam`, `DictLoader`, `parseQuery`

## Goal

Fill the stubs of `src/query.ts` and `src/banks.ts` that `10-banks.md`
designed, and check the resolution against the corpus
(`examples/valid/exam/*.resolved.yaml`, `mdq-py/tests/test_exam_resolution_corpus.py`).

## What changed

* `src/query.ts`: tokenizer built from `UNICODE_SPACE`, recursive-descent
  parser, and the `{ids, negated}` set algebra of `models/_query.py`, so
  `index.ids()` runs only when the whole logic part is a complement.
* `src/banks.ts`: `DictLoader` with a lazy tag index, `selectRandom`
  (partial Fisher-Yates, order kept), `resolveExam` as a line-by-line port of
  `Exam.resolve`. One addition to the design of `10-banks.md`:
  `ResolveOptions.warnings` receives the `empty-include-all` diagnostic,
  since `Diagnostic` exists now. Candidates sort by code point, as Python's
  `sorted` does.
* `src/errors.ts`: `IncludeNotFoundError` message.
* `src/index.ts` exports `query.ts`.
* Tests: `tests/query.spec.ts`, `tests/banks.spec.ts` (ports of
  `mdq-py/tests/test_include_all.py`), `tests/exam-resolution.spec.ts`
  (corpus; a `DictLoader` over `examples/valid/exam/**/*.mdq.md` stands in
  for Python's `FileLoader`; the expected id of a question without one is
  `q<position>`, the part of `with_ids` the fixtures need). `RESOLVE` in
  `tests/not-ported.ts` is the manifest, empty.

## Known differences from Python

* A bad `select` raises `RangeError`, not `ValueError`.
* `QuerySyntaxError` quotes the query with single quotes always; Python's
  `repr` switches to double quotes when the text has a single quote.
* `DictLoader.load` uses `Object.hasOwn`, so `constructor` is not found
  unless the mapping declares it.

## Next

F5 (`load()`, `withIds`, model rules as refinements), then F6 and F7, as
`docs/sync/roadmap.md` lists.
