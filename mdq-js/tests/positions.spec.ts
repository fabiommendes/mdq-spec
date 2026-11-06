/**
 * The source positions a `.lint.json` pins. An entry with `line` (and
 * optionally `column`) is checked against the diagnostic with the same code
 * and path, loaded from the example's source: the `.mdq.md` when there is
 * one, else the `.yaml` or `.json` document. An entry without `line` pins no
 * position.
 */

import { existsSync } from "node:fs";
import { load } from "@mdq";
import { describe, expect, it } from "vitest";
import {
	collectFiles,
	collectSources,
	EXAMPLES_ROOT,
	formatOf,
	lintSibling,
	loadLintSibling,
	readText,
	relativeId,
	SOURCE_SUFFIX,
} from "./corpus.js";

/** The source of each example: the `.mdq.md`, or the lone parsed document. */
function exampleSources(): string[] {
	const sources = collectSources(EXAMPLES_ROOT);
	const parsed = collectFiles(EXAMPLES_ROOT).filter(
		(path) => !existsSync(path.replace(/\.[^.]+$/, SOURCE_SUFFIX)),
	);
	return [...sources, ...parsed].filter((path) =>
		existsSync(lintSibling(path)),
	);
}

const positioned = exampleSources().filter((path) =>
	loadLintSibling(path).some((entry) => entry.line !== undefined),
);

describe("a diagnostic points where its .lint.json says", () => {
	it("some examples pin a position", () => {
		expect(positioned.length).toBeGreaterThan(0);
	});

	for (const path of positioned) {
		it(relativeId(path), () => {
			const { diagnostics } = load(readText(path), {
				format: formatOf(path),
			});
			for (const entry of loadLintSibling(path)) {
				if (entry.line === undefined) continue;
				const key = JSON.stringify([entry.code, entry.path]);
				const found = diagnostics.find(
					(d) => JSON.stringify([d.code, d.path]) === key,
				);
				expect(found, `no diagnostic ${key}`).toBeDefined();
				expect(found?.line, `line of ${key}`).toBe(entry.line);
				if (entry.column !== undefined) {
					expect(found?.column, `column of ${key}`).toBe(entry.column);
				}
			}
		});
	}
});
