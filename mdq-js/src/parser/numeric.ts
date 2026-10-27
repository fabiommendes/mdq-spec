/**
 * The `sign? numeric_value abstol? reltol?` numeric-body grammar
 * (docs/question-types/numeric.md), shared by a numeric question's own body
 * (`[numeric]: ...`) and a numeric fill-in blank (`[^id/numeric]: ...`) --
 * both hand their tag's `rest` text to `parseNumericExpression` and merge the
 * result into their own document/blank object.
 *
 * A port of `mdq-py/mdq/_parser/_numeric.py`.
 */

import { ParseError } from "../errors.js";
import { repr, strip } from "./text.js";

/** The fields that a numeric expression sets on a question or a blank. */
export interface NumericExpression {
	/** A number, or a string when a number would lose the written value. */
	answer: number | string;
	domain: "integer" | "decimal" | "fraction";
	/**
	 * The decimal places written in the value and the absolute tolerance,
	 * whichever is larger (numeric.md, "Decimal places"). Absent when the
	 * value is a fraction and the tolerance gives no places. The caller keeps
	 * it only when the question's domain is `decimal`.
	 */
	decimalPlaces?: number;
	tolerance?: { absolute?: number; relative?: number };
}

/**
 * numeric.md's `INTEGER`/`DECIMAL` terminals: no leading zeros (`007`, `00.5`
 * are not valid), a lone `0` is the one way to write zero. Shared by the
 * value, a fraction's numerator/denominator, and both tolerances -- the
 * grammar names one `INTEGER`/`DECIMAL` for all of them.
 */
const INTEGER = "(?:0|[1-9][0-9]*)";
const DECIMAL = `${INTEGER}\\.[0-9]+`;
const FRACTION = `${INTEGER}/${INTEGER}`;
/**
 * numeric.md's `number`: an `INTEGER` or `DECIMAL` with an optional
 * `EXPONENT`, at most 3 digits. A fraction takes none.
 */
const NUMBER = `(?:${DECIMAL}|${INTEGER})(?:[eE][+-]?[0-9]{1,3})?`;
const VALUE = `(?:${FRACTION}|${NUMBER})`;
const TOLERANCE_NUM = NUMBER;

export const NUM_VALUE_RE = new RegExp(
	`^(?<sign>[+-])?(?<value>${VALUE})(?<tolerances>(?:[ \\t]*\\+-[ \\t]*${TOLERANCE_NUM}%?)*)[ \\t]*$`,
	"u",
);
const TOL_TERM_RE = new RegExp(
	`\\+-[ \\t]*(?<num>${TOLERANCE_NUM})(?<pct>%)?`,
	"gu",
);

/**
 * Spellings that numeric.md, "Body", rejects on purpose, each with the hint a
 * `ParseError` gives. Checked in order.
 */
const REJECTED_SPELLINGS: readonly (readonly [RegExp, string])[] = [
	[/−/u, 'use "-" (U+002D) as the minus sign'],
	[/±/u, 'use "+-" for a tolerance'],
	[/[0-9],[0-9]/u, 'use "." as the decimal separator'],
	[/[0-9][ \t   ]+[0-9]/u, "remove the digit group separator"],
];

/**
 * The bare `sign? numeric_value` grammar (numeric.md) -- no tolerance terms.
 * Used to validate an `answer` written as a string, whether a document
 * wrote it or `parseNumericExpression` kept it as one.
 */
export const VALUE_RE = new RegExp(`^(?<sign>[+-])?(?<value>${VALUE})$`, "u");

/** numeric.md, "Answer representation": an integer outside the 32-bit signed range stays a string. */
const INT32_MIN = -(2n ** 31n);
const INT32_MAX = 2n ** 31n - 1n;

/**
 * numeric.md, "Answer representation": the runtimes read a number as a double
 * before the exact arithmetic, so a `value` whose modulus is above the
 * largest finite double, or that is not zero but rounds to 0, is malformed. A
 * fraction is checked as its numerator and its denominator. The check runs
 * before any exact arithmetic exists, so a huge exponent never reaches it.
 *
 * @param text The source text, for the message.
 * @throws {ParseError} `value` is out of the range of a double.
 */
function checkDoubleRange(value: string, text: string): void {
	for (const part of value.split("/")) {
		const asDouble = Number(part);
		const mantissa = part.toLowerCase().split("e", 1)[0] ?? "";
		if (
			!Number.isFinite(asDouble) ||
			(asDouble === 0 && strip(mantissa, "0.") !== "")
		) {
			throw new ParseError(
				`number out of the range of a double: ${repr(text)}`,
			);
		}
	}
}

/**
 * Check a `numeric_value` of `text`: a fraction has no zero denominator and a
 * number is in the range of a double.
 *
 * @param noun What `text` is, `"body"` or `"value"`, for the message.
 * @throws {ParseError} The check fails.
 */
function checkValue(value: string, text: string, noun: string): void {
	if (value.includes("/") && strip(value.split("/")[1] ?? "", "0") === "") {
		throw new ParseError(`zero denominator in numeric ${noun}: ${repr(text)}`);
	}
	checkDoubleRange(value, text);
}

