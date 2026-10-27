/**
 * Unicode whitespace where the JavaScript runtime differs from Python:
 * `strip`/`rstrip` with and without `chars` (Python's `str.strip()` removes
 * U+001C and U+0085, not U+FEFF), and the unit pattern of the schema, whose
 * `UNICODE_SPACE` class is a `RegExp`. The grammar rules (`ws`, `nl`, tag
 * brackets, BOM) live in the corpus.
 */

import { join } from "node:path";
import { validateDocument } from "@mdq";
import { describe, expect, it } from "vitest";
import { rstrip, strip } from "../src/parser/text.js";
import { EXAMPLES_ROOT, loadDocument } from "./corpus.js";

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

	it.each(UNITS)("a numeric blank with unit %j is valid: %s", (unit, valid) => {
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
