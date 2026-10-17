--- ISSUE 1 ---
# [Spec] Numeric: one rule for response units

**Labels:** high, medium

## Problem

responses.md lets implementations convert a response unit, then calls any other unit malformed, and says an incompatible unit is both rejected and graded zero. numeric.md also drops a frontmatter `unit` that disagrees with the tag unit with no diagnostic.

Options: (A, recommended) same unit is valid, a convertible unit is converted before grading, any other unit is a `ResponseError`; plus a warning when frontmatter and tag units differ. (B) only the declared unit is valid, and unit conversion is removed from the spec.

## Evidence

- `docs/responses.md:129-135`: A response unit other than the declared one is both convertible and malformed

  ```
  Implementations MAY do unit conversions and rewrite the response to a canonical
  form, but they MUST reject a response with a unit that is not compatible with
  the question's unit with grade zero.
  
  A value the question cannot represent is a malformed response, never a wrong
  answer: a decimal where `domain` is `integer`, or a unit other than the
  declared one.
  ```
- `docs/question-types/numeric.md:22`: A frontmatter `unit` that disagrees with the tag unit is silently dropped

  ```
  | unit          | string    | Unit of the response, if given                  |
  ```

## Impact

- **A response unit other than the declared one is both convertible and malformed:** For `[numeric(g)]: 1000` and the response `{value: 1, unit: kg}`, one implementation scores 1, another raises `ResponseError`. For `{value: 1, unit: s}`, one scores 0 and another raises an error.
- **A frontmatter `unit` that disagrees with the tag unit is silently dropped:** A question whose body says grams is graded in kilograms, with no warning; numeric and short-answer treat collisions differently.

## Suggested fix

- **A response unit other than the declared one is both convertible and malformed:** State one rule: a unit equal to the declared one is valid; a different unit that the implementation can convert is converted before grading; any other unit is a malformed response (`ResponseError`), not a zero. Remove "with grade zero" and "or a unit other than the declared one".
- **A frontmatter `unit` that disagrees with the tag unit is silently dropped:** Specify the collision in numeric.md and report it, at least as a warning, when the two units differ.

## Acceptance criteria

- [ ] responses.md states one outcome for each of: same unit, convertible unit, incompatible unit, unit on a unitless question
- [ ] "with grade zero" no longer appears next to "reject"
- [ ] A lint code reports a frontmatter `unit` that differs from the tag unit, with a corpus example

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] Numeric: specify which responses each domain accepts

**Labels:** medium

## Problem

numeric.md never says what the domain does to responses; responses.md covers part of it and leaves out decimal responses to fraction questions, unreduced fractions, integer strings and unitless responses. The response table lists only two of the four forms. Recommended: add a "Responses" subsection to numeric.md with the grammar per domain, reusing `sign? value`, and fix the table and the garbled sentence in responses.md.

## Evidence

- `docs/responses.md:102-111`: Numeric response forms are underspecified

  ```
  A string carries an exact rational, which no float can represent. It MUST be
  used when the question's `domain` is `fraction` and the value is not exactly
  representable as a decimal:
  ```
- `docs/question-types/numeric.md:112-117`: The spec never states what the domain does to responses

  ```
  If not given in the frontmatter, the domain is inferred from how the value and
  the absolute tolerance are written
  ```

## Impact

- **Numeric response forms are underspecified:** Implementations disagree on which responses are malformed and which are graded.
- **The spec never states what the domain does to responses:** A reader of numeric.md cannot tell that `[numeric]: 42 +- 5%` rejects the response `43.5` as malformed even though it is inside the tolerance.

## Suggested fix

- **Numeric response forms are underspecified:** Specify the response grammar per domain (reuse `sign? value`), the treatment of unreduced fractions and unitless responses, and update the table at line 30.
- **The spec never states what the domain does to responses:** Add to "Number type/domain" the set of responses each domain accepts, and link the malformed-response rule of responses.md.

## Acceptance criteria

- [ ] numeric.md lists the valid response forms for `integer`, `fraction` and `decimal`
- [ ] responses.md table lists number, rational string, decimal string and the `{value, unit}` struct
- [ ] examples/grading/numeric.yaml covers a decimal response to a fraction question and an unreduced fraction

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Numeric: require exact arithmetic for the tolerance test

**Labels:** high

## Problem

Only the rounding step must use decimal arithmetic. In binary floating point, `3.24` is rejected by `[numeric]: 3.14 +- 0.1`. Recommended: require the whole comparison in exact decimal or rational arithmetic, and read a JSON number as its shortest decimal form.

## Evidence

- `docs/question-types/numeric.md:148-154`: Tolerance comparison arithmetic is not specified

  ```
  * Absolute tolerance: The response is accepted if `|answer - response| ≤ abstol`.
  ```

