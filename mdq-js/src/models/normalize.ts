/**
 * The per-type part of `normalize` (`models/base.ts`): what a render, then a
 * parse, does to the choices, patterns, ordering alternatives and numeric
 * keys of a question. A port of the `_normalize` overrides of mdq-py
 * (`_choice.py`, `_text.py`, `_ordering.py`, `_fill_in.py`, `_numeric.py`).
 */

import { parseNumericAnswer } from "../parser/numeric.js";
import { strip } from "../parser/text.js";
import type { Tolerance } from "../schema/common.js";
import type { Question } from "../schema/index.js";
import { effectiveNumericDomain } from "./numeric.js";

const ASCII_WS = " \t\r\n";

type Entries = Record<string, unknown>;

const INT32_MAX = 2 ** 31 - 1;

/** `text` without the ASCII whitespace the parser trims; absent if nothing is left. */
function stripOptional(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	return strip(value, ASCII_WS) || undefined;
}

/** A copy of `entry` whose `feedback` and `comment` are trimmed (dropped if empty). */
function trimFeedback(entry: Entries): Entries {
	const copy: Entries = { ...entry };
	for (const key of ["feedback", "comment"]) {
		if (!(key in copy)) continue;
		const value = stripOptional(copy[key]);
		if (value === undefined) delete copy[key];
		else copy[key] = value;
	}
	return copy;
}

function trimChoices(choices: readonly Entries[]): Entries[] {
	return choices.map((choice) => ({
		...trimFeedback(choice),
		text: strip(String(choice.text), ASCII_WS),
	}));
}

function trimPattern(entry: unknown): unknown {
	if (typeof entry === "string") return strip(entry, ASCII_WS);
	const rule = trimFeedback(entry as Entries);
	rule.pattern = strip(String(rule.pattern), ASCII_WS);
	return rule;
}

/** Trim the `accept` and `reject` entries; `preAccept` and `preReject` stay. */
function trimPatterns(key: Entries): void {
	for (const field of ["accept", "reject"]) {
		const rules = key[field];
		if (Array.isArray(rules)) key[field] = rules.map(trimPattern);
	}
}

/** A whole number with no `.0` in Python is an `int`; a JS number cannot tell, so anything outside int32 is a float. */
function isIntegerAnswer(value: number): boolean {
	return Number.isInteger(value) && Math.abs(value) <= INT32_MAX;
}

/**
 * Python's `_format_number`. An integer is plain. A whole float is written as
 * `d[.ddd]eN` (`1000.0` is `1e3`), because `1000.0` reads back as a decimal
 * string and `1e3` as the float. A fractional float is positional (`0.25`),
 * unless it is below `1e-4`, which gets the same exponent form (`1e-7`). The
 * mantissa is the shortest digit string that reads back as the same float.
 */
function formatNumber(value: number, isFloat: boolean): string {
	if (!isFloat) return String(value);
	const negative = value < 0 || Object.is(value, -0);
	const [mantissa = "", exponent = "0"] = Math.abs(value)
		.toExponential()
		.split("e");
	const digits = mantissa.replace(".", "");
	const scientific = digits === "0" ? 0 : Number(exponent);
	const lastDigit = scientific - (digits.length - 1);
	const text =
		lastDigit < 0 && digits !== "0" && scientific >= -4
			? String(Math.abs(value))
			: `${digits[0]}${digits.length > 1 ? `.${digits.slice(1)}` : ""}e${scientific}`;
	return negative ? `-${text}` : text;
}

/** Python's `_format_tolerance`: a whole value is written as an integer. */
function formatTolerance(value: number): string {
	return Number.isInteger(value) ? String(value) : formatNumber(value, true);
}

/** numeric.md, "Decimal places": `max(0, d - e)` for a spelling. */
function spellingPlaces(spelling: string): number {
	const [mantissa = "", exponent = ""] = spelling.toLowerCase().split("e");
	const digits = mantissa.includes(".")
		? (mantissa.split(".")[1] ?? "").length
		: 0;
	return Math.max(0, digits - Number(exponent || 0));
}

