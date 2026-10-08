---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, ordering, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/05-parser-short-answer.md]
---

# Cycle F3.4 — Ordering body

## Goal

Port the `[ordering]` body and its `## [extra]`, `## [accept]` and
`## [reject]` sections, so that every `examples/valid/ordering/*.mdq.md`
parses to exactly its `.yaml`.

Out of scope: the model rules (`examples/invalid/model-only/ordering-*`, F5),
the ordering lint codes (`.lint.json`, F6), scoring (F7), render.

## Public API

No change to `parseQuestionDocument`, `parseQuestion`, `isExam`. New module
`src/parser/ordering.ts` (stub exists), a port of `_ordering.py`:

```ts
type RawLine = readonly [indent: number, text: string];
type LeveledLine = [level: number, text: string];
interface RawAlternative { lines; feedback: string | undefined; comment: string | undefined }
interface OrderingAlternative { lines: LeveledLine[]; feedback?: string; comment?: string }
const ORDERING_SECTION_RE: RegExp;
function orderingCodeLines(content: string): RawLine[];
function orderingUlLines(rawLines: readonly string[]): RawLine[];
function orderingLineIndent(line: string): RawLine;
function orderingUnit(indents: readonly number[]): number;
function orderingLeveled(raw: readonly RawLine[], unit: number): LeveledLine[];
function orderingAlternative(alt: RawAlternative, unit: number): OrderingAlternative;
function joinPrefixedLines(lines: readonly string[], prefix: string): string;
function isCommentBlock(lines: readonly string[]): boolean;
```

The body parsing itself (`parse_ordering_body`, `parse_ordering_content`,
`parse_ordering_observations`) goes into private methods of the parser class
in `src/parser/index.ts`, next to `parseEssayBody`. Every failure is a plain
`ParseError` with the Python message.

## Reference

* `mdq-py/mdq/_parser/_ordering.py`: the whole module.
* `mdq-py/mdq/_parser/_question.py`: `parse_ordering_body`,
  `parse_ordering_content`, `parse_ordering_observations`, `_normalize_tags`
  and the `ordering` branch of the tag dispatch in `parse_question`.
* `mdq-py/tests/test_ordering_parser.py`: the focused rules and the error
  paths.
* `docs/question-types/ordering.md`.

## Runtime differences to watch

* Python `str.expandtabs(4)` moves a tab to the next multiple of 4 columns.
  It does not replace a tab with 4 spaces: `"  \tb"` has indent 4, not 6.
* The fence `content` and `info` in `src/parser/tree.ts` are `undefined`
  when empty (`token.content || undefined`). An empty fence has no lines.
* `ORDERING_ITEM_RE` is `^(?<indent>[ \t]*)[*+-][ \t]+(?<text>.*)$`, applied
  to one line at a time.

## Acceptance criteria

Batch 1:

1. Every `examples/valid/ordering/*.mdq.md` parses to exactly its `.yaml`.
   The `ordering.` entry of `PARSE` in `tests/not-ported.ts` is removed.
2. Indentation: a tab moves to the next tab stop of 4; the unit is the GCD
   of every positive indent of every block of the question (main, extra,
   accept, reject), or 4 if no line is indented; a blank code line has level
   0 and empty text; a `ul` line keeps its raw Markdown source.
3. Frontmatter: a declared `content` and `highlight` win over the body;
   `indentation` and `unmatched` are copied; `normalizations` as a bare
   string becomes a one-item list.

Batch 2:

4. Each error path of the reference raises `ParseError` with the Python
   message: no fence or list after `[ordering]` (also at the end of the
   document), a section with a different content kind than `[ordering]`
   (`[extra]`, `[accept]`, `[reject]`), two `## [extra]` sections, and a
   second feedback or comment block in an accept/reject section.
