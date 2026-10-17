---
type: issue
status: active
tags: [mdq, audit, spec, schema-base]
relatedTo: [dev/audit2/brief.md]
---
# Findings: schema-base

## Summary
- I read all 10 `schema/*.yaml`, the bundle, base.md, grammar.md, lint-codes.md, and the frontmatter and Additional Rules tables of the 8 type docs and exam.md.
- I checked about 60 cross-cutting valid examples and 38 invalid ones: `question-*`, `extra-fields`, `syntax/*`, model-only locale/blank/forbidden, uuid, forbidden-element and nbsp cases.
- **Bundle vs sources:** every `$defs/<name>` matches `<name>.yaml` (structural diff). The only problem is in a source: `ordering.yaml` repeats a key, and the bundle silently keeps one copy.
- **Examples:** most agree with their `.yaml` and `.lint.json`. Three high-severity conformance problems: `blank-comment` pins an empty `comment`, which base.md forbids; the comma-split of a `tags` string drops empty parts, but the prose does not say so; two "forced type, no body" examples get different codes.
- **Main spec gaps:** Markdown frontmatter keys: base.md says "translated as-is", lint-codes says "dropped", and the schemas reject unknown keys. No document lists the keys each type recognizes, and no rule covers body-derived keys written in the frontmatter. The AST field for the comment string is never named. The "MUST NOT be the empty string" rule is applied unevenly in the schemas. Schema regexes give different results in Python and JS (`\s`, and `$` before a final newline).
- **Coverage gaps:** no example for `wrong-kind`, nested or YAML-document `null`, an explicit `comment:` key, body fields written in the frontmatter, a frontmatter that is not a mapping, or a `.yaml` file with a YAML syntax error.

## Conformance findings

### SB-C1 `blank-comment` pins an empty `comment` that base.md forbids (high)
- Files: `examples/valid/essay/blank-comment.yaml` (`comment: ''`) and `blank-comment.lint.json` (`blank-text-field` warning).
- Spec: base.md "Additional Rules" says "every text field (`title`, `author`, `comment`, choice text, feedback and the like) MUST NOT be the empty string (`minLength: 1`)". But `schema/question-base.yaml` gives `comment` no `minLength`.
- Problem: under the prose, `comment: ''` is invalid. The schema and the corpus accept it with a warning.
- Fix: pick one rule (see SB-S7). The recommended fix follows the prose: add `minLength: 1` to `comment`, and make a bare `#` produce no `comment`. Then update the example.

### SB-C2 The comma-split of `tags` drops empty parts, but the spec does not say so (high)
- Files: `examples/valid/essay/tags-string-empty-entries.{mdq.md,yaml}`: `"agua, , clima,"` gives `[agua, clima]`. `examples/valid/essay/tags-empty-string.yaml`: `""` gives `[]`.
- Spec: base.md "Markdown to AST mapping" says a tags string "becomes the list of its parts, each stripped of surrounding whitespace".
- Problem: read literally, the first example gives `[agua, "", clima, ""]`. That fails `uniqueItems` (`schema-error`) and also triggers `blank-tag`. And `""` gives `[""]`, not `[]`.
- Fix: in base.md, say that empty parts are dropped. Also give the rule for repeated parts (SB-S12).

### SB-C3 A forced type with no matching body gets different codes (high)
- Files: `examples/invalid/question-type-disagrees-with-body`: `type: numeric` with an `[essay]` body gives `schema-error` at `["answer"]`. `examples/invalid/essay-type-without-body`: `type: essay` with no body gives `parse-error`.
- Spec: base.md says "For all questions the body is REQUIRED". The "Forbidden elements" section forbids a non-first paragraph that starts with `[`.
- Problem: the two cases are the same, but they get different codes. A third reading, `forbidden-block-element`, is also possible.
- Fix: state in base.md that a missing body for the forced type is a `parse-error`, and update the numeric example.

### SB-C4 Corpus comments contradict the spec or cite internals (low)
- `invalid/question-tags-not-string.yaml` says `tags` can be "one comma-separated string" in a YAML document. But ordering.md [^5] says the string form "is a frontmatter spelling only", and the schema allows only an array.
- `valid/essay/nel-in-prose.yaml` says "YAML reads both as line breaks too". That is false under YAML 1.2, section 5.4.
- `model-only/essay-blank-text-field.yaml` cites `dev/specs/to-do/lint-on-models.md`, which is not in git.
- `invalid/essay-malformed-uuid.yaml` cites `mdq.models._base`.
- `valid/exam/thematic-break-in-question.yaml` cites `_split_exam_blocks`.
- Fix: rewrite these comments so they cite only `docs/`.

## Exhaustiveness gaps

