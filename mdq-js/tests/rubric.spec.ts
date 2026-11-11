/**
 * The pure functions of the rubric item grammar and of the annotation scanner
 * (`src/parser/rubric.ts`, a port of `mdq-py/mdq/_parser/_rubric.py`). The
 * corpus reaches them through the parser of `## [rubric]`; the annotations of
 * a test source need the model, so these cases pin the scanner until then.
 */

import { describe, expect, it } from "vitest";
import {
	checkCriterionStart,
	parseItemLine,
	publicText,
	RubricSyntaxError,
	scanAnnotations,
} from "../src/parser/rubric.js";

describe("parseItemLine", () => {
	it("reads the value, the modifiers and the criterion", () => {
		expect(parseItemLine("[+2.5]{public} Uses a loop")).toEqual({
			value: 2.5,
			modifiers: ["public"],
			criterion: "Uses a loop",
		});
	});

	it("reads -0 as 0", () => {
		expect(Object.is(parseItemLine("[-0] x").value, 0)).toBe(true);
		expect(Object.is(parseItemLine("[-0.0] x").value, 0)).toBe(true);
	});

	it("rejects a malformed value", () => {
		for (const line of ["[ 3 ] x", "[3,5] x", "[50%] x", "[slug] x"]) {
			expect(() => parseItemLine(line), line).toThrow(RubricSyntaxError);
		}
	});

	it("reads a value followed by `(` or `[` as the start of a link", () => {
		expect(parseItemLine("[3](x.md) a").value).toBeNull();
		expect(parseItemLine("[3][ref] a").value).toBeNull();
	});

	it("rejects a brace that opens no modifier", () => {
		expect(() => parseItemLine("[2]{Manual} x")).toThrow(RubricSyntaxError);
		expect(() => parseItemLine("{ x")).toThrow(RubricSyntaxError);
	});

	it("rejects a criterion that starts with a marker", () => {
		expect(() => checkCriterionStart("> x")).toThrow(RubricSyntaxError);
		expect(() => checkCriterionStart("! x")).toThrow(RubricSyntaxError);
		expect(() => checkCriterionStart("![x](y.png)")).not.toThrow();
	});
});

describe("scanAnnotations", () => {
	it("anchors the marker at the start of the line", () => {
		const found = scanAnnotations("x = 1  # mdq: [2] no\n");
		expect(found.annotated).toBe(false);
		expect(found.items).toEqual([]);
		expect(found.problems).toEqual([]);
	});

	it("reads an item with its feedback and comment", () => {
		const found = scanAnnotations(
			"# mdq: [2] a\n# mdq: > ok\n# mdq: ! c\ncode\n",
		);
		expect(found.problems).toEqual([]);
		expect(found.items).toEqual([
			{
				line: 1,
				end: 4,
				value: 2,
				public: false,
				example: false,
				text: "a",
				feedback: "ok",
				comment: "c",
				annotationLines: 3,
			},
		]);
	});

	it("ends a region at the line before the next item line", () => {
		const found = scanAnnotations(
			"// mdq: {public} p\n\nbody\n\n// mdq: [2]{example} q\n",
		);
		expect(found.items.map((i) => [i.line, i.end])).toEqual([
			[1, 4],
			[5, 5],
		]);
		expect(found.items.map((i) => [i.public, i.example])).toEqual([
			[true, false],
			[true, true],
		]);
		const first = found.items[0];
		expect(first && publicText(found, first)).toEqual(["body", 3]);
	});

	it("reports an observation line after a blank line, at its line", () => {
		const found = scanAnnotations("# mdq: a\ncode\n\n# mdq: > orphan\n");
		expect(found.problems.map((p) => [p.code, p.line])).toEqual([
			["invalid-rubric-item", 4],
		]);
	});

	it("allows at most one block of each kind", () => {
		const found = scanAnnotations(
			"# mdq: a\n# mdq: > f\n# mdq: ! c\n# mdq: > g\n",
		);
		expect(found.problems.map((p) => [p.code, p.line])).toEqual([
			["invalid-rubric-item", 4],
		]);
		expect(found.items[0]?.annotationLines).toBe(4);
	});

	it("counts a bad item line as an item line for the lines after it", () => {
		const found = scanAnnotations("# mdq: {x} bad\n# mdq: > f\n# mdq: ! \n");
		expect(found.annotated).toBe(true);
		expect(found.items).toEqual([]);
		expect(found.problems.map((p) => [p.code, p.line])).toEqual([
			["invalid-rubric-item", 1],
		]);
	});

	it("points a blank feedback or comment at its own line", () => {
		const found = scanAnnotations("# mdq: a\n# mdq: x\n# mdq: > \n# mdq: ! \n");
		expect(found.problems.map((p) => [p.code, p.line])).toEqual([
			["blank-text", 3],
			["blank-text", 4],
		]);
	});

	it("reports several problems of one source", () => {
		const found = scanAnnotations(
			"# mdq: [3,5] bad\n# mdq: > f\n# mdq: {public} b\ncode\n\n# mdq: > \n",
		);
		expect(found.problems.map((p) => [p.code, p.line])).toEqual([
			["invalid-rubric-item", 1],
			["invalid-rubric-item", 6],
		]);
		expect(found.items.map((i) => i.line)).toEqual([3]);
	});

	it("reports a blank criterion as blank-text", () => {
		const found = scanAnnotations("# mdq: [2]\n");
		expect(found.problems.map((p) => p.code)).toEqual(["blank-text"]);
	});
});
