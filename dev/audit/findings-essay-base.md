---
type: note
status: active
tags: [mdq, audit, examples]
relatedTo: [docs/question-types, examples]
---

# Audit findings: essay + common (base) rules

Scope: `examples/valid/essay/` (75 files, 29 examples), checked against
`docs/question-types/base.md`, `docs/question-types/essay.md`,
`docs/references/grammar.md`, `docs/lint-codes.md`, `schema/question-base.yaml`,
`schema/essay.yaml`. Invalid examples read for coverage only.

Result in short: no high-severity mismatch. The AST and lint files agree with
the spec in all 29 examples, except for the low-severity items below. The main
problem is coverage: most edge cases of `base.md` and `grammar.md` have no
example. Statements marked "impl:" come from runs of mdq-py on scratch files
outside the repo.

### Example mismatches

`ID | severity | example file(s) | spec reference | what is wrong | expected vs actual`

- EB-M1 | low | `valid/essay/metadata-comment.yaml` | base.md:32-34, base.md:39-42, grammar.md:63, base.md:236-242 | The comment string is `COMMENT_LINE+` without `#` and the first space. The licence to normalize whitespace (base.md:236-242) covers only `preamble`, `epilogue`, `stem`. The example joins the two comment lines with a space. | Expected by the letter: `"...base cases and\nrecursive cases..."`. Actual: one line joined with a space (folded scalar). Either the example or the spec must change; see EB-S1.
- EB-M2 | low | `valid/essay/code-without-highlight.lint.json` | essay.md:91, lint-codes.md:22 | `code-input-without-highlight` has path `["input"]`. The rule is on field `highlight` in the essay.md table, and the other "not defined" codes (`missing-id`, `missing-title`, `missing-answer-key`) use the path of the absent field. | Expected `["highlight"]` for consistency. Actual `["input"]`.
- EB-M3 | low | `valid/essay/answer-key.*`, `valid/essay/locale-case-insensitive.yaml` | lint-codes.md:33-36 | No `.lint.json`. Both documents define `id`, `title`, `answerKey`, so the expected list is `[]`. These are the only two essay examples that would pin a clean lint result, and `locale-case-insensitive` exists to prove that `pt-br` reports nothing. | Expected: `.lint.json` with `[]`. Actual: not pinned.
- EB-M4 | low | `invalid/model-only/essay-malformed-locale.yaml` (header comment) | schema/question-base.yaml:77-87 | The comment says "JSON Schema's `locale` pattern accepts any short lowercase word". The schema has no `locale` pattern. | Stale comment. Same stale claim in base.md:278-280 (EB-S6).
- EB-M5 | low | `invalid/extra-fields.yaml` | schema/question-base.yaml:113-114, schema/essay.yaml:58 | The document breaks two rules at once: unknown key `invalid-field` and missing required `stem`. It cannot show which rule rejects it. No `.lint.json`. | Expected: one violation per example, with pinned code and path.
- EB-M6 | low | `invalid/essay-malformed-uuid.yaml`, `invalid/model-only/essay-blank-text-field.yaml`, `essay-forbidden-heading-stem.yaml`, `essay-malformed-locale.yaml` | lint-codes.md:77, 82, 85, 89 | No `.lint.json`: the error code (`malformed-uuid`, `blank-text-field` as error, `forbidden-block-element`, `malformed-locale`), severity and path are not pinned anywhere in the corpus. `question-id-not-string` and `question-duplicate-key` show that invalid examples can pin them. | Expected: `.lint.json` with the error code.

No disagreement found in: split of preamble / stem / epilogue (all 17 markdown
sources), id precedence, type inference without frontmatter, tag splitting,
`meta`, `weight`, `uuid`, code fences and thematic break in the preamble,
missing final newline (`preamble-with-code.mdq.md`), and all other pinned
diagnostics (code, severity, presence of `missing-id` / `missing-title` /
`missing-answer-key`).

### Coverage gaps

`ID | spec reference | rule or case with no example | suggested example`

Frontmatter and comment string:

