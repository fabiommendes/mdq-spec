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
 * fails; remove the entry in the cycle that ports the feature. See
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
	"model-only.": "model rules not ported to Zod refinements",
};

/**
 * Error codes of `examples/invalid/*.lint.json` that no ported layer
 * produces yet. An invalid source whose expected errors include one of
 * these runs as an expected failure in `tests/invalid-sources.spec.ts`;
 * remove a code in the cycle that ports its check (F5: model rules, F6:
 * lint errors).
 */
export const LOAD_CODES: Manifest = {
	"duplicate-question-id": "model rule (F5)",
	"forbidden-block-element": "model rule (F5)",
	"invalid-regex": "model rule (F5)",
	"malformed-start": "model rule (F5)",
	"misplaced-blank": "model rule (F5)",
	"unreferenced-blank": "model rule (F5)",
};

/**
 * `invalid/*.mdq.md` sources that parse and pass the schema although their
 * `.lint.json` pins an error the parser reports in other documents.
 */
export const LOAD: Manifest = {
	"fill-in-undefined-blank.mdq.md":
		"undefined-blank from a stem marker: model rule (F5)",
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
