/**
 * Tests for the `[numeric]:` body -- `docs/handoffs/04-parser-numeric.md`,
 * batch 1 criterion 2 and batch 2 criteria 3-4.
 *
 * Criterion 1 (every `examples/valid/numeric/*.mdq.md` parses to its
 * `.yaml`) is already covered, red, by the corpus loop in
 * `tests/parser.spec.ts`; this file does not duplicate it.
 *
 * Every expected value here comes from running the reference directly, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._parser._numeric import _parse_numeric_expression
 *   print(_parse_numeric_expression('3.14 +- 5% +- 0.1'))
 *   "
 *
 * and, for the full-document cases, `mdq._parser._question.parse_question`.
 *
 * Reference: `mdq-py/mdq/_parser/_numeric.py` (`_parse_numeric_expression`,
 * `NUM_VALUE_RE`, `TOL_TERM_RE`), `mdq-py/mdq/_parser/_question.py`
 * (`parse_numeric_body`, `NUMERIC_TAG_RE`, `UNIT_RE`), `mdq-py/mdq/_parser/
 * _choices.py` (`PERCENT_RE`, `_score_from_value`).
 *
 * `docs/handoffs/06-numeric-grammar.md` supersedes the prior scope note
 * here about non-ASCII units: `UNIT_RE` is `[^\s()\[\]]+`, unchanged by
 * that cycle, so `µm`/`°C`/`m/s`/`km/h` are in scope and exercised below.
 */

import { ParseError, parseQuestionDocument } from "@mdq";
import { PERCENT_RE, scoreFromValue } from "@mdq/parser/choices.js";
import { parseNumericExpression } from "@mdq/parser/numeric.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const SEED = 20260928;

//
// Criterion 2: a malformed `[numeric]:` body raises ParseError, through the
// full document parser.
//

describe("numeric body: malformed input raises ParseError", () => {
	it.each([
		["empty rest", "What is x?\n\n[numeric]: \n"],
		["not a number", "What is x?\n\n[numeric]: abc\n"],
		["trailing dot with no fractional digits", "What is x?\n\n[numeric]: 3.\n"],
		["leading dot with no integer part", "What is x?\n\n[numeric]: .14\n"],
		["double slash in a fraction", "What is x?\n\n[numeric]: 1//3\n"],
		["two dots in a decimal", "What is x?\n\n[numeric]: 3.14.15\n"],
		["doubled plus sign", "What is x?\n\n[numeric]: ++3\n"],
		["sign glued to the tolerance marker", "What is x?\n\n[numeric]: +-3\n"],
		["tolerance number missing", "What is x?\n\n[numeric]: 3.14 +- \n"],
		["tolerance is not a number", "What is x?\n\n[numeric]: 3.14 +- abc\n"],
		[
			"space between tolerance number and percent sign",
			"What is x?\n\n[numeric]: 3.14 +- 5 %\n",
		],
		["tolerance written as a fraction", "What is x?\n\n[numeric]: 3 +- 1/2\n"],
		["two numbers with no operator", "What is x?\n\n[numeric]: 3+3\n"],
		["unit given as an empty parenthesis", "What is x?\n\n[numeric()]: 5\n"],
		[
			"two absolute tolerances",
			"What is x?\n\n[numeric]: 3.14 +- 0.1 +- 0.2\n",
		],
		["two relative tolerances", "What is x?\n\n[numeric]: 3.14 +- 5% +- 10%\n"],
	])("%s", (_label, source) => {
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
	});

	it.each([
		["absolute", "3.14 +- 0.1 +- 0.2"],
		["relative", "3.14 +- 5% +- 10%"],
	])("a repeated %s tolerance names its kind", (kind, expr) => {
		expect(() => parseNumericExpression(expr)).toThrow(
			`a numeric body takes one ${kind} tolerance: '${expr}'`,
		);
	});

	// A zero-denominator fraction (`1/0`) is covered by its own describe
	// block below ("numeric body: zero denominator"), not here.
});

