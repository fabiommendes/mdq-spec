/**
 * Numeric questions and the key of a numeric fill-in blank. A port of
 * `models/_numeric.py`, the part that validates.
 *
 * It holds the validation, the lint rules and the scoring. The arithmetic is exact (`fraction.js`): no value of a
 * numeric answer, response or tolerance is ever held as a `number`.
 */

import { Fraction } from "fraction.js";
import type { Diagnostic, PathStep } from "../diagnostics.js";
import { ParseError, ResponseError } from "../errors.js";
import { hasVisibleCharacter } from "../markdown.js";
import { parseNumericAnswer, parseNumericString } from "../parser/numeric.js";
import { pyRepr, repr, strip } from "../parser/text.js";
import type {
	NumericDomain,
	NumericQuestion,
	Tolerance,
} from "../schema/index.js";
import { type FamilyRules, freeTextDiagnostics, modelError } from "./base.js";
import { lintDiagnostic } from "./lint-codes.js";
import type { QuestionScore } from "./score.js";

export type NumericAnswer = number | string;

/** The part of a numeric question and of a numeric blank that is the key. */
export type NumericKey = Pick<
	NumericQuestion,
	| "answer"
	| "unit"
	| "domain"
	| "decimalPlaces"
	| "tolerance"
	| "incorrectFeedback"
>;

/** Python's `repr` of a float that is not finite. */
export function nonFiniteRepr(value: number): string {
	if (Number.isNaN(value)) return "nan";
	return value > 0 ? "inf" : "-inf";
}

/** `malformed-numeric-answer` for a number that is not finite. */
export function nonFiniteDiagnostic(
	value: number,
	path: readonly PathStep[],
): Diagnostic {
	return modelError(
		"malformed-numeric-answer",
		`${nonFiniteRepr(value)} is not a finite number`,
		path,
	);
}

/**
 * numeric.md, "Answer representation": a string `answer` is a valid
 * `sign? numeric_value` (`malformed-numeric-answer`), the same grammar a
 * numeric body's value follows, with no surrounding space. A number is finite.
 */
export function numericAnswerDiagnostic(
	value: NumericAnswer,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (typeof value === "number") {
		return Number.isFinite(value)
			? undefined
			: nonFiniteDiagnostic(value, path);
	}
	// The parser trims a Markdown body's value; a string `answer` is not
	// trimmed (the schema pattern is anchored).
	if (value !== strip(value, " \t")) {
		return modelError(
			"malformed-numeric-answer",
			`${repr(value)} is not a valid numeric answer: surrounding space`,
			path,
		);
	}
	try {
		parseNumericAnswer(value);
	} catch (error) {
		if (error instanceof ParseError) {
			return modelError(
				"malformed-numeric-answer",
				`${repr(value)} is not a valid numeric answer: ${error.message}`,
				path,
			);
		}
		throw error;
	}
	return undefined;
}

/** The decimal places `value` is written with: its digits after the point, less the exponent. */
function writtenPlaces(value: NumericAnswer): number {
	if (typeof value === "number" && Number.isInteger(value)) return 0;
	const [mantissa = "", exponent = ""] = String(value).toLowerCase().split("e");
	const point = mantissa.indexOf(".");
	const digits = point < 0 ? 0 : mantissa.length - point - 1;
	return Math.max(0, digits - Number(exponent || 0));
}

const DOMAIN_RANK: Readonly<Record<NumericDomain, number>> = {
	integer: 0,
	fraction: 1,
	decimal: 2,
};

/**
 * numeric.md, "Number type/domain": the domain an `answer` is written in. A
 * string holds a `/` (a fraction), a `.` or an exponent (a decimal), or
 * neither (an integer). A number is an integer when it has no fractional part.
 */
function inferNumericDomain(answer: NumericAnswer): NumericDomain {
	if (typeof answer === "string") {
		const text = strip(answer);
		if (text.includes("/")) return "fraction";
		return /[.eE]/u.test(text) ? "decimal" : "integer";
	}
	return Number.isInteger(answer) ? "integer" : "decimal";
}

