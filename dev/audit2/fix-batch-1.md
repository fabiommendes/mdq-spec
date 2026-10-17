---
type: spec
status: active
tags: [mdq, audit2, spec, corpus]
relatedTo: [dev/audit2/themes.md, dev/audit2/report.html]
---

# Audit 2, batch 1: trivial fixes

Goal: make the spec (docs/, schema/, examples/) consistent. Each item below
is one sentence, one value, one comment or one rename. No design decision,
no behaviour change in mdq-py or mdq-js, unless an item says otherwise.

The finding ids refer to `dev/audit2/findings-*.md`. Read the finding before
fixing it; it has the file, the line and the suggested fix. When the
finding and this list disagree, this list wins.

Work in English. Do not add MOP frontmatter to anything under docs/,
schema/, examples/, mdq-py/, mdq-js/. Do not commit.

Checks before you finish:

```bash
uv run scripts/schema_bundle.py        # if any schema/*.yaml changed
cd mdq-py && rtk uv run pytest -q --deselect tests/test_ordering_parser.py::test_render_parse_is_a_fixed_point
cd mdq-js && rtk pnpm test && rtk pnpm typecheck && rtk pnpm lint
```

Every corpus example runs in both suites, so a rename or a changed `.lint.json`
shows up there. A renamed example may be listed in `mdq-js/tests/not-ported.ts`
or in `mdq-py/tests/_corpus.py`; update those lists.

Record user-visible changes under `[Unreleased]` in the changelog of each
repo that changed (root for docs/schema/examples, mdq-py, mdq-js).

## L1 Docs, text only

- E3: `docs/question-types/essay.md`, footnote `[^2]` is defined twice. Keep one.
- EXAM-S6: broken `#questions` anchors in `docs/exam.md`, `docs/question-types/base.md` (footnote [^9]) and `docs/lint-codes.md`. Point them at the section that exists.
- CHO-S11: frontmatter tables of multiple-choice, multiple-selection, true-false and fill-in list `shuffle` as `boolean`. Make it `boolean | "inherit"` like `grading`.
- TFE-S3: `docs/question-types/true-false.md`, the sentence about the `id` row of the locale table. Say that `id` gives `false-friend-true-false-marker` and never `locale-mismatched-true-false-marker`, because the `id` row has no mismatched form.
- ORDERING-S9: `docs/question-types/ordering.md`, the `## [extra]` heading rule uses `ws?`; the other section headings use `ws`. Use `ws`.
- CHO-S9: `docs/question-types/multiple-choice.md`, say that a `[150%]` marker makes the question malformed with `schema-error` (the score is out of range), not just "invalid".
- CHO-S10: `docs/question-types/multiple-choice.md`, Additional Rules table, add the row `choices[].score | info | more than one choice has a score of 1` (`multiple-choice-many-correct-choices`), matching lint-codes.md.
- TFE-S9: `docs/lint-codes.md`, `reserved-true-false-marker` says "`X` or `x`"; the reserved markers per the true-false doc. Make the two documents agree (follow true-false.md).
- EXAM-S17: `docs/lint-codes.md`, `empty-include-all` also fires when the query cannot be read (`docs/exam.md` says a bad query adds nothing). Add "or the query cannot be read".
- SA-S11: `docs/lint-codes.md`, `ignored-regex-flag`: one diagnostic per pattern, not per flag.
- EXAM-S14: `docs/lint-codes.md`, `forbidden-block-element` also applies to an exam's `instructions`. Add it to the list of fields.
- NUM-S5: `docs/question-types/numeric.md`, say that the parsed document carries the inferred `domain` (the field is written out, not only "inferred" at grading time).
- NUM-S7: `docs/question-types/numeric.md`, `numeric_body` grammar: trailing `ws?` so a line can end in spaces, like the other bodies.
- SA-S10: `docs/patterns.md`, the `ሴ` example renders wrong in Markdown. Escape it so the reader sees the backslash.
- SA-C6: `docs/patterns.md`, "MAY NOT be supported" → "are NOT supported (`invalid-regex`)".
- ORDERING-C1 / ORDERING-S1: `docs/question-types/ordering.md`, the observation grammar. Allow `nl*` between the feedback (`>`) block and the comment (`!`) block, in either order. Replace the sentence "once a `!` comment block has started..." with: once both blocks have appeared, a further `>` or `!` line is a `parse-error`. This is what the corpus and both parsers already do. Verify with `uv run lark-run` as `AGENTS.md` describes.

## L2 Schema, descriptions only

- SB-S1: `schema/ordering.yaml`, `uniqueItems: true` is set twice on `normalizations`. Delete the second.
- SB-S2: "seven question types" in `schema/question-base.yaml` (and the bundle). There are eight.
- S6 (findings-true-false-essay): `schema/true-false.yaml`, `marker` description says "PROVISIONAL" and mentions `answer`. Say WARNING (the lint severity) and `correct`.

Run `uv run scripts/schema_bundle.py` after.

## L3 Corpus, comments and names only

- CHO-C1, TFE-C5, FILLIN-C8, EXAM-C8, SB-C4, ORDERING-C3: comments in `examples/**` that cite `dev/specs/...`, `mdq.models._base`, `_split_exam_blocks`, `with_ids()`, `fill-in.md:301`, `true-false.md:210`, or sections that do not exist ("Scheduling", "Questions"). Cite the doc and section name instead (`docs/exam.md`, "Include all"). Grep for `dev/`, `mdq.models`, `_split`, `with_ids`, `\.md:[0-9]`, `Scheduling`, `"Questions"` across `examples/`.
- SA-C3, SA-C4, SA-C5, FILLIN-C7, SB-C4: wrong comments. `redundant-regex-anchor-cases` (the two rules are swapped), `literal-asterisk` ("wildcard"), `short-answer-invalid-regex` ("regex field"), `numeric-blank-forms` ("beyond 32 bits"), `nel-in-prose`, `question-tags-not-string`, `scheduled.yaml`. Read each finding for the right wording.
- EXAM-C9: rename `examples/invalid/exam-two-h1.*` to `exam-h1-in-question.*`.
- TFE-C5: rename `examples/valid/true-false/*-disagrees-provisional.*` to `*-disagrees-warning.*`.
- SA-C7: `examples/matching/*.yaml`, invisible characters (U+2028 and company) written raw. Write them as `" "` escapes in double-quoted YAML strings so the file is readable. The loaded value must not change: check with a small Python script that loads before and after and compares.

## L4 Corpus, small values

- NUM-C4, FILLIN-C9: an integer absolute tolerance written as `1.0` in three numeric and two fill-in `.yaml` files, while other files write `1`. First check what `mdq-py` produces for the `.mdq.md` source (`uv run mdq parse <file>` or the parser in Python). If it gives an int, write `1` in the yaml. If it gives a float, stop: report it and leave the files alone.
- TFE-C2: `examples/valid/true-false/true-false-symbol-marker.lint.json` lists one `foreign-choice-marker` but the source has two foreign markers. Check what mdq-py reports. If it reports two, add the second at path `["choices", 1]`. If it reports one, report it and leave the file alone.
- SA-C2: `examples/invalid/short-answer-empty-pattern.lint.json` and `partial-backtick.lint.json`, `schema-error` path ends in `["accept", 0, "pattern"]` for a bare string entry. Check the path the mdq-py validator reports. If it is `["accept", 0]`, fix the file. If not, report it and leave the file alone.

## Report

Return: the list of items done, the items you left alone and why, the
test results (counts), and anything in the findings that turned out to be
wrong.