//
// Criterion 2 (handoff 06): a leading zero in the value, a fraction's
// numerator/denominator, or either tolerance raises ParseError -- numeric.md's
// INTEGER is `0|[1-9][0-9]*`, which admits no leading zero, and DECIMAL
// reuses it for the integer part. Ported from mdq-py/tests/test_parser.py's
// test_numeric_leading_zero_is_a_parse_error.
//

describe("numeric body: a leading zero is a parse error", () => {
	it.each([
		["value", "007"],
		["negative value", "-007"],
		["decimal integer part", "00.5"],
		["fraction numerator", "01/2"],
		["fraction denominator", "1/02"],
		["absolute tolerance", "1 +-01"],
		["relative tolerance", "1 +-05%"],
	])("%s: %j", (_label, expr) => {
		expect(() => parseNumericExpression(expr)).toThrow(ParseError);
	});

	it.each([
		["value", "Quantos estados tem o Brasil?\n\n[numeric]: 026\n"],
		["decimal integer part", "Qual é o valor de pi?\n\n[numeric]: 03.14\n"],
		[
			"fraction numerator",
			"Qual fração representa um terço?\n\n[numeric]: 01/3\n",
		],
		[
			"fraction denominator",
			"Qual fração representa um terço?\n\n[numeric]: 1/03\n",
		],
		[
			"absolute tolerance",
			"Qual é o valor de pi?\n\n[numeric]: 3.14 +- 00.1\n",
		],
		["relative tolerance", "Qual é o valor de pi?\n\n[numeric]: 3.14 +- 05%\n"],
		[
			"a numeric fill-in blank",
			"O Brasil tem [^estados] estados.\n\n[^estados/numeric]: 026\n",
		],
	])("%s, through the full document parser", (_label, source) => {
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
	});
});

//
// Criterion 3: parseNumericExpression's return value, table-driven against
// the reference.
//

