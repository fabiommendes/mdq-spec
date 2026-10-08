/**
 * Tests for `loadFrontmatterYaml` (`src/parser/frontmatter.ts`) --
 * `docs/handoffs/02-parser-bracket-lists-parity.md`, acceptance criterion 4.
 *
 * `loadFrontmatterYaml` must return the same value as Python's
 * `_load_frontmatter_yaml` (`mdq-py/mdq/_parser/_frontmatter.py`) for every YAML
 * 1.1 scalar: a `yaml.SafeLoader` with the sexagesimal (base-60) int/float
 * alternative removed, everything else -- including every other resolver --
 * left at `SafeLoader`'s defaults.
 *
 * Every expected value below was captured by running the Python function
 * directly (`uv run python`, `mdq.parser._load_frontmatter_yaml`), not by
 * reading its source and guessing. Mapping from a Python value to the JS
 * value asserted here:
 *
 *  - `bool` -> `boolean`, `int`/`float` -> `number`, `str` -> `string`,
 *    `None` -> `null`. Direct, no ambiguity.
 *  - `datetime.date` / `datetime.datetime` -> JS `Date`. `js-yaml`'s
 *    timestamp resolver is untouched by the custom loader (the Python
 *    docstring: "keeps every other implicit resolver... timestamps
 *    included"), so this is the one type `loadFrontmatterYaml` does not have
 *    to special-case -- whatever `js-yaml`'s own default timestamp handling
 *    produces is already the answer, and it agrees with Python instant for
 *    instant (verified below by comparing both sides' UTC instant, since a
 *    naive Python `datetime` and a JS `Date` don't share a "no timezone"
 *    concept). Downstream, exam-only code (`format_start` in
 *    `mdq-py/mdq/_schedule.py`, called from `mdq-py/mdq/_parser/_exam.py`) turns a date/datetime frontmatter value into an ISO string before
 *    it reaches a document -- but that is exam-specific normalization one
 *    layer above this function, out of scope for F2, and a generic
 *    frontmatter key (not `start`) reaches its document with no such
 *    conversion at all (`apply_common_frontmatter` copies `title`/`author`/
 *    `locale`/... verbatim). So a `Date` is the correct return value for
 *    `loadFrontmatterYaml` itself.
 */

import { loadFrontmatterYaml } from "@mdq/parser/frontmatter.js";
import fc from "fast-check";
import { dump } from "js-yaml";
import { describe, expect, it } from "vitest";

