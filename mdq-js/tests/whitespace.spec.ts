/**
 * Grammar whitespace -- `docs/handoffs/11-grammar-whitespace.md`, cycle F3.6.
 *
 * `ws` is `[ \t]`, `nl` is `\r\n|\r|\n`. Every other Unicode space is text
 * where the grammar has `ws`. A leading U+FEFF is removed; U+FEFF elsewhere
 * is text. Tag brackets have no inner spaces. The unit pattern of the schema
 * excludes `UNICODE_SPACE` and the brackets.
 *
 * Cases follow `mdq-py/tests/test_whitespace.py` (the lint tests are out of
 * scope). Every expected value comes from mdq-py, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._parser import parse_question
 *   print(parse_question('Qual a capital?\n\n[short-answer]:\u00a0Brasília\n'))
 *   "
 *
 * An error test asserts the exact class and the Python message. A
 * `MissingField` error is asserted through its `field`, since the Python
 * message is generic.
 *
 * In a template, `{c}` stands for the character under test.
 */

import { join } from "node:path";
import {
	isExam,
	MissingFieldError,
	ParseError,
	parseExamDocument,
	parseQuestionDocument,
	validateDocument,
} from "@mdq";
import { describe, expect, it } from "vitest";
import { rstrip, strip } from "../src/parser/text.js";
import { EXAMPLES_ROOT, loadDocument } from "./corpus.js";

const CHARS: Record<string, string> = {
	nbsp: "\u00a0",
	ideographic: "\u3000",
	ls: "\u2028",
	nel: "\u0085",
	bom: "\ufeff",
};

type Expected =
	| { ok: unknown }
	| { error: "ParseError"; message: string }
	| { error: "MissingFieldError"; field: string };

type Kind = "question" | "exam";

function expectOutcome(kind: Kind, source: string, expected: Expected): void {
	const parse = kind === "exam" ? parseExamDocument : parseQuestionDocument;
	if ("ok" in expected) {
		expect(parse(source)).toEqual(expected.ok);
		return;
	}
	let error: unknown;
	try {
		parse(source);
	} catch (e) {
		error = e;
	}
	if (expected.error === "MissingFieldError") {
		expect(error).toBeInstanceOf(MissingFieldError);
		expect((error as MissingFieldError).field).toBe(expected.field);
		return;
	}
	expect(error).toBeInstanceOf(ParseError);
	expect((error as Error).constructor).toBe(ParseError);
	expect((error as Error).message).toBe(expected.message);
}

/** A template case run once per character. */
function perChar(
	title: string,
	kind: Kind,
	template: string,
	rows: Array<[string, Expected]>,
): void {
	describe(title, () => {
		it.each(rows)("%s", (name, expected) => {
			expectOutcome(
				kind,
				template.replaceAll("{c}", CHARS[name] as string),
				expected,
			);
		});
	});
}

/** A literal case. */
function literalCases(
	title: string,
	kind: Kind,
	rows: Array<[string, string, Expected]>,
): void {
	describe(title, () => {
		it.each(rows)("%s", (_label, source, expected) => {
			expectOutcome(kind, source, expected);
		});
	});
}

