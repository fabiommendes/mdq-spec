---
type: note
status: active
tags: [mdq, audit, examples]
relatedTo: [docs/question-types, examples]
---

# Audit: short-answer and fill-in examples

Scope: `examples/valid/short-answer/` (19 examples), `examples/valid/fill-in/`
(10 examples). Paths are relative to the repo root. `SA` =
`docs/question-types/short-answer.md`, `FI` = `docs/question-types/fill-in.md`.

Notes on method:

- mdq-py reproduces every `.yaml` and every pinned `.lint.json` of the slice
  with no difference. All mismatches below are example/implementation vs spec
  prose, not example vs implementation.
- No pinned `.lint.json` in the slice has a wrong or missing diagnostic
  according to `docs/lint-codes.md`. Severities and paths are correct.
- "impl:" marks behavior of mdq-py observed with throwaway documents in
  `/tmp/mdqa`. Nothing in the repo was changed.

### Example mismatches

`ID | severity | example file(s) | spec reference | what is wrong | expected vs actual`

- TX-M1 | high | `short-answer/list.mdq.md`, `list.yaml` | SA:158-165, SA:212-213 | The source uses `[short-answer]:` followed by an unordered list. The prose has no such form: `short_answer` takes `content?` on one line, and SA:212-213 says "without it the tag is the `short_answer` rule above, which takes a single line of content rather than a list". Only `schema/short-answer.yaml:19-22` mentions "the unordered list written below it". | Expected from prose: `[short-answer]:` with no content is open-ended (SA:198), and the list is an epilogue block (`openEnded: true`, `epilogue: "* red\n* green\n* blue"`). Actual: `oneOf: [red, green, blue]`.
- TX-M2 | high | `short-answer/regex.mdq.md`, `regex.yaml` | SA:224-226, SA:261-263 | `[short-answer]: /1822-0?9-0?7/` becomes `regex: 1822-0?9-0?7`. The prose never defines a `regex` field or this conversion. SA:224-226: the block "is interpreted as if its content were the only pattern of the `[short-answer/accept]` block". SA:261: "The `/` delimiters are REQUIRED". | Expected: `accept: ["/1822-0?9-0?7/"]` (or at least the delimited string). Actual: `regex` with delimiters removed. impl: the conversion happens only when the pattern has no flags. `[short-answer]: /abc/i` gives `oneOf: ["/abc/i"]`.
- TX-M3 | medium | `short-answer/ignored-regex-flag.yaml` vs `redundant-regex-anchor.yaml`, `regex-shadows-answers.yaml`, `regex.yaml` (also `invalid/model-only/short-answer-invalid-regex.yaml`) | SA:261-263, `schema/short-answer.yaml:29-36` | The corpus writes the `regex` field in two incompatible notations: delimited with flags (`/Bras[íi]lia/m`, `/[AM/`) and bare (`^18(2[0-9])`, `18[0-9]{2}`, `1822-0?9-0?7`). No spec text says which one is valid, or how a bare regex that starts and ends with `/` is read. | Expected: one notation. Actual: both, and the two lint examples depend on different ones.
- TX-M4 | medium | `short-answer/simple`, `exact`, `pre-validation`, `indented-code-preamble`, `ordered-list-preamble`, `thematic-break-epilogue`; `fill-in/blockquote-preamble`, `diacritics-keep`, `epilogue-nested-list`, `mixed-blanks`, `numeric-unit` (all `.yaml`) | SA:224-226, FI:194-197, SA:68-75 | A bare `[short-answer]: X` / `[^id/short-answer]: X` is stored as `oneOf: [X]`. The prose says it is the only item of the accept list, and `oneOf` is not a documented field (it appears only in the rules table SA:382-384 and in the schema). | Expected from prose: `accept: [X]`. Actual: `oneOf: [X]`. Known in part (`dev/issues/lint-spec-open-decisions.md`, "Codes with a weak spec basis").
- TX-M5 | medium | `fill-in/grading.yaml` (also the impl for every decimal blank) | `docs/question-types/numeric.md:24`, `numeric.md:112-128` | `[^width/numeric]: 2.7 +- 0.3` gives `decimalPlaces: 1`. No spec text derives `decimalPlaces` from the body. It is a frontmatter field only, and a fill-in blank has no frontmatter. `domain` is "inferred" (numeric.md:112), but no text says the inferred value is written to the AST. | Expected: no `decimalPlaces`; `domain` unclear. Actual: `decimalPlaces: 1`, `domain: decimal`. All numeric blanks of the slice carry a derived `domain`.
- TX-M6 | low | `fill-in/short-answer-patterns.mdq.md`, `.yaml` | FI:221-225 vs FI:170-172, FI:203-216 | The example has `feedback` on short answer blank patterns. FI:221-225 says "only choice blanks can carry it ... Numeric and short answer blanks have no feedback syntax". The same document gives the feedback syntax at FI:170 and uses it at FI:209-215. | The example follows FI:170. It contradicts FI:221-225. See TX-S3.
- TX-M7 | low | `short-answer/open-ended.mdq.md` | SA:68-75, SA:198-199 | The frontmatter sets `openEnded: true`, a key that is not in the frontmatter table. The body alone (`[short-answer]:`) already makes the question open-ended, so the example does not test the inference. | Expected source: no `openEnded` key. impl: the body alone gives `openEnded: true`. Known in part (`lint-spec-open-decisions.md`).
- TX-M8 | low | `short-answer/accept-reject.yaml` | SA:77-78 vs `schema/short-answer.yaml:125-138` | The pattern object has a `comment` key. SA:77-78 defines the object as `{ "pattern": string, "feedback": string }` only. The schema allows `comment`. | The example follows the schema. The prose is incomplete. See TX-S6.