describe("parseNumericExpression: value grammar", () => {
	it.each([
		[
			"plain integer",
			"42",
			{ answer: 42, domain: "integer", decimalPlaces: 0 },
		],
		[
			"explicit plus sign",
			"+42",
			{ answer: 42, domain: "integer", decimalPlaces: 0 },
		],
		[
			"negative integer",
			"-42",
			{ answer: -42, domain: "integer", decimalPlaces: 0 },
		],
		["zero", "0", { answer: 0, domain: "integer", decimalPlaces: 0 }],
		[
			"decimal value records its written decimal places",
			"3.14",
			{ answer: 3.14, domain: "decimal", decimalPlaces: 2 },
		],
		[
			"negative decimal",
			"-3.14",
			{ answer: -3.14, domain: "decimal", decimalPlaces: 2 },
		],
		[
			"trailing zero in the decimal still counts as a decimal place",
			"0.0",
			{ answer: "0.0", domain: "decimal", decimalPlaces: 1 },
		],
		[
			"a positive fraction stays a string",
			"1/3",
			{ answer: "1/3", domain: "fraction", decimalPlaces: 0 },
		],
		[
			"negative fraction",
			"-1/3",
			{ answer: "-1/3", domain: "fraction", decimalPlaces: 0 },
		],
		[
			"a zero numerator fraction is still domain fraction",
			"0/5",
			{ answer: "0/5", domain: "fraction", decimalPlaces: 0 },
		],
	])("%s: %j", (_label, expr, expected) => {
		expect(parseNumericExpression(expr)).toEqual(expected);
	});

	it.each([
		[
			"absolute tolerance",
			"3.14 +- 0.1",
			{
				answer: 3.14,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 0.1 },
			},
		],
		[
			"relative tolerance, given as a percentage of the answer",
			"3.14 +- 5%",
			{
				answer: 3.14,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { relative: 0.05 },
			},
		],
		[
			"relative then absolute tolerance",
			"3.14 +- 5% +- 0.1",
			{
				answer: 3.14,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { relative: 0.05, absolute: 0.1 },
			},
		],
		[
			"absolute then relative tolerance -- order does not matter",
			"3.14 +- 0.1 +- 5%",
			{
				answer: 3.14,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 0.1, relative: 0.05 },
			},
		],
		[
			"no space around the tolerance marker",
			"3.14+-0.1",
			{
				answer: 3.14,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 0.1 },
			},
		],
		[
			"whitespace padding around the whole expression is trimmed",
			"  3.14  +-  0.1  ",
			{
				answer: 3.14,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 0.1 },
			},
		],
		[
			"a decimal absolute tolerance makes an integer answer's domain decimal, with its places",
			"42 +- 3.5",
			{
				answer: 42,
				domain: "decimal",
				decimalPlaces: 1,
				tolerance: { absolute: 3.5 },
			},
		],
		[
			"the absolute tolerance's places win when they are more than the value's",
			"3.1 +- 0.25",
			{
				answer: 3.1,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 0.25 },
			},
		],
		[
			"a relative tolerance never affects domain, even on an integer answer",
			"42 +- 5%",
			{
				answer: 42,
				domain: "integer",
				decimalPlaces: 0,
				tolerance: { relative: 0.05 },
			},
		],
	])("%s: %j", (_label, expr, expected) => {
		expect(parseNumericExpression(expr)).toEqual(expected);
	});

	it.each([
		["empty string", ""],
		["only whitespace", "   "],
		["not a number", "abc"],
		["trailing dot", "3."],
		["leading dot", ".14"],
		["double slash", "1//3"],
		["two dots", "3.14.15"],
		["doubled plus sign", "++3"],
		["doubled minus sign", "--3"],
		["sign glued to tolerance marker", "+-3"],
		["dangling tolerance marker", "3.14 +- "],
		["percent with no number", "3.14 +- %"],
		["non-numeric tolerance", "3.14 +- abc"],
		["space between tolerance number and percent sign", "3.14 +- 5 %"],
		["tolerance written as a fraction", "3 +- 1/2"],
		["tolerance with a leading dot", "3.14+-.5"],
		["underscore digit grouping", "1_000"],
		["scientific notation", "1e10"],
		["the literal word Infinity", "Infinity"],
		["the literal word NaN", "NaN"],
	])("rejects: %s (%j)", (_label, expr) => {
		expect(() => parseNumericExpression(expr)).toThrow(ParseError);
	});

	// Non-ASCII digits (Arabic-indic `٣`, etc.): the value grammar
	// (`NUM_VALUE_RE`) matches `[0-9]` only, in both TypeScript and current
	// Python -- mdq-py's numeric regexes were narrowed from `\d`/`int()`
	// coercion to `[0-9]` for exactly this reason, so this is now parity,
	// not a documented divergence (see the handoff's Dialect section for
	// the pre-fix history).
	it("rejects non-ASCII digits", () => {
		expect(() => parseNumericExpression("٣")).toThrow(ParseError);
	});
});

//
// Criterion 4 (handoff 06): a unit is `[^\s()\[\]]+` (`UNIT_RE`) -- anything
// except whitespace and the four bracket characters that would otherwise be
// ambiguous with the tag's own `(...)`/`[...]` delimiters. This admits
// non-ASCII units and an internal `/`, not just `[\w.-]`.
//

describe("numeric body: unit", () => {
	it.each([
		["a plain ASCII unit", "kg"],
		["a non-ASCII unit (micro sign)", "µm"],
		["a non-ASCII unit (degree sign)", "°C"],
		["a unit with an internal slash", "m/s"],
		["a compound unit with an internal slash", "km/h"],
	])("attaches %s (%j) to the document", (_label, unit) => {
		const source = `How heavy is a liter of water?\n\n[numeric(${unit})]: 5\n`;
		expect(parseQuestionDocument(source)).toEqual({
			stem: "How heavy is a liter of water?",
			type: "numeric",
			answer: 5,
			unit,
			domain: "integer",
		});
	});

	it.each([
		["whitespace", "a b"],
		["an opening parenthesis", "a(b"],
		["a closing parenthesis", "a)b"],
		["an opening bracket", "a[b"],
		["a closing bracket", "a]b"],
	])("rejects a unit containing %s (%j)", (_label, unit) => {
		// Any of these characters breaks NUMERIC_TAG_RE's own `(...)` capture,
		// so the paragraph is not recognized as a numeric tag at all -- with
		// no bracket list either, the body itself is unrecognized.
		const source = `What is x?\n\n[numeric(${unit})]: 5\n`;
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
	});
});

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
		decimalPlaces: number;
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
			decimalPlaces: cfg.value.decimalPlaces ?? 0,
		};
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