- EB-G1 | base.md:48-57 | Blank line breaks the comment string. Only `metadata-comment` has a comment string in the whole corpus. | `essay/comment-broken-by-blank-line`: two `#` lines, blank line, a third `#` line; `comment` holds only the first two.
- EB-G2 | base.md:34 ("first space, if present") | `#` without a space (`#text`), and `#` with two spaces (only one is removed). | `essay/comment-no-space`.
- EB-G3 | base.md:39 (`blank_line*`) | Blank lines between `---` and the comment string. | `essay/comment-after-blank-lines`.
- EB-G4 | base.md:39, grammar.md:63 | `COMMENT_LINE` starts at column 0, so an indented `  # text` is not part of the comment string. Also: comment after the first YAML key is not a comment string. | `essay/comment-indented-is-ignored`, `essay/comment-after-first-key`.
- EB-G5 | base.md:10-15 | Frontmatter that holds only a comment string (empty YAML). The spec itself uses this as the basic structure. | `essay/frontmatter-only-comment`.
- EB-G6 | base.md:270, lint-codes.md:21 | A comment string of a bare `#` line: `comment` is empty, `blank-text-field` warning from a markdown source. `blank-comment` exists only as YAML. Also no example of `blank-text-field` on `title`, `author`, `answerKey`. | `essay/blank-comment.mdq.md`, `essay/blank-title.yaml`, `essay/blank-author.yaml`.
- EB-G7 | base.md:87-88 | Null `id` and null `tags` (`id:` with nothing after it) equal an absent field. No example in any directory. | `essay/null-id-and-tags.mdq.md` with `missing-id` in the lint file.
- EB-G8 | base.md:85-87 | Non-string values: only `id: 2024` is covered. Missing: `title: 2024`, `author: 42`, `uuid`, `locale: no` (YAML 1.1 boolean), `tags: [a, 1]`, `tags: 2024`, `type: true`, `weight: "2"`, `meta: text`. | One invalid example per field class; at least `title`, `tags` entry and `locale`.
- EB-G9 | base.md:81-83 | Repeated key: covered only at the top level of a short-answer question. Missing: repeated key inside `meta` ("A mapping MUST NOT repeat a key" applies to every mapping), and in a YAML/JSON AST document (`json-syntax-error`, lint-codes.md:102). | `invalid/question-duplicate-meta-key.mdq.md`, `invalid/question-duplicate-key.json`.
- EB-G10 | lint-codes.md:57 | `unknown-frontmatter-key` has no example in the corpus. Known (weak spec basis). Includes the cases `answerKey:` and `comment:` written in the frontmatter, which mdq-py drops as unknown keys. | `essay/unknown-frontmatter-key.mdq.md` + lint file.
- EB-G11 | base.md:73, base.md:79, schema/question-base.yaml:96-99 | `weight: 0` (explicitly allowed), negative weight (MUST NOT), fractional weight. Only `weight: 2` exists. | `essay/weight-zero`, `invalid/question-negative-weight`.
- EB-G12 | base.md:65, base.md:75 | `type` with an invalid value; `type` that disagrees with the body (`type: numeric` + `[essay]`); `type: essay` with no `[essay]` body. | Three invalid examples.
- EB-G13 | base.md:77, lint-codes.md:62-63, schema/question-base.yaml:31 | Uppercase UUID (schema accepts `A-F`; variant `A`/`B`), nil UUID and max UUID. | `essay/uuid-uppercase.yaml`.
- EB-G14 | base.md:69, base.md:268-269 | String `tags` edge cases: empty entries (`"a, , b,"`), single tag without comma, empty string, entry whitespace. Also duplicate tags (schema `uniqueItems`, question-base.yaml:94). | `essay/tags-string-empty-entries`, `invalid/question-duplicate-tags`.
- EB-G15 | base.md:78, lint-codes.md:31, 85 | Locale: only `pt-BR`, `pt-br`, `cn`, `brasil`. Missing: script and region (`zh-Hans-CN`, a schema example), three-letter language, private use (`x-...`), grandfathered tag, uppercase language (`PT-br`), empty string. | `essay/locale-script-region.yaml`, `invalid/model-only/essay-locale-empty.yaml`.

Introduction, stem, slug:

- EB-G16 | base.md:103-118 | Stem ellipsis exists only in `multiple-choice/ellipsis-stem`, with a blank line before the list. Missing: the exact form of the spec (`...` directly followed by the list, no blank line), the ellipsis in an essay, U+2026 (lint-codes.md:55 accepts it), ellipsis with a preamble before it, ellipsis with an inline slug (`[Q1] ...`). | `essay/ellipsis-stem`, `essay/ellipsis-unicode`.
- EB-G17 | base.md:98-101, base.md:267, lint-codes.md:53 | `stem-not-a-paragraph` exists only as YAML (blockquote). No markdown source where the last block before the body is a list, table, heading (H2-H6), blockquote or code fence. | `essay/stem-is-a-list.mdq.md` + lint file.
- EB-G18 | base.md:140-156 | Inline slug when the first element is a preamble paragraph, not the stem (`[Q1] Context...` + stem). Both slug examples have no preamble. | `essay/inline-id-in-preamble`.
- EB-G19 | base.md:142 | "If the first element is a paragraph": first element is not a paragraph (code fence, list, blockquote) and a later paragraph starts with `[Q1]`. This must be `forbidden-block-element`, not a slug. | `invalid/question-slug-not-first-element`.
- EB-G20 | base.md:158-166, base.md:266 | Inline `[...]` whose content is not a `SLUG` (`[Prova 1]`, `[q-]`, `[é]`): stays as text in the first paragraph. `unsafe-id` is covered only via the frontmatter. | `essay/inline-non-slug-is-text`.
- EB-G21 | base.md:171-177 | Bracketed tags with whitespace inside: `[ Q1 ]` is not a slug; `[ essay ]` / `[essay ]` is not the body tag. No example in any directory. | `essay/spaced-slug-is-text`, `invalid/essay-spaced-tag`.
- EB-G22 | base.md:179-182, essay.md:29-35 | Whitespace outside the brackets: indented `[essay]` (1-3 spaces), trailing spaces/tabs after `[essay]` (essay.md:10 has a trailing space in its own example), indented slug. | `essay/indented-tag`.
- EB-G23 | base.md:98, base.md:26-27 | Missing stem (document with only `[essay]`), and missing body. | `invalid/essay-no-stem.mdq.md`, `invalid/essay-no-body.mdq.md` with pinned code (`parse-error`).

Forbidden elements (base.md:127-133, lint-codes.md:82). Only "H1 heading in the
stem" is covered, as YAML, without a pinned code:

- EB-G24 | base.md:129 | Unordered list where all items start with `[`, in preamble and in epilogue. Negative case: a list where only some items start with `[` is valid; an ordered list with `[` items is valid. | `invalid/model-only/essay-forbidden-list.yaml`, `essay/list-partly-bracketed`.
- EB-G25 | base.md:130-131 | Paragraph that starts with `[` outside the first paragraph: in preamble (2nd paragraph), in the stem when a preamble exists, in the epilogue. Also with leading `ws`. | `invalid/essay-forbidden-paragraph-epilogue.mdq.md`.
- EB-G26 | base.md:130 (exception 1) | First paragraph that starts with `[` but is not a slug (for example a markdown link `[text](url) ...`). | `essay/first-paragraph-starts-with-link`.
- EB-G27 | base.md:131 (exception 2) | Paragraph that starts with `[^`, in any question type. No fill-in example has a paragraph that starts with a blank either. | `essay/epilogue-starts-with-footnote`, plus a fill-in example.
- EB-G28 | base.md:132 | H1 from a markdown source. impl: a document `Pre / # H1 / Stem / [essay]` loads as an exam with zero questions and reports only `exam-without-questions`, although exam.md:96 requires the H1 at the start of the document. Setext H1 (`Title` + `===`) is also not covered. | `invalid/essay-h1-in-preamble.mdq.md`.
- EB-G29 | base.md:133 | Heading (H2-H6) that starts with `[`, other than `## [answer-key]`. Positive case: a plain H2 in the preamble or epilogue. | `invalid/essay-forbidden-heading.mdq.md`, `essay/heading-in-preamble`.
- EB-G30 | base.md:198-199 | Epilogue with forbidden elements; epilogue with more than one block; epilogue with a code fence or table. | Covered partly by EB-G24/25.
- EB-G31 | base.md:263, lint-codes.md:77 | `blank-text-field` as error for `stem` and `epilogue` (only `preamble` exists). Also strings that hold only Unicode spaces or an HTML comment: "visible character" is not defined (EB-S9). | `invalid/model-only/essay-blank-stem.yaml`.

Encoding, line endings, Unicode spaces (no file in the corpus has a BOM, a CR
or a Unicode space; verified by byte search over `examples/`):