/**
 * The domain and decimal places the parser reads from the tag a render writes
 * for `spelling` and the absolute tolerance. The places are `undefined` for a
 * fraction that the tolerance gives none.
 */
function writtenDomainAndPlaces(
	spelling: string,
	absolute: number | undefined,
): { domain: string; places: number | undefined } {
	const value = spelling.replace(/^[+-]+/u, "");
	const isFraction = value.includes("/");
	const tolerance =
		absolute === undefined ? undefined : formatTolerance(absolute);
	const toleranceIsDecimal =
		tolerance !== undefined && /[.eE]/u.test(tolerance);
	const valueIsDecimal = !isFraction && /[.eE]/u.test(value);
	let domain = "integer";
	if (isFraction) domain = "fraction";
	if (valueIsDecimal || toleranceIsDecimal) domain = "decimal";
	const toleranceplaces =
		tolerance === undefined ? 0 : spellingPlaces(tolerance);
	if (isFraction) return { domain, places: toleranceplaces || undefined };
	return { domain, places: Math.max(spellingPlaces(value), toleranceplaces) };
}

/**
 * Put `answer`, `domain` and `decimalPlaces` of a numeric question or blank in
 * the form a render and parse keep. The answer is read again from the
 * spelling a render writes, until it is the value its own spelling reads
 * (`"1000.0"` is a string, so it reads as itself; the float 1000 is written
 * `1e3`). A declared `domain` or `decimalPlaces` stays.
 */
function normalizeNumericKey(key: Entries): void {
	let answer = key.answer as number | string;
	const tolerance = key.tolerance as Tolerance | undefined;
	// The inferred domain, which a render writes when the tag reads back as
	// another one (a whole float is an integer, but its tag `1e3` is a decimal).
	const inferred = effectiveNumericDomain(answer, undefined, tolerance);
	let isFloat = typeof answer === "number" && !isIntegerAnswer(answer);
	let spelling: string;
	for (;;) {
		spelling =
			typeof answer === "string" ? answer : formatNumber(answer, isFloat);
		const reread = parseNumericAnswer(spelling);
		if (typeof reread === typeof answer && reread === answer) break;
		answer = reread;
		isFloat = typeof reread === "number" && /[.eE]/u.test(spelling);
	}
	key.answer = answer;
	const { places } = writtenDomainAndPlaces(spelling, tolerance?.absolute);
	if (key.domain === undefined) key.domain = inferred;
	if (
		key.decimalPlaces === undefined &&
		key.domain === "decimal" &&
		places !== undefined
	) {
		key.decimalPlaces = places;
	}
}

function normalizeBlank(blank: Entries): Entries {
	const copy: Entries = { ...blank };
	if (copy.type === "multiple-choice") {
		copy.choices = trimChoices(copy.choices as Entries[]);
	} else if (copy.type === "short-answer") trimPatterns(copy);
	else if (copy.type === "numeric") normalizeNumericKey(copy);
	return copy;
}

/**
 * Apply to `copy`, a shallow copy of `question`, what a render and parse do to
 * the fields that belong to its type.
 */
export function normalizeByType(question: Question, copy: Entries): void {
	switch (question.type) {
		case "multiple-choice":
		case "multiple-selection":
			copy.choices = trimChoices(question.choices);
			break;
		case "true-false":
			copy.choices = trimChoices(question.choices).map((choice) => ({
				...choice,
				marker: choice.marker ?? (choice.correct ? "T" : "F"),
			}));
			break;
		case "short-answer":
			trimPatterns(copy);
			break;
		case "numeric":
			normalizeNumericKey(copy);
			break;
		case "ordering":
			for (const field of ["accept", "reject"]) {
				const rules = copy[field];
				if (Array.isArray(rules)) copy[field] = rules.map(trimFeedback);
			}
			break;
		case "fill-in":
			copy.blanks = question.blanks.map(normalizeBlank);
			break;
		case "essay":
			break;
	}
}
