/**
 * Tests for `src/parser/text.ts`. Expected values come from Python, e.g.
 * `python3 -c 'print(repr("﻿a\x85".strip()))'`.
 */

import { describe, expect, it } from "vitest";
import { repr, strip } from "../src/parser/text.js";

describe("strip", () => {
	it("removes ASCII whitespace at both ends", () => {
		expect(strip("\t\n x\r\n")).toBe("x");
	});

	it("keeps U+FEFF and removes U+0085, as Python does", () => {
		expect(strip("﻿a\x85")).toBe("﻿a");
	});

	it("removes U+001C and U+3000, as Python does", () => {
		expect(strip("\x1c b 　")).toBe("b");
	});
});

describe("batch 2: repr", () => {
	it.each([
		["plain text uses single quotes", "amazonas", "'amazonas'"],
		["the empty string", "", "''"],
		["a lone single quote switches to double quotes", "it's", `"it's"`],
		["a lone double quote keeps single quotes", 'say "hi"', `'say "hi"'`],
		[
			"both quotes: single quotes, the single quote escaped",
			`it's "both"`,
			`'it\\'s "both"'`,
		],
		["only a single quote", "'", `"'"`],
		["only a double quote", '"', `'"'`],
		["a backslash is doubled", "back\\slash", "'back\\\\slash'"],
		["newline, carriage return and tab", "\n\r\t", "'\\n\\r\\t'"],
		["a newline after both quotes", `'"\n`, `'\\'"\\n'`],
		["C0 controls and DEL", "\x00\x1f\x7f", "'\\x00\\x1f\\x7f'"],
		["C1 controls", "\x85\x9f", "'\\x85\\x9f'"],
		["a no-break space", "\u00a0", "'\\xa0'"],
		["a soft hyphen", "\u00ad", "'\\xad'"],
		["line and paragraph separators", "\u2028\u2029", "'\\u2028\\u2029'"],
		["a zero-width space", "\u200b", "'\\u200b'"],
		["a byte order mark", "\ufeff", "'\\ufeff'"],
		["an ideographic space", "\u3000", "'\\u3000'"],
		["a private use character", "\ue000", "'\\ue000'"],
		["an unassigned code point", "\u0378", "'\\u0378'"],
		["a noncharacter in the BMP", "\uffff", "'\\uffff'"],
		["a plane 14 format character", "\u{e0001}", "'\\U000e0001'"],
		["the last code point", "\u{10ffff}", "'\\U0010ffff'"],
		["a lone surrogate", "\ud800", "'\\ud800'"],
		["a space stays a space", "a b", "'a b'"],
		["a no-break space after a space", "\u00a0 ", "'\\xa0 '"],
		["accented letters stay as they are", "Amazônia é", "'Amazônia é'"],
		["a non-BMP emoji stays as it is", "\u{1F600}", "'\u{1F600}'"],
		["U+0100 stays as it is", "\u0100", "'\u0100'"],
		[
			"mixed printable and escaped",
			"\u00ff\u0100\uffff",
			"'\u00ff\u0100\\uffff'",
		],
	])("%s", (_label, text, expected) => {
		expect(repr(text)).toBe(expected);
	});
});