/** The declared `domain`, else the wider one inferred from `answer` and the absolute tolerance. */
export function effectiveNumericDomain(
	answer: NumericAnswer,
	domain: NumericDomain | undefined,
	tolerance: Tolerance | undefined,
): NumericDomain {
	if (domain !== undefined) return domain;
	const inferred = inferNumericDomain(answer);
	if (tolerance?.absolute !== undefined) {
		const fromTolerance = inferNumericDomain(tolerance.absolute);
		if (DOMAIN_RANK[fromTolerance] > DOMAIN_RANK[inferred]) {
			return fromTolerance;
		}
	}
	return inferred;
}

/**
 * numeric.md, "Decimal places": a fraction answer has no decimal places of
 * its own. In a `decimal` domain with no `decimalPlaces`, the absolute
 * tolerance must give them (`missing-decimal-places`).
 */
function checkDecimalPlacesGiven(
	key: NumericKey,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const { answer, domain, decimalPlaces, tolerance } = key;
	if (
		decimalPlaces !== undefined ||
		typeof answer !== "string" ||
		!answer.includes("/") ||
		effectiveNumericDomain(answer, domain, tolerance) !== "decimal"
	) {
		return undefined;
	}
	const places =
		tolerance?.absolute === undefined ? 0 : writtenPlaces(tolerance.absolute);
	if (places > 0) return undefined;
	return modelError(
		"missing-decimal-places",
		`the answer ${repr(answer)} is a fraction in a decimal domain, and nothing gives its decimal places; declare 'decimalPlaces' or a decimal absolute tolerance`,
		path,
	);
}

/** The field validators of a numeric key at `path`. */
export function numericKeyFields(
	key: NumericKey,
	path: readonly PathStep[],
): Diagnostic[] {
	const found: Diagnostic[] = [];
	const answer = numericAnswerDiagnostic(key.answer, [...path, "answer"]);
	if (answer !== undefined) found.push(answer);
	if (key.unit !== undefined && !hasVisibleCharacter(key.unit)) {
		found.push(
			modelError(
				"blank-text",
				"'unit' is defined but has no visible characters",
				[...path, "unit"],
			),
		);
	}
	found.push(
		...freeTextDiagnostics(key.incorrectFeedback, "incorrectFeedback", [
			...path,
			"incorrectFeedback",
		]),
	);
	return found;
}

/** The whole-model checks of a numeric key at `path`. */
export const numericKeyModels: NonNullable<FamilyRules<NumericKey>["models"]> =
	[checkDecimalPlacesGiven];

/** Whether an answer is a whole number, and whether it is zero; read exactly. */
function answerShape(answer: NumericAnswer): {
	whole: boolean;
	zero: boolean;
} {
	if (typeof answer === "number") {
		return { whole: Number.isInteger(answer), zero: answer === 0 };
	}
	// The model rules checked the grammar, so the string parses.
	const [exact] = parseNumericString(strip(answer, " \t"));
	return {
		whole: exact.denominator === 1n,
		zero: exact.numerator === 0n,
	};
}

/** Python's `repr` of an answer, enough for a message. */
function showAnswer(answer: NumericAnswer): string {
	return typeof answer === "string" ? repr(answer) : String(answer);
}

/** Python's `{value:g}` of a percentage, enough for a message. */
function percent(relative: number): string {
	return String(Number((relative * 100).toPrecision(6)));
}

/**
 * numeric.md, "Additional Rules": a declared domain that contradicts the
 * answer or the tolerance is a mistake, a decimal answer needs a tolerance,
 * and a relative tolerance around zero or above 100% never helps. `path`
 * is where the key sits in the document.
 */
