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
 */

import { it } from "vitest";

type Manifest = Record<string, string>;

/** `.mdq.md` sources that do not parse into their `.yaml` sibling. */
export const PARSE: Manifest = {
	"exam.question-stem-setext-h2.mdq.md": "corpus em mudança (rodada mdq)",
	"multiple-choice.setext-heading-in-epilogue-not-linted.mdq.md":
		"corpus em mudança (rodada mdq)",
	"short-answer.stem-setext-h2.mdq.md": "corpus em mudança (rodada mdq)",
	"exam.empty-heading.mdq.md": "corpus em mudança (rodada mdq)",
	"exam.all-question-types.mdq.md": "parser (P2)",
	"exam.comment.mdq.md": "parser (P2)",
	"exam.ordering-sections.mdq.md": "parser (P2)",
	"exam.thematic-break-in-question.mdq.md": "parser (P2)",
	"exam.thematic-break-then-bare-frontmatter.mdq.md": "parser (P2)",
	"exam.with-ordering.mdq.md": "parser (P2)",
	"fill-in.blank-in-code-is-text.mdq.md": "parser (P2)",
	"fill-in.blank-in-indented-code-is-text.mdq.md": "parser (P2)",
	"fill-in.blank-in-tilde-fence-is-text.mdq.md": "parser (P2)",
	"fill-in.blanks-in-two-paragraphs.mdq.md": "parser (P2)",
	"fill-in.blockquote-stem.mdq.md": "parser (P2)",
	"fill-in.incorrect-feedback.mdq.md": "parser (P2)",
	"fill-in.numeric-blank-declared.mdq.md": "parser (P2)",
	"fill-in.numeric-blank-exponent.mdq.md": "parser (P2)",
	"fill-in.numeric-blank-incorrect-feedback.mdq.md": "parser (P2)",
	"fill-in.numeric-blank-maps-places.mdq.md": "parser (P2)",
	"fill-in.open-blank-between-definitions.mdq.md": "parser (P2)",
	"fill-in.open-blank.mdq.md": "parser (P2)",
	"fill-in.stem-starts-with-blank.mdq.md": "parser (P2)",
	"ordering.accept-alternative.mdq.md": "parser (P2)",
	"ordering.accept-blank-line-skip-blanks.mdq.md": "parser (P2)",
	"ordering.accept-omits-line.mdq.md": "parser (P2)",
	"ordering.accept-repeats-after-dedent.mdq.md": "parser (P2)",
	"ordering.accept-repeats-after-skip-blanks.mdq.md": "parser (P2)",
	"ordering.accept-repeats-answer-key.mdq.md": "parser (P2)",
	"ordering.accept-uses-key-copies.mdq.md": "parser (P2)",
	"ordering.blank-extra-line.mdq.md": "parser (P2)",
	"ordering.blank-line-before-section.mdq.md": "parser (P2)",
	"ordering.blank-ordering-line.mdq.md": "parser (P2)",
	"ordering.brazil-timeline.mdq.md": "parser (P2)",
	"ordering.duplicate-accepts-after-dedent.mdq.md": "parser (P2)",
	"ordering.duplicate-alternative-lines.mdq.md": "parser (P2)",
	"ordering.duplicate-lines.mdq.md": "parser (P2)",
	"ordering.empty-parent-item-nested-list.mdq.md": "parser (P2)",
	"ordering.empty-reject-feedback.mdq.md": "parser (P2)",
	"ordering.epilogue-no-sections.mdq.md": "parser (P2)",
	"ordering.epilogue.mdq.md": "parser (P2)",
	"ordering.extra-distractors.mdq.md": "parser (P2)",
	"ordering.extra-inherits-highlight.mdq.md": "parser (P2)",
	"ordering.extra-nested-distractors.mdq.md": "parser (P2)",
	"ordering.extra-text.mdq.md": "parser (P2)",
	"ordering.fence-info-string.mdq.md": "parser (P2)",
	"ordering.fence-without-language.mdq.md": "parser (P2)",
	"ordering.fibonacci.mdq.md": "parser (P2)",
	"ordering.full-metadata.mdq.md": "parser (P2)",
	"ordering.incorrect-feedback.mdq.md": "parser (P2)",
	"ordering.indentation-gcd.mdq.md": "parser (P2)",
	"ordering.indentation-unit-across-sections.mdq.md": "parser (P2)",
	"ordering.indented-fence-tab.mdq.md": "parser (P2)",
	"ordering.lenient-indentation.mdq.md": "parser (P2)",
	"ordering.list-markers.mdq.md": "parser (P2)",
	"ordering.nbsp-end-of-stem.mdq.md": "parser (P2)",
	"ordering.nested-list-sections.mdq.md": "parser (P2)",
	"ordering.nested-list-three-levels.mdq.md": "parser (P2)",
	"ordering.nested-list-two-levels.mdq.md": "parser (P2)",
	"ordering.normalizations-comma-string.mdq.md": "parser (P2)",
	"ordering.observations-adjacent.mdq.md": "parser (P2)",
	"ordering.redundant-strict-indentation.mdq.md": "parser (P2)",
	"ordering.reject-differs-only-by-level-strict.mdq.md": "parser (P2)",
	"ordering.reject-feedback.mdq.md": "parser (P2)",
	"ordering.reject-uses-distractor.mdq.md": "parser (P2)",
	"ordering.reject-without-feedback.mdq.md": "parser (P2)",
	"ordering.section-empty-feedback-marker-line.mdq.md": "parser (P2)",
	"ordering.section-heading-closing-sequence.mdq.md": "parser (P2)",
	"ordering.section-heading-indented.mdq.md": "parser (P2)",
	"ordering.section-heading-setext.mdq.md": "parser (P2)",
	"ordering.section-heading-trailing-spaces.mdq.md": "parser (P2)",
	"ordering.skip-blanks.mdq.md": "parser (P2)",
	"ordering.strict-indentation.mdq.md": "parser (P2)",
	"ordering.strict-reject-other-level.mdq.md": "parser (P2)",
	"ordering.tab-indentation.mdq.md": "parser (P2)",
	"ordering.tab-stops-mixed.mdq.md": "parser (P2)",
	"ordering.tag-indented-trailing-spaces.mdq.md": "parser (P2)",
	"ordering.tag-space-before-colon.mdq.md": "parser (P2)",
	"ordering.tilde-fence.mdq.md": "parser (P2)",
	"ordering.trailing-whitespace.mdq.md": "parser (P2)",
	"ordering.two-accepts-and-reject.mdq.md": "parser (P2)",
	"ordering.unknown-highlight-language.mdq.md": "parser (P2)",
	"ordering.unmatched-manual.mdq.md": "parser (P2)",
	"ordering.unreachable-reject.mdq.md": "parser (P2)",
	"ordering.visually-identical-across-blocks.mdq.md": "parser (P2)",
	"ordering.visually-identical-lines.mdq.md": "parser (P2)",
	"short-answer.accept-tag-without-pattern.mdq.md": "parser (P2)",
	"short-answer.bare-accept-with-reject.mdq.md": "parser (P2)",
	"short-answer.bare-tag-detached-list-epilogue.mdq.md": "parser (P2)",
	"short-answer.exact-literal-spans-lines-block.mdq.md": "parser (P2)",
	"short-answer.indented-code-stem.mdq.md": "parser (P2)",
	"short-answer.indented-marker-continuation.mdq.md": "parser (P2)",
	"short-answer.indented-quote-continuation.mdq.md": "parser (P2)",
	"short-answer.indented-underline-continuation.mdq.md": "parser (P2)",
	"short-answer.manual.mdq.md": "parser (P2)",
	"short-answer.ordered-list-stem.mdq.md": "parser (P2)",
	"short-answer.pattern-empty-feedback-marker-line.mdq.md": "parser (P2)",
	"short-answer.reject-only.mdq.md": "parser (P2)",
	"short-answer.stem-with-prose-list.mdq.md": "parser (P2)",
	"short-answer.tab-indented-bang-continuation.mdq.md": "parser (P2)",
	"short-answer.tab-indented-quote-continuation.mdq.md": "parser (P2)",
	"short-answer.tab-indented-underline-continuation.mdq.md": "parser (P2)",
};

