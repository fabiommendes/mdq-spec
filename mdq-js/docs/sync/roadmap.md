---
type: plan
status: active
tags: [mdq, mdq-js, port, sync]
relatedTo: [mdq-js/docs/sync/README.md, mdq-js/docs/sync/testing.md, dev/plan/mdq-js-paridade.md]
---

# Roadmap of the TypeScript port

The port follows mdq-py, which is the reference. This document lists the
phases of the port and the decisions that apply to all of them. The detailed
per-feature status is [`tests/not-ported.ts`](../../tests/not-ported.ts).

## Decisions

1. **One cycle per feature.** Each cycle has a handoff in `docs/handoffs/`
   with the public API, the acceptance criteria and the Python functions to
   port. The cycle is test-driven, and the corpus is the main test source.
2. **Corpus first.** Before an area is ported, the Python tests of that area
   that state facts about the format move into `examples/`. This can need new
   corpus kinds, for example sources that must fail to parse, with the
   expected error. See [testing.md](testing.md).
3. **Responses are plain JSON.** The response types follow
   [`docs/responses.md`](../../../docs/responses.md): JSON objects, arrays,
   strings and numbers. No `Set` or `Map`, so a response can be stored, sent
   and loaded from a fixture without conversion.
4. **Same dialect as Python.** Differences between the two runtimes must not
   change a result:
   * Every `RegExp` uses the `u` flag. `\w` and `\d` are ASCII in JavaScript
     and Unicode in Python, so a port of a Python pattern that relies on
     Unicode uses `\p{L}`, `\p{N}` and similar classes.
   * Python `$` also matches before a final `\n`; JavaScript `$` does not.
   * Frontmatter YAML follows the Python loader (YAML 1.1 without base-60
     integers), not the js-yaml default (YAML 1.2).
   * markdown-it uses the options of the Python `gfm-like` preset.
   * Text comparisons use the same normalization as Python (NFKC, case
     folding, accent removal). `toLowerCase` is not case folding.

   Each difference that a cycle finds gets an example in the corpus.
5. **Validation includes the model rules.** Python checks some rules in the
   Pydantic models (unique ids, regex that compiles, and so on). TypeScript
   has no model layer: these rules are functions in `src/models/<family>.ts`
   that return diagnostics, and `validateDocument` runs them after Zod. So
   `validateDocument` rejects `examples/invalid/model-only/`. See
   [schemas.md](schemas.md).

6. **Same modules as Python.** One TypeScript module per Python module,
   with the same name without the leading underscore. A module differs only
   for a good reason, which its header comment states. For example,
   `schema/` replaces the shapes of `mdq.models` and `mdq.types`, because
   Zod defines the types and the validation in one place. See
   [modules.md](modules.md).

7. **No Temporal yet.** Exam `start` and `duration` use strings: the exam
   frontmatter loader keeps the YAML timestamp text (`YamlTimestamp`, like
   PyYAML `isoformat()`), and `schedule` has one function per field that
   throws `RangeError`. Each function keeps an internal parse and format
   step, so Temporal can replace the internals later without an API change.
   Revisit when Node 26 is the CI minimum, Safari ships Temporal and the
   repository uses TypeScript 6. See
   `dev/research/temporal-for-exam-schedule.md` (local).

## Phases

| Phase | Scope | Status |
| ----- | ----- | ------ |
| F0 | Corpus layout, `not-ported.ts` manifest, docs | done |
| F1 | Zod schemas equal to the JSON Schema | done |
| F2 | Parser: bracket lists aligned with Python | done |
| F3 | Parser: essay, numeric, short-answer, ordering, fill-in bodies | done |
| F4 | Parser: exams, `include`, `includeAll` | done |
| F4.1 | `resolveExam`, the question bank and the `includeAll` query language | done |

The remaining work (model rules, `load`, lint, matching, scoring,
`normalize`, `withIds`) is planned in the root repository:
`dev/rfcs/0001-mdq-js-paridade.md` and `dev/plan/mdq-js-paridade.md`. The
plan also holds the list of mdq-py changes not ported yet. The SolidJS
components get their own plan after parity.

The CLI, format conversions (Moodle XML, GIFT, Aiken), `show`, `scaffold`,
`render()` and the file-system question bank stay in Python.

## Coordination with mdq-py

* The port targets a fixed mdq-py commit. Changes after it go to the list
  of pending changes in the port plan, never into a phase that is running.
* The module map is in [modules.md](modules.md). When mdq-py moves code
  between modules, update the map and move the TypeScript code to match.
* The Python test helpers (`mdq-py/tests/_corpus.py`,
  `mdq-py/scripts/lint_snapshot.py`, `mdq-py/tests/strategies/`) are not
  ported. TypeScript has its own helpers in `tests/`.