### Coverage gaps

`ID | spec reference | rule or case with no example | suggested example`

Short answer, pattern forms:

- TX-G1 | SA:220-226 | `[short-answer]` combined with `[short-answer/accept]` or `[short-answer/reject]`. impl: gives `oneOf` plus `accept`/`reject` side by side; the merge order is not defined. | valid: `[short-answer]: Brasília` + reject block with wildcard.
- TX-G2 | SA:310-317 | Regex flags `f` and `b`, alone and combined, and an author anchor under `f` (`/^abc/f`). Only `i`, `n` and `m` appear in the corpus. | valid: accept list with `/cerrado/f`, `/Bras/b`, `/^rio/fi`.
- TX-G3 | SA:319-323, SA:387 | Ignored flags `g`, `s`, `u`, `v`, `y`, `d`. Only `m` is tested, and only in the `regex` field. No example has `ignored-regex-flag` on an `accept`/`reject` entry. | yaml + lint: `accept: ["/a/g"]`, path `["accept", 0]`.
- TX-G4 | SA:386, SA:397-398 | `redundant-regex-anchor` for a trailing `$`, for an `accept`/`reject` entry, and the cases that must NOT report (`/^a/f`, `/a$/b`). Only a leading `^` in `regex` is tested. | yaml + lint with `/^a/`, `/a$/`, `/^a/f`, `/a$/b`, `/^a/b`; only entries 0, 1 and 4 reported.
- TX-G5 | SA:243-250, SA:385 | Wildcard in an accept block from a markdown source. `accept-wildcard.yaml` has no `.mdq.md`. Also `[short-answer]: *`. impl: gives `oneOf: ["*"]` with no `accept-wildcard` warning. | valid md + lint for both.
- TX-G6 | SA:252-253 | Literal asterisk answer `/\*/`. | valid: reject item `/\*/`.
- TX-G7 | SA:174-177 | Content that opens with a backtick but is not a complete span (`` `a` b ``, `` `x ``). The spec says it "MUST be a complete backtick-enclosed span". impl: accepts both as plain strings. | invalid: `short-answer-partial-backtick.mdq.md`.
- TX-G8 | SA:231-233 | Pattern that starts with `/` and is not closed (`/abc`), in a body list, in `[short-answer]:` and in the frontmatter. impl: `invalid-regex` in `accept`, but `[short-answer]: /abc` is accepted as `oneOf: ["/abc"]`. | invalid example for each position.
- TX-G9 | SA:255 | Empty pattern line in a body list. Only the yaml form exists (`invalid/short-answer-empty-pattern.yaml`). | invalid md.
- TX-G10 | SA:217-218 | Feedback and comment lines: multi-line feedback, comment before feedback, and the forbidden interleaved order (`>`, `!`, `>`). impl: accepts the interleaved order and joins the feedback. | valid: multi-line; invalid: interleaved.
- TX-G11 | SA:179-196 | Exact literal with interior whitespace, or whitespace just inside the backticks (`` ` y ` ``): trim rule. | valid: `` [short-answer]: `math . isnan` ``.
- TX-G12 | SA:278-294, SA:379-380 | Regex subset: named group, class intersection, lookbehind, `\p{..}` are invalid; lookahead, `\uXXXX`, `\xNN`, non-capturing group are valid. Only one invalid case exists (unbalanced class, in the `regex` field). No invalid regex in `accept`, `reject`, `preAccept`, `preReject`. | one invalid yaml per construct, one valid example with lookahead and `\u`.

Short answer, frontmatter and conflicts:

- TX-G13 | SA:71-72, SA:93-99, SA:381; `docs/lint-codes.md:106` | `accept`/`reject` in the frontmatter of a markdown source (only `preAccept`/`preReject` are tested that way), and the conflict with a body block (`conflicting-accept`). No invalid example has this code. | valid: frontmatter `accept` + body `reject`; invalid: frontmatter `accept` + `[short-answer/accept]`.
- TX-G14 | SA:93-99 | Frontmatter `accept` together with a bare `[short-answer]: X`. The rule says "same list" only for the accept block, but SA:224 makes the bare block an accept list. impl: accepts, gives `accept` + `oneOf`. | decide, then add valid or invalid example.
- TX-G15 | SA:108 | `[short-answer/preAccept]` body block does not exist. impl: generic `parse-error` "A required field is missing". | invalid md.
- TX-G16 | SA:201, SA:220-221, SA:382 | Repeated `[short-answer]`, repeated `[short-answer/accept]`, repeated `[short-answer/reject]`. | three invalid md files.
- TX-G17 | SA:136-141 | `diacritics: keep` with a regex, an exact literal and `preAccept` in the same question (the field must not affect the first two). `diacritics: fold` written explicitly. | valid: extend `diacritics-keep`.
- TX-G18 | SA:347-356 | Grading cases: reject block without a final wildcard (partially automated), reject-only question. impl: reject-only reports `short-answer-not-gradable`. | valid: accept + reject without wildcard.
- TX-G19 | `base.md:142-156`, `base.md:169-182` | Slug `[Q1]` before the stem, its collision with frontmatter `id`, and whitespace in tags (`[short-answer /accept]`, `[ Q1 ]`, `  [short-answer] :  x`). None in the slice. | valid: slug and indented tag; literal-text or invalid: tag with inner whitespace.
- TX-G20 | `docs/references/grammar.md:37-39`, `:91-129` | `non-ascii-whitespace`: no example in the whole corpus has this code. The U+00A0 after `[short-answer]:` case is given in the spec text. | valid md + lint: tag line with U+00A0 (warning), prose with U+00A0 (info).
- TX-G21 | `base.md:103-104`, `base.md:275` | Stem `...` in a short answer question (`unexpanded-stem-ellipsis`). For fill-in an ellipsis stem cannot hold a blank; behavior not defined. | valid short-answer + lint.

Fill-in:

- TX-G22 | FI:197-199 | Open-ended short answer blank (`[^a/short-answer]:` with no pattern). impl: gives `oneOf: [""]`, which breaks `patternString` (`\S`) in the schema, and loads with no diagnostic. See TX-S1. | valid md + yaml after the representation is decided.
- TX-G23 | FI:185-186 | Regex blank in the bare form (`[^a/short-answer]: /ab+/i`), and regex items in blank accept/reject lists. | valid.
- TX-G24 | FI:108-110 | Definitions in an order different from the stem references, and accept/reject of one blank separated by another blank. The comment of `mixed-blanks.yaml` claims this case, but its definitions are in stem order. | valid: reorder `mixed-blanks`.
- TX-G25 | FI:29, FI:33 | `shuffle` in a fill-in question; `grading: all-or-nothing` and `grading: symmetric` written explicitly. Only `partial` is tested. | valid.
- TX-G26 | FI:123, `multiple-choice.md:37-48` | Choice blank with percentage values, negative percentage, choice id, feedback and comment. All choice blanks of the slice use only `[ ]` and `[*]`. | valid: `* [50%] [cid] x` + `> fb` + `! cm`.
- TX-G27 | FI:125 | Blank line between `[^a]:` and the choice list ("no blank lines in between"). impl: accepts it. | invalid md.
- TX-G28 | `base.md:130-131`, `dev/issues/blank-placement.md` | Stem that starts with a blank, as the first paragraph and after a preamble (the `[^` exception). | valid: `[^capital] is the capital of Brazil.` with a preamble.
- TX-G29 | FI:56-64, FI:306, `lint-codes.md:90` | `misplaced-blank` from markdown, and each inline container: emphasis, link text, image alt text, code span. Only a strong span is tested, yaml only. Block-level cases (blockquote, table cell, list item, heading, fenced code in the preamble or epilogue) have no example; the spec allows "reject or leave as written". impl: leaves them as text. | invalid yaml per container; valid md with `[^x]` in fenced code.
- TX-G30 | FI:194-195, FI:307 | Two bare definitions, two accept lists or two reject lists for one blank; one slug defined with two kinds; one slug defined twice with the same kind (markdown form of `duplicate-blank-id`). | invalid md files.
- TX-G31 | FI:103-106 | `[^planet/short-answer(km)]` and an unknown kind (`[^a/essay]`) in markdown. Only the yaml form of the unit case exists. | invalid md.
- TX-G32 | FI:304-305 | `undefined-blank` and `unreferenced-blank` from a markdown source. Both exist only as yaml. | invalid md.
- TX-G33 | FI:45-46, `base.md:173-175` | Markers that are not blanks: `[^ a]` (whitespace) and `[^-x]` (not a `SLUG`). By the spec they are plain text. impl: reports `undefined-blank` for both. | valid md with both as literal text.
- TX-G34 | FI:295-299, `lint-codes.md` rows for fill-in | Lint codes on blanks with no example in the slice: `accept-wildcard`, `unreachable-reject`, `ignored-regex-flag`, `redundant-regex-anchor`, `shadowed-answers`, `short-answer-not-gradable`, `relative-tolerance-around-zero`, `relative-tolerance-over-one`, `ignored-decimal-places`, `domain-mismatch`, `answer-outside-domain`, `all-choices-correct`, `multiple-choice-many-correct-choices`, `multiple-choice-no-correct-choice`, `blank-choice-feedback`, `blank-choice-comment`, `visually-identical-choices`. Only `missing-choice-id` and `missing-tolerance` are pinned. impl reports the paths under `["blanks", i, ...]`. | one yaml + lint per code, or a few combined.
- TX-G35 | FI:141-143, `numeric.md:88-97` | Numeric blank with both tolerances, negative value, `2.50` (string), integer outside 32 bits. | valid.
- TX-G36 | - | Eleven examples of the slice have no `.lint.json`: `short-answer/accept-regex-flags`, `accept-reject`, `diacritics-keep`, `exact`, `exact-block`, `list`, `pre-validation`, `regex`; `fill-in/diacritics-keep`, `numeric-unit`, `numeric-unit-slash`. The expected list is empty for all of them. | add `[]` files to pin it.

### Spec problems

`ID | severity | spec reference(s) | contradiction / ambiguity / omission`

- TX-S1 | high | FI:197-199 vs `schema/fill-in.yaml:112-175`, `lint-codes.md:52` | An open-ended short answer blank has no AST form. `ShortAnswerBlank` has no `openEnded` property and `additionalProperties: false` (impl: `schema-error`). A blank with only `id` and `type` gets `short-answer-not-gradable`, a warning for a document the prose declares valid.
- TX-S2 | high | SA:68-75, SA:224-226, SA:377-388; `schema/short-answer.yaml:16-36`, `:71-76` | The document has no "markdown to AST" section. `oneOf`, `regex` and `openEnded` are in the rules table and the schema, but not in the frontmatter table or in any mapping rule. The prose gives only `accept`/`reject`. Precedence `regex` > `oneOf` (SA:384) and their relation to `accept` are not defined. Known (`lint-spec-open-decisions.md`), but it is the cause of TX-M1 to TX-M4.
- TX-S3 | high | FI:221-225 vs FI:170-172, FI:203-216 | Contradiction in the same document: short answer blanks "have no feedback syntax", but the grammar includes `>` feedback lines and the example uses them. FI:227-230 also does not say how pattern feedback enters the "flat list".
- TX-S4 | medium | SA:212-213 vs `schema/short-answer.yaml:19-22` | The schema describes a list form of `[short-answer]:`; the prose excludes it. See TX-M1.
- TX-S5 | medium | `lint-codes.md:106-107` vs SA:108, SA:114 | `conflicting-accept` is described for `preAccept`/`preReject` "declared both in the frontmatter and as a body block". Those two are frontmatter-only: no body block exists. Also, SA:93-99 and SA:392-394 let an implementation accept the document with the frontmatter winning, while the code is a load error.
- TX-S6 | medium | SA:77-78 vs `schema/short-answer.yaml:125-138` | The pattern object in the prose has `pattern` and `feedback`. The schema adds `comment`, and the body syntax produces it (`!` lines).
- TX-S7 | medium | SA:304-323 | Unknown regex flags (for example `x`) and repeated flags are not specified. impl: `/a/x` is accepted with no diagnostic; `/a/ii` is `invalid-regex`.
- TX-S8 | medium | SA:85-87 vs SA:231-233 | The frontmatter table says "anything else" than `/.../` is a plain string. The body rule says a line that starts with `/` is a regex and must be closed. An unclosed `/abc` is a plain string by the first rule and an error by the second.
- TX-S9 | medium | SA:386-387, `lint-codes.md:30`, `:45` | `redundant-regex-anchor` and `ignored-regex-flag` cover `regex`, `accept`, `reject`. They do not cover `preAccept`, `preReject` or `oneOf`, which hold the same pattern strings. impl: `[short-answer]: /^abc$/m` (stored in `oneOf`) and `preAccept: ["/^a$/m", "*"]` report nothing. Same for `accept-wildcard` on `[short-answer]: *`.
- TX-S10 | medium | FI:45-46, FI:56-64, FI:304-306, `base.md:98-101` | The stem is one paragraph, so "headings, list items, table cells, blockquotes and fenced code blocks" in FI:59-61 can only be preamble or epilogue blocks. The spec does not say what a `[^id]` in a preamble or epilogue paragraph is. impl: literal text; a blank referenced only there is `unreferenced-blank`. A cloze text of two paragraphs is therefore impossible; say so or allow it. `lint-codes.md:90` lists only the inline cases. `dev/issues/blank-placement.md` still calls this open, but FI:54-80 decides most of it.
- TX-S11 | low | FI:45 | The same blank referenced twice in the stem is not addressed. impl: accepts. `invalid/model-only/fill-in-duplicate-blank-id.yaml` has such a stem.
- TX-S12 | low | SA:215-218 | Continuation lines of a pattern item are not specified. impl: joins a continuation line to the pattern (`a` + `multi` gives `a multi`). The short answer text has no grammar for `pattern_item`, although FI:170 refers to a "`pattern_item` rule".
- TX-S13 | low | `base.md:179-180` vs FI:92-95, `numeric.md:62` | base.md allows spaces around the colon of a tag. The fill-in and numeric grammars write `"]:"` / `"]" ":"` with no `ws?` before the colon. SA:158 and SA:209 have `ws? ":"`.
- TX-S14 | low | `schema/fill-in.yaml:161-171` | `ShortAnswerBlank` has `preAccept`/`preReject`. FI does not mention them, and no markdown syntax can write them for a blank.
- TX-S15 | low | `schema/fill-in.yaml:128-137` vs `schema/short-answer.yaml:16-27` | `oneOf` items are `patternString` in a blank and a plain `string` with `minLength: 1` in a question. A whitespace-only entry is valid in one and invalid in the other.
- TX-S16 | low | `schema/short-answer.yaml:85-96` | `openEnded: true` forbids `oneOf`, `regex`, `accept`, `reject` in the schema. The prose has no such rule. Known (`lint-spec-open-decisions.md`).
- TX-S17 | low | SA:347-356 vs SA:383 | A question with only a reject block is "partially automated" by the grading text, but the rules table and `short-answer-not-gradable` treat it as not gradable.
- TX-S18 | low | `numeric.md:24`, `numeric.md:112` | No rule says that `decimalPlaces` is derived from the digits written in the body, or that the inferred `domain` is stored. See TX-M5.

Examples checked in full: 29 (19 short-answer, 10 fill-in), plus 12 invalid examples read for coverage only.