/** `valid/` documents that the Zod schemas reject. */
export const SCHEMA: Manifest = {};

/** `invalid/model-only/` documents that `validateDocument` accepts. */
export const MODEL_RULES: Manifest = {
	"model-only.exam-setext-h1-in-instructions.yaml":
		"corpus em mudança (rodada mdq)",
	"model-only.question-setext-h1-in-stem.yaml":
		"corpus em mudança (rodada mdq)",
	"model-only.essay-answer-key-setext-h1.yaml": "model rule (P4)",
	"model-only.essay-blank-answer-key-json.json": "model rule (P4)",
	"model-only.essay-blank-answer-key.yaml": "model rule (P4)",
	"model-only.essay-blank-author.yaml": "model rule (P4)",
	"model-only.essay-blank-comment.yaml": "model rule (P4)",
	"model-only.essay-blank-epilogue.yaml": "model rule (P4)",
	"model-only.essay-blank-stem.yaml": "model rule (P4)",
	"model-only.essay-blank-tag.yaml": "model rule (P4)",
	"model-only.essay-blank-title.yaml": "model rule (P4)",
	"model-only.essay-empty-answer-key.yaml": "model rule (P4)",
	"model-only.essay-empty-tag.yaml": "model rule (P4)",
	"model-only.essay-forbidden-heading-stem.yaml": "model rule (P4)",
	"model-only.essay-forbidden-list.yaml": "model rule (P4)",
	"model-only.essay-h1-between-thematic-breaks-in-epilogue.yaml":
		"model rule (P4)",
	"model-only.essay-h1-between-thematic-breaks-in-stem.yaml": "model rule (P4)",
	"model-only.essay-h1-in-yaml-stem.yaml": "model rule (P4)",
	"model-only.essay-locale-empty.yaml": "model rule (P4)",
	"model-only.essay-malformed-locale.yaml": "model rule (P4)",
	"model-only.exam-blank-author.yaml": "model rule (P4)",
	"model-only.exam-blank-instructions.yaml": "model rule (P4)",
	"model-only.exam-blank-tag.yaml": "model rule (P4)",
	"model-only.exam-blank-title.yaml": "model rule (P4)",
	"model-only.exam-declared-id-equals-derived.yaml": "model rule (P4)",
	"model-only.exam-duplicate-include.yaml": "model rule (P4)",
	"model-only.exam-duplicate-question-id.yaml": "model rule (P4)",
	"model-only.exam-empty-course.yaml": "model rule (P4)",
	"model-only.exam-empty-description.yaml": "model rule (P4)",
	"model-only.exam-inline-id-equals-include.yaml": "model rule (P4)",
	"model-only.exam-malformed-locale-productions.yaml": "model rule (P4)",
	"model-only.exam-malformed-locale.yaml": "model rule (P4)",
	"model-only.exam-start-impossible-date.yaml": "model rule (P4)",
	"model-only.exam-start-impossible-time.yaml": "model rule (P4)",
	"model-only.exam-zero-duration.yaml": "model rule (P4)",
	"model-only.fill-in-blank-choice-feedback-and-comment.yaml":
		"model rule (P4)",
	"model-only.fill-in-blank-choice-text.yaml": "model rule (P4)",
	"model-only.fill-in-blank-duplicate-choice-id.yaml": "model rule (P4)",
	"model-only.fill-in-blank-duplicate-choice-text.yaml": "model rule (P4)",
	"model-only.fill-in-blank-in-emphasis-yaml.yaml": "model rule (P4)",
	"model-only.fill-in-duplicate-blank-id.yaml": "model rule (P4)",
	"model-only.fill-in-inline-blank-type-in-stem.yaml": "model rule (P4)",
	"model-only.fill-in-misplaced-blank.yaml": "model rule (P4)",
	"model-only.fill-in-numeric-blank-decimal-places-missing-fraction-absolute-float.yaml":
		"model rule (P4)",
	"model-only.fill-in-numeric-blank-decimal-places-missing-fraction-absolute-integer.yaml":
		"model rule (P4)",
	"model-only.fill-in-numeric-blank-decimal-places-missing-fraction-bare.yaml":
		"model rule (P4)",
	"model-only.fill-in-numeric-blank-decimal-places-missing-fraction-relative-tolerance.yaml":
		"model rule (P4)",
	"model-only.fill-in-numeric-blank-empty-incorrect-feedback.yaml":
		"model rule (P4)",
	"model-only.fill-in-short-answer-blank-invalid-regex.yaml": "model rule (P4)",
	"model-only.fill-in-short-answer-blank-pattern-feedback.yaml":
		"model rule (P4)",
	"model-only.fill-in-undefined-blank.yaml": "model rule (P4)",
	"model-only.fill-in-unreferenced-blank.yaml": "model rule (P4)",
	"model-only.multiple-choice-blank-comment.yaml": "model rule (P4)",
	"model-only.multiple-choice-blank-feedback.yaml": "model rule (P4)",
	"model-only.multiple-choice-blank-text.yaml": "model rule (P4)",
	"model-only.multiple-choice-duplicate-choice-id.yaml": "model rule (P4)",
	"model-only.multiple-choice-duplicate-choice-text.yaml": "model rule (P4)",
	"model-only.multiple-choice-empty-feedback.yaml": "model rule (P4)",
	"model-only.multiple-selection-blank-comment.yaml": "model rule (P4)",
	"model-only.multiple-selection-blank-feedback.yaml": "model rule (P4)",
	"model-only.multiple-selection-blank-text.yaml": "model rule (P4)",
	"model-only.multiple-selection-duplicate-choice-id.yaml": "model rule (P4)",
	"model-only.multiple-selection-duplicate-choice-text.yaml": "model rule (P4)",
	"model-only.multiple-selection-empty-feedback.yaml": "model rule (P4)",
	"model-only.numeric-answer-negative-out-of-range.yaml": "model rule (P4)",
	"model-only.numeric-answer-out-of-range.yaml": "model rule (P4)",
	"model-only.numeric-answer-underflow.yaml": "model rule (P4)",
	"model-only.numeric-empty-incorrect-feedback.yaml": "model rule (P4)",
	"model-only.ordering-accept-foreign-line.yaml": "model rule (P4)",
	"model-only.ordering-accept-other-level-fixed.yaml": "model rule (P4)",
	"model-only.ordering-accept-reject-overlap-lenient.yaml": "model rule (P4)",
	"model-only.ordering-accept-reject-overlap-skip-blanks.yaml":
		"model rule (P4)",
	"model-only.ordering-accept-reject-overlap.yaml": "model rule (P4)",
	"model-only.ordering-accept-with-distractor.yaml": "model rule (P4)",
	"model-only.ordering-blank-accept-feedback-comment.yaml": "model rule (P4)",
	"model-only.ordering-blank-incorrect-feedback.yaml": "model rule (P4)",
	"model-only.ordering-empty-accept.yaml": "model rule (P4)",
	"model-only.ordering-empty-answer-key.yaml": "model rule (P4)",
	"model-only.ordering-reject-equals-answer-key-lenient.yaml":
		"model rule (P4)",
	"model-only.ordering-reject-equals-answer-key.yaml": "model rule (P4)",
	"model-only.ordering-text-accept-level-jump.yaml": "model rule (P4)",
	"model-only.ordering-text-empty-line.yaml": "model rule (P4)",
	"model-only.ordering-text-level-jump.yaml": "model rule (P4)",
	"model-only.ordering-text-starts-indented.yaml": "model rule (P4)",
	"model-only.question-empty-comment.yaml": "model rule (P4)",
	"model-only.short-answer-backtick-closing-run-longer.yaml": "model rule (P4)",
	"model-only.short-answer-backtick-opening-run-longer.yaml": "model rule (P4)",
	"model-only.short-answer-blank-incorrect-feedback.yaml": "model rule (P4)",
	"model-only.short-answer-blank-pattern-feedback.yaml": "model rule (P4)",
	"model-only.short-answer-blank-pattern-forms.yaml": "model rule (P4)",
	"model-only.short-answer-blank-zero-width-pattern.yaml": "model rule (P4)",
	"model-only.short-answer-block-start-pattern.yaml": "model rule (P4)",
	"model-only.short-answer-empty-incorrect-feedback.yaml": "model rule (P4)",
	"model-only.short-answer-invalid-regex.yaml": "model rule (P4)",
	"model-only.short-answer-regex-class-intersection.yaml": "model rule (P4)",
	"model-only.short-answer-regex-lookbehind.yaml": "model rule (P4)",
	"model-only.short-answer-regex-named-group.yaml": "model rule (P4)",
	"model-only.short-answer-regex-unicode-property.yaml": "model rule (P4)",
	"model-only.short-answer-unclosed-regex-frontmatter.yaml": "model rule (P4)",
	"model-only.short-answer-unclosed-regex-trailing-space.yaml":
		"model rule (P4)",
	"model-only.short-answer-whitespace-incorrect-feedback.yaml":
		"model rule (P4)",
	"model-only.short-answer-zwsp-incorrect-feedback.yaml": "model rule (P4)",
	"model-only.true-false-blank-feedback-and-comment.yaml": "model rule (P4)",
	"model-only.true-false-blank-text.yaml": "model rule (P4)",
	"model-only.true-false-combining-mark-marker.yaml": "model rule (P4)",
	"model-only.true-false-duplicate-choice-id.yaml": "model rule (P4)",
	"model-only.true-false-duplicate-choice-text.yaml": "model rule (P4)",
	"model-only.true-false-empty-feedback.yaml": "model rule (P4)",
	"model-only.true-false-marker-contradicts-correct.yaml": "model rule (P4)",
	"model-only.true-false-marker-disagrees-warning.yaml": "model rule (P4)",
	"model-only.true-false-marker-disagrees-with-correct.yaml": "model rule (P4)",
	"model-only.true-false-multi-character-marker.yaml": "model rule (P4)",
	"model-only.true-false-non-letter-marker.yaml": "model rule (P4)",
	"model-only.true-false-reserved-true-false-marker.yaml": "model rule (P4)",
	"model-only.true-false-whitespace-marker.yaml": "model rule (P4)",
};

