---
type: issue
status: active
tags: [mdq, audit, spec, numeric]
relatedTo: [dev/audit2/brief.md]
---
# Findings: numeric

## Summary
- Checked 44 valid examples (31 `.mdq.md` + 13 YAML-only), 17 `invalid/numeric-*`, 0 `model-only/numeric-*` (none exist), 14 grading questions / 51 responses.
- Domain and `decimalPlaces` recomputed for every Markdown example: all correct; every decimal `.yaml` carries `decimalPlaces`. Lint severities and paths match `docs/lint-codes.md`.
- Conformance breaks: `numeric-zero-denominator` pins `parse-error` though the grammar accepts `1/0`; grading pins decimal-arithmetic tolerance results the spec does not require; corpus pins one of the representations the spec leaves as MAY/SHOULD.
- Main gaps: grading has no `null`, no unit struct, no malformed string, no `3.0`/`"6/2"` on integer, no negative rounding, no relative tolerance on a decimal question. responses.md contradicts itself on a mismatched unit (grade 0 vs malformed). Domain/`decimalPlaces` inference for YAML-written documents is undefined.

## Conformance findings

### NUM-C1 `1/0` in Markdown is grammatical, corpus pins `parse-error` (severity: high)
- Files: `examples/invalid/numeric-zero-denominator.mdq.md`, `.lint.json`
- Spec: `docs/question-types/numeric.md` "Body": `fraction : INTEGER "/" INTEGER`; `docs/references/grammar.md` "Tokens": `INTEGER : /[1-9][0-9]*|0/`. The zero-denominator rule appears only under "Answer representation", in the paragraph on "A document written directly as JSON/YAML/dict": "a fraction's denominator MUST NOT be zero". `docs/lint-codes.md` "Load errors" `schema-error`: "A rule with a code in the "Errors" table above reports that code instead."
- Problem: `[numeric]: 1/0` matches the grammar. A parser following it produces `answer: "1/0"`, which fails the schema pattern, so the code is `malformed-numeric-answer` at `["answer"]` (same as `numeric-malformed-fraction-answer.lint.json`), not `parse-error` at `[]`.
- Fix: either change the grammar (`fraction : INTEGER "/" NONZERO_INTEGER`, `NONZERO_INTEGER : /[1-9][0-9]*/`) and keep `parse-error`, or change the lint file to `malformed-numeric-answer` / `["answer"]`. The grammar change is cleaner.

### NUM-C2 Grading pins decimal-arithmetic tolerance test; spec requires decimal only for rounding (severity: high)
- Files: `examples/grading/numeric.yaml` "Fraction with tolerance" (`0.34` -> 1, `0.32` -> 1)
- Spec: `numeric.md` "Decimal places": "the response and the answer are rounded to that many decimal places, half away from zero, in decimal arithmetic (never in binary floating point". "Tolerances": "The response is accepted if `|answer - response| ≤ abstol`." No arithmetic is given for that test.
- Problem: after rounding, `|0.33 - 0.34|` in float is `0.010000000000000009 > 0.01` -> score 0; same for `0.32`. Only decimal subtraction gives the pinned 1. A float tolerance test with decimal rounding conforms to the text and fails the corpus.
- Fix: state in "Tolerances" that the tolerance test (subtraction, `|answer| x relative`, comparison) uses exact decimal/rational arithmetic, at least when the domain is `decimal` or `fraction`.

### NUM-C3 Corpus pins one representation the spec leaves optional (severity: high)
- Files: every valid numeric `.yaml` with a numeric `answer` (e.g. `tolerances.yaml` `answer: 3.14`, `negative.yaml` `-273.15`, `integer.yaml` `366`)
- Spec: `numeric.md` "Answer representation": "A value like `0.25` MAY be converted to a floating point number or kept as a decimal." "An integer number like `42` or `-1` SHOULD be coerced to an integral value." Brief: the `.yaml` "is the document a conforming parser MUST produce".
- Problem: a parser that keeps `"3.14"` (allowed by MAY) or `"366"` (allowed by SHOULD) produces a different document than the corpus. No sentence says the corpus compares answers by value.
- Fix: either make the conversion rules MUST (the corpus already follows one consistent rule), or state in base.md that a numeric `answer` is compared by value, not by JSON type.

### NUM-C4 Integer absolute tolerance emitted as `1.0` in some files, as an integer in others (severity: low)
- Files: `decimal-integer-tolerance.yaml`, `fraction-integer-tolerance.yaml`, `frontmatter-unit-wins.yaml` (`+- 1` -> `absolute: 1.0`) vs `unit.yaml` (`+- 5` -> `5`), `unit-non-ascii.yaml` (`+- 2` -> `2`)
- Spec: `numeric.md` "Number type/domain": domain is "inferred from how the value and the absolute tolerance are written". No rule fixes the representation of `tolerance.absolute`.
- Problem: inconsistent. Spelling matters for inference: re-inferring from `fraction-integer-tolerance.yaml` without `domain` would read `10/3` + `1.0` as `decimal`, not the pinned `fraction`.
- Fix: emit `absolute: 1` for an `INTEGER` tolerance in the three files, and say in "Answer representation" that the tolerance follows the same rules as the answer.

