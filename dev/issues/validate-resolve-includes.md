---
type: issue
status: backlog
tags: [mdq-py, cli, exam, includes, diagnostics]
relatedTo: [docs/exam.md, docs/lint-codes.md, mdq-py/mdq/cli/_validate.py, mdq-py/mdq/models/_exam.py]
---

# `mdq validate` does not check included questions

`load`/`parse` leave the `include` and `includeAll` blocks of an exam
unresolved; the host resolves them with `Exam.resolve(bank)`. This was a
deliberate change from the first design of the loading module, which had a
`loader=` parameter on `load`. Two consequences remain open:

* `mdq validate exam.mdq.md` runs `load` only, never `resolve`. An exam whose
  includes are missing, or whose included questions have model errors or lint
  warnings, exits 0.
* `Exam.resolve` reports problems as exceptions (`IncludeNotFound`, pydantic
  `ValidationError`), not as `Diagnostic`s. `Exam._load_included` calls the
  parser directly, so `parse-error` in an included file is also an exception.
  Paths are relative to the resolved exam, not to the included source.

Proposal, found in the review of `loading-module.md` (2026-11-03):

* Keep `load` free of a loader. Add to the CLI an opt-in `--resolve` (or
  resolve by default when the input is a file path, with `FileLoader` on its
  directory, as `mdq show` already does by hand).
* After resolving, lint the resolved exam and turn `IncludeNotFound`,
  `ParseError` and `ValidationError` of an included question into
  diagnostics with the path prefix `("questions", i)`.
* `mdq show` then stops building `FileLoader(src.parent)` itself.

Related: `dev/refactor/mdq-py-restructure.md`, item F2.
