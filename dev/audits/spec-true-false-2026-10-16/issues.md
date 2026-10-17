--- ISSUE 1 ---
# [Spec] True/false all-or-nothing must not give partial credit

**Labels:** high

## Problem

True/false `all-or-nothing` scores `correctly marked / total` when there is no mistake, so abstentions still give partial credit. Options: (a) recommended: 1 only when every statement is judged correctly, an abstention counts as a mistake, as in the glossary, multiple selection and fill-in; (b) keep the rule under a new strategy name and update the glossary and exam.md.

## Evidence

- `docs/question-types/true-false.md:204-207`: True/false all-or-nothing gives partial credit

  ```markdown
  * **all-or-nothing**: The student must mark all choices with the correct marking
    or abstain. Any mistake in the marked choices gives zero points. If all marked
    choices are correct, the student gets a score proportional to the number of
    correct markings (`correctly marked / total number of choices`).
  ```

## Impact

An exam that sets `grading: all-or-nothing` for every type gets two different meanings. An instructor who expects no credit for an incomplete true/false answer gives 0.5 to a student who judged half of the statements.

## Suggested fix

Either make true/false all-or-nothing score 1 only when every statement is judged correctly (an abstention counts as a mistake), or keep the current rule, give it a different name, and update the glossary. The first option agrees with the glossary and the other types.

## Acceptance criteria

- [ ] true-false.md all-or-nothing agrees with GLOSSARY.md All-or-nothing
- [ ] The grading table and examples/grading/true-false.yaml agree with the new rule
- [ ] scripts/spec_audit.py passes

--- END ISSUE 1 ---

--- ISSUE 2 ---
# [Spec] Define the letter test of true/false markers

**Labels:** medium, low

## Problem

The letter sets exist only in prose, `\p{L}` is outside the regex dialect of grammar.md, the Unicode version is not fixed, the case mapping is not defined (fullwidth `U+FF26` reads as true), `Lm` admits signs such as `U+30FC`, and the NFC info mixes combining sequences with singletons. Recommended: define `TRUE_LETTER`, `FALSE_LETTER` and `WARNING_LETTER` in the snippet; state that the letter test uses General_Category of one code point from a fixed minimum Unicode version; compare after NFKC and case folding (so `U+FF26` is FALSE); restrict WARNING to `Lu`, `Ll`, `Lt`, `Lo`; reword the NFC info for singletons only.

## Evidence

- `docs/question-types/true-false.md:65-68, docs/question-types/true-false.md:251`: NFC rule mixes combining sequences with non-NFC single code points

  ```markdown
  * "One code point", not one grapheme cluster. A base letter followed by a
    combining mark is two code points and is not a valid marker. Implementations
    MAY report, at the info level, a marker that is not in NFC form: in NFC,
    precomposed forms are single code points.
  ```
- `docs/question-types/true-false.md:46-50, docs/question-types/true-false.md:83-86, docs/question-types/true-false.md:96-98`: Case-insensitivity and compatibility forms of letters are not defined

  ```markdown
  We only show the upper case versions of each symbol. Each set must be expanded
  with lowercase versions as well; the CJK characters have no case and are used
  as-is.
  ```
- `docs/question-types/true-false.md:43-50`: The `true` and `false` rules are never defined, and WARNING letters have no rule

  ```lark
  value : ws? (true | false) ws?
  ```
- `docs/question-types/true-false.md:52-57`: `\p{L}` breaks the regex dialect rule of the common grammar

  ```markdown
  A **letter** is exactly one Unicode code point whose General_Category is one of
  `Lu`, `Ll`, `Lt`, `Lm` or `Lo` -- that is, the character class written `\p{L}`
  in regex engines that support Unicode properties.
  ```
- `docs/question-types/true-false.md:52-57`: The Unicode version of the letter test is not fixed, so Python and JavaScript disagree

  ```markdown
  A **letter** is exactly one Unicode code point whose General_Category is one of
  `Lu`, `Ll`, `Lt`, `Lm` or `Lo`
  ```
- `docs/question-types/true-false.md:52-53`: `\p{L}` includes signs that do not look like letters

  ```markdown
  A **letter** is exactly one Unicode code point whose General_Category is one of
  `Lu`, `Ll`, `Lt`, `Lm` or `Lo`
  ```

## Impact