## Impact

Responses on the tolerance boundary grade differently across implementations and languages.

## Suggested fix

Require the whole tolerance test to run in exact decimal/rational arithmetic, with a JSON number read as its shortest decimal representation.

## Acceptance criteria

- [ ] numeric.md requires exact arithmetic for subtraction, multiplication and comparison
- [ ] A grading example accepts a response exactly on the absolute and on the relative tolerance boundary

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Numeric: fix domain and decimalPlaces inference edge cases

**Labels:** medium

## Problem

Inference reads how numbers are written, which YAML/JSON documents do not preserve, and a declared `decimal` domain over an integer or fraction value infers `decimalPlaces: 0`, so the question accepts a whole unit of error. Options: (A, recommended) infer from values for YAML/JSON documents and add a lint when the inferred `decimalPlaces` is 0 under a declared `decimal`; (B) require `domain` and `decimalPlaces` in YAML/JSON documents.

## Evidence

- `docs/question-types/numeric.md:166-169`: Inferred `decimalPlaces` of 0 turns a declared `decimal` domain into rounding to integers

  ```
  When the frontmatter does not give `decimalPlaces` and the domain is
  `decimal`, it is inferred from the body: the larger of the number of decimal
  places written in the value and in the absolute tolerance.
  ```
- `docs/question-types/numeric.md:114-115, docs/question-types/numeric.md:166-168, docs/question-types/numeric.md:101-102`: Domain and decimal-place inference from a JSON/YAML number is undefined

  ```
  If not given in the frontmatter, the domain is inferred from how the value and
  the absolute tolerance are written
  ```

## Impact

- **Inferred `decimalPlaces` of 0 turns a declared `decimal` domain into rounding to integers:** A question meant to be strict silently accepts a wide range.
- **Domain and decimal-place inference from a JSON/YAML number is undefined:** The same question grades differently depending on whether it was written in Markdown or as data, and across YAML/JSON libraries.

## Suggested fix

- **Inferred `decimalPlaces` of 0 turns a declared `decimal` domain into rounding to integers:** Specify the result for a value with no written decimal places (for a fraction, an exact comparison or a lint), or add a lint when the inferred `decimalPlaces` is 0 under a declared `decimal` domain.
- **Domain and decimal-place inference from a JSON/YAML number is undefined:** State that for data documents inference reads values, not spelling (a whole number is an integer, decimal places of the shortest representation), or require `domain` and `decimalPlaces` in data documents.

## Acceptance criteria

- [ ] numeric.md states how inference works for a document written as YAML/JSON
- [ ] numeric.md states the result for `domain: decimal` with `[numeric]: 42` and `[numeric]: 1/3`
- [ ] Corpus examples cover both cases

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Numeric: document the body-to-AST mapping and number representation

**Labels:** medium, low

## Problem

numeric.md never declares `answer` and `tolerance` nor how the body maps to them (`+- 5%` becomes `relative: 0.05`). The absolute tolerance has no string form, so it loses written digits, and the 32-bit integer limit is unexplained. Recommended: add an "AST" table for the body, allow a string `tolerance.absolute` with the same grammar as `answer`, and justify or relax the 32-bit rule.

## Evidence

- `docs/question-types/numeric.md:145-150`: Mapping from the body to `answer` and `tolerance` is not specified

  ```
  * Relative tolerance: The response is accepted if `|answer - response| ≤ tol`,
  ```
- `docs/question-types/numeric.md:127-128, docs/question-types/numeric.md:97`: Representation rules cover the answer but not the absolute tolerance

  ```
  The absolute tolerance is an `INTEGER` or a `DECIMAL`, never a fraction (see
  the grammar above and `tolerance.absolute` in the schema, a number).
  ```
- `docs/question-types/numeric.md:97-99`: Integer coercion limit is 32-bit while the precision rule allows 53-bit

  ```
  It SHOULD be kept as a string if it is not representable in the 32-bit signed
  integer range.
  ```

## Impact

- **Mapping from the body to `answer` and `tolerance` is not specified:** Implementers must reverse-engineer the data form from the schema and the corpus; a `relative: 5` written for 5% is a likely error.
- **Representation rules cover the answer but not the absolute tolerance:** The data form of a tolerance does not round-trip its written precision, which feeds the inference ambiguity of data documents.
- **Integer coercion limit is 32-bit while the precision rule allows 53-bit:** Surprising string answers for values like `390000000000`.

## Suggested fix

- **Mapping from the body to `answer` and `tolerance` is not specified:** Add a section that maps each body part to its field, with `tolerance.relative = percentage / 100`, and use one form in the formulas.
- **Representation rules cover the answer but not the absolute tolerance:** Apply the answer representation rules to `tolerance.absolute` (allow the decimal string form), or state that tolerances are always floats and why.
- **Integer coercion limit is 32-bit while the precision rule allows 53-bit:** Explain the 32-bit choice (integer type in some hosts), or align it with the float rule.

