/**
 * Differences of the JavaScript runtime that the corpus of
 * `examples/matching/` cannot show: the `RegExp` engine, `toLowerCase` and
 * the length of a string in code units.
 */

import { InvalidRegexError, RegexPattern } from "@mdq/models/regex.js";
import { normalizeText } from "@mdq/models/text.js";
import { describe, expect, it } from "vitest";

describe("regex runtime", () => {
	it("reads an astral code point as one character", () => {
		expect(new RegexPattern("/./").match("\u{1F600}")).toBe(true);
		expect(new RegexPattern("/../").match("\u{1F600}")).toBe(false);
		expect(
			new RegexPattern("/[\u{1F600}]{2}/").match("\u{1F600}\u{1F600}"),
		).toBe(true);
	});

	it("does not read \\s as the \\s of JavaScript", () => {
		expect(/\s/u.test("﻿")).toBe(true);
		expect(new RegexPattern("/a\\sb/").match("a﻿b")).toBe(false);
	});

	it("reports groups nested too deeply as an invalid regex", () => {
		const body = `${"(".repeat(200_000)}a${")".repeat(200_000)}`;
		expect(() => new RegexPattern(`/${body}/`)).toThrow(InvalidRegexError);
	});
});

describe("inexact normalization", () => {
	it("folds the case by the table, not by toLowerCase", () => {
		// `toLowerCase` keeps U+00DF; the table gives "ss".
		expect("STRASSE".toLowerCase()).not.toBe("straße".toLowerCase());
		expect(normalizeText("STRASSE")).toBe(normalizeText("straße"));
	});
});
