--- ISSUE 1 ---
# [Spec] Define numeric values and the tolerance test in exact arithmetic

**Labels:** high, medium

## Problem

The tolerance test, the reading of float responses, the inference of domain and decimalPlaces from YAML values, and the base of the relative tolerance are not defined. Options: (a) recommended: every number (answer, response, tolerances) is an exact rational; a float is read by its shortest round-trip decimal form; inference reads that form (a whole number with no decimals is integer); the relative tolerance uses the answer before rounding; tolerances are not rounded. (b) Allow floating point and add an epsilon to the comparison; simpler to implement but the vectors and the 2.675 example must change.

## Evidence

- `docs/question-types/numeric.md:151-157`: The arithmetic of the tolerance test is not defined

  ```markdown
  * Absolute tolerance: The response is accepted if `|answer - response| ≤ abstol`.
  ```
- `docs/question-types/numeric.md:162-164`: How a float response is read before decimal rounding is not defined

  ```markdown
  many decimal places, half away from zero, in decimal arithmetic (never in
  binary floating point: `2.675` rounds to `2.68`). A response with more digits
  ```
- `docs/question-types/numeric.md:117-118, docs/question-types/numeric.md:169-173`: decimalPlaces is inferred only from a Markdown body

  ```markdown
  When the frontmatter does not give `decimalPlaces` and the domain is
  `decimal`, it is inferred from the body: the larger of the number of decimal
  ```
- `docs/question-types/numeric.md:155-157`: The relative tolerance is not defined against the rounded or the unrounded answer

  ```markdown
  If both tolerances are defined, a response is accepted if it passes ANY of those
  criteria. When the domain is `decimal`, the response and the answer are first
  rounded to [`decimalPlaces`](#decimal-places).
  ```

## Impact

- **The arithmetic of the tolerance test is not defined:** Two implementations that both follow the text give different scores on the boundary of every decimal tolerance, which is where authors put their tolerances.
- **How a float response is read before decimal rounding is not defined:** A response sent as a number and the same response sent as a string can score differently, and so can two implementations.
- **decimalPlaces is inferred only from a Markdown body:** An implementation that leaves `decimalPlaces` unset for YAML input, or reads it from a float's full binary expansion, grades differently from the vectors.
- **The relative tolerance is not defined against the rounded or the unrounded answer:** Implementations can accept different responses for the same question.

## Suggested fix

- **The arithmetic of the tolerance test is not defined:** State that the tolerance test is exact: the answer, the response and both tolerances are read as exact rationals (a decimal as written, a float by its shortest decimal form), and the comparison is done on these rationals.
- **How a float response is read before decimal rounding is not defined:** In responses.md and numeric.md, state that a number response is read as the shortest decimal string that round-trips to the same double, and that this decimal is the value used for rounding and for the tolerance test.
- **decimalPlaces is inferred only from a Markdown body:** Define both inferences over the answer and the absolute tolerance as values: a string by its digits as written, a number by its shortest decimal form (an integer counts 0 places).
- **The relative tolerance is not defined against the rounded or the unrounded answer:** State which value the relative tolerance uses (for example, the answer before rounding), and whether the tolerances are rounded; add a grading vector for it.

## Acceptance criteria

- [ ] numeric.md states the arithmetic of rounding and of the tolerance test
- [ ] responses.md states how a number response is read
- [ ] Inference of domain and decimalPlaces is defined for YAML/JSON values
- [ ] Grading vectors cover a relative tolerance with rounding and a float on a tolerance boundary

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] Specify the valid answer and response values for each domain

**Labels:** medium, low

## Problem

responses.md gives examples but no rule for which response forms each domain accepts, and the answer can be infinite or NaN. Recommended: a table in responses.md (domain x form: integer, decimal, fraction, number, string) that states valid or malformed, the string grammar of a response, and that answer, response and tolerances are finite.

## Evidence

- `docs/responses.md:110-123, docs/responses.md:141-143`: The response forms accepted by each domain are not specified

  ```markdown
  A string carries an exact rational, which no float can represent. It MUST be
  used when the question's `domain` is `fraction` and the value is not exactly
  representable as a decimal:
  ```