describe("loadFrontmatterYaml -- YAML 1.1 scalars", () => {
	it.each([
		//
		// yes/no/on/off -- every case is a bool, per PyYAML's bool resolver.
		//
		["yes", "value: yes", true],
		["Yes", "value: Yes", true],
		["YES", "value: YES", true],
		["no", "value: no", false],
		["No", "value: No", false],
		["NO", "value: NO", false],
		["on", "value: on", true],
		["On", "value: On", true],
		["ON", "value: ON", true],
		["off", "value: off", false],
		["Off", "value: Off", false],
		["OFF", "value: OFF", false],

		//
		// y/Y/n/N -- *not* recognized as bool by PyYAML's SafeLoader, unlike
		// the full YAML 1.1 spec: its bool regex lists only the full words
		// above plus true/false, no single letters. So these stay strings.
		//
		["y", "value: y", "y"],
		["Y", "value: Y", "Y"],
		["n", "value: n", "n"],
		["N", "value: N", "N"],

		//
		// true/false -- every case is a bool.
		//
		["true", "value: true", true],
		["True", "value: True", true],
		["TRUE", "value: TRUE", true],
		["false", "value: false", false],
		["False", "value: False", false],
		["FALSE", "value: FALSE", false],

		//
		// Octal -- old-style `0NNN` only. `0o...` (the YAML-1.2/Python-3
		// spelling) is not in the int resolver's pattern at all, so it stays
		// a string.
		//
		["0777 (old-style octal)", "value: 0777", 511],
		["0o777 (not recognized, stays a string)", "value: 0o777", "0o777"],

		//
		// Hex / binary.
		//
		["0x1A (hex)", "value: 0x1A", 26],
		["0b101 (binary)", "value: 0b101", 5],

		//
		// `H:MM[:SS]` -- the sexagesimal alternative this loader removes, so
		// these stay strings (MDQ needs this for unquoted `HH:MM` durations).
		//
		["1:30 (not base-60, stays a string)", "value: 1:30", "1:30"],
		["1:30:00 (not base-60, stays a string)", "value: 1:30:00", "1:30:00"],

		//
		// null forms.
		//
		["~", "value: ~", null],
		["null", "value: null", null],
		["Null", "value: Null", null],
		["NULL", "value: NULL", null],
		["empty value", "value:", null],

		//
		// Floats: `.inf`/`.nan` forms.
		//
		[".inf", "value: .inf", Number.POSITIVE_INFINITY],
		["-.inf", "value: -.inf", Number.NEGATIVE_INFINITY],
		[".nan", "value: .nan", Number.NaN],

		//
		// Exponent quirk: the custom float regex requires an explicit sign
		// after `e`/`E` (`[eE][-+][0-9]+`), so a bare `1e3` matches neither
		// the float pattern (no sign) nor the int pattern (no `e` at all) and
		// falls through to a string -- even `1.5e3`, which has the decimal
		// point a float needs but still lacks the mandatory sign.
		//
		["1e3 (no sign on exponent, stays a string)", "value: 1e3", "1e3"],
		["1.5e3 (no sign on exponent, stays a string)", "value: 1.5e3", "1.5e3"],
		["1.5e+3 (signed exponent parses as a float)", "value: 1.5e+3", 1500],

		//
		// Underscore-grouped numbers.
		//
		["1_000 (int)", "value: 1_000", 1000],
		["1_000.5 (float)", "value: 1_000.5", 1000.5],

		//
		// Quoting overrides every implicit resolver above.
		//
		["'yes' (quoted, stays a string)", "value: 'yes'", "yes"],
		['"yes" (quoted, stays a string)', 'value: "yes"', "yes"],
		["'0777' (quoted, stays a string)", "value: '0777'", "0777"],
		["'1e3' (quoted, stays a string)", "value: '1e3'", "1e3"],
	])("%s", (_description, snippet, expected) => {
		expect(loadFrontmatterYaml(snippet)).toEqual({ value: expected });
	});

	//
	// Dates and timestamps: compared as UTC instants, per the module
	// docstring above.
	//
	it.each([
		["date only", "value: 2024-01-15", "2024-01-15T00:00:00.000Z"],
		[
			"timestamp, no offset",
			"value: 2024-01-15T10:30:00",
			"2024-01-15T10:30:00.000Z",
		],
		["timestamp, Z", "value: 2024-01-15T10:30:00Z", "2024-01-15T10:30:00.000Z"],
		[
			"timestamp, +02:00 offset",
			"value: 2024-01-15T10:30:00+02:00",
			"2024-01-15T08:30:00.000Z",
		],
	])("%s", (_description, snippet, isoInstant) => {
		const result = loadFrontmatterYaml(snippet);
		expect(result.value).toBeInstanceOf(Date);
		expect((result.value as Date).toISOString()).toBe(isoInstant);
	});
});

//
// Property: a JSON-safe value, dumped with `js-yaml`'s `forceQuotes` (every
// string scalar quoted, so none of it is at the mercy of either loader's
// implicit resolvers), round-trips through `loadFrontmatterYaml` unchanged.
// Numbers and booleans are not strings, so `forceQuotes` leaves their plain
// (unquoted) representation alone -- the property only relies on that
// representation being one both loaders' int/float/bool resolvers agree on,
// which the scalar table above pins down.
//

const jsonScalarArb = fc.oneof(
	fc.string(),
	fc.integer(),
	fc
		.double({ noNaN: true, noDefaultInfinity: true, min: -1e6, max: 1e6 })
		.filter((n) => !Object.is(n, -0)),
	fc.boolean(),
	fc.constant(null),
);

const frontmatterKeyArb = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,8}$/);

const jsonRecordArb = fc.dictionary(frontmatterKeyArb, jsonScalarArb, {
	minKeys: 1,
	maxKeys: 6,
});

describe("loadFrontmatterYaml -- round-trip property", () => {
	it("recovers any JSON-safe record dumped with forced quoting", () => {
		fc.assert(
			fc.property(jsonRecordArb, (record) => {
				const text = dump(record, { forceQuotes: true });
				expect(loadFrontmatterYaml(text)).toEqual(record);
			}),
			{ numRuns: 200 },
		);
	});
});