- **NFC rule mixes combining sequences with non-NFC single code points:** An implementer can emit the info for combining sequences, or miss the singleton case.
- **Case-insensitivity and compatibility forms of letters are not defined:** Implementations that use lowercase mapping, case folding or NFKC give different categories for the same marker. The fullwidth `U+FF26` case flips the answer key with only a warning.
- **The `true` and `false` rules are never defined, and WARNING letters have no rule:** The grammar does not decide which markers are valid; implementations rebuild the sets from prose.
- **`\p{L}` breaks the regex dialect rule of the common grammar:** The letter terminal cannot be written in the dialect the spec mandates, so each implementation picks its own engine and flags.
- **The Unicode version of the letter test is not fixed, so Python and JavaScript disagree:** The same document gets a different type or different errors in each implementation, which grammar.md explicitly tries to prevent.
- **`\p{L}` includes signs that do not look like letters:** The goal of the exclusion ("marks that look like answers but are not letters are NOT valid") is only partly met.

## Suggested fix

- **NFC rule mixes combining sequences with non-NFC single code points:** Split the bullet: a combining sequence is two code points and is `malformed-true-false-marker`; a single code point that NFC changes (U+212B to U+00C5) MAY get `non-nfc-true-false-marker`. Reword the table row to 'is a single code point that NFC changes'.
- **Case-insensitivity and compatibility forms of letters are not defined:** Define the comparison: for example, NFKC then case folding before the category lookup, so `U+FF26` is FALSE and `ſ` is TRUE. Or keep exact comparison of the letter and its simple lowercase, and make a fullwidth `U+FF34`/`U+FF26` an error. Add corpus examples for the chosen rule.
- **The `true` and `false` rules are never defined, and WARNING letters have no rule:** Define the rules in the snippet, for example `true : TRUE_LETTER | WARNING_LETTER`, `false : FALSE_LETTER`, with terminals for each set, and explain `WARNING_LETTER` as a letter outside the other sets and outside `X`/`x`.
- **`\p{L}` breaks the regex dialect rule of the common grammar:** State the exception in grammar.md: the letter test uses the Unicode General_Category of one code point (Python `unicodedata.category`, JavaScript `/^\p{L}$/u`), not a regex of the common dialect.
- **The Unicode version of the letter test is not fixed, so Python and JavaScript disagree:** Fix a minimum Unicode version for the letter test, or state that letters unassigned in that version are not letters.
- **`\p{L}` includes signs that do not look like letters:** Restrict the WARNING set to `Lu`, `Ll`, `Lt` and `Lo` minus a short exclusion list, or accept the behaviour and list these examples.

## Acceptance criteria

- [ ] The `value` snippet defines `true` and `false`
- [ ] grammar.md states the exception to the regex dialect for the letter test
- [ ] The spec fixes the Unicode version and the case mapping
- [ ] Corpus examples cover fullwidth and long-s markers
- [ ] scripts/spec_audit.py passes

--- END ISSUE 2 ---

--- ISSUE 3 ---
# [Spec] Define the locale mismatch rule

**Labels:** medium

## Problem

Only one example defines a locale mismatch, the text refers to an absent `id` row, and the prose says MAY for a warning. Recommended: a TRUE or FALSE letter whose folded form is not the expected letter of its category is mismatched; WARNING letters get only `unlisted-true-false-marker`; the prose says SHOULD; delete the `id` row sentence. This is what mdq-py does.

## Evidence

- `docs/question-types/true-false.md:173-175`: Locale text refers to an `id` row that the table does not have

  ```markdown
  dedicated warning, `false-friend-true-false-marker`. The `id` row has no
  mismatched form, so `locale-mismatched-true-false-marker` is never issued for
  it.
  ```
- `docs/question-types/true-false.md:149-153`: The spec does not define which markers are locale-mismatched

  ```markdown
  Implementations MAY issue warnings for True/False letters that are incompatible
  with the locale for the question. For instance, if `locale: pt-BR`, it may
  expect `V` and `F` -- for "verdadeiro" (true) and "falso" (false) -- and could
  issue a warning if `T` is used instead.
  ```
- `docs/question-types/true-false.md:149, docs/question-types/true-false.md:247`: Locale warning is a MAY in the prose and a warning in the table

  ```markdown
  Implementations MAY issue warnings for True/False letters that are incompatible
  ```

## Impact

