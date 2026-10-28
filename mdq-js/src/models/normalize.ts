/**
 * The per-type part of `normalize` (`models/base.ts`): what a render, then a
 * parse, does to the choices, patterns, ordering alternatives and numeric
 * keys of a question. A port of the `_normalize` overrides of mdq-py
 * (`_choice.py`, `_text.py`, `_ordering.py`, `_fill_in.py`, `_numeric.py`).
 */

import { parseNumericAnswer } from "../parser/numeric.js";
import { strip } from "../parser/text.js";
import type { Question } from "../schema/index.js";

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

/** Python's `_format_number`: plain notation, and `.0` on a whole float. */
function formatNumber(value: number, isFloat: boolean): string {
	if (!isFloat) return String(value);
	const text = String(value);
	if (!/e/iu.test(text)) return text.includes(".") ? text : `${text}.0`;
	const [mantissa = "", exponent = "0"] = text.toLowerCase().split("e");
	const negative = mantissa.startsWith("-");
	const [whole = "", fraction = ""] = mantissa.replace("-", "").split(".");
	const digits = whole + fraction;
	const point = whole.length + Number(exponent);
	let plain: string;
	if (point <= 0) plain = `0.${"0".repeat(-point)}${digits}`;
	else if (point >= digits.length) {
		plain = `${digits}${"0".repeat(point - digits.length)}.0`;
	} else plain = `${digits.slice(0, point)}.${digits.slice(point)}`;
	return negative ? `-${plain}` : plain;
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
 * (`"1e3"` reads as the float 1000, written `1000.0` and read as the string
 * `"1000.0"`). A declared `domain` or `decimalPlaces` stays.
 */
function normalizeNumericKey(key: Entries): void {
	let answer = key.answer as number | string;
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
	const tolerance = key.tolerance as { absolute?: number } | undefined;
	const { domain, places } = writtenDomainAndPlaces(
		spelling,
		tolerance?.absolute,
	);
	if (key.domain === undefined) key.domain = domain;
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