- `docs/responses.md:118-119`: Unclear sentence about decimal string responses

  ```markdown
  The response of a decimal value may also be represented as a string, which
  MAY signal the system to use decimal arithmetic instead of floating point. The string MUST be a valid decimal.
  ```
- `docs/question-types/numeric.md:107-108`: Non-finite answers (infinity, NaN) are not excluded

  ```markdown
  A document written directly as JSON/YAML/dict, rather than parsed from
  Markdown, can choose freely between numeric and string representations.
  ```

## Impact

- **The response forms accepted by each domain are not specified:** Implementations disagree on which responses are malformed and which are scored, which changes the student's grade or the error the host gets.
- **Unclear sentence about decimal string responses:** Readers can think that a number response is graded in floating point.
- **Non-finite answers (infinity, NaN) are not excluded:** Implementations behave differently on such documents: the reference one crashes instead of reporting a diagnostic.

## Suggested fix

- **The response forms accepted by each domain are not specified:** Add a table to responses.md, "Numeric": for each domain, which response forms are valid (integer, decimal, fraction, number, string) and which are malformed, with the string grammar (`sign? value` of numeric.md or a stated extension).
- **Unclear sentence about decimal string responses:** Rewrite: a decimal response can also be a string; it is read as the exact decimal it spells.
- **Non-finite answers (infinity, NaN) are not excluded:** State that `answer` and the tolerances are finite numbers, and give the error code for a non-finite value.

## Acceptance criteria

- [ ] responses.md has the table and the string grammar
- [ ] Non-finite answers have an error code and a corpus case
- [ ] Vectors cover each malformed cell

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Decide how numeric responses with units are graded

**Labels:** high, medium, low

## Problem

A foreign unit is both malformed and scored 0, conversion is MAY, a bare number for a question with a unit is not covered, and the unit string of a tag is not defined under markdown escapes. Options: (a) recommended: the unit of a response must equal the declared unit (exact string after NFC) or be absent (a bare number is in the declared unit); anything else is malformed; conversion is host behavior outside grading; the tag is read as source text. (b) Define compatible units and conversions in the spec.

## Evidence

- `docs/responses.md:133-142`: A response with a foreign unit is both malformed and scored 0

  ```markdown
  Implementations MAY do unit conversions and rewrite the response to a canonical
  form, but they MUST reject a response with a unit that is not compatible with
  the question's unit with grade zero.
  ```
- `examples/grading/numeric.yaml:1-20`: No grading vector covers units

  ```yaml
  #   examples: { response: number | string, score: 0 | 1 | "malformed" }[]
  ```
- `docs/references/grammar.md:89`: UNIT does not say if a markdown escape or code span in the unit is source text

  ```lark
  UNIT         : /[^()\[\]\t\n\v\f\r \x85\xa0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/
  ```

## Impact

- **A response with a foreign unit is both malformed and scored 0:** The same response gets a score in one implementation and an error in another.
- **No grading vector covers units:** The unit rules of responses.md have no shared test, so implementations can drift.
- **UNIT does not say if a markdown escape or code span in the unit is source text:** Two implementations can store different `unit` strings for the same tag.

## Suggested fix