- **Locale text refers to an `id` row that the table does not have:** A reader cannot tell whether `id` is meant to be in the table (with which letters) or not.
- **The spec does not define which markers are locale-mismatched:** Two implementations can report different warnings for the same document.
- **Locale warning is a MAY in the prose and a warning in the table:** The requirement level of the rule is unclear.

## Suggested fix

- **Locale text refers to an `id` row that the table does not have:** Delete the sentence about the `id` row, or add an `id` row (`B` / `S`? `T` / `F`?) and define what 'no mismatched form' means.
- **The spec does not define which markers are locale-mismatched:** State the rule: under a locale in the table, a marker in the TRUE or FALSE category whose case-folded form is not the expected letter of its category is mismatched. WARNING letters get only `unlisted-true-false-marker`.
- **Locale warning is a MAY in the prose and a warning in the table:** Change the prose to SHOULD (keep warning), or move the rule to info. SHOULD agrees with the corpus (`examples/valid/true-false/locale-mismatch.lint.json`).

## Acceptance criteria

- [ ] true-false.md states which markers are mismatched
- [ ] The level in prose and table agree
- [ ] No reference to a missing `id` row
- [ ] A corpus example covers `S` under `pt`

--- END ISSUE 3 ---

--- ISSUE 4 ---
# [Spec] Settle the rules of the `marker` field

**Labels:** medium, low

## Problem

The agreement and reserved-`X` rules are only in the table; `malformed-` and `reserved-true-false-marker` overlap with `foreign-choice-marker` in markdown and with `schema-error` in YAML; `marker` is called verbatim but loses the spaces; the schema checks only length; no default letter for writers. Recommended: describe the rules under Choices; say the two marker codes apply to model input and markdown values outside `value` are `foreign-choice-marker`; say a dedicated code replaces `schema-error` for the same field (keep `maxLength`); `marker` is the letter without `ws`; writers use the locale letters, else `T`/`F`.

## Evidence

- `docs/question-types/true-false.md:235-237`: Two error codes apply to `[x]` and `[TF]` in a list forced to true/false

  ```markdown
  | choices[]          | error    | foreign-choice-marker                    | must use a value allowed in a true/false list              |
  | choices[].marker   | error    | malformed-true-false-marker              | must be a single letter[^2]                                |
  | choices[].marker   | error    | reserved-true-false-marker               | must not be `X` or `x`[^2]                                 |
  ```
- `docs/question-types/true-false.md:237-238, docs/question-types/true-false.md:107-144`: The `marker`/`correct` agreement rule and the reserved `X` rule exist only in the table

  ```markdown
  | choices[].marker   | error    | reserved-true-false-marker               | must not be `X` or `x`[^2]                                 |
  | choices[].marker   | error    | true-false-marker-disagrees-with-correct | must agree with `correct` according to its category[^3]    |
  ```
- `docs/question-types/true-false.md:113, docs/question-types/true-false.md:137-139`: `marker` is 'exactly as it was written', but the `ws` inside the brackets is dropped

  ```markdown
  | marker  | string  | The letter itself, exactly as it was written.           |
  ```
- `docs/question-types/true-false.md:236, schema/true-false.yaml:94-95, docs/lint-codes.md:84`: The schema and `malformed-true-false-marker` both reject a marker that is not one code point

  ```markdown
  | choices[].marker   | error    | malformed-true-false-marker              | must be a single letter[^2]                                |
  ```
- `schema/true-false.yaml:86-95`: Schema accepts any single code point as `marker`

  ```yaml
        marker:
          type: string
  ```
- `docs/question-types/true-false.md:141-144`: No rule for the letter to write when `marker` is absent

  ```markdown
  `marker` is OPTIONAL. A document carrying only `correct` is well-formed and
  grades identically; it has simply lost the ability to be written back out
  unchanged,
  ```

## Impact

- **Two error codes apply to `[x]` and `[TF]` in a list forced to true/false:** Implementations can report different codes for the same markdown input.
- **The `marker`/`correct` agreement rule and the reserved `X` rule exist only in the table:** A reader of the prose cannot know that a YAML document with `marker: F, correct: true` or `marker: X` is invalid, nor that a WARNING letter forces `correct: true`.
- **`marker` is 'exactly as it was written', but the `ws` inside the brackets is dropped:** An implementation that reads 'verbatim' literally stores ` T `, which then fails `malformed-true-false-marker` and the schema `maxLength: 1`.
- **The schema and `malformed-true-false-marker` both reject a marker that is not one code point:** An implementation that reports schema errors as `schema-error` fails the corpus for these documents, or reports two errors for one defect.
- **Schema accepts any single code point as `marker`:** A consumer that relies on the schema alone accepts markers the spec forbids.
- **No rule for the letter to write when `marker` is absent:** Two writers produce different markdown for the same document.

