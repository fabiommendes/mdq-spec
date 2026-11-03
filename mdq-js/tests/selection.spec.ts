/**
 * `selectSeeded` (docs/exam.md, "Seeded selection"): the cases of
 * `examples/selection.yaml`, whose header describes the format, and the
 * seeded selection through `resolveExam`. Port of
 * `mdq-py/tests/test_selection_corpus.py`.
 */

import { createHash } from "node:crypto";
import {
	DictLoader,
	Exam,
	parseExamDocument,
	resolveExam,
	selectSeeded,
} from "@mdq";
import { describe, expect, it } from "vitest";
import { SELECTION_FILE } from "./corpus.js";
import { corpusIt, SELECTION } from "./not-ported.js";
import { casesOf } from "./vectors.js";

interface Case {
	readonly name: string;
	readonly seed: string;
	readonly candidates: string[];
	readonly max?: number;
	readonly selected: string[];
	readonly digests: Record<string, string>;
}

const CASES = casesOf<Case>(SELECTION_FILE);
const REJECTED = casesOf<string>(SELECTION_FILE, "rejectedSeeds");

describe("seeded selection cases", () => {
	for (const testCase of CASES) {
		corpusIt(SELECTION, `${testCase.name}: selected`, () => {
			const select = selectSeeded(testCase.seed);
			expect(select(testCase.candidates, testCase.max)).toEqual(
				testCase.selected,
			);
		});
		corpusIt(SELECTION, `${testCase.name}: digests`, () => {
			for (const [id, expected] of Object.entries(testCase.digests)) {
				const actual = createHash("sha256")
					.update(`${testCase.seed}\0${id}`, "utf8")
					.digest("hex");
				expect(actual).toBe(expected);
			}
		});
	}
	for (const seed of REJECTED) {
		corpusIt(SELECTION, `rejected seed ${JSON.stringify(seed)}`, () => {
			expect(() => selectSeeded(seed)).toThrow(RangeError);
		});
	}
});

describe("resolveExam with selectSeeded", () => {
	it("gives the same exam for the same seed", () => {
		const testCase = CASES[0] as Case;
		const bank = new DictLoader(
			Object.fromEntries(
				testCase.candidates.map((id) => [
					id,
					{ type: "essay", stem: `Bioma ${id}.`, tags: ["biome"] },
				]),
			),
		);
		const source = `# [ex] Biomas\n\n---\nincludeAll: biome\nmax: ${testCase.max}\n---\n`;
		const exam = Exam.parse(parseExamDocument(source));
		for (let i = 0; i < 3; i++) {
			const resolved = resolveExam(exam, bank, {
				select: selectSeeded(testCase.seed),
			});
			const ids = (resolved.questions as { id?: string }[]).map((q) => q.id);
			expect(ids).toEqual(testCase.selected);
		}
	});
});