## Acceptance criteria

- [ ] numeric.md maps value, absolute and relative tolerance to `answer`, `tolerance.absolute` and `tolerance.relative`
- [ ] The 32-bit rule has a stated reason or matches the float rule
- [ ] Schema and spec agree on the type of `tolerance.absolute`

--- END ISSUE 5 ---

--- ISSUE 6 ---
# [Spec] Numeric: clean up tolerance and domain lint rules

**Labels:** medium, low

## Problem

`missing-tolerance` claims an exact match although decimals are rounded first; `answer-outside-domain` and `domain-mismatch` overlap at two severities and disagree on whether the absolute tolerance counts; `relative-tolerance-over-one` blames a units mistake a Markdown percentage cannot make; `tolerance: {}` silences `missing-tolerance`. Recommended: one code per condition, rewrite the three rationales, and treat an empty tolerance as missing.

## Evidence

- `docs/question-types/numeric.md:226-227, docs/question-types/numeric.md:42-43`: `missing-tolerance` says only an exact match is accepted, but decimals are rounded first

  ```
  [^5]: An exact comparison of a non-integer response is rarely what the author
  means, since the number of digits the student types decides the outcome.
  ```
- `docs/question-types/numeric.md:207-211`: `answer-outside-domain` and `domain-mismatch` report the same condition at two severities

  ```
  | answer             | warning  | answer-outside-domain          | must be a whole number when `domain` is "integer"[^6]              |
  ```
- `docs/question-types/numeric.md:210`: `relative-tolerance-over-one` blames a units mistake that a Markdown percentage cannot make

  ```
  | tolerance.relative | info     | relative-tolerance-over-one    | is a fraction, so a value above 1 is likely a mistake[^4]          |
  ```
- `docs/question-types/numeric.md:215`: An empty `tolerance` object is neither forbidden nor covered by `missing-tolerance`

  ```
  | tolerance          | info     | missing-tolerance              | should be defined for a `decimal` or `fraction` answer[^5]         |
  ```

## Impact

- **`missing-tolerance` says only an exact match is accepted, but decimals are rounded first:** The lint rationale misleads authors about what the question accepts.
- **`answer-outside-domain` and `domain-mismatch` report the same condition at two severities:** Duplicate diagnostics at different severities; implementations disagree on whether the absolute tolerance counts.
- **`relative-tolerance-over-one` blames a units mistake that a Markdown percentage cannot make:** Misleading message for Markdown documents.
- **An empty `tolerance` object is neither forbidden nor covered by `missing-tolerance`:** An empty tolerance hides the lint without adding any tolerance.

## Suggested fix

- **`missing-tolerance` says only an exact match is accepted, but decimals are rounded first:** Reword the footnote and lint-codes.md: without a tolerance, a decimal response must round to the answer at `decimalPlaces`; reconsider whether the lint applies to `fraction`.
- **`answer-outside-domain` and `domain-mismatch` report the same condition at two severities:** Give each condition one code. State in footnote 3 whether the absolute tolerance takes part, matching lint-codes.md.
- **`relative-tolerance-over-one` blames a units mistake that a Markdown percentage cannot make:** Reword the rule as "a relative tolerance above 100% is likely a mistake", or restrict the units-mistake message to data documents.
- **An empty `tolerance` object is neither forbidden nor covered by `missing-tolerance`:** Require at least one property in the schema (`minProperties: 1`), or state that an empty tolerance counts as missing.

## Acceptance criteria

- [ ] `domain: integer` with `answer: 3.5` reports exactly one code
- [ ] Footnotes and lint-codes.md agree on whether the absolute tolerance counts for `domain-mismatch`
- [ ] `tolerance: {}` reports `missing-tolerance`
- [ ] The rationales of `missing-tolerance` and `relative-tolerance-over-one` match the behavior

--- END ISSUE 6 ---

--- ISSUE 7 ---
# [Spec] Numeric: align schema descriptions and example text with the spec

**Labels:** low

## Problem

The schema describes the relative tolerance as a division (undefined at zero) and `decimalPlaces` as a display setting, and omits fields and domain inference. numeric.md writes example labels as H1 headings and claims every question declares a tolerance.

## Evidence

- `schema/numeric.yaml:87-89`: Schema defines relative tolerance as a division, the spec as a product

  ```
  i.e. |submitted - answer| / |answer| <= relative.
  ```
- `schema/numeric.yaml:48-50`: Schema describes `decimalPlaces` as a display format, the spec as comparison precision

  ```
  The number of decimal places used in the decimal value representation.
  ```
