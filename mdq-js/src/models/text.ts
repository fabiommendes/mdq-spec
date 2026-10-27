/**
 * Short answer and essay questions. A port of `models/_text.py`.
 *
 * PARTLY PORTED: the pattern matching (phase P3 of
 * `dev/plan/mdq-js-paridade.md`) is here. The rest is a stub that throws
 * (phase P7).
 */

import { exactLiteral } from "../exact.js";
import tables from "../inexact-tables.json";
import { UNICODE_SPACE } from "../parser/text.js";
import type {
	DiacriticsType,
	PatternEntry,
	ShortAnswerQuestion,
	Unmatched,
} from "../schema/index.js";
import { RegexPattern, normalizeText as stripMarks } from "./regex.js";
import type { QuestionScore } from "./score.js";

/** The `unmatched` of a short answer question once the default is applied. */
export function effectiveUnmatched(_question: ShortAnswerQuestion): Unmatched {
	throw new Error("not ported (P7)");
}

//
// Pattern matching
//
const SPACE_RUN_RE = new RegExp(`[${UNICODE_SPACE}]+`, "gu");
const SPACE_ENDS_RE = new RegExp(
	`^[${UNICODE_SPACE}]+|[${UNICODE_SPACE}]+$`,
	"gu",
);

/** The code points in the ranges of the `ignorable` table. */
const IGNORABLE: ReadonlySet<number> = new Set(
	(tables.ignorable as [number, number][]).flatMap(([first, last]) =>
		Array.from({ length: last - first + 1 }, (_, i) => first + i),
	),
);

/** A replacement table: a code point to the text that replaces it. */
type Replacements = ReadonlyMap<number, string>;

function replacements(table: Record<string, string>): Replacements {
	return new Map(
		Object.entries(table).map(([key, value]) => [
			key.codePointAt(0) ?? 0,
			value,
		]),
	);
}

const LETTERS = replacements(tables.letters);
const PUNCTUATION = replacements(tables.punctuation);
const CASE_FOLDING = replacements(tables.caseFolding);

/** Replace each code point of `text` once, as `str.translate` does. */
function translate(text: string, table: Replacements): string {
	let result = "";
	for (const char of text) {
		result += table.get(char.codePointAt(0) ?? 0) ?? char;
	}
	return result;
}

/** Remove the `UNICODE_SPACE` code points from both ends of `value`. */
function trimSpace(value: string): string {
	return value.replace(SPACE_ENDS_RE, "");
}

/** NFC, then trim `UNICODE_SPACE` from both ends (patterns.md, "Exact literals"). */
function exactForm(value: string): string {
	return trimSpace(value.normalize("NFC"));
}

/**
 * Normalize `value` for the inexact literal comparison of `matches`
 * (patterns.md, "Inexact literals").
 *
 * Steps, in order: NFKC; remove the ignorable code points; if `diacritics`
 * is `"fold"`, NFD, remove the `nonspacing` table, NFC and replace the
 * `letters` table; replace the `punctuation` table; replace the
 * `caseFolding` table and NFC; collapse each run of `UNICODE_SPACE` to one
 * U+0020 and trim U+0020 from the ends. The tables come from
 * `inexact-tables.json`, never from `toLowerCase`.
 */
export function normalizeText(
	value: string,
	diacritics: DiacriticsType = "fold",
): string {
	let text = "";
	for (const char of value.normalize("NFKC")) {
		if (!IGNORABLE.has(char.codePointAt(0) ?? 0)) text += char;
	}
	if (diacritics === "fold") text = translate(stripMarks(text), LETTERS);
	text = translate(text, PUNCTUATION);
	text = translate(text, CASE_FOLDING).normalize("NFC");
	return text.replace(SPACE_RUN_RE, " ").replace(/^ +| +$/gu, "");
}

/** The pattern string of an `accept`/`reject` entry. */
export function patternString(entry: PatternEntry): string {
	return typeof entry === "string" ? entry : entry.pattern;
}

/** How a pattern is read: see patterns.md, "Pattern string". */
export type PatternKind = "regex" | "exact" | "inexact";

/**
 * How `pattern` is read: a regex when it starts with `/` after stripping
 * spaces and tabs, an exact literal when it is a complete code span, inexact
 * otherwise.
 */
export function patternKind(pattern: string): PatternKind {
	const text = pattern.replace(/^[ \t]+|[ \t]+$/gu, "");
	if (text.startsWith("/")) return "regex";
	return exactLiteral(text) === undefined ? "inexact" : "exact";
}

const REGEX_CACHE = new Map<string, RegexPattern>();

