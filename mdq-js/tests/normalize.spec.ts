/**
 * `examples/normalize.yaml`: inputs the models accept and normalize (a nested
 * `null`, a YAML 1.1 form, a non-canonical duration) and, with
 * `normalize: true`, the result of `normalize`. The header of the file
 * describes the format. Mirrors `mdq-py/tests/test_normalize_corpus.py`.
 */

import { load, type MdqDocument, normalize } from "@mdq";
import { describe, expect, it } from "vitest";
import { NORMALIZE_FILE } from "./corpus.js";
import { corpusIt, NORMALIZE } from "./not-ported.js";
import { casesOf, errorsOf } from "./vectors.js";

interface Case {
	readonly name: string;
	readonly format?: "mapping" | "yaml" | "mdq";
	readonly kind?: "question" | "exam";
	readonly input: string | Record<string, unknown>;
	readonly normalize?: boolean;
	readonly output: unknown;
}

const CASES = casesOf<Case>(NORMALIZE_FILE);

describe("load normalizes the input", () => {
	it("there are normalize cases", () => {
		expect(CASES.length).toBeGreaterThan(0);
	});

	for (const testCase of CASES) {
		corpusIt(NORMALIZE, testCase.name, () => {
			const loaded = load(testCase.input, {
				...(testCase.kind === undefined ? {} : { kind: testCase.kind }),
				...(testCase.format === "yaml" ? { format: "yaml" as const } : {}),
			});
			expect(errorsOf(loaded.diagnostics)).toEqual([]);
			expect(loaded.document).toBeDefined();
			const document = loaded.document as MdqDocument;
			const result = testCase.normalize ? normalize(document) : document;
			expect(result).toEqual(testCase.output);
		});
	}
});
