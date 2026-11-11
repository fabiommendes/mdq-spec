// r2: adr-0003, adr-0005
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
 * fails; remove the entry when the port handles it. The manifests are the
 * mechanism for future ports: a key that ends in `*` is a prefix too, and they are empty while the port is at parity with
 * mdq-py. See `docs/sync/testing.md`.
 *
 * The manifests of the corpus suites (`LOADING`, `LINT`, `LINT_CODES`,
 * `MATCHING`, `IDS`, `NORMALIZE`, `GRADING`) key each test as
 * `<group>.<case>`. While nothing of a group is ported, one prefix entry
 * (`"regex."`) covers it. A port of part of a group replaces its prefix with
 * one entry per case that still fails.
 */

import { it } from "vitest";

type Manifest = Record<string, string>;

/** `.mdq.md` sources that do not parse into their `.yaml` sibling. */
export const PARSE: Manifest = {
	"code.*":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
};

/** `valid/` documents that the Zod schemas reject. */
export const SCHEMA: Manifest = {
	"code.*":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
};

/** `invalid/model-only/` documents that `validateDocument` accepts. */
export const MODEL_RULES: Manifest = {
	"model-only.essay-answer-key-bracket-heading.yaml":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
};

/**
 * `invalid/**\/*.mdq.md` sources that are not rejected with an error code
 * their `.lint.json` pins. The reason lists the expected codes.
 */
export const LOAD: Manifest = {
	"code-annotation-blank-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-empty.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-feedback-after-blank-line.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-value-decimal-comma.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-value-percent.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-value-with-spaces.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-manual-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-orphan-feedback.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-repeated-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-slug-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-two-feedback-blocks.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-annotation-unknown-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-answer-key-before-section.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-answer-key-frontmatter.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-answer-key-h1.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-answer-key-zwsp.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-highlight-frontmatter.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-blank-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-blank-feedback.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-brace-is-not-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-no-binding.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-public-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-repeated-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-slug-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-rubric-unknown-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-section-before-tag.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-tag-lazy-line.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-tests-frontmatter.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-two-tags.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"code-unknown-section.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"essay-answer-key-section-heading.mdq.md":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
	"essay-answer-key-heading-h3-bracket.mdq.md":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
	"essay-answer-key-heading-x-feito.mdq.md":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
};

/** `.resolved.yaml` fixtures whose exam `resolveExam` does not resolve to the expected ids. */
export const RESOLVE: Manifest = {};

/**
 * Documents under `invalid/` that `load` does not report with exactly the
 * diagnostics their `.lint.json` pins (`tests/loading.spec.ts`). Keys are
 * `<group>.<relativeId>`: groups `syntax`, `parsed-only`, `source` and
 * `sibling`.
 */
export const LOADING: Manifest = {
	"source.code-annotation-blank-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-empty.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-feedback-after-blank-line.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-value-decimal-comma.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-value-percent.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-value-with-spaces.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-manual-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-orphan-feedback.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-repeated-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-slug-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-two-feedback-blocks.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-annotation-unknown-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-answer-key-before-section.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-answer-key-frontmatter.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-answer-key-h1.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-answer-key-zwsp.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-highlight-frontmatter.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-blank-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-blank-feedback.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-brace-is-not-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-no-binding.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-public-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-repeated-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-slug-criterion.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-rubric-unknown-modifier.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-section-before-tag.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-tag-lazy-line.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-tests-frontmatter.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-two-tags.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code-unknown-section.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"parsed-only.code-*":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"parsed-only.model-only.code-*":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"parsed-only.model-only.essay-answer-key-bracket-heading.yaml":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
	"source.essay-answer-key-section-heading.mdq.md":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
	"source.essay-answer-key-heading-h3-bracket.mdq.md":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
	"source.essay-answer-key-heading-x-feito.mdq.md":
		"a heading that starts with `[` after `## [answer-key]` is not a forbidden-block-element error yet (essay.md, Answer key)",
};

/**
 * Documents under `valid/` whose lint diagnostics differ from the
 * `.lint.json` (`tests/lint.spec.ts`). Keys are `<group>.<relativeId>`:
 * groups `parsed` and `source`.
 */
export const LINT: Manifest = {
	"parsed.code.rubric-without-positive-item.yaml":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"parsed.code.annotation-comment-starts.yaml":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"parsed.code.rubric-without-positive-item-tests-only.yaml":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code.rubric-without-positive-item.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code.annotation-comment-starts.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
	"source.code.rubric-without-positive-item-tests-only.mdq.md":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
};

/**
 * Codes of `docs/lint-codes.md` that `src/models/lint-codes.ts` lacks, or
 * lists with another severity (`tests/lint-codes.spec.ts`).
 */
export const LINT_CODES: Manifest = {
	"documented.rubric-without-positive-item":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
};

/**
 * Pattern and query vectors of `examples/matching/` that the port does not
 * match as expected (`tests/matching.spec.ts`). Keys are `<group>.<case>`.
 */
export const MATCHING: Manifest = {};

/** `.ids.yaml` files whose ids `withIds` does not give (`tests/ids.spec.ts`). */
export const IDS: Manifest = {};

/** Cases of `examples/normalize.yaml` (`tests/normalize.spec.ts`). */
export const NORMALIZE: Manifest = {};

/**
 * Cases of `examples/grading/` that the port does not score as expected
 * (`tests/grading.spec.ts`). Keys are `<group>.<case>`.
 */
export const GRADING: Manifest = {
	"exam-score.code question*":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
};

/** Cases of `examples/public.yaml` (`tests/public-form.spec.ts`). */
export const PUBLIC_FORM: Manifest = {
	"code *":
		"the code question type is not ported yet (r2: issue/mdq-js-porte-do-tipo-code)",
};

/** Cases of `examples/presentation.yaml` (`tests/presentation.spec.ts`). */
export const PRESENTATION: Manifest = {};

/** Cases of `examples/selection.yaml` (`tests/selection.spec.ts`). */
export const SELECTION: Manifest = {};

/** The reason `name` is not ported, or `undefined` if it is. */
export function notPorted(
	manifest: Manifest,
	name: string,
): string | undefined {
	for (const [key, reason] of Object.entries(manifest)) {
		if (
			key.endsWith("*")
				? name.startsWith(key.slice(0, -1))
				: key.endsWith(".")
					? name.startsWith(key)
					: name === key
		) {
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
