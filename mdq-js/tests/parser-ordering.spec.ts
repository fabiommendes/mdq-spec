/**
 * Tests for the helpers of the `[ordering]` body: indentation measured in
 * columns, the indentation unit, and the raw lines of a fence or a list.
 * What the parser makes of a whole ordering question is pinned by the corpus
 * (`examples/valid/ordering/`, `examples/invalid/ordering-*`).
 *
 * Reference: `mdq-py/mdq/_parser/_ordering.py`.
 */

import {
	isCommentBlock,
	orderingAlternative,
	orderingCodeLines,
	orderingLeveled,
	orderingLineIndent,
	orderingUlLines,
	orderingUnit,
} from "@mdq/parser/ordering.js";
import { describe, expect, it } from "vitest";

describe("ordering indentation", () => {
	describe("orderingLineIndent", () => {
		it.each([
			["no indent", "a", [0, "a"]],
			["two spaces", "  b", [2, "b"]],
			["a tab", "\tb", [4, "b"]],
			["spaces then a tab reach the next stop of 4", "  \tb", [4, "b"]],
			["a tab then spaces", "\t  b", [6, "b"]],
			["a tab between spaces", "  \t  c", [6, "c"]],
			["one space and two tabs", " \t\td", [8, "d"]],
			["empty line", "", [0, ""]],
			["spaces only", "   ", [0, ""]],
			["a tab only", "\t", [0, ""]],
		])("%s", (_label, line, expected) => {
			expect(orderingLineIndent(line)).toEqual(expected);
		});
	});

	describe("orderingUnit", () => {
		it.each([
			["no indents", [], 4],
			["only zeros", [0, 0], 4],
			["multiples of 4", [4, 8], 4],
			["2 and 6", [2, 6], 2],
			["order does not matter", [6, 4], 2],
			["12 and 18", [12, 18], 6],
			["a single odd indent", [3], 3],
			["zeros are ignored", [0, 6, 0, 9], 3],
		])("%s: %j", (_label, indents, expected) => {
			expect(orderingUnit(indents)).toBe(expected);
		});
	});

	describe("orderingCodeLines", () => {
		it("splits a fence body into (indent, text) pairs", () => {
			expect(orderingCodeLines("a\n  b\n\n\tc\n")).toEqual([
				[0, "a"],
				[2, "b"],
				[0, ""],
				[4, "c"],
			]);
		});

		it("drops the single trailing newline", () => {
			expect(orderingCodeLines("a\n")).toEqual([[0, "a"]]);
		});

		it("keeps blank lines between lines", () => {
			expect(orderingCodeLines("a\n\n\nb")).toEqual([
				[0, "a"],
				[0, ""],
				[0, ""],
				[0, "b"],
			]);
		});

		it("an empty fence has no lines", () => {
			expect(orderingCodeLines("")).toEqual([]);
		});
	});

	describe("orderingUlLines", () => {
		it("strips the bullet and keeps the raw markdown of each item", () => {
			expect(
				orderingUlLines(
					["* a", "  * b", "- *x*", "+ \t_y_"],
					new Map([
						[0, 0],
						[1, 1],
						[2, 0],
						[3, 0],
					]),
					0,
				),
			).toEqual([
				[0, "a"],
				[1, "b"],
				[0, "*x*"],
				[0, "_y_"],
			]);
		});
	});

	describe("orderingLeveled", () => {
		it("divides each indent by the unit", () => {
			expect(
				orderingLeveled(
					[
						[0, "a"],
						[4, "b"],
						[0, ""],
					],
					4,
				),
			).toEqual([
				[0, "a"],
				[1, "b"],
				[0, ""],
			]);
		});

		it("does not require the indent to be a multiple of 2 when the unit is 2", () => {
			expect(orderingLeveled([[6, "c"]], 2)).toEqual([[3, "c"]]);
		});
	});

	describe("orderingAlternative", () => {
		it("levels the lines and keeps the feedback", () => {
			expect(
				orderingAlternative(
					{
						lines: [
							[0, "a"],
							[3, "b"],
						],
						feedback: "fb",
						comment: null,
					},
					3,
				),
			).toEqual({
				lines: [
					[0, "a"],
					[1, "b"],
				],
				feedback: "fb",
			});
		});

		it("keeps the comment", () => {
			expect(
				orderingAlternative(
					{ lines: [[0, "a"]], feedback: null, comment: "c" },
					4,
				),
			).toEqual({ lines: [[0, "a"]], comment: "c" });
		});

		it("omits an absent feedback and comment", () => {
			const alt = orderingAlternative(
				{ lines: [[0, "a"]], feedback: null, comment: null },
				4,
			);
			expect(alt).toEqual({ lines: [[0, "a"]] });
			expect(Object.keys(alt)).toEqual(["lines"]);
		});
	});

	describe("isCommentBlock", () => {
		it.each([
			["every line starts with !", ["! a", "! b"], true],
			["a line without the prefix", ["! a", "b"], false],
			["a feedback block", ["> a"], false],
			["no lines", [], false],
		])("%s", (_label, lines, expected) => {
			expect(isCommentBlock(lines)).toBe(expected);
		});
	});
});
