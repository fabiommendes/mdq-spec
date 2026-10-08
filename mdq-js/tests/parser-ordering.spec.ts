/**
 * Tests for the `[ordering]` body, its `## [extra]`, `## [accept]` and
 * `## [reject]` sections, and the indentation unit shared by all of them --
 * `docs/handoffs/07-parser-ordering.md`, batch 1 criteria 2 and 3, and batch 2
 * criterion 4. Ported from `mdq-py/tests/test_ordering_parser.py` (the
 * hypothesis render/parse property is skipped).
 *
 * Criterion 1 (every `examples/valid/ordering/*.mdq.md` parses to its
 * `.yaml`) is already covered by the corpus loop in `tests/parser.spec.ts`;
 * this file does not duplicate it.
 *
 * Every expected value here comes from running the reference directly, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._parser._question import parse_question
 *   print(parse_question('Ordene.\n\n[ordering]\n```\na\n  \tb\n```\n'))
 *   "
 *
 * and, for the helpers, `from mdq._parser._ordering import ordering_unit, ...`.
 *
 * Reference: `mdq-py/mdq/_parser/_ordering.py`; `mdq-py/mdq/_parser/
 * _question.py` -- `parse_ordering_body`, `parse_ordering_content`,
 * `parse_ordering_observations`.
 */

import { ParseError, parseQuestionDocument } from "@mdq";
import {
	isCommentBlock,
	joinPrefixedLines,
	orderingAlternative,
	orderingCodeLines,
	orderingLeveled,
	orderingLineIndent,
	orderingUlLines,
	orderingUnit,
} from "@mdq/parser/ordering.js";
import { describe, expect, it } from "vitest";

const STEM = "Ordene.\n\n";

/** Parse `STEM` + `body` and return only the `lines` of the result. */
function linesOf(body: string): unknown {
	return (parseQuestionDocument(STEM + body) as { lines: unknown }).lines;
}

//
// Batch 1, criterion 2: indentation.
//

