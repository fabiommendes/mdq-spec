---
type: guide
status: active
tags: [audit]
relatedTo: [spec-audit-log]
---

# Rules for each spec audit cycle

You work in /home/chips/git/codehood/mdq (MDQ spec repo). Read AGENTS.md first
and follow it (English in all files, no em-dashes, prefix shell commands with
`rtk`, never commit, never touch mdq-js/ or mdq-py/ source).

`scripts/spec_audit.py` audits the spec in 7 steps. Run it with
`uv run scripts/spec_audit.py` (it runs every step). Read its docstring
and code to understand each check. We fix its failures one question type per
cycle. Each cycle is a fresh agent. The shared log is
`dev/audit/spec-audit-log.md`: read it before starting, and append a short
section for your cycle at the end: what you changed, decisions taken, open
questions for the human.

- Each `## Additional Rules` table has the columns `Field | Level | Code | Rule`
  (Code after Level). Fill Code for every row:
  - A rule that the JSON Schema enforces (marked "(schema)") gets
    `schema-error`.
  - Otherwise use the code the implementation reports. Find it in
    `docs/lint-codes.md`, in the corpus `.lint.json` files (examples/valid,
    examples/invalid), or in mdq-py (`grep -rn` in mdq-py/mdq, read only).
    Write codes plain (no backticks), kebab-case.
  - One code per row. Split a row if it covers two codes.
  - If no code exists for a rule, propose one in kebab-case, use it, and list
    it in the log as "proposed code".
- Codes declared in `question-base.md` apply to every type: do not repeat them
  in the type table.
- If a code appears in the corpus or in lint-codes.md for your type but no
  table row declares it, add a row (field, level, code, short rule in the
  existing style). Levels: `critical` (= error), `warning`, `info`.
- If lint-codes.md misses a code your table declares, or does not list your
  type in its "Question types" column, fix lint-codes.md (keep alphabetical
  order and the column style).
- Severity conflicts (spec level vs corpus severity vs lint-codes.md):
  do NOT resolve them silently. Keep the spec level and record the conflict in
  the log as an open question.
- Do not edit `.lint.json`, `.yaml` or `.mdq.md` corpus files. Do not edit the
  schema.
- Keep the existing table alignment style (padded columns).
- A pre-existing row about a grammar rule that the parser reports as
  `parse-error` uses `parse-error` as its code. Do not add new rows for
  `parse-error` corpus cases.
- Edit files with targeted edits (Edit tool). Never rewrite a whole file with
  a script.
- Your cycle is done when the audit messages about your scope are gone, or
  each remaining one is in the log as an open question. Other types may still
  fail: ignore them.
- Final reply: max 15 lines: changes, proposed codes, open questions.
