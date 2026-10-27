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
export const RESOLVE: Manifest = {};

/**
 * Documents under `invalid/` that `load` does not report with exactly the
 * diagnostics their `.lint.json` pins (`tests/loading.spec.ts`). Keys are
 * `<group>.<relativeId>`: groups `syntax`, `parsed-only`, `source` and
 * `sibling`.
 */
export const LOADING: Manifest = {};

/**
 * Documents under `valid/` whose lint diagnostics differ from the
 * `.lint.json` (`tests/lint.spec.ts`). Keys are `<group>.<relativeId>`:
 * groups `parsed` and `source`.
 */
export const LINT: Manifest = {};

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