- `schema/numeric.yaml:4-7, schema/numeric.yaml:43`: Schema descriptions omit `unit`, `domain`, `decimalPlaces` and domain inference

  ```
  description: The domain/kind of number for the response.
  ```
- `docs/question-types/numeric.md:38-41`: Numeric body examples are written as H1 headings in a Markdown block

  ```
  ```md
  # Simple integer
  [numeric]: 42
  ```
- `docs/question-types/numeric.md:5-6`: Introduction says numeric questions declare a tolerance, which is optional

  ```
  Numeric questions expect a single numeric answer. They declare both the correct
  answer and tolerance.
  ```

## Impact

- **Schema defines relative tolerance as a division, the spec as a product:** An implementer following the schema divides by zero.
- **Schema describes `decimalPlaces` as a display format, the spec as comparison precision:** Tools that rely on the schema description show it as a display setting.
- **Schema descriptions omit `unit`, `domain`, `decimalPlaces` and domain inference:** Tools and readers that rely on the schema get an incomplete model of the field.
- **Numeric body examples are written as H1 headings in a Markdown block:** Minor confusion; the block looks like a document but is not one.
- **Introduction says numeric questions declare a tolerance, which is optional:** Readers may think a tolerance is required.

## Suggested fix

- **Schema defines relative tolerance as a division, the spec as a product:** Write the schema description as `|submitted - answer| <= |answer| * relative`.
- **Schema describes `decimalPlaces` as a display format, the spec as comparison precision:** Use the spec wording: the number of decimal places both the response and the answer are rounded to before the tolerance test.
- **Schema descriptions omit `unit`, `domain`, `decimalPlaces` and domain inference:** List every field in the top description and describe `domain` with the spec wording.
- **Numeric body examples are written as H1 headings in a Markdown block:** Use a table of examples or one block per example with the label in prose.
- **Introduction says numeric questions declare a tolerance, which is optional:** Write: "They declare the correct answer and an optional tolerance."

## Acceptance criteria

- [ ] Schema descriptions of `relative`, `decimalPlaces`, `domain` and the top description match numeric.md
- [ ] Body examples no longer use `#` lines inside an `md` block
- [ ] The introduction says the tolerance is optional

--- END ISSUE 7 ---

--- ISSUE 8 ---
# [Spec] Grammar: fix line endings, frontmatter and numeric fraction rules

**Labels:** medium, low

## Problem

`nl` and `COMMENT_LINE` allow CRLF to parse as two line endings; the frontmatter grammar does not force the first comment paragraph into `comment_string`; the numeric `fraction` accepts a zero denominator that the schema rejects; schema patterns anchored with `$` accept a trailing newline in Python but not in JavaScript.

## Evidence

- `docs/references/grammar.md:29, docs/references/grammar.md:63`: nl and COMMENT_LINE can split CRLF into two line endings

  ```lark
  nl : /\r\n|\r|\n/
  ```
- `docs/question-types/question-base.md:41`: Frontmatter grammar does not force the first comment paragraph into comment_string

  ```lark
  frontmatter    : separator nl blank_line* comment_string? yaml separator nl
  ```
- `docs/question-types/numeric.md:75`: Numeric fraction rule accepts a zero denominator

  ```lark
  fraction     : INTEGER "/" INTEGER
  ```
- `docs/references/grammar.md:17-19, schema/mdq.schema.json:396, schema/mdq.schema.json:483, schema/mdq.schema.json:490`: Schema forms of SLUG, UNIT and the numeric answer accept a trailing newline in Python

  ```json
  "pattern": "^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$",
  ```

## Impact

- **nl and COMMENT_LINE can split CRLF into two line endings:** A regex engine or a parser that backtracks into the alternation can count a CRLF as a line plus a blank line. Blank lines end the comment string and are significant in several bodies, so the meaning of a Windows file can change.
- **Frontmatter grammar does not force the first comment paragraph into comment_string:** The grammar alone does not decide whether a comment string exists. The prose resolves it, so the effect is small.
- **Numeric fraction rule accepts a zero denominator:** The grammar and the schema disagree on `1/0`. The lint rule catches it, so the effect is small.
- **Schema forms of SLUG, UNIT and the numeric answer accept a trailing newline in Python:** The two implementations validate the same YAML or JSON document differently: an id, a unit or an answer with a trailing line feed (easy to get from a YAML block scalar) passes the Python validator and fails the TypeScript one.

## Suggested fix

