--- ISSUE 1 ---
# [Spec] Define the single-line content and the pattern item in the grammar

**Labels:** critical, high, medium

## Problem

The Lark snippet allows one line of content, while the prose and the corpus allow continuation lines; the prose says every line up to a blank line continues the pattern, while mdq-py ends it at any line that interrupts a CommonMark paragraph; an empty tag followed by a text line has two readings; pattern_item has no grammar; fill-in uses a different, undefined PATTERN terminal. Recommended: define `content` with continuation lines that stop at the same lines LAZY_START excludes, define `pattern_item` in patterns.md, and reference both from short-answer.md and fill-in.md. Decide what a `>`/`!` line after single-line content is (recommended: parse-error, since single-line content has no feedback).

## Evidence

- `docs/question-types/short-answer.md:152-159`: Single-line content has no continuation lines, but the prose and corpus allow them

  ```lark
  patterns     : content | nl pattern_list
  content      : exact | inexact
  exact        : "`" EXACT_TEXT "`" ws?
  inexact      : PLAIN_TEXT
  ```
- `docs/references/patterns.md:223-226, docs/question-types/short-answer.md:182-183`: Single-line content: which lines continue the pattern is unclear

  ```
  The content of a single-line block continues in the same way. The lines after
  the tag line, up to the first blank line, continue the pattern:
  ```
- `docs/question-types/short-answer.md:150-152`: Empty tag line followed by a text line: content or epilogue is undecided

  ```lark
  accept_block : "[" "short-answer" "/accept"? "]" ws? ":" ws? patterns?
  ```
- `docs/question-types/short-answer.md:156`: pattern_item has no grammar, so the pattern line is unconstrained

  ```lark
  pattern_list : pattern_item+
  ```
- `docs/question-types/fill-in.md:210-212, docs/question-types/short-answer.md:152-159`: Fill-in grammar uses an undefined `PATTERN` terminal for what short-answer splits into `exact | inexact`

  ```
  answer           : PATTERN
  ```

## Impact

- **Single-line content has no continuation lines, but the prose and corpus allow them:** A wrapped answer, common when an editor reflows text, is valid by the prose and the corpus but invalid by the grammar. Implementers get two contradictory specs.
- **Single-line content: which lines continue the pattern is unclear:** Two implementations can produce different answer keys from the same document. An author who writes feedback under a single-line answer gets it in the epilogue, shown to every student, with no diagnostic.
- **Empty tag line followed by a text line: content or epilogue is undecided:** Two readings give different documents: a manual question with stray text, or an automatic question with accept `Brasília`; for reject, an error or a valid block.
- **pattern_item has no grammar, so the pattern line is unconstrained:** The list form, the most used form with feedback, is specified only in prose; the single-line and list forms can drift.
- **Fill-in grammar uses an undefined `PATTERN` terminal for what short-answer splits into `exact | inexact`:** Fixes to the short-answer grammar (continuation lines, backtick rules) do not reach fill-in, and a reader cannot compare the two.

## Suggested fix

- **Single-line content has no continuation lines, but the prose and corpus allow them:** Add continuation lines to `content`, e.g. `inexact : PLAIN_TEXT (nl CONT_LINE)*` with a terminal that excludes blank lines and the starts of interrupting blocks (as LAZY_START does), and let EXACT_TEXT continue across line endings in the same way.
- **Single-line content: which lines continue the pattern is unclear:** State which lines end the single-line content: the same lines that LAZY_START excludes (grammar.md, Feedback and comment lines). Decide what a `>` or `!` line right after single-line content is: an error, a warning, or feedback for that pattern.
- **Empty tag line followed by a text line: content or epilogue is undecided:** State whether continuation starts only after a non-empty tag line, and encode it in `patterns` (for example, allow `nl content` or forbid it explicitly with a lint code).
- **pattern_item has no grammar, so the pattern line is unconstrained:** Define `pattern_item : ws? content (nl CONT_LINE)* nl (blank_line* observations)?` (or equivalent) in patterns.md and reference it from short-answer.md.
- **Fill-in grammar uses an undefined `PATTERN` terminal for what short-answer splits into `exact | inexact`:** Use the same rules in fill-in.md (`content`, `exact`, `inexact`) or define them once in grammar.md and reference them from both.

## Acceptance criteria

