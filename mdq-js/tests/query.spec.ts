/**
 * The `include-all` query language: `parseQuery`, `Query.matches`,
 * `Query.select` and `isStandardQuery`. Port of the "Query language" section
 * of `mdq-py/tests/test_include_all.py`, plus the error messages and the
 * Unicode-space rule of `docs/exam.md`.
 */

import {
	isStandardQuery,
	MdqError,
	parseQuery,
	QuerySyntaxError,
	type TagIndex,
} from "@mdq";
import { describe, expect, it } from "vitest";

describe("Query.matches", () => {
	it.each<[string, string[], boolean]>([
		["biome", ["biome"], true],
		["biome", ["forest"], false],
		["biome AND forest", ["biome", "forest"], true],
		["biome AND forest", ["biome"], false],
		["savanna OR wetland", ["wetland"], true],
		["NOT draft", [], true],
		["NOT NOT draft", ["draft"], true],
		["a OR b AND c", ["a"], true],
		["(a OR b) AND c", ["a"], false],
		["biome AND NOT draft", ["biome", "draft"], false],
		["física", ["física"], true],
		["and", ["and"], true],
		["ANDROID", ["ANDROID"], true],
		["NOTE", ["NOTE"], true],
		["biome\tAND\nforest", ["biome", "forest"], true],
	])("query %j on tags %j is %s", (query, tags, expected) => {
		expect(parseQuery(query).matches(new Set(tags), "q")).toBe(expected);
	});

	it("EXCEPT removes the listed ids", () => {
		const query = parseQuery("biome EXCEPT cerrado, pantanal");
		expect(query.matches(new Set(["biome"]), "amazonia")).toBe(true);
		expect(query.matches(new Set(["biome"]), "cerrado")).toBe(false);
		expect(query.matches(new Set(["biome"]), "pantanal")).toBe(false);
	});

	it("accepts any iterable of tags", () => {
		expect(parseQuery("a AND b").matches(["a", "b"], "q")).toBe(true);
	});
});

describe("parseQuery errors", () => {
	const invalid = [
		"",
		"AND",
		"biome AND",
		"(biome",
		"biome)",
		"biome EXCEPT",
		"#biome OR",
		"a b",
	];

	it.each(invalid)("rejects %j", (query) => {
		expect(() => parseQuery(query)).toThrow(QuerySyntaxError);
		expect(isStandardQuery(query)).toBe(false);
	});

	it("QuerySyntaxError is an MdqError", () => {
		expect(() => parseQuery("")).toThrow(MdqError);
	});

	it.each<[string, string]>([
		["a b", "invalid include-all query 'a b': unexpected 'b'"],
		["biome)", "invalid include-all query 'biome)': unexpected ')'"],
		["(a", "invalid include-all query '(a': missing ')'"],
		[
			"a AND",
			"invalid include-all query 'a AND': expected a tag, found 'the end'",
		],
		["", "invalid include-all query '': expected a tag, found 'the end'"],
		["AND", "invalid include-all query 'AND': expected a tag, found 'AND'"],
		[
			"a AND )",
			"invalid include-all query 'a AND )': expected a tag, found ')'",
		],
		[
			"a EXCEPT",
			"invalid include-all query 'a EXCEPT': expected a question id, found 'the end'",
		],
		[
			"a EXCEPT b, OR",
			"invalid include-all query 'a EXCEPT b, OR': expected a question id, found 'OR'",
		],
		[
			"a EXCEPT b EXCEPT c",
			"invalid include-all query 'a EXCEPT b EXCEPT c': unexpected 'EXCEPT'",
		],
	])("%j fails with a precise message", (query, message) => {
		expect(() => parseQuery(query)).toThrow(message);
	});

	it("keywords are case sensitive: lowercase `and` is a tag", () => {
		expect(() => parseQuery("a and b")).toThrow(QuerySyntaxError);
	});
});

describe("Unicode whitespace", () => {
	it.each<[string, string]>([
		["\u00a0", "U+00A0"],
		["\u3000", "U+3000"],
	])("%j between tokens is reported by code point", (space, codePoint) => {
		expect(() => parseQuery(`a${space}OR b`)).toThrow(
			`unexpected character ${codePoint}`,
		);
	});

	it("a query with a no-break space is not standard", () => {
		expect(isStandardQuery("biome\u00a0AND savanna")).toBe(false);
	});
});

describe("isStandardQuery", () => {
	it.each([
		"biome",
		"biome AND NOT draft",
		"(a OR b) AND c EXCEPT x, y",
	])("accepts %j", (query) => {
		expect(isStandardQuery(query)).toBe(true);
	});
});

/** A tag index that records whether a query listed every id. */
class CountingIndex implements TagIndex {
	static readonly TAGS: Record<string, string[]> = {
		a: ["1", "2"],
		b: ["2", "3"],
		d: ["3"],
	};
	listed = false;

	tagged(tag: string): Iterable<string> {
		return CountingIndex.TAGS[tag] ?? [];
	}

	ids(): Iterable<string> {
		this.listed = true;
		return ["1", "2", "3", "4"];
	}
}

describe("Query.select", () => {
	it.each<[string, string[], boolean]>([
		["a", ["1", "2"], false],
		["a AND b", ["2"], false],
		["a OR b", ["1", "2", "3"], false],
		["a AND NOT b", ["1"], false],
		["NOT b AND a", ["1"], false],
		["(a OR b) AND NOT d", ["1", "2"], false],
		["b EXCEPT 2", ["3"], false],
		["NOT a", ["3", "4"], true],
		["NOT a AND NOT b", ["4"], true],
		["a OR NOT b", ["1", "2", "4"], true],
		["NOT d EXCEPT 4", ["1", "2"], true],
	])("%j selects %j (lists every id: %s)", (query, expected, listsEveryId) => {
		const index = new CountingIndex();
		const selected = parseQuery(query).select(index);
		expect([...selected].sort()).toEqual(expected);
		expect(index.listed).toBe(listsEveryId);
	});

	it("returns a fresh Set that the caller may change", () => {
		const selected = parseQuery("a").select(new CountingIndex());
		expect(selected).toBeInstanceOf(Set);
		selected.add("x");
		expect(parseQuery("a").select(new CountingIndex()).has("x")).toBe(false);
	});

	it("an unknown tag selects nothing", () => {
		expect(parseQuery("zzz").select(new CountingIndex()).size).toBe(0);
	});
});