- **nl and COMMENT_LINE can split CRLF into two line endings:** Use `/\r\n|\r(?!\n)|\n/` for `nl` and `(\r\n|\r(?!\n)|\n)` at the end of `COMMENT_LINE`.
- **Frontmatter grammar does not force the first comment paragraph into comment_string:** Add a note under the snippet that `comment_string` is greedy, or define `yaml` so it cannot start with a `COMMENT_LINE`.
- **Numeric fraction rule accepts a zero denominator:** Use `fraction : INTEGER "/" POSITIVE_INTEGER` with `POSITIVE_INTEGER : /[1-9][0-9]*/`, as the schema does.
- **Schema forms of SLUG, UNIT and the numeric answer accept a trailing newline in Python:** End the patterns with `(?![\s\S])` or `$(?![\s\S])` instead of `$`, or have the Python validator use `re.fullmatch` semantics, and state the anchoring rule in grammar.md.

## Acceptance criteria

- [ ] `nl` uses `\r(?!\n)` and CRLF has one derivation
- [ ] `fraction` rejects `1/0` in the grammar
- [ ] Schema patterns reject `'Q1\n'`, `'kg\n'` and `'42\n'` in both Python and JavaScript
- [ ] The frontmatter grammar or a note under it makes `comment_string` greedy

--- END ISSUE 8 ---

--- ISSUE 9 ---
# [Spec] Ordering: make the grammar match the prose and the corpus

**Labels:** high, medium, low, info

## Problem

The ordering grammar rejects an indented tag and a blank line before a section, accepts several `## [extra]` sections, is ambiguous on blank lines in observations, and has no epilogue. question-base.md puts type-specific sections after the epilogue, ordering.md puts them before. Recommended: rewrite the rule with `ws?`, `(nl* section)*`, one optional extra, an epilogue, and update question-base.md to place type sections before the epilogue.

## Evidence

- `docs/question-types/ordering.md:141`: Ordering tag rule rejects an indented tag

  ```lark
  ordering : "[" "ordering" "]" nl content section*
  ```
- `docs/question-types/ordering.md:141`: Ordering grammar rejects a blank line between a content block and the next section

  ```lark
  ordering : "[" "ordering" "]" nl content section*
  ```
- `docs/question-types/ordering.md:144`: Ordering grammar accepts more than one extra section

  ```lark
  section : ordering_extra | ordering_accept | ordering_reject
  ```
- `docs/question-types/ordering.md:150-151`: Observations rule is ambiguous on blank lines after the first block

  ```lark
  observations : feedback nl* comment? nl*
  ```
- `docs/question-types/ordering.md:181-183`: Ordering puts the epilogue after its sections; the base puts special sections after the epilogue

  ```
  The sections below follow the content block directly. The epilogue, if any,
  comes after the last section; prose between the block and a section is an
  error (`parse-error`).
  ```

## Impact

- **Ordering tag rule rejects an indented tag:** The grammar rejects a document that the prose and the corpus declare valid. An implementation that follows the grammar fails the shared test suite; one that follows the corpus has no grammar for what indentation it may accept.
- **Ordering grammar rejects a blank line between a content block and the next section:** The grammar accepts only the layout without a blank line, which is the less common one, and contradicts the corpus.
- **Ordering grammar accepts more than one extra section:** The grammar accepts a document the prose forbids. The prose is clear, so the effect is small.
- **Observations rule is ambiguous on blank lines after the first block:** None on the result. A parser generator that rejects ambiguous grammars rejects this rule.
- **Ordering puts the epilogue after its sections; the base puts special sections after the epilogue:** An author following the base document writes the epilogue before `## [accept]` and gets a `parse-error`. Readers cannot tell which document is normative.

## Suggested fix

- **Ordering tag rule rejects an indented tag:** Start `ordering` with `ws?`, as `answer` of numeric.md does, and do the same for the short-answer and essay rules.
- **Ordering grammar rejects a blank line between a content block and the next section:** Allow blank lines before each section: `ordering : "[" "ordering" "]" nl content (nl* section)*`, or state in the prose that `md_code_block` and `md_ul` include the blank lines after them.
- **Ordering grammar accepts more than one extra section:** Express the limit in the grammar, for example `ordering : ... nl content (accept_or_reject)* (ordering_extra (accept_or_reject)*)?`, or add a note under the snippet that the limit is not in the grammar.
- **Observations rule is ambiguous on blank lines after the first block:** Use `feedback (nl* comment)? nl*` and `comment (nl* feedback)? nl*`.
- **Ordering puts the epilogue after its sections; the base puts special sections after the epilogue:** Make question-base.md describe the type-specific sections as part of the body (or as coming before the epilogue), and add the epilogue to the ordering grammar.

## Acceptance criteria

- [ ] The rule accepts every valid ordering example in the corpus
- [ ] `## [extra]` twice is rejected by the grammar
- [ ] question-base.md and ordering.md agree on where the epilogue goes

--- END ISSUE 9 ---

--- ISSUE 10 ---
# [Spec] Ordering: define "the same lines" and which matching section wins

**Labels:** high, medium

## Problem

