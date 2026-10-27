/**
 * Corpus examples that the TypeScript port does not handle yet.
 *
 * The suites run every example in the shared corpus. An example listed here
 * runs as an expected failure (`it.fails`): the suite stays green while the
 * port is behind, and an entry fails as soon as its example starts to pass,
 * so the list cannot go stale. An example that Python adds and that is not
 * listed here fails at once, which is how drift becomes visible.
 *
 * Keys are `relativeId` names. A key that ends in `.` is a prefix and covers
 * every example whose name starts with it. The value says why the example
 * fails and the phase of the port plan (`dev/plan/mdq-js-paridade.md`, in
 * the root repository) that fixes it; remove the entry in that phase. See
 * `docs/sync/testing.md`.
 *
 * The manifests of the corpus suites of phase P1 (`LOADING`, `LINT`,
 * `LINT_CODES`, `MATCHING`, `IDS`, `NORMALIZE`, `GRADING`) key each test as
 * `<group>.<case>`. While nothing of a group is ported, one prefix entry
 * (`"regex."`) covers it. A phase that ports part of a group replaces its
 * prefix with one entry per case that still fails.
 */

import { it } from "vitest";

type Manifest = Record<string, string>;

/** `.mdq.md` sources that do not parse into their `.yaml` sibling. */
export const PARSE: Manifest = {};

/** `valid/` documents that the Zod schemas reject. */
export const SCHEMA: Manifest = {};

/** `invalid/model-only/` documents that `validateDocument` accepts. */
export const MODEL_RULES: Manifest = {};

/**
 * `invalid/**\/*.mdq.md` sources that are not rejected with an error code
 * their `.lint.json` pins. The reason lists the expected codes and the phase
 * of the port plan that ports them.
 */
export const LOAD: Manifest = {};

/** `.resolved.yaml` fixtures whose exam `resolveExam` does not resolve to the expected ids. */
export const RESOLVE: Manifest = {
	"exam.include-inheritance.resolved.yaml": "lint (P5)",
};

/**
 * Documents under `invalid/` that `load` does not report with exactly the
 * diagnostics their `.lint.json` pins (`tests/loading.spec.ts`). Keys are
 * `<group>.<relativeId>`: groups `syntax`, `parsed-only`, `source` and
 * `sibling`.
 */
export const LOADING: Manifest = {
	// Package I of mdq-py (YAML 1.2, untracked in the corpus): not P4.
	"source.essay-frontmatter-complex-key.mdq.md":
		"complex YAML key, mdq-py package I (not yet ported)",
	"syntax.syntax.yaml-complex-key.yaml":
		"complex YAML key, mdq-py package I (not yet ported)",
};

/**
 * Documents under `valid/` whose lint diagnostics differ from the
 * `.lint.json` (`tests/lint.spec.ts`). Keys are `<group>.<relativeId>`:
 * groups `parsed` and `source`.
 */
