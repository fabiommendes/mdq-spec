/**
 * Tests for `@mdq/slugify` -- a port of `mdq-py/tests/test_slugify.py`.
 *
 * `loose` is the interesting one: it must *always* produce a valid, unique,
 * non-forbidden slug for every item, however degenerate the text is (empty,
 * symbols-only, all-identical-once-slugified, ...). The corner cases pin
 * specific inputs, and the fast-check properties at the bottom check the same
 * contract over a much wider space -- the counterpart of the Hypothesis
 * properties on the Python side.
 */

import {
	loose,
	SLUGIFIERS,
	simple,
	singleSlugify,
	slugify,
	validateSlug,
} from "@mdq/slugify.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

/** The shared contract every `loose`/`simple` result must satisfy. */
function assertValidUniqueSlugs(
	items: Iterable<string>,
	forbid: Iterable<string>,
	result: Map<string, string>,
): void {
	expect(new Set(result.keys())).toEqual(new Set(items));

	const values = [...result.values()];
	expect(
		new Set(values).size,
		`collision in ${JSON.stringify([...result])}`,
	).toBe(values.length);
	for (const value of values) {
		expect([...forbid]).not.toContain(value);
		expect(() => validateSlug(value)).not.toThrow();
	}
}

describe("singleSlugify agrees with python-slugify", () => {
	// Expectations captured by running `slugify.slugify()` from the Python
	// implementation's own dependency; both sides transliterate through the
	// same Text::Unidecode table, so they must agree exactly.
	it.each([
		["Café com Leite!", "cafe-com-leite"],
		["Ouro Preto", "ouro-preto"],
		["Amazônia", "amazonia"],
		["Ação & Reação", "acao-reacao"],
		["naïve café 北京", "naive-cafe-bei-jing"],
		["2001: A Space Odyssey", "2001-a-space-odyssey"],
		["Hello   World--Foo", "hello-world-foo"],
		["a_b", "a-b"],
		["Ana!", "ana"],
		["🎉🎉🎉", ""],
		["!!!", ""],
		["   ", ""],
	])("slugifies %j", (text, expected) => {
		expect(singleSlugify(text)).toBe(expected);
	});

	it.each([
		["What is the capital of Brazil?", "what-is-the-capital-of"],
		["What is the capital of Brazil (revised)?", "what-is-the-capital-of"],
		["x".repeat(300), "x".repeat(24)],
		["Ouro Preto", "ouro-preto"],
	])("cuts %j at a word boundary", (text, expected) => {
		expect(singleSlugify(text, 24)).toBe(expected);
	});
});

describe("validateSlug", () => {
	it.each([
		"a",
		"a-b",
		"a1-b2",
		"0",
		"a-b-c",
		"x".repeat(100),
		"1-2-3",
	])("accepts %j", (value) => {
		expect(validateSlug(value)).toBe(value);
	});

	it.each([
		"",
		"-a",
		"a-",
		"-",
		"A",
		"a_b",
		"a b",
		"a.b",
		"café",
		"µ", // a lowercase letter, but not an ASCII one
		"٣", // a digit, but not an ASCII one
	])("rejects %j", (value) => {
		expect(() => validateSlug(value)).toThrow();
	});

	it("coerces when asked to", () => {
		expect(validateSlug("Café com Leite!", true)).toBe("cafe-com-leite");
	});
});

describe("simple", () => {
	it("slugifies each item independently", () => {
		expect(simple(["Ouro Preto", "Amazônia"])).toEqual(
			new Map([
				["Ouro Preto", "ouro-preto"],
				["Amazônia", "amazonia"],
			]),
		);
	});

	it("throws on a collision", () => {
		expect(() => simple(["Café", "cafe"])).toThrow();
	});

	it("throws when a result hits forbid", () => {
		expect(() => simple(["Café"], { forbid: ["cafe"] })).toThrow();
	});
});