"Hold the same lines" can mean a multiset, which would forbid most questions with accept and reject sections. When several sections match one response, the spec does not say whose feedback is shown. Recommended: say "the same sequence of lines" everywhere, and show the feedback of the first matching section in document order.

## Evidence

- `docs/question-types/ordering.md:208-212`: "Hold the same lines" can mean the same multiset or the same sequence

  ```
  A question SHOULD NOT declare two sections whose content
  blocks hold the same lines once **all forms of normalization** have been
  applied
  ```
- `docs/question-types/ordering.md:296-298`: Feedback is undefined when a response matches several sections

  ```
  A response that matches an accepted or a rejected answer shows that section's
  feedback, if it declares one.
  ```

## Impact

- **"Hold the same lines" can mean the same multiset or the same sequence:** An implementation that reads it as a multiset raises a critical `accept-reject-overlap` on valid questions.
- **Feedback is undefined when a response matches several sections:** Implementations show different feedback for the same response.

## Suggested fix

- **"Hold the same lines" can mean the same multiset or the same sequence:** Write "the same sequence of lines (same lines, same order)" in the prose, in the three Additional Rules rows and in lint-codes.md.
- **Feedback is undefined when a response matches several sections:** State a precedence rule, for example: the `[ordering]` block first, then sections in document order; the first match decides the score and the feedback.

## Acceptance criteria

- [ ] ordering.md, its Additional Rules table and lint-codes.md use "the same sequence of lines"
- [ ] ordering.md states which feedback is shown when several sections match

--- END ISSUE 10 ---

--- ISSUE 11 ---
# [Spec] Ordering: constrain alternatives and responses to the line pool

**Labels:** medium, low

## Problem

Nothing ties `## [accept]`/`## [reject]` lines, or response lines, to the lines shown to the student. A typo makes an alternative unreachable; a reject equal to the answer key has no outcome; a response with a foreign line or a changed level under `fixed` is neither malformed nor wrong.

## Evidence

- `docs/question-types/ordering.md:203-212`: No rule ties accepted and rejected orderings to the lines shown to the student

  ```
  The accept/reject blocks start with a `## [accept]` or `## [reject]` header,
  followed by optional observations and the content block.
  ```
- `docs/responses.md:187-190`: A response that changes a level under `fixed` has no defined outcome

  ```
  The indentation level is always present. Under `indentation: fixed` it is the
  authored level, which the student cannot change
  ```

## Impact

- **No rule ties accepted and rejected orderings to the lines shown to the student:** A typo in an alternative makes it unreachable without any diagnostic. A reject that equals the answer key has no defined outcome.
- **A response that changes a level under `fixed` has no defined outcome:** One implementation rejects the response as malformed, another grades it 0 or leaves it pending.

## Suggested fix

- **No rule ties accepted and rejected orderings to the lines shown to the student:** Add rules: alternative lines must come from the presented pool (lint, warning); a reject must not equal the answer key (critical).
- **A response that changes a level under `fixed` has no defined outcome:** State that a response line whose text and level are not in the presented pool, or that is used more often than provided, is a malformed response (`ResponseError`).

## Acceptance criteria

- [ ] A lint reports an alternative line outside `[ordering]` plus `## [extra]`
- [ ] A reject equal to the answer key after normalization is a critical error
- [ ] responses.md states that a foreign line, a surplus copy, or a changed level under `fixed` is a malformed response

--- END ISSUE 11 ---

--- ISSUE 12 ---
# [Spec] Ordering: define line text, levels and indentation unit

**Labels:** high, medium, low

## Problem

The spec does not define the level of a `ul` line, tab expansion, the level of a blank line, the step offered under `strict`, or whether list markers and trailing whitespace belong to the text. Recommended: `text` content is always level 0, tabs expand to the next multiple of 4, trailing whitespace is stripped, and one step is one unit.

## Evidence