/**
 * `invalid/**\/*.mdq.md` sources that are not rejected with an error code
 * their `.lint.json` pins. The reason lists the expected codes and the phase
 * of the port plan that ports them.
 */
export const LOAD: Manifest = {
	"exam-setext-h1-in-instructions.mdq.md": "corpus em mudança (rodada mdq)",
	"fill-in-short-answer-tag-line-after-content.mdq.md":
		"corpus em mudança (rodada mdq)",
	"fill-in-short-answer-tag-line-after-item.mdq.md":
		"corpus em mudança (rodada mdq)",
	"question-setext-h1-in-epilogue.mdq.md": "corpus em mudança (rodada mdq)",
	"short-answer-tag-line-after-content.mdq.md":
		"corpus em mudança (rodada mdq)",
	"short-answer-tag-line-after-continuation.mdq.md":
		"corpus em mudança (rodada mdq)",
	"short-answer-tag-line-after-empty-tag.mdq.md":
		"corpus em mudança (rodada mdq)",
	"short-answer-tag-line-after-item.mdq.md": "corpus em mudança (rodada mdq)",
	"essay-answer-key-before-body.mdq.md": "expects forbidden-block-element (P4)",
	"essay-forbidden-heading.mdq.md": "expects forbidden-block-element (P4)",
	"essay-forbidden-paragraph-after-heading.mdq.md":
		"expects forbidden-block-element (P4)",
	"essay-forbidden-paragraph-stem.mdq.md":
		"expects forbidden-block-element (P4)",
	"essay-h1-in-stem.mdq.md": "expects forbidden-block-element (P4)",
	"essay-slug-not-first-element.mdq.md": "expects forbidden-block-element (P4)",
	"essay-tag-with-text-before-tag.mdq.md":
		"expects forbidden-block-element (P4)",
	"essay-answer-key-h1.mdq.md": "expects forbidden-block-element (P4)",
	"essay-answer-key-zwsp.mdq.md": "expects blank-text (P4)",
	"essay-forbidden-paragraph-epilogue.mdq.md":
		"expects forbidden-block-element (P4)",
	"essay-tags-empty-string.mdq.md": "expects blank-text (P4)",
	"essay-tags-string-empty-entry.mdq.md": "expects blank-text (P4)",
	"exam-duplicate-question-id.mdq.md": "expects duplicate-question-id (P4)",
	"exam-h1-in-instructions.mdq.md": "expects forbidden-block-element (P4)",
	"exam-malformed-start.mdq.md": "expects malformed-start (P4)",
	"exam-tags-string-empty-entry.mdq.md": "expects blank-text (P4)",
	"exam-unknown-frontmatter-key.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"fill-in-autolink-blank-defined.mdq.md": "expects unreferenced-blank (P4)",
	"fill-in-choice-blank-two-feedback-blocks.mdq.md": "expects parse-error (P2)",
	"fill-in-choice-list-marker-change.mdq.md": "expects parse-error (P2)",
	"fill-in-decimal-places-negative.mdq.md": "expects schema-error (P4)",
	"fill-in-decimal-places-on-short-answer-blank.mdq.md":
		"expects schema-error (P4)",
	"fill-in-decimal-places-undefined-blank.mdq.md":
		"expects undefined-blank (P4)",
	"fill-in-detached-choice-and-numeric.mdq.md": "expects detached-tag (P2)",
	"fill-in-detached-tag.mdq.md": "expects detached-tag (P2)",
	"fill-in-domain-not-a-mapping.mdq.md": "expects parse-error (P2)",
	"fill-in-domain-on-short-answer-blank.mdq.md": "expects schema-error (P4)",
	"fill-in-domain-undefined-blank.mdq.md": "expects undefined-blank (P4)",
	"fill-in-domain-unknown-value.mdq.md": "expects schema-error (P4)",
	"fill-in-duplicate-blank-reference.mdq.md":
		"expects duplicate-blank-reference (P4)",
	"fill-in-epilogue-footnote-line.mdq.md": "expects detached-tag (P2)",
	"fill-in-html-block-blank.mdq.md": "expects unreferenced-blank (P4)",
	"fill-in-incorrect-feedback-map-value-not-string.mdq.md":
		"expects parse-error (P2)",
	"fill-in-incorrect-feedback-not-a-map.mdq.md": "expects parse-error (P2)",
	"fill-in-incorrect-feedback-on-choice-blank.mdq.md":
		"expects schema-error (P4)",
	"fill-in-incorrect-feedback-undefined-blank.mdq.md":
		"expects undefined-blank (P4)",
	"fill-in-marker-line-after-blank-definition-content.mdq.md":
		"expects parse-error (P2)",
	"fill-in-misplaced-blank-blockquote.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-emphasis.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-image-alt.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-link.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-list-item.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-table-cell.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-no-blanks-markdown.mdq.md": "expects schema-error (P4)",
	"fill-in-numeric-blank-invisible-unit.mdq.md": "expects blank-text (P4)",
	"fill-in-quote-line-after-blank-definition-content.mdq.md":
		"expects parse-error (P2)",
	"fill-in-short-answer-accept-alias-blank-line-before-list.mdq.md":
		"expects parse-error (P2)",
	"fill-in-short-answer-blank-line-before-list.mdq.md":
		"expects parse-error (P2)",
	"fill-in-short-answer-comment-after-content.mdq.md":
		"expects parse-error (P2)",
	"fill-in-short-answer-empty-colon.mdq.md": "expects parse-error (P2)",
	"fill-in-short-answer-exact-opens-at-line-end.mdq.md":
		"expects parse-error (P2)",
	"fill-in-short-answer-list-marker-change.mdq.md": "expects parse-error (P2)",
	"fill-in-short-answer-reject-without-colon.mdq.md":
		"expects parse-error (P2)",
	"fill-in-short-answer-setext-after-reject-content.mdq.md":
		"expects parse-error (P2)",
	"fill-in-strikethrough-blank.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-undefined-blank.mdq.md": "expects undefined-blank (P4)",
	"fill-in-unreferenced-blank.mdq.md": "expects unreferenced-blank (P4)",
	"model-only.fill-in-blank-incorrect-feedback-markdown.mdq.md":
		"expects blank-text (P4)",
	"model-only.ordering-accept-more-copies.mdq.md":
		"expects accept-outside-answer-key (P4)",
	"model-only.ordering-blank-section-comment.mdq.md": "expects blank-text (P4)",
	"model-only.ordering-blank-section-feedback.mdq.md":
		"expects blank-text (P4)",
	"model-only.short-answer-blank-exact-literal.mdq.md":
		"expects blank-text (P4)",
	"multiple-choice-blank-feedback-only-markers.mdq.md":
		"expects blank-text (P4)",
	"multiple-choice-blank-text-no-text.mdq.md": "expects blank-text (P4)",
	"multiple-choice-blank-text-only-id.mdq.md": "expects blank-text (P4)",
	"multiple-choice-forbidden-paragraph-epilogue.mdq.md":
		"expects forbidden-block-element (P4)",
	"multiple-choice-two-checkbox-lists.mdq.md":
		"expects forbidden-block-element (P4)",
	"multiple-selection-blank-text-only-id.mdq.md": "expects blank-text (P4)",
	"multiple-selection-duplicate-text-whitespace.mdq.md":
		"expects duplicate-choice-text (P4)",
	"numeric-fraction-decimal-places-missing.mdq.md":
		"expects missing-decimal-places (P4)",
	"numeric-fraction-exponent-tolerance.mdq.md":
		"expects missing-decimal-places (P4)",
	"numeric-invisible-unit.mdq.md": "expects blank-text (P4)",
	"ordering-automation-frontmatter.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"ordering-detached-tag.mdq.md": "expects detached-tag (P2)",
	"ordering-frontmatter-content.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"ordering-frontmatter-highlight.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"ordering-text-accept-jump.mdq.md": "expects invalid-outline-level (P4)",
	"ordering-text-empty-parent-jump.mdq.md":
		"expects invalid-outline-level (P4)",
	"ordering-text-reject-starts-nested.mdq.md":
		"expects invalid-outline-level (P4)",
	"ordering-text-starts-nested.mdq.md": "expects invalid-outline-level (P4)",
	"ordering-without-colon-fence.mdq.md": "expects parse-error (P2)",
	"ordering-without-colon.mdq.md": "expects parse-error (P2)",
	"short-answer-accept-alias-blank-line-before-list.mdq.md":
		"expects parse-error (P2)",
	"short-answer-accept-alias-empty-tag-blank-line-text.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-indented-line-after-content.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-indented-line-after-empty-tag.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-indented-line-after-reject-content.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-line-after-content.mdq.md": "expects parse-error (P2)",
	"short-answer-bang-line-after-continuation.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-line-after-empty-tag.mdq.md": "expects parse-error (P2)",
	"short-answer-bang-line-after-reject-content.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-line-indent-0.mdq.md": "expects parse-error (P2)",
	"short-answer-bang-line-indent-1.mdq.md": "expects parse-error (P2)",
	"short-answer-bang-line-indent-3.mdq.md": "expects parse-error (P2)",
	"short-answer-bang-no-space-line-after-content.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-no-space-line-after-empty-tag.mdq.md":
		"expects parse-error (P2)",
	"short-answer-bang-no-space-line-after-reject-content.mdq.md":
		"expects parse-error (P2)",
	"short-answer-blank-line-before-list.mdq.md": "expects parse-error (P2)",
	"short-answer-block-start-pattern-single-line.mdq.md":
		"expects block-start-pattern (P4)",
	"short-answer-comment-after-content.mdq.md": "expects parse-error (P2)",
	"short-answer-conflicting-accept-bare.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"short-answer-conflicting-accept.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"short-answer-conflicting-reject.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"short-answer-empty-tag-blank-line-text.mdq.md": "expects parse-error (P2)",
	"short-answer-empty-tag-end-of-body.mdq.md": "expects parse-error (P2)",
	"short-answer-empty-tag-then-accept-block.mdq.md": "expects parse-error (P2)",
	"short-answer-exact-closes-at-line-start-item-continuation.mdq.md":
		"expects parse-error (P2)",
	"short-answer-exact-closes-at-line-start-item-feedback.mdq.md":
		"expects parse-error (P2)",
	"short-answer-exact-closes-at-line-start-short.mdq.md":
		"expects parse-error (P2)",
	"short-answer-exact-closes-at-line-start.mdq.md": "expects parse-error (P2)",
	"short-answer-exact-double-opens-at-line-end.mdq.md":
		"expects parse-error (P2)",
	"short-answer-exact-opens-at-line-end-bare-tag.mdq.md":
		"expects parse-error (P2)",
	"short-answer-exact-opens-at-line-end-item.mdq.md":
		"expects parse-error (P2)",
	"short-answer-exact-opens-at-line-end.mdq.md": "expects parse-error (P2)",
	"short-answer-fence-mismatch.mdq.md": "expects parse-error (P2)",
	"short-answer-frontmatter-regex.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"short-answer-frontmatter-reject.mdq.md":
		"expects invalid-frontmatter-field (P2)",
	"short-answer-item-block-quote.mdq.md": "expects parse-error (P2)",
	"short-answer-item-heading.mdq.md": "expects parse-error (P2)",
	"short-answer-item-html-block.mdq.md": "expects parse-error (P2)",
	"short-answer-item-nested-list.mdq.md": "expects parse-error (P2)",
	"short-answer-item-ordered-list.mdq.md": "expects parse-error (P2)",
	"short-answer-item-reject-block-quote.mdq.md": "expects parse-error (P2)",
	"short-answer-item-setext-dashes.mdq.md": "expects parse-error (P2)",
	"short-answer-item-setext-equals.mdq.md": "expects parse-error (P2)",
	"short-answer-item-setext-single-equals.mdq.md": "expects parse-error (P2)",
	"short-answer-item-two-feedback-blocks.mdq.md": "expects parse-error (P2)",
	"short-answer-list-marker-change-ordered.mdq.md": "expects parse-error (P2)",
	"short-answer-list-marker-change.mdq.md": "expects parse-error (P2)",
	"short-answer-marker-line-after-continuation.mdq.md":
		"expects parse-error (P2)",
	"short-answer-partial-backtick.mdq.md": "expects parse-error (P2)",
	"short-answer-quote-after-content.mdq.md": "expects parse-error (P2)",
	"short-answer-quote-after-empty-tag.mdq.md": "expects parse-error (P2)",
	"short-answer-quote-line-after-content.mdq.md": "expects parse-error (P2)",
	"short-answer-quote-line-after-empty-tag.mdq.md": "expects parse-error (P2)",
	"short-answer-quote-line-after-reject-content.mdq.md":
		"expects parse-error (P2)",
	"short-answer-quote-line-indent-0.mdq.md": "expects parse-error (P2)",
	"short-answer-quote-line-indent-1.mdq.md": "expects parse-error (P2)",
	"short-answer-quote-line-indent-3.mdq.md": "expects parse-error (P2)",
	"short-answer-regex-alternation-quantifier-without-atom.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-atomic-group.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-backreference.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-bell-escape.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-braced-escape-too-large.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-comment-group.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-conditional-group.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-control-letter-escape.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-dash-escape-outside-class.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-empty-braced-escape.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-empty-class.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-empty-negated-class.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-end-of-text-anchor.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-escaped-space.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-identity-escape.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-incomplete-hex-escape.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-incomplete-unicode-escape.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-inline-flags-group.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-inline-modifier.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-js-named-group.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-lone-close-brace.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-lone-close-bracket.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-lone-open-brace.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-lookbehind-negative.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-named-reference.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-negated-unicode-property.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-nul-escape.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-octal-escape.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-possessive-optional.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-possessive-star.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-possessive.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-python-named-reference.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-quantified-anchor.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-quantified-assertion.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-quantifier-without-atom.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-quantifier-without-minimum.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-reversed-quantifier.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-reversed-range.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-shorthand-range-end.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-shorthand-range-start.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-start-of-text-anchor.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-surrogate-braced-escape-in-class.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-surrogate-braced-escape.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-surrogate-escape-in-class.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-surrogate-escape-pair.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-regex-trailing-backslash.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-unclosed-class.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-unclosed-group.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-unopened-group.mdq.md": "expects invalid-regex (P4)",
	"short-answer-regex-word-boundary-in-class.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-reject-after-epilogue.mdq.md": "expects detached-tag (P2)",
	"short-answer-reject-without-colon.mdq.md": "expects parse-error (P2)",
	"short-answer-repeated-ignored-regex-flag.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-repeated-regex-flag.mdq.md": "expects invalid-regex (P4)",
	"short-answer-setext-after-reject-content.mdq.md": "expects parse-error (P2)",
	"short-answer-unclosed-regex-content.mdq.md": "expects invalid-regex (P4)",
	"short-answer-unclosed-regex-item.mdq.md": "expects invalid-regex (P4)",
	"short-answer-unknown-regex-flag.mdq.md": "expects invalid-regex (P4)",
};

/** `.resolved.yaml` fixtures whose exam `resolveExam` does not resolve to the expected ids. */
export const RESOLVE: Manifest = {
	"exam.ordering-sections.mdq.md": "parser (P2)",
	"exam.with-ordering.mdq.md": "parser (P2)",
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
