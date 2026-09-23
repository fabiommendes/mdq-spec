---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, ttdd]
relatedTo: [mdq-js/docs/sync/README.md, mdq-js/docs/sync/testing.md]
---

# Cycle 1 — Question parser: skeleton + bracket-list bodies

## Goal

Port the shared question-document skeleton and the three bracket-list body
types from `mdq-py/mdq/parser.py`. Tag-based bodies (essay, numeric,
short-answer, ordering, fill-in) and exam parsing are later cycles.

In scope:

* Frontmatter split, YAML load, leading `#`-comment capture.
* Title from frontmatter; optional inline `[slug]` prefix on the first intro
  paragraph sets `id`. Preamble / stem / epilogue segmentation.
* `bullet_list` bodies: `multiple-choice`, `multiple-selection`, `true-false`.
* Choice ids, scores, `correct`, `marker`, per-choice `>` feedback.
* Type inference from bracket markers; frontmatter `type` wins.
* `isExam`.

Out of scope: the five tag-based body types, exams, includes, the linter.

## Public API

Already stubbed. Do not change these signatures without orchestrator approval.

```ts
// src/errors.ts
class MdqError extends Error {}
class ParseError extends MdqError {}
class MissingFieldError extends ParseError { readonly field: string }

// src/parser/index.ts
type RawDocument = Record<string, unknown>;
function parseQuestionDocument(source: string): RawDocument;  // unvalidated
function parseQuestion(source: string): Question;             // parsed + validated
function isExam(source: string): boolean;
```

`parseQuestionDocument` returns exactly what the corpus `.yaml` files hold.
`parseQuestion` runs it through `validateQuestion` and throws on failure.

## Reference

`mdq-py/mdq/parser.py` is authoritative. The relevant path is
`MDQParser.parse_question` (line ~1288) and what it calls:
`apply_common_frontmatter`, `find_body_start`, `split_intro`,
`parse_item_list`, `_infer_choice_type`, `parse_choice_body`,
`_assign_choice_ids`, `_score_from_value`, `parse_marker`.

Behaviour questions are settled by reading the Python, then by
`docs/question-types/*.md`.

## Known risk — no tree API in markdown-it JS

Python uses `markdown_it.tree.SyntaxTreeNode`; the JS `markdown-it` exposes a
flat token stream only. Build the tree adapter in `src/parser/tree.ts` as its
own seam: a `Node` with `type`, `map`, `children`, and the raw-line lookup the
parser needs. Keep it dumb and separately testable — it is the one piece with
no Python counterpart to copy.

## Architecture

```
src/parser/
  index.ts      public entry points, the parse_question driver
  tree.ts       markdown-it token stream -> Node tree
  frontmatter.ts  split, YAML load, comment extraction
  choices.ts    bracket markers, type inference, ids, scores
```

The parser is pure: string in, new object out. No I/O, no module-level
mutable state, no injected collaborators needed — testability comes from
purity, not from seams.

## Testing strategy

1. **Corpus pairs — primary, table-driven.** Every
   `examples/valid/{multiple-choice,multiple-selection,true-false}/*.mdq.md`
   must `parseQuestionDocument` to deep-equal its `.yaml` sibling. 14 pairs.
   Drive them off `tests/corpus.ts`, which already locates them; do not copy
   examples into `mdq-js/`.
2. **Properties — fast-check.** Write a generator that *builds* MDQ source
   for a bracket-list question (title, optional id, optional frontmatter,
   preamble paragraphs, stem, N choices with markers and optional feedback)
   alongside the document it must parse into, and assert the parse equals it.
   This is the highest-value test here: it explores the skeleton far past
   what 14 examples reach. Invariants worth asserting separately:
   * `choices.length` equals the number of bracket items written.
   * the stem is the last intro paragraph; everything before it is preamble.
   * output always satisfies `validateQuestion`.
3. **Edge cases — focused, one assertion each.** No stem; empty source;
   frontmatter only; a bracket list whose markers are uninferable (falls back
   to `multiple-selection`); a body that is neither a bullet list nor a known
   tag (`MissingFieldError` with `field === "body"`); frontmatter `type`
   overriding what the markers imply.

Do not re-cover corpus-covered ground with hand-written examples.

## Acceptance criteria

* 13 of the 14 in-scope corpus pairs parse to exactly their `.yaml`.
  `multiple-choice/fenced-code-choice` is a known expected-failure, listed in
  `mdq-py/tests/test_parser.py::NOT_YET_SUPPORTED`; mark it as such rather
  than making it pass.
* Every parse result satisfies `validateQuestion`.
* Errors are the typed ones above, and `MissingFieldError.field` names the
  field.

## Corrections issued mid-cycle

Three claims in the first draft of this handoff were wrong; the reference
implementation overrules them:

1. **There is no H2 question title.** A question's title comes from
   frontmatter, and an inline `[slug]` prefix on the first intro paragraph
   sets its `id`. The `## [id] Title` syntax appears only in the stale
   `mdq-js/README.md`, which predates the current spec.
2. **Uninferable bracket markers are not an error.** `_infer_choice_type`
   (`parser.py:1653`) ends in `return "multiple-selection"`, so it never
   fails to infer. `IncompleteQuestionError` was specified for a branch that
   is dead in the reference; the class is removed.
3. **An unrecognized body raises `MissingFieldError("body")`**, which is what
   `find_body_start` (`parser.py:637`) does. `UnknownBodyError` is removed.
* `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all green.
* No example files copied into `mdq-js/`; the corpus stays shared.