## Exhaustiveness gaps

### NUM-E1 Grading lacks skipped `null` (severity: medium)
- Spec: `docs/responses.md` "Skipping": "A response of `null` means the question was skipped. It scores 0".
- Missing: `{ response: null, score: 0 }` under "Exact integer". The header type `response: number | string` must also allow `null`.

### NUM-E2 Grading lacks the `{value, unit}` struct entirely (severity: medium)
- Spec: `responses.md` "Numeric": "the response can be a struct with a number and a unit"; "If the question does not declare a unit, then the response MUST be rejected as malformed."
- Missing: new question `{ answer: 1000, unit: g, tolerance: { absolute: 5 } }` with `{value: 1003, unit: g}` -> 1; and `{value: 1000, unit: g}` against `{ answer: 1000 }` (no unit) -> "malformed". The mismatched-unit row waits on NUM-S1.

### NUM-E3 Grading lacks malformed string responses (severity: medium)
- Spec: `responses.md` "Numeric": "The string MUST be a valid decimal."; "Errors": "a response the question cannot represent | `ResponseError`".
- Missing: under "Exact integer" / "Rounding to inferred decimal places": `"3,14"` (Brazilian decimal comma), `"1e3"`, `"abc"`, `"1/0"`, `"007"` -> "malformed". Requires NUM-S4 first.

### NUM-E4 Integer domain: whole decimal and whole fraction responses not pinned (severity: medium)
- Spec: `responses.md`: "A value the question cannot represent is a malformed response, never a wrong answer: a decimal where `domain` is `integer`". `numeric.md` [^3]: "The check reads values, not how a number is spelled in YAML or JSON, so `4.0` is whole." [^6]: "`"4/2"` is" whole.
- Missing: under "Declared integer domain": `5.0`, `"5.0"`, `"10/2"`. Each is either 1 (value read) or "malformed" (spelling read). Two readers resolve this differently; pin it.

### NUM-E5 No negative half-away-from-zero rounding (severity: medium)
- Spec: `numeric.md` "Decimal places": "rounded to that many decimal places, half away from zero".
- Missing: question `{ answer: -2.68, decimalPlaces: 2 }` with `-2.675` -> 1 and `-2.685` -> 0 (half-even or half-up would differ).

### NUM-E6 Relative tolerance never combined with rounding or a fraction answer (severity: medium)
- Spec: `numeric.md` "Tolerances": "When the domain is `decimal`, the response and the answer are first rounded"; tol = `|answer| ⨉ percentage_number ÷ 100`.
- Missing: grading `{ answer: 3.14, decimalPlaces: 2, tolerance: { relative: 0.01 } }` (tol from the rounded answer, boundary `3.1714`, `3.1086`); grading `{ answer: "1/3", tolerance: { relative: 0.03 } }` (fraction domain: `"34/100"` -> 1, `0.35` -> 0). Valid example `fraction-relative-tolerance.mdq.md`: `[numeric]: 1/3 +- 5%` -> `domain: fraction`, no `decimalPlaces`.