/**
 * numeric.md, "Tolerances": `p / 100` in exact decimal arithmetic on the
 * spelling (the decimal point moves two places), stored as the nearest
 * double.
 */
function percentToFraction(spelling: string): number {
	const [mantissa = "", exponent] = spelling.toLowerCase().split("e");
	return Number(`${mantissa}e${Number(exponent ?? 0) - 2}`);
}

/**
 * Parse the value/tolerance grammar from docs/question-types/numeric.md:
 * `sign? numeric_value`, then at most one absolute and one relative
 * tolerance, in either order.
 *
 * @throws {ParseError} The text does not match the grammar, the fraction has
 *   a zero denominator, a number is out of the range of a double, or a
 *   tolerance kind is written twice.
 */
export function parseNumericExpression(expr: string): NumericExpression {
	const m = NUM_VALUE_RE.exec(strip(expr, " \t"));
	if (!m?.groups) {
		throw new ParseError(
			`malformed numeric body: ${repr(expr)}${spellingHint(expr)}`,
		);
	}

	const sign = m.groups.sign ?? "";
	const value = m.groups.value ?? "";

	checkValue(value, expr, "body");
	const answer = answerValue(sign, value);

	const result: NumericExpression = {
		answer,
		domain: value.includes("/")
			? "fraction"
			: isDecimalSpelling(value)
				? "decimal"
				: "integer",
	};

	const tolerance: { absolute?: number; relative?: number } = {};
	let absoluteIsDecimal = false;
	let absolutePlaces = 0;
	for (const tolMatch of (m.groups.tolerances ?? "").matchAll(TOL_TERM_RE)) {
		const numText = tolMatch.groups?.num ?? "";
		checkDoubleRange(numText, expr);
		const kind = tolMatch.groups?.pct ? "relative" : "absolute";
		if (kind in tolerance) {
			throw new ParseError(
				`a numeric body takes one ${kind} tolerance: ${repr(expr)}`,
			);
		}
		if (kind === "relative") {
			tolerance.relative = percentToFraction(numText);
		} else {
			tolerance.absolute = Number(numText);
			absoluteIsDecimal = isDecimalSpelling(numText);
			absolutePlaces = writtenPlaces(numText);
		}
	}
	if (Object.keys(tolerance).length > 0) result.tolerance = tolerance;
	// numeric.md, "Number type/domain": an absolute tolerance written as a
	// decimal makes the domain decimal, whatever the value's own form.
	if (absoluteIsDecimal) result.domain = "decimal";
	// numeric.md, "Decimal places": the places written in the value and in the
	// absolute tolerance, whichever is larger. A fraction has no places of its
	// own: only the tolerance gives them, and a tolerance of 0 places gives
	// none (the `missing-decimal-places` lint reports it).
	if (!value.includes("/")) {
		result.decimalPlaces = Math.max(writtenPlaces(value), absolutePlaces);
	} else if (absolutePlaces > 0) {
		result.decimalPlaces = absolutePlaces;
	}
	return result;
}

/** The `domain` and `decimalPlaces` of a numeric question or blank. */
export interface NumericFields {
	domain?: unknown;
	decimalPlaces?: unknown;
}

/**
 * The `domain` and `decimalPlaces` of a numeric question or blank.
 *
 * A value in `declared` (the frontmatter) wins over the one inferred from the
 * body (numeric.md, "Number type/domain"). The places are inferred only when
 * the domain, declared or inferred, is decimal (numeric.md, "Decimal
 * places").
 */
export function numericFields(
	parsed: NumericExpression,
	declared: Readonly<Record<string, unknown>>,
): NumericFields {
	const fields: NumericFields = {};
	if (Object.hasOwn(declared, "domain")) fields.domain = declared.domain;
	else fields.domain = parsed.domain;
	if (Object.hasOwn(declared, "decimalPlaces")) {
		fields.decimalPlaces = declared.decimalPlaces;
	} else if (
		fields.domain === "decimal" &&
		parsed.decimalPlaces !== undefined
	) {
		fields.decimalPlaces = parsed.decimalPlaces;
	}
	return fields;
}

/** The `; hint` suffix for a rejected spelling in `text`, or `""`. */
function spellingHint(text: string): string {
	for (const [pattern, hint] of REJECTED_SPELLINGS) {
		if (pattern.test(text)) return `; ${hint}`;
	}
	return "";
}

/**
 * numeric.md, "Number type/domain": a `number` is `decimal` if it has a
 * decimal point or an exponent.
 */
function isDecimalSpelling(number: string): boolean {
	return number.includes(".") || number.includes("e") || number.includes("E");
}

/**
 * numeric.md, "Decimal places": `max(0, d - e)` for a `number` with `d`
 * digits after the decimal point and the exponent `e` (0 if absent).
 */
function writtenPlaces(number: string): number {
	const [mantissa = "", exponent] = number.toLowerCase().split("e");
	const digits = mantissa.includes(".")
		? (mantissa.split(".")[1] ?? "").length
		: 0;
	return Math.max(0, digits - Number(exponent ?? 0));
}

