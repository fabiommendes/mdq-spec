/**
 * Number representation of `parseNumericExpression`: JavaScript numbers
 * cannot hold every value the grammar accepts, so the parser picks a number
 * or a string by the shortest-double rule (`numeric.md`, "Answer
 * representation"). The rest of the numeric grammar lives in the corpus.
 * Expected values come from `_parse_numeric_expression` in mdq-py.
 */

import { parseNumericExpression } from "@mdq/parser/numeric.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const SEED = 20260928;

//
// Property: for a well-formed generated expression, parseNumericExpression's
// domain, decimalPlaces and answer match the values the generator itself
// computes -- not a re-derivation of the implementation's logic.
//

interface GeneratedExpr {
	source: string;
	expected: {
		answer: number | string;
		domain: "integer" | "decimal" | "fraction";
		decimalPlaces?: number;
		tolerance?: { absolute?: number; relative?: number };
	};
}

const signArb = fc.constantFrom("", "+", "-");
const spaceArb = fc.constantFrom("", " ", "  ");

// `answer(sign)` follows numeric.md, "Answer representation": integers in
// this range are numbers; a decimal is a number unless it ends in a zero (at
// most 11 significant digits, so the double gives back the written digits);
// a fraction is always a string. A `+` sign is dropped.
const valueArb: fc.Arbitrary<{
	text: string;
	answer: (sign: string) => number | string;
	domain: "integer" | "decimal" | "fraction";
	decimalPlaces?: number;
}> = fc.oneof(
	fc.nat({ max: 10_000 }).map((n) => ({
		text: String(n),
		answer: (sign: string) => (sign === "-" && n !== 0 ? -n : n),
		domain: "integer" as const,
	})),
	fc
		.tuple(fc.nat({ max: 10_000 }), fc.integer({ min: 1, max: 6 }))
		.chain(([whole, decimals]) =>
			fc.nat({ max: 10 ** decimals - 1 }).map((fracValue) => {
				const frac = String(fracValue).padStart(decimals, "0");
				const text = `${whole}.${frac}`;
				return {
					text,
					answer: (sign: string) => {
						const signed = sign === "-" ? `-${text}` : text;
						return frac.endsWith("0") ? signed : Number.parseFloat(signed);
					},
					domain: "decimal" as const,
					decimalPlaces: decimals,
				};
			}),
		),
	fc
		.tuple(fc.integer({ min: 1, max: 1000 }), fc.integer({ min: 1, max: 1000 }))
		.map(([num, den]) => ({
			text: `${num}/${den}`,
			answer: (sign: string) =>
				sign === "-" ? `-${num}/${den}` : `${num}/${den}`,
			domain: "fraction" as const,
		})),
);

function toleranceTermArb(kind: "absolute" | "relative") {
	return fc
		.tuple(fc.integer({ min: 0, max: 1000 }), spaceArb)
		.map(([n, spacing]) => {
			const text = `+-${spacing}${n}${kind === "relative" ? "%" : ""}`;
			const value = kind === "relative" ? n / 100 : n;
			return { text, value };
		});
}

const generatedExprArb: fc.Arbitrary<GeneratedExpr> = fc
	.record({
		sign: signArb,
		value: valueArb,
		abstol: fc.option(toleranceTermArb("absolute"), { nil: undefined }),
		reltol: fc.option(toleranceTermArb("relative"), { nil: undefined }),
		tolerancesReversed: fc.boolean(),
		leadingSpace: spaceArb,
		gapSpace: spaceArb,
	})
	.map((cfg) => {
		const tolTerms = [cfg.abstol, cfg.reltol].filter(
			(t): t is NonNullable<typeof t> => t !== undefined,
		);
		const ordered = cfg.tolerancesReversed ? [...tolTerms].reverse() : tolTerms;
		const source =
			cfg.leadingSpace +
			cfg.sign +
			cfg.value.text +
			ordered.map((t) => cfg.gapSpace + t.text).join("");

		// The tolerance terms are integers, so the places come from the
		// value alone: 0 for an integer or a fraction.
		const expected: GeneratedExpr["expected"] = {
			answer: cfg.value.answer(cfg.sign),
			domain: cfg.value.domain,
		};
		if (cfg.value.domain !== "fraction") {
			expected.decimalPlaces = cfg.value.decimalPlaces ?? 0;
		}
		const tolerance: { absolute?: number; relative?: number } = {};
		if (cfg.abstol) tolerance.absolute = cfg.abstol.value;
		if (cfg.reltol) tolerance.relative = cfg.reltol.value;
		if (cfg.abstol || cfg.reltol) expected.tolerance = tolerance;

		return { source, expected };
	});

