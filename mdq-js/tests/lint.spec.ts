/**
 * `examples/valid/**\/*.lint.json`: every valid document reports exactly the
 * `warning` and `info` diagnostics its `.lint.json` pins, compared as a
 * multiset (order is free). A clean document pins `[]`. Mirrors
 * `mdq-py/tests/test_lint_corpus.py`.
 *
 * A `.mdq.md` and its `.yaml` share one `.lint.json`. The `.yaml` side never
 * reports the codes only the Markdown parser produces (`PARSER_ONLY_CODES`),
 * so they are left out of what it expects.
 *
 * Two groups, the first word of each test name: `parsed` for a `.yaml` or
 * `.json` document and `source` for a `.mdq.md`.
 */

import { existsSync } from "node:fs";
import { load } from "@mdq";
import { describe, expect, it } from "vitest";
import {
	formatOf,
	lintSibling,
	loadLintSibling,
	PARSER_ONLY_CODES,
	readText,
	relativeId,
	SOURCE_SUFFIX,
	VALID_PARSED,
	VALID_SOURCES,
} from "./corpus.js";
import { corpusIt, LINT } from "./not-ported.js";
import { asMultiset, entryOf } from "./vectors.js";

/** Load `path` and check its non-error diagnostics against its `.lint.json`. */
function expectMatchesLintJson(path: string): void {
	expect(existsSync(lintSibling(path)), `${path} has no .lint.json`).toBe(true);
	const pinned = loadLintSibling(path);
	const expected = path.endsWith(SOURCE_SUFFIX)
		? pinned
		: pinned.filter((entry) => !PARSER_ONLY_CODES.has(entry.code));
	const loaded = load(readText(path), { format: formatOf(path) });
	const actual = loaded.diagnostics
		.filter((d) => d.severity !== "error")
		.map(entryOf);
	expect(asMultiset(actual)).toEqual(asMultiset(expected));
}

describe("a valid document reports its .lint.json", () => {
	it("there are valid documents", () => {
		expect(VALID_PARSED.length).toBeGreaterThan(0);
		expect(VALID_SOURCES.length).toBeGreaterThan(0);
	});

	for (const path of VALID_PARSED) {
		corpusIt(LINT, `parsed.${relativeId(path)}`, () => {
			expectMatchesLintJson(path);
		});
	}

	for (const path of VALID_SOURCES) {
		corpusIt(LINT, `source.${relativeId(path)}`, () => {
			expectMatchesLintJson(path);
		});
	}
});