export const LINT: Manifest = {
	"parsed.essay.answer-key-html-comment.yaml": "lint (P5)",
	"parsed.essay.bom-no-frontmatter.yaml": "lint (P5)",
	"parsed.essay.bom.yaml": "lint (P5)",
	"parsed.essay.bracket-text-first-block.yaml": "lint (P5)",
	"parsed.essay.code-python.yaml": "lint (P5)",
	"parsed.essay.code-without-highlight.yaml": "lint (P5)",
	"parsed.essay.comment-after-blank-lines.yaml": "lint (P5)",
	"parsed.essay.comment-after-first-key.yaml": "lint (P5)",
	"parsed.essay.comment-bare-hash.yaml": "lint (P5)",
	"parsed.essay.comment-broken-by-blank-line.yaml": "lint (P5)",
	"parsed.essay.comment-indented-is-ignored.yaml": "lint (P5)",
	"parsed.essay.comment-no-space.yaml": "lint (P5)",
	"parsed.essay.content-text-frontmatter.yaml": "lint (P5)",
	"parsed.essay.cr-only.yaml": "lint (P5)",
	"parsed.essay.crlf.yaml": "lint (P5)",
	"parsed.essay.empty-answer-key.yaml": "lint (P5)",
	"parsed.essay.epilogue-rubric-list.yaml": "lint (P5)",
	"parsed.essay.epilogue-starts-with-footnote.yaml": "lint (P5)",
	"parsed.essay.feff-in-middle.yaml": "lint (P5)",
	"parsed.essay.fenced-code-no-lang.yaml": "lint (P5)",
	"parsed.essay.form-feed-is-text.yaml": "lint (P5)",
	"parsed.essay.frontmatter-only-comment.yaml": "lint (P5)",
	"parsed.essay.full-metadata.yaml": "lint (P5)",
	"parsed.essay.heading-in-stem.yaml": "lint (P5)",
	"parsed.essay.id-precedence.yaml": "lint (P5)",
	"parsed.essay.image-and-link.yaml": "lint (P5)",
	"parsed.essay.indented-tag.yaml": "lint (P5)",
	"parsed.essay.inline-id-in-stem.yaml": "lint (P5)",
	"parsed.essay.inline-id.yaml": "lint (P5)",
	"parsed.essay.inline-non-slug-is-text.yaml": "lint (P5)",
	"parsed.essay.link-stem.yaml": "lint (P5)",
	"parsed.essay.list-partly-bracketed.yaml": "lint (P5)",
	"parsed.essay.locale-grandfathered.yaml": "lint (P5)",
	"parsed.essay.locale-lookalike.yaml": "lint (P5)",
	"parsed.essay.locale-private-use.yaml": "lint (P5)",
	"parsed.essay.locale-script-region.yaml": "lint (P5)",
	"parsed.essay.locale-three-letter.yaml": "lint (P5)",
	"parsed.essay.locale-uppercase.yaml": "lint (P5)",
	"parsed.essay.locale-yaml-11-boolean.yaml": "lint (P5)",
	"parsed.essay.meta-null-value.yaml": "lint (P5)",
	"parsed.essay.meta-same-key-in-nested-mappings.yaml": "lint (P5)",
	"parsed.essay.meta.yaml": "lint (P5)",
	"parsed.essay.metadata-comment.yaml": "lint (P5)",
	"parsed.essay.nbsp-after-slug.yaml": "lint (P5)",
	"parsed.essay.nbsp-end-of-line.yaml": "lint (P5)",
	"parsed.essay.nbsp-in-code-is-skipped.yaml": "lint (P5)",
	"parsed.essay.nbsp-in-frontmatter-is-skipped.yaml": "lint (P5)",
	"parsed.essay.nbsp-in-prose.yaml": "lint (P5)",
	"parsed.essay.nbsp-start-of-line.yaml": "lint (P5)",
	"parsed.essay.nel-before-hash-is-stem.yaml": "lint (P5)",
	"parsed.essay.nel-in-prose.yaml": "lint (P5)",
	"parsed.essay.no-title.yaml": "lint (P5)",
	"parsed.essay.null-content-and-optionals.yaml": "lint (P5)",
	"parsed.essay.null-id-and-tags.yaml": "lint (P5)",
	"parsed.essay.plain-content.yaml": "lint (P5)",
	"parsed.essay.spaced-slug-is-text.yaml": "lint (P5)",
	"parsed.essay.stem-epilogue.yaml": "lint (P5)",
	"parsed.essay.stem-hard-breaks.yaml": "lint (P5)",
	"parsed.essay.stem-indented-code-block-of-nbsp.yaml": "lint (P5)",
	"parsed.essay.stem-with-code.yaml": "lint (P5)",
	"parsed.essay.tag-slug-essay.yaml": "lint (P5)",
	"parsed.essay.tags-as-string.yaml": "lint (P5)",
	"parsed.essay.tags-null.yaml": "lint (P5)",
	"parsed.essay.tags-single-string.yaml": "lint (P5)",
	"parsed.essay.tags-string-final-comma.yaml": "lint (P5)",
	"parsed.essay.tags.yaml": "lint (P5)",
	"parsed.essay.thematic-break-answer-key.yaml": "lint (P5)",
	"parsed.essay.thematic-break-epilogue-first.yaml": "lint (P5)",
	"parsed.essay.thematic-break-epilogue.yaml": "lint (P5)",
	"parsed.essay.thematic-break-four-dashes.yaml": "lint (P5)",
	"parsed.essay.thematic-break-indented-dashes.yaml": "lint (P5)",
	"parsed.essay.thematic-break-spaced-asterisks.yaml": "lint (P5)",
	"parsed.essay.thematic-break-spaced-dashes.yaml": "lint (P5)",
	"parsed.essay.thematic-break-stem-first.yaml": "lint (P5)",
	"parsed.essay.thematic-break-stem.yaml": "lint (P5)",
	"parsed.essay.thematic-break-underscores.yaml": "lint (P5)",
	"parsed.essay.unknown-highlight-language.yaml": "lint (P5)",
	"parsed.essay.unsafe-id-trailing-newline.yaml": "lint (P5)",
	"parsed.essay.unsafe-id.yaml": "lint (P5)",
	"parsed.essay.unsplit-tag-list.yaml": "lint (P5)",
	"parsed.essay.uuid-max.yaml": "lint (P5)",
	"parsed.essay.uuid-nil.yaml": "lint (P5)",
	"parsed.essay.uuid-unknown-variant.yaml": "lint (P5)",
	"parsed.essay.uuid-unknown-version.yaml": "lint (P5)",
	"parsed.essay.uuid-uppercase.yaml": "lint (P5)",
	"parsed.essay.weight-fraction.yaml": "lint (P5)",
	"parsed.essay.weight-zero.yaml": "lint (P5)",
	"parsed.exam.all-question-types.yaml": "lint (P5)",
	"parsed.exam.bank.2024.yaml": "lint (P5)",
	"parsed.exam.bank.cerrado-01.yaml": "lint (P5)",
	"parsed.exam.bank.mata-atlantica-01.yaml": "lint (P5)",
	"parsed.exam.bank.pantanal-01.yaml": "lint (P5)",
	"parsed.exam.bank.recursion-01.yaml": "lint (P5)",
	"parsed.exam.bank.tags-unsplit-01.yaml": "lint (P5)",
	"parsed.exam.body-tag-in-code-block.yaml": "lint (P5)",
	"parsed.exam.bom-before-title.yaml": "lint (P5)",
	"parsed.exam.code-block-structure-lines.yaml": "lint (P5)",
	"parsed.exam.comment.yaml": "lint (P5)",
	"parsed.exam.duration-carry-hours.yaml": "lint (P5)",
	"parsed.exam.duration-carry-minutes.yaml": "lint (P5)",
	"parsed.exam.duration-days-hours-minutes.yaml": "lint (P5)",
	"parsed.exam.duration-hh-mm.yaml": "lint (P5)",
	"parsed.exam.duration-hours-only.yaml": "lint (P5)",
	"parsed.exam.duration-iso-days.yaml": "lint (P5)",
	"parsed.exam.duration-iso-minutes.yaml": "lint (P5)",
	"parsed.exam.duration-seconds.yaml": "lint (P5)",
	"parsed.exam.duration-weeks.yaml": "lint (P5)",
	"parsed.exam.empty-heading.yaml": "lint (P5)",
	"parsed.exam.except-accented-id.yaml": "lint (P5)",
	"parsed.exam.frontmatter-null-title.yaml": "lint (P5)",
	"parsed.exam.grading-mapping.yaml": "lint (P5)",
	"parsed.exam.grading-no-mistakes.yaml": "lint (P5)",
	"parsed.exam.grading-string.yaml": "lint (P5)",
	"parsed.exam.h1-slug-only.yaml": "lint (P5)",
	"parsed.exam.id-title-in-both.yaml": "lint (P5)",
	"parsed.exam.ids-positional.yaml": "lint (P5)",
	"parsed.exam.include-all-overlaps-inline.yaml": "lint (P5)",
	"parsed.exam.include-all.yaml": "lint (P5)",
	"parsed.exam.inheritance.yaml": "lint (P5)",
	"parsed.exam.inherited-grading.yaml": "lint (P5)",
	"parsed.exam.locale-well-formed-productions.yaml": "lint (P5)",
	"parsed.exam.midterm.yaml": "lint (P5)",
	"parsed.exam.nbsp-in-prose.yaml": "lint (P5)",
	"parsed.exam.nbsp-in-question-frontmatter.yaml": "lint (P5)",
	"parsed.exam.no-questions.yaml": "lint (P5)",
	"parsed.exam.nonstandard-include-query.yaml": "lint (P5)",
	"parsed.exam.null-id.yaml": "lint (P5)",
	"parsed.exam.penalty-full.yaml": "lint (P5)",
	"parsed.exam.penalty-none-explicit.yaml": "lint (P5)",
	"parsed.exam.penalty-policy.yaml": "lint (P5)",
	"parsed.exam.query-unicode-space.yaml": "lint (P5)",
	"parsed.exam.question-stem-setext-h2.yaml": "lint (P5)",
	"parsed.exam.safe-thematic-break-in-epilogue.yaml": "lint (P5)",
	"parsed.exam.scheduled.yaml": "lint (P5)",
	"parsed.exam.separator-before-include-all.yaml": "lint (P5)",
	"parsed.exam.separator-before-include.yaml": "lint (P5)",
	"parsed.exam.separator-four-equals.yaml": "lint (P5)",
	"parsed.exam.separator-indented.yaml": "lint (P5)",
	"parsed.exam.separator-spaced.yaml": "lint (P5)",
	"parsed.exam.separator-then-frontmatter-after-thematic-break.yaml":
		"lint (P5)",
	"parsed.exam.separator-trailing-spaces.yaml": "lint (P5)",
	"parsed.exam.setext-heading.yaml": "lint (P5)",
	"parsed.exam.start-date-only.yaml": "lint (P5)",
	"parsed.exam.start-local-time.yaml": "lint (P5)",
	"parsed.exam.start-offset-space-separator.yaml": "lint (P5)",
	"parsed.exam.start-utc.yaml": "lint (P5)",
	"parsed.exam.start-without-seconds.yaml": "lint (P5)",
	"parsed.exam.tags-null.yaml": "lint (P5)",
	"parsed.exam.tags-string-final-comma.yaml": "lint (P5)",
	"parsed.exam.take-home.yaml": "lint (P5)",
	"parsed.exam.thematic-break-colon-line.yaml": "lint (P5)",
	"parsed.exam.thematic-break-in-instructions.yaml": "lint (P5)",
	"parsed.exam.thematic-break-in-question.yaml": "lint (P5)",
	"parsed.exam.thematic-break-then-bare-frontmatter.yaml": "lint (P5)",
	"parsed.exam.thematic-break-trailing-blanks.yaml": "lint (P5)",
	"parsed.exam.thematic-break-without-blank-line-before.yaml": "lint (P5)",
	"parsed.exam.thematic-breaks-around-colon-in-stem.yaml": "lint (P5)",
	"parsed.exam.thematic-breaks-around-list-in-stem.yaml": "lint (P5)",
	"parsed.exam.thematic-breaks-in-stem.yaml": "lint (P5)",
	"parsed.exam.title-link-is-not-slug.yaml": "lint (P5)",
	"parsed.exam.title-multiline-frontmatter.yaml": "lint (P5)",
	"parsed.exam.title-only.yaml": "lint (P5)",
	"parsed.exam.title-without-slug.yaml": "lint (P5)",
	"parsed.exam.unsafe-id.yaml": "lint (P5)",
	"parsed.exam.unsplit-tags.yaml": "lint (P5)",
	"parsed.exam.uuid-unknown-version.yaml": "lint (P5)",
	"parsed.fill-in.blank-in-autolink-is-text.yaml": "lint (P5)",
	"parsed.fill-in.blank-in-code-is-text.yaml": "lint (P5)",
	"parsed.fill-in.blank-in-code-span-is-text.yaml": "lint (P5)",
	"parsed.fill-in.blank-in-inline-html.yaml": "lint (P5)",
	"parsed.fill-in.blank-link-is-not-a-blank.yaml": "lint (P5)",
	"parsed.fill-in.blank-reference-link-is-not-a-blank.yaml": "lint (P5)",
	"parsed.fill-in.blank-tag-space-around-colon.yaml": "lint (P5)",
	"parsed.fill-in.blockquote-stem.yaml": "lint (P5)",
	"parsed.fill-in.capital.yaml": "lint (P5)",
	"parsed.fill-in.case-variant-blank-id.yaml": "lint (P5)",
	"parsed.fill-in.choice-blank-lints.yaml": "lint (P5)",
	"parsed.fill-in.choice-blank-missing-id-second-blank.yaml": "lint (P5)",
	"parsed.fill-in.choice-blank-omitted-score-vs-zero-percent.yaml": "lint (P5)",
	"parsed.fill-in.definitions-separated-by-blank-lines.yaml": "lint (P5)",
	"parsed.fill-in.empty-blank-definition-text-line.yaml": "lint (P5)",
	"parsed.fill-in.epilogue-nested-list.yaml": "lint (P5)",
	"parsed.fill-in.first-paragraph-starts-with-blank.yaml": "lint (P5)",
	"parsed.fill-in.grading-no-mistakes.yaml": "lint (P5)",
	"parsed.fill-in.grading-shuffle-inherit.yaml": "lint (P5)",
	"parsed.fill-in.grading-symmetric.yaml": "lint (P5)",
	"parsed.fill-in.grading.yaml": "lint (P5)",
	"parsed.fill-in.ids-choice-blank.yaml": "lint (P5)",
	"parsed.fill-in.mixed-blanks.yaml": "lint (P5)",
	"parsed.fill-in.nbsp-after-blank-definition.yaml": "lint (P5)",
	"parsed.fill-in.nbsp-in-blank-pattern-list.yaml": "lint (P5)",
	"parsed.fill-in.non-blank-markers.yaml": "lint (P5)",
	"parsed.fill-in.numeric-blank-domain-mismatch.yaml": "lint (P5)",
	"parsed.fill-in.numeric-blank-lints.yaml": "lint (P5)",
	"parsed.fill-in.numeric-blank-relative-tolerance-around-zero-string.yaml":
		"lint (P5)",
	"parsed.fill-in.numeric-blank-representations.yaml": "lint (P5)",
	"parsed.fill-in.pre-validation-entry-forms.yaml": "lint (P5)",
	"parsed.fill-in.pre-validation-lints.yaml": "lint (P5)",
	"parsed.fill-in.short-answer-blank-lints.yaml": "lint (P5)",
	"parsed.fill-in.short-answer-blank-unmatchable-regex-escape.yaml":
		"lint (P5)",
	"parsed.fill-in.short-answer-patterns.yaml": "lint (P5)",
	"parsed.fill-in.shuffle-all-or-nothing.yaml": "lint (P5)",
	"parsed.fill-in.stem-starts-with-blank.yaml": "lint (P5)",
	"parsed.fill-in.tag-in-epilogue-fence.yaml": "lint (P5)",
	"parsed.multiple-choice.all-correct.yaml": "lint (P5)",
	"parsed.multiple-choice.choice-ids.yaml": "lint (P5)",
	"parsed.multiple-choice.comment-empty-lines.yaml": "lint (P5)",
	"parsed.multiple-choice.comment-only-spaces.yaml": "lint (P5)",
	"parsed.multiple-choice.comment-stripped.yaml": "lint (P5)",
	"parsed.multiple-choice.comments.yaml": "lint (P5)",
	"parsed.multiple-choice.context-paragraphs.yaml": "lint (P5)",
	"parsed.multiple-choice.continued-choice-text.yaml": "lint (P5)",
	"parsed.multiple-choice.feedback-after-empty-marker.yaml": "lint (P5)",
	"parsed.multiple-choice.feedback-indented-bullet.yaml": "lint (P5)",
	"parsed.multiple-choice.feedback-indented-fence.yaml": "lint (P5)",
	"parsed.multiple-choice.feedback-indented-heading.yaml": "lint (P5)",
	"parsed.multiple-choice.feedback.yaml": "lint (P5)",
	"parsed.multiple-choice.grading-shuffle-inherit.yaml": "lint (P5)",
	"parsed.multiple-choice.grading.yaml": "lint (P5)",
	"parsed.multiple-choice.ids-ascii-spelling.yaml": "lint (P5)",
	"parsed.multiple-choice.ids-explicit-id-wins.yaml": "lint (P5)",
	"parsed.multiple-choice.ids-order-backward.yaml": "lint (P5)",
	"parsed.multiple-choice.ids-order-forward.yaml": "lint (P5)",
	"parsed.multiple-choice.ids-punctuation-variants.yaml": "lint (P5)",
	"parsed.multiple-choice.line-separators-in-choice-text.yaml": "lint (P5)",
	"parsed.multiple-choice.link-choice.yaml": "lint (P5)",
	"parsed.multiple-choice.many-correct-choices.yaml": "lint (P5)",
	"parsed.multiple-choice.nbsp-after-choice-marker.yaml": "lint (P5)",
	"parsed.multiple-choice.nbsp-in-text-and-feedback.yaml": "lint (P5)",
	"parsed.multiple-choice.no-correct-answer-a.yaml": "lint (P5)",
	"parsed.multiple-choice.no-correct-answer-b.yaml": "lint (P5)",
	"parsed.multiple-choice.no-correct-answer.yaml": "lint (P5)",
	"parsed.multiple-choice.null-fields.yaml": "lint (P5)",
	"parsed.multiple-choice.omitted-score-vs-zero-percent.yaml": "lint (P5)",
	"parsed.multiple-choice.partial-credit-no-full-answer.yaml": "lint (P5)",
	"parsed.multiple-choice.partial-credit.yaml": "lint (P5)",
	"parsed.multiple-choice.percent-forms.yaml": "lint (P5)",
	"parsed.multiple-choice.reference-link-and-id-separators.yaml": "lint (P5)",
	"parsed.multiple-choice.setext-heading-in-epilogue-not-linted.yaml":
		"lint (P5)",
	"parsed.multiple-choice.shuffle-false.yaml": "lint (P5)",
	"parsed.multiple-choice.shuffle.yaml": "lint (P5)",
	"parsed.multiple-choice.simple.yaml": "lint (P5)",
	"parsed.multiple-choice.spaced-values.yaml": "lint (P5)",
	"parsed.multiple-choice.visually-identical-choices.yaml": "lint (P5)",
	"parsed.multiple-choice.yaml-core-scalars.yaml": "lint (P5)",
	"parsed.multiple-choice.yaml-core-schema.yaml": "lint (P5)",
	"parsed.multiple-selection.all-correct.yaml": "lint (P5)",
	"parsed.multiple-selection.bullet-list-stem.yaml": "lint (P5)",
	"parsed.multiple-selection.choice-comment-empty-marker-line.yaml":
		"lint (P5)",
	"parsed.multiple-selection.choice-deep-indent-continues-feedback.yaml":
		"lint (P5)",
	"parsed.multiple-selection.choice-deep-indent-continues-text.yaml":
		"lint (P5)",
	"parsed.multiple-selection.choice-feedback-image-line.yaml": "lint (P5)",
	"parsed.multiple-selection.choice-feedback-three-columns.yaml": "lint (P5)",
	"parsed.multiple-selection.choice-ids.yaml": "lint (P5)",
	"parsed.multiple-selection.choice-tab-after-marker.yaml": "lint (P5)",
	"parsed.multiple-selection.choice-wide-item-content.yaml": "lint (P5)",
	"parsed.multiple-selection.epilogue-starts-with-link.yaml": "lint (P5)",
	"parsed.multiple-selection.epilogue.yaml": "lint (P5)",
	"parsed.multiple-selection.feedback.yaml": "lint (P5)",
	"parsed.multiple-selection.grading-all-or-nothing.yaml": "lint (P5)",
	"parsed.multiple-selection.grading-inherit.yaml": "lint (P5)",
	"parsed.multiple-selection.grading-symmetric.yaml": "lint (P5)",
	"parsed.multiple-selection.grading.yaml": "lint (P5)",
	"parsed.multiple-selection.ids-single-digit.yaml": "lint (P5)",
	"parsed.multiple-selection.ids-single-glyph.yaml": "lint (P5)",
	"parsed.multiple-selection.nbsp-blank-marker.yaml": "lint (P5)",
	"parsed.multiple-selection.none-correct.yaml": "lint (P5)",
	"parsed.multiple-selection.shuffle-inherit.yaml": "lint (P5)",
	"parsed.multiple-selection.simple.yaml": "lint (P5)",
	"parsed.multiple-selection.stray-choice-marker-stem-yaml.yaml": "lint (P5)",
	"parsed.multiple-selection.stray-choice-marker.yaml": "lint (P5)",
	"parsed.multiple-selection.uppercase-x.yaml": "lint (P5)",
	"parsed.multiple-selection.visually-identical-choices.yaml": "lint (P5)",
	"parsed.numeric.answer-outside-domain-fraction.yaml": "lint (P5)",
	"parsed.numeric.answer-outside-domain.yaml": "lint (P5)",
	"parsed.numeric.bom-in-unit.yaml": "lint (P5)",
	"parsed.numeric.decimal-beyond-float.yaml": "lint (P5)",
	"parsed.numeric.decimal-integer-tolerance.yaml": "lint (P5)",
	"parsed.numeric.domain-decimal-integer-answer.yaml": "lint (P5)",
	"parsed.numeric.domain-mismatch-fraction.yaml": "lint (P5)",
	"parsed.numeric.domain-mismatch-integer.yaml": "lint (P5)",
	"parsed.numeric.exponent-leading-zero.yaml": "lint (P5)",
	"parsed.numeric.exponent-smallest-double.yaml": "lint (P5)",
	"parsed.numeric.exponent-string-answer.yaml": "lint (P5)",
	"parsed.numeric.exponent-trailing-zero.yaml": "lint (P5)",
	"parsed.numeric.exponent-water-ions.yaml": "lint (P5)",
	"parsed.numeric.exponent.yaml": "lint (P5)",
	"parsed.numeric.fraction-answer-decimal-string.yaml": "lint (P5)",
	"parsed.numeric.fraction-answer-float-decimal-tolerance.yaml": "lint (P5)",
	"parsed.numeric.fraction-answer-float-whole-tolerance.yaml": "lint (P5)",
	"parsed.numeric.fraction-answer-float.yaml": "lint (P5)",
	"parsed.numeric.fraction-decimal-places.yaml": "lint (P5)",
	"parsed.numeric.fraction-decimal-tolerance.yaml": "lint (P5)",
	"parsed.numeric.fraction-integer-tolerance.yaml": "lint (P5)",
	"parsed.numeric.frontmatter-decimal-places.yaml": "lint (P5)",
	"parsed.numeric.frontmatter-domain.yaml": "lint (P5)",
	"parsed.numeric.h1-line-in-epilogue-code-block.yaml": "lint (P5)",
	"parsed.numeric.h1-line-in-stem-code-block.yaml": "lint (P5)",
	"parsed.numeric.ignored-decimal-places-inferred.yaml": "lint (P5)",
	"parsed.numeric.ignored-decimal-places.yaml": "lint (P5)",
	"parsed.numeric.int32-max-plus-one.yaml": "lint (P5)",
	"parsed.numeric.int32-max.yaml": "lint (P5)",
	"parsed.numeric.int32-min-minus-one.yaml": "lint (P5)",
	"parsed.numeric.int32-min.yaml": "lint (P5)",
	"parsed.numeric.negative-fraction.yaml": "lint (P5)",
	"parsed.numeric.negative-integer.yaml": "lint (P5)",
	"parsed.numeric.plus-sign.yaml": "lint (P5)",
	"parsed.numeric.relative-tolerance-around-zero-decimal-string.yaml":
		"lint (P5)",
	"parsed.numeric.relative-tolerance-around-zero-negative-string.yaml":
		"lint (P5)",
	"parsed.numeric.relative-tolerance-around-zero-string.yaml": "lint (P5)",
	"parsed.numeric.relative-tolerance-around-zero.yaml": "lint (P5)",
	"parsed.numeric.relative-tolerance-decimal-shift.yaml": "lint (P5)",
	"parsed.numeric.relative-tolerance-over-one.yaml": "lint (P5)",
	"parsed.numeric.table-stem.yaml": "lint (P5)",
	"parsed.numeric.tabs-around-tolerance.yaml": "lint (P5)",
	"parsed.numeric.tag-tab-before-colon.yaml": "lint (P5)",
	"parsed.numeric.tolerance-no-spaces.yaml": "lint (P5)",
	"parsed.numeric.tolerance-order.yaml": "lint (P5)",
	"parsed.numeric.tolerance-spaces-after-sign.yaml": "lint (P5)",
	"parsed.numeric.unit-currency-symbol.yaml": "lint (P5)",
	"parsed.numeric.unit-slash.yaml": "lint (P5)",
	"parsed.numeric.unit-superscript.yaml": "lint (P5)",
	"parsed.numeric.unreduced-fraction.yaml": "lint (P5)",
	"parsed.numeric.whole-decimal-tolerance.yaml": "lint (P5)",
	"parsed.numeric.whole-fraction-domain-integer.yaml": "lint (P5)",
	"parsed.ordering.accept-blank-line-skip-blanks.yaml": "lint (P5)",
	"parsed.ordering.accept-other-level-lenient.yaml": "lint (P5)",
	"parsed.ordering.accept-other-level-strict.yaml": "lint (P5)",
	"parsed.ordering.accept-repeats-after-dedent.yaml": "lint (P5)",
	"parsed.ordering.accept-repeats-after-skip-blanks.yaml": "lint (P5)",
	"parsed.ordering.accept-repeats-answer-key.yaml": "lint (P5)",
	"parsed.ordering.blank-extra-line.yaml": "lint (P5)",
	"parsed.ordering.blank-line-before-section.yaml": "lint (P5)",
	"parsed.ordering.blank-ordering-line.yaml": "lint (P5)",
	"parsed.ordering.duplicate-accepts-after-dedent.yaml": "lint (P5)",
	"parsed.ordering.duplicate-alternative-lines.yaml": "lint (P5)",
	"parsed.ordering.duplicate-lines.yaml": "lint (P5)",
	"parsed.ordering.epilogue-no-sections.yaml": "lint (P5)",
	"parsed.ordering.epilogue.yaml": "lint (P5)",
	"parsed.ordering.extra-inherits-highlight.yaml": "lint (P5)",
	"parsed.ordering.extra-nested-distractors.yaml": "lint (P5)",
	"parsed.ordering.extra-text.yaml": "lint (P5)",
	"parsed.ordering.fence-info-string.yaml": "lint (P5)",
	"parsed.ordering.fence-without-language.yaml": "lint (P5)",
	"parsed.ordering.indentation-gcd.yaml": "lint (P5)",
	"parsed.ordering.indentation-unit-across-sections.yaml": "lint (P5)",
	"parsed.ordering.inline-markup-kept.yaml": "lint (P5)",
	"parsed.ordering.list-markers.yaml": "lint (P5)",
	"parsed.ordering.nested-list-sections.yaml": "lint (P5)",
	"parsed.ordering.nested-list-three-levels.yaml": "lint (P5)",
	"parsed.ordering.nested-list-two-levels.yaml": "lint (P5)",
	"parsed.ordering.normalizations-comma-string.yaml": "lint (P5)",
	"parsed.ordering.observations-adjacent.yaml": "lint (P5)",
	"parsed.ordering.redundant-strict-indentation.yaml": "lint (P5)",
	"parsed.ordering.reject-other-level-lenient.yaml": "lint (P5)",
	"parsed.ordering.reject-unreachable-level-and-copies.yaml": "lint (P5)",
	"parsed.ordering.reject-uses-distractor.yaml": "lint (P5)",
	"parsed.ordering.reject-without-feedback.yaml": "lint (P5)",
	"parsed.ordering.section-empty-feedback-marker-line.yaml": "lint (P5)",
	"parsed.ordering.section-heading-closing-sequence.yaml": "lint (P5)",
	"parsed.ordering.section-heading-indented.yaml": "lint (P5)",
	"parsed.ordering.section-heading-setext.yaml": "lint (P5)",
	"parsed.ordering.section-heading-trailing-spaces.yaml": "lint (P5)",
	"parsed.ordering.tab-indentation.yaml": "lint (P5)",
	"parsed.ordering.tab-stops-mixed.yaml": "lint (P5)",
	"parsed.ordering.tag-indented-trailing-spaces.yaml": "lint (P5)",
	"parsed.ordering.tag-space-before-colon.yaml": "lint (P5)",
	"parsed.ordering.tilde-fence.yaml": "lint (P5)",
	"parsed.ordering.trailing-whitespace.yaml": "lint (P5)",
	"parsed.ordering.two-accepts-and-reject.yaml": "lint (P5)",
	"parsed.ordering.unknown-highlight-language.yaml": "lint (P5)",
	"parsed.ordering.unreachable-reject.yaml": "lint (P5)",
	"parsed.ordering.visually-identical-across-blocks.yaml": "lint (P5)",
	"parsed.ordering.visually-identical-lines.yaml": "lint (P5)",
	"parsed.short-answer.collapsed-link-at-stem-start.yaml": "lint (P5)",
	"parsed.short-answer.exact-literal-spans-lines-block.yaml": "lint (P5)",
	"parsed.short-answer.exact-literal-spans-lines.yaml": "lint (P5)",
	"parsed.short-answer.fence-epilogue.yaml": "lint (P5)",
	"parsed.short-answer.html-block-epilogue.yaml": "lint (P5)",
	"parsed.short-answer.ignored-regex-flag-in-reject.yaml": "lint (P5)",
	"parsed.short-answer.ignored-regex-flag.yaml": "lint (P5)",
	"parsed.short-answer.image-line-continues.yaml": "lint (P5)",
	"parsed.short-answer.indented-code-stem.yaml": "lint (P5)",
	"parsed.short-answer.inline-id-and-indented-tag.yaml": "lint (P5)",
	"parsed.short-answer.manual.yaml": "lint (P5)",
	"parsed.short-answer.nbsp-in-pattern-list.yaml": "lint (P5)",
	"parsed.short-answer.nbsp-on-tag-line.yaml": "lint (P5)",
	"parsed.short-answer.no-correct-answer.yaml": "lint (P5)",
	"parsed.short-answer.ordered-list-stem.yaml": "lint (P5)",
	"parsed.short-answer.pattern-empty-feedback-marker-line.yaml": "lint (P5)",
	"parsed.short-answer.pre-validation-lint-matrix.yaml": "lint (P5)",
	"parsed.short-answer.pre-validation-regex-lints.yaml": "lint (P5)",
	"parsed.short-answer.redundant-regex-anchor-cases.yaml": "lint (P5)",
	"parsed.short-answer.redundant-regex-anchor-flags-and-literals.yaml":
		"lint (P5)",
	"parsed.short-answer.redundant-regex-anchor-object-entries.yaml": "lint (P5)",
	"parsed.short-answer.redundant-regex-anchor.yaml": "lint (P5)",
	"parsed.short-answer.simple.yaml": "lint (P5)",
	"parsed.short-answer.stem-with-prose-list.yaml": "lint (P5)",
	"parsed.short-answer.tag-space-around-colon.yaml": "lint (P5)",
	"parsed.short-answer.thematic-break-epilogue.yaml": "lint (P5)",
	"parsed.short-answer.unmatchable-regex-escape-fields.yaml": "lint (P5)",
	"parsed.short-answer.unmatchable-regex-escape-forms.yaml": "lint (P5)",
	"parsed.short-answer.unmatchable-regex-escape.yaml": "lint (P5)",
	"parsed.true-false.angstrom-sign-marker.yaml": "lint (P5)",
	"parsed.true-false.choice-comment.yaml": "lint (P5)",
	"parsed.true-false.choice-ids.yaml": "lint (P5)",
	"parsed.true-false.cjk-markers.yaml": "lint (P5)",
	"parsed.true-false.false-friend-lowercase.yaml": "lint (P5)",
	"parsed.true-false.false-friend-marker.yaml": "lint (P5)",
	"parsed.true-false.false-friend-true-letter.yaml": "lint (P5)",
	"parsed.true-false.false-friend-vi.yaml": "lint (P5)",
	"parsed.true-false.feedback.yaml": "lint (P5)",
	"parsed.true-false.fullwidth-marker.yaml": "lint (P5)",
	"parsed.true-false.global-markers.yaml": "lint (P5)",
	"parsed.true-false.grading-no-mistakes.yaml": "lint (P5)",
	"parsed.true-false.grading-shuffle-inherit.yaml": "lint (P5)",
	"parsed.true-false.grading.yaml": "lint (P5)",
	"parsed.true-false.inline-id.yaml": "lint (P5)",
	"parsed.true-false.locale-bn-m.yaml": "lint (P5)",
	"parsed.true-false.locale-de-wahr.yaml": "lint (P5)",
	"parsed.true-false.locale-en-cyrillic-false-mismatch.yaml": "lint (P5)",
	"parsed.true-false.locale-es.yaml": "lint (P5)",
	"parsed.true-false.locale-fil-mismatch.yaml": "lint (P5)",
	"parsed.true-false.locale-hi-indic.yaml": "lint (P5)",
	"parsed.true-false.locale-ja-o-marker.yaml": "lint (P5)",
	"parsed.true-false.locale-mismatch.yaml": "lint (P5)",
	"parsed.true-false.locale-mr-b.yaml": "lint (P5)",
	"parsed.true-false.locale-pt-canonical.yaml": "lint (P5)",
	"parsed.true-false.locale-pt-cebraspe.yaml": "lint (P5)",
	"parsed.true-false.locale-pt-han-false-mismatch.yaml": "lint (P5)",
	"parsed.true-false.locale-pt-s-marker.yaml": "lint (P5)",
	"parsed.true-false.locale-pt.yaml": "lint (P5)",
	"parsed.true-false.locale-ru-cyrillic.yaml": "lint (P5)",
	"parsed.true-false.locale-ru-v.yaml": "lint (P5)",
	"parsed.true-false.locale-sw-h.yaml": "lint (P5)",
	"parsed.true-false.locale-sw-k.yaml": "lint (P5)",
	"parsed.true-false.locale-tr-yanlis.yaml": "lint (P5)",
	"parsed.true-false.locale-without-expectation.yaml": "lint (P5)",
	"parsed.true-false.locale-yue-han-false.yaml": "lint (P5)",
	"parsed.true-false.locale-zh-fou.yaml": "lint (P5)",
	"parsed.true-false.long-s-marker.yaml": "lint (P5)",
	"parsed.true-false.lowercase-markers.yaml": "lint (P5)",
	"parsed.true-false.nested-list-stem.yaml": "lint (P5)",
	"parsed.true-false.no-markers.yaml": "lint (P5)",
	"parsed.true-false.non-bmp-marker.yaml": "lint (P5)",
	"parsed.true-false.non-nfkc-marker.yaml": "lint (P5)",
	"parsed.true-false.shuffle.yaml": "lint (P5)",
	"parsed.true-false.simple.yaml": "lint (P5)",
	"parsed.true-false.spaced-markers.yaml": "lint (P5)",
	"parsed.true-false.uniform-false.yaml": "lint (P5)",
	"parsed.true-false.unlisted-marker-markdown.yaml": "lint (P5)",
	"parsed.true-false.unlisted-marker.yaml": "lint (P5)",
	"parsed.true-false.visually-identical-statements.yaml": "lint (P5)",
	"source.essay.answer-key-html-comment.mdq.md": "lint (P5)",
	"source.essay.bom-no-frontmatter.mdq.md": "lint (P5)",
	"source.essay.bom.mdq.md": "lint (P5)",
	"source.essay.bracket-text-first-block.mdq.md": "lint (P5)",
	"source.essay.code-python.mdq.md": "lint (P5)",
	"source.essay.comment-after-blank-lines.mdq.md": "lint (P5)",
	"source.essay.comment-after-first-key.mdq.md": "lint (P5)",
	"source.essay.comment-bare-hash.mdq.md": "lint (P5)",
	"source.essay.comment-broken-by-blank-line.mdq.md": "lint (P5)",
	"source.essay.comment-indented-is-ignored.mdq.md": "lint (P5)",
	"source.essay.comment-no-space.mdq.md": "lint (P5)",
	"source.essay.content-text-frontmatter.mdq.md": "lint (P5)",
	"source.essay.cr-only.mdq.md": "lint (P5)",
	"source.essay.crlf.mdq.md": "lint (P5)",
	"source.essay.empty-answer-key.mdq.md": "lint (P5)",
	"source.essay.epilogue-rubric-list.mdq.md": "lint (P5)",
	"source.essay.epilogue-starts-with-footnote.mdq.md": "lint (P5)",
	"source.essay.feff-in-middle.mdq.md": "lint (P5)",
	"source.essay.fenced-code-no-lang.mdq.md": "lint (P5)",
	"source.essay.form-feed-is-text.mdq.md": "lint (P5)",
	"source.essay.frontmatter-only-comment.mdq.md": "lint (P5)",
	"source.essay.full-metadata.mdq.md": "lint (P5)",
	"source.essay.heading-in-stem.mdq.md": "lint (P5)",
	"source.essay.id-precedence.mdq.md": "lint (P5)",
	"source.essay.image-and-link.mdq.md": "lint (P5)",
	"source.essay.indented-tag.mdq.md": "lint (P5)",
	"source.essay.inline-id-in-stem.mdq.md": "lint (P5)",
	"source.essay.inline-id.mdq.md": "lint (P5)",
	"source.essay.inline-non-slug-is-text.mdq.md": "lint (P5)",
	"source.essay.link-stem.mdq.md": "lint (P5)",
	"source.essay.list-partly-bracketed.mdq.md": "lint (P5)",
	"source.essay.locale-uppercase.mdq.md": "lint (P5)",
	"source.essay.locale-yaml-11-boolean.mdq.md": "lint (P5)",
	"source.essay.meta-same-key-in-nested-mappings.mdq.md": "lint (P5)",
	"source.essay.meta.mdq.md": "lint (P5)",
	"source.essay.metadata-comment.mdq.md": "lint (P5)",
	"source.essay.nbsp-after-slug.mdq.md": "lint (P5)",
	"source.essay.nbsp-end-of-line.mdq.md": "lint (P5)",
	"source.essay.nbsp-in-code-is-skipped.mdq.md": "lint (P5)",
	"source.essay.nbsp-in-frontmatter-is-skipped.mdq.md": "lint (P5)",
	"source.essay.nbsp-in-prose.mdq.md": "lint (P5)",
	"source.essay.nbsp-start-of-line.mdq.md": "lint (P5)",
	"source.essay.nel-before-hash-is-stem.mdq.md": "lint (P5)",
	"source.essay.nel-in-prose.mdq.md": "lint (P5)",
	"source.essay.no-title.mdq.md": "lint (P5)",
	"source.essay.null-content-and-optionals.mdq.md": "lint (P5)",
	"source.essay.null-id-and-tags.mdq.md": "lint (P5)",
	"source.essay.plain-content.mdq.md": "lint (P5)",
	"source.essay.spaced-slug-is-text.mdq.md": "lint (P5)",
	"source.essay.stem-epilogue.mdq.md": "lint (P5)",
	"source.essay.stem-hard-breaks.mdq.md": "lint (P5)",
	"source.essay.stem-indented-code-block-of-nbsp.mdq.md": "lint (P5)",
	"source.essay.stem-with-code.mdq.md": "lint (P5)",
	"source.essay.tag-slug-essay.mdq.md": "lint (P5)",
	"source.essay.tags-as-string.mdq.md": "lint (P5)",
	"source.essay.tags-null.mdq.md": "lint (P5)",
	"source.essay.tags-single-string.mdq.md": "lint (P5)",
	"source.essay.tags-string-final-comma.mdq.md": "lint (P5)",
	"source.essay.tags.mdq.md": "lint (P5)",
	"source.essay.thematic-break-answer-key.mdq.md": "lint (P5)",
	"source.essay.thematic-break-epilogue.mdq.md": "lint (P5)",
	"source.essay.thematic-break-four-dashes.mdq.md": "lint (P5)",
	"source.essay.thematic-break-indented-dashes.mdq.md": "lint (P5)",
	"source.essay.thematic-break-spaced-asterisks.mdq.md": "lint (P5)",
	"source.essay.thematic-break-spaced-dashes.mdq.md": "lint (P5)",
	"source.essay.thematic-break-stem.mdq.md": "lint (P5)",
	"source.essay.thematic-break-underscores.mdq.md": "lint (P5)",
	"source.essay.unsafe-id.mdq.md": "lint (P5)",
	"source.essay.weight-fraction.mdq.md": "lint (P5)",
	"source.essay.weight-zero.mdq.md": "lint (P5)",
	"source.exam.all-question-types.mdq.md": "lint (P5)",
	"source.exam.bank.2024.mdq.md": "lint (P5)",
	"source.exam.bank.cerrado-01.mdq.md": "lint (P5)",
	"source.exam.bank.mata-atlantica-01.mdq.md": "lint (P5)",
	"source.exam.bank.pantanal-01.mdq.md": "lint (P5)",
	"source.exam.bank.recursion-01.mdq.md": "lint (P5)",
	"source.exam.bank.tags-unsplit-01.mdq.md": "lint (P5)",
	"source.exam.body-tag-in-code-block.mdq.md": "lint (P5)",
	"source.exam.bom-before-title.mdq.md": "lint (P5)",
	"source.exam.code-block-structure-lines.mdq.md": "lint (P5)",
	"source.exam.comment.mdq.md": "lint (P5)",
	"source.exam.duration-carry-hours.mdq.md": "lint (P5)",
	"source.exam.duration-carry-minutes.mdq.md": "lint (P5)",
	"source.exam.duration-days-hours-minutes.mdq.md": "lint (P5)",
	"source.exam.duration-hh-mm.mdq.md": "lint (P5)",
	"source.exam.duration-hours-only.mdq.md": "lint (P5)",
	"source.exam.duration-iso-days.mdq.md": "lint (P5)",
	"source.exam.duration-iso-minutes.mdq.md": "lint (P5)",
	"source.exam.duration-seconds.mdq.md": "lint (P5)",
	"source.exam.duration-weeks.mdq.md": "lint (P5)",
	"source.exam.empty-heading.mdq.md": "lint (P5)",
	"source.exam.except-accented-id.mdq.md": "lint (P5)",
	"source.exam.frontmatter-null-title.mdq.md": "lint (P5)",
	"source.exam.grading-mapping.mdq.md": "lint (P5)",
	"source.exam.grading-no-mistakes.mdq.md": "lint (P5)",
	"source.exam.grading-string.mdq.md": "lint (P5)",
	"source.exam.h1-slug-only.mdq.md": "lint (P5)",
	"source.exam.id-title-in-both.mdq.md": "lint (P5)",
	"source.exam.ids-positional.mdq.md": "lint (P5)",
	"source.exam.include-all-overlaps-inline.mdq.md": "lint (P5)",
	"source.exam.include-all.mdq.md": "lint (P5)",
	"source.exam.inheritance.mdq.md": "lint (P5)",
	"source.exam.inherited-grading.mdq.md": "lint (P5)",
	"source.exam.midterm.mdq.md": "lint (P5)",
	"source.exam.nbsp-in-prose.mdq.md": "lint (P5)",
	"source.exam.nbsp-in-question-frontmatter.mdq.md": "lint (P5)",
	"source.exam.no-questions.mdq.md": "lint (P5)",
	"source.exam.null-id.mdq.md": "lint (P5)",
	"source.exam.penalty-full.mdq.md": "lint (P5)",
	"source.exam.penalty-none-explicit.mdq.md": "lint (P5)",
	"source.exam.penalty-policy.mdq.md": "lint (P5)",
	"source.exam.question-stem-setext-h2.mdq.md": "lint (P5)",
	"source.exam.safe-thematic-break-in-epilogue.mdq.md": "lint (P5)",
	"source.exam.scheduled.mdq.md": "lint (P5)",
	"source.exam.separator-before-include-all.mdq.md": "lint (P5)",
	"source.exam.separator-before-include.mdq.md": "lint (P5)",
	"source.exam.separator-four-equals.mdq.md": "lint (P5)",
	"source.exam.separator-indented.mdq.md": "lint (P5)",
	"source.exam.separator-spaced.mdq.md": "lint (P5)",
	"source.exam.separator-then-frontmatter-after-thematic-break.mdq.md":
		"lint (P5)",
	"source.exam.separator-trailing-spaces.mdq.md": "lint (P5)",
	"source.exam.setext-heading.mdq.md": "lint (P5)",
	"source.exam.start-date-only.mdq.md": "lint (P5)",
	"source.exam.start-local-time.mdq.md": "lint (P5)",
	"source.exam.start-offset-space-separator.mdq.md": "lint (P5)",
	"source.exam.start-utc.mdq.md": "lint (P5)",
	"source.exam.start-without-seconds.mdq.md": "lint (P5)",
	"source.exam.tags-null.mdq.md": "lint (P5)",
	"source.exam.tags-string-final-comma.mdq.md": "lint (P5)",
	"source.exam.take-home.mdq.md": "lint (P5)",
	"source.exam.thematic-break-colon-line.mdq.md": "lint (P5)",
	"source.exam.thematic-break-in-instructions.mdq.md": "lint (P5)",
	"source.exam.thematic-break-in-question.mdq.md": "lint (P5)",
	"source.exam.thematic-break-then-bare-frontmatter.mdq.md": "lint (P5)",
	"source.exam.thematic-break-trailing-blanks.mdq.md": "lint (P5)",
	"source.exam.thematic-break-without-blank-line-before.mdq.md": "lint (P5)",
	"source.exam.thematic-breaks-around-colon-in-stem.mdq.md": "lint (P5)",
	"source.exam.thematic-breaks-around-list-in-stem.mdq.md": "lint (P5)",
	"source.exam.thematic-breaks-in-stem.mdq.md": "lint (P5)",
	"source.exam.title-link-is-not-slug.mdq.md": "lint (P5)",
	"source.exam.title-multiline-frontmatter.mdq.md": "lint (P5)",
	"source.exam.title-only.mdq.md": "lint (P5)",
	"source.exam.title-without-slug.mdq.md": "lint (P5)",
	"source.exam.unsafe-id.mdq.md": "lint (P5)",
	"source.exam.unsplit-tags.mdq.md": "lint (P5)",
	"source.fill-in.blank-in-autolink-is-text.mdq.md": "lint (P5)",
	"source.fill-in.blank-in-code-is-text.mdq.md": "lint (P5)",
	"source.fill-in.blank-in-code-span-is-text.mdq.md": "lint (P5)",
	"source.fill-in.blank-in-inline-html.mdq.md": "lint (P5)",
	"source.fill-in.blank-link-is-not-a-blank.mdq.md": "lint (P5)",
	"source.fill-in.blank-reference-link-is-not-a-blank.mdq.md": "lint (P5)",
	"source.fill-in.blank-tag-space-around-colon.mdq.md": "lint (P5)",
	"source.fill-in.blockquote-stem.mdq.md": "lint (P5)",
	"source.fill-in.capital.mdq.md": "lint (P5)",
	"source.fill-in.case-variant-blank-id.mdq.md": "lint (P5)",
	"source.fill-in.choice-blank-omitted-score-vs-zero-percent.mdq.md":
		"lint (P5)",
	"source.fill-in.definitions-separated-by-blank-lines.mdq.md": "lint (P5)",
	"source.fill-in.empty-blank-definition-text-line.mdq.md": "lint (P5)",
	"source.fill-in.epilogue-nested-list.mdq.md": "lint (P5)",
	"source.fill-in.first-paragraph-starts-with-blank.mdq.md": "lint (P5)",
	"source.fill-in.grading-no-mistakes.mdq.md": "lint (P5)",
	"source.fill-in.grading-shuffle-inherit.mdq.md": "lint (P5)",
	"source.fill-in.grading-symmetric.mdq.md": "lint (P5)",
	"source.fill-in.grading.mdq.md": "lint (P5)",
	"source.fill-in.ids-choice-blank.mdq.md": "lint (P5)",
	"source.fill-in.mixed-blanks.mdq.md": "lint (P5)",
	"source.fill-in.nbsp-after-blank-definition.mdq.md": "lint (P5)",
	"source.fill-in.nbsp-in-blank-pattern-list.mdq.md": "lint (P5)",
	"source.fill-in.non-blank-markers.mdq.md": "lint (P5)",
	"source.fill-in.numeric-blank-representations.mdq.md": "lint (P5)",
	"source.fill-in.pre-validation-entry-forms.mdq.md": "lint (P5)",
	"source.fill-in.pre-validation-lints.mdq.md": "lint (P5)",
	"source.fill-in.short-answer-patterns.mdq.md": "lint (P5)",
	"source.fill-in.shuffle-all-or-nothing.mdq.md": "lint (P5)",
	"source.fill-in.stem-starts-with-blank.mdq.md": "lint (P5)",
	"source.fill-in.tag-in-epilogue-fence.mdq.md": "lint (P5)",
	"source.multiple-choice.all-correct.mdq.md": "lint (P5)",
	"source.multiple-choice.choice-ids.mdq.md": "lint (P5)",
	"source.multiple-choice.comment-empty-lines.mdq.md": "lint (P5)",
	"source.multiple-choice.comment-only-spaces.mdq.md": "lint (P5)",
	"source.multiple-choice.comment-stripped.mdq.md": "lint (P5)",
	"source.multiple-choice.comments.mdq.md": "lint (P5)",
	"source.multiple-choice.context-paragraphs.mdq.md": "lint (P5)",
	"source.multiple-choice.continued-choice-text.mdq.md": "lint (P5)",
	"source.multiple-choice.feedback-after-empty-marker.mdq.md": "lint (P5)",
	"source.multiple-choice.feedback-indented-bullet.mdq.md": "lint (P5)",
	"source.multiple-choice.feedback-indented-fence.mdq.md": "lint (P5)",
	"source.multiple-choice.feedback-indented-heading.mdq.md": "lint (P5)",
	"source.multiple-choice.feedback.mdq.md": "lint (P5)",
	"source.multiple-choice.grading-shuffle-inherit.mdq.md": "lint (P5)",
	"source.multiple-choice.grading.mdq.md": "lint (P5)",
	"source.multiple-choice.ids-ascii-spelling.mdq.md": "lint (P5)",
	"source.multiple-choice.ids-explicit-id-wins.mdq.md": "lint (P5)",
	"source.multiple-choice.ids-order-backward.mdq.md": "lint (P5)",
	"source.multiple-choice.ids-order-forward.mdq.md": "lint (P5)",
	"source.multiple-choice.ids-punctuation-variants.mdq.md": "lint (P5)",
	"source.multiple-choice.line-separators-in-choice-text.mdq.md": "lint (P5)",
	"source.multiple-choice.link-choice.mdq.md": "lint (P5)",
	"source.multiple-choice.nbsp-after-choice-marker.mdq.md": "lint (P5)",
	"source.multiple-choice.nbsp-in-text-and-feedback.mdq.md": "lint (P5)",
	"source.multiple-choice.no-correct-answer.mdq.md": "lint (P5)",
	"source.multiple-choice.null-fields.mdq.md": "lint (P5)",
	"source.multiple-choice.omitted-score-vs-zero-percent.mdq.md": "lint (P5)",
	"source.multiple-choice.partial-credit-no-full-answer.mdq.md": "lint (P5)",
	"source.multiple-choice.partial-credit.mdq.md": "lint (P5)",
	"source.multiple-choice.percent-forms.mdq.md": "lint (P5)",
	"source.multiple-choice.reference-link-and-id-separators.mdq.md": "lint (P5)",
	"source.multiple-choice.setext-heading-in-epilogue-not-linted.mdq.md":
		"lint (P5)",
	"source.multiple-choice.shuffle-false.mdq.md": "lint (P5)",
	"source.multiple-choice.shuffle.mdq.md": "lint (P5)",
	"source.multiple-choice.simple.mdq.md": "lint (P5)",
	"source.multiple-choice.spaced-values.mdq.md": "lint (P5)",
	"source.multiple-choice.yaml-core-scalars.mdq.md": "lint (P5)",
	"source.multiple-choice.yaml-core-schema.mdq.md": "lint (P5)",
	"source.multiple-selection.all-correct.mdq.md": "lint (P5)",
	"source.multiple-selection.bullet-list-stem.mdq.md": "lint (P5)",
	"source.multiple-selection.choice-comment-empty-marker-line.mdq.md":
		"lint (P5)",
	"source.multiple-selection.choice-deep-indent-continues-feedback.mdq.md":
		"lint (P5)",
	"source.multiple-selection.choice-deep-indent-continues-text.mdq.md":
		"lint (P5)",
	"source.multiple-selection.choice-feedback-image-line.mdq.md": "lint (P5)",
	"source.multiple-selection.choice-feedback-three-columns.mdq.md": "lint (P5)",
	"source.multiple-selection.choice-ids.mdq.md": "lint (P5)",
	"source.multiple-selection.choice-tab-after-marker.mdq.md": "lint (P5)",
	"source.multiple-selection.choice-wide-item-content.mdq.md": "lint (P5)",
	"source.multiple-selection.epilogue-starts-with-link.mdq.md": "lint (P5)",
	"source.multiple-selection.epilogue.mdq.md": "lint (P5)",
	"source.multiple-selection.feedback.mdq.md": "lint (P5)",
	"source.multiple-selection.grading-all-or-nothing.mdq.md": "lint (P5)",
	"source.multiple-selection.grading-inherit.mdq.md": "lint (P5)",
	"source.multiple-selection.grading-symmetric.mdq.md": "lint (P5)",
	"source.multiple-selection.grading.mdq.md": "lint (P5)",
	"source.multiple-selection.nbsp-blank-marker.mdq.md": "lint (P5)",
	"source.multiple-selection.none-correct.mdq.md": "lint (P5)",
	"source.multiple-selection.shuffle-inherit.mdq.md": "lint (P5)",
	"source.multiple-selection.simple.mdq.md": "lint (P5)",
	"source.multiple-selection.stray-choice-marker.mdq.md": "lint (P5)",
	"source.multiple-selection.uppercase-x.mdq.md": "lint (P5)",
	"source.numeric.bom-in-unit.mdq.md": "lint (P5)",
	"source.numeric.decimal-beyond-float.mdq.md": "lint (P5)",
	"source.numeric.decimal-integer-tolerance.mdq.md": "lint (P5)",
	"source.numeric.exponent-leading-zero.mdq.md": "lint (P5)",
	"source.numeric.exponent-smallest-double.mdq.md": "lint (P5)",
	"source.numeric.exponent-trailing-zero.mdq.md": "lint (P5)",
	"source.numeric.exponent-water-ions.mdq.md": "lint (P5)",
	"source.numeric.exponent.mdq.md": "lint (P5)",
	"source.numeric.fraction-decimal-places.mdq.md": "lint (P5)",
	"source.numeric.fraction-decimal-tolerance.mdq.md": "lint (P5)",
	"source.numeric.fraction-integer-tolerance.mdq.md": "lint (P5)",
	"source.numeric.frontmatter-decimal-places.mdq.md": "lint (P5)",
	"source.numeric.frontmatter-domain.mdq.md": "lint (P5)",
	"source.numeric.h1-line-in-epilogue-code-block.mdq.md": "lint (P5)",
	"source.numeric.h1-line-in-stem-code-block.mdq.md": "lint (P5)",
	"source.numeric.int32-max-plus-one.mdq.md": "lint (P5)",
	"source.numeric.int32-max.mdq.md": "lint (P5)",
	"source.numeric.int32-min-minus-one.mdq.md": "lint (P5)",
	"source.numeric.int32-min.mdq.md": "lint (P5)",
	"source.numeric.negative-fraction.mdq.md": "lint (P5)",
	"source.numeric.negative-integer.mdq.md": "lint (P5)",
	"source.numeric.plus-sign.mdq.md": "lint (P5)",
	"source.numeric.relative-tolerance-decimal-shift.mdq.md": "lint (P5)",
	"source.numeric.table-stem.mdq.md": "lint (P5)",
	"source.numeric.tabs-around-tolerance.mdq.md": "lint (P5)",
	"source.numeric.tag-tab-before-colon.mdq.md": "lint (P5)",
	"source.numeric.tolerance-no-spaces.mdq.md": "lint (P5)",
	"source.numeric.tolerance-order.mdq.md": "lint (P5)",
	"source.numeric.tolerance-spaces-after-sign.mdq.md": "lint (P5)",
	"source.numeric.unit-slash.mdq.md": "lint (P5)",
	"source.numeric.unreduced-fraction.mdq.md": "lint (P5)",
	"source.numeric.whole-decimal-tolerance.mdq.md": "lint (P5)",
	"source.ordering.accept-blank-line-skip-blanks.mdq.md": "lint (P5)",
	"source.ordering.accept-repeats-after-dedent.mdq.md": "lint (P5)",
	"source.ordering.accept-repeats-after-skip-blanks.mdq.md": "lint (P5)",
	"source.ordering.accept-repeats-answer-key.mdq.md": "lint (P5)",
	"source.ordering.blank-extra-line.mdq.md": "lint (P5)",
	"source.ordering.blank-line-before-section.mdq.md": "lint (P5)",
	"source.ordering.blank-ordering-line.mdq.md": "lint (P5)",
	"source.ordering.duplicate-accepts-after-dedent.mdq.md": "lint (P5)",
	"source.ordering.duplicate-alternative-lines.mdq.md": "lint (P5)",
	"source.ordering.duplicate-lines.mdq.md": "lint (P5)",
	"source.ordering.epilogue-no-sections.mdq.md": "lint (P5)",
	"source.ordering.epilogue.mdq.md": "lint (P5)",
	"source.ordering.extra-inherits-highlight.mdq.md": "lint (P5)",
	"source.ordering.extra-nested-distractors.mdq.md": "lint (P5)",
	"source.ordering.extra-text.mdq.md": "lint (P5)",
	"source.ordering.fence-info-string.mdq.md": "lint (P5)",
	"source.ordering.fence-without-language.mdq.md": "lint (P5)",
	"source.ordering.indentation-gcd.mdq.md": "lint (P5)",
	"source.ordering.indentation-unit-across-sections.mdq.md": "lint (P5)",
	"source.ordering.inline-markup-kept.mdq.md": "lint (P5)",
	"source.ordering.list-markers.mdq.md": "lint (P5)",
	"source.ordering.nested-list-sections.mdq.md": "lint (P5)",
	"source.ordering.nested-list-three-levels.mdq.md": "lint (P5)",
	"source.ordering.nested-list-two-levels.mdq.md": "lint (P5)",
	"source.ordering.normalizations-comma-string.mdq.md": "lint (P5)",
	"source.ordering.observations-adjacent.mdq.md": "lint (P5)",
	"source.ordering.redundant-strict-indentation.mdq.md": "lint (P5)",
	"source.ordering.reject-uses-distractor.mdq.md": "lint (P5)",
	"source.ordering.reject-without-feedback.mdq.md": "lint (P5)",
	"source.ordering.section-empty-feedback-marker-line.mdq.md": "lint (P5)",
	"source.ordering.section-heading-closing-sequence.mdq.md": "lint (P5)",
	"source.ordering.section-heading-indented.mdq.md": "lint (P5)",
	"source.ordering.section-heading-setext.mdq.md": "lint (P5)",
	"source.ordering.section-heading-trailing-spaces.mdq.md": "lint (P5)",
	"source.ordering.tab-indentation.mdq.md": "lint (P5)",
	"source.ordering.tab-stops-mixed.mdq.md": "lint (P5)",
	"source.ordering.tag-indented-trailing-spaces.mdq.md": "lint (P5)",
	"source.ordering.tag-space-before-colon.mdq.md": "lint (P5)",
	"source.ordering.tilde-fence.mdq.md": "lint (P5)",
	"source.ordering.trailing-whitespace.mdq.md": "lint (P5)",
	"source.ordering.two-accepts-and-reject.mdq.md": "lint (P5)",
	"source.ordering.unknown-highlight-language.mdq.md": "lint (P5)",
	"source.ordering.unreachable-reject.mdq.md": "lint (P5)",
	"source.ordering.visually-identical-across-blocks.mdq.md": "lint (P5)",
	"source.ordering.visually-identical-lines.mdq.md": "lint (P5)",
	"source.short-answer.collapsed-link-at-stem-start.mdq.md": "lint (P5)",
	"source.short-answer.exact-literal-spans-lines-block.mdq.md": "lint (P5)",
	"source.short-answer.exact-literal-spans-lines.mdq.md": "lint (P5)",
	"source.short-answer.fence-epilogue.mdq.md": "lint (P5)",
	"source.short-answer.html-block-epilogue.mdq.md": "lint (P5)",
	"source.short-answer.image-line-continues.mdq.md": "lint (P5)",
	"source.short-answer.indented-code-stem.mdq.md": "lint (P5)",
	"source.short-answer.inline-id-and-indented-tag.mdq.md": "lint (P5)",
	"source.short-answer.manual.mdq.md": "lint (P5)",
	"source.short-answer.nbsp-in-pattern-list.mdq.md": "lint (P5)",
	"source.short-answer.nbsp-on-tag-line.mdq.md": "lint (P5)",
	"source.short-answer.ordered-list-stem.mdq.md": "lint (P5)",
	"source.short-answer.pattern-empty-feedback-marker-line.mdq.md": "lint (P5)",
	"source.short-answer.simple.mdq.md": "lint (P5)",
	"source.short-answer.stem-with-prose-list.mdq.md": "lint (P5)",
	"source.short-answer.tag-space-around-colon.mdq.md": "lint (P5)",
	"source.short-answer.thematic-break-epilogue.mdq.md": "lint (P5)",
	"source.true-false.angstrom-sign-marker.mdq.md": "lint (P5)",
	"source.true-false.choice-comment.mdq.md": "lint (P5)",
	"source.true-false.choice-ids.mdq.md": "lint (P5)",
	"source.true-false.cjk-markers.mdq.md": "lint (P5)",
	"source.true-false.feedback.mdq.md": "lint (P5)",
	"source.true-false.fullwidth-marker.mdq.md": "lint (P5)",
	"source.true-false.global-markers.mdq.md": "lint (P5)",
	"source.true-false.grading-no-mistakes.mdq.md": "lint (P5)",
	"source.true-false.grading-shuffle-inherit.mdq.md": "lint (P5)",
	"source.true-false.grading.mdq.md": "lint (P5)",
	"source.true-false.inline-id.mdq.md": "lint (P5)",
	"source.true-false.locale-de-wahr.mdq.md": "lint (P5)",
	"source.true-false.locale-es.mdq.md": "lint (P5)",
	"source.true-false.locale-fil-mismatch.mdq.md": "lint (P5)",
	"source.true-false.locale-hi-indic.mdq.md": "lint (P5)",
	"source.true-false.locale-ja-o-marker.mdq.md": "lint (P5)",
	"source.true-false.locale-pt-canonical.mdq.md": "lint (P5)",
	"source.true-false.locale-pt-cebraspe.mdq.md": "lint (P5)",
	"source.true-false.locale-pt-s-marker.mdq.md": "lint (P5)",
	"source.true-false.locale-pt.mdq.md": "lint (P5)",
	"source.true-false.locale-ru-cyrillic.mdq.md": "lint (P5)",
	"source.true-false.locale-sw-h.mdq.md": "lint (P5)",
	"source.true-false.locale-without-expectation.mdq.md": "lint (P5)",
	"source.true-false.locale-zh-fou.mdq.md": "lint (P5)",
	"source.true-false.long-s-marker.mdq.md": "lint (P5)",
	"source.true-false.lowercase-markers.mdq.md": "lint (P5)",
	"source.true-false.nested-list-stem.mdq.md": "lint (P5)",
	"source.true-false.shuffle.mdq.md": "lint (P5)",
	"source.true-false.simple.mdq.md": "lint (P5)",
	"source.true-false.spaced-markers.mdq.md": "lint (P5)",
	"source.true-false.uniform-false.mdq.md": "lint (P5)",
	"source.true-false.unlisted-marker-markdown.mdq.md": "lint (P5)",
};

