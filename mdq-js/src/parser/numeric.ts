/**
 * The `sign? value abstol? reltol?` grammar of a numeric body
 * (`docs/question-types/numeric.md`). A port of
 * `mdq-py/mdq/_parser/_numeric.py`. A numeric question (`[numeric]: ...`) and
 * a numeric fill-in blank (`[^id/numeric]: ...`) both use it.
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
	 * whichever is larger (numeric.md, "Decimal places"). Always present; the
	 * caller keeps it only when the question's domain is `decimal`.
	 */
	decimalPlaces: number;
	tolerance?: { absolute?: number; relative?: number };
}

/**
 * numeric.md's `INTEGER`/`DECIMAL` terminals: no leading zeros (`007`,
 * `00.5` are not valid), a lone `0` is the one way to write zero. Shared
 * by the value, a fraction's numerator/denominator, and both
 * tolerances -- the grammar names one `INTEGER`/`DECIMAL` for all of
 * them. A port of `_INTEGER`/`_DECIMAL` (`mdq-py/mdq/_parser/_numeric.py`).
 */
const _INTEGER = "(?:0|[1-9][0-9]*)";
const _DECIMAL = `${_INTEGER}\\.[0-9]+`;
const _FRACTION = `${_INTEGER}/${_INTEGER}`;
const _VALUE = `(?:${_FRACTION}|${_DECIMAL}|${_INTEGER})`;
const _TOLERANCE_NUM = `(?:${_DECIMAL}|${_INTEGER})`;

/**
 * The whole `sign? value abstol? reltol?` expression: `value` is an integer,
 * a decimal or a fraction, and `tolerances` is the raw run of `+- N[%]`
 * terms that follow it, further parsed by `TOL_TERM_RE`. A port of
 * `NUM_VALUE_RE`.
 */
const NUM_VALUE_RE = new RegExp(
	`^(?<sign>[+-])?(?<value>${_VALUE})(?<tolerances>(?:[ \\t]*\\+-[ \\t]*${_TOLERANCE_NUM}%?)*)[ \\t]*$`,
	"u",
);

/** One `+- N` (absolute) or `+- N%` (relative) tolerance term. A port of `TOL_TERM_RE`. */
const TOL_TERM_RE = new RegExp(
	`\\+-[ \\t]*(?<num>${_TOLERANCE_NUM})(?<pct>%)?`,
	"gu",
);

/**
 * Parse the text after a `[numeric]:` tag. A port of
 * `_parse_numeric_expression`.
 *
 * @throws {ParseError} If the text does not follow the grammar, writes a
 * fraction with a zero denominator, or writes a tolerance kind twice.
 */
export function parseNumericExpression(expression: string): NumericExpression {
	const match = NUM_VALUE_RE.exec(strip(expression, " \t"));
	if (!match?.groups) {
		throw new ParseError(`malformed numeric body: ${repr(expression)}`);
	}

	const sign = match.groups.sign ?? "";
	const value = match.groups.value ?? "";
	const answer = answerValue(sign, value);

	let result: NumericExpression;
	if (value.includes("/")) {
		const denominatorText = value.split("/")[1] ?? "";
		if (Number(denominatorText) === 0) {
			throw new ParseError(
				`zero denominator in numeric body: ${repr(expression)}`,
			);
		}
		result = { answer, domain: "fraction", decimalPlaces: 0 };
	} else if (value.includes(".")) {
		result = { answer, domain: "decimal", decimalPlaces: 0 };
	} else {
		result = { answer, domain: "integer", decimalPlaces: 0 };
	}

	const tolerance: { absolute?: number; relative?: number } = {};
	let absoluteIsDecimal = false;
	let absolutePlaces = 0;
	for (const tolMatch of (match.groups.tolerances ?? "").matchAll(
		TOL_TERM_RE,
	)) {
		const numText = tolMatch.groups?.num ?? "";
		const num = Number(numText);
		const kind = tolMatch.groups?.pct ? "relative" : "absolute";
		if (kind in tolerance) {
			throw new ParseError(
				`a numeric body takes one ${kind} tolerance: ${repr(expression)}`,
			);
		}
		if (kind === "relative") {
			tolerance.relative = num / 100;
		} else {
			tolerance.absolute = num;
			absoluteIsDecimal = numText.includes(".");
			absolutePlaces = absoluteIsDecimal
				? (numText.split(".", 2)[1] ?? "").length
				: 0;
		}
	}
	if (Object.keys(tolerance).length > 0) {
		result.tolerance = tolerance;
	}
	// numeric.md, "Number type/domain": an absolute tolerance written as a
	// decimal makes the domain decimal, whatever the form of the value.
	if (absoluteIsDecimal) {
		result.domain = "decimal";
	}
	// numeric.md, "Decimal places": the places written in the value and in
	// the absolute tolerance, whichever is larger.
	const valuePlaces = value.includes(".")
		? (value.split(".", 2)[1] ?? "").length
		: 0;
	result.decimalPlaces = Math.max(valuePlaces, absolutePlaces);

	return result;
}

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

/**
 * The JSON value of a numeric body's `sign? value` (numeric.md, "Answer
 * representation"). A `+` sign is dropped. A port of `_answer_value`.
 *
 * * An integer is a number if it fits the 32-bit signed range, a string
 *   otherwise.
 * * A fraction is always a string.
 * * A decimal is a number only if the nearest double gives back the written
 *   digits: its shortest form is the same decimal, and the written value
 *   does not end in a zero (`2.50` records a digit that the double drops).
 *   Otherwise it is a string.
 */
function answerValue(sign: string, value: string): number | string {
	const text = sign === "-" ? `-${value}` : value;
	if (value.includes("/")) {
		return text;
	}
	if (value.includes(".")) {
		const number = Number(text);
		if (
			!value.endsWith("0") &&
			Number.isFinite(number) &&
			plainDecimal(String(Math.abs(number))) === value
		) {
			return number;
		}
		return text;
	}
	// `+ 0` turns `-0` into `0`, as Python's `int("-0")`.
	const integer = Number(text) + 0;
	if (
		Number.isSafeInteger(integer) &&
		integer >= INT32_MIN &&
		integer <= INT32_MAX
	) {
		return integer;
	}
	return text;
}

/**
 * The shortest form of a non-negative number (`String(n)`) in plain
 * notation, without an exponent: `1e-7` becomes `0.0000001` and `1e+21`
 * becomes `1000000000000000000000`.
 */
function plainDecimal(shortest: string): string {
	const match =
		/^(?<digits>[0-9]+)(?:\.(?<fraction>[0-9]+))?e(?<exp>[+-][0-9]+)$/u.exec(
			shortest,
		);
	if (!match?.groups) {
		return shortest;
	}
	const fraction = match.groups.fraction ?? "";
	const digits = `${match.groups.digits}${fraction}`;
	const point = (match.groups.digits ?? "").length + Number(match.groups.exp);
	if (point <= 0) {
		return `0.${"0".repeat(-point)}${digits}`;
	}
	if (point >= digits.length) {
		return digits + "0".repeat(point - digits.length);
	}
	return `${digits.slice(0, point)}.${digits.slice(point)}`;
}