## Suggested fix

- **Two error codes apply to `[x]` and `[TF]` in a list forced to true/false:** Say in the table that `malformed-true-false-marker` and `reserved-true-false-marker` apply to the `marker` field of model input, and that a markdown value outside the `value` rule is `foreign-choice-marker`.
- **The `marker`/`correct` agreement rule and the reserved `X` rule exist only in the table:** Under Choices, add: 'When `marker` is present, its category MUST agree with `correct`: FALSE letters with `false`, TRUE and WARNING letters with `true` (`true-false-marker-disagrees-with-correct`). `marker` MUST NOT be `X` or `x` (`reserved-true-false-marker`).'
- **`marker` is 'exactly as it was written', but the `ws` inside the brackets is dropped:** Say that `marker` is the letter of the value without the `ws` around it, and that only the letter and its case are kept.
- **The schema and `malformed-true-false-marker` both reject a marker that is not one code point:** Either remove `minLength`/`maxLength` from the schema and leave the check to `malformed-true-false-marker`, or state that a dedicated code replaces `schema-error` when both apply to the same field.
- **Schema accepts any single code point as `marker`:** Add `pattern: "^\\p{L}$"` and `not: {enum: [X, x]}`, or say in the description that the letter and reserved checks are model rules (`malformed-true-false-marker`, `reserved-true-false-marker`). The first option interacts with the code-precedence question of the length check.
- **No rule for the letter to write when `marker` is absent:** State a default: 'A writer that needs a letter for a statement without `marker` SHOULD use the letters of the question's locale from the Locale table, and `T`/`F` otherwise.'

## Acceptance criteria

- [ ] Each marker rule is in prose and table with one code per case
- [ ] The schema description lists the model rules
- [ ] scripts/spec_audit.py passes

--- END ISSUE 4 ---

--- ISSUE 5 ---
# [Spec] Reuse the choice-list codes for uniform true/false answers

**Labels:** low

## Problem

True/false reports both 'all true' and 'all false' as `uniform-true-false-answers`, while multiple selection uses `no-correct-choice` and `all-choices-correct` for the same field. Options: (a) reuse the two codes; (b) recommended: keep the true/false code, since 'all false' is a valid key in true/false and the reason differs, and say so in the prose.

## Evidence

- `docs/question-types/true-false.md:250, docs/question-types/multiple-selection.md:161-162`: True/false uses one code where choice questions use `no-correct-choice` and `all-choices-correct`

  ```markdown
  | choices[].correct  | info     | uniform-true-false-answers               | the statements are all true or all false                   |
  ```

## Impact

A tool that filters diagnostics by code needs a second code for the same property of the same field.

## Suggested fix

Reuse `no-correct-choice` and `all-choices-correct` for true/false, or document why true/false has its own code.

## Acceptance criteria

- [ ] true-false.md explains the code or reuses the multiple-selection ones
- [ ] lint-codes.md agrees

--- END ISSUE 5 ---

--- ISSUE 6 ---
# [Spec] A `null` statement value in a true/false response is an abstention

**Labels:** medium

## Problem

The grading corpus treats `null` as an abstention; docs/responses.md does not. Recommended: say `null` equals an absent key and any other non-boolean is a malformed response.

## Evidence

- `docs/responses.md:78-91`: Responses do not say that a `null` statement value is an abstention

  ```markdown
  A mapping from statement id to the judgement the student made. Unlike multiple
  selection, an absent key is **not** a false: it is an abstention, and the
  student may deliberately leave a statement unjudged.
  ```

## Impact

An implementation that follows the spec text rejects a response that the shared grading corpus requires it to accept.

## Suggested fix

In docs/responses.md, say that a `null` value is the same as an absent key, and that any other non-boolean value is a malformed response. Do the same for multiple selection if `null` is allowed there.

## Acceptance criteria

- [ ] docs/responses.md states the rule for true/false (and multiple selection)

--- END ISSUE 6 ---

--- ISSUE 7 ---
# [Spec] State the error for extra blocks in a choice item

**Labels:** medium

## Problem