export function numericKeyLint(
	key: NumericKey,
	path: readonly PathStep[],
): Diagnostic[] {
	const { answer, domain, decimalPlaces, tolerance } = key;
	const found: Diagnostic[] = [];
	const effectiveDomain = effectiveNumericDomain(answer, domain, tolerance);
	const { whole, zero } = answerShape(answer);
	// Under `integer` the answer must be whole; under `fraction`, whole or a
	// fraction string.
	const isFractionString = typeof answer === "string" && answer.includes("/");
	if (
		(domain === "integer" || (domain === "fraction" && !isFractionString)) &&
		!whole
	) {
		found.push(
			lintDiagnostic(
				"answer-outside-domain",
				[...path, "answer"],
				`domain is ${repr(domain)} but the answer ${showAnswer(answer)} is not ${domain === "integer" ? "a whole number" : "a whole number or a fraction"}`,
			),
		);
	}
	if (
		(domain === "integer" || domain === "fraction") &&
		tolerance?.absolute !== undefined &&
		inferNumericDomain(tolerance.absolute) === "decimal"
	) {
		found.push(
			lintDiagnostic(
				"domain-mismatch",
				[...path, "domain"],
				`domain is ${repr(domain)}, but the absolute tolerance ${tolerance.absolute} is a decimal`,
			),
		);
	}
	if (tolerance === undefined && effectiveDomain === "decimal") {
		found.push(
			lintDiagnostic(
				"missing-tolerance",
				[...path, "tolerance"],
				`the answer ${showAnswer(answer)} is in a decimal domain, but no tolerance is given; an exact comparison rarely matches a typed response`,
			),
		);
	}
	const relative = tolerance?.relative;
	if (relative !== undefined && relative > 0 && zero) {
		found.push(
			lintDiagnostic(
				"relative-tolerance-around-zero",
				[...path, "tolerance", "relative"],
				"a relative tolerance is computed as answer x relative, which is 0 when the answer is 0; only an exact 0 would be accepted",
			),
		);
	}
	if (relative !== undefined && relative > 1) {
		found.push(
			lintDiagnostic(
				"relative-tolerance-over-one",
				[...path, "tolerance", "relative"],
				`a relative tolerance of ${relative} is ${percent(relative)}%: a tolerance above 100% accepts responses of the opposite sign to the answer`,
			),
		);
	}
	if (decimalPlaces !== undefined && effectiveDomain !== "decimal") {
		const source = domain === undefined ? " (inferred from the answer)" : "";
		found.push(
			lintDiagnostic(
				"ignored-decimal-places",
				[...path, "decimalPlaces"],
				`'decimalPlaces' is ignored when domain is ${repr(effectiveDomain)}${source}`,
			),
		);
	}
	return found;
}

export const numericRules: FamilyRules<NumericQuestion> = {
	fields: numericKeyFields,
	models: numericKeyModels,
	lint: (question) => numericKeyLint(question, []),
};

//
// Scoring
//

/**
 * Convert a numeric answer, response or tolerance to an exact rational. A
 * string is the decimal or fraction it spells; a number is read as its
 * shortest decimal form (`String(x)`), so `0.1` is 1/10 and not the nearest
 * binary fraction.
 *
 * @throws {ParseError} `value` is not a valid finite number.
 */
export function numericValue(value: NumericAnswer): Fraction {
	const [exact] = parseNumericString(
		typeof value === "number" ? String(value) : value,
	);
	return new Fraction(exact.numerator, exact.denominator);
}

/**
 * The `decimalPlaces` a `decimal` question gets when the frontmatter gives
 * none (numeric.md, "Decimal places"): the larger of the number of decimal
 * places written in `answer` and in `tolerance.absolute`. A fraction answer
 * has no places of its own.
 */
export function inferDecimalPlaces(
	answer: NumericAnswer,
	tolerance: Tolerance | undefined,
): number {
	const isFraction = typeof answer === "string" && answer.includes("/");
	let places = isFraction ? 0 : writtenPlaces(answer);
	if (tolerance?.absolute !== undefined) {
		places = Math.max(places, writtenPlaces(tolerance.absolute));
	}
	return places;
}

/** Round `value` to `places` decimals, half away from zero (exact). */
export function roundHalfUp(value: Fraction, places: number): Fraction {
	const scale = new Fraction(10n ** BigInt(places));
	const rounded = value.abs().mul(scale).add(new Fraction(1n, 2n)).floor();
	return (value.lt(0) ? rounded.neg() : rounded).div(scale);
}