- [ ] The Lark snippets accept examples/valid/short-answer/continuation-lines.mdq.md
- [ ] patterns.md has a Lark rule for pattern_item used by short-answer.md and fill-in.md
- [ ] The spec states the result of `[short-answer]: X` followed by a `>` line and by an empty-tag-then-text input, with a corpus example for each
- [ ] scripts/spec_audit.py passes

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] Specify the pattern-string syntax once: regex, exact, blank

**Labels:** medium, low

## Problem

The grammar has no regex alternative, a partial backtick span fails the grammar but the corpus expects schema-error, patterns empty after normalization are accepted, and the schema regex uses `\s` and differs from EXACT_TEXT and PLAIN_TEXT. Recommended: add a `regex` alternative to `content`, state that a pattern must have a visible character after normalization (code `blank-text` or `schema-error`), and rewrite the schema pattern with explicit classes that match the terminals.

## Evidence

- `docs/question-types/short-answer.md:153-159`: Grammar has no regex alternative: `/`-delimited content parses as inexact

  ```lark
  content      : exact | inexact
  ```
- `docs/question-types/short-answer.md:153-159`: Partial backtick content: grammar rejects it as a parse failure, corpus expects schema-error

  ```lark
  exact        : "`" EXACT_TEXT "`" ws?
  ```
