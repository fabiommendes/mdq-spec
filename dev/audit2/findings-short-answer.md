---
type: issue
status: active
tags: [mdq, audit, spec, short-answer]
relatedTo: [dev/audit2/brief.md]
---
# Findings: short-answer

## Summary
Checked 34 valid examples (28 `.mdq.md` + 6 YAML-only), 23 `invalid/short-answer-*`, 6 `invalid/model-only/short-answer-*`, 13 grading questions (40 responses), 18 exact and 42 inexact matching cases.
31 of the 34 valid examples conform. The 3 that do not have wrong explanatory comments only. 21 of the 23 invalid examples conform. `short-answer-partial-backtick` pins `schema-error` where the grammar gives `parse-error`. Two paths are implausible.
Main gaps:
- Grading has no feedback selection, no `null` (skipped), no malformed response, no `f`/`b` flags, no lone `i` or `n` flag, and no top-level alternation.
- The spec does not say whether a regex matches the raw response or a normalized one. responses.md says every short answer is case folded before matching.
- `conflicting-accept` has a qualified form ("block with content") and an unqualified form. Only the qualified form is workable.
- The schema `patternString` uses `\s`. grammar.md forbids `\s` because it differs between implementations.

## Conformance findings

### SA-C1 Partial backtick content pinned as `schema-error`, grammar says `parse-error` (severity: high)
- Files: `examples/invalid/short-answer-partial-backtick.mdq.md`, `.lint.json`
- Spec: `docs/question-types/short-answer.md` "Body": `content : exact | inexact`, `exact : "`" EXACT_TEXT "`" ws?`, `PLAIN_TEXT : /[^` \t\r\n][^\r\n]*/`. "Content": "content that opens with one MUST be a complete backtick-enclosed span". Brief: "`parse-error` for a grammar violation".
- Problem: `` [short-answer]: `math.isnan` (x) `` has no derivation: `exact` leaves ` (x)` unread, and `PLAIN_TEXT` cannot start with a backtick. A parser that follows the grammar reports `parse-error`. The corpus pins `schema-error` at `[accept, 0, "pattern"]`. That assumes the parser builds `accept: ["`math.isnan` (x)"]` first. The sibling `short-answer-empty-pattern-line` (also a pattern line the grammar rejects) pins `parse-error`, so the corpus is not consistent with itself.
- Fix: Change the lint to `parse-error`, path `[]`. Or state in short-answer.md that pattern-line content is taken verbatim and only the schema checks it. In that case, also change `empty-pattern-line`.

### SA-C2 `schema-error` path ends in `"pattern"` for a bare-string entry (severity: medium)
- Files: `examples/invalid/short-answer-empty-pattern.lint.json`, `examples/invalid/short-answer-partial-backtick.lint.json`
- Spec: `schema/short-answer.yaml` `pattern: oneOf: [patternString, {object with pattern}]`. `docs/lint-codes.md` `schema-error`: "The diagnostic keeps the path and the validator's message."
- Problem: `accept: [""]` has a string entry, not an object. No `pattern` key exists. A JSON Schema validator reports the `oneOf` failure at `["accept", 0]`. Other pattern diagnostics (`invalid-regex`, `ignored-regex-flag` on object entries in `ignored-regex-flag-in-reject`) use `[list, i]`.
- Fix: Use `["accept", 0]` in both lint files.

### SA-C3 Wrong comment: anchors in `redundant-regex-anchor-cases.yaml` (severity: low)
- Files: `examples/valid/short-answer/redundant-regex-anchor-cases.yaml`
- Spec: short-answer.md [^9] "Without the `f` flag, a leading `^` is implicit. Without the `f` or `b` flag, a trailing `$` is implicit."
- Problem: The comment says "`^` without `f` or `b`, and `$` without `f`". That swaps the two rules. The next sentence of the comment and the pinned lints (entries 0, 1, 4) follow the spec.
- Fix: Change the comment to "`^` without `f`, and `$` without `f` or `b`".

### SA-C4 Wrong comment: `literal-asterisk.yaml` refers to a wildcard (severity: low)
- Files: `examples/valid/short-answer/literal-asterisk.yaml`
- Spec: patterns.md "Pattern string": "anything else | a plain literal, compared inexactly". The docs contain no wildcard.
- Problem: The comment says "a bare `*` would be the wildcard". A bare `*` is an inexact literal. The comment could make someone implement a wildcard.
- Fix: Change the comment to "a bare `*` cannot be a list item (`* *`); as content it is an inexact literal".

### SA-C5 Wrong comment: `short-answer-invalid-regex.yaml` refers to a `regex` field (severity: low)
- Files: `examples/invalid/model-only/short-answer-invalid-regex.yaml`
- Problem: The comment says "JSON Schema only checks that `regex` is a string". No field has that key. The pattern is an `accept` entry.
- Fix: Change `regex` to "the pattern".

### SA-C6 `\p{...}` pinned as `invalid-regex`, spec says only "MAY NOT be supported" (severity: medium)
- Files: `examples/invalid/model-only/short-answer-regex-unicode-property.yaml`
- Spec: patterns.md "Regex": "other more obscure escape sequences MAY NOT be supported, e.g., `\cA`, `\123`, `\p{...}`, `\P{...}`, `\k<name>`."
- Problem: "MAY NOT" is not an RFC 2119 keyword. It reads as "might be unsupported", not "is invalid". An implementation that supports `\p{L}` accepts the document. The other subset items use "are NOT supported" or "is an invalid MDQ regex".
- Fix: Change the sentence to "are NOT supported; a regex that uses them is invalid (`invalid-regex`)". Or remove the example.

### SA-C7 `matching/*.yaml` header says invisible characters are escaped, but they are raw (severity: low)
- Files: `examples/matching/inexact.yaml` (raw U+200B, U+00AD, U+FEFF, U+00A0, U+2003, U+2028, U+2011, U+2013, U+2019, U+2212), `examples/matching/exact.yaml` (raw U+00A0, U+2003, U+200B, ...)
- Spec: The headers of both files say "Invisible and ambiguous code points are written as YAML escapes."
- Problem: Only `\x1F`, `\x85` and `\0` are escaped. Raw U+2028 inside a double-quoted scalar is a line break in YAML 1.1, so a 1.1 loader folds it to a space. The "line separator" case then tests U+0020, not U+2028.
- Fix: Write those characters as `​`, ` ` and so on.

## Exhaustiveness gaps

### SA-E1 Grading has no feedback (severity: high)
- Spec: short-answer.md "Feedback": "the student must receive the feedback of the FIRST pattern that matches their response AND defines a feedback message", "The list that decided the outcome is the one consulted", `incorrectFeedback` fallback, "A response that is not settled shows no feedback". responses.md "Skipping": `null` "triggers no feedback".
- Missing: `examples/grading/short-answer.yaml` has no `feedback` column. Add `feedback: string | null` to each example and these questions:
  - accept `[A(no fb), /a/i(fb1)]`, response `a` -> fb1. The first match has no feedback, so the next match with feedback wins.
  - accept `[/x/f(fb1)]`, reject `[x(fb2)]`, response `x` -> 1, fb1. Accept wins over reject.
  - reject entry without feedback plus `incorrectFeedback` -> 0, incorrectFeedback.
  - unmatched under `incorrect` -> incorrectFeedback.
  - unmatched under `manual` -> pending, no feedback.
  - reject block written before the accept block -> the deciding list is still used.

### SA-E2 Grading has no skipped (`null`) and no malformed response (severity: medium)
- Spec: responses.md "Skipping": "A response of `null` means the question was skipped. It scores 0". "Errors": "a response the question cannot represent | `ResponseError`". "Short answer and essay": "The text the student wrote".
- Missing:
  - `response: null` -> 0 on an automatic question, and 0 (not pending) on a `manual` question. The second is worth pinning.
  - `response: 42` and `response: ["Brasília"]` -> `"malformed"`. Add `"malformed"` to the header type, as `numeric.yaml` does.

### SA-E3 Grading does not cover the `f`, `b`, ignored and isolated flags, or alternation (severity: medium)
- Spec: patterns.md "Regex flags" (`i`, `n`, `f`, `b`; "`s` (dotAll) is ignored ... `.` never matches a newline"; "under `f`, `/^abc/` still matches only at the start").
- Missing:
  - `/cerrado/f`: `o cerrado brasileiro` -> 1.
  - `/Bras/b`: `Brasília` -> 1, `o Brasil` -> 0.
  - `/^rio/f`: `rio negro` -> 1, `o rio` -> 0.
  - `/cerrado/n`: `cerrádo` -> 1, `Cerrado` -> 0.
  - `/cerrado/i`: `CERRÁDO` -> 0.
  - `/a.b/s`: `"a\nb"` -> 0.
  - `/rio|mar/`: `rio negro` -> 0. Implicit anchors wrap the whole alternation. See SA-S7.

### SA-E4 Grading does not show that `preAccept`/`preReject` play no part in grading (severity: low)
- Spec: short-answer.md "Grading": "The `preAccept` and `preReject` patterns are pre-submission validators and never contribute to a score."
- Missing: question `{accept: ["1822"], preReject: ["/\\d+/"]}`, response `1822` -> 1.

### SA-E5 No example of an empty pattern list or a non-string pattern (severity: medium)
- Spec: short-answer.md Additional Rules: "a pattern list, when present, has at least one pattern (schema)". The schema has `patternString: type: string`.
- Missing:
  - `invalid/short-answer-empty-accept-list.yaml`: `accept: []` -> `schema-error` `["accept"]`.
  - `invalid/short-answer-numeric-pattern.mdq.md`: frontmatter `accept: [1822]` (a common unquoted-year mistake) -> `schema-error` `["accept", 0]`.
  - `invalid/short-answer-pattern-object-without-pattern.yaml`: `accept: [{feedback: x}]` -> `schema-error`.

### SA-E6 No example of a whitespace-only pattern (severity: low)
- Spec: The schema `patternString.pattern` rejects `"   "`. Its comment says "Must carry at least one non-space character". The prose says only "It cannot be empty".
- Missing: `invalid/short-answer-blank-pattern.yaml`, `accept: ["   "]` -> `schema-error`. Also see SA-S5.

### SA-E7 `invalid-regex` is exercised only on `accept` (severity: low)
- Spec: The Additional Rules rows on regexes apply to "accept, reject, preAccept, preReject".
- Missing: `invalid/model-only/short-answer-invalid-regex-pre.yaml` with `reject: ["/[AM/"]` and `preAccept: ["/x/ii"]` -> two `invalid-regex`, at `["reject",0]` and `["preAccept",0]`. Add one object-form entry to pin the path (`[list,i]` or `[list,i,"pattern"]`).

### SA-E8 No example of a body with no `[short-answer]` block (severity: medium)
- Spec: short-answer.md "Body": "A question MUST have a `[short-answer]` block and MAY have one `[short-answer/reject]` block".
- Missing: `invalid/short-answer-reject-without-accept.mdq.md` with a stem, then `[short-answer/reject]:` and `* Savana` -> expected code not specified (see SA-S3). Also missing: `type: short-answer` + frontmatter `accept` with no body block. Is it valid or invalid?

### SA-E9 Block order, comment-before-feedback, and a blank line inside an item are not exercised (severity: medium)
- Spec:
  - short-answer.md "Body": "in any order".
  - patterns.md "Pattern items": "at most one feedback block and at most one comment block, in either order".
  - "Continuation lines": "A blank line inside the item is ignored."
- Missing:
  - `valid/short-answer/reject-before-accept.mdq.md`: the `[short-answer/reject]` list first, then `[short-answer]: Brasília`.
  - `valid/short-answer/comment-before-feedback.mdq.md`: an item with `! note` then `> feedback`.
  - `valid/short-answer/blank-line-in-item.mdq.md`: `* Rio de Janeiro`, a blank line, then `  > feedback`. In Markdown this makes the list loose. The corpus should pin that the result is the same.

### SA-E10 Conflict variants not exercised (severity: low)
- Spec: short-answer.md "Frontmatter" and "Body".
- Missing:
  - Frontmatter `accept` + a list-form `[short-answer/accept]:` -> `conflicting-accept`.
  - Frontmatter `accept` + an empty `[short-answer/accept]:` -> valid. Only the `[short-answer]:` spelling is covered, in `frontmatter-accept`.
  - Frontmatter `reject` with no reject block -> valid.

### SA-E11 No example of a continued exact or regex pattern, an empty tag followed by a non-list line, or `/usr/bin` (severity: low)
- Spec:
  - patterns.md "Continuation lines": "The space that replaces a line ending is significant in an exact literal and in a regex. Authors SHOULD write those on one line."
  - "Pattern string": `` [short-answer]: `/usr/bin` ``.
- Missing:
  - `valid/short-answer/exact-continued.mdq.md`: `` [short-answer]: `Rio `` followed by `` Negro` `` -> `` "`Rio Negro`" ``. This conflicts with the grammar, see SA-S4.
  - `[short-answer]:` followed directly by the line `Brasília` (no list marker). The result is not defined.
  - `valid/short-answer/exact-slash.mdq.md` with `` `/usr/bin` ``.

### SA-E12 `incorrectFeedback` rule not exercised (severity: low)
- Spec: short-answer.md Additional Rules: "incorrectFeedback | warning | if defined, must have at least one visible character".
- Missing: `valid/short-answer/blank-incorrect-feedback.yaml` with `incorrectFeedback: "  "`. Blocked by SA-S2, because the rule has no code.

### SA-E13 `detached-answer-list` after a tag with content (severity: low)
- Spec: short-answer.md "Body": "A list after a blank line is not part of the block: it is an epilogue element. Implementations SHOULD warn about it". lint-codes: "A `[short-answer]` tag is followed by a blank line and a list."
- Missing: `[short-answer]: Brasília`, a blank line, then `* Rio`. Does the warning fire? The only example, `detached-list`, has an empty tag. See SA-S8.

### SA-E14 The patterns.md examples table is not fully in `matching/inexact.yaml` (severity: low)
- Spec: patterns.md "Inexact literals" examples table.
- Missing: 8 of 10 rows are in `inexact.yaml` as written. `Brasília`/`BRASILIA` is only in `grading/short-answer.yaml`; `inexact.yaml` has `BRASÍLIA` and `Brasilia` separately. `Rio`+U+00A0+`Negro` is present only as `São Paulo` with U+00A0. Add both rows as written.

## Spec defects

### SA-S1 `conflicting-accept`: "block with content" against "a body block" (severity: high)
- Spec:
  - short-answer.md "Body": "A `[short-answer]` block **with content** and an `accept` field in the frontmatter are two spellings of the same list, and a document MUST NOT use both."
  - The same file, "Frontmatter": "writing the block and writing the frontmatter field are two spellings of the same thing, and a document MUST NOT use both spellings". Additional Rules: "must not be written as a body block and a frontmatter field". [^7]: "A document that uses both is invalid". lint-codes `conflicting-accept`: "declared both in the frontmatter and as a body block".
- Problem: The "Body" sentence makes an empty block legal. The other three sentences forbid any block. "A question MUST have a `[short-answer]` block", so under the unqualified reading every document with a frontmatter `accept` is invalid. `valid/short-answer/frontmatter-accept.mdq.md` (empty `[short-answer]:` + frontmatter `accept`) pins the qualified reading. For `reject`, an empty reject block is already a parse error, so the question applies only to `accept`.
- Fix: Add "with at least one pattern" to the Frontmatter paragraph, to the Additional Rules row, to [^7], and to the lint-codes entry.

### SA-S2 `incorrectFeedback` blank rule has no lint code (severity: medium)
- Spec: short-answer.md Additional Rules: "incorrectFeedback | warning | if defined, must have at least one visible character". lint-codes `blank-text-field`: "A free-text metadata field (`title`, `author`, `comment`, `answerKey`)".
- Problem: No code covers the rule. Blank pattern `feedback`/`comment` have no rule at all, while `blank-choice-feedback` exists for choices.
- Fix: Add `incorrectFeedback` to the `blank-text-field` list, or add a `blank-pattern-feedback` code. Decide whether pattern feedback and comment get the same rule.

### SA-S3 Several critical body rules do not state their code (severity: medium)
- Spec: short-answer.md Additional Rules rows "each body block may be defined at most once", "a tag with content must not be followed by a list without a blank line", "reject must declare at least one pattern", "feedback and comment lines of an item must not interleave", and "A question MUST have a `[short-answer]` block".
- Problem: No code is given. The grammar snippet does not cover block repetition, item interleaving, or a missing accept block, so "grammar violation -> `parse-error`" is an inference. The corpus pins `parse-error` for the first four. The fifth has no example.
- Fix: Add a code column, or one sentence: "Violations of the body structure rules are `parse-error`".

### SA-S4 The grammar has no continuation lines, while the prose allows them (severity: medium)
- Spec: short-answer.md "Body": `PLAIN_TEXT : /[^` \t\r\n][^\r\n]*/`, `EXACT_TEXT : /[^`\n\r]+/`. patterns.md "Continuation lines": "The lines after the tag line, up to the first blank line, continue the pattern", and "The space that replaces a line ending is significant in an exact literal".
- Problem: Both terminals exclude line endings, so `` [short-answer]: `Rio `` followed by `` Negro` `` has no derivation, but the prose accepts it (`continuation-lines.mdq.md` uses the inexact case). The grammar also does not say what follows an empty tag when the next line is not a list item.
- Fix: Add a `continuation` rule to the grammar, or state that the grammar applies after the lines are joined.

### SA-S5 Schema `patternString` uses `\s` and is stricter than the prose (severity: medium)
- Spec: `schema/short-answer.yaml`: `pattern: "^(?:`[^`\\n]+`[ \\t]*|[^`\\s][\\s\\S]*|\\s+[^`\\s][\\s\\S]*)$"`. grammar.md "Regex dialect": "JavaScript `\s` matches U+FEFF and Python `\s` does not. Python `\s` matches U+0085 and U+001C to U+001F ... The terminals of this spec use only explicit character classes." patterns.md: "It cannot be empty."
- Problem:
  - A JSON Schema validator in Python and one in JS disagree. The pattern `"﻿"` fails in JS and passes in Python. `"\u001F"` passes in JS and fails in Python. The `﻿` U+0060 `x` U+0060 case also differs.
  - The pattern also rejects a whitespace-only string, and an exact literal with leading whitespace (`" `x`"`), while patterns.md lets a regex keep leading spaces ("starts with a `/` after stripping spaces and tabs"). The prose states neither rule.
  - `[^`\\n]` allows `\r`, which `EXACT_TEXT` excludes.
- Fix: Use `UNICODE_SPACE` (or `[ \t]`) in place of `\s`. Say in patterns.md "Pattern string" that a pattern needs at least one non-space character, and decide whether leading whitespace before a backtick is allowed.

### SA-S6 What a regex is matched against is not defined; responses.md says all short answers are case folded (severity: high)
- Spec: responses.md "Short answer and essay": "Short answers are normalised before matching -- case folded, unicode normalised, whitespace collapsed". patterns.md "Regex flags": "Matching is **case-sensitive by default**". "Exact literals": "Case, interior whitespace and punctuation are all significant".
- Problem:
  - responses.md contradicts both the exact and the regex rules.
  - patterns.md gives the normalization steps for exact and inexact literals, but none for a regex. It does not say whether the response is NFC-normalized or trimmed. So `/1822-0?9-0?7/` against `"1822-09-07\n"` and `/Brasília/` against an NFD `Brasília` have no defined result. Exact literals trim and normalize to NFC; regexes might not.
- Fix: Remove the sentence from responses.md or limit it to inexact literals. In patterns.md "Regex", state the input, for example "the response after NFC and trimming of `UNICODE_SPACE`". Add grading cases.

### SA-S7 Implicit anchoring of an alternation and `i` semantics are not defined (severity: medium)
- Spec: patterns.md "Regex": "All regular expressions are implicitly anchored at both ends ... `/abc/` in MDQ is equivalent to `/^abc$/`". "`i`: Case-insensitive matching."
- Problem:
  - Read literally, `/rio|mar/` becomes `/^rio|mar$/`. With a group it becomes `/^(?:rio|mar)$/`. The two readings give different results for `rio negro`.
  - `i` has no defined case mapping, and `u` is ignored. JS non-`u` `i` and Python `re.I` differ, for example on `/k/i` against U+212A KELVIN SIGN.
- Fix: State "equivalent to `^(?:...)$`". Define `i` as the JavaScript `i` without `u`, or as simple case folding.

### SA-S8 Scope of `detached-answer-list` (severity: low)
- Spec: short-answer.md "Body": "The list MUST start on the line right after the tag ... A list after a blank line is not part of the block: it is an epilogue element. Implementations SHOULD warn about it". The Additional Rules row covers `accept` only.
- Problem: It is not clear whether the warning also fires after a tag with content (`[short-answer]: Brasília`, a blank line, then `* Rio`). Two readers will differ.
- Fix: State "only after an empty tag" (as the example suggests) or "after any accept tag".

### SA-S9 Schema `feedback`, `comment` and `incorrectFeedback` have no `minLength` (severity: low)
- Spec: base.md "Additional Rules": "every text field (`title`, `author`, `comment`, choice text, feedback and the like) MUST NOT be the empty string (`minLength: 1`)". `schema/short-answer.yaml`: `feedback: type: string`, `comment: type: string`, `incorrectFeedback: type: string` (no `minLength`).
- Fix: Add `minLength: 1` to the three fields, or make the base.md claim narrower.

### SA-S10 Unicode-escape example lost its escape (severity: low)
- Spec: patterns.md "Regex": "Unicode escape sequences are also supported, e.g., `ሴ`". The source holds the raw character U+1234.
- Fix: Write `` `ሴ` ``. Also say whether `\u{...}` is supported, since the `u` flag that JS needs for it is ignored.

### SA-S11 `ignored-regex-flag` granularity (severity: low)
- Spec: lint-codes `ignored-regex-flag`: "A `/.../flags` pattern ... carries a flag that is accepted but has no effect."
- Problem: The spec does not say whether there is one diagnostic per entry or one per flag. `ignored-regex-flag-in-reject` pins one per entry (`/Brasília/su`, `/Salvador/yd`).
- Fix: Add "one diagnostic per pattern".

## Checked and fine
- Single-line and list forms produce the same `accept` (`simple`, `list`, `accept-and-reject-blocks`); delimiters are kept (`exact`, `regex`).
- `[short-answer/accept]` alias valid (`accept-reject`, `accept-regex-flags`); both spellings -> `parse-error` (`short-answer-both-accept-spellings`); repeated accept, alias and reject blocks -> `parse-error`.
- Continuation lines for pattern, feedback and comment, and single-line content (`continuation-lines`) match patterns.md.
- Detached list after an empty accept -> epilogue + `detached-answer-list` warning at `["epilogue"]`. Empty reject and reject + detached list -> `parse-error`. Content + adjacent list -> `parse-error`. Interleaved `>`/`!` -> `parse-error`.
- `conflicting-accept`: content form with both spellings and reject list (3 examples). Empty block + frontmatter `accept` is valid (`frontmatter-accept`).
- `[short-answer/preAccept]` block -> `forbidden-block-element` in the epilogue (base.md "Forbidden elements").
- Fields: `type`, `accept`, `reject`, `preAccept`, `preReject` (string and object form), `diacritics` (`fold` explicit, `keep`, bad value), `unmatched` (`manual`, `incorrect`, bad value), `incorrectFeedback`. `automation` -> `schema-error`. Extra object key -> `schema-error`.
- Pattern object forms: pattern+feedback, pattern+comment, all three.
- Regex subset: lookahead, non-capturing group, negated class, `\x`/`\u` escapes valid. Class intersection, lookbehind and `(?P<>)` -> `invalid-regex`. Unclosed regex (content, item, frontmatter), unknown flag and repeated flag -> `invalid-regex` at `[accept,i]`.
- `redundant-regex-anchor` (all four lists, `f`/`b` cases) and `ignored-regex-flag` (all seven ignored flags, preReject) are `info`, as lint-codes says.
- `no-correct-answer` warning at `["unmatched"]` (`no-correct-answer.yaml`).
- `diacritics: keep` affects inexact literals only (`diacritics-keep-mixed`). Grading "Diacritics kept" and every `keep` column of `inexact.yaml` agree with "skips step 3 ... and no other step".
- All six inexact steps are covered by `inexact.yaml` (step 1 NFKC, 2 ignorables, C0 controls and NUL, 3 `Mn` and `letters` (Ø, Ł, æ, Þ, ı are in the table), 4 punctuation including U+2212 and U+2011, 5 full folding including `ß`/`ẞ`, final sigma and U+1C89/U+1C8A from Unicode 16 (tables are 18.0.0), 6 `UNICODE_SPACE` including U+0085 and U+2028). I checked the expected values by hand against the tables.
- Exact literal: NFC both sides, ligature/fullwidth/subscript not folded, `UNICODE_SPACE` trimmed at the ends only, control not trimmed (`exact.yaml`; grading " math.isnan\n").
- Grading: accept-only, accept+reject, accept wins over reject, semi-automatic, reject-only (manual default), reject-only + `unmatched: incorrect`, no pattern (manual), empty response, exact vs inexact, `/…/in`, unflagged case sensitivity.
- `nbsp-on-tag-line`: U+00A0 kept in the pattern, as grammar.md "Whitespace and line endings" requires.