describe("batch 1: strip chars, BOM and grammar patterns (criteria 1-2)", () => {
	describe("strip and rstrip with chars", () => {
		it.each([
			["\u00a0 \t x \t\u00a0", "\u00a0 \t x \t\u00a0"],
			["\ufeff\tx\ufeff", "\ufeff\tx\ufeff"],
			["\u3000x\u3000 ", "\u3000x\u3000"],
			["\u2028\nx\u0085 ", "\u2028\nx\u0085"],
			[" \t x\n\t ", "x\n"],
			["  \t ", ""],
			["", ""],
			["x", "x"],
			["\u0085\u00a0 x", "\u0085\u00a0 x"],
			["\r\nx\r\n", "\r\nx\r\n"],
			[" \u2028 x \u3000 ", "\u2028 x \u3000"],
		])("strip({}, ' \\t') keeps Unicode spaces: %j", (text, expected) => {
			expect(strip(text, " \t")).toBe(expected);
		});

		it.each([
			["\u00a0 \t x \t\u00a0", "\u00a0 \t x \t\u00a0"],
			["\ufeff\tx\ufeff", "\ufeff\tx\ufeff"],
			["\u3000x\u3000 ", "\u3000x\u3000"],
			["\u2028\nx\u0085 ", "\u2028\nx\u0085"],
			[" \t x\n\t ", " \t x\n"],
			["  \t ", ""],
			["", ""],
			["x", "x"],
			["\u0085\u00a0 x", "\u0085\u00a0 x"],
			["\r\nx\r\n", "\r\nx\r\n"],
			[" \u2028 x \u3000 ", " \u2028 x \u3000"],
		])("rstrip({}, ' \\t') keeps Unicode spaces: %j", (text, expected) => {
			expect(rstrip(text, " \t")).toBe(expected);
		});

		it.each([
			["xxaxx", "x", "a", "xxa"],
			["**a**", "*", "a", "**a"],
			["]a]", "]", "a", "]a"],
			["\\a\\", "\\", "a", "\\a"],
			["^a^", "^", "a", "^a"],
			["-a-", "-", "a", "-a"],
			["abcba", "ab", "c", "abc"],
			["abc", "", "abc", "abc"],
			["  a  ", "", "  a  ", "  a  "],
			["[a]", "[]", "a", "[a"],
			[".a.", ".", "a", ".a"],
		])("removes only the characters of chars from %j (chars %j)", (text, chars, expectedStrip, expectedRstrip) => {
			expect(strip(text, chars)).toBe(expectedStrip);
			expect(rstrip(text, chars)).toBe(expectedRstrip);
		});

		it.each([
			["\u001c b \u3000", "b", "\u001c b"],
			["\ufeffa\u0085", "\ufeffa", "\ufeffa"],
			["\u00a0x\u00a0", "x", "\u00a0x"],
			[" \tx\t ", "x", " \tx"],
		])("without chars keeps Python's default whitespace: %j", (text, expectedStrip, expectedRstrip) => {
			expect(strip(text)).toBe(expectedStrip);
			expect(rstrip(text)).toBe(expectedRstrip);
		});
	});

	perChar(
		"after a short-answer tag colon",
		"question",
		"Qual a capital do Brasil?\n\n[short-answer]:{c}Brasília\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u00a0Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u3000Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u2028Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u0085Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\ufeffBrasília"],
						type: "short-answer",
					},
				},
			],
		],
	);

	perChar(
		"after a short-answer tag colon and a space",
		"question",
		"Qual a capital do Brasil?\n\n[short-answer]:{c} Brasília\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u00a0 Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u3000 Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u2028 Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\u0085 Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["\ufeff Brasília"],
						type: "short-answer",
					},
				},
			],
		],
	);

	perChar(
		"a trailing character in a short answer",
		"question",
		"Qual a capital do Brasil?\n\n[short-answer]: Brasília{c}\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["Brasília\u00a0"],
						type: "short-answer",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["Brasília\u3000"],
						type: "short-answer",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["Brasília\u2028"],
						type: "short-answer",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["Brasília\u0085"],
						type: "short-answer",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						oneOf: ["Brasília\ufeff"],
						type: "short-answer",
					},
				},
			],
		],
	);

	perChar(
		"after a blank definition colon",
		"question",
		"A capital é [^cap].\n\n[^cap/short-answer]:{c}Brasília\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["\u00a0Brasília"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["\u3000Brasília"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["\u2028Brasília"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["\u0085Brasília"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["\ufeffBrasília"] },
						],
						type: "fill-in",
					},
				},
			],
		],
	);

	perChar(
		"after a numeric blank definition colon",
		"question",
		"A capital tem [^n] milhões.\n\n[^n/numeric]:{c}3\n",
		[
			[
				"nbsp",
				{ error: "ParseError", message: "malformed numeric body: '\\xa03'" },
			],
			[
				"ideographic",
				{ error: "ParseError", message: "malformed numeric body: '\\u30003'" },
			],
			[
				"ls",
				{ error: "ParseError", message: "malformed numeric body: '\\u20283'" },
			],
			[
				"nel",
				{ error: "ParseError", message: "malformed numeric body: '\\x853'" },
			],
			[
				"bom",
				{ error: "ParseError", message: "malformed numeric body: '\\ufeff3'" },
			],
		],
	);

	perChar(
		"a character before the short-answer tag",
		"question",
		"Qual a capital do Brasil?\n\n{c}[short-answer]: Brasília\n",
		[
			["nbsp", { error: "MissingFieldError", field: "body" }],
			["ideographic", { error: "MissingFieldError", field: "body" }],
			["ls", { error: "MissingFieldError", field: "body" }],
			["nel", { error: "MissingFieldError", field: "body" }],
			["bom", { error: "MissingFieldError", field: "body" }],
		],
	);

	perChar(
		"a character before a blank definition",
		"question",
		"A capital é [^cap].\n\n{c}[^cap/short-answer]: Brasília\n",
		[
			["nbsp", { error: "MissingFieldError", field: "body" }],
			["ideographic", { error: "MissingFieldError", field: "body" }],
			["ls", { error: "MissingFieldError", field: "body" }],
			["nel", { error: "MissingFieldError", field: "body" }],
			["bom", { error: "MissingFieldError", field: "body" }],
		],
	);

	perChar(
		"after the numeric tag colon",
		"question",
		"Quanto mede o Rio Amazonas?\n\n[numeric]:{c}6400\n",
		[
			[
				"nbsp",
				{ error: "ParseError", message: "malformed numeric body: '\\xa06400'" },
			],
			[
				"ideographic",
				{
					error: "ParseError",
					message: "malformed numeric body: '\\u30006400'",
				},
			],
			[
				"ls",
				{
					error: "ParseError",
					message: "malformed numeric body: '\\u20286400'",
				},
			],
			[
				"nel",
				{ error: "ParseError", message: "malformed numeric body: '\\x856400'" },
			],
			[
				"bom",
				{
					error: "ParseError",
					message: "malformed numeric body: '\\ufeff6400'",
				},
			],
		],
	);

	perChar(
		"before a numeric tolerance",
		"question",
		"Quanto mede o Rio Amazonas?\n\n[numeric]: 6400{c}+- 1\n",
		[
			[
				"nbsp",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\xa0+- 1'",
				},
			],
			[
				"ideographic",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\u3000+- 1'",
				},
			],
			[
				"ls",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\u2028+- 1'",
				},
			],
			[
				"nel",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\x85+- 1'",
				},
			],
			[
				"bom",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\ufeff+- 1'",
				},
			],
		],
	);

	perChar(
		"after a numeric tolerance sign",
		"question",
		"Quanto mede o Rio Amazonas?\n\n[numeric]: 6400 +-{c}1\n",
		[
			[
				"nbsp",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400 +-\\xa01'",
				},
			],
			[
				"ideographic",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400 +-\\u30001'",
				},
			],
			[
				"ls",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400 +-\\u20281'",
				},
			],
			[
				"nel",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400 +-\\x851'",
				},
			],
			[
				"bom",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400 +-\\ufeff1'",
				},
			],
		],
	);

	perChar(
		"a trailing character in a numeric answer",
		"question",
		"Quanto mede o Rio Amazonas?\n\n[numeric]: 6400{c}\n",
		[
			[
				"nbsp",
				{ error: "ParseError", message: "malformed numeric body: '6400\\xa0'" },
			],
			[
				"ideographic",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\u3000'",
				},
			],
			[
				"ls",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\u2028'",
				},
			],
			[
				"nel",
				{ error: "ParseError", message: "malformed numeric body: '6400\\x85'" },
			],
			[
				"bom",
				{
					error: "ParseError",
					message: "malformed numeric body: '6400\\ufeff'",
				},
			],
		],
	);

	perChar(
		"after a choice marker",
		"question",
		"...\n\n* [*]{c}Ipê\n* [ ] Jatobá\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u00a0Ipê", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u3000Ipê", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u2028Ipê", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u0085Ipê", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\ufeffIpê", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
		],
	);

	perChar(
		"as the checkbox value",
		"question",
		"...\n\n* [{c}] Ipê\n* [x] Jatobá\n* [X] Buriti\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê" },
							{ text: "Jatobá", correct: true },
							{ text: "Buriti", correct: true },
						],
						type: "multiple-selection",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê" },
							{ text: "Jatobá", correct: true },
							{ text: "Buriti", correct: true },
						],
						type: "multiple-selection",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê" },
							{ text: "Jatobá", correct: true },
							{ text: "Buriti", correct: true },
						],
						type: "multiple-selection",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê" },
							{ text: "Jatobá", correct: true },
							{ text: "Buriti", correct: true },
						],
						type: "multiple-selection",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê" },
							{ text: "Jatobá", correct: true },
							{ text: "Buriti", correct: true },
						],
						type: "multiple-selection",
					},
				},
			],
		],
	);

	perChar(
		"between the list marker and the checkbox",
		"question",
		"...\n\n*{c}[*] Ipê\n* [ ] Jatobá\n",
		[
			[
				"nbsp",
				{
					ok: {
						preamble: "...",
						stem: "*\u00a0[*] Ipê",
						choices: [{ text: "Jatobá" }],
						type: "multiple-selection",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						preamble: "...",
						stem: "*\u3000[*] Ipê",
						choices: [{ text: "Jatobá" }],
						type: "multiple-selection",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						preamble: "...",
						stem: "*\u2028[*] Ipê",
						choices: [{ text: "Jatobá" }],
						type: "multiple-selection",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						preamble: "...",
						stem: "*\u0085[*] Ipê",
						choices: [{ text: "Jatobá" }],
						type: "multiple-selection",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						preamble: "...",
						stem: "*\ufeff[*] Ipê",
						choices: [{ text: "Jatobá" }],
						type: "multiple-selection",
					},
				},
			],
		],
	);

	perChar(
		"after a choice id",
		"question",
		"...\n\n* [*] [ipe]{c}Ipê\n* [ ] Jatobá\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u00a0Ipê", id: "ipe", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u3000Ipê", id: "ipe", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u2028Ipê", id: "ipe", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\u0085Ipê", id: "ipe", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "\ufeffIpê", id: "ipe", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
		],
	);

	perChar(
		"a trailing character in a choice",
		"question",
		"...\n\n* [*] Ipê{c}\n* [ ] Jatobá\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u00a0", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u3000", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u2028", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u0085", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\ufeff", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
		],
	);

	perChar(
		"after a stem slug",
		"question",
		"[Q1]{c}Qual é a maior árvore da Amazônia?\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						id: "Q1",
						stem: "\u00a0Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						id: "Q1",
						stem: "\u3000Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						id: "Q1",
						stem: "\u2028Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						id: "Q1",
						stem: "\u0085Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						id: "Q1",
						stem: "\ufeffQual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
		],
	);

	perChar(
		"before a stem slug",
		"question",
		"{c}[Q1] Qual é a maior árvore da Amazônia?\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "\u00a0[Q1] Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "\u3000[Q1] Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "\u2028[Q1] Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "\u0085[Q1] Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						id: "Q1",
						stem: "Qual é a maior árvore da Amazônia?",
						type: "essay",
					},
				},
			],
		],
	);

	perChar(
		"starting a pattern line",
		"question",
		"Qual a capital do Brasil?\n\n[short-answer/accept]:\n* {c}/bras[íi]lia/i\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u00a0/bras[íi]lia/i"],
						type: "short-answer",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u3000/bras[íi]lia/i"],
						type: "short-answer",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u2028/bras[íi]lia/i"],
						type: "short-answer",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u0085/bras[íi]lia/i"],
						type: "short-answer",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\ufeff/bras[íi]lia/i"],
						type: "short-answer",
					},
				},
			],
		],
	);

	perChar(
		"starting a plain pattern line",
		"question",
		"Qual a capital do Brasil?\n\n[short-answer/accept]:\n* {c}Brasília\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u00a0Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u3000Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u2028Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\u0085Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "Qual a capital do Brasil?",
						accept: ["\ufeffBrasília"],
						type: "short-answer",
					},
				},
			],
		],
	);

	perChar(
		"after a pattern list marker",
		"question",
		"Qual a capital do Brasil?\n\n[short-answer/accept]:\n*{c}Brasília\n",
		[
			[
				"nbsp",
				{
					error: "ParseError",
					message: "[short-answer/accept] takes a list, not inline text",
				},
			],
			[
				"ideographic",
				{
					error: "ParseError",
					message: "[short-answer/accept] takes a list, not inline text",
				},
			],
			[
				"ls",
				{
					error: "ParseError",
					message: "[short-answer/accept] takes a list, not inline text",
				},
			],
			[
				"nel",
				{
					error: "ParseError",
					message: "[short-answer/accept] takes a list, not inline text",
				},
			],
			[
				"bom",
				{
					error: "ParseError",
					message: "[short-answer/accept] takes a list, not inline text",
				},
			],
		],
	);

	perChar(
		"inside a choice line",
		"question",
		"...\n\n* [*] Ipê{c}amarelo\n* [ ] Jatobá\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u00a0amarelo", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u3000amarelo", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u2028amarelo", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\u0085amarelo", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê\ufeffamarelo", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
		],
	);

	perChar(
		"inside an ordering item",
		"question",
		"Ordene as etapas.\n\n[ordering]\n\n* Semente{c}germina\n* Broto\n* Árvore\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "Ordene as etapas.",
						content: "text",
						lines: [
							[0, "Semente\u00a0germina"],
							[0, "Broto"],
							[0, "Árvore"],
						],
						type: "ordering",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "Ordene as etapas.",
						content: "text",
						lines: [
							[0, "Semente\u3000germina"],
							[0, "Broto"],
							[0, "Árvore"],
						],
						type: "ordering",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "Ordene as etapas.",
						content: "text",
						lines: [
							[0, "Semente\u2028germina"],
							[0, "Broto"],
							[0, "Árvore"],
						],
						type: "ordering",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "Ordene as etapas.",
						content: "text",
						lines: [
							[0, "Semente\u0085germina"],
							[0, "Broto"],
							[0, "Árvore"],
						],
						type: "ordering",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "Ordene as etapas.",
						content: "text",
						lines: [
							[0, "Semente\ufeffgermina"],
							[0, "Broto"],
							[0, "Árvore"],
						],
						type: "ordering",
					},
				},
			],
		],
	);

	perChar(
		"after an ordering item marker",
		"question",
		"Ordene as etapas.\n\n[ordering]\n\n*{c}Semente\n* Broto\n* Árvore\n",
		[
			[
				"nbsp",
				{
					error: "ParseError",
					message:
						"an [ordering] block must be followed by a code block or a list",
				},
			],
			[
				"ideographic",
				{
					error: "ParseError",
					message:
						"an [ordering] block must be followed by a code block or a list",
				},
			],
			[
				"ls",
				{
					error: "ParseError",
					message:
						"an [ordering] block must be followed by a code block or a list",
				},
			],
			[
				"nel",
				{
					error: "ParseError",
					message:
						"an [ordering] block must be followed by a code block or a list",
				},
			],
			[
				"bom",
				{
					error: "ParseError",
					message:
						"an [ordering] block must be followed by a code block or a list",
				},
			],
		],
	);

	perChar(
		"a Unicode space starting the stem",
		"question",
		"{c}Descreva o ipê.\n\n[essay]\n",
		[
			["nbsp", { ok: { stem: "\u00a0Descreva o ipê.", type: "essay" } }],
			["ideographic", { ok: { stem: "\u3000Descreva o ipê.", type: "essay" } }],
		],
	);

	perChar(
		"a leading byte order mark",
		"question",
		"{c}---\nid: ipe\n---\n\nDescreva o ipê.\n\n[essay]\n",
		[["bom", { ok: { id: "ipe", stem: "Descreva o ipê.", type: "essay" } }]],
	);

	perChar(
		"a leading byte order mark without frontmatter",
		"question",
		"{c}Descreva o ipê.\n\n[essay]\n",
		[["bom", { ok: { stem: "Descreva o ipê.", type: "essay" } }]],
	);

	perChar(
		"a byte order mark after the first line",
		"question",
		"Descreva o ipê.\n\n{c}[essay]\n",
		[["bom", { error: "MissingFieldError", field: "body" }]],
	);

	perChar(
		"before the essay tag colon",
		"question",
		"Descreva o ipê.\n\n[essay]{c}\n",
		[
			["nbsp", { error: "MissingFieldError", field: "body" }],
			["ideographic", { error: "MissingFieldError", field: "body" }],
			["ls", { error: "MissingFieldError", field: "body" }],
			["nel", { error: "MissingFieldError", field: "body" }],
			["bom", { error: "MissingFieldError", field: "body" }],
		],
	);

	perChar(
		"exam: a trailing character in the title",
		"exam",
		"# Prova{c}\n\nDescreva o ipê.\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						type: "exam",
						title: "Prova\u00a0",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						type: "exam",
						title: "Prova\u3000",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ls",
				{
					ok: {
						type: "exam",
						title: "Prova\u2028",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"nel",
				{
					ok: {
						type: "exam",
						title: "Prova\u0085",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"bom",
				{
					ok: {
						type: "exam",
						title: "Prova\ufeff",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
		],
	);

	perChar(
		"exam: a character after the title marker",
		"exam",
		"#{c}Prova\n\nDescreva o ipê.\n\n[essay]\n",
		[
			["nbsp", { error: "MissingFieldError", field: "title" }],
			["ideographic", { error: "MissingFieldError", field: "title" }],
			["ls", { error: "MissingFieldError", field: "title" }],
			["nel", { error: "MissingFieldError", field: "title" }],
			["bom", { error: "MissingFieldError", field: "title" }],
		],
	);

	perChar(
		"exam: a trailing character after a separator",
		"exam",
		"# Prova\n\nDescreva o ipê.\n\n[essay]\n\n==={c}\n\nDescreva a onça.\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n===\u00a0\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n===\u3000\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ls",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n===\u2028\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"nel",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n===\u0085\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"bom",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n===\ufeff\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
		],
	);

	perChar(
		"exam: a leading character before a separator",
		"exam",
		"# Prova\n\nDescreva o ipê.\n\n[essay]\n\n{c}===\n\nDescreva a onça.\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n\u00a0===\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n\u3000===\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ls",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n\u2028===\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"nel",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n\u0085===\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"bom",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"Descreva o ipê.\n\n[essay]\n\n\ufeff===\n\nDescreva a onça.\n\n[essay]",
						questions: [],
					},
				},
			],
		],
	);

	perChar(
		"exam: a trailing character after a frontmatter fence",
		"exam",
		"# Prova\n\n---{c}\nid: q1\n---\n\nDescreva o ipê.\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"---\u00a0\nid: q1\n---\n\nDescreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"---\u3000\nid: q1\n---\n\nDescreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ls",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"---\u2028\nid: q1\n---\n\nDescreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"nel",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"---\u0085\nid: q1\n---\n\nDescreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"bom",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions:
							"---\ufeff\nid: q1\n---\n\nDescreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
		],
	);

	perChar(
		"exam: after the title slug",
		"exam",
		"# [prova]{c}Prova\n\nDescreva o ipê.\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						type: "exam",
						id: "prova",
						title: "\u00a0Prova",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						type: "exam",
						id: "prova",
						title: "\u3000Prova",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"ls",
				{
					ok: {
						type: "exam",
						id: "prova",
						title: "\u2028Prova",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"nel",
				{
					ok: {
						type: "exam",
						id: "prova",
						title: "\u0085Prova",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
			[
				"bom",
				{
					ok: {
						type: "exam",
						id: "prova",
						title: "\ufeffProva",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
		],
	);

	perChar(
		"exam: a leading byte order mark",
		"exam",
		"{c}# Prova\n\nDescreva o ipê.\n\n[essay]\n",
		[
			[
				"bom",
				{
					ok: {
						type: "exam",
						title: "Prova",
						instructions: "Descreva o ipê.\n\n[essay]",
						questions: [],
					},
				},
			],
		],
	);

	perChar(
		"exam: a character before the title marker",
		"exam",
		"{c}# Prova\n\nDescreva o ipê.\n\n[essay]\n",
		[
			["nbsp", { error: "MissingFieldError", field: "title" }],
			["ideographic", { error: "MissingFieldError", field: "title" }],
			["ls", { error: "MissingFieldError", field: "title" }],
			["nel", { error: "MissingFieldError", field: "title" }],
		],
	);

	describe("isExam", () => {
		it.each([
			["\ufeff# Prova\n\nDescreva o ipê.\n\n[essay]\n", true],
			["Qual a capital?\u0085# Título\n\n[essay]\n", false],
			["\u00a0# Prova\n\n[essay]\n", false],
			["#\u00a0Prova\n\n[essay]\n", false],
			["#\tProva\n\n[essay]\n", true],
			["# Prova\n\n[essay]\n", true],
			["\u3000# Prova\n\n[essay]\n", false],
			["Descreva o ipê.\n\n[essay]\n", false],
		])("%j", (source, expected) => {
			expect(isExam(source)).toBe(expected);
		});
	});
});

describe("batch 2: raw text, tag brackets, unit pattern and Python parser cases (criteria 3-4)", () => {
	perChar(
		"in a unit",
		"question",
		"Quanto mede o Rio Amazonas?\n\n[numeric(k{c}m)]: 6400\n",
		[
			["nbsp", { error: "MissingFieldError", field: "body" }],
			["ideographic", { error: "MissingFieldError", field: "body" }],
			["ls", { error: "MissingFieldError", field: "body" }],
			["nel", { error: "MissingFieldError", field: "body" }],
			[
				"bom",
				{
					ok: {
						stem: "Quanto mede o Rio Amazonas?",
						answer: 6400,
						unit: "k\ufeffm",
						domain: "integer",
						type: "numeric",
					},
				},
			],
		],
	);

	perChar(
		"in a blank unit",
		"question",
		"A capital tem [^n] km.\n\n[^n/numeric(k{c}m)]: 6400\n",
		[
			[
				"nbsp",
				{
					error: "ParseError",
					message:
						"unrecognized blank definition: '[^n/numeric(k\\xa0m)]: 6400'",
				},
			],
			[
				"ideographic",
				{
					error: "ParseError",
					message:
						"unrecognized blank definition: '[^n/numeric(k\\u3000m)]: 6400'",
				},
			],
			[
				"ls",
				{
					error: "ParseError",
					message:
						"unrecognized blank definition: '[^n/numeric(k\\u2028m)]: 6400'",
				},
			],
			[
				"nel",
				{
					error: "ParseError",
					message:
						"unrecognized blank definition: '[^n/numeric(k\\x85m)]: 6400'",
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "A capital tem [^n] km.",
						blanks: [
							{
								id: "n",
								type: "numeric",
								answer: 6400,
								unit: "k\ufeffm",
								domain: "integer",
							},
						],
						type: "fill-in",
					},
				},
			],
		],
	);

	perChar(
		"tag: leading character",
		"question",
		"Qual a capital do Brasil?\n\n{c}[short-answer]: Brasília\n",
		[
			["nbsp", { error: "MissingFieldError", field: "body" }],
			["ideographic", { error: "MissingFieldError", field: "body" }],
			["ls", { error: "MissingFieldError", field: "body" }],
			["nel", { error: "MissingFieldError", field: "body" }],
			["bom", { error: "MissingFieldError", field: "body" }],
		],
	);

	perChar(
		"a trailing character on a blank definition",
		"question",
		"A capital é [^cap].\n\n[^cap/short-answer]: Brasília{c}\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["Brasília\u00a0"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["Brasília\u3000"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"ls",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["Brasília\u2028"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"nel",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["Brasília\u0085"] },
						],
						type: "fill-in",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "A capital é [^cap].",
						blanks: [
							{ id: "cap", type: "short-answer", oneOf: ["Brasília\ufeff"] },
						],
						type: "fill-in",
					},
				},
			],
		],
	);

	perChar(
		"a trimmed trailing character on the stem",
		"question",
		"Qual a capital?{c}\n\n[short-answer]: Brasília\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "Qual a capital?\u00a0",
						oneOf: ["Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "Qual a capital?\u3000",
						oneOf: ["Brasília"],
						type: "short-answer",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "Qual a capital?\ufeff",
						oneOf: ["Brasília"],
						type: "short-answer",
					},
				},
			],
		],
	);

	perChar(
		"a trimmed trailing character after the tag line",
		"question",
		"Qual a capital do Brasil?\n\n[essay]{c}\n",
		[
			["nbsp", { error: "MissingFieldError", field: "body" }],
			["ideographic", { error: "MissingFieldError", field: "body" }],
			["ls", { error: "MissingFieldError", field: "body" }],
			["nel", { error: "MissingFieldError", field: "body" }],
			["bom", { error: "MissingFieldError", field: "body" }],
		],
	);

	perChar(
		"a leading character in a fill-in stem",
		"question",
		"{c}A capital é [^cap].\n\n[^cap/short-answer]: Brasília\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "\u00a0A capital é [^cap].",
						blanks: [{ id: "cap", type: "short-answer", oneOf: ["Brasília"] }],
						type: "fill-in",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "\u3000A capital é [^cap].",
						blanks: [{ id: "cap", type: "short-answer", oneOf: ["Brasília"] }],
						type: "fill-in",
					},
				},
			],
		],
	);

	perChar(
		"a leading character in the paragraph after the stem",
		"question",
		"Qual a capital?\n\n{c}Explique.\n\n[essay]\n",
		[
			[
				"nbsp",
				{
					ok: {
						preamble: "Qual a capital?",
						stem: "\u00a0Explique.",
						type: "essay",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						preamble: "Qual a capital?",
						stem: "\u3000Explique.",
						type: "essay",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						preamble: "Qual a capital?",
						stem: "\ufeffExplique.",
						type: "essay",
					},
				},
			],
		],
	);

	perChar(
		"a leading character on a choice paragraph",
		"question",
		"...\n\n* [*] Ipê\n\n  {c}Árvore símbolo.\n* [ ] Jatobá\n",
		[
			[
				"nbsp",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê \u00a0Árvore símbolo.", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"ideographic",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê \u3000Árvore símbolo.", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
			[
				"bom",
				{
					ok: {
						stem: "...",
						choices: [
							{ text: "Ipê \ufeffÁrvore símbolo.", score: 1 },
							{ text: "Jatobá", score: 0 },
						],
						type: "multiple-choice",
					},
				},
			],
		],
	);

	literalCases("plain tags", "question", [
		[
			"inner space after the opening bracket",
			"Qual a capital do Brasil?\n\n[ short-answer]: Brasília\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"inner space before the closing bracket",
			"Qual a capital do Brasil?\n\n[short-answer ]: Brasília\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"inner spaces on both sides",
			"Qual a capital do Brasil?\n\n[ short-answer ]: Brasília\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"space before the variant slash",
			"Qual a capital do Brasil?\n\n[short-answer /accept]: Brasília\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"space after the variant slash",
			"Qual a capital do Brasil?\n\n[short-answer/ accept]: Brasília\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"inner tab",
			"Qual a capital do Brasil?\n\n[\tshort-answer]: Brasília\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"a space before the colon is allowed",
			"Qual a capital do Brasil?\n\n[short-answer] : Brasília\n",
			{
				ok: {
					stem: "Qual a capital do Brasil?",
					oneOf: ["Brasília"],
					type: "short-answer",
				},
			},
		],
		[
			"a tab before the colon is allowed",
			"Qual a capital do Brasil?\n\n[short-answer]\t: Brasília\n",
			{
				ok: {
					stem: "Qual a capital do Brasil?",
					oneOf: ["Brasília"],
					type: "short-answer",
				},
			},
		],
		[
			"spaces after the colon",
			"Qual a capital do Brasil?\n\n[short-answer]:   Brasília\n",
			{
				ok: {
					stem: "Qual a capital do Brasil?",
					oneOf: ["Brasília"],
					type: "short-answer",
				},
			},
		],
		[
			"tabs after the colon",
			"Qual a capital do Brasil?\n\n[short-answer]:\t\tBrasília\n",
			{
				ok: {
					stem: "Qual a capital do Brasil?",
					oneOf: ["Brasília"],
					type: "short-answer",
				},
			},
		],
		[
			"mixed spaces and tabs after the colon",
			"Qual a capital do Brasil?\n\n[short-answer]: \t \tBrasília\n",
			{
				ok: {
					stem: "Qual a capital do Brasil?",
					oneOf: ["Brasília"],
					type: "short-answer",
				},
			},
		],
		[
			"a tab-only numeric spacing",
			"Quanto mede?\n\n[numeric(km)]:\t6400\t+-\t5%\n",
			{
				ok: {
					stem: "Quanto mede?",
					answer: 6400,
					unit: "km",
					domain: "integer",
					tolerance: { relative: 0.05 },
					type: "numeric",
				},
			},
		],
		[
			"a numeric tag with an inner space",
			"Quanto mede?\n\n[ numeric ]: 6400\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"a blank definition with an inner space",
			"A capital é [^cap].\n\n[ ^cap/short-answer ]: Brasília\n",
			{ error: "MissingFieldError", field: "body" },
		],
		[
			"a tab-indented choice list",
			"...\n\n*\t[*]\tIpê\n*\t[ ]\tJatobá\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"a tab after the slug prefix",
			"[Q1]\tQual é a maior árvore da Amazônia?\n\n[essay]\n",
			{
				ok: {
					id: "Q1",
					stem: "Qual é a maior árvore da Amazônia?",
					type: "essay",
				},
			},
		],
		[
			"the unit accepts non-space punctuation",
			"Quanto mede?\n\n[numeric(km/h)]: 6400\n",
			{
				ok: {
					stem: "Quanto mede?",
					answer: 6400,
					unit: "km/h",
					domain: "integer",
					type: "numeric",
				},
			},
		],
		[
			"the unit accepts a zero-width space",
			"Quanto mede?\n\n[numeric(k\u200bm)]: 6400\n",
			{
				ok: {
					stem: "Quanto mede?",
					answer: 6400,
					unit: "k\u200bm",
					domain: "integer",
					type: "numeric",
				},
			},
		],
		[
			"the unit accepts a soft hyphen",
			"Quanto mede?\n\n[numeric(k\u00adm)]: 6400\n",
			{
				ok: {
					stem: "Quanto mede?",
					answer: 6400,
					unit: "k\u00adm",
					domain: "integer",
					type: "numeric",
				},
			},
		],
		[
			"a tab-indented ordering",
			"Ordene.\n\n[ordering]\n\n*\tSemente\n*\tBroto\n*\tÁrvore\n",
			{
				ok: {
					stem: "Ordene.",
					content: "text",
					lines: [
						[0, "Semente"],
						[0, "Broto"],
						[0, "Árvore"],
					],
					type: "ordering",
				},
			},
		],
		[
			"line endings CRLF",
			"...\r\n\r\n* [*] Ipê\r\n* [ ] Jatobá\r\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"line endings CR",
			"...\r\r* [*] Ipê\r* [ ] Jatobá\r",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"frontmatter blank lines before the comment",
			"---\n\n  \n# Ipê\nid: ipe\n---\n\nDescreva.\n\n[essay]\n",
			{ ok: { comment: "Ipê", id: "ipe", stem: "Descreva.", type: "essay" } },
		],
	]);

	literalCases("plain tags (exam)", "exam", [
		[
			"exam: tab after the title marker",
			"#\tProva\n\nDescreva o ipê.\n\n[essay]\n",
			{
				ok: {
					type: "exam",
					title: "Prova",
					instructions: "Descreva o ipê.\n\n[essay]",
					questions: [],
				},
			},
		],
		[
			"exam: spaces after the separator",
			"# Prova\n\nDescreva o ipê.\n\n[essay]\n\n===  \n\nDescreva a onça.\n\n[essay]\n",
			{
				ok: {
					type: "exam",
					title: "Prova",
					instructions: "Descreva o ipê.\n\n[essay]",
					questions: [{ stem: "Descreva a onça.", type: "essay" }],
				},
			},
		],
		[
			"exam: tab after the separator",
			"# Prova\n\nDescreva o ipê.\n\n[essay]\n\n===\t\n\nDescreva a onça.\n\n[essay]\n",
			{
				ok: {
					type: "exam",
					title: "Prova",
					instructions: "Descreva o ipê.\n\n[essay]",
					questions: [{ stem: "Descreva a onça.", type: "essay" }],
				},
			},
		],
	]);

	literalCases("other line separators are text", "question", [
		[
			"nel",
			"...\n\n* [*] Ipê\u0085amarelo\n* [ ] Jatobá\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê\u0085amarelo", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"ls",
			"...\n\n* [*] Ipê\u2028amarelo\n* [ ] Jatobá\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê\u2028amarelo", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"ps",
			"...\n\n* [*] Ipê\u2029amarelo\n* [ ] Jatobá\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê\u2029amarelo", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"vt",
			"...\n\n* [*] Ipê\u000bamarelo\n* [ ] Jatobá\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê\u000bamarelo", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"ff",
			"...\n\n* [*] Ipê\u000camarelo\n* [ ] Jatobá\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê\u000camarelo", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
		[
			"fs",
			"...\n\n* [*] Ipê\u001camarelo\n* [ ] Jatobá\n",
			{
				ok: {
					stem: "...",
					choices: [
						{ text: "Ipê\u001camarelo", score: 1 },
						{ text: "Jatobá", score: 0 },
					],
					type: "multiple-choice",
				},
			},
		],
	]);

	describe("the unit pattern of the schema", () => {
		const UNITS: Array<[string, boolean]> = [
			["km", true],
			["m/s", true],
			["km/h", true],
			["k\u00adm", true],
			["k\u200bm", true],
			["k\ufeffm", true],
			["k\u00a0m", false],
			["k\u3000m", false],
			["k\u2028m", false],
			["k\u0085m", false],
			["k m", false],
			["k\tm", false],
			["k\u2003m", false],
			["k\u202fm", false],
			["k\u1680m", false],
			["k\u205fm", false],
			["k\u2029m", false],
			["k\u2009m", false],
			["k(m", false],
			["k)m", false],
			["k[m", false],
			["k]m", false],
			["", false],
		];

		it.each(
			UNITS,
		)("a numeric question with unit %j is valid: %s", (unit, valid) => {
			const document = loadDocument(
				join(EXAMPLES_ROOT, "valid", "numeric", "integer.yaml"),
			) as Record<string, unknown>;
			document.unit = unit;

			expect(validateDocument(document).success).toBe(valid);
		});

		it.each(
			UNITS,
		)("a numeric blank with unit %j is valid: %s", (unit, valid) => {
			const document = loadDocument(
				join(EXAMPLES_ROOT, "valid", "fill-in", "numeric-unit.yaml"),
			) as { blanks: Array<{ id: string; unit?: string }> };
			const blank = document.blanks.find((b) => b.id === "length");
			if (!blank) {
				throw new Error("fixture no longer has a 'length' numeric blank");
			}
			blank.unit = unit;

			expect(validateDocument(document).success).toBe(valid);
		});
	});
});
