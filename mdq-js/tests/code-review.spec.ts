/**
 * Fixes of the differential review of the code question type: the cost of the
 * checks of a report, the rounding of the score and the values beyond a
 * double. The expected numbers come from `float(Fraction)` in mdq-py.
 */

import { checkReport, load, resolveTests, scoreResponse } from "@mdq";
import { annotationsOf } from "@mdq/models/code.js";
import type { CodeQuestion } from "@mdq/schema/index.js";
import { describe, expect, it } from "vitest";

function question(fields: Record<string, unknown> = {}): CodeQuestion {
	const loaded = load(
		{ type: "code", id: "q", stem: "Escreva `f`.", ...fields },
		{ kind: "question" },
	);
	expect(loaded.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
	return loaded.document as CodeQuestion;
}

describe("the scan of a test source", () => {
	it("is done once for each source", () => {
		const source = { format: "py", text: "# mdq: [+1] A\nx\n" };
		expect(annotationsOf(source)).toBe(annotationsOf(source));
	});

	it("is done again when the text changes", () => {
		const source: { format: string; text: string } = {
			format: "py",
			text: "x\n",
		};
		const first = annotationsOf(source);
		source.text = "# mdq: [+1] A\nx\n";
		expect(annotationsOf(source)).not.toBe(first);
		expect(annotationsOf(source).annotated).toBe(true);
	});

	it("does not make checkReport slow for a long source with many cases", () => {
		const lines = 3000;
		const text = `${Array.from({ length: lines }, (_, i) => `x${i}`).join("\n")}\n`;
		const q = question({ tests: [{ format: "py", text }] });
		const cases = Array.from({ length: 5000 }, (_, i) => ({
			source: 0,
			line: (i % lines) + 1,
			verdict: "pass",
		}));
		const started = performance.now();
		checkReport(q, { status: "completed", cases });
		expect(performance.now() - started).toBeLessThan(2000);
	});
});

describe("the rounding of the score", () => {
	const score = (value: string, first: number, second: number) => {
		const q = question({
			rubric: [
				{ value: first, binding: "manual", text: "a" },
				{ value: second, binding: "manual", text: "b" },
			],
		});
		return scoreResponse(q, "", { manual: [Number(value), 0] }).score;
	};

	it("keeps a score below 2 ** -1018", () => {
		const q = question({
			rubric: [{ value: 1, binding: "manual", text: "c" }],
		});
		expect(scoreResponse(q, "", { manual: [3e-308] }).score).toBe(3e-308);
	});

	it.each([
		["3e-308", 1, 2, 1e-308],
		["1e-320", 1, 2, 3.335e-321],
		["1e-320", 1, 3, 2.5e-321],
		["5e-324", 1, 3, 0],
		["1e-323", 1, 3, 5e-324],
		["2e-323", 1, 3, 5e-324],
		["1e-323", 1, 7, 0],
		["2.2250738585072e-308", 1, 3, 5.562684646268e-309],
		["0.1", 1, 3, 0.025],
		["1e-300", 1, 1, 5e-301],
	])("rounds %s / (%i + %i) once, as Python does", (m, a, b, expected) => {
		expect(score(m, a, b)).toBe(expected);
	});
});

describe("a rubric value beyond a double", () => {
	const huge = `1${"0".repeat(319)}`;

	it("is an invalid-rubric-item in an annotation", () => {
		const loaded = load(
			`Stem\n\n[code]\n\n## [tests]\n\n\`\`\`pytest\n# mdq: [+${huge}] x\ndef test_a():\n    pass\n\`\`\`\n`,
		);
		expect(
			loaded.diagnostics.map((d) => [d.code, d.path] as const),
		).toContainEqual(["invalid-rubric-item", ["tests", 0, "text"]]);
	});

	it("is an invalid-rubric-item in a rubric list", () => {
		const loaded = load(
			`Stem\n\n[code]\n\n## [rubric]\n\n- [+${huge}] {manual} x\n`,
		);
		expect(loaded.diagnostics.map((d) => d.code)).toContain(
			"invalid-rubric-item",
		);
	});

	it("is an invalid-rubric-item at resolveTests, never a RangeError", () => {
		const q = question({ tests: [{ format: "py", origin: "t.py" }] });
		expect(() =>
			resolveTests(q, { "t.py": `# mdq: [+${huge}] x\ndef test_a(): ...\n` }),
		).toThrow(/invalid-rubric-item|not finite/u);
	});

	it("counts 9007199254740993 as 9007199254740992", () => {
		const q = question({
			rubric: [
				{ value: Number("9007199254740993"), binding: "manual", text: "a" },
				{ value: 3, binding: "manual", text: "b" },
			],
		});
		expect(scoreResponse(q, "", { manual: [0, 1] }).score).toBe(
			3.3306690738754686e-16,
		);
	});
});
