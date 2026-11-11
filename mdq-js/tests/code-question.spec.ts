/**
 * The code question type (docs/question-types/code.md) beyond what the corpus
 * holds: the resolution step and the rules that need the text of a linked
 * source, the grading, the public form and the exam entry point. A port of
 * the matching tests of `mdq-py/tests/test_code_question.py`. The rendering is
 * not ported: mdq-js ports no render.
 */

import {
	automation,
	fullRubric,
	InvalidDocumentError,
	isResolved,
	lint,
	load,
	NotAutoGradable,
	publicForm,
	ReportError,
	ResponseError,
	referenceSolution,
	resolveTests,
	scoreResponse,
	scoreResponses,
	UnresolvedTestSource,
} from "@mdq";
import type { CodeQuestion } from "@mdq/schema/index.js";
import { describe, expect, it } from "vitest";

const TESTS =
	"def test_a(): ...\n\n# mdq: [+3] Caso difícil\ndef test_b(): ...\n";

function question(fields: Record<string, unknown> = {}): CodeQuestion {
	const loaded = load(
		{ type: "code", id: "q", stem: "Escreva `f`.", ...fields },
		{ kind: "question" },
	);
	expect(loaded.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
	return loaded.document as CodeQuestion;
}

function errors(fields: Record<string, unknown>) {
	const loaded = load(
		{ type: "code", id: "q", stem: "Escreva `f`.", ...fields },
		{ kind: "question" },
	);
	return loaded.diagnostics
		.filter((d) => d.severity === "error")
		.map((d) => [d.code, d.path] as const);
}

function linked(fields: Record<string, unknown> = {}): CodeQuestion {
	return question({ tests: [{ format: "py", origin: "t.py" }], ...fields });
}

describe("resolveTests", () => {
	it("fills the text, keeps the origin and returns a copy", () => {
		const original = linked();
		const resolved = resolveTests(original, { "t.py": TESTS });
		expect(resolved.tests?.[0]).toEqual({
			format: "py",
			origin: "t.py",
			text: TESTS,
		});
		expect(original.tests?.[0]?.text).toBeUndefined();
		expect(isResolved(resolved)).toBe(true);
		expect(isResolved(original)).toBe(false);
	});

	it("removes a leading byte order mark before counting lines", () => {
		const resolved = resolveTests(linked(), {
			"t.py": "﻿# mdq: [+1] A\ndef test_a(): ...\n",
		});
		expect(resolved.tests?.[0]?.text?.startsWith("# mdq")).toBe(true);
		expect(fullRubric(resolved)[0]?.line).toBe(1);
	});

	it("ignores missing and unused keys and fills the rest later", () => {
		const original = question({
			tests: [
				{ format: "py", origin: "a.py" },
				{ format: "py", origin: "b.py" },
				{ format: "py", origin: "a.py" },
			],
		});
		const first = resolveTests(original, { "a.py": "x\n", "unused.py": "y\n" });
		expect(first.tests?.map((s) => s.text)).toEqual(["x\n", undefined, "x\n"]);
		const second = resolveTests(first, { "b.py": "z\n", "a.py": "other\n" });
		expect(second.tests?.map((s) => s.text)).toEqual(["x\n", "z\n", "x\n"]);
	});

	it("reads the origin as an opaque key", () => {
		const resolved = resolveTests(linked(), { "./t.py": TESTS });
		expect(isResolved(resolved)).toBe(false);
		const inherited = resolveTests(linked(), {});
		expect(isResolved(inherited)).toBe(false);
	});

	it("reports the annotation errors of the text at tests[i].text", () => {
		const original = question({
			tests: [
				{ format: "py", text: "x\n" },
				{ format: "py", origin: "t.py" },
			],
		});
		let thrown: unknown;
		try {
			resolveTests(original, { "t.py": "# mdq: [ 3 ] x\ndef test_a(): ...\n" });
		} catch (error) {
			thrown = error;
		}
		expect(thrown).toBeInstanceOf(InvalidDocumentError);
		const found = (thrown as InvalidDocumentError).diagnostics;
		expect(found.map((d) => [d.code, d.path])).toEqual([
			["invalid-rubric-item", ["tests", 1, "text"]],
		]);
	});
});

describe("text-dependent operations", () => {
	it("fullRubric fails on an unresolved source", () => {
		expect(() => fullRubric(linked({ answerKey: "```py\nx\n```" }))).toThrow(
			UnresolvedTestSource,
		);
	});

	it("lint needs the text of every source", () => {
		const unresolved = linked({
			rubric: [{ binding: "manual", value: -1, text: "x" }],
		});
		const codes = (q: CodeQuestion) => lint(q).map((d) => d.code);
		expect(codes(unresolved)).not.toContain("rubric-without-positive-item");
		const resolved = resolveTests(unresolved, {
			"t.py": "# mdq: [0] A\ndef test_a(): ...\n",
		});
		expect(codes(resolved)).toContain("rubric-without-positive-item");
	});

	it("automation does not need the text", () => {
		expect(automation(linked())).toBe("automatic");
		expect(
			automation(linked({ rubric: [{ binding: "manual", text: "x" }] })),
		).toBe("semi-automatic");
		expect(
			automation(question({ rubric: [{ binding: "manual", text: "x" }] })),
		).toBe("manual");
	});

	it("takes the reference solution from the first fence that is a direct child", () => {
		const q = question({
			answerKey: "* ```\n  no\n  ```\n\n~~~py\nyes\n~~~\n",
		});
		expect(referenceSolution(q)).toBe("yes\n");
		expect(referenceSolution(question())).toBeNull();
	});

	it("lists the items of the sources and then of the rubric", () => {
		const q = question({
			tests: [
				{ format: "pytest", text: TESTS },
				{ format: "py", text: "x\n" },
			],
			rubric: [{ binding: "manual", value: 2, text: "Clareza" }],
		});
		expect(
			fullRubric(q).map((i) => [i.binding, i.value, i.source, i.line]),
		).toEqual([
			["tests", 3, 0, 3],
			["tests", 1, 1, undefined],
			["manual", 2, undefined, undefined],
		]);
	});
});

describe("model rules", () => {
	it("needs the closing fence of the template", () => {
		expect(errors({ template: "```py\nx" })).toEqual([
			["forbidden-block-element", ["template"]],
		]);
	});

	it.each([
		"",
		"my fmt",
		"a`b",
		"a b",
		"a\tb",
	])("a format must be a word: %j", (format) => {
		expect(errors({ tests: [{ format, text: "x\n" }] })).toEqual([
			["schema-error", ["tests", 0, "format"]],
		]);
	});

	it.each([
		"Makefile",
		"a\nb.py",
		"a/.",
		"a.",
		"dir.d/file",
	])("an origin has an extension and no line break: %j", (origin) => {
		expect(errors({ tests: [{ format: "py", origin }] })).toEqual([
			["schema-error", ["tests", 0, "origin"]],
		]);
	});

	it("takes the extension of the origin as the format", () => {
		expect(errors({ tests: [{ format: "pytest", origin: "t.py" }] })).toEqual([
			["test-format-disagrees-with-origin", ["tests", 0, "format"]],
		]);
	});

	it("needs a text or an origin in a test source", () => {
		expect(errors({ tests: [{ format: "py" }] })).toEqual([
			["schema-error", ["tests", 0]],
		]);
	});
});

describe("grading", () => {
	const graded = () => question({ tests: [{ format: "pytest", text: TESTS }] });
	const report = (fields: Record<string, unknown> = {}) => ({
		status: "completed",
		cases: [{ source: 0, line: 1, verdict: "pass" }],
		...fields,
	});

	it.each([
		["version true", report({ version: true })],
		["version as a string", report({ version: "1" })],
		["an unknown status", report({ status: "done" })],
		["an extra key", report({ extra: 1 })],
		[
			"a source as a string",
			report({ cases: [{ source: "0", line: 1, verdict: "pass" }] }),
		],
		["line 0", report({ cases: [{ source: 0, line: 0, verdict: "pass" }] })],
		[
			"an unknown verdict",
			report({ cases: [{ source: 0, line: 1, verdict: "ok" }] }),
		],
		[
			"a negative duration",
			report({
				cases: [{ source: 0, line: 1, verdict: "pass", duration: -1 }],
			}),
		],
		["a short digest", report({ hashes: { submission: "abc" } })],
		["a runner with no name", report({ runner: { version: "1" } })],
		["no cases", { status: "completed" }],
		[
			"a source out of range",
			report({ cases: [{ source: 1, line: 1, verdict: "pass" }] }),
		],
		[
			"a line after the last",
			report({ cases: [{ source: 0, line: 5, verdict: "pass" }] }),
		],
	])("an invalid report is a ReportError: %s", (_name, bad) => {
		expect(() => scoreResponse(graded(), "", { report: bad })).toThrow(
			ReportError,
		);
	});

	it("checks the cases only with the status completed", () => {
		const outOfRange = [{ source: 9, line: 99, verdict: "pass" }];
		const result = scoreResponse(graded(), "", {
			report: { status: "build-error", cases: outOfRange },
		});
		expect(result.score).toBe(0);
	});

	it("a response must be a string", () => {
		expect(() => scoreResponse(graded(), 42, { report: report() })).toThrow(
			ResponseError,
		);
	});

	it("without a report follows the checks of the spec", () => {
		expect(() => scoreResponse(graded(), "")).toThrow(ReportError);
		expect(() =>
			scoreResponse(
				question({ rubric: [{ binding: "manual", text: "x" }] }),
				"",
			),
		).toThrow(NotAutoGradable);
	});

	it("a manual score must not be a boolean", () => {
		const manual = question({ rubric: [{ binding: "manual", text: "x" }] });
		expect(() =>
			scoreResponse(manual, "", { manual: [true as never] }),
		).toThrow(RangeError);
	});

	it("checks the scores of the instructor before the report", () => {
		expect(() =>
			scoreResponse(graded(), "", { manual: [1], report: { bad: 1 } }),
		).toThrow(RangeError);
		expect(() => scoreResponse(linked(), "", { instructor: 2 })).toThrow(
			UnresolvedTestSource,
		);
	});

	it.each([
		"0.1",
		"0.05",
		"0.07",
		"1.1",
	])("a decimal value %s with every case passed scores exactly one", (value) => {
		for (const cases of [3, 7, 29]) {
			const text = `# mdq: [${value}] a\n${"t\n".repeat(cases)}`;
			const q = question({ tests: [{ format: "py", text }] });
			const rep = {
				status: "completed",
				cases: Array.from({ length: cases }, (_, i) => ({
					source: 0,
					line: i + 2,
					verdict: "pass",
				})),
			};
			expect(scoreResponse(q, "x", { report: rep }).score).toBe(1);
		}
	});
});

describe("exact score of a value with an exponent", () => {
	it("reads 1e-7 and 1.5e+21 from their decimal text", () => {
		const q = question({
			rubric: [
				{ value: 1e-7, binding: "manual", text: "a" },
				{ value: 1.5e21, binding: "manual", text: "b" },
				{ value: -1e-7, binding: "manual", text: "c" },
			],
		});
		const score = (manual: number[]) => scoreResponse(q, "", { manual }).score;
		expect(score([1, 1, 0])).toBe(1);
		expect(score([0, 0, 1])).toBeCloseTo(0, 20);
		expect(score([0, 0, 1])).toBeLessThan(0);
	});
});

describe("exam", () => {
	const exam = () => {
		const loaded = load(
			{
				type: "exam",
				title: "Prova",
				questions: [
					{
						type: "code",
						id: "c",
						stem: "S",
						tests: [{ format: "p", text: TESTS }],
					},
					{ type: "essay", id: "e", stem: "S" },
				],
			},
			{ kind: "exam" },
		);
		expect(loaded.document).toBeDefined();
		return loaded.document as Parameters<typeof scoreResponses>[0];
	};
	const completed = {
		status: "completed",
		cases: [{ source: 0, line: 4, verdict: "pass" }],
	};

	it("takes the reports by question id", () => {
		const result = scoreResponses(
			exam(),
			{ c: "x" },
			{ reports: { c: completed } },
		);
		expect(result.questions.c?.score).toBeCloseTo(1);
	});

	it("rejects a report for a question that is not code", () => {
		expect(() =>
			scoreResponses(exam(), { e: "x" }, { reports: { e: completed } }),
		).toThrow(ResponseError);
		expect(() =>
			scoreResponses(exam(), { c: "x" }, { manual: { zz: [] } }),
		).toThrow(ResponseError);
	});

	it("leaves a pending code question pending", () => {
		const result = scoreResponses(
			exam(),
			{ c: "x" },
			{ reports: { c: { status: "runner-error", cases: [] } } },
		);
		expect(result.pending).toEqual(["c"]);
	});
});

describe("public form", () => {
	it("lists the public regions", () => {
		const resolved = question({
			tests: [
				{
					format: "p",
					text: "# mdq: [0] {example} E\n\ncode\n\n\n# mdq: [1] H\nhidden\n",
				},
			],
		});
		expect(publicForm(resolved).publicTests).toEqual([
			{ format: "p", text: "code", firstLine: 3, example: true },
		]);
	});

	it("fails on an unresolved source", () => {
		expect(() => publicForm(linked())).toThrow(UnresolvedTestSource);
	});
});