describe("loose -- corner cases", () => {
	it("returns an empty map for no items", () => {
		expect(loose([])).toEqual(new Map());
	});

	it("handles a single item", () => {
		expect(loose(["Capoeira"])).toEqual(new Map([["Capoeira", "capoeira"]]));
	});

	it.each([
		[["", "   ", "!!!", "???", "***"]],
		[["", "🎉🎉🎉"]],
		[["\t", "\n", " \t\n "]],
	])("handles items with no sluggable content: %j", (items) => {
		assertValidUniqueSlugs(items, [], loose(items));
	});

	it("resolves cosmetic collisions", () => {
		const items = ["Ana", "ANA", "ana ", "Ana!", "Ana?", "AnA"];
		const result = loose(items);
		assertValidUniqueSlugs(items, [], result);
		// every value should still be recognizably "ana"-derived
		for (const value of result.values()) {
			expect(value === "ana" || value.startsWith("ana-")).toBe(true);
		}
	});

	it("resolves an accented-vs-ascii collision", () => {
		const items = ["Café", "cafe"];
		assertValidUniqueSlugs(items, [], loose(items));
	});

	it("avoids forbid", () => {
		expect(loose(["Ana"], { forbid: ["ana"] })).toEqual(
			new Map([["Ana", "ana-2"]]),
		);
	});

	it("avoids forbid through a long run of suffixes", () => {
		const forbid = ["a", ...range(2, 20).map((n) => `a-${n}`)];
		const result = loose(["a"], { forbid });
		assertValidUniqueSlugs(["a"], forbid, result);
		expect(result.get("a")).toBe("a-20");
	});

	it("climbs past a forbidden placeholder too", () => {
		// The degenerate-text placeholder ("item") is itself forbidden, so the
		// numeric-suffix ladder must kick in even for symbol-only text.
		expect(loose(["!!!"], { forbid: ["item"] })).toEqual(
			new Map([["!!!", "item-2"]]),
		);
	});

	it("never throws on a pathological forbid", () => {
		const forbid = ["item", ...range(2, 500).map((n) => `item-${n}`)];
		const items = ["", "!!!", "???"];
		assertValidUniqueSlugs(items, forbid, loose(items, { forbid }));
	});

	it("handles very long text", () => {
		const items = ["x".repeat(300), `${"x".repeat(300)}y`];
		assertValidUniqueSlugs(items, [], loose(items));
	});

	it("uses the short candidate for one and the full one for the other", () => {
		// Two items sharing their first words should get the *short* slug for
		// one and the *full* slug for the other, not both falling through to
		// numeric suffixes -- that is the point of the short/full ladder.
		const a = "What is the capital of Brazil?";
		const b = "What is the capital of Brazil (revised)?";
		const result = loose([a, b]);
		assertValidUniqueSlugs([a, b], [], result);
		expect(result.get(a)).not.toContain("-2");
		expect(result.get(b)).not.toContain("-2");
	});

	it("does not depend on the order the items arrive in", () => {
		const items = ["banana", "abacaxi", "caju", "banana!", "Abacaxi"];
		expect(loose(items)).toEqual(loose([...items].reverse()));
	});
});

describe("the slugify dispatcher", () => {
	it("rejects duplicate input", () => {
		expect(() => slugify(["a", "a"])).toThrow();
	});

	it("rejects an unknown strategy", () => {
		expect(() => slugify(["a"], "does-not-exist")).toThrow();
	});

	it("dispatches to the registered strategy", () => {
		expect(slugify(["Ouro Preto"], "loose")).toEqual(
			new Map([["Ouro Preto", "ouro-preto"]]),
		);
	});

	it("has loose and simple registered", () => {
		expect(SLUGIFIERS.loose).toBe(loose);
		expect(SLUGIFIERS.simple).toBe(simple);
	});
});

//
// Properties
//
// The counterpart of the Hypothesis properties in the Python suite: the
// generators lean on cosmetic variants of a small pool of words, so many
// items collapse to the same slug and the disambiguation ladder is actually
// exercised rather than skipped.
//

const WORDS = [
	"Ana",
	"café",
	"Ouro Preto",
	"",
	"  ",
	"!!!",
	"🎉",
	"x".repeat(40),
];

const textArb = fc.oneof(
	fc.constantFrom(...WORDS),
	fc.string(),
	fc
		.tuple(fc.constantFrom(...WORDS), fc.constantFrom("", " ", "!", "?", "-"))
		.map(([word, suffix]) => `${word}${suffix}`),
);

const itemsArb = (maxLength = 12) => fc.uniqueArray(textArb, { maxLength });

const forbidArb = fc.uniqueArray(
	fc.constantFrom("ana", "cafe", "item", "item-2", "ouro-preto", "x"),
	{ maxLength: 6 },
);

describe("loose -- properties", () => {
	it("always returns valid, unique, non-forbidden slugs", () => {
		fc.assert(
			fc.property(itemsArb(), forbidArb, (items, forbid) => {
				assertValidUniqueSlugs(items, forbid, loose(items, { forbid }));
			}),
			{ numRuns: 300 },
		);
	});

	it("is deterministic, whatever order the items arrive in", () => {
		fc.assert(
			fc.property(itemsArb(10), (items) => {
				expect(loose(items)).toEqual(loose(items));
				expect(loose(items)).toEqual(loose([...items].reverse()));
			}),
			{ numRuns: 200 },
		);
	});

	it("still resolves when its own output is forbidden", () => {
		// Forbid exactly the slugs `loose` would naturally pick, forcing it
		// past its first choice for every item; it must still produce a valid,
		// unique, non-forbidden result instead of reusing one or throwing.
		fc.assert(
			fc.property(
				itemsArb(8).filter((items) => items.length > 0),
				(items) => {
					const natural = [...loose(items).values()];
					assertValidUniqueSlugs(
						items,
						natural,
						loose(items, { forbid: natural }),
					);
				},
			),
			{ numRuns: 200 },
		);
	});

	it("is a no-op on short text that is already a unique slug", () => {
		// Short text that is already a valid, unique slug has nothing for the
		// ladder to change. Longer slug-shaped text can legitimately come back
		// truncated by the short-candidate heuristic, so it is excluded here.
		fc.assert(
			fc.property(
				fc.uniqueArray(
					fc
						.array(fc.stringMatching(/^[a-z0-9]{1,4}$/), {
							minLength: 1,
							maxLength: 3,
						})
						.map((parts) => parts.join("-"))
						.filter((slug) => slug.length <= 24),
					{ minLength: 1, maxLength: 8 },
				),
				(items) => {
					expect(loose(items)).toEqual(
						new Map(items.map((item) => [item, item])),
					);
				},
			),
			{ numRuns: 150 },
		);
	});
});

function range(start: number, stop: number): number[] {
	return Array.from({ length: stop - start }, (_, index) => start + index);
}
