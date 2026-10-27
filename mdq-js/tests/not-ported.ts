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
 * mechanism for future ports: they are empty while the port is at parity with
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
export const PARSE: Manifest = {};

/** `valid/` documents that the Zod schemas reject. */
export const SCHEMA: Manifest = {};

/** `invalid/model-only/` documents that `validateDocument` accepts. */
export const MODEL_RULES: Manifest = {};

/**
 * `invalid/**\/*.mdq.md` sources that are not rejected with an error code
 * their `.lint.json` pins. The reason lists the expected codes.
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
export const IDS: Manifest = {};

/** Cases of `examples/normalize.yaml` (`tests/normalize.spec.ts`). */
export const NORMALIZE: Manifest = {};

/**
 * Cases of `examples/grading/` that the port does not score as expected
 * (`tests/grading.spec.ts`). Keys are `<group>.<case>`.
 */
export const GRADING: Manifest = {};

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