/**
 * Codes of `docs/lint-codes.md` that `src/models/lint-codes.ts` lacks, or
 * lists with another severity (`tests/lint-codes.spec.ts`).
 */
export const LINT_CODES: Manifest = {
	"documented.": "lint (P5)",
};

/**
 * Pattern and query vectors of `examples/matching/` that the port does not
 * match as expected (`tests/matching.spec.ts`). Keys are `<group>.<case>`.
 */
export const MATCHING: Manifest = {};

/** `.ids.yaml` files whose ids `withIds` does not give (`tests/ids.spec.ts`). */
export const IDS: Manifest = {
	"exam.ids-positional.ids.yaml": "withIds (P7)",
	"fill-in.ids-choice-blank.ids.yaml": "withIds (P7)",
	"multiple-choice.ids-ascii-spelling.ids.yaml": "withIds (P7)",
	"multiple-choice.ids-explicit-id-wins.ids.yaml": "withIds (P7)",
	"multiple-choice.ids-order-backward.ids.yaml": "withIds (P7)",
	"multiple-choice.ids-order-forward.ids.yaml": "withIds (P7)",
	"multiple-choice.ids-punctuation-variants.ids.yaml": "withIds (P7)",
	"multiple-selection.ids-single-digit.ids.yaml": "withIds (P7)",
	"multiple-selection.ids-single-glyph.ids.yaml": "withIds (P7)",
};