describe("batch 1: ordering indentation", () => {
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

		it("keeps trailing spaces and a blank line before the end", () => {
			expect(orderingCodeLines("a  \n\n")).toEqual([
				[0, "a  "],
				[0, ""],
			]);
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
			expect(orderingUlLines(["* a", "  * b", "- *x*", "+ \t_y_"])).toEqual([
				[0, "a"],
				[2, "b"],
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
						comment: undefined,
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
					{ lines: [[0, "a"]], feedback: undefined, comment: "c" },
					4,
				),
			).toEqual({ lines: [[0, "a"]], comment: "c" });
		});

		it("omits an absent feedback and comment", () => {
			const alt = orderingAlternative(
				{ lines: [[0, "a"]], feedback: undefined, comment: undefined },
				4,
			);
			expect(alt).toEqual({ lines: [[0, "a"]] });
			expect(Object.keys(alt)).toEqual(["lines"]);
		});
	});

	describe("joinPrefixedLines", () => {
		it("strips the prefix and joins with a space", () => {
			expect(joinPrefixedLines(["> a", "> b", ">c", "> "], ">")).toBe("a b c");
		});

		it("skips empty parts and trims each part", () => {
			expect(joinPrefixedLines(["! a", "!", "!  b  "], "!")).toBe("a b");
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

	describe("through parseQuestionDocument", () => {
		it("a tab counts as four columns", () => {
			expect(linesOf("[ordering]\n```\na\n\tb\n```\n")).toEqual([
				[0, "a"],
				[1, "b"],
			]);
		});

		it("a tab after spaces moves to column 4, not 6", () => {
			// Alone, indent 4 gives level 1. With a 6-column line (unit 2) the
			// tab line must be at column 4 (level 2), not 6 (level 3).
			expect(linesOf("[ordering]\n```\na\n  \tb\n```\n")).toEqual([
				[0, "a"],
				[1, "b"],
			]);
			expect(linesOf("[ordering]\n```\na\n  \tb\n      c\n```\n")).toEqual([
				[0, "a"],
				[2, "b"],
				[3, "c"],
			]);
		});

		it("the unit is inferred from a non-four-space indent", () => {
			expect(linesOf("[ordering]\n```\na\n  b\n      c\n```\n")).toEqual([
				[0, "a"],
				[1, "b"],
				[3, "c"],
			]);
		});

		it("the unit is 4 when a line is indented by 4 and another by 8", () => {
			expect(linesOf("[ordering]\n```\na\n    b\n        c\n```\n")).toEqual([
				[0, "a"],
				[1, "b"],
				[2, "c"],
			]);
		});

		it("the unit defaults to 4 when nothing is indented", () => {
			expect(linesOf("[ordering]\n```\na\nb\n```\n")).toEqual([
				[0, "a"],
				[0, "b"],
			]);
		});

		it("the unit is the GCD across main, extra, accept and reject blocks", () => {
			// Indents: main 8, extra 5, accept 5, reject 3 -> GCD 1.
			const source =
				`${STEM}[ordering]\n\`\`\`\na\n        b\n\`\`\`\n\n` +
				"## [extra]\n```\n     d\n```\n\n" +
				"## [accept]\n```\nb\n     a\n```\n\n" +
				"## [reject]\n```\n   e\n```\n";
			expect(parseQuestionDocument(source)).toEqual({
				stem: "Ordene.",
				type: "ordering",
				content: "code",
				lines: [
					[0, "a"],
					[8, "b"],
				],
				extra: [[5, "d"]],
				accept: [
					{
						lines: [
							[0, "b"],
							[5, "a"],
						],
					},
				],
				reject: [{ lines: [[3, "e"]] }],
			});
		});

		it("an accept block can change the unit set by the main block", () => {
			// Main: 4 and 8; accept: 6 -> GCD 2.
			const source =
				`${STEM}[ordering]\n\`\`\`\na\n    b\n        c\n\`\`\`\n\n` +
				"## [accept]\n```\na\n      b\n```\n";
			expect(parseQuestionDocument(source)).toEqual({
				stem: "Ordene.",
				type: "ordering",
				content: "code",
				lines: [
					[0, "a"],
					[2, "b"],
					[4, "c"],
				],
				accept: [
					{
						lines: [
							[0, "a"],
							[3, "b"],
						],
					},
				],
			});
		});

		it("an extra block can change the unit set by the main block", () => {
			expect(
				parseQuestionDocument(
					`${STEM}[ordering]\n\`\`\`\na\n    b\n        c\n\`\`\`\n\n` +
						"## [extra]\n```\n      d\n```\n",
				),
			).toEqual({
				stem: "Ordene.",
				type: "ordering",
				content: "code",
				lines: [
					[0, "a"],
					[2, "b"],
					[4, "c"],
				],
				extra: [[3, "d"]],
			});
		});

		it("a blank code line has level 0 and empty text", () => {
			expect(linesOf("[ordering]\n```\na\n\n    b\n```\n")).toEqual([
				[0, "a"],
				[0, ""],
				[1, "b"],
			]);
		});

		it("an empty fence gives no lines", () => {
			expect(linesOf("[ordering]\n```\n```\n")).toEqual([]);
		});

		it("a ul line keeps its raw markdown source verbatim", () => {
			expect(
				parseQuestionDocument(`${STEM}[ordering]\n* *alpha*\n* _alpha_\n`),
			).toEqual({
				stem: "Ordene.",
				type: "ordering",
				content: "text",
				lines: [
					[0, "*alpha*"],
					[0, "_alpha_"],
				],
			});
		});

		it("a ul keeps inline code and links verbatim", () => {
			expect(linesOf("[ordering]\n* `x` and [l](u)\n")).toEqual([
				[0, "`x` and [l](u)"],
			]);
		});

		it("a nested ul item is a deeper level", () => {
			expect(linesOf("[ordering]\n* a\n  * b\n* c\n")).toEqual([
				[0, "a"],
				[1, "b"],
				[0, "c"],
			]);
		});

		it("a fence infers content code, with its info string as highlight", () => {
			expect(
				parseQuestionDocument(
					`${STEM}[ordering]\n\`\`\`python\na\nb\n\`\`\`\n`,
				),
			).toEqual({
				stem: "Ordene.",
				type: "ordering",
				content: "code",
				highlight: "python",
				lines: [
					[0, "a"],
					[0, "b"],
				],
			});
		});

		it("feedback and comment blocks of an accept section, in either order", () => {
			const expected = {
				stem: "Ordene.",
				type: "ordering",
				content: "text",
				lines: [
					[0, "a"],
					[0, "b"],
				],
				accept: [
					{
						lines: [
							[0, "b"],
							[0, "a"],
						],
						feedback: "f1",
						comment: "c1",
					},
				],
			};
			const head = `${STEM}[ordering]\n* a\n* b\n\n## [accept]\n\n`;
			expect(
				parseQuestionDocument(`${head}> f1\n\n! c1\n\n* b\n* a\n`),
			).toEqual(expected);
			expect(
				parseQuestionDocument(`${head}! c1\n\n> f1\n\n* b\n* a\n`),
			).toEqual(expected);
		});

		it("a multi-line feedback block is joined with spaces", () => {
			expect(
				parseQuestionDocument(
					`${STEM}[ordering]\n* a\n* b\n\n## [accept]\n\n> f1\n> more\n\n* b\n* a\n`,
				),
			).toEqual({
				stem: "Ordene.",
				type: "ordering",
				content: "text",
				lines: [
					[0, "a"],
					[0, "b"],
				],
				accept: [
					{
						lines: [
							[0, "b"],
							[0, "a"],
						],
						feedback: "f1 more",
					},
				],
			});
		});
	});
});

//
// Batch 1, criterion 3: frontmatter.
//

describe("batch 1: ordering frontmatter", () => {
	const listBody = "[ordering]\n* a\n* b\n";
	const twoLines = [
		[0, "a"],
		[0, "b"],
	];

	it("declared content and highlight override the body", () => {
		// A `ul` body infers `content: text` and no highlight; the declared
		// values win, and the lines still come from the `ul`.
		const source = `---\ncontent: code\nhighlight: python\n---\n\n${STEM}${listBody}`;
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Ordene.",
			type: "ordering",
			content: "code",
			highlight: "python",
			lines: twoLines,
		});
	});

	it("a declared content text and highlight win over a fence", () => {
		const source = `---\ncontent: text\nhighlight: c\n---\n\n${STEM}[ordering]\n\`\`\`python\na\nb\n\`\`\`\n`;
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Ordene.",
			type: "ordering",
			content: "text",
			highlight: "c",
			lines: twoLines,
		});
	});

	it("indentation and unmatched are copied", () => {
		const source = `---\nindentation: lenient\nunmatched: incorrect\n---\n\n${STEM}${listBody}`;
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Ordene.",
			type: "ordering",
			content: "text",
			indentation: "lenient",
			unmatched: "incorrect",
			lines: twoLines,
		});
	});

	it("normalizations as a bare string becomes a one-item list", () => {
		const source = `---\nnormalizations: dedent\n---\n\n${STEM}${listBody}`;
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Ordene.",
			type: "ordering",
			content: "text",
			normalizations: ["dedent"],
			lines: twoLines,
		});
	});

	it("normalizations as a list stays a list", () => {
		const source = `---\nnormalizations:\n  - dedent\n  - skip-blanks\n---\n\n${STEM}${listBody}`;
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Ordene.",
			type: "ordering",
			content: "text",
			normalizations: ["dedent", "skip-blanks"],
			lines: twoLines,
		});
	});
});

