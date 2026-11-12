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
	"code.answer-key-before-section.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"code.attachments.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"essay.answer-key-before-attachments.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"essay.attachments-and-answer-key.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"essay.attachments-setext.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"exam.attachments-setext.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"exam.attachments.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"multiple-choice.attachments.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"numeric.attachments-link-forms.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"ordering.attachments-between-sections.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
};

/** `valid/` documents that the Zod schemas reject. */
export const SCHEMA: Manifest = {
	"code.attachments.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"essay.answer-key-before-attachments.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"essay.attachments-and-answer-key.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"essay.attachments-setext.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"exam.attachments-setext.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"exam.attachments.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"multiple-choice.attachments.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"numeric.attachments-link-forms.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"ordering.attachments-between-sections.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
};

/** `invalid/model-only/` documents that `validateDocument` accepts. */
export const MODEL_RULES: Manifest = {};

/**
 * `invalid/**\/*.mdq.md` sources that are not rejected with an error code
 * their `.lint.json` pins. The reason lists the expected codes.
 */
export const LOAD: Manifest = {
	"attachments-autolink.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-empty.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-fence-name-backslash.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-fence-name-backtick.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-fence-name-dotdot.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-fence-name-nbsp.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-fence-no-info-string.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-fence-one-word.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-fence-three-words.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-image.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-indented-code.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-absolute.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-backslash.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-in-list.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-space-in-name.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-with-query.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-with-scheme.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-with-text.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-link-without-extension.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-paragraph-after-section.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-reference-link.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-twice.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments-two-links-one-paragraph.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"code-tests-twice-around-answer-key.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"essay-attachments-twice-around-answer-key.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"exam-attachments-then-instructions.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"exam-attachments-twice.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"exam-duplicate-attachment-name.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
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
	"parsed-only.attachments-format-with-space.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-label-on-fence.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-name-dot.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-name-with-backtick.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-name-with-slash.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-name-with-space.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-no-name.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-no-text-or-origin.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-origin-without-extension.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-text-and-origin.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.attachments-unknown-field.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.exam-attachments-name-with-slash.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.model-only.attachments-blank-label.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.model-only.attachments-duplicate-name.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.model-only.attachments-format-disagrees-with-origin.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.model-only.attachments-name-disagrees-with-origin.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed-only.model-only.exam-attachments-duplicate-name.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-autolink.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-duplicate-name-fence-and-link.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-duplicate-name.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-empty.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-format-backtick.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-name-backslash.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-name-backtick.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-name-dotdot.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-name-nbsp.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-no-info-string.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-one-word.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-fence-three-words.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-image.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-indented-code.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-absolute.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-backslash.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-in-list.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-space-in-name.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-with-query.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-with-scheme.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-with-text.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-link-without-extension.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-paragraph-after-section.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-reference-link.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-twice.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.attachments-two-links-one-paragraph.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.code-tests-twice-around-answer-key.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.essay-attachments-twice-around-answer-key.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.exam-attachments-then-instructions.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.exam-attachments-twice.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.exam-duplicate-attachment-name.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
};

/**
 * Documents under `valid/` whose lint diagnostics differ from the
 * `.lint.json` (`tests/lint.spec.ts`). Keys are `<group>.<relativeId>`:
 * groups `parsed` and `source`.
 */
export const LINT: Manifest = {
	"parsed.essay.attachments-setext.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed.exam.attachments-setext.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed.exam.attachments.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"parsed.multiple-choice.attachments.yaml":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.code.answer-key-before-section.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.essay.attachments-setext.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.exam.attachments-setext.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.exam.attachments.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"source.multiple-choice.attachments.mdq.md":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
};

/**
 * Codes of `docs/lint-codes.md` that `src/models/lint-codes.ts` lacks, or
 * lists with another severity (`tests/lint-codes.spec.ts`).
 */
export const LINT_CODES: Manifest = {};

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
export const GRADING: Manifest = {};

/** Cases of `examples/public.yaml` (`tests/public-form.spec.ts`). */
export const PUBLIC_FORM: Manifest = {
	"a linked attachment never makes the public form fail":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"a linked attachment never makes the public form fail scores one":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments keep name, format, text and label, and drop the origin":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
};

/** Cases of `examples/presentation.yaml` (`tests/presentation.spec.ts`). */
export const PRESENTATION: Manifest = {
	"attachments are the same as in the public form: presented form":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
	"attachments are the same as in the public form: responses":
		"the attachments and the free position of the answer key are not ported yet (r2: issue/mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key)",
};

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