- `docs/question-types/ordering.md:261-266`: Indentation of `ul` lines is not defined

  ```
  The **indentation unit** is inferred from the lines of the question. It
  considers all lines in the `[ordering]`, `## [extra]`, `## [accept]` and
  `## [reject]` blocks, normalizes a tabulation as 4 spaces, and takes the
  greatest common divisor of the leading whitespace of every non-blank line that
  is indented at all.
  ```
- `docs/question-types/ordering.md:261-272`: Indentation step offered to the student under `strict` is not defined

  ```
  A line's **indentation level** is its leading whitespace divided by that unit,
  and that level -- not the raw whitespace -- is what a response carries and
  what `"strict"` compares.
  ```
- `docs/question-types/ordering.md:165-166`: Whitespace and list markers in line text are not specified

  ```
  If it is a `ul` list, the question infers `content: "text"`. Each line is
  derived from the respective list item, preserving its markdown source verbatim.
  ```

## Impact

- **Indentation of `ul` lines is not defined:** Two implementations give different `[level, text]` pairs for the same `ul` question, so the same response grades differently.
- **Indentation step offered to the student under `strict` is not defined:** Under `strict`, a student who indents a loop body once submits level 1 while the key expects level 2; responses stored before a section was added stop matching.
- **Whitespace and list markers in line text are not specified:** A line with a trailing space can be different from the same line without it in one implementation and equal in another.

## Suggested fix

- **Indentation of `ul` lines is not defined:** State that `text` content is always at level 0 (nested lists are a `parse-error`), or define levels from list nesting. Define tab expansion and the level of a blank line.
- **Indentation step offered to the student under `strict` is not defined:** State that the interface moves a line by one unit per step and renders levels with the inferred unit, or derive the unit from the `[ordering]` block alone and lint other sections that do not fit it.
- **Whitespace and list markers in line text are not specified:** State that the text excludes the marker and its following whitespace, and whether trailing whitespace is stripped for both content types.

## Acceptance criteria

- [ ] ordering.md defines text and level for code lines and `ul` items
- [ ] Tab expansion and blank-line levels are defined
- [ ] A corpus example covers a nested `ul`

--- END ISSUE 12 ---

--- ISSUE 13 ---
# [Spec] Ordering: clarify `content`, `highlight` and fence languages

**Labels:** medium, low

## Problem

A declared `content` that disagrees with the body block has no defined effect, the schema's `default: text` is undocumented, fence languages in accept/reject sections are not addressed, and essay calls the same field `input`. Recommended: make a mismatch a `parse-error`, document the default, ignore fence languages in every section, and pick one name for the field across essay and ordering.

## Evidence

- `docs/question-types/ordering.md:106-108`: Declared `content` that disagrees with the body block has no meaning

  ```
  [^1]: `content = "code" | "text"`. Both fields are OPTIONAL, and when given
  they override what the body implies.
  ```
- `docs/question-types/ordering.md:193-194`: Language of `## [accept]` and `## [reject]` fences is not addressed

  ```
  The highlight of fenced code blocks is ignored.
  ```
- `docs/question-types/ordering.md:100-101, docs/question-types/essay.md:21-22`: Ordering `content` and essay `input` declare the same code/text choice under different names

  ```
  | content        | string          | Either "code" or "text". Inferred from the body when omitted[^1].          |
  ```

## Impact

- **Declared `content` that disagrees with the body block has no meaning:** Implementations can accept, reject, or reinterpret the same document.
- **Language of `## [accept]` and `## [reject]` fences is not addressed:** A different fence language in an alternative can be accepted, warned or rejected depending on the implementation.
- **Ordering `content` and essay `input` declare the same code/text choice under different names:** Authors must remember two names for one concept, and a code ordering question without a language gets no notice while an essay does.

## Suggested fix

- **Declared `content` that disagrees with the body block has no meaning:** Make a mismatch between declared `content` and the body block a `parse-error` (or a warning with a defined effect). Document the `text` default for documents written as YAML/JSON.
- **Language of `## [accept]` and `## [reject]` fences is not addressed:** Move the sentence to the Body section and make it apply to every section after `[ordering]`.
- **Ordering `content` and essay `input` declare the same code/text choice under different names:** Use one field name for both types, or document the difference; add the missing-highlight info lint to ordering or remove it from essay.

## Acceptance criteria

- [ ] `content: text` over a code block has a defined outcome with a corpus example
- [ ] The prose documents the `text` default
- [ ] Ordering and essay use the same field name for the code/text choice

--- END ISSUE 13 ---

--- ISSUE 14 ---
# [Spec] Ordering: align `unmatched`, manual scores and grading examples

**Labels:** medium

## Problem

Ordering defaults `unmatched` to `manual` although it always has an answer key, while short-answer defaults to `incorrect` in that case. The binary score rule does not say whether it binds a manual score. No grading corpus exists for ordering. Recommended: default to `incorrect` like short-answer, limit the binary rule to automatic grading, and add examples/grading/ordering.yaml.

## Evidence

- `docs/question-types/ordering.md:118-120, docs/question-types/short-answer.md:266-267`: `unmatched` defaults differ between ordering and short-answer

  ```
  [^4]: `Unmatched = "manual" | "incorrect"`. `"manual"` (the default) leaves a
  ```
- `docs/question-types/ordering.md:326-332`: Ordering score is "always binary" but a pending response is scored by hand

  ```
  The score is always binary -- `1` or `0`, with no partial credit for a nearly
  correct ordering.
  ```
- `docs/question-types/ordering.md:308-332`: No grading examples for ordering in the corpus

  ```
  Grading compares the response to the answer keys **by content**: lines carry no
  ```