interface Decimal {
	readonly coefficient: bigint;
	readonly exponent: number;
}

/** The exact value of a decimal spelling: `coefficient * 10 ** exponent`. */
function toDecimal(text: string): Decimal {
	const m = /^(-?)([0-9]*)(?:\.([0-9]*))?(?:e([+-]?[0-9]+))?$/u.exec(
		text.toLowerCase(),
	);
	if (!m) throw new Error(`not a decimal: ${text}`);
	const fraction = m[3] ?? "";
	const coefficient = BigInt(`${m[1]}${m[2] || "0"}${fraction}`);
	return { coefficient, exponent: Number(m[4] ?? 0) - fraction.length };
}

function sameDecimal(a: string, b: string): boolean {
	const x = toDecimal(a);
	const y = toDecimal(b);
	const low = Math.min(x.exponent, y.exponent);
	const scale = (d: Decimal): bigint =>
		d.coefficient * 10n ** BigInt(d.exponent - low);
	return scale(x) === scale(y);
}

/**
 * numeric.md, "Answer representation": the JSON value of a numeric body's
 * `sign? numeric_value`. A `+` sign is dropped, since it adds nothing.
 *
 * * An integer is a number if it fits the 32-bit signed range, a string
 *   otherwise.
 * * A fraction is always a string: most have no exact float.
 * * A decimal, or a number with an exponent, is a number only if the double
 *   gives back the written digits: its shortest form is the same decimal, and
 *   the mantissa does not end in a zero after the point, which records a
 *   significant digit the double drops (`2.50`, `1.50e3`). Otherwise it is a
 *   string.
 */
function answerValue(sign: string, value: string): number | string {
	const text = sign === "-" ? `-${value}` : value;
	if (value.includes("/")) return text;
	if (isDecimalSpelling(value)) {
		const number = Number(text);
		const mantissa = value.toLowerCase().split("e", 1)[0] ?? "";
		// Only a zero after the point is a recorded significant digit.
		const recordsDigit = mantissa.includes(".") && mantissa.endsWith("0");
		if (!recordsDigit && Number.isFinite(number)) {
			if (sameDecimal(String(number), text)) return number;
		}
		return text;
	}
	const integer = BigInt(text);
	if (integer >= INT32_MIN && integer <= INT32_MAX) return Number(integer);
	return text;
}

/**
 * Parse a bare `sign? numeric_value` (numeric.md's grammar for a numeric
 * body's value, with no tolerance terms) into the representation a numeric
 * body's value gets (numeric.md, "Answer representation"; see
 * `answerValue`). The importers use it, so an imported answer reads the same
 * as one written in Markdown.
 *
 * @throws {ParseError} `text` does not match the grammar, is a fraction with
 *   a zero denominator, or is out of the range of a double.
 */
export function parseNumericAnswer(text: string): number | string {
	const m = VALUE_RE.exec(strip(text, " \t"));
	if (!m?.groups)
		throw new ParseError(`malformed numeric value: ${repr(text)}`);
	const value = m.groups.value ?? "";
	checkValue(value, text, "value");
	return answerValue(m.groups.sign ?? "", value);
}

/** An exact rational, in lowest terms with a positive denominator. */
export interface Fraction {
	readonly numerator: bigint;
	readonly denominator: bigint;
}

function gcd(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

function fraction(numerator: bigint, denominator: bigint): Fraction {
	const divisor = gcd(numerator, denominator) || 1n;
	const sign = denominator < 0n ? -1n : 1n;
	return {
		numerator: (sign * numerator) / divisor,
		denominator: (sign * denominator) / divisor,
	};
}

/**
 * Read a response string as the exact rational it spells, and report whether
 * it is written as a fraction (responses.md, "Numeric").
 *
 * The string is exactly `sign? numeric_value`: not trimmed, no comma, no
 * inner space. A `number` MAY have an exponent (`"6.022e23"`).
 *
 * @throws {ParseError} `text` does not match the grammar, is a fraction with
 *   a zero denominator, or is out of the range of a double.
 */
export function parseNumericString(text: string): [Fraction, boolean] {
	const m = VALUE_RE.exec(text);
	if (!m?.groups)
		throw new ParseError(`malformed numeric value: ${repr(text)}`);
	const value = m.groups.value ?? "";
	checkValue(value, text, "value");
	const negative = m.groups.sign === "-";
	if (value.includes("/")) {
		const [top = "0", bottom = "1"] = value.split("/");
		const result = fraction(BigInt(top), BigInt(bottom));
		return [
			negative ? { ...result, numerator: -result.numerator } : result,
			true,
		];
	}
	const { coefficient, exponent } = toDecimal(value);
	const signed = negative ? -coefficient : coefficient;
	const result =
		exponent >= 0
			? fraction(signed * 10n ** BigInt(exponent), 1n)
			: fraction(signed, 10n ** BigInt(-exponent));
	return [result, false];
}