/**
 * The compiled regex of a `regex` pattern.
 *
 * @throws {InvalidRegexError} If the regex does not compile.
 */
export function compiledRegex(pattern: string): RegexPattern {
	let compiled = REGEX_CACHE.get(pattern);
	if (compiled === undefined) {
		compiled = new RegexPattern(pattern);
		REGEX_CACHE.set(pattern, compiled);
	}
	return compiled;
}

/**
 * Report whether `response` satisfies the pattern of `entry`.
 *
 * A backtick-enclosed literal is compared code point for code point after
 * two steps, in order, on the response and on the pattern content: NFC (not
 * NFKC), then removal of `UNICODE_SPACE` code points from both ends
 * (patterns.md, "Exact literals"). A bare literal is compared after
 * `normalizeText`, which `diacritics` tunes. A regex sees the response in NFC
 * with the `UNICODE_SPACE` ends removed, and its own flags decide the rest
 * (patterns.md, "Regex"). Neither the regex nor the backtick form consults
 * `diacritics`.
 */
export function matches(
	entry: PatternEntry,
	response: string,
	diacritics: DiacriticsType = "fold",
): boolean {
	const pattern = patternString(entry);
	const text = pattern.replace(/^[ \t]+|[ \t]+$/gu, "");
	if (patternKind(pattern) === "regex")
		return compiledRegex(pattern).match(response);
	const exact = exactLiteral(text);
	if (exact !== undefined) return exactForm(response) === exactForm(exact);
	return (
		normalizeText(response, diacritics) === normalizeText(text, diacritics)
	);
}

/**
 * Apply the three grading rules of short-answer.md in order: an `accept`
 * match is correct, a `reject` match is incorrect, and otherwise `unmatched`
 * decides (`"manual"` leaves the response pending).
 */
export function settleResponse(
	accept: readonly PatternEntry[] | undefined,
	reject: readonly PatternEntry[] | undefined,
	response: string,
	unmatched: Unmatched,
	diacritics: DiacriticsType = "fold",
): "correct" | "incorrect" | "pending" {
	if ((accept ?? []).some((rule) => matches(rule, response, diacritics))) {
		return "correct";
	}
	if ((reject ?? []).some((rule) => matches(rule, response, diacritics))) {
		return "incorrect";
	}
	return unmatched === "incorrect" ? "incorrect" : "pending";
}

/**
 * The feedback of the first matching pattern that defines one. "First that
 * matches AND carries feedback" is not the same as "first that matches": an
 * earlier match with no message is passed over.
 */
export function firstFeedback(
	patterns: readonly PatternEntry[],
	response: string,
	diacritics: DiacriticsType = "fold",
): string[] {
	for (const rule of patterns) {
		if (
			typeof rule !== "string" &&
			rule.feedback !== undefined &&
			matches(rule, response, diacritics)
		) {
			return [rule.feedback];
		}
	}
	return [];
}

/** The `unmatched` declared, or its default: `"incorrect"` with an `accept`. */
export function defaultUnmatched(
	unmatched: Unmatched | undefined,
	accept: readonly PatternEntry[] | undefined,
): Unmatched {
	if (unmatched !== undefined) return unmatched;
	return accept !== undefined && accept.length > 0 ? "incorrect" : "manual";
}

/**
 * Score the response by the three rules of short-answer.md, "Grading": an
 * `accept` match scores 1, a `reject` match scores 0, and otherwise
 * `unmatched` decides. `undefined` means pending: the response matches no
 * pattern and `unmatched` is `"manual"`.
 *
 * An incorrect response with no pattern feedback gets `incorrectFeedback`,
 * if set.
 */
export function scoreText(
	key: {
		readonly accept?: readonly PatternEntry[] | undefined;
		readonly reject?: readonly PatternEntry[] | undefined;
	},
	response: string,
	options: {
		readonly unmatched: Unmatched;
		readonly diacritics: DiacriticsType;
		readonly incorrectFeedback?: string | undefined;
	},
): QuestionScore | undefined {
	const { unmatched, diacritics, incorrectFeedback } = options;
	const outcome = settleResponse(
		key.accept,
		key.reject,
		response,
		unmatched,
		diacritics,
	);
	if (outcome === "pending") return undefined;
	let feedback = firstFeedback(
		(outcome === "correct" ? key.accept : key.reject) ?? [],
		response,
		diacritics,
	);
	if (outcome === "incorrect" && feedback.length === 0 && incorrectFeedback) {
		feedback = [incorrectFeedback];
	}
	return { score: outcome === "correct" ? 1 : 0, feedback };
}