- EB-G32 | grammar.md:41-42 | BOM at the start of the file, with and without frontmatter. | `essay/bom.mdq.md`.
- EB-G33 | grammar.md:29, grammar.md:63 | `\r\n` and bare `\r` line endings, including in the frontmatter separator and the comment string. | `essay/crlf.mdq.md`, `essay/cr-only.mdq.md`.
- EB-G34 | grammar.md:32-35 | Characters that MUST NOT split lines: U+000C, U+0085, U+2028 inside a paragraph and inside a comment string. | `essay/form-feed-is-text.mdq.md`.
- EB-G35 | grammar.md:91-130, lint-codes.md:41 | `non-ascii-whitespace`: zero examples. Missing each case: info in prose (U+00A0 between number and unit); warning for U+0085 / U+2028 / U+2029 anywhere; warning at start of line; at end of line; after list / heading markers and `>` / `!`; on a tag line; inside and after a bracketed tag at line start (`[Q1]` + U+00A0); U+FEFF in the middle of the file; skipped positions (code fence, indented code, code span, frontmatter). | One example per bullet of grammar.md:101-130; at least `essay/nbsp-in-prose`, `essay/nbsp-before-tag` (paragraph U+00A0 + `[essay]` is text, grammar.md:51-54), `essay/nbsp-after-slug`, `essay/nbsp-in-code-is-skipped`.

Essay:

- EB-G36 | essay.md:58-59 | Answer key together with an epilogue. No example has both. | `essay/epilogue-and-answer-key`.
- EB-G37 | essay.md:59-60 | Answer key with several blocks (list, code fence, heading inside); text on the line right after the heading without a blank line (the form used in essay.md:67-68); empty answer key section; second `## [answer-key]` heading; `## [answer-key]` before `[essay]`. | `essay/answer-key-multi-block`, `invalid/essay-empty-answer-key`.
- EB-G38 | essay.md:89, schema/essay.yaml:46-47 | `blank-text-field` on `answerKey`: no example, and prose and schema disagree (EB-S4). | `essay/blank-answer-key.yaml` after the decision.
- EB-G39 | essay.md:21, schema/essay.yaml:23-27 | `input: text` written in a markdown frontmatter; invalid `input` value; `input: plain` + `highlight` (`ignored-highlight` exists only with `text`, and only as YAML); `input: code` + `highlight` absent from a markdown source. | `essay/ignored-highlight-plain.mdq.md`, `invalid/essay-unknown-input.yaml`.
- EB-G40 | essay.md:29-35 | `[essay]` with text after it in the same paragraph; two `[essay]` tags; `[essay]` inside a list or blockquote; `[Essay]` (case). | Invalid examples with pinned code.

### Spec problems

`ID | severity | spec reference(s) | contradiction / ambiguity / omission`

