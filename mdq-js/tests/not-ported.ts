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
export const PARSE: Manifest = {};

/** `valid/` documents that the Zod schemas reject. */
export const SCHEMA: Manifest = {};

/** `invalid/model-only/` documents that `validateDocument` accepts. */
export const MODEL_RULES: Manifest = {
	"model-only.exam-setext-h1-in-instructions.yaml": "model rule (P4)",
	"model-only.question-setext-h1-in-stem.yaml": "model rule (P4)",
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
	"exam-h1-in-question.mdq.md": "expects forbidden-block-element (P4)",
	"exam-setext-h1-in-question-stem.mdq.md":
		"expects forbidden-block-element (P4)",
	"fill-in-misplaced-blank-heading.mdq.md": "expects misplaced-blank (P4)",
	"question-setext-h1-in-stem.mdq.md": "expects forbidden-block-element (P4)",
	"exam-setext-h1-in-instructions.mdq.md":
		"expects forbidden-block-element (P4)",
	"question-setext-h1-in-epilogue.mdq.md":
		"expects forbidden-block-element (P4)",
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
	"fill-in-autolink-blank-defined.mdq.md": "expects unreferenced-blank (P4)",
	"fill-in-duplicate-blank-reference.mdq.md":
		"expects duplicate-blank-reference (P4)",
	"fill-in-html-block-blank.mdq.md": "expects unreferenced-blank (P4)",
	"fill-in-misplaced-blank-blockquote.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-emphasis.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-image-alt.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-link.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-list-item.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-misplaced-blank-table-cell.mdq.md": "expects misplaced-blank (P4)",
	"fill-in-numeric-blank-invisible-unit.mdq.md": "expects blank-text (P4)",
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
	"ordering-text-accept-jump.mdq.md": "expects invalid-outline-level (P4)",
	"ordering-text-empty-parent-jump.mdq.md":
		"expects invalid-outline-level (P4)",
	"ordering-text-reject-starts-nested.mdq.md":
		"expects invalid-outline-level (P4)",
	"ordering-text-starts-nested.mdq.md": "expects invalid-outline-level (P4)",
	"short-answer-block-start-pattern-single-line.mdq.md":
		"expects block-start-pattern (P4)",
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
	"short-answer-repeated-ignored-regex-flag.mdq.md":
		"expects invalid-regex (P4)",
	"short-answer-repeated-regex-flag.mdq.md": "expects invalid-regex (P4)",
	"short-answer-unclosed-regex-content.mdq.md": "expects invalid-regex (P4)",
	"short-answer-unclosed-regex-item.mdq.md": "expects invalid-regex (P4)",
	"short-answer-unknown-regex-flag.mdq.md": "expects invalid-regex (P4)",
};

/** `.resolved.yaml` fixtures whose exam `resolveExam` does not resolve to the expected ids. */
export const RESOLVE: Manifest = {};

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
