# Handoff: finish the MDQ spec review at `docs/question-types/fill-in.md`

## Context

A file-by-file review of the question-type specs, hunting contradictions,
inaccuracies, vague wording and English errors. Seven of the eight files are
done: `generic.md`, `essay.md`, `multiple-choice.md`, `multiple-selection.md`,
`true-false.md`, `numeric.md`, `short-answer.md`. **`fill-in.md` is the only
one not yet reviewed with the author.**

Working style that the author has settled into, and that you should keep:

- Report findings, let the author rule on each, then apply. They push back
  when they disagree and are usually right; on the one occasion they were
  not, showing the arithmetic row by row settled it.
- Apply English/typo fixes directly. Flag anything that changes semantics.
- Verify grammar snippets really parse. See "Tooling" below.
- Never claim an edit landed without re-reading the file. A `str.replace`
  that silently no-ops has already caused one false "done" report this
  session.

## The work: `fill-in.md` findings, in priority order

None of these have been shown to the author yet. Line numbers are current.

1. **§Short answer blanks (L81-90) describes something else entirely.** The
   rule is named `unit_def`, the tag is `"unit"`, the payload is a unit of
   measurement, and it declares no accepted answer at all. The real syntax is
   `[^planet/short-answer]: Jupiter` — see `examples/valid/fill-in/mixed-blanks.mdq.md`
   and `BLANK_RE` at `mdq/parser.py:133`. `schema/fill-in.yaml#/$defs/ShortAnswerBlank`
   already models it correctly (`oneOf`, `regex`, `accept`, `reject`), so the
   prose is the only broken artifact. This section has to be rewritten from
   scratch; the schema is the best source for what it should say.
2. **The whole Grading examples block (L108-123) is copy-pasted from
   `multiple-choice.md`.** It talks about "marking a choice with a score
   defined in the body" and an answer key of choice scores — none of which
   applies to blanks. It also contains a duplicated key with contradictory
   values: `[1, 1, _, _]` appears at L118 as `0.00 / 0.00 / -0.50` and again
   at L120 as `0.50 / 0.50 / -1.00`. Needs replacing with a blank-shaped
   example. The author likes the table format settled on in
   `multiple-selection.md#grading` (an "expands to" column and a
   "judged correctly" count) — reuse that shape if it fits.
3. **§Stem (L35-38) is an empty stub** and §Body (L40-51) contains the grammar
   that actually defines the stem, in a rule still named `item` (copied from
   multiple-choice). Merge or re-split them.
4. **`symmetric` claims range `[0, 1]` (L104) while subtracting points.**
   Same bug already fixed in `multiple-selection.md`; should be `[-1, 1]`.
5. **Broken anchor**: `multiple-choice.md` §Feedback links to
   `fill-in.md#feedback`, which does not exist. Either add a Feedback section
   or fix the link. Every other question type has one.
6. **`1_300_000` (L18) is not valid** per `numeric.md`'s `INTEGER` terminal
   (`/[1-9][0-9]*|0/` — no underscores). Either widen the numeric grammar or
   change the example.
7. **Factual**: Brasília has ~2.8-3.1M inhabitants, not 1.3M ±10% (L18).
   Per `CLAUDE.md`, examples lean "Brazil core", so keep the subject and fix
   the number.
8. **Grading prose says "ticked"** throughout (L97-105), which is
   multiple-choice vocabulary. Numeric and short-answer blanks have nothing to
   tick.

## Tooling

Grammar snippets must be valid Lark (`CLAUDE.md`). Two gotchas already hit:

- Lark rejects single-quoted literals. All snippets were converted to double
  quotes this session; keep it that way.
- A scratch harness that extracts every ```lark block, stubs undefined rules,
  and compiles them is at
  `/tmp/claude-1000/-home-chips-git-codehood-mdq-spec/e17b0aa1-ea7c-42d7-8057-2faa7190f9a5/scratchpad/blocks.py`.
  Recreate it if the temp dir is gone — it caught real errors.

Verify with `uv run pytest` and `uv run mypy mdq`.

**Known pre-existing test failure**, unrelated to any of this:
`tests/test_score_response_spec.py::test_multiple_choice_symmetric_default_backfills_unspecified_scores`.
Its own docstring says the implementation has no symmetric backfill. Do not
"fix" it as part of a fill-in change.

## Open work already written up elsewhere — do not re-derive

- `docs/dev/issues/blank-placement.md` — whether blanks may appear outside
  plain paragraphs (table cells, list items, blockquotes). Headings are
  settled: not allowed. **This overlaps item 3 above**; read it before
  touching §Stem.
- `docs/dev/issues/diacritics-field.md` — `diacritics: "fold" | "keep"` is
  specified but unimplemented. Note `ShortAnswerBlank` needs it too, so a
  fill-in change may touch the same lines.
- `docs/dev/issues/remove-exact-field.md` — done this session by a subagent
  and reviewed; kept for the rationale. `[short-answer/exact]` no longer
  exists; exactness is per-pattern via backticks. If you write a
  short-answer blank example, use the backtick notation.
- `docs/dev/issues/regex-corner-cases.md` — pre-existing, untouched.

## State of the tree

Nothing has been committed. The working tree was already dirty before this
session (the author has unrelated in-flight work across `mdq/`, `schema/`,
`tests/` and a `mdq/examples/` → `examples/` move), so **`git diff` does not
isolate this session's changes** and `git stash` will scramble mtimes if you
try to use them for attribution. Ask the author before committing.

## Suggested skills

- `mattpocock-skills:domain-modeling` — items 1 and 3 are terminology and
  document-model problems (what *is* a blank, what hosts a stem), which is
  what this skill is for.
- `mattpocock-skills:grilling` — useful for the §Short answer blanks rewrite
  and the blank-placement question, where the author has said the design
  "requires discussion" rather than a patch.

Do not reach for a code-review or TDD skill unless the work crosses from the
spec into `mdq/`; so far this has been a documentation task.