- **SB-E1 (medium): `null` is not tested in nested objects, in YAML/JSON documents, or in required fields.** base.md says the null rule applies "to every document, in Markdown, YAML and JSON, and to nested objects such as choices and blanks". Today only Markdown frontmatter is covered. Suggested examples: `valid/multiple-choice/null-choice-fields.yaml` (`feedback: ~`, `score: null`, `id:` inside choices); `valid/fill-in/null-blank-fields.yaml` (`tolerance: ~` in a blank); `invalid/question-null-stem.yaml` (`stem: ~`); `valid/essay/null-type.mdq.md` (`type: ~`, see SB-S20).
- **SB-E2 (medium): empty strings in `minLength` fields.** Only exam `description` has an example. Suggested: `title: ""`, `author: ""`, `id: ""`, `stem: ""`, choice `text: ""`, `course: ""`, `include: ""`, each giving `schema-error`.
- **SB-E3 (medium): YAML 1.2 Core in typed fields.** Missing: `shuffle: yes` gives `schema-error` (today only `tags`, `meta` and `locale` pin these forms); `weight: 1e0`, and `weight: .inf` (see SB-S15); the spellings `NULL`, `FALSE` and `TRUE`; `syntax/broken.yaml` and `syntax/duplicate-key.yaml` (the `syntax/` folder holds only JSON today).
- **SB-E4 (medium): `invalid-document`.** Missing: a Markdown frontmatter that is a list or a scalar (which code applies?), and a top-level JSON array.
- **SB-E5 (low): `wrong-kind`.** There is no example, and the corpus format cannot express what the caller expected. Add a convention, or declare the code API-only.
- **SB-E6 (medium): `unknown-frontmatter-key` beyond the top level of an essay.** Missing: unknown keys in exam frontmatter and in an inline question block; nested unknown keys: `tolerance: {foo: 1}`, `accept: [{pattern: x, foo: 1}]`; `automation:` in Markdown frontmatter.
- **SB-E7 (medium): comment string.** Missing: an explicit `comment:` key, alone and together with a comment string; an exam frontmatter comment string (where does it go?); a comment string in an exam question block.
- **SB-E8 (medium): body-derived keys in frontmatter.** Missing frontmatter versions of `stem`, `answer` (vs `[numeric]: 27`), `answerKey`, `choices`, `lines` and `tolerance`. These depend on SB-S4.
- **SB-E9 (low): tags.** Missing: `tags: [x, ""]` (does it trigger `blank-tag`? Only a whitespace entry is pinned); `tags: "agua, agua"` in Markdown; `tags: "a, b"` in a YAML document should give `schema-error`; exam-level `blank-tag` and `unsplit-tag-list`.
- **SB-E10 (low): locale.** Missing: `brasil` as a valid locale, though base.md cites it; an extlang (`zh-yue`), a variant (`sl-rozaj`), an extension (`en-a-bbb`) and a private-use suffix (`pt-BR-x-sp`); a too-long subtag; exam-level lookalike.
- **SB-E11 (low): uuid.** Missing: 32 hex digits with no hyphens, the `{...}` and `urn:uuid:` forms, and exam `uuid-unknown-variant`.
- **SB-E12 (low): `non-ascii-whitespace`.** Missing: U+2029; a choice tag `[*] [ipe]`; the first line of an accept/reject item; positions after list markers, `>` and `!`; skipping of indented code blocks; skipping of the frontmatter of exam question blocks.
- **SB-E13 (low): thematic breaks.** Missing: `- - -` (should warn) and `___` (should not).
- **SB-E14 (medium): `stem-not-a-paragraph` from Markdown.** Only the YAML case exists. Example: a table right before `[essay]`. It reads either as a stem plus a warning, or as preamble plus a missing stem.
- **SB-E15 (low): `blank-text-field`.** Missing: exam `author: " "`, a Markdown comment `#   `, and `incorrectFeedback: " "` (which has no code, see SB-S8).

## Spec defects