function isMapping(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * responses.md, "Numeric": the unit of a response is absent or equal to the
 * declared one (exact string after NFC); any other is malformed.
 */
function checkResponseUnit(
	responseUnit: unknown,
	unit: string | undefined,
): void {
	if (responseUnit === undefined || responseUnit === null) return;
	if (typeof responseUnit !== "string") {
		throw new ResponseError(`the unit ${pyRepr(responseUnit)} is not a string`);
	}
	if (unit === undefined) {
		throw new ResponseError(
			`the response has the unit ${repr(responseUnit)}, but the question declares none`,
		);
	}
	if (responseUnit.normalize("NFC") !== unit.normalize("NFC")) {
		throw new ResponseError(
			`the response has the unit ${repr(responseUnit)}, but the question declares ${repr(unit)}`,
		);
	}
}

/**
 * Read a response as an exact rational and check it against the question's
 * `domain` and `unit` (responses.md, "Numeric").
 *
 * @throws {ResponseError} The response is malformed.
 */
function responseValue(
	original: unknown,
	domain: NumericDomain,
	unit: string | undefined,
): Fraction {
	let response = original;
	if (isMapping(response)) {
		const extra = Object.keys(response).filter(
			(key) => key !== "value" && key !== "unit",
		);
		if (!Object.hasOwn(response, "value") || extra.length > 0) {
			throw new ResponseError(
				`${pyRepr(original)} must be a mapping with 'value' and, optionally, 'unit'`,
			);
		}
		checkResponseUnit(response.unit, unit);
		response = response.value;
		if (isMapping(response)) {
			throw new ResponseError(
				`${pyRepr(original)} is not a valid numeric response`,
			);
		}
	}

	let value: Fraction;
	let fromFractionForm = false;
	if (typeof response === "string") {
		try {
			const [exact, isFraction] = parseNumericString(response);
			value = new Fraction(exact.numerator, exact.denominator);
			fromFractionForm = isFraction;
		} catch (error) {
			if (error instanceof ParseError) {
				throw new ResponseError(
					`${pyRepr(response)} is not a valid numeric response`,
				);
			}
			throw error;
		}
	} else if (typeof response === "number") {
		if (!Number.isFinite(response)) {
			throw new ResponseError(`${pyRepr(response)} is not a finite number`);
		}
		value = numericValue(response);
	} else {
		throw new ResponseError(
			`${pyRepr(response)} is not a valid numeric response`,
		);
	}

	if (domain === "integer" && value.d !== 1n) {
		throw new ResponseError(
			`${pyRepr(response)} is not an integer, which the question's domain requires`,
		);
	}
	if (domain === "decimal" && fromFractionForm) {
		throw new ResponseError(
			`${pyRepr(response)} is a fraction, which a decimal question does not take`,
		);
	}
	return value;
}

/** Whether `response` has the shape of a numeric response (responses.md, "Numeric"). */
export function isNumericResponse(response: unknown): boolean {
	return (
		typeof response === "number" ||
		typeof response === "string" ||
		isMapping(response)
	);
}

/**
 * Score 1 if `response`, rounded to the effective decimal places, is within
 * tolerance of `answer`, else 0. An incorrect response gets
 * `incorrectFeedback`, if set (numeric.md, "Feedback").
 *
 * With neither tolerance set, the match is exact. With both, either one
 * passing is enough. The relative tolerance uses the answer before the
 * rounding, and no tolerance is rounded (numeric.md, "Tolerances").
 *
 * @throws {ResponseError} `response` is not a valid number, the domain cannot
 *   represent it, or its unit is not the key's (responses.md, "Numeric").
 */
export function scoreNumeric(
	key: NumericKey,
	response: unknown,
): QuestionScore {
	if (!isNumericResponse(response)) {
		throw new ResponseError(
			`${pyRepr(response)} is not a valid numeric response`,
		);
	}
	const { tolerance } = key;
	const domain = effectiveNumericDomain(key.answer, key.domain, tolerance);
	const places =
		key.decimalPlaces ??
		(domain === "decimal"
			? inferDecimalPlaces(key.answer, tolerance)
			: undefined);

	let value = responseValue(response, domain, key.unit);
	const exactAnswer = numericValue(key.answer);
	let target = exactAnswer;
	if (places !== undefined) {
		value = roundHalfUp(value, places);
		target = roundHalfUp(target, places);
	}
	const distance = value.sub(target).abs();

	let correct: boolean;
	if (tolerance === undefined) {
		correct = distance.equals(0);
	} else {
		correct =
			(tolerance.absolute !== undefined &&
				distance.lte(numericValue(tolerance.absolute))) ||
			(tolerance.relative !== undefined &&
				distance.lte(exactAnswer.abs().mul(numericValue(tolerance.relative))));
	}
	return {
		score: correct ? 1 : 0,
		feedback: !correct && key.incorrectFeedback ? [key.incorrectFeedback] : [],
	};
}
