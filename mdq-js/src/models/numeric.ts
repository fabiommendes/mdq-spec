/**
 * Numeric questions and the key of a numeric fill-in blank. A port of
 * `models/_numeric.py`, the part that validates.
 *
 * Scoring and the helpers of the answer representation are NOT PORTED
 * (phase P6 of `dev/plan/mdq-js-paridade.md`).
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { ParseError } from "../errors.js";
import { hasVisibleCharacter } from "../markdown.js";
import { parseNumericAnswer } from "../parser/numeric.js";
import { repr, strip } from "../parser/text.js";
import type {
	NumericDomain,
	NumericQuestion,
	Tolerance,
} from "../schema/index.js";
import { type FamilyRules, freeTextDiagnostics, modelError } from "./base.js";

type NumericAnswer = number | string;

/** The part of a numeric question and of a numeric blank that is the key. */
type NumericKey = Pick<
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
 * numeric body's value follows. A number is finite.
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
function effectiveNumericDomain(
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

export const numericRules: FamilyRules<NumericQuestion> = {
	fields: numericKeyFields,
	models: numericKeyModels,
};