//
// Batch 2, criterion 4: error paths. Every failure is a plain `ParseError`
// (not a subclass) with the reference message.
//

describe("batch 2: ordering errors", () => {
	const NO_BLOCK =
		"an [ordering] block must be followed by a code block or a list";
	const AT_MOST_ONE_EXTRA = "a question defines at most one [extra] section";
	const OBSERVATIONS =
		"an accept/reject section carries at most one feedback and one comment block, and they must not interleave";

	function parseError(source: string): unknown {
		try {
			parseQuestionDocument(source);
		} catch (error) {
			return error;
		}
		return undefined;
	}

	function expectParseError(source: string, message: string): void {
		const error = parseError(source) as Error;
		expect(error).toBeInstanceOf(ParseError);
		expect(error.constructor).toBe(ParseError);
		expect(error.message).toBe(message);
	}

	describe("the [ordering] tag needs a code block or a list", () => {
		it.each([
			[
				"a paragraph follows",
				`${STEM}[ordering]\n\nJust a paragraph, not a block.\n`,
			],
			["a blank line ends the document", `${STEM}[ordering]\n\n`],
			["a section heading follows", `${STEM}[ordering]\n\n## [extra]\n* c\n`],
		])("%s", (_label, source) => {
			expectParseError(source, NO_BLOCK);
		});
	});

	describe("a section must use the same content kind as [ordering]", () => {
		it.each([
			["extra", "[extra]"],
			["accept", "[accept]"],
			["reject", "[reject]"],
		])("a ul %s after a fence", (_name, tag) => {
			expectParseError(
				`${STEM}[ordering]\n\`\`\`\na\nb\n\`\`\`\n\n## ${tag}\n* b\n* a\n`,
				`${tag} must use the same content type as [ordering]`,
			);
		});

		it.each([
			["extra", "[extra]"],
			["accept", "[accept]"],
			["reject", "[reject]"],
		])("a fence %s after a ul", (_name, tag) => {
			expectParseError(
				`${STEM}[ordering]\n* a\n* b\n\n## ${tag}\n\`\`\`\nb\na\n\`\`\`\n`,
				`${tag} must use the same content type as [ordering]`,
			);
		});
	});

	it("two [extra] sections", () => {
		expectParseError(
			`${STEM}[ordering]\n* a\n* b\n\n## [extra]\n* c\n\n## [extra]\n* d\n`,
			AT_MOST_ONE_EXTRA,
		);
	});

	describe("accept/reject observations", () => {
		const head = (section: string): string =>
			`${STEM}[ordering]\n* a\n* b\n\n## [${section}]\n\n`;

		it.each([
			"accept",
			"reject",
		])("a second feedback block in a %s section", (section) => {
			expectParseError(
				`${head(section)}> f1\n\n> f2\n\n* b\n* a\n`,
				OBSERVATIONS,
			);
		});

		it.each([
			"accept",
			"reject",
		])("a second comment block in a %s section", (section) => {
			expectParseError(
				`${head(section)}! c1\n\n! c2\n\n* b\n* a\n`,
				OBSERVATIONS,
			);
		});

		it("a feedback block after a feedback and a comment block", () => {
			expectParseError(
				`${head("reject")}> f1\n\n! c\n\n> f2\n\n* b\n* a\n`,
				OBSERVATIONS,
			);
		});
	});
});
