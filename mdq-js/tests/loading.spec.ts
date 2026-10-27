/**
 * `load` on the documents of `examples/invalid/`: none is accepted, and each
 * reports exactly the diagnostics its `.lint.json` pins, errors included
 * (code, severity and path, as a multiset). Mirrors
 * `mdq-py/tests/test_invalid_sources.py`.
 *
 * Four groups, the first word of each test name:
 *
 * - `syntax`: YAML or JSON that is not a document (`invalid/syntax/`).
 * - `parsed-only`: a `.yaml`/`.json` with no `.mdq.md` sibling, in `invalid/`
 *   and `invalid/model-only/`.
 * - `source`: a `.mdq.md` source.
 * - `sibling`: the `.yaml` of a source, which reports the same diagnostics.
 */

import { existsSync } from "node:fs";
import { load } from "@mdq";
import { describe, expect, it } from "vitest";
import {
	formatOf,
	INVALID_MODEL_ONLY_PARSED,
	INVALID_PARSED,
	INVALID_SOURCES,
	INVALID_SYNTAX,
	loadLintSibling,
	parsedSibling,
	readText,
	relativeId,
	SOURCE_SUFFIX,
} from "./corpus.js";
import { corpusIt, LOADING } from "./not-ported.js";
import { asMultiset, entryOf } from "./vectors.js";

/** Load a corpus file and check it reports what its `.lint.json` pins. */
function expectLintJson(path: string, lintJsonOf: string): void {
	const loaded = load(readText(path), { format: formatOf(path) });
	expect(loaded.document, `${path} loaded without an error`).toBeUndefined();
	expect(asMultiset(loaded.diagnostics.map(entryOf))).toEqual(
		asMultiset(loadLintSibling(lintJsonOf)),
	);
}

const PARSED_ONLY = [...INVALID_PARSED, ...INVALID_MODEL_ONLY_PARSED].filter(
	(path) => !existsSync(`${path.replace(/\.[^.]+$/, "")}${SOURCE_SUFFIX}`),
);

describe("load rejects what is not a document", () => {
	it("there are syntax examples", () => {
		expect(INVALID_SYNTAX.length).toBeGreaterThan(0);
	});

	for (const path of INVALID_SYNTAX) {
		corpusIt(LOADING, `syntax.${relativeId(path)}`, () => {
			expectLintJson(path, path);
		});
	}
});

describe("load reports the .lint.json of a document written as data", () => {
	it("there are parsed-only examples", () => {
		expect(PARSED_ONLY.length).toBeGreaterThan(0);
	});

	for (const path of PARSED_ONLY) {
		corpusIt(LOADING, `parsed-only.${relativeId(path)}`, () => {
			expectLintJson(path, path);
		});
	}
});

describe("load reports the .lint.json of an invalid source", () => {
	it("there are invalid sources", () => {
		expect(INVALID_SOURCES.length).toBeGreaterThan(0);
	});

	for (const source of INVALID_SOURCES) {
		corpusIt(LOADING, `source.${relativeId(source)}`, () => {
			expectLintJson(source, source);
		});
	}
});

describe("the .yaml sibling of an invalid source reports the same diagnostics", () => {
	for (const source of INVALID_SOURCES) {
		const sibling = parsedSibling(source);
		if (!existsSync(sibling)) continue;
		corpusIt(LOADING, `sibling.${relativeId(source)}`, () => {
			expectLintJson(sibling, source);
		});
	}
});