A second paragraph, a nested list, a code block or text after the feedback fails the `item` rule, and the spec gives no code. Recommended: `parse-error`, which mdq-py already does.

## Evidence

- `docs/references/choices.md:56`: An item with other block content fails the `item` rule, and no error code is given

  ```lark
  item      : ws? "[" value VALUE_END ws? (CHOICE_ID ws?)? md_inline* nl lazy_line* (blank_line* observations)?
  ```

## Impact

Implementations can treat a common authoring mistake differently.

## Suggested fix

State the result: for example, any block in a choice item other than the first paragraph, the feedback and the comment is a `parse-error`.

## Acceptance criteria

- [ ] docs/references/choices.md gives the code
- [ ] An invalid corpus example covers it

--- END ISSUE 7 ---

--- ISSUE 8 ---
# [Spec] Define judged correctly and the value without spaces

**Labels:** low

## Problem

True/false grading uses 'correct marking' where multiple selection defines 'judged correctly'; type inference says 'a value is a letter' when the value can carry spaces. Recommended: define judged correctly / wrongly / abstention before the strategies, and say inference reads the value without `ws`.

## Evidence

- `docs/question-types/question-base.md:230-234`: Type inference 'a value is a letter' does not say spaces are removed

  ```markdown
  3. a value is a letter: true/false;
  ```
- `docs/question-types/true-false.md:201-211`: True/false grading does not define a correct marking, unlike multiple selection

  ```markdown
  * **partial**: Each correct marking gives a point, and each incorrect or missing
    marking is ignored.
  ```

## Impact

- **Type inference 'a value is a letter' does not say spaces are removed:** A literal reading infers multiple selection for `[ T ]` lists, then reports every item as `foreign-choice-marker`.
- **True/false grading does not define a correct marking, unlike multiple selection:** A reader must infer how a response value is compared with the answer key.

## Suggested fix

- **Type inference 'a value is a letter' does not say spaces are removed:** 'a value, without the `ws` around it, is a [letter](true-false.md#body)'. Same for rules 1 and 2 (`[ x ]`, `[ * ]`).
- **True/false grading does not define a correct marking, unlike multiple selection:** Before the list: 'A statement is **judged correctly** when the response holds its `correct` value, and **judged wrongly** when it holds the other value. An abstention is neither.' Then use these terms in the three strategies.

## Acceptance criteria

- [ ] true-false.md Grading defines the terms
- [ ] question-base.md inference trims the value

--- END ISSUE 8 ---

--- ISSUE 9 ---
# [Spec] Cover the remaining true/false edge cases in the corpus

**Labels:** low

## Problem

Add the examples listed in the finding once the rules above are settled.

## Evidence

- `docs/question-types/true-false.md:235`: True/false corpus does not exercise some rules and edge cases

  ```markdown
  | choices[]          | error    | foreign-choice-marker                    | must use a value allowed in a true/false list              |
  ```

## Impact

Implementations can disagree on these cases without a failing test.

## Suggested fix

Add the examples once the related rules are settled.

## Acceptance criteria

- [ ] Each case in F40 has a corpus example
- [ ] scripts/spec_audit.py passes

--- END ISSUE 9 ---

--- ISSUE 10 ---
# Mechanical fixes

**Labels:** mechanical, medium, low

## Problem

Each fix below follows from its finding and needs no design decision, so they can be applied together in one pass and reviewed by reading the diff. Severity still applies: a mechanical fix can matter a lot.

### F32 (medium): `docs/lint-codes.md` makes a `null` feedback or comment a `schema-error`

`docs/lint-codes.md:72, docs/question-types/question-base.md:103-107`

```markdown
`null` in these fields is a `schema-error`.
```

**Suggested fix:** Change the sentence to: '`null` in an OPTIONAL field is an absent field; in a required field it is a `schema-error`.'

### F8 (low): `uniform-true-false-answers` is not described in the prose

`docs/question-types/true-false.md:250`

```markdown
| choices[].correct  | info     | uniform-true-false-answers               | the statements are all true or all false                   |
```

**Suggested fix:** Add a sentence, for example under Grading: 'Implementations MAY report, at the info level, a question whose statements are all true or all false (`uniform-true-false-answers`).'

### F9 (low): Abstention is called skip, unmarked, missing and unjudged

`docs/question-types/true-false.md:183, docs/question-types/true-false.md:201-211, docs/question-types/true-false.md:218-225`