- **SB-S1 (medium): a repeated key in the schema.** `schema/ordering.yaml` lines 101 and 110 both set `uniqueItems: true` on `normalizations`. This breaks base.md's rule "A mapping MUST NOT repeat a key", and strict YAML loaders (js-yaml, ruamel) reject the file. The bundle is fine. Fix: delete line 110.
- **SB-S2 (low): "seven question types".** The bundle description says "seven question types", and the description of `question-base.yaml` lists seven and leaves out ordering. There are eight.
- **SB-S3 (high): unknown frontmatter keys.** The documents disagree: base.md says "all fields in the frontmatter are translated as-is"; the schemas use `unevaluatedProperties: false`; lint-codes says an unknown key "was dropped"; base.md says automation "MUST NOT appear in the frontmatter". The corpus follows the "drop" reading: `essay/unknown-frontmatter-key` warns and drops the key. In YAML documents, an unknown key is a `schema-error` (`extra-fields.yaml`, `short-answer-automation-field.yaml`). There is also no normative list of the keys each type recognizes. The type tables leave out `stem`, `preamble`, `epilogue`, `comment`, `answer`, `tolerance`, `choices`, `lines`, `extra`, `blanks` and `answerKey`. The fill-in `preAccept` and `preReject` maps are not schema properties. Fix: state the drop rule in base.md, add one table of recognized keys per type, and decide nested keys and `automation`.
- **SB-S4 (medium): frontmatter precedence vs conflict.** base.md says that when a field is set twice, "the frontmatter takes precedence", and `numeric/frontmatter-unit-wins` pins this. But short-answer.md makes `accept` or `reject` in both places a `conflicting-accept` error. base.md does not mention this exception, and does not say which body-derived fields the frontmatter may set.
- **SB-S5 (medium): the comment string has no named field.** base.md says only "stored as a comment string", and only the corpus pins the field name `comment`. Three questions are open: is an explicit `comment:` key allowed? Which wins when both are present? Where does an exam's comment string go? `exam.yaml` has no `comment` and uses `additionalProperties: false`.
- **SB-S6 (medium): optional normalizations vs exact expected output.** base.md says implementations "MAY ... remove word wrap" and comment lines "MAY be joined". The corpus always unwraps and joins (`comment-broken-by-blank-line`, `comment-no-space`, `thematic-break-preamble`). A conforming parser that keeps the newlines fails the comparison. Fix: make these MUST, or define the comparison as whitespace-insensitive.
- **SB-S7 (high): uneven empty-string rule.**

  | `minLength: 1` | Fields |
  | --- | --- |
  | Has it | `id`, `title`, `author`, `stem`, choice `text`, `highlight`, `course`, `description`, `include`, `include-all`, `patternString`, ordering `Alternative.feedback` and `Alternative.comment` |
  | Lacks it | `comment`, `preamble`, `epilogue`, `answerKey`, `incorrectFeedback`, choice `feedback`/`comment` (MC, MS, TF), pattern-object `feedback`/`comment`, `instructions` |

  So `feedback: ""` is valid on a choice but a schema error on an ordering alternative. The `answerKey` description in `essay.yaml` says "like `title`", but `title: ""` fails the schema and `answerKey: ""` does not. Fix: the schema should follow the prose. Leave out `tags` items and `Line` text, which have their own blank rules.
- **SB-S8 (medium): rules without codes.** short-answer.md has a rule "incorrectFeedback ... must have at least one visible character", but no code covers it: the `blank-text-field` list is only `title`, `author`, `comment` and `answerKey`. Exam `description`, `course` and `instructions`, pattern `feedback`/`comment`, and alternative `feedback`/`comment` have no blank rule at all.
- **SB-S9 (medium): "visible character" is not defined.** JS `trim()` strips U+FEFF and Python `strip()` does not. Neither strips U+200B. So `title: "﻿"` gives different results. Fix: define "visible" in grammar.md in terms of `UNICODE_SPACE` plus U+FEFF.
- **SB-S10 (medium): schema regexes depend on the regex dialect.** I verified both problems below: `\s` in `patternString`: Python rejects `"\x1c"` and `"\x85"` and accepts `"﻿"`; JS does the opposite. `$` at the end of patterns: in Python, `$` also matches before a final `\n`, so `re.search` accepts `"rio\n"` as a choice id and a uuid followed by `\n`; JS rejects both. grammar.md's "Regex dialect" covers only grammar terminals, not schema patterns. Fix: use an explicit character class instead of `\s`, end patterns with `(?![\s\S])` instead of `$`, and extend "Regex dialect" to cover the schema.
- **SB-S11 (medium): different strength for different ids.** A question or exam id SHOULD match `SLUG` (only an `unsafe-id` warning). A choice or blank id MUST match it (schema pattern, pinned by `multiple-choice-bad-choice-id`). grammar.md lists all four ids together, and no prose states the MUST for choice ids written in YAML. Fix: keep the schema and add rows to the MC, MS, TF and fill-in Additional Rules.
- **SB-S12 (medium): tag uniqueness is only in the schema.** `uniqueItems` makes a repeated tag an error, but the prose never says so. A blank tag is only a warning, so this severity is inconsistent. What `"a, a"` produces after the split is also not specified.
- **SB-S13 (medium): the set for `locale-lookalike-language` is not defined.** `pt`, `br` and `es` are both languages and countries. `locale-uppercase.yaml` says the lint does not fire for `pt`, but no rule says why. Fix: define the set as ISO 3166 alpha-2 codes that are not ISO 639-1 codes.
- **SB-S14 (medium): uuid "existing standard" vs nibble lists.** base.md [^3] says the version and variant SHOULD match "an existing standard". RFC 9562 defines Nil, Max, and the Microsoft and NCS variants. So by base.md, `uuid-nil`, `uuid-max` and `uuid-unknown-variant` (variant `c`) are standard, but lint-codes warns about them. Fix: make the two documents agree.
- **SB-S15 (medium): YAML values JSON cannot hold.** `.inf` and `.nan` are allowed by the YAML Core schema, but JSON cannot represent them, and `minimum: 0` with NaN depends on the validator. `meta` keys can be non-strings in YAML (`2024:`). The corpus keeps `null` inside `meta`, but base.md's nested-null rule does not exempt `meta`. Fix: numbers MUST be finite, `meta` keys MUST be strings, and `meta` content is opaque.
- **SB-S16 (medium): which diagnostics go with an error.** `essay-nbsp-before-tag` and `numeric-nbsp-on-tag-line` list a warning next to `parse-error`. All other invalid examples leave out warnings and infos (for example, `model-only/essay-blank-stem` has no `missing-*`). lint-codes has no rule for this.
- **SB-S17 (medium): the path convention for `schema-error` is not stated.** A missing key is reported at the key (`["answer"]`); an unknown key at the key (`["invalid-field"]`, `["automation"]`); a bad `type` at `[]`. Validators report `required` and `unevaluatedProperties` at the parent object, so "keeps the path" does not give these paths.
- **SB-S18 (low): table inconsistencies.** base.md says Additional Rules lists only rules the schema does not capture, but it includes the uuid well-formedness row, which the schema pattern captures. The `blank-text-field` error row in lint-codes contains a non-normative hedge about `blank-intro-field`. exam.md imports only the `id`, `uuid`, `locale` and `title` rules, but lint-codes marks several codes as "any (incl. exams)". That includes `stem-not-a-paragraph`, and an exam has no stem.
- **SB-S19 (low): uuid differs between exam and question.** The exam `uuid` has `format: uuid` and the question `uuid` does not.
- **SB-S20 (low): `type: ~` in Markdown.** In Markdown, `type` is optional and inferred. In the schema it is required. Is `type: ~` treated as absent and inferred, or as a schema error?

