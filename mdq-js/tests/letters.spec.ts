/**
 * Runtime-sensitive helpers of `src/letters.ts` and `src/markdown.ts`:
 * Unicode normalization and line splitting differ between JavaScript and
 * Python. Expected values come from mdq-py (`mdq._letters`, `mdq._markdown`).
 */

import { describe, expect, it } from "vitest";
import { isLetter, normalizeValue, stripMarkerSpace } from "../src/letters.js";
import { splitLines, stripBom } from "../src/markdown.js";
import { findUnicodeSpaces } from "../src/parser/spaces.js";

describe("normalizeValue", () => {
	it.each([
		["Ｆ", "f"],
		[" ", ""],
		["　x　", "x"],
		["＊", "*"],
		["İ", "İ"],
		["X", "x"],
		["Đ", "Đ"],
	])("%j -> %j", (value, expected) => {
		expect(normalizeValue(value)).toBe(expected);
	});
});

describe("isLetter", () => {
	it("counts code points, not UTF-16 units", () => {
		expect(isLetter("\u{20000}")).toBe(true);
		expect(isLetter("ab")).toBe(false);
		expect(isLetter("ʰ")).toBe(false); // Lm is not a letter
	});
});

describe("stripMarkerSpace", () => {
	it("strips spaces whose NFKC form is a space, and keeps others", () => {
		expect(stripMarkerSpace(" x ")).toBe("x");
		expect(stripMarkerSpace(" x")).toBe(" x");
	});
});

describe("splitLines and stripBom", () => {
	it("splits at CR, LF and CRLF only", () => {
		expect(splitLines("a\r\nb\x85c\rd\n")).toEqual(["a", "b\x85c", "d"]);
		expect(splitLines("a\n\nb", true)).toEqual(["a\n", "\n", "b"]);
		expect(splitLines("")).toEqual([]);
	});

	it("removes only a leading BOM", () => {
		expect(stripBom("﻿a﻿")).toBe("a﻿");
	});
});

describe("findUnicodeSpaces", () => {
	it("reports prose as info and a line separator as warning", () => {
		const found = findUnicodeSpaces("6 400 km\n\nb c\n");
		expect(found.map((d) => [d.code, d.severity, d.line])).toEqual([
			["non-ascii-whitespace-in-prose", "info", 1],
			["non-ascii-whitespace", "warning", 3],
		]);
	});

	it("skips code spans and a leading BOM", () => {
		expect(findUnicodeSpaces("﻿a `b c`\n")).toEqual([]);
	});
});
