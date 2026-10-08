---
type: handoff
status: active
tags: [mdq, mdq-js, parser, exam, schedule, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/08-parser-fill-in.md, mdq-js/docs/handoffs/10-banks.md]
---

# Cycle F4.1 — Exam documents

## Goal

Port the exam parser: the H1 title, the frontmatter (with `start` and
`duration`), the instructions, the `===`/`---` blocks, and one entry per
block, so that every `examples/valid/exam/*.mdq.md` parses to exactly its
`.yaml`. `include` and `include-all` blocks stay unresolved entries; cycle
F4.2 (`10-banks.md`) resolves them.

Out of scope: `unknown-frontmatter-key` and `separator-before-include`
warnings (F5, `load()` with diagnostics), unique question ids and
`unknown-include-field` (F5), lint (F6), render.

## Public API

New module `src/parser/exam.ts` (stub exists), a port of `_exam.py`:

```ts
const SEPARATOR = "===";
const INHERITED_FIELDS = ["locale", "author"] as const;
function parseExamDocument(source: string): RawDocument; // unvalidated
function parseExam(source: string): Exam;               // validated, like parseQuestion
```

`parser/index` re-exports all four. No change to `parseQuestionDocument`,
`parseQuestion`, `isExam`.

Other stubs:

* `src/schedule.ts` (port of `_schedule.py`): `canonicalStart(value)`,
  `canonicalDuration(value)` and the `YamlTimestamp` class. Each function
  is Python's `format_*(parse_*(value))`. Errors are `RangeError` with the
  Python `ValueError` message. Not exported from `src/index.ts` (private in
  Python too).
* `src/parser/frontmatter.ts`: `loadExamFrontmatterYaml(text)`. Same as
  `loadFrontmatterYaml`, except that the YAML `timestamp` type constructs a
  `YamlTimestamp` whose `isoformat` is the `isoformat()` of PyYAML's
  `construct_yaml_timestamp` result. Only the exam's own frontmatter uses it;
  question and block frontmatter keep `loadFrontmatterYaml`.
* `src/parser/text.ts`: `rstrip(text)`, Python's `str.rstrip()`.

### Refactor first (no behavior change)

`src/parser/exam.ts` needs `parseQuestionDocument` and `matchesTag`, and
`parser/index` re-exports `parser/exam`. To avoid an import cycle, and to
follow decision 6:

1. Move the question parser (everything in `parser/index.ts` except
   `isExam`, `codeLineIndices` and `H1_RE`) into `src/parser/question.ts`
   (`_question.py`). Export `matchesTag` from there. `BRACKET_ITEM_RE` is
   already in `parser/choices`.
2. Move `isExam`, `codeLineIndices` and `H1_RE` into `parser/exam.ts`, as in
   `_exam.py`. `H1_RE` gets the `rest` group of Python.
3. `parser/index.ts` becomes a barrel, like `_parser/__init__.py`, and
   keeps `RawDocument` or re-exports it. `tests/code-blocks.spec.ts`
   imports from `../src/parser/index.js` and must keep working.

The suite must stay green after this step alone.

## Reference

* `mdq-py/mdq/_parser/_exam.py`: the whole module (`parse_exam`,
  `_split_exam_blocks`, `_looks_like_frontmatter`, `_clean_block`,
  `_parse_exam_block`, `_inherit_from_exam`).
* `mdq-py/mdq/_schedule.py`: the whole module.
* PyYAML `SafeConstructor.construct_yaml_timestamp`
  (`mdq-py/.venv/lib/python3.*/site-packages/yaml/constructor.py`).
* Tests: `mdq-py/tests/test_exam.py` (recognition, worked example, block
  splitting, inheritance; not the `resolve`/`FileLoader` ones),
  `test_parser.py` (`test_exam_preamble_thematic_break_...`,
  `test_colon_bearing_preamble_line_...`,
  `test_exam_separator_immediately_followed_...`),
  `test_code_blocks_in_structure.py` (`test_exam_ignores_structure_lines_...`),
  `test_exam_schedule.py` (the `parse_exam` ones), `test_schedule.py`,
  `test_include_all.py::test_parser_keeps_include_all_as_written`.
* `docs/exam.md`: "The title", "Body", "Question and include blocks",
  "Inheritance", "Duration and Start Time".

## Runtime differences to watch