### NUM-E7 `reltol` with a `DECIMAL` percentage never exercised (severity: medium)
- Spec: grammar `reltol : "+-" ws? (INTEGER | DECIMAL) "%"`; "Decimal places": places come from "the value and ... the absolute tolerance" only.
- Missing: `decimal-relative-tolerance.mdq.md`: `[numeric]: 3.1 +- 2.5%` -> `relative: 0.025`, `decimalPlaces: 1` (a reltol's digits must not count). Also pins the parsed `relative` for `33.3%`: float `33.3/100` is `0.33299999999999996`, so the spec should say how the division is done.

### NUM-E8 Grading on fraction domain: no negative fraction, no integer-tolerance fraction question (severity: low)
- Spec: `numeric.md` "Number type/domain" row `fraction | integer | fraction`.
- Missing: `{ answer: "10/3", tolerance: { absolute: 1 } }` with `"13/3"` -> 1, `"14/3"` -> 0; `{ answer: "-1/3" }` with `"1/-3"` -> malformed, `"-2/6"` -> 1.

### NUM-E9 Invalid grammar cases not covered (severity: medium)
- Spec: `numeric.md` grammar; "The absolute tolerance is an `INTEGER` or a `DECIMAL`, never a fraction".
- Missing (each `examples/invalid/numeric-<name>.mdq.md` -> `parse-error`): `two-absolute-tolerances` (`3.14 +- 0.1 +- 0.2`), `fraction-tolerance` (`1/3 +- 1/100`), `space-after-sign` (`- 14`), `decimal-comma` (`3,14`, likely for Brazilian authors), `space-before-percent` (`3.14 +- 5 %`), `decimal-in-fraction` (`1.5/2`), `signed-denominator` (`1/-3`), `leading-zero-tolerance` (`26 +- 01`), `empty-body` (`[numeric]:`), `plus-minus-sign` (`3.14 ± 0.1`).

### NUM-E10 Invalid YAML/model cases not covered (severity: medium)
- Spec: `numeric.md` "Grading": "Numeric questions therefore take no `grading` field"; schema `domain` enum, `relative` `minimum: 0`, `decimalPlaces` `type: integer`, `Tolerance` `additionalProperties: false`; `lint-codes.md` `malformed-numeric-answer` for any bad string.
- Missing: `numeric-grading-field.yaml` (`grading: strict` -> `schema-error`), `numeric-unknown-domain.yaml` (`domain: real`), `numeric-negative-relative-tolerance.yaml`, `numeric-fractional-decimal-places.yaml` (`decimalPlaces: 1.5`), `numeric-tolerance-unknown-key.yaml` (`tolerance: {percent: 5}`), `numeric-empty-unit-field.yaml` (`unit: ""`), `numeric-malformed-decimal-answer.yaml` (`answer: "3,14"` -> `malformed-numeric-answer`, not `schema-error`), `numeric-missing-answer.yaml`.

### NUM-E11 Domain-mismatch caused by the absolute tolerance alone (severity: medium)
- Spec: `lint-codes.md` `domain-mismatch`: "narrower than the answer and the absolute tolerance need".
- Missing: `domain-mismatch-tolerance.yaml`: `answer: 8, domain: integer, tolerance: {absolute: 0.5}` -> `domain-mismatch` at `["domain"]`, no `answer-outside-domain`. Also `answer: 4.0, domain: integer` -> clean (the [^3] "`4.0` is whole" sentence has no example).

### NUM-E12 Minor unexercised alternatives (severity: low)
- `ws` between `]` and `:` (`[numeric] : 42`); tab as `ws`; `[numeric(%)]` unit; `ignored-decimal-places` with `domain: fraction`; explicit `decimalPlaces: 0`; Markdown frontmatter `domain: integer` over a decimal body (`answer-outside-domain` from Markdown, no `decimalPlaces` inferred); `relative-tolerance-around-zero` from Markdown (`0 +- 5%`); `relative-tolerance-over-one` boundary `+- 100%` (relative `1`, no lint) and from Markdown `+- 500%`; `-0` / `-0.0` representation; `tolerance: {}`.

## Spec defects

### NUM-S1 Mismatched unit: grade zero or malformed (severity: high)
- Spec: `responses.md` "Numeric": "they MUST reject a response with a unit that is not compatible with the question's unit with grade zero." vs. same section: "A value the question cannot represent is a malformed response, never a wrong answer: a decimal where `domain` is `integer`, or a unit other than the declared one."
- Problem: `{value: 3, unit: s}` on a `unit: rad` question scores 0 per the first sentence and is malformed per the second. "other than the declared one" also makes a convertible `kg` on a `g` question malformed, which contradicts the MAY on conversion.
- Fix: choose one. Suggest: an incompatible unit is malformed (`ResponseError`); a different but convertible unit is malformed unless the implementation converts. Then add grading rows (NUM-E2).

### NUM-S2 Domain and `decimalPlaces` inference undefined for documents written in YAML/JSON (severity: medium)
- Spec: "Number type/domain": "the domain is inferred from how the value and the absolute tolerance are written". "Decimal places": "When the frontmatter does not give `decimalPlaces` ... it is inferred from the body". [^3]: "The check reads values, not how a number is spelled in YAML or JSON".
- Problem: a YAML-only document has no body and, in JSON/JS, no spelling (`1.0` == `1`). Yet `grading/numeric.yaml` infers places from YAML numbers ("Inferred from `3.14 +- 0.01`: two places"; "`0 +- 0.5` is a decimal question with one inferred place"), and `ignored-decimal-places-inferred.yaml` infers the domain from `answer: 27`. A YAML `answer: 3.10` or `absolute: 1.0` gives different results in a Python and a JS loader. `domain-decimal-integer-answer.yaml` and `relative-tolerance-around-zero-decimal-string.yaml` are decimal with no `decimalPlaces`. Their grading precision is undefined.
- Fix: define inference for YAML documents from values (shortest decimal form of a number, digits of a string), or require `domain`/`decimalPlaces` in documents written directly.

### NUM-S3 Spelling vs value: the checks disagree (severity: medium)
- Spec: inference table reads spelling (`8 +- 1.0` is `decimal`, `whole-decimal-tolerance.yaml`); [^3] reads values ("`4.0` is whole"); `missing-tolerance` "for a `decimal`/`fraction` answer".
- Problem: frontmatter `domain: integer` + `[numeric]: 8 +- 1.0`: the declared domain is narrower than the inferred `decimal`, but by [^3] every value is whole, so no `domain-mismatch`. `whole-fraction-domain-integer.yaml` fires `missing-tolerance` on `"4/2"` (spelling), while [^6] judges the same answer by value. Two readers get different lint sets.
- Fix: state per code whether it reads spelling or value. Suggest value for `domain-mismatch`, `answer-outside-domain`, and `missing-tolerance`, and spelling only for inference from Markdown.

### NUM-S4 Response string grammar not defined (severity: medium)
- Spec: `responses.md` "Numeric": "A string carries an exact rational"; "The string MUST be a valid decimal."
- Problem: no reference to `sign? value`. Unclear whether `"+5"`, `"05"`, `" 5"`, `"5."`, `"1/0"` are valid. The grading file accepts `"1822"` and `"2/6"` but rejects nothing on syntax.
- Fix: "A string response MUST match `sign? value` of numeric.md, with a nonzero denominator; otherwise it is malformed."

### NUM-S5 Parsed document carrying the inferred `domain` is not stated (severity: low)
- Spec: "Decimal places": "The parsed document carries the inferred value." No such sentence for `domain`.
- Problem: every Markdown-derived `.yaml` carries `domain`, including inferred ones (`integer.yaml`, `fraction.yaml`).
- Fix: add "The parsed document carries the inferred domain." to "Number type/domain".

### NUM-S6 `malformed-numeric-answer` duplicates the schema pattern (severity: low)
- Spec: schema `answer` pattern `(?:0|[1-9][0-9]*)/[1-9][0-9]*` already excludes a zero denominator; `lint-codes.md` routes it to `malformed-numeric-answer` ("A rule with a code ... reports that code instead").
- Problem: no numeric rule is left for `model-only/`. That is consistent, but the schema description says "A fraction's denominator MUST NOT be zero" as if it were a separate rule, and `numeric-malformed-fraction-answer.yaml`'s comment says it "fails both". The routing is easy to miss.
- Fix: none required. Optionally note in numeric.md that `malformed-numeric-answer` is the code for the schema's `answer` pattern.

### NUM-S7 Trailing whitespace not in the grammar (severity: low)
- Spec: `numeric_body : ws? sign? value tolerances?` (no trailing `ws`); `tolerance-spaces-after-sign.yaml` comment: "Runs of spaces are allowed ... at the end of the line."
- Problem: the result is correct only because the paragraph end is stripped; grammar.md "Start and end of a block" covers only the start ("When a rule starts with `ws?` at the start of a block").
- Fix: add `ws?` at the end of `numeric_body`, or say that the grammar applies to the line after end-of-block stripping.

## Checked and fine
- Grammar: sign `+`/`-`, INTEGER/DECIMAL leading-zero, leading/trailing dot and exponent rejections, fraction, abstol/reltol in both orders, no-space and many-space forms, two reltols rejected, negative tolerance rejected, trailing text rejected, empty unit, unit with space/bracket, space inside tag, NBSP on tag line (`non-ascii-whitespace` warning + `parse-error`).
- UNIT charset: schema pattern equals the `UNIT` terminal; `°C`, `km/h`, `R$` valid; space rejected in Markdown and YAML.
- Representation: fraction always a string (`3/4`, unreduced `6/8`, `-1/3`); `"2.50"`; `"3.14159265358979323846"`; int32 bounds numbers, ±1 beyond strings; `"390000000000"`.
- Domain table: all five rows exercised from Markdown; reltol ignored (`integer-beyond-int32`); frontmatter `domain` wins.
- `decimalPlaces` recomputed for all 15 decimal Markdown examples: all present and correct.
- Lint codes, severity, path: `answer-outside-domain` (number and `"7/2"`), `domain-mismatch` (float in fraction, fraction string in integer, wider domain clean), `ignored-decimal-places` (declared and inferred), `missing-tolerance`, `relative-tolerance-around-zero` (`0`, `"0.0"`, `"0/5"`), `relative-tolerance-over-one`, `missing-id`/`missing-title`.
- `"1/0"` in YAML -> `malformed-numeric-answer`, not `schema-error`; negative `absolute` and `decimalPlaces` -> `schema-error`.
- Grading: exact, abstol/reltol boundary equality, either-tolerance, `2.675` -> `2.68`, `3.155` -> `3.16`, extra digits not malformed, decimal in integer domain malformed, `"2/6"` == `"1/3"`, negative answer, zero answer with relative and with absolute tolerance, declared decimal domain with 0 places.