```markdown
Including abstentions is deliberate: a student who skips a statement because
```

**Suggested fix:** Use 'abstains on a statement' / 'abstention' throughout, and say in the table intro that `_` is an abstention.

### F10 (low): False-friend footnote speaks of an `S` 'meaning false'

`docs/question-types/true-false.md:256-257`

```markdown
[^4]: An `S` marker meaning false under `locale: id` SHOULD get
`false-friend-true-false-marker`, see [locale](#locale).
```

**Suggested fix:** 'Every `S` marker under `locale: id` SHOULD get `false-friend-true-false-marker`.' Attach the footnote only to that row.

### F11 (low): TRUE letters written as one code span `TVS`

`docs/question-types/true-false.md:83`

```markdown
* **TRUE**: `TVS`, plus
```

**Suggested fix:** `T`, `V`, `S`, `U+5BF9` and `U+771F`; the same for the FALSE line.

### F30 (low): Schema `marker` description omits the agreement check

`schema/true-false.yaml:88-93`

```yaml
carries the meaning, but the letter itself is needed to warn
          about WARNING letters and locale mismatches, and to
          round-trip the document unchanged.
```

**Suggested fix:** Add: 'When present, its category must agree with `correct`.'

### F31 (low): Schema `grading` description ignores the exam's grading map

`schema/true-false.yaml:33-37`

```yaml
`inherit`, the default, takes the exam's `grading` value, and
          is `symmetric` outside an exam.
```

**Suggested fix:** 'takes the exam's `grading` (its `true-false` entry when it is a map), and is `symmetric` outside an exam or when the exam sets none.'

### F33 (low): `uniform-true-false-answers` is attached to `choices[].correct`, but reported on `choices`

`docs/question-types/true-false.md:250`

```markdown
| choices[].correct  | info     | uniform-true-false-answers               | the statements are all true or all false                   |
```

**Suggested fix:** Change the Field column to `choices`.

### F35 (low): The introduction calls true statements 'correct answers'

`docs/question-types/true-false.md:5-7`

```markdown
rendition of a True or False marker. The correct answers are usually marked with
`[T]` and incorrect ones are usually marked with an `[F]`.
```

**Suggested fix:** 'True statements are usually marked with `[T]` and false statements with `[F]`.'

### F36 (low): The annex is said to hold a rationale that it does not have

`docs/question-types/true-false.md:78-81`

```markdown
[annex/true-false-spellings.md](../annex/true-false-spellings.md)
for the source data and the rationale behind each addition.
```

**Suggested fix:** 'for the source data. The rationale follows below.'

### F37 (low): `S` is called the initial of words written in non-Latin scripts

`docs/question-types/true-false.md:87-88`

```markdown
`S` was chosen for TRUE over FALSE deliberately: it is the initial letter for
"true" in Hindi, Bengali, Arabic, Urdu and Japanese
```

**Suggested fix:** 'it is the initial of the romanized word for "true" in Hindi, Bengali, Arabic, Urdu and Japanese (satya, satya, sahih, sach, shin)'.

### F41 (low): Corpus comment cites multiple-choice.md for the duplicate-text rule

`examples/invalid/model-only/true-false-duplicate-choice-text.yaml:1-3`

```yaml
# are compared with whitespace normalized, so this is `duplicate-choice-text`
# (multiple-choice.md, "Choices"), which JSON Schema cannot express.
```

**Suggested fix:** Cite `references/choices.md, "Choice text"`.

## Acceptance criteria

- [ ] F32: `docs/lint-codes.md` makes a `null` feedback or comment a `schema-error`
- [ ] F8: `uniform-true-false-answers` is not described in the prose
- [ ] F9: Abstention is called skip, unmarked, missing and unjudged
- [ ] F10: False-friend footnote speaks of an `S` 'meaning false'
- [ ] F11: TRUE letters written as one code span `TVS`
- [ ] F30: Schema `marker` description omits the agreement check
- [ ] F31: Schema `grading` description ignores the exam's grading map
- [ ] F33: `uniform-true-false-answers` is attached to `choices[].correct`, but reported on `choices`
- [ ] F35: The introduction calls true statements 'correct answers'
- [ ] F36: The annex is said to hold a rationale that it does not have
- [ ] F37: `S` is called the initial of words written in non-Latin scripts
- [ ] F41: Corpus comment cites multiple-choice.md for the duplicate-text rule

--- END ISSUE 10 ---