* Python `strip()`/`rstrip()` use `str.isspace`: use `strip`/`rstrip` from
  `parser/text`, never `trim`. `_parse_exam_block` uses `strip("\n")`
  (newlines only).
* `_looks_like_frontmatter` uses `yaml.safe_load`, where a duplicate key is
  not an error (the last value wins). js-yaml throws on it unless `json:
  true`. Any other YAML error means "not frontmatter".
* js-yaml builds a `Date` in UTC from a timestamp. PyYAML builds a `date`
  (no time part) or a `datetime` that keeps the offset: `2026-03-10
  09:00:00-03:00` is `2026-03-10T09:00:00-03:00`, `Z` is `+00:00`, `-3` is
  `-03:00`, the fraction is cut or padded to 6 digits, and a one-digit
  month or day (`2026-3-1`) is valid.
* `canonicalStart` of a string follows Python 3.13 `fromisoformat` after
  `strip`: `20260310`, `2026-W10-2`, `2026-03-10T09`, `2026-03-10 0900`,
  any one character as the date/time separator, `,` as the decimal mark,
  offsets `-03`, `+0530`, `+05:30:15.5`. Check a form with
  `cd mdq-py && uv run python -c "from mdq import _schedule as s; print(s.format_start(s.parse_start('...')))"`.
* `canonicalDuration`: compute in integers (days, seconds, microseconds),
  never in float seconds. A `number` is rejected (`got 90`).
* `id` from the frontmatter or an include value is `String(value)`, as the
  question parser does for `id`.
* New patterns use `SPACE` from `parser/text` where Python has `\s`, and
  the `u` flag.

## Acceptance criteria

Batch 1:

1. The refactor above is done and the suite passes unchanged. `isExam`
   behaves as before.
2. Title and frontmatter: the first H1 line outside a code block gives the
   title, with an optional `[slug]` prefix as `id`; the frontmatter wins for
   `id`, `title`, `uuid`, `course`, `description`, `author`, `locale`,
   `meta`, `penalty`, `grading` (a key that is present is copied, also when
   null); `tags` is normalized; `type` is `"exam"`. No H1 raises
   `MissingFieldError` with `field` `"title"`.
3. Blocks, with every rule of `_split_exam_blocks`: `===` needs a blank line
   (or the start) before it; a bare `---` opens a block when it is the first
   fence, when only blank lines separate it from the close of the previous
   fence, or when the current block showed a body tag or a bracket item; a
   `---` right after `===` is that block's own frontmatter; the closing
   `---` must enclose YAML that is a mapping or empty; after a body, a
   `---` that opens nothing raises
   `ParseError("line N: a question's epilogue cannot use '---' as a thematic break inside an exam; use '***' or '___'")`;
   code lines never count. `instructions` is the stripped text before the
   first block, absent when empty; with no block, all text is instructions
   and `questions` is `[]`.

Batch 2:

4. `canonicalDuration` gives the canonical form of the surface forms in
   `test_schedule.py` and rejects the same values, with the Python messages.
5. `canonicalStart` gives Python's result for dates, naive and aware
   date-times and `YamlTimestamp`, and rejects the values of
   `test_parse_start_rejects`. `loadExamFrontmatterYaml` builds a
   `YamlTimestamp` with PyYAML's `isoformat()` for each timestamp form.
6. `parseExamDocument` stores `start`/`duration` in canonical form and
   wraps an error as `ParseError("exam start: <message>")` or
   `ParseError("exam duration: <message>")`. An unquoted `1:30` duration is
   `PT1H30M`.

Batch 3:

7. Entries: a block whose frontmatter has `include-all` (checked first) or
   `include` is the frontmatter mapping with that key's value as a string,
   every other key kept; any other block is `parseQuestionDocument` of the
   block without its leading `===`, plus `locale` and `author` from the exam
   when the question has none.
8. Every `examples/valid/exam/*.mdq.md` parses to exactly its `.yaml`. The
   corpus test in `tests/parser.spec.ts` dispatches with `isExam`. The six
   `exam.*` entries of `PARSE` in `tests/not-ported.ts` are removed.
9. `parseExam` returns the validated exam, or raises `ParseError` as
   `parseQuestion` does. The F4 entry about code lines in
   `docs/sync/roadmap.md`, "Reference changes waiting for a phase", is
   removed.
