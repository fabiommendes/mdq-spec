---
type: spec
status: active
tags: [mdq, audit, spec, examples]
relatedTo: []
---

# Brief: independent audit of the MDQ spec corpus (round 2)

## Scope and rules (read carefully)

You are auditing the **specification**, not an implementation. Your only
sources are:

- `docs/**` (the normative spec: `docs/exam.md`, `docs/question-types/*.md`,
  `docs/references/*.md`, `docs/lint-codes.md`, `docs/responses.md`),
- `examples/**` (the shared corpus),
- `schema/*.yaml` (normative JSON Schema; `schema/mdq.schema.json` is a bundle).

Do NOT open anything under `mdq-py/`, `mdq-js/`, `dev/` (except this file),
`.claude/`, `skills/`, `scripts/`, `GLOSSARY.md`, `BACKLOG.md`, `CHANGELOG.md`,
nor any file whose name contains `handoff` or `audit`. Do not run any
implementation (no `uv run`, no `pnpm`, no python imports of `mdq`). You may
use plain `python3 -c` / `jq` / `yq`-style scripts of your own to read YAML/JSON
files, count things, or check a regex, but never import the project code.
Do not edit anything outside your own findings file.

## Corpus conventions (from docs/question-types/base.md and the files themselves)

- `examples/valid/<type>/<name>.mdq.md` is a Markdown source; `<name>.yaml`
  next to it is the document a conforming parser MUST produce from it, and
  `<name>.lint.json` lists every diagnostic (`{code, severity, path}`) the
  spec requires for that document (`[]` when clean). A `.yaml` with no
  `.mdq.md` is a document written directly in YAML.
- `examples/invalid/<name>.mdq.md` (+ optional `.yaml` + `.lint.json`) must be
  rejected; its `.lint.json` holds the error(s), with codes from
  `docs/lint-codes.md` ("Errors" and "Load errors"), `schema-error` for a
  JSON-Schema violation, `parse-error` for a grammar violation.
  `examples/invalid/model-only/` holds documents the schema accepts but a
  spec rule rejects. `examples/invalid/syntax/` holds non-documents.
- `examples/grading/<type>.yaml` holds response/score pairs
  (`score: null` = pending, "malformed" = not gradable, see the header
  comment of each file). `examples/matching/*.yaml` holds pattern/response
  pairs for `docs/references/patterns.md`.
- `examples/valid/exam/` holds exams, a `bank/` of questions, and
  `<exam>.resolved.yaml` with the ids after `include` resolution.

## What to check, for your area

1. **Conformance**: for every example in your area, does the `.mdq.md` ->
   `.yaml` mapping follow the spec text and grammar? Does the `.yaml` satisfy
   the schema (read the YAML schema by eye; the bundle is not needed)? Does
   the `.lint.json` list exactly the diagnostics the spec demands, with the
   severity `docs/lint-codes.md` gives, and no diagnostic the spec does not
   demand? Are the paths plausible? For `invalid/`, is the document really
   invalid per the spec, and is the code the right one?
2. **Exhaustiveness**: list every field, every enum value, every grammar
   alternative, every "Additional Rules" row and every lint code of your
   area that no valid example exercises; every non-trivial way of making a
   document invalid (per the spec) that no `invalid/` example exercises;
   and, for grading, every strategy x response shape (right, wrong,
   partial, abstained, skipped `null`, malformed, pending/`score: null`)
   that `examples/grading/<type>.yaml` lacks. Say "none missing" when so.
3. **Spec defects you notice on the way**: contradictions, ambiguities, a
   rule with no code, a code with no rule, a schema constraint the prose
   does not state or contradicts. Only report what you can quote.

## Output

Write ONE file, `dev/audit2/findings-<area>.md`, in English, with this
frontmatter and sections:

```
---
type: issue
status: active
tags: [mdq, audit, spec, <area>]
relatedTo: [dev/audit2/brief.md]
---
# Findings: <area>

## Summary
<3-6 lines: examples checked (counts), how many conform, main gaps>

## Conformance findings
### <AREA>-C1 <short title> (severity: high|medium|low)
- Files: `examples/...`
- Spec: `docs/...` "<section>" -- quote the sentence(s)
- Problem: <what disagrees>
- Fix: <what should change: the example, the lint file, or the spec>

## Exhaustiveness gaps
### <AREA>-E1 <short title> (severity)
- Spec: ...
- Missing: <the case; propose a file name and a one-line content sketch>

## Spec defects
### <AREA>-S1 <short title> (severity)
- Spec: quote both sides
- Problem / Fix

## Checked and fine
<bullet list of the spec rules / lint codes you verified are covered, so the
reviewer can see what you looked at>
```

Severity: high = a conforming implementation would produce a different
document/score/diagnostic than the corpus pins, or the spec contradicts
itself on a normative rule; medium = ambiguity that two reasonable readers
resolve differently, or a missing example for a normative rule; low =
wording, redundancy, cosmetic.

Be precise and terse. Quote, do not paraphrase. Every finding must point at
a file and a spec sentence. Do not pad with praise.