- `docs/question-types/short-answer.md:154-159`: Grammar accepts patterns that become empty after normalization

  ```lark
  EXACT_TEXT   : /[^`\n\r]+/
  PLAIN_TEXT   : /[^` \t\r\n][^\r\n]*/
  ```
- `schema/short-answer.yaml:128`: Schema patternString uses \s, which disagrees with PLAIN_TEXT and between Python and JavaScript

  ```yaml
  pattern: "^(?:`[^`\\n]+`[ \\t]*|[^`\\s][\\s\\S]*|\\s+[^`\\s][\\s\\S]*)$"
  ```
- `schema/short-answer.yaml:123-128, docs/references/patterns.md:20`: Schema rejects a whitespace-only pattern; the spec only forbids an empty one

  ```
  A pattern string is plain text, never markdown. It cannot be empty.
  ```

## Impact

- **Grammar has no regex alternative: `/`-delimited content parses as inexact:** An implementation that dispatches on the parse tree treats regexes and unclosed regexes as plain literals; the classification lives only in prose.
- **Partial backtick content: grammar rejects it as a parse failure, corpus expects schema-error:** Implementations that follow the grammar report a different code than the corpus; the rule that rejects the input is not stated where the lint codes are listed.
- **Grammar accepts patterns that become empty after normalization:** A pattern that matches only a blank response passes validation, or is rejected, depending on how an implementation reads 'empty'.
- **Schema patternString uses \s, which disagrees with PLAIN_TEXT and between Python and JavaScript:** The same content validates in mdq-py and fails in mdq-js, and the schema rejects content the grammar defines as text.
- **Schema rejects a whitespace-only pattern; the spec only forbids an empty one:** The schema enforces a rule that the spec does not declare.

## Suggested fix

- **Grammar has no regex alternative: `/`-delimited content parses as inexact:** Add `regex : "/" REGEX_BODY "/" REGEX_FLAGS? ws?` to `content` and restrict PLAIN_TEXT to not start with `/`, so an unclosed regex fails as the corpus expects.
- **Partial backtick content: grammar rejects it as a parse failure, corpus expects schema-error:** Add an Additional Rules row for content that opens with a backtick and is not a complete span, with the code the corpus uses, and say in the grammar section that the snippet leaves this case to that rule.
- **Grammar accepts patterns that become empty after normalization:** State whether a pattern that is empty after normalization is invalid, and add the code (for example `blank-text`) to the Additional Rules table.
- **Schema patternString uses \s, which disagrees with PLAIN_TEXT and between Python and JavaScript:** Replace `\s` with the explicit class `[ \t\r\n]` used by PLAIN_TEXT, exclude `\r` in the exact alternative, and decide if leading spaces before an exact literal are stripped as before a regex.
- **Schema rejects a whitespace-only pattern; the spec only forbids an empty one:** State in patterns.md that a pattern string must have a character that is not a space or tab, with its code.

## Acceptance criteria

- [ ] `content` has exact, regex and inexact alternatives
- [ ] The schema patternString regex uses only explicit classes and agrees with EXACT_TEXT and PLAIN_TEXT
- [ ] A pattern of only U+200B or a blank exact literal has a documented code and a corpus example

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Pin down regex semantics: subject, Unicode mode, delimiters and the n flag

**Labels:** high, medium

## Problem

The spec does not say how the response is prepared before a regex match (NFC? trim?), which Unicode mode a regex runs in (`.`, `i`, `\u{...}`), how `\d`/`\w`/`\s` behave in Python, which `/` closes the regex, whether spaces after flags are allowed, or how `n` treats escapes in the regex source. Recommended: NFC plus trim of UNICODE_SPACE on the subject, code-point mode with simple case folding, ASCII shorthand classes, the last `/` closes, trailing spaces and tabs stripped, and `n` strips only the subject with a lint for an `Mn` code point left in the regex.

## Evidence

- `docs/references/patterns.md:145-150`: The response is not normalized or trimmed before a regex match

  ```
  A pattern is a regex if it starts with a `/` after stripping spaces and tabs.
  ```
- `docs/references/patterns.md:260-267, docs/references/patterns.md:304-305`: Regex Unicode mode, case folding and shorthand classes are undefined

  ```
  * Unicode: Unicode characters are allowed in the regex. Unicode escape sequences
  ```
- `docs/references/patterns.md:147-150, docs/references/patterns.md:31-32`: Regex delimiters: an unescaped `/` in the body and spaces after the flags

  ```
  A regex must be closed by a `/` as well, and may include optional flags after
  ```
- `docs/references/patterns.md:289-294`: The `n` flag strips diacritics from the regex source with no rule for escapes

  ```
  * `n`: Strip diacritics from both the pattern and the response before
  ```

## Impact

- **The response is not normalized or trimmed before a regex match:** A student who types a trailing space or newline, or whose input method produces NFD, fails a regex answer that a literal would accept. Implementations can disagree.
- **Regex Unicode mode, case folding and shorthand classes are undefined:** The same regex accepts different responses in mdq-py and mdq-js.
- **Regex delimiters: an unescaped `/` in the body and spaces after the flags:** Authors cannot predict whether `/` needs escaping; implementations that follow JavaScript literal syntax reject documents mdq-py accepts.
- **The `n` flag strips diacritics from the regex source with no rule for escapes:** A regex with `n` can match nothing, with no diagnostic, and implementations can differ.

## Suggested fix

- **The response is not normalized or trimmed before a regex match:** Define the regex subject, for example: normalize the response to NFC and remove UNICODE_SPACE from both ends, as for exact literals. Add grading vectors for it.
- **Regex Unicode mode, case folding and shorthand classes are undefined:** Pick one mode (recommended: code points, as JavaScript `u`/`v` mode and Python `re` do) and state the semantics of `.`, `i` (simple case folding?) and the shorthand classes (ASCII only, as JavaScript). Add vectors to examples/ for each.
- **Regex delimiters: an unescaped `/` in the body and spaces after the flags:** State that the last `/` closes the regex and that an unescaped `/` in the body is allowed (or forbidden, `invalid-regex`). State that spaces and tabs after the flags are stripped.
- **The `n` flag strips diacritics from the regex source with no rule for escapes:** Define `n` on the subject only (strip the response) and require the regex to be written without diacritics, or define how escapes are treated. A lint for a regex under `n` that still holds an `Mn` code point would catch the mistake.

## Acceptance criteria

- [ ] patterns.md lists the steps applied to the response before a regex match
- [ ] patterns.md states the Unicode mode, the case folding of `i` and the shorthand classes
- [ ] examples/ has regex grading vectors for trimming, NFD input, astral `.`, `\d` on non-ASCII digits and `n` with an escape

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Complete the Additional Rules table of short answer

**Labels:** medium, low

## Problem

The required `[short-answer]` tag, blank pattern strings, partial backtick spans, empty pattern lines, a `[short-answer/preAccept]` block and the `automation` key have no row; `no-correct-answer` says 'must not' at warning level; three rows have no text. The required tag also blocks a frontmatter-only accept list. Recommended: keep the tag required but state that an empty tag with an `accept` field is valid, add one row per diagnostic with the code the corpus uses, and fix the level wording.

## Evidence

- `docs/question-types/short-answer.md:140-145, docs/question-types/short-answer.md:204-206`: The required `[short-answer]` tag has no rule row and blocks the frontmatter-only form

  ```
  incorrect responses. A question MUST have a `[short-answer]` block and MAY
  ```
- `docs/question-types/short-answer.md:407-422`: Additional Rules misses the pattern-string and preAccept-block rules

  ```
  | accept, reject, preAccept, preReject | error    | schema-error           | a pattern list, when present, has at least one pattern (schema)                     |
  ```
- `docs/question-types/short-answer.md:285-289, docs/question-types/short-answer.md:142-143, docs/question-types/short-answer.md:221`: Additional Rules has no row for the `automation` key, the MAY permissions and the read-only property SHOULD

  ```
  `automation` is not a field of the document. It MUST NOT appear in the
  ```
- `docs/question-types/short-answer.md:419`: Row `no-correct-answer` says 'must not' at warning level

  ```
  | unmatched                            | warning  | no-correct-answer      | must not be "incorrect" when the question has no `accept` pattern[^8]               |
  ```
- `docs/question-types/short-answer.md:409, docs/question-types/short-answer.md:420, docs/question-types/short-answer.md:421`: Rows of Additional Rules with no text in the spec

  ```
  | incorrectFeedback                    | error    | blank-text             | if defined, must have at least one visible character                                |
  ```

## Impact

- **The required `[short-answer]` tag has no rule row and blocks the frontmatter-only form:** Authors who use the frontmatter form get an unexplained parse error, and the empty tag that fixes it looks like a 'no pattern' question.
- **Additional Rules misses the pattern-string and preAccept-block rules:** The table is not the complete list of diagnostics; an implementer reading it misses four errors.
- **Additional Rules has no row for the `automation` key, the MAY permissions and the read-only property SHOULD:** The table is not the full list of rules of the type.
- **Row `no-correct-answer` says 'must not' at warning level:** A reader cannot tell whether the document is invalid.
- **Rows of Additional Rules with no text in the spec:** The rules exist only in the table, so authors reading the sections do not learn them.

## Suggested fix

- **The required `[short-answer]` tag has no rule row and blocks the frontmatter-only form:** Either drop the requirement when `type` or `accept`/`reject` is in the frontmatter, or keep it and add a row (`parse-error`) plus a sentence that an empty tag with an `accept` field is valid.
- **Additional Rules misses the pattern-string and preAccept-block rules:** Add one row per rule, with its code. Decide if the SHOULD at patterns.md:231 gets a warning code or becomes plain advice.
- **Additional Rules has no row for the `automation` key, the MAY permissions and the read-only property SHOULD:** Add an error row (`schema-error`) for `automation`, and either info rows for the MAY permissions or a note that the table lists only diagnostics. Move the read-only property SHOULD out of RFC language or give it a row.
- **Row `no-correct-answer` says 'must not' at warning level:** Write 'should not' in the row and add a SHOULD NOT sentence in the Grading section.
- **Rows of Additional Rules with no text in the spec:** Add one sentence for each rule in its section, with the code.

## Acceptance criteria

- [ ] Every diagnostic in examples/invalid/short-answer-* has a row
- [ ] Every row has a sentence in the prose
- [ ] Each row uses must/should matching its level

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Define feedback selection for every pattern list and test it

**Labels:** medium

## Problem

patterns.md and the schema say feedback comes from the pattern that 'decided' the response, while short-answer.md uses the first matching pattern with feedback; preAccept/preReject feedback has no rule; fill-in blanks have no incorrectFeedback and the spec does not say so; no corpus vector checks feedback, pre-validation or the f/b/n flags. Recommended: keep the short-answer.md rule and reference it, add a pre-validation feedback rule, state that blanks have no incorrectFeedback, and add a `feedback` key to the grading vectors.

## Evidence

- `docs/references/patterns.md:166-167, schema/short-answer.yaml:108, docs/question-types/short-answer.md:388-392`: Pattern feedback is said to come from the pattern that 'decided' the response, but the rule picks the first matching pattern that has feedback

  ```
  Only `pattern` is required. `feedback` is shown to the student whose response
  ```
- `docs/question-types/short-answer.md:104-115, docs/question-types/fill-in.md:57-60`: Feedback of `preAccept` and `preReject` patterns has no rule

  ```
  systems should warn students about the invalidity of their answer before
  ```
- `docs/question-types/fill-in.md:202-204, docs/question-types/fill-in.md:280-286, schema/fill-in.yaml:120-128`: Short answer blanks of fill-in have no `incorrectFeedback`, and the spec does not say so

  ```
  A short answer blank takes the same answer machinery as a standalone
  ```
- `examples/grading/short-answer.yaml:13`: No corpus vectors for feedback selection, `incorrectFeedback`, pre-validation and the `f`/`b` flags

  ```
  #   examples: { response: string, score: 0 | 1 | "pending" }[]
  ```

## Impact

- **Pattern feedback is said to come from the pattern that 'decided' the response, but the rule picks the first matching pattern that has feedback:** Implementations can show or omit feedback for the same response.
- **Feedback of `preAccept` and `preReject` patterns has no rule:** Authors write pre-validation feedback that implementations may never show, or show differently.
- **Short answer blanks of fill-in have no `incorrectFeedback`, and the spec does not say so:** A reader cannot tell whether an unmatched blank response can carry feedback; the 'same machinery' sentence suggests it can.
- **No corpus vectors for feedback selection, `incorrectFeedback`, pre-validation and the `f`/`b` flags:** mdq-py and mdq-js can disagree on these rules with every shared test passing.

## Suggested fix

- **Pattern feedback is said to come from the pattern that 'decided' the response, but the rule picks the first matching pattern that has feedback:** In patterns.md and the schema, refer to the selection rule of short-answer.md ('Feedback') instead of 'the pattern that decided'.
- **Feedback of `preAccept` and `preReject` patterns has no rule:** Add a rule: when a submission is invalid, show the feedback of the first matching `preReject` pattern that has one; state what is shown for a `preAccept` failure (no pattern matched, so no pattern feedback). Write the warning requirement with SHOULD.
- **Short answer blanks of fill-in have no `incorrectFeedback`, and the spec does not say so:** State that blanks have no `incorrectFeedback`, or add the field (per blank or per question).
- **No corpus vectors for feedback selection, `incorrectFeedback`, pre-validation and the `f`/`b` flags:** Add a `feedback` key to the grading vectors, a pre-validation vector file, and regex vectors for `f`, `b` and `n`.

## Acceptance criteria

- [ ] patterns.md and the schema reference the selection rule of short-answer.md
- [ ] The spec states which feedback an invalid submission shows
- [ ] examples/grading/short-answer.yaml checks feedback; a pre-validation vector file exists

--- END ISSUE 5 ---

--- ISSUE 6 ---
# [Spec] Define the short-answer response value

**Labels:** medium

## Problem

responses.md does not say that a non-string response is malformed, how an empty or whitespace-only string is graded, or whether line breaks are allowed. Recommended: a string is required (anything else is a ResponseError), an empty string is graded like any other response, and line breaks are allowed.

## Evidence

- `docs/responses.md:148-153`: Short-answer response: type, empty string and line breaks are not defined

  ```
  The text the student wrote, before normalization.
  ```

## Impact

A YAML response `1960` can be coerced to text in one implementation and refused in another. An empty submission scores 0 under `unmatched: incorrect` but its status is not specified.

## Suggested fix

Add: the response is a string; any other value is a malformed response (`ResponseError`). State that an empty or whitespace-only string is graded like any other response (or is a skip). Add vectors.

## Acceptance criteria

- [ ] responses.md states the three rules
- [ ] examples/grading/short-answer.yaml has vectors for an empty string under unmatched: incorrect

--- END ISSUE 6 ---

--- ISSUE 7 ---
# [Spec] Allow an exact literal that contains a backtick

**Labels:** medium

## Problem

EXACT_TEXT excludes the backtick, so answers such as `` `date` `` cannot be matched exactly. Options: (a) accept a CommonMark code span of N backticks (recommended, matches CommonMark); (b) document the limitation and point to a regex.

## Evidence

- `docs/question-types/short-answer.md:158`: An exact literal cannot contain a backtick

  ```
  EXACT_TEXT   : /[^`\n\r]+/
  ```

## Impact

Questions about shells, Markdown or SQL identifiers cannot use exact matching; the error message does not help.

## Suggested fix

Accept a CommonMark code span of N backticks, with the same one-space stripping, or document the limitation and suggest a regex.

## Acceptance criteria

- [ ] The grammar and the schema accept the chosen form, or the limitation is documented
- [ ] A corpus example covers it

--- END ISSUE 7 ---

--- ISSUE 8 ---
# [Spec] Say how the exam grading applies to short answer

**Labels:** low

## Problem

The exam grading table has no column for types without a `grading` field. Recommended: one sentence that short answer, numeric, essay and ordering ignore the exam `grading` and score in [0, 1].

## Evidence

- `docs/exam.md:335-337`: The exam `grading` table does not say what it does to short answer

  ```
  Each question type accepts its own set of strategies in its `grading` field
  ```

## Impact

A reader can expect `symmetric` to penalize a wrong short answer.

## Suggested fix

Add a sentence: types without a `grading` field (short answer, numeric, essay, ordering?) ignore the exam `grading` and score in [0, 1].

## Acceptance criteria

- [ ] exam.md states it

--- END ISSUE 8 ---

--- ISSUE 9 ---
# [Spec] Add short-answer terms to the glossary

**Labels:** low

## Problem

Pattern, settled response, exact literal, inexact literal and pre-validation are not in GLOSSARY.md.

## Evidence

- `docs/question-types/short-answer.md:256`: GLOSSARY.md has no entry for pattern, settled, exact or inexact literal, or pre-validation

  ```
  A response is **settled** when the question decides if it is correct. An
  ```

## Impact

Readers of other types and of the glossary meet `settled` and `pattern` without a definition.

## Suggested fix

Add short entries for Pattern, Settled response, Exact literal, Inexact literal and Pre-validation.

## Acceptance criteria

- [ ] GLOSSARY.md has the five entries

--- END ISSUE 9 ---

--- ISSUE 10 ---
# Mechanical fixes

**Labels:** mechanical, high, medium, low

## Problem

Each fix below follows from its finding and needs no design decision, so they can be applied together in one pass and reviewed by reading the diff. Severity still applies: a mechanical fix can matter a lot.

### F1 (high): Short-answer tag rule has no leading ws?, so an indented tag is rejected

`docs/question-types/short-answer.md:150-151`

```lark
accept_block : "[" "short-answer" "/accept"? "]" ws? ":" ws? patterns?
reject_block : "[" "short-answer" "/reject" "]" ws? ":" ws? patterns
```

**Suggested fix:** Prefix both rules with `ws?`, as numeric.md does: `accept_block : ws? "[" "short-answer" ...`.

### F14 (medium): responses.md says every short answer is case folded before matching

`docs/responses.md:156-158`

```
Short answers are normalized before matching -- case folded, Unicode
```

**Suggested fix:** Say that each pattern normalizes the response in its own way, with a link to patterns.md.

### F22 (medium): Schema says a `[short-answer]` block's content is the first `accept` entry

`schema/short-answer.yaml:17-20`

```
any entry. The content of a simple `[short-answer]` block is the
```

**Suggested fix:** Say: the canonical form of the `[short-answer]` block (alias `[short-answer/accept]`); the single-line form gives a list of one entry.

### F23 (medium): Schema says rejecting never changes a score, but a `reject` match settles a response that would be pending

`schema/short-answer.yaml:24-28, schema/fill-in.yaml:145-149`

```
the `[short-answer/reject]` block. Rejecting never changes a score
```

**Suggested fix:** Say: a response that matches no `accept` pattern and matches a `reject` pattern is incorrect; `reject` decides responses that `unmatched: manual` would leave pending, and attaches feedback.

### F33 (low): Two automation examples are not valid documents

`docs/question-types/short-answer.md:301-303, docs/question-types/short-answer.md:379-381`

```
[short-answer]: Brasília
```

**Suggested fix:** Add the stem `What is the capital of Brazil?` and `Name a biome of central Brazil.`, as in the sibling examples.

## Acceptance criteria

- [ ] F1: Short-answer tag rule has no leading ws?, so an indented tag is rejected
- [ ] F14: responses.md says every short answer is case folded before matching
- [ ] F22: Schema says a `[short-answer]` block's content is the first `accept` entry
- [ ] F23: Schema says rejecting never changes a score, but a `reject` match settles a response that would be pending
- [ ] F33: Two automation examples are not valid documents

--- END ISSUE 10 ---