## Checked and fine
- **Bundle:** matches all 10 sources. The root `oneOf` holds the 8 types and the exam.
- **Schema and prose agree on:** `weight` minimum 0; `normalizations` is a set; `unit` equals `UNIT` in grammar.md; `marker` has length 1 (the corpus uses `malformed-true-false-marker` under lint-codes' "own code wins" rule); `locale` has no pattern, and `malformed-locale` covers it.
- **Coverage by code:** `blank-text-field` error (`model-only/essay-blank-{stem,epilogue,text-field}`) and warning (`essay/blank-{title,author,comment,answer-key}`, `exam/blank-title`); `forbidden-block-element` (`invalid/essay-forbidden-*`, `essay-h1-in-preamble`, `essay-slug-not-first-element`, `model-only/essay-forbidden-{heading-stem,list}`); `malformed-locale` (3 model-only); `unsafe-id` (essay, exam); `blank-tag`, `unsplit-tag-list`, `locale-lookalike-language` (essay); `malformed-uuid` (essay, exam); `uuid-unknown-*` (essay; exam version only); `missing-id`/`missing-title` (many); `unsafe-thematic-break` (4 + 1 safe negative); `non-ascii-whitespace` (warning at line start/end, after a slug, NEL/LS, tag lines; info in prose and FEFF; code, frontmatter and BOM skipped); `unknown-frontmatter-key` (essay only); `stem-not-a-paragraph` (YAML only); `yaml-syntax-error` (3 `question-*` + exam); `json-syntax-error` (2); `invalid-document` (1); `schema-error` (many); `wrong-kind` (none).
- **YAML 1.2 Core:** `multiple-choice/yaml-core-schema` (`yes`/`no`/`on`/`off`, `1:30`, date as strings; `010` = 10, `0o10` = 8, `0x1F` = 31; `True`; `~`); `essay/locale-yaml-11-boolean`; `exam/start-date-only`, `exam/duration-hh-mm`; `id: 2024` as an error in Markdown, in YAML, and in `exam-ids-not-strings`.
- **Null rules:** `multiple-choice/null-fields` (`weight: null` is absent, default not materialized); `essay/null-id-and-tags`; `meta` keeps its null in `yaml-core-schema`.
- **Comment-string grammar:** blank lines before it, end at a blank line, column 0 only, removal of `#` plus one space, a frontmatter with only a comment, and a `#` after the first key as an ordinary YAML comment. All pinned. The field is `comment`.
- **Slug:** frontmatter precedence, slug stripped from the stem; slug in the preamble; `[ Q1 ]` and `[Prova 1]` stay as text.
- **BOM:** handled with and without a frontmatter.
