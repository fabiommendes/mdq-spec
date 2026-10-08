/**
 * `validateDocument` on a numeric string `answer` -- `docs/handoffs/
 * 06-numeric-grammar.md` criterion 4, on a numeric question and on a
 * numeric fill-in blank.
 *
 * `schema/numeric.yaml`'s `answer` is `number | string`; the string form is
 * how a document written directly as YAML/JSON (never the Markdown surface
 * syntax, which always turns a body fraction into a `float`) spells an exact
 * fraction or decimal a `number` would round -- see `examples/valid/numeric/
 * fraction-answer-string.yaml`. It must match:
 *
 *   ^[+-]?(?:(?:0|[1-9][0-9]*)/[1-9][0-9]*|(?:0|[1-9][0-9]*)\.[0-9]+|0|[1-9][0-9]*)$
 *
 * `schema/fill-in.yaml`'s `NumericBlank.answer` repeats the same
 * description and pattern. Confirmed against the pattern directly, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   import re
 *   pat = re.compile(r'^[+-]?(?:(?:0|[1-9][0-9]*)/[1-9][0-9]*|(?:0|[1-9][0-9]*)\.[0-9]+|0|[1-9][0-9]*)\$')
 *   print(bool(pat.match('007')))
 *   "
 *
 * Python reports a malformed string as the model error
 * `malformed-numeric-answer` (`mdq-py/mdq/models/_numeric.py`); here the
 * Zod schema itself rejects it via the string's pattern, so `validateDocument`
 * fails at the schema layer instead -- both are "rejected", which is all
 * this file asserts.
 *
 * `1/0` is covered by the malformed cases, not the valid ones: the pattern's
 * fraction branch requires the denominator to be `[1-9][0-9]*` (no leading
 * zero, and never a bare `0`), so a zero denominator never matches, same as
 * `007`.
 */

import { join } from "node:path";
import { validateDocument } from "@mdq";
import { describe, expect, it } from "vitest";
import { EXAMPLES_ROOT, loadDocument } from "./corpus.js";

/** A fresh copy of a valid corpus document, loaded straight from disk. */
function loadValidExample(...segments: string[]): Record<string, unknown> {
	return loadDocument(join(EXAMPLES_ROOT, "valid", ...segments)) as Record<
		string,
		unknown
	>;
}

const VALID_ANSWER_STRINGS = ["1/3", "-0.25", "0", "3", "+3", "10/7"];
const MALFORMED_ANSWER_STRINGS = [
	["a leading zero in the integer part", "007"],
	["a zero denominator", "1/0"],
	["not a number at all", "abc"],
	["two decimal points", "1.5.2"],
	["leading whitespace", " 3"],
];

describe("numeric question: string answer", () => {
	it.each(
		VALID_ANSWER_STRINGS,
	)("accepts %j as a numeric question's answer", (answer) => {
		const document = loadValidExample("numeric", "integer.yaml");
		document.answer = answer;

		const result = validateDocument(document);

		expect(result.success).toBe(true);
	});

	it.each(
		MALFORMED_ANSWER_STRINGS,
	)("rejects %j (%j) as a numeric question's answer", (_label, answer) => {
		const document = loadValidExample("numeric", "integer.yaml");
		document.answer = answer;

		const result = validateDocument(document);

		expect(result.success).toBe(false);
	});
});

describe("numeric fill-in blank: string answer", () => {
	function loadFillInDocument() {
		return loadValidExample("fill-in", "numeric-unit.yaml") as {
			blanks: Array<{ id: string; answer?: number | string }>;
		};
	}

	function numericBlank(document: {
		blanks: Array<{ id: string; answer?: number | string }>;
	}) {
		const blank = document.blanks.find((b) => b.id === "length");
		if (!blank) {
			throw new Error("fixture no longer has a 'length' numeric blank");
		}
		return blank;
	}

	it.each(
		VALID_ANSWER_STRINGS,
	)("accepts %j as a numeric blank's answer", (answer) => {
		const document = loadFillInDocument();
		numericBlank(document).answer = answer;

		const result = validateDocument(document);

		expect(result.success).toBe(true);
	});

	it.each(
		MALFORMED_ANSWER_STRINGS,
	)("rejects %j (%j) as a numeric blank's answer", (_label, answer) => {
		const document = loadFillInDocument();
		numericBlank(document).answer = answer;

		const result = validateDocument(document);

		expect(result.success).toBe(false);
	});
});
