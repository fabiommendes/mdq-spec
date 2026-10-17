---
type: note
status: active
tags: [mdq, audit, examples]
relatedTo: [docs/question-types, examples]
---

# Audit findings: multiple-choice, multiple-selection, true-false, grading

Scope: `examples/valid/{multiple-choice,multiple-selection,true-false}/` and `examples/grading/`. Paths are relative to `/home/chips/git/codehood/mdq`. "impl" is the mdq-py reference implementation, checked with `mdq.load` on probe documents.

### Example mismatches

`ID | severity | example file(s) | spec reference | what is wrong | expected vs actual`

- CH-M1 | high | `examples/grading/multiple-choice.yaml:68-74` ("Single write choice", partial) | `docs/question-types/multiple-choice.md:174-176` ("The grading strategy is ignored if the marked choice defines a score, and the question is graded according to that score") | Choice `c` declares `0.5`, but the expected score for picking `c` is `0.0`. The next case (`:76-82`) gives `b: 0.5` for the same situation, so the file contradicts itself. | expected `"c": 0.5`, actual `"c": 0.0`.
- CH-M2 | high | `examples/grading/multiple-choice.yaml:94-100` ("Single write choice", all-or-nothing) | `multiple-choice.md:174-179` | Same error as CH-M1 under `all-or-nothing`. | expected `"c": 0.5`, actual `"c": 0.0`.
- CH-M3 | medium | `examples/grading/multiple-choice.yaml:104`, `:112` | `multiple-choice.md:179` | The last two cases are under the comment "All-or-nothing grading" but declare `grading: "partial"`. They are exact copies of `:76-91`. `all-or-nothing` has only one case, the wrong one (CH-M2). | expected `grading: "all-or-nothing"`, actual `"partial"`.
- CH-M4 | medium | `examples/grading/true-false.yaml:22`, `:32`, `:42` | header of the same file, `:11` (`examples: { marks: ... }`) | The first example of each question uses the key `mark`; the second uses `marks`. A reader of `marks` gets no markings for the first example and computes 0.0. The scores themselves agree with `true-false.md:178-202`. | expected key `marks`, actual `mark`.
- CH-M5 | medium | `examples/grading/*.yaml` (all 3) | -- | No file in `mdq-py/tests`, `mdq-py/mdq`, `mdq-js/src`, `mdq-js/tests`, `scripts/` or `.github/` references `examples/grading/`. CH-M1 to CH-M4 are not detected for this reason. | expected: a test consumes the tables; actual: unused fixtures.
- CH-M6 | medium | `examples/valid/multiple-choice/fenced-code-choice.{mdq.md,yaml,lint.json}` | `multiple-choice.md:37` (`item : ws? "[" value "]" md_inline+ nl extra_lines? ...`), `:51` ("`md_inline` represent any markdown inline element") | The YAML expects `text` to be a fenced code block. The MC grammar allows only inline content in a choice. In CommonMark, `* [*] ```python` does not open a fence, because the backticks do not start the item content; the source is a paragraph with a 3-backtick code span. The YAML states `NOT_YET_SUPPORTED`. | expected by spec: inline code span text, or a parse error; actual YAML: multi-line fenced block. Impl returns the collapsed inline form.
- CH-M7 | medium | all MC `.yaml` from markdown: `simple`, `composite-ids`, `ellipsis-stem`, `feedback`, `grading`, `partial-credit`, `fenced-code-choice` | `multiple-choice.md:102-103` ("an omitted value is 0") vs `:174-184` ("Unspecified scores are computed...") | `[ ]` choices have `score: 0`. This agrees with line 103, but it makes the score "specified", so `symmetric` (the default) never applies to a question written in markdown. `no-correct-answer-a.yaml` (`madrid`) and `examples/grading/multiple-choice.yaml` (`null`) use the other convention. See CH-S1. | if `[ ]` means "unspecified": expected no `score` key; actual `score: 0`.
- CH-M8 | low | `examples/valid/multiple-selection/none-correct.yaml:1-4` (comment) | `multiple-choice.md:96-98` ("A question MAY mark any number of choices as correct"), rule `:218` (info only) | The comment says multiple-choice "needs exactly one" correct choice. `multiple-choice/no-correct-answer-{a,b}.yaml` are valid. The comment also says an all-blank body "infers as multiple-selection"; no spec text defines this (CH-S4). | comment contradicts spec.
- CH-M9 | low | `examples/valid/multiple-choice/many-correct-choices.yaml:1-2` (comment) | `multiple-choice.md:96-100` | The comment says "use multiple-selection instead". The spec allows many correct choices. | comment contradicts spec.
- CH-M10 | low | `examples/valid/multiple-choice/composite-ids.{mdq.md,yaml}` | `multiple-choice.md:110-112` | The file name promises ids, but no choice has one (lint reports 5 `missing-choice-id`). The example repeats `simple`. | expected: choices with `[choice-id]`, including composite slugs; actual: none.
- CH-M11 | low | `examples/invalid/multiple-choice-score-out-of-range.yaml:2` | -- | The comment cites `docs/adr/0001-score-scale-and-exam-level-clamping.md`. `docs/adr/` does not exist. | dangling reference.
- CH-M12 | low | MS `.yaml` (`simple`, `grading`, `bullet-list-preamble`, `none-correct`) vs all TF `.yaml` | `schema/multiple-selection.yaml:72-78`, `schema/true-false.yaml:76-81` (both `default: false`) | A false choice omits `correct` in multiple-selection and writes `correct: false` in true-false. The spec does not say which is canonical (CH-S5). | inconsistent corpus convention.

No wrong value found in ids, types, `grading`, `shuffle`, `locale`, `marker`, `correct`, percent scores, feedback text, or the preamble/stem split. Every `.lint.json` diagnostic in the slice has a rule in `docs/lint-codes.md` with the right severity and a sensible path. I found no missing diagnostic, except the ambiguity in CH-S9.

### Coverage gaps

`ID | spec reference | rule or case with no example | suggested example`

Syntax, valid:

- CH-G1 | `multiple-choice.md:60-64`, `:110-112` | `[choice-id]` in markdown. No `.mdq.md` in the whole corpus uses it. | `valid/multiple-choice/choice-ids.mdq.md` with `* [*] [ipe-amarelo] Ipê-amarelo`. Same for MS and TF.
- CH-G2 | `multiple-choice.md:37`, `:47-48`, `:84-94` | Choice comment lines (`!`), multi-line comments, and both orders in the grammar (`feedback comments`, `comments feedback`). Only `short-answer/accept-reject` uses `!`. | `valid/multiple-choice/comments.mdq.md` with both orders.
- CH-G3 | `multiple-choice.md:44` (`extra_lines`) | Choice text that continues on the next line. | `* [*] first line` + indented `second line`.
- CH-G4 | `multiple-choice.md:39-42`, `multiple-selection.md:39-40`, `true-false.md:38` | `ws?` inside brackets: `[ * ]`, `[ 50% ]`, `[ x ]`, `[ T ]`, and a tab as blank value. | one example per type.
- CH-G5 | `multiple-choice.md:42` | Percent forms: `+` sign, decimal (`[33.5%]`), bounds `[100%]`, `[-100%]`, `[0%]`. | `valid/multiple-choice/percent-forms.mdq.md`.
- CH-G6 | `multiple-selection.md:40` | Uppercase `[X]`. | add one `[X]` to an MS example.
- CH-G7 | `true-false.md:79-80`, `:92-94` | CJK markers 对, 真, 错, 偽; `S`/`s` as TRUE outside `locale: id`; lowercase `v`. | `valid/true-false/cjk-markers.mdq.md`.
- CH-G8 | `base.md:196-199` | Epilogue after a choice list. None in the three directories. | `valid/multiple-selection/epilogue.mdq.md`.
- CH-G9 | `base.md:142-156` | Inline slug `[Q1]` before the stem of a choice question. Only essay has it. | `valid/true-false/inline-id.mdq.md`.
- CH-G10 | `base.md:65`, `multiple-choice.md:25` | `type` in the frontmatter that changes the inferred type: all-blank body with `type: multiple-choice`. Impl accepts it and reports `multiple-choice-no-correct-choice`. | `valid/multiple-choice/no-correct-answer.mdq.md`.
- CH-G11 | `multiple-selection.md:52-68`, `true-false.md:159-171` | Feedback and comment on MS and TF choices. | one `.mdq.md` per type.
- CH-G12 | `multiple-choice.md:26` | `shuffle` on multiple-choice. | add to an MC example.

Lint codes:

- CH-G13 | `lint-codes.md:15`, `multiple-choice.md:219` | `all-choices-correct` on multiple-choice. Impl reports it together with `multiple-choice-many-correct-choices`. | `valid/multiple-choice/all-correct.yaml`.
- CH-G14 | `lint-codes.md:17-18`, `:64` | `blank-choice-comment`, `blank-choice-feedback`, `visually-identical-choices` on MS and TF. Also the spec's own pair `foo bar` vs `` `foo bar` `` (`multiple-choice.md:72-82`). | at least one TF example.
- CH-G15 | `lint-codes.md:32`, `true-false.md:143-147` | `locale-mismatched-true-false-marker` for a locale other than `pt-BR`. | `locale: de` with `[T]`.
- CH-G16 | `lint-codes.md:27` | `false-friend-true-false-marker` with lowercase `s` and a region subtag (`id-ID`). Impl reports it for both. | extend `false-friend-marker.yaml`.
- CH-G17 | `lint-codes.md:55` | `unexpanded-stem-ellipsis` with U+2026 (`…`). | `valid/multiple-choice/ellipsis-stem-unicode.mdq.md`.
- CH-G18 | `lint-codes.md:42`, `true-false.md:61-63` | Non-BMP letter as marker: one code point, two UTF-16 units. It checks `maxLength: 1` in the JS port. | `marker: "𝐓"` (U+1D413).

Invalid documents:

- CH-G19 | `multiple-choice.md:39-42`, `multiple-selection.md:39-40`, `true-false.md:38` | No invalid `.mdq.md` exists for the three types. Lists with mixed markers have no example. Impl accepts them silently and changes the answer key: `[*]`+`[x]` parses as MC with the `[x]` choice at score 0; `[T]`+`[x]` parses as MS with the `[T]` choice `correct: false`; `[T]`+`[ ]` parses as TF with the `[ ]` statement `correct: true` and no marker. | `invalid/multiple-choice-mixed-markers.mdq.md`, `invalid/true-false-blank-marker.mdq.md`, each with `parse-error`.
- CH-G20 | `multiple-choice.md:39` (`value : ws`, at least one character), `base.md:189-190` | Empty brackets `[]`. Impl accepts `* [] A` as score 0. | `invalid/multiple-choice-empty-brackets.mdq.md`.
- CH-G21 | `multiple-choice.md:104-108` | `[150%]` and `[-150%]` in markdown. Only the YAML form exists. Impl reports `schema-error`. | `invalid/multiple-choice-score-out-of-range.mdq.md` + `.lint.json`.
- CH-G22 | `true-false.md:57-63` | Markers from the spec's own list: `✓`, `✗`, `×`, `○`, `〇`, and base letter + combining mark. Only `1` and `TRUE` exist. Impl reports `malformed-true-false-marker` for `✓` and for `E`+U+0301. | `invalid/true-false-symbol-marker.mdq.md`, `invalid/model-only/true-false-combining-mark-marker.yaml`.
- CH-G23 | `lint-codes.md:76-80`, `true-false.md:211-213` | `blank-choice-text`, `duplicate-choice-id`, `duplicate-choice-text` have one example each, none for true-false. `duplicate-choice-text` has no case where the texts differ only in whitespace. | `invalid/model-only/true-false-duplicate-choice-text.yaml` with `foo bar` / `foo  bar`.
- CH-G24 | `lint-codes.md:92` | `true-false-marker-disagrees-with-correct` with a PROVISIONAL or TRUE marker and `correct: false`. Only FALSE marker + `correct: true` exists. | `marker: N`, `correct: false`.
- CH-G25 | `schema/multiple-selection.yaml:21`, `schema/true-false.yaml:24` | `minItems: 2` for MS and TF. A choice id that breaks the schema pattern (`id: "são paulo"`). | two small YAML files.
- CH-G26 | `examples/invalid/model-only/*.yaml` | The expected error code of each model-only example is only in a YAML comment. No `.lint.json` pins it. | add a `.lint.json` to each file.
- CH-G27 | `base.md:129-131` | Forbidden elements next to a choice body: a second `[ ]` list in the preamble or epilogue, a paragraph that starts with `[`. | `invalid/multiple-choice-checkbox-list-in-preamble.mdq.md`.

Grading tables:

- CH-G28 | `multiple-choice.md:193-200` | Rows of the spec table with no case: `[1, 1, _, _]` (-0.5), `[1, 1, 1, _]` (-1.0), `[1, -1, _, _]` (0.0), `[1, -1, -1, _]` (raw +1, clamped to 0). The upper clamp is never exercised. | add 4 cases to `grading/multiple-choice.yaml`.
- CH-G29 | `multiple-selection.md:96-103` | Only "all correct" and "no ticks" exist. Missing: a wrong tick, a negative symmetric score (`[F, T, F, T]` = -1.0, `[F, T, _, _]` = -0.5). | copy the 6 rows of the spec table.
- CH-G30 | `true-false.md:195-202` | Only "all correct" and "all abstained" exist. Missing: abstention with credit (`[T, F, _, _]` = 0.5 in the three strategies), a wrong mark under `all-or-nothing`, negative symmetric. | copy the 6 rows of the spec table.
- CH-G31 | `responses.md:45-46`, `:189-207` | `null` response (skipped, score 0) versus `{}`; a response with an unknown choice id (`ResponseError`). | add to the tables or a new `grading/errors.yaml`.
- CH-G32 | `exam.md:263-282` | Penalty policies (`none`, `capped`, `full`) on negative question scores have no table. | `grading/exam-penalty.yaml`.

### Spec problems

`ID | severity | spec reference(s) | contradiction / ambiguity / omission`

- CH-S1 | high | `multiple-choice.md:102-103` vs `:174-184`; `schema/multiple-choice.yaml:78-79` | "an omitted value is 0" makes every `[ ]` choice a choice with a specified score. The Grading section applies `symmetric` only to "unspecified scores". Result: the default strategy has no effect on a question written in markdown. Impl confirms it: the parser always writes `score: 0` (`mdq-py/mdq/_parser/_question.py:525-528`), and scoring uses `unspecified_score()` only when `score is None` (`mdq-py/mdq/models/_choice.py:204`). The spec must say if `[ ]` is "0" or "unspecified", and how to write the other one.
- CH-S2 | high | `exam.md:275-278` | "Under the default `none`, a multiple-selection question's `symmetric` and `partial` grading strategies produce identical exam totals". False. `symmetric = 2 * partial - 1`, so they differ for every positive score: `[T, F, _, _]` is 0.75 partial and 0.5 symmetric (`multiple-selection.md:101`). The floor only makes them equal when symmetric is zero or negative.
- CH-S3 | medium | `multiple-choice.md:37-49` vs `:60-64` | The item grammar has no `[choice-id]`. Its position and the conflict with choice text that starts with a bracket (`* [ ] [Brasília](https://...)`, `* [ ] [ref][1]`) are not defined. Impl reads `[b] B` as id `b` and `[Brasília](...)` as text.
- CH-S4 | medium | `base.md:65`; nothing in the three type documents | Type inference has no rule. Not defined: all-blank body (MC or MS; the corpus assumes MS), lists that mix `*`, `x`, letters and percentages, a body that disagrees with a forced `type`. See CH-G19.
- CH-S5 | medium | `multiple-selection.md:47-50`, `base.md:230-234` | The MS document has no AST mapping: `correct` appears only in the rules table (`:124-125`). No document says if a default value (`correct: false`, `score: 0`, `weight: 1`) is written or omitted in the AST. The corpus does both (CH-M7, CH-M12).
- CH-S6 | medium | `multiple-choice.md:37` vs `multiple-selection.md:38`, `:49`, `true-false.md:37` | The MC item is `md_inline+ nl extra_lines? (feedback...)`. MS and TF items are `markdown+` ("any markdown element nested inside the item") with no feedback or comment rule, but the text says choices "follow the same structure" as MC. Block content in a choice (CH-M6) is allowed by one grammar and not by the other.
- CH-S7 | medium | `multiple-choice.md:66-82`, `:213`, `:217` vs `lint-codes.md:80` | The prose gives `foo bar` / `foo  bar` as the example of "visually equivalent" text, which implementations MAY reject (info rule). `duplicate-choice-text` is an error for texts equal "once whitespace is normalized outside code spans", so the same pair is an error. Impl reports the error. The border between the two codes needs one definition.
- CH-S8 | medium | `true-false.md:143-147`, `:215`; `references/true-false-spellings.md` | The expected markers for each locale are not defined. For non-Latin locales (`ru`, `hi`, `ar`, `bn`, `ur`) the native initial is a PROVISIONAL letter. The reference table gives words, not markers.
- CH-S9 | low | `true-false.md:154-157`, `:225-226`; `lint-codes.md:27`, `:32` | "a dedicated warning, not only the usual mismatch notice" does not say if `locale-mismatched-true-false-marker` is also reported. `false-friend-marker.lint.json` has only the dedicated code. "Escalated" is not true for severity: both codes are `warning`. The footnote says "An `S` marker meaning false", but `S` with `correct: false` is the error `true-false-marker-disagrees-with-correct`.
- CH-S10 | low | `true-false.md:135-138`, `schema/true-false.yaml:76-81` | `correct` is optional with default `false`. A choice with `marker: T` and no `correct` is then an error by `:210`. The prose does not say that `correct` is required or derived from `marker`.
- CH-S11 | low | `schema/true-false.yaml:87` | The description says "`answer` carries the meaning". The field is `correct`.
- CH-S12 | low (known, related) | `schema/multiple-choice.yaml:62` (also MS, TF) vs `base.md:158-166`, `multiple-choice.md:110-112` | The schema rejects a choice id that is not a `SLUG`. The prose says SHOULD and lets implementations accept more characters; the question `id` has no pattern and gets the warning `unsafe-id`. Known item: "`unsafe-id` covers the question id but not choice ids".
- CH-S13 | low (known) | `lint-codes.md:39-40` | `multiple-choice-no-correct-choice` vs `no-correct-choice`: two naming schemes for one rule.
- CH-S14 | low | `base.md:103-104`, `:275` vs `lint-codes.md:55` | The base spec defines the ellipsis stem as `...` only. The lint code also accepts `…` (U+2026).
- CH-S15 | low | `base.md:274`, `lint-codes.md:31` | "SHOULD NOT look like a country code" is not decidable as written: `id`, `pt`, `es`, `fr`, `de` are language codes and country codes. `false-friend-marker.yaml` (`locale: id`) depends on this.
- CH-S16 | low | `base.md:69`, `:224-226` vs `schema/question-base.yaml:89-94` | Frontmatter `tags` is "string[] or string" and fields are "translated as-is" to the AST. The schema accepts only an array. The spec does not say that the parser splits the string form.
- CH-S17 | low | `multiple-choice.md:26`, `schema/multiple-choice.yaml:34-38` | The schema gives three states for `shuffle` (true, false, omitted). The prose gives only "True if choices can be shuffled" and no default.
- CH-S18 | low | `multiple-choice.md:180-184` | `symmetric` is not defined when no choice is unspecified, or when every choice is unspecified.

Examples checked in full: 29 (13 multiple-choice, 5 multiple-selection, 11 true-false), plus the 3 grading files (18 cases, all scores recomputed).