// Python `test_numeric_zero_denominator_is_a_parse_error` in
// `mdq-py/tests/test_parser.py`: same error kind and message.
describe("numeric body: zero denominator", () => {
	it("raises ParseError with the Python message", () => {
		expect(() => parseNumericExpression("1/0")).toThrow(ParseError);
		expect(() => parseNumericExpression("1/0")).toThrow(
			"zero denominator in numeric body: '1/0'",
		);
	});

	it("raises ParseError through the question parser", () => {
		expect(() =>
			parseQuestionDocument("How much?\n\n[numeric]: 1/0\n"),
		).toThrow(ParseError);
	});
});

//
// Criterion 2 (handoff 06): PERCENT_RE and _score_from_value (a multiple-
// choice marker's partial-credit percentage) are unchanged by this cycle's
// leading-zero fix to the numeric grammar -- they keep accepting a leading
// zero, unlike a numeric body's own value/fraction/tolerance.
//

describe("multiple-choice score: a leading zero in a percentage still parses", () => {
	it.each([
		["05%", 0.05],
		["007%", 0.07],
		["-05%", -0.05],
	])("PERCENT_RE and scoreFromValue accept %s: %j", (value, expected) => {
		expect(PERCENT_RE.test(value)).toBe(true);
		expect(scoreFromValue(value)).toBeCloseTo(expected);
	});

	it("parses a [05%] choice marker through the full document parser, like Python", () => {
		const source =
			"Which is the largest ocean?\n\n* [*] Pacific\n* [05%] Atlantic\n* [ ] Indian\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Which is the largest ocean?",
			type: "multiple-choice",
			choices: [
				{ text: "Pacific", score: 1 },
				{ text: "Atlantic", score: 0.05 },
				{ text: "Indian" },
			],
		});
	});
});

// numeric.md, "Number type/domain" (root `95d7535`, mdq-py `d4e6e5c`): an
// absolute tolerance written with "." makes the domain decimal; the last
// absolute term decides; a relative tolerance does not count. Expected
// values come from `_parse_numeric_expression`.
describe("parseNumericExpression: domain from the absolute tolerance", () => {
	it.each([
		[
			"0 +- 0.01",
			{
				answer: 0,
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 0.01 },
			},
		],
		[
			"1/3 +- 1",
			{
				answer: "1/3",
				domain: "fraction",
				decimalPlaces: 0,
				tolerance: { absolute: 1 },
			},
		],
		[
			"1/3 +- 0.5",
			{
				answer: "1/3",
				domain: "decimal",
				decimalPlaces: 1,
				tolerance: { absolute: 0.5 },
			},
		],
		[
			"2.50 +- 1",
			{
				answer: "2.50",
				domain: "decimal",
				decimalPlaces: 2,
				tolerance: { absolute: 1 },
			},
		],
		[
			"7 +- 0.5%",
			{
				answer: 7,
				domain: "integer",
				decimalPlaces: 0,
				tolerance: { relative: 0.005 },
			},
		],
		[
			"7 +- 1.0",
			{
				answer: 7,
				domain: "decimal",
				decimalPlaces: 1,
				tolerance: { absolute: 1 },
			},
		],
	])("%s", (expression, expected) => {
		expect(parseNumericExpression(expression)).toEqual(expected);
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
		["1/3", { answer: "1/3", domain: "fraction", decimalPlaces: 0 }],
		["-1/3", { answer: "-1/3", domain: "fraction", decimalPlaces: 0 }],
		["+3/4", { answer: "3/4", domain: "fraction", decimalPlaces: 0 }],
		["4/2", { answer: "4/2", domain: "fraction", decimalPlaces: 0 }],
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

	it("a decimal that underflows to zero stays a string", () => {
		const value = `0.${"0".repeat(400)}1`;
		expect(parseNumericExpression(value)).toEqual({
			answer: value,
			domain: "decimal",
			decimalPlaces: 401,
		});
	});

	it("-0 is the number 0, not -0", () => {
		expect(Object.is(parseNumericExpression("-0").answer, 0)).toBe(true);
	});
});