## Impact

- **`unmatched` defaults differ between ordering and short-answer:** An author who learns `unmatched` on short-answer expects unmatched ordering responses to score 0 by default; instead they stay pending and need manual grading.
- **Ordering score is "always binary" but a pending response is scored by hand:** A host may refuse a partial manual score that another host accepts.
- **No grading examples for ordering in the corpus:** The grading rules of ordering, the most complex among the automatically graded types, are not checked by the shared test suite, so the Python and TypeScript implementations can diverge.

## Suggested fix

- **`unmatched` defaults differ between ordering and short-answer:** Use one default rule for `unmatched` across types, or state in ordering.md why its default differs from short-answer.
- **Ordering score is "always binary" but a pending response is scored by hand:** State that the binary rule applies to automatic grading only, and that a manual score is any value in [0, 1] (or restrict it explicitly).
- **No grading examples for ordering in the corpus:** Add examples/grading/ordering.yaml covering each normalization, each indentation mode, duplicates, distractors, and both `unmatched` values.

## Acceptance criteria

- [ ] Ordering and short-answer state the same default rule for `unmatched`
- [ ] ordering.md says what range a manual score may take
- [ ] examples/grading/ordering.yaml covers dedent, skip-blanks, duplicates, distractors and unmatched

--- END ISSUE 14 ---

--- ISSUE 15 ---
# [Spec] Ordering: document the body-to-AST mapping

**Labels:** medium, low

## Problem

The prose never says the blocks become `lines`, `extra`, `accept` and `reject`, nor how `>` and `!` blocks become `feedback` and `comment`. The schema requires a non-empty `extra`, which the rules table does not state.

## Evidence

- `docs/question-types/ordering.md:133-136, docs/question-types/ordering.md:354-358`: Mapping from the ordering body to `lines`, `extra`, `accept` and `reject` is not specified

  ```
  | lines                 | critical | schema-error                 | must have at least two lines (schema)                             |
  ```
- `schema/ordering.yaml:130-136, docs/question-types/ordering.md:357`: Schema requires a non-empty `extra`, the spec has no such rule

  ```
    Lines:
      type: array
      title: Lines
      description: A sequence of lines, in the order they are meant to be read.
      items:
        "$ref": "#/$defs/Line"
      minItems: 1
  ```

## Impact

- **Mapping from the ordering body to `lines`, `extra`, `accept` and `reject` is not specified:** Readers must reverse-engineer the YAML/JSON form from the schema and the corpus; the feedback and comment text can be serialized differently by two implementations.
- **Schema requires a non-empty `extra`, the spec has no such rule:** An empty `## [extra]` and an empty `## [accept]` are handled differently, and the spec explains neither the rule for `extra` nor what happens to an empty section in Markdown.

## Suggested fix

- **Mapping from the ordering body to `lines`, `extra`, `accept` and `reject` is not specified:** Add a short paragraph or a YAML example that shows the parsed form of the full example, and state how feedback and comment text is extracted.
- **Schema requires a non-empty `extra`, the spec has no such rule:** Add an Additional Rules row for `extra` and say whether an empty section is dropped or is an error, for every section.

## Acceptance criteria

- [ ] ordering.md maps each block to its field and describes the alternative object
- [ ] The Additional Rules table lists the `extra` minimum, or the schema drops it

--- END ISSUE 15 ---

--- ISSUE 16 ---
# [Spec] Ordering: settle presentation details

**Labels:** low

## Problem

Indented blockquotes in observations are left to the implementation, and "never shown that order" conflicts with a random shuffle that can reproduce the key.

## Evidence

- `docs/question-types/ordering.md:234-237`: Indented blockquotes in observations are implementation-defined

  ```
  It is up to the implementation to decide if it should ignore the indentation,
  issue a warning or even an error.
  ```
- `docs/question-types/ordering.md:7-9`: "Never shown that order" conflicts with a random shuffle

  ```
  Students are never shown that order --
  implementations MUST present the lines shuffled, in a random or pseudo-random
  arrangement
  ```

## Impact

- **Indented blockquotes in observations are implementation-defined:** Portability of documents between implementations.
- **"Never shown that order" conflicts with a random shuffle:** An implementation that follows "random" literally can show the solution.

## Suggested fix

- **Indented blockquotes in observations are implementation-defined:** Fix one behavior: accept up to 3 spaces of indentation, as CommonMark does, and lint it.
- **"Never shown that order" conflicts with a random shuffle:** Say that implementations MUST NOT present the answer key's order, and reshuffle when the permutation equals it.

## Acceptance criteria

- [ ] ordering.md fixes one behavior for indented `>` and `!` lines
- [ ] ordering.md says whether a shuffle equal to the answer key must be redone

--- END ISSUE 16 ---
