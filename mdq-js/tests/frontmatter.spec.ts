/**
 * Tests for `loadYaml` and `loadFrontmatterYaml` (`src/parser/frontmatter.ts`).
 *
 * MDQ frontmatter follows the YAML 1.2 Core schema (base.md,
 * "Frontmatter"): `_FrontmatterLoader` in
 * `mdq-py/mdq/_parser/_frontmatter.py` replaces PyYAML's YAML 1.1 resolvers
 * with `_CORE_RESOLVERS`, and `loadYaml` registers the same patterns on
 * js-yaml. Every expected value below was captured by running the Python
 * loader (`uv run python -c "from mdq._parser import load_yaml; ..."`).
 * A `null` value is a `null` for `loadYaml`; `loadFrontmatterYaml` drops
 * the key, since a null field is an absent field.
 */

import { YamlSyntaxError } from "@mdq";
import { loadFrontmatterYaml, loadYaml } from "@mdq/parser/frontmatter.js";
import fc from "fast-check";
import { dump } from "js-yaml";
import { describe, expect, it } from "vitest";

describe("loadYaml -- YAML 1.2 Core scalars", () => {
	it.each([
		//
		// yes/no/on/off are strings: the Core schema has no such booleans.
		//
		["yes", "value: yes", "yes"],
		["Yes", "value: Yes", "Yes"],
		["NO", "value: NO", "NO"],
		["on", "value: on", "on"],
		["Off", "value: Off", "Off"],
		["y", "value: y", "y"],
		["n", "value: n", "n"],

		//
		// true/false, three spellings each.
		//
		["true", "value: true", true],
		["True", "value: True", true],
		["TRUE", "value: TRUE", true],
		["false", "value: false", false],
		["False", "value: False", false],
		["FALSE", "value: FALSE", false],
		["tRUE (mixed case, stays a string)", "value: tRUE", "tRUE"],

		//
		// Integers: decimal (a leading zero is not octal), `0o` octal, `0x`
		// hex. No `0b`, no `_` separators, no base-60.
		//
		["010 (decimal, not octal)", "value: 010", 10],
		["0777 (decimal)", "value: 0777", 777],
		["0o777 (octal)", "value: 0o777", 511],
		["0o10", "value: 0o10", 8],
		["0x1A (hex)", "value: 0x1A", 26],
		["-7", "value: -7", -7],
		["+7", "value: +7", 7],
		["0b101 (stays a string)", "value: 0b101", "0b101"],
		["1_000 (stays a string)", "value: 1_000", "1_000"],
		["1:30 (stays a string)", "value: 1:30", "1:30"],
		["1:30:00 (stays a string)", "value: 1:30:00", "1:30:00"],

		//
		// Floats, with an optional sign on the exponent.
		//
		["3.14", "value: 3.14", 3.14],
		["3. (trailing dot)", "value: 3.", 3],
		[".5", "value: .5", 0.5],
		["1e3", "value: 1e3", 1000],
		["1.5e3", "value: 1.5e3", 1500],
		["1.5e+3", "value: 1.5e+3", 1500],
		["1E-2", "value: 1E-2", 0.01],
		["1_000.5 (stays a string)", "value: 1_000.5", "1_000.5"],
		[".inf", "value: .inf", Number.POSITIVE_INFINITY],
		["-.inf", "value: -.inf", Number.NEGATIVE_INFINITY],
		[".nan", "value: .nan", Number.NaN],
		[".Inf", "value: .Inf", Number.POSITIVE_INFINITY],

		//
		// null forms.
		//
		["~", "value: ~", null],
		["null", "value: null", null],
		["Null", "value: Null", null],
		["NULL", "value: NULL", null],
		["empty value", "value:", null],

		//
		// Dates and timestamps are strings.
		//
		["date", "value: 2026-03-10", "2026-03-10"],
		["timestamp", "value: 2026-03-10T09:00:00", "2026-03-10T09:00:00"],
		[
			"timestamp with offset",
			"value: 2026-03-10 09:00:00 -03:00",
			"2026-03-10 09:00:00 -03:00",
		],

		//
		// Quoting overrides every implicit resolver above.
		//
		["'true' (quoted, stays a string)", "value: 'true'", "true"],
		['"0o10" (quoted, stays a string)', 'value: "0o10"', "0o10"],
		["'1e3' (quoted, stays a string)", "value: '1e3'", "1e3"],
		["'010' (quoted, stays a string)", "value: '010'", "010"],
	])("%s", (_description, snippet, expected) => {
		expect(loadYaml(snippet)).toEqual({ value: expected });
	});

	it("a repeated key is an error", () => {
		expect(() => loadYaml("a: 1\na: 2\n")).toThrow();
	});
});

describe("loadFrontmatterYaml", () => {
	it("drops a key with a null value", () => {
		expect(loadFrontmatterYaml("title:\nid: q1\nauthor: ~\n")).toEqual({
			id: "q1",
		});
	});

	it("keeps a null value for the keys in keepNull", () => {
		expect(loadFrontmatterYaml("title:\nid:\n", ["title"])).toEqual({
			title: null,
		});
	});

	it("gives an empty mapping for a document that is not a mapping", () => {
		expect(loadFrontmatterYaml("")).toEqual({});
		expect(loadFrontmatterYaml("- a\n- b\n")).toEqual({});
		expect(loadFrontmatterYaml("just text\n")).toEqual({});
	});

	it.each([
		["a repeated key", "id: a\nid: b\n"],
		["broken YAML", "id: [\n"],
		["a repeated key in a nested mapping", "meta:\n  a: 1\n  a: 2\n"],
	])("raises YamlSyntaxError for %s", (_label, text) => {
		let error: unknown;
		try {
			loadFrontmatterYaml(text);
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(YamlSyntaxError);
		expect((error as YamlSyntaxError).code).toBe("yaml-syntax-error");
		expect((error as Error).message).toMatch(/^invalid YAML frontmatter: /);
	});
});

//
// Property: a JSON-safe value, dumped with `js-yaml`'s `forceQuotes` (every
// string scalar quoted, so none of it is at the mercy of either loader's
// implicit resolvers), round-trips through `loadYaml` unchanged. Numbers
// and booleans are not strings, so `forceQuotes` leaves their plain
// representation alone -- the property only relies on that representation
// being one the Core resolvers read back, which the scalar table above pins
// down.
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

describe("loadYaml -- round-trip property", () => {
	it("recovers any JSON-safe record dumped with forced quoting", () => {
		fc.assert(
			fc.property(jsonRecordArb, (record) => {
				const text = dump(record, { forceQuotes: true });
				expect(loadYaml(text)).toEqual(record);
			}),
			{ numRuns: 200 },
		);
	});
});