describe("parseNumericExpression: property", () => {
	it("matches the value, domain, decimalPlaces and tolerance the generator built", () => {
		fc.assert(
			fc.property(generatedExprArb, ({ source, expected }) => {
				expect(parseNumericExpression(source)).toEqual(expected);
			}),
			{ numRuns: 200, seed: SEED },
		);
	});
});

// numeric.md, "Answer representation" (root `27f845f`, mdq-py `99b8f12`): a
// fraction is a string; an integer outside int32 is a string; a decimal is a
// number only if the shortest form of the nearest double gives back the
// written digits (a trailing zero counts as lost). Expected values come from
// `_parse_numeric_expression`.
describe("parseNumericExpression: answer representation", () => {
	it.each([
		["42", { answer: 42, domain: "integer", decimalPlaces: 0 }],
		["-1", { answer: -1, domain: "integer", decimalPlaces: 0 }],
		["+7", { answer: 7, domain: "integer", decimalPlaces: 0 }],
		["-0", { answer: 0, domain: "integer", decimalPlaces: 0 }],
		["2147483647", { answer: 2147483647, domain: "integer", decimalPlaces: 0 }],
		[
			"-2147483648",
			{ answer: -2147483648, domain: "integer", decimalPlaces: 0 },
		],
		[
			"2147483648",
			{ answer: "2147483648", domain: "integer", decimalPlaces: 0 },
		],
		[
			"-2147483649",
			{ answer: "-2147483649", domain: "integer", decimalPlaces: 0 },
		],
		[
			"+390000000000",
			{ answer: "390000000000", domain: "integer", decimalPlaces: 0 },
		],
		["1/3", { answer: "1/3", domain: "fraction" }],
		["-1/3", { answer: "-1/3", domain: "fraction" }],
		["+3/4", { answer: "3/4", domain: "fraction" }],
		["4/2", { answer: "4/2", domain: "fraction" }],
		["0.25", { answer: 0.25, domain: "decimal", decimalPlaces: 2 }],
		["-273.15", { answer: -273.15, domain: "decimal", decimalPlaces: 2 }],
		["+3.14", { answer: 3.14, domain: "decimal", decimalPlaces: 2 }],
		[
			"3000000000.5",
			{ answer: 3000000000.5, domain: "decimal", decimalPlaces: 1 },
		],
		["2.0", { answer: "2.0", domain: "decimal", decimalPlaces: 1 }],
		["2.50", { answer: "2.50", domain: "decimal", decimalPlaces: 2 }],
		["-0.0", { answer: "-0.0", domain: "decimal", decimalPlaces: 1 }],
		[
			"3.14159265358979323846",
			{
				answer: "3.14159265358979323846",
				domain: "decimal",
				decimalPlaces: 20,
			},
		],
		[
			"1.0000000000000000001",
			{ answer: "1.0000000000000000001", domain: "decimal", decimalPlaces: 19 },
		],
		["0.00001", { answer: 1e-5, domain: "decimal", decimalPlaces: 5 }],
		[
			"123456789012345678901234.5",
			{
				answer: "123456789012345678901234.5",
				domain: "decimal",
				decimalPlaces: 1,
			},
		],
		["-0.5", { answer: -0.5, domain: "decimal", decimalPlaces: 1 }],
		[
			"1/3 +- 0.01",
			{
				answer: "1/3",
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 0.01 },
			},
		],
	] as const)("%s", (expression, expected) => {
		expect(parseNumericExpression(expression)).toEqual(expected);
	});

	it("-0 is the number 0, not -0", () => {
		expect(Object.is(parseNumericExpression("-0").answer, 0)).toBe(true);
	});
});