- **A response with a foreign unit is both malformed and scored 0:** Decide one rule: (a) a unit other than the declared one is always malformed, and conversion is outside the spec; or (b) define compatible units and the conversion, and malformed only for incompatible ones. State that a bare number is in the declared unit, and how units compare.
- **No grading vector covers units:** After the unit rule is decided, add the `{value, unit}` form to the header and vectors for each case.
- **UNIT does not say if a markdown escape or code span in the unit is source text:** State that the tag line, including the unit, is read as source text with no markdown inline processing, or exclude `\` and the backtick from `UNIT`.

## Acceptance criteria

- [ ] One rule for a foreign unit
- [ ] A bare number for a question with a unit is defined
- [ ] The unit of a tag is defined as source text or escapes are excluded
- [ ] Vectors with the {value, unit} form

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Align the numeric diagnostics for domain and tolerance

**Labels:** medium, low

## Problem

A non-whole answer under integer gets two codes, under fraction only an info despite a SHOULD; missing-tolerance fires on exact fractions; Additional Rules has rows the prose does not state and SHOULD rules of the parser output have no row. Recommended: answer-outside-domain covers a non-whole answer under integer and fraction (warning, 'should'); domain-mismatch covers only the absolute tolerance; missing-tolerance only for decimal; the Tolerances section states the non-negative and percentage rules; Answer representation says its rules apply to the parser output and have no diagnostic.

## Evidence

- `docs/question-types/numeric.md:210, docs/question-types/numeric.md:214`: A non-whole answer of an integer question gets two diagnostics

  ```markdown
  | answer             | warning  | answer-outside-domain          | must be a whole number when `domain` is "integer"[^6]              |
  ```
- `docs/question-types/numeric.md:218, docs/question-types/numeric.md:229-230`: missing-tolerance fires on fraction answers, where an exact match is meaningful

  ```markdown
  | tolerance          | info     | missing-tolerance              | is not defined for a `decimal` or `fraction` answer[^5]            |
  ```
- `docs/question-types/numeric.md:111-113`: A non-whole answer under domain fraction is a SHOULD, but only an info diagnostic

  ```markdown
  When `domain` is `fraction`, such a document SHOULD give `answer` as a
  fraction string (`"3/4"`) or as an integer (`2` or `"2"`). A number that is
  not whole, such as `0.75`, is a decimal and contradicts the domain.
  ```
- `docs/question-types/numeric.md:211-218`: Additional Rules has rows that the prose does not state

  ```markdown
  | tolerance.absolute | error    | schema-error                   | must not be negative (schema)                                      |
  ```
- `docs/question-types/numeric.md:90-91, docs/question-types/numeric.md:100-102`: SHOULD rules of Answer representation are not in Additional Rules

  ```markdown
  An integer number like `42` or `-1` SHOULD be coerced to an integral value.
  It SHOULD be kept as a string if it is not representable in the 32-bit signed
  integer range.
  ```
- `docs/question-types/numeric.md:152-153`: The Tolerances section does not map a percentage to tolerance.relative

  ```markdown
  where tol is calculated as `|answer| × percentage_number ÷ 100`.
  ```

## Impact

- **A non-whole answer of an integer question gets two diagnostics:** Duplicate diagnostics, or implementations that report only one of them; corpus lint files cannot tell which is right.
- **missing-tolerance fires on fraction answers, where an exact match is meaningful:** Every exact fraction question gets a lint that suggests a change that turns it into a decimal question.
- **A non-whole answer under domain fraction is a SHOULD, but only an info diagnostic:** Two cases with the same text ("contradicts the domain") get different severities, and the SHOULD has no warning.
- **Additional Rules has rows that the prose does not state:** A reader of the prose does not learn these rules; the table is the only source.
- **SHOULD rules of Answer representation are not in Additional Rules:** The requirement levels in the text and in the table do not agree.
- **The Tolerances section does not map a percentage to tolerance.relative:** An author who writes YAML can put `5` for 5%, which accepts a response 500% off (only an info diagnostic reports it).

## Suggested fix

- **A non-whole answer of an integer question gets two diagnostics:** Decide which code covers the answer and which covers the tolerance (for example, `answer-outside-domain` for the answer, `domain-mismatch` only for a decimal absolute tolerance under `integer`/`fraction`), and use "should" for a warning.
- **missing-tolerance fires on fraction answers, where an exact match is meaningful:** Restrict `missing-tolerance` to the `decimal` domain, or rewrite the footnote with a reason that holds for fractions.
- **A non-whole answer under domain fraction is a SHOULD, but only an info diagnostic:** Decide one level for a non-whole answer under a narrower domain: extend `answer-outside-domain` to `fraction`, or change the SHOULD to MAY.
- **Additional Rules has rows that the prose does not state:** Add the rules to the "Tolerances" section: both tolerances are non-negative, a relative tolerance is a fraction (`5%` is `0.05`), and a relative tolerance around a zero answer and a missing tolerance on a decimal answer are flagged.
- **SHOULD rules of Answer representation are not in Additional Rules:** State that the rules of "Answer representation" apply to the parser output and have no diagnostic, or reword them without RFC 2119 keywords.
- **The Tolerances section does not map a percentage to tolerance.relative:** State that `+- p%` is stored as `tolerance.relative: p / 100` and give the formula as `|answer - response| ≤ |answer| × relative`.

## Acceptance criteria

- [ ] Each defect has one code and one level
- [ ] Every Additional Rules row is stated in the prose
- [ ] Corpus lint files follow the new rows

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Decide whether numeric questions have feedback

**Labels:** medium

## Problem

Numeric has no feedback for an incorrect response. Options: (a) recommended: add `incorrectFeedback`, as short-answer and fill-in blanks; (b) also add `reject` values with tolerance and feedback for known wrong answers; (c) state that numeric has no feedback by design.

## Evidence

- `docs/question-types/numeric.md:192-202`: Numeric questions have no feedback for responses

  ```markdown
  Grading is binary: a response inside the accepted tolerance scores 1, and any
  other response scores 0.
  ```

## Impact

Authors move numeric questions to short-answer regexes to give feedback, and lose tolerance and domain checks.

## Suggested fix

Either state that numeric has no feedback by design, or add `incorrectFeedback` (as in short-answer and the blanks of fill-in) and, optionally, `reject` values with tolerance and feedback.

## Acceptance criteria

- [ ] numeric.md states the decision
- [ ] If added: schema, frontmatter table and vectors

--- END ISSUE 5 ---

--- ISSUE 6 ---
# [Spec] Numeric blanks of fill-in: indentation, domain and decimalPlaces

**Labels:** medium

## Problem

numeric_def has no leading ws?, and a Markdown numeric blank cannot set domain or decimalPlaces. Recommended: add ws?; add frontmatter maps blank id -> domain and blank id -> decimalPlaces, as for incorrectFeedback (or state the limit).

## Evidence

- `docs/question-types/fill-in.md:158, docs/question-types/fill-in.md:201`: numeric_def has no leading ws?, unlike the numeric answer and the other blank definitions

  ```lark
  numeric_def      : "[^" SLUG "/numeric" unit? "]" ws? ":" ws? numeric_body
  ```
- `docs/question-types/fill-in.md:204-209`: A numeric blank in Markdown cannot declare domain or decimalPlaces

  ```markdown
  The `numeric_body` and `unit` non-terminals represent, respectively, a numeric
  value with tolerance and an optional unit of measurement. Both are defined in
  the [body](numeric.md#body) section of the numeric question type. The `blank`
  ```

## Impact

- **numeric_def has no leading ws?, unlike the numeric answer and the other blank definitions:** An indented numeric blank definition is a parse error by the grammar while the same indentation is valid on the other definitions. Implementations can disagree on which reading to follow.
- **A numeric blank in Markdown cannot declare domain or decimalPlaces:** An author cannot write a decimal blank with an integer answer (`42` in a `decimal` domain), or set the precision of a blank, in Markdown. The YAML form can express questions that the Markdown form cannot.

## Suggested fix

- **numeric_def has no leading ws?, unlike the numeric answer and the other blank definitions:** Add `ws?` at the start of `numeric_def` in both snippets, or remove it from all definitions and state the indentation rule once.
- **A numeric blank in Markdown cannot declare domain or decimalPlaces:** Either state that a Markdown numeric blank always uses the inferred domain and places, or add a frontmatter map (blank id to `domain`/`decimalPlaces`), as fill-in already does for `preAccept` and `incorrectFeedback`.

## Acceptance criteria

- [ ] numeric_def starts with ws?
- [ ] fill-in.md states how a Markdown blank sets domain and decimalPlaces

--- END ISSUE 6 ---

--- ISSUE 7 ---
# [Spec] Limit the indentation of ws? at the start of a block

**Labels:** medium

## Problem

grammar.md limits leading ws? to three spaces only inside list items. Recommended: state the same limit (tabs expanded) for ws? at the start of any block, as CommonMark does.

## Evidence

- `docs/references/grammar.md:59-62`: ws? at the start of a block has no limit of three spaces

  ```
  When a rule starts with `ws?` at the start of a block, implementations MUST
  read the source text and accept only spaces and tabs there.
  ```

## Impact

An implementation that applies the grammar to the source text accepts an indented code block as the answer. An implementation that uses the CommonMark block structure rejects it. The same document gives a question or a parse error.

## Suggested fix

State in grammar.md:59-62 that `ws?` at the start of a block stands for at most three spaces, with tabs expanded as in grammar.md:70-71, the same as for a list item.

## Acceptance criteria

- [ ] grammar.md states the limit
- [ ] A corpus case with four spaces before a numeric tag

--- END ISSUE 7 ---

--- ISSUE 8 ---
# [Spec] Explain rejected number spellings

**Labels:** info

## Problem

U+2212, `±`, the decimal comma, digit group spaces and exponents are a plain parse-error. Options: (a) recommended: list them in Body and add a lint hint for U+2212, `±` and the decimal comma; (b) accept some of them.

## Evidence

- `docs/question-types/numeric.md:68-74`: Common number spellings are a bare parse-error with no lint to explain them

  ```lark
  numeric_body : ws? sign? value tolerances? ws?
  ```

## Impact

Authors who write Brazilian or typographic number forms get a generic parse-error.

## Suggested fix

List the rejected forms in the Body section, and consider a lint code with a hint for U+2212, `±` and the decimal comma.

## Acceptance criteria

- [ ] Body lists the rejected forms
- [ ] If a hint is added, it is in lint-codes.md and the corpus

--- END ISSUE 8 ---

--- ISSUE 9 ---
# Mechanical fixes

**Labels:** mechanical, high, low

## Problem

Each fix below follows from its finding and needs no design decision, so they can be applied together in one pass and reviewed by reading the diff. Severity still applies: a mechanical fix can matter a lot.

### F12 (high): The fraction rule accepts a zero denominator that the corpus rejects as parse-error

`docs/question-types/numeric.md:78, docs/question-types/numeric.md:109-110`

```lark
fraction     : INTEGER "/" INTEGER
```

**Suggested fix:** Use a terminal with no zero for the denominator, for example `fraction : INTEGER "/" DENOMINATOR` with `DENOMINATOR : /[1-9][0-9]*/`, as the schema pattern and the corpus already do.

### F7 (low): Schema descriptions of decimalPlaces and relative disagree with the spec

`schema/numeric.yaml:48-50, schema/numeric.yaml:86-89`

```yaml
The number of decimal places used in the decimal value representation.
```

**Suggested fix:** Copy the definitions of numeric.md: "the precision of the comparison: the response and the answer are rounded to this many places" and `|submitted - answer| <= |answer| * relative`.

### F15 (low): numeric_def gives two ws? in a row, which makes the grammar ambiguous

`docs/question-types/fill-in.md:158, docs/question-types/fill-in.md:201`

```lark
numeric_def : "[^" SLUG "/" "numeric" unit? "]" ws? ":" ws? numeric_body
```

**Suggested fix:** Remove the `ws?` after `":"` in `numeric_def`, as `answer` does.

### F16 (low): The two numeric_def snippets of fill-in.md are written differently

`docs/question-types/fill-in.md:158, docs/question-types/fill-in.md:201`

```lark
numeric_def : "[^" SLUG "/" "numeric" unit? "]" ws? ":" ws? numeric_body
```

**Suggested fix:** Use the same text in both snippets, or keep the rule in one place and refer to it.

### F24 (low): The intro says that a numeric question always declares a tolerance

`docs/question-types/numeric.md:5-6, docs/question-types/numeric.md:36-37`

```markdown
Numeric questions expect a single numeric answer. They declare both the correct
answer and tolerance.
```

**Suggested fix:** Write "the correct answer and, optionally, a tolerance" in both places.

### F29 (low): Schema description of domain omits inference and its effect

`schema/numeric.yaml:43`

```yaml
description: The domain/kind of number for the response.
```

**Suggested fix:** Describe `domain` as in numeric.md: inferred when absent (integer < fraction < decimal, the widest of the answer and the absolute tolerance), and it decides which responses are valid.

## Acceptance criteria

- [ ] F12: The fraction rule accepts a zero denominator that the corpus rejects as parse-error
- [ ] F7: Schema descriptions of decimalPlaces and relative disagree with the spec
- [ ] F15: numeric_def gives two ws? in a row, which makes the grammar ambiguous
- [ ] F16: The two numeric_def snippets of fill-in.md are written differently
- [ ] F24: The intro says that a numeric question always declares a tolerance
- [ ] F29: Schema description of domain omits inference and its effect

--- END ISSUE 9 ---
