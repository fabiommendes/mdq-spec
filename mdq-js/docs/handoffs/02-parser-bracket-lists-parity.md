---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/01-parser-bracket-lists.md]
---

# Cycle F2 — Bracket-list parser equal to Python

## Goal

The parser from cycle 1 no longer matches the reference. Bring the
multiple-choice, multiple-selection and true-false parse back to exact
equality with `mdq-py/mdq/_parser/`, and make the frontmatter YAML load like
Python.

Out of scope: tag-based bodies, exams, warnings for unknown frontmatter keys
(these need the diagnostics channel of F5), the markdown-it preset (F3).

## Public API

No change to `parseQuestionDocument`, `parseQuestion`, `isExam`.
Internal seams that change:

```ts
// src/parser/choices.ts
// Only explicit `[id]` prefixes. Python stopped deriving ids in the parser
// (dev/specs/to-review/derived-ids.md); F5 ports `withIds`.
function assignChoiceIds(choices: readonly RawChoice[]): (string | undefined)[];

// src/parser/frontmatter.ts
// Same result as Python `_load_frontmatter_yaml` for every input.
function loadFrontmatterYaml(text: string): Record<string, unknown>;
```

## Reference

* `_assign_choice_ids` (`_parser/_choices.py`).
* `apply_common_frontmatter` (`_parser/_question.py`): `weight`.
* `apply_type_specific_frontmatter` (`_parser/_question.py`): `grading` and
  `shuffle` for every graded type.
* `_FrontmatterLoader` and `_load_frontmatter_yaml` (`_parser/_frontmatter.py`):
  YAML 1.1 `SafeLoader` without base-60 numbers.

## Acceptance criteria

Batch 1:

1. Every bracket-list pair in `examples/valid/` parses to exactly its `.yaml`,
   except `multiple-choice.fenced-code-choice`, which Python lists in
   `NOT_YET_SUPPORTED`.
2. A choice has an `id` only when the source declares one.
3. `grading`, `weight` and `shuffle` are copied from the frontmatter as Python
   does.

Batch 2:

4. `loadFrontmatterYaml` returns the same value as Python for YAML 1.1
   scalars: booleans (`yes`, `no`, `on`, `off`, any case), octal and
   hexadecimal integers, `1:30` (a string, not base 60), dates and timestamps,
   `null` forms, and floats such as `.inf` and `1e3`.