- EB-S1 | medium | base.md:32-34, base.md:236-242, base.md:261-270 | The spec never says that the comment string becomes the AST field `comment`, how the lines are joined (newline or space), or if whitespace normalization applies. The mapping section names only `preamble`, `epilogue`, `stem`. `comment` is in the rules table and in the schema, but not in the frontmatter table (base.md:63-73). impl: joins with a space, keeps an empty `#` line as a double space.
- EB-S2 | medium | base.md:63-73, base.md:90-91, essay.md:18-22, schema/*.yaml | Fields of the AST that are not in the frontmatter tables (`comment`, `answerKey`, `stem`, `preamble`, `epilogue`) have no rule when written in the frontmatter. The precedence rule (base.md:90-91) suggests that they are accepted and win over the body; impl drops `answerKey` and `comment` with `unknown-frontmatter-key`. Known in part (unknown keys have no spec text).
- EB-S3 | medium | base.md:224-226 vs base.md:69, base.md:269, schema/question-base.yaml:89-94 | "All fields in the frontmatter are translated as-is ... same name, types": false for `tags` (string becomes list). The spec also does not define the split: trimming of entries, empty entries, whether a YAML/JSON AST document may hold a string `tags` (schema says array only, but rule base.md:269 speaks of "`tags` itself is a single string"). impl: trims and silently drops empty entries.
- EB-S4 | medium | essay.md:89, lint-codes.md:21 vs schema/essay.yaml:46-47 | Blank `answerKey` is a warning in the prose (`blank-text-field`), but the schema has `minLength: 1` and `pattern: "\\S"`, so it is a schema error. The pattern also uses the shorthand `\S`, which grammar.md:11-19 forbids for the reason that the dialects disagree.
- EB-S5 | medium | base.md:270 vs schema/question-base.yaml:42, 48, 18, 56 | `title` and `author` have `minLength: 1` in the schema: `title: ""` is a schema error, `title: " "` is a warning. The prose gives one rule (warning). impl: reports `author: ""` as warning, so it disagrees with the schema. `comment` has no `minLength`. `id` has `minLength: 1` but the prose has no rule for an empty id.
- EB-S6 | low | base.md:278-280 | Footnote 8 cites "the `locale` pattern in Frontmatter". There is no such pattern in base.md or in the schema (question-base.yaml:77-87 says that the check is left to the implementation).
- EB-S7 | medium | base.md:140-156 | Slug section omits: that the slug is removed from the text; whether whitespace after `]` is required (impl: `[Q1]Stem` gives id `Q1`); what happens to a first-paragraph `[...]` that is not a `SLUG` (text? `unsafe-id`? error?); whether the discarded inline slug of `id-precedence` must still be a valid slug. "First element" is also unclear: first block of the document, or the first paragraph.
- EB-S8 | medium | base.md:132 vs exam.md:96 | H1 is a forbidden element of a question, but an H1 is also the marker of an exam. The spec does not say which wins for an H1 that is not at the start of the document. impl: treats it as an exam, so `forbidden-block-element` for H1 cannot come from a markdown source.
- EB-S9 | low | base.md:263, 268, 270 | "Visible character" is not defined. Open cases: Unicode spaces (text for the grammar, grammar.md:93), zero-width characters, U+FEFF, a string with only an HTML comment or only markup (`**` `**`).
- EB-S10 | low | base.md:103, base.md:275 vs lint-codes.md:55 | base.md speaks of `...` only; lint-codes.md also accepts U+2026. base.md does not say if the parser accepts `…` as the ellipsis stem, or if spaces around it are allowed. "MAY be replaced" also leaves open if the AST holds `...` or the default statement, so two conforming parsers can give different ASTs for the same source.
- EB-S11 | low | base.md:4-6 vs base.md:17-27, 93-96 | Terms differ: "introduction, body, epilogue" in the list of 5 sections; "Question introduction", then "preamble and stem". Rule for the split is never stated: the stem is the last block before the body, all blocks before it are the preamble. The examples depend on this rule.
- EB-S12 | low | base.md:129-133 | Forbidden list is ambiguous about scope: "except the first paragraph" - of the document, or of each field? lint-codes.md:82 says "first paragraph of the combined preamble+stem"; base.md does not. The essay body itself is a paragraph that starts with `[`, and `## [answer-key]` is a heading that starts with `[`: the list does not state that body and special sections are recognized before the rule applies. No rule for blockquotes or ordered lists whose content starts with `[`.
- EB-S13 | medium | essay.md:58-60 | Answer key section omits: its extent (to the end of the file?), allowed blocks, a nested heading, a repeated `## [answer-key]`, an empty section, whitespace normalization of `answerKey`. impl: a `## Other` heading inside the section loses its `##` marker in `answerKey`, which changes markdown semantics.
- EB-S14 | low | essay.md:29-35 | Body grammar is only `"[essay]"`. It does not say that the tag must be the whole paragraph, or that `ws` may come before and after it (base.md:179 allows indentation; essay.md:10 has a trailing space).
- EB-S15 | low | essay.md:21, essay.md:39-49 vs schema/essay.yaml:27 | Default of `input` (`text`) is only in the schema. base.md does not say if the AST holds defaults (`input`, `weight`, `tags`). The markdown examples omit them; the YAML-only examples write `input: text`.
- EB-S16 | low | base.md:65 | Type inference is mentioned ("instead of inferring it") but never specified in base.md: which body wins when blocks of two types are present, and what happens when `type` disagrees with the body.
- EB-S17 | low | base.md:77, lint-codes.md:62-63 vs schema/question-base.yaml:31 | Schema accepts uppercase hex; the lint text lists only lowercase `a`, `b` for the variant. Nil and max UUID (RFC 9562) get both warnings. impl: uppercase `A` variant reports nothing.
- EB-S18 | low | schema/question-base.yaml:94 | `tags` has `uniqueItems: true`; the prose has no rule about repeated tags and no code for it.
- EB-S19 | low | base.md:39 | The grammar requires `nl` after the closing `---`, and `yaml` is not optional-marked although base.md:10-15 shows a frontmatter of comments only. No rule for a frontmatter whose YAML is not a mapping (list, scalar) at the question level (`invalid-document` is defined for the top level of a document, lint-codes.md:108).
- EB-S20 | low | lint-codes.md:57 | `unknown-frontmatter-key` has no spec text. Known (`dev/issues/lint-spec-open-decisions.md`).

Examples checked in full: 29 (all 75 files of `examples/valid/essay/`), plus 7 invalid examples read for coverage.
```