/** Cases of `examples/normalize.yaml` (`tests/normalize.spec.ts`). */
export const NORMALIZE: Manifest = {
	"a stem that starts with a thematic break is kept by normalize":
		"normalize (P7)",
	"an epilogue that starts with a thematic break is kept by normalize":
		"normalize (P7)",
};

/**
 * Cases of `examples/grading/` that the port does not score as expected
 * (`tests/grading.spec.ts`). Keys are `<group>.<case>`.
 */
export const GRADING: Manifest = {
	"automation.": "automation (P7)",
	"essay.": "scoring (P6)",
	"exam-effective.": "scoring (P6)",
	"exam-question-effective.": "scoring (P6)",
	"exam-score.": "scoring (P6)",
	'fill-in.all-or-nothing/Feedback order/{"length":1000,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Feedback order/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Feedback order/{"river":"Tietê","length":1000,"city":"rio"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Malformed response of a numeric blank with feedback/{"neblina":"abc","bandeira":2892}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Malformed responses/{"city":"curitiba"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Malformed responses/{"city":3}': "scoring (P6)",
	'fill-in.all-or-nothing/Malformed responses/{"city":["brasilia"]}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Malformed responses/{"length":[6400]}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Malformed responses/{"river":"Amazonas","length":6400,"city":["brasilia"]}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Negative choice score/{"biome":"right"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Negative choice score/{"biome":"wrong"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Numeric blank rounds with its own places/{"price":2.505}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Numeric blank rounds with its own places/{"price":2.515}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"goiania"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Pending short answer blank/{"length":6400}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Pending short answer blank/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Pending short answer blank/{"river":"Madeira","length":1}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Pending short answer blank/{"river":"Madeira","length":6400}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Pending short answer blank/{"river":"Madeira","length":[6400]}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Pending short answer blank/{"river":"Tietê","length":6400}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Pending short answer blank/{"river":null,"length":6400}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"length":6400,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"Amazonas","length":6000,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"Amazonas","length":6000}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":null}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Table of fill-in.md/{"river":"Tietê","length":1,"city":"rio"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Unit of a numeric blank/{"length":"1/3x"}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Unit of a numeric blank/{"length":{"value":6400,"unit":"km"}}':
		"scoring (P6)",
	'fill-in.all-or-nothing/Unit of a numeric blank/{"length":{"value":6400,"unit":"m"}}':
		"scoring (P6)",
	'fill-in.no-mistakes/Feedback order/{"length":1000,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Feedback order/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Feedback order/{"river":"Tietê","length":1000,"city":"rio"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Malformed response of a numeric blank with feedback/{"neblina":"abc","bandeira":2892}':
		"scoring (P6)",
	'fill-in.no-mistakes/Malformed responses/{"city":"curitiba"}': "scoring (P6)",
	'fill-in.no-mistakes/Malformed responses/{"city":3}': "scoring (P6)",
	'fill-in.no-mistakes/Malformed responses/{"city":["brasilia"]}':
		"scoring (P6)",
	'fill-in.no-mistakes/Malformed responses/{"length":[6400]}': "scoring (P6)",
	'fill-in.no-mistakes/Malformed responses/{"river":"Amazonas","length":6400,"city":["brasilia"]}':
		"scoring (P6)",
	'fill-in.no-mistakes/Negative choice score/{"biome":"right"}': "scoring (P6)",
	'fill-in.no-mistakes/Negative choice score/{"biome":"wrong"}': "scoring (P6)",
	'fill-in.no-mistakes/Numeric blank rounds with its own places/{"price":2.505}':
		"scoring (P6)",
	'fill-in.no-mistakes/Numeric blank rounds with its own places/{"price":2.515}':
		"scoring (P6)",
	'fill-in.no-mistakes/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"goiania"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Pending short answer blank/{"length":6400}':
		"scoring (P6)",
	'fill-in.no-mistakes/Pending short answer blank/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.no-mistakes/Pending short answer blank/{"river":"Madeira","length":1}':
		"scoring (P6)",
	'fill-in.no-mistakes/Pending short answer blank/{"river":"Madeira","length":6400}':
		"scoring (P6)",
	'fill-in.no-mistakes/Pending short answer blank/{"river":"Madeira","length":[6400]}':
		"scoring (P6)",
	'fill-in.no-mistakes/Pending short answer blank/{"river":"Tietê","length":6400}':
		"scoring (P6)",
	'fill-in.no-mistakes/Pending short answer blank/{"river":null,"length":6400}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"length":6400,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"Amazonas","length":6000,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"Amazonas","length":6000}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":null}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.no-mistakes/Table of fill-in.md/{"river":"Tietê","length":1,"city":"rio"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Unit of a numeric blank/{"length":"1/3x"}':
		"scoring (P6)",
	'fill-in.no-mistakes/Unit of a numeric blank/{"length":{"value":6400,"unit":"km"}}':
		"scoring (P6)",
	'fill-in.no-mistakes/Unit of a numeric blank/{"length":{"value":6400,"unit":"m"}}':
		"scoring (P6)",
	'fill-in.partial/Feedback order/{"length":1000,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.partial/Feedback order/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.partial/Feedback order/{"river":"Tietê","length":1000,"city":"rio"}':
		"scoring (P6)",
	'fill-in.partial/Malformed response of a numeric blank with feedback/{"neblina":"abc","bandeira":2892}':
		"scoring (P6)",
	'fill-in.partial/Malformed responses/{"city":"curitiba"}': "scoring (P6)",
	'fill-in.partial/Malformed responses/{"city":3}': "scoring (P6)",
	'fill-in.partial/Malformed responses/{"city":["brasilia"]}': "scoring (P6)",
	'fill-in.partial/Malformed responses/{"length":[6400]}': "scoring (P6)",
	'fill-in.partial/Malformed responses/{"river":"Amazonas","length":6400,"city":["brasilia"]}':
		"scoring (P6)",
	'fill-in.partial/Negative choice score/{"biome":"right"}': "scoring (P6)",
	'fill-in.partial/Negative choice score/{"biome":"wrong"}': "scoring (P6)",
	'fill-in.partial/Numeric blank rounds with its own places/{"price":2.505}':
		"scoring (P6)",
	'fill-in.partial/Numeric blank rounds with its own places/{"price":2.515}':
		"scoring (P6)",
	'fill-in.partial/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"goiania"}':
		"scoring (P6)",
	'fill-in.partial/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.partial/Pending short answer blank/{"length":6400}': "scoring (P6)",
	'fill-in.partial/Pending short answer blank/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.partial/Pending short answer blank/{"river":"Madeira","length":1}':
		"scoring (P6)",
	'fill-in.partial/Pending short answer blank/{"river":"Madeira","length":6400}':
		"scoring (P6)",
	'fill-in.partial/Pending short answer blank/{"river":"Madeira","length":[6400]}':
		"scoring (P6)",
	'fill-in.partial/Pending short answer blank/{"river":"Tietê","length":6400}':
		"scoring (P6)",
	'fill-in.partial/Pending short answer blank/{"river":null,"length":6400}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"length":6400,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"Amazonas","length":6000,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"Amazonas","length":6000}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":null}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.partial/Table of fill-in.md/{"river":"Tietê","length":1,"city":"rio"}':
		"scoring (P6)",
	'fill-in.partial/Unit of a numeric blank/{"length":"1/3x"}': "scoring (P6)",
	'fill-in.partial/Unit of a numeric blank/{"length":{"value":6400,"unit":"km"}}':
		"scoring (P6)",
	'fill-in.partial/Unit of a numeric blank/{"length":{"value":6400,"unit":"m"}}':
		"scoring (P6)",
	'fill-in.symmetric/Feedback order/{"length":1000,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.symmetric/Feedback order/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.symmetric/Feedback order/{"river":"Tietê","length":1000,"city":"rio"}':
		"scoring (P6)",
	'fill-in.symmetric/Malformed response of a numeric blank with feedback/{"neblina":"abc","bandeira":2892}':
		"scoring (P6)",
	'fill-in.symmetric/Malformed responses/{"city":"curitiba"}': "scoring (P6)",
	'fill-in.symmetric/Malformed responses/{"city":3}': "scoring (P6)",
	'fill-in.symmetric/Malformed responses/{"city":["brasilia"]}': "scoring (P6)",
	'fill-in.symmetric/Malformed responses/{"length":[6400]}': "scoring (P6)",
	'fill-in.symmetric/Malformed responses/{"river":"Amazonas","length":6400,"city":["brasilia"]}':
		"scoring (P6)",
	'fill-in.symmetric/Negative choice score/{"biome":"right"}': "scoring (P6)",
	'fill-in.symmetric/Negative choice score/{"biome":"wrong"}': "scoring (P6)",
	'fill-in.symmetric/Numeric blank rounds with its own places/{"price":2.505}':
		"scoring (P6)",
	'fill-in.symmetric/Numeric blank rounds with its own places/{"price":2.515}':
		"scoring (P6)",
	'fill-in.symmetric/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"goiania"}':
		"scoring (P6)",
	'fill-in.symmetric/Partial-credit choice/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.symmetric/Pending short answer blank/{"length":6400}':
		"scoring (P6)",
	'fill-in.symmetric/Pending short answer blank/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.symmetric/Pending short answer blank/{"river":"Madeira","length":1}':
		"scoring (P6)",
	'fill-in.symmetric/Pending short answer blank/{"river":"Madeira","length":6400}':
		"scoring (P6)",
	'fill-in.symmetric/Pending short answer blank/{"river":"Madeira","length":[6400]}':
		"scoring (P6)",
	'fill-in.symmetric/Pending short answer blank/{"river":"Tietê","length":6400}':
		"scoring (P6)",
	'fill-in.symmetric/Pending short answer blank/{"river":null,"length":6400}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"length":6400,"city":"salvador"}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"Amazonas","length":6000,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"Amazonas","length":6000}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"brasilia"}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":"rio"}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"Amazonas","length":6400,"city":null}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"Amazonas","length":6400}':
		"scoring (P6)",
	'fill-in.symmetric/Table of fill-in.md/{"river":"Tietê","length":1,"city":"rio"}':
		"scoring (P6)",
	'fill-in.symmetric/Unit of a numeric blank/{"length":"1/3x"}': "scoring (P6)",
	'fill-in.symmetric/Unit of a numeric blank/{"length":{"value":6400,"unit":"km"}}':
		"scoring (P6)",
	'fill-in.symmetric/Unit of a numeric blank/{"length":{"value":6400,"unit":"m"}}':
		"scoring (P6)",
	"multiple-choice.": "scoring (P6)",
	"multiple-selection.": "scoring (P6)",
	"numeric.": "scoring (P6)",
	"ordering.": "scoring (P6)",
	"short-answer-prevalidation.": "scoring (P6)",
	"true-false.": "scoring (P6)",
};

/** The reason `name` is not ported, or `undefined` if it is. */
export function notPorted(
	manifest: Manifest,
	name: string,
): string | undefined {
	for (const [key, reason] of Object.entries(manifest)) {
		if (key.endsWith(".") ? name.startsWith(key) : name === key) {
			return reason;
		}
	}
	return undefined;
}

/**
 * Declare a test for a corpus example: a plain test if it is ported, an
 * expected failure if `manifest` lists it.
 */
export function corpusIt(
	manifest: Manifest,
	name: string,
	run: () => void,
): void {
	const reason = notPorted(manifest, name);
	if (reason === undefined) {
		it(name, run);
	} else {
		it.fails(`${name} [not ported: ${reason}]`, run);
	}
}
