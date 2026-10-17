---
type: guide
status: active
tags: [audit, corpus, examples]
relatedTo: [spec-audit-log, spec-audit-cycle-rules]
---

# Rules for each corpus example cycle

You work in /home/chips/git/codehood/mdq (MDQ spec repo). Read AGENTS.md first
and follow it (English in all files, no em-dashes, prefix shell commands with
`rtk`, never commit, never touch mdq-js/ or mdq-py/ source, never add MOP
frontmatter to `examples/`).

## Goal

Every row of the `## Additional Rules` table of your document has at least one
corpus example that exercises it:

- `warning`/`info` row: an example in `examples/valid/<type>/` whose
  `.lint.json` reports the code of the row.
- `critical` row: an example in `examples/invalid/` (file prefix `<type>-`)
  whose `.lint.json` reports the code of the row as `error`. Use
  `examples/invalid/model-only/` when the JSON Schema accepts the document and
  only the model rejects it, and `examples/invalid/syntax/` only for
  non-documents.
- `schema-error` and `parse-error` rows need an example too.

## Method

1. Read the table, the rest of the spec document, and the existing examples of
   your type. For each row, find an existing example that exercises it (read
   the `.lint.json` files). Do not duplicate an existing example.
2. For each uncovered row, write a minimal example that breaks only that rule.
   Follow the corpus conventions (read `mdq-py/tests/_corpus.py` and a few
   neighbours):
   - Valid example: `<name>.mdq.md` + `<name>.yaml` + `<name>.lint.json`.
     Use only `.yaml` + `.lint.json` when Markdown cannot express the case.
   - Invalid example: `<type>-<name>.mdq.md` or `<type>-<name>.yaml`, plus
     `<type>-<name>.lint.json`.
   - A clean document pins `[]`. Each lint entry has `code`, `severity`,
     `path`.
   - Content: Brazil core themes (Brazilian culture, history, geography) or
     established science. No religion, politics or football.
3. The expected `.yaml` and `.lint.json` come from the spec, not from the
   implementation. You may run `cd mdq-py && uv run mdq show <file>` and
   `uv run mdq validate <file>` to compare. When mdq-py disagrees with the
   spec, keep the example spec-correct and record the disagreement in the log.
4. Run `uv run scripts/spec_audit.py` from the root, and
   `cd mdq-py && uv run pytest -q -x tests/test_example_pairs.py tests/test_lint_corpus.py tests/test_invalid_sources.py`
   for the corpus tests. A failure caused by an mdq-py bug goes to the log; a
   failure caused by a wrong example must be fixed.
5. Do not edit the spec documents, the schema or existing examples. If a row
   cannot have an example (for example, the implementation path that would
   report it cannot be reached), record why in the log.
6. Create files with the Write tool, one file per call. Never rewrite existing
   files with a script.

## Log

The shared log is `dev/audit/spec-audit-log.md`. Read it before starting.
Append a short section `## Examples cycle N: <type>` at the end with:

- examples added (file stem and the row it covers),
- rows left without an example, and why,
- mdq-py disagreements (test name and short reason),
- open questions.

Final reply: max 15 lines, same content.
