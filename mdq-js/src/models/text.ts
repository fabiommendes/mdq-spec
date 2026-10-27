/**
 * Short answer and essay questions. A port of `models/_text.py`.
 *
 * The pattern matching (phase P3 of `dev/plan/mdq-js-paridade.md`), the
 * validation (phase P4b), the lint rules (phase P5) and the scoring (phase P6)
 * are here.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { NotAutoGradable, ResponseError } from "../errors.js";
import { exactLiteral } from "../exact.js";
import tables from "../inexact-tables.json";
import { hasVisibleCharacter, startsBlock } from "../markdown.js";
import { findAnswerKeyForbiddenElements } from "../parser/blocks.js";
import { repr, strip, typeName, UNICODE_SPACE } from "../parser/text.js";
import type {
	DiacriticsType,
	EssayQuestion,
	PatternEntry,
	ShortAnswerBlank,
	ShortAnswerQuestion,
	Unmatched,
} from "../schema/index.js";
import {
	type Automation,
	type FamilyRules,
	freeTextDiagnostics,
	freeTextFields,
	modelError,
} from "./base.js";
import { checkCodeHighlight, checkUnsafeThematicBreak } from "./lint.js";
import { lintDiagnostic } from "./lint-codes.js";
import {
	escapedCodePoints,
	IGNORED_FLAGS,
	InvalidRegexError,
	parseRegex,
	RegexPattern,
	normalizeText as stripMarks,
} from "./regex.js";
import type { QuestionScore } from "./score.js";

/** The `unmatched` of a short answer question once the default is applied. */
export function effectiveUnmatched(question: ShortAnswerQuestion): Unmatched {
	return defaultUnmatched(question.unmatched, question.accept);
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
 * The automation of a short answer (short-answer.md, "Automation").
 * `unmatched` is the effective value; `preAccept` and `preReject` do not
 * count.
 */
export function shortAnswerAutomation(
	unmatched: Unmatched,
	accept: readonly PatternEntry[] | undefined,
	reject: readonly PatternEntry[] | undefined,
): Automation {
	if (unmatched === "incorrect") return "automatic";
	return (accept?.length ?? 0) > 0 || (reject?.length ?? 0) > 0
		? "semi-automatic"
		: "manual";
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

/**
 * Return `response` if it is a string (`docs/responses.md`, "Short answer
 * and essay"). A number is not converted: `1.0` and `1` would become
 * different texts.
 *
 * @throws {ResponseError} If `response` is not a string.
 */
export function parseTextResponse(response: unknown): string {
	if (typeof response !== "string") {
		throw new ResponseError(
			`A text response must be a string, found ${typeName(response)}`,
		);
	}
	return response;
}

/**
 * Score a response to a short answer question.
 *
 * @throws {ResponseError} The response is not a string.
 * @throws {NotAutoGradable} The response matches no pattern and `unmatched`
 *   is `"manual"`.
 */
export function scoreShortAnswer(
	question: ShortAnswerQuestion,
	response: unknown,
): QuestionScore {
	const result = scoreText(question, parseTextResponse(response), {
		unmatched: effectiveUnmatched(question),
		diacritics: question.diacritics ?? "fold",
		incorrectFeedback: question.incorrectFeedback,
	});
	if (result === undefined) {
		throw new NotAutoGradable(
			"the response matches no pattern and 'unmatched' is 'manual'",
		);
	}
	return result;
}

/**
 * An essay is never gradable automatically.
 *
 * @throws {ResponseError} The response is not a string.
 * @throws {NotAutoGradable} Always, for a well-formed response.
 */
export function scoreEssay(
	_question: EssayQuestion,
	response: unknown,
): QuestionScore {
	parseTextResponse(response);
	throw new NotAutoGradable("essay questions require manual grading");
}

/** The result of `prevalidate`: whether to accept a submission, and why not. */
export interface Prevalidation {
	readonly valid: boolean;
	/** The pattern feedback shown for an invalid submission, if any. */
	readonly feedback: string | null;
}

/**
 * Apply the pre-validation rules of short-answer.md. A response is invalid
 * when it matches a `preReject` pattern, or when `preAccept` is declared and
 * it matches none of its patterns. The feedback of an invalid response is, in
 * order: the first matching `preReject` pattern with feedback; else, if no
 * `preAccept` pattern matches, the first `preAccept` pattern with feedback.
 */
export function prevalidateText(
	key: Pick<ShortAnswerQuestion | ShortAnswerBlank, "preAccept" | "preReject">,
	response: string,
	diacritics: DiacriticsType = "fold",
): Prevalidation {
	const preReject = key.preReject ?? [];
	if (preReject.some((rule) => matches(rule, response, diacritics))) {
		return {
			valid: false,
			feedback: firstFeedback(preReject, response, diacritics)[0] ?? null,
		};
	}
	const preAccept = key.preAccept ?? [];
	if (
		preAccept.length > 0 &&
		!preAccept.some((rule) => matches(rule, response, diacritics))
	) {
		const hint = preAccept.find(
			(rule) => typeof rule !== "string" && rule.feedback !== undefined,
		);
		return {
			valid: false,
			feedback: typeof hint === "string" ? null : (hint?.feedback ?? null),
		};
	}
	return { valid: true, feedback: null };
}

//
// Validation
//

/** The pattern lists of a short answer key, in the order Pydantic validates them. */
const PATTERN_LISTS = ["accept", "reject", "preAccept", "preReject"] as const;

/**
 * patterns.md, "Pattern string": one entry of a pattern list that opens with
 * a backtick is a complete exact literal (`schema-error`), and an inexact
 * pattern does not start a Markdown block (`block-start-pattern`).
 */
function patternStringDiagnostic(
	pattern: string,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (
		strip(pattern, " \t").startsWith("`") &&
		exactLiteral(pattern) === undefined
	) {
		return modelError(
			"schema-error",
			"a pattern that opens with a backtick must be a complete exact literal: a run of the same number of backticks closes it, and nothing follows the closing run",
			path,
		);
	}
	if (startsBlock(pattern)) {
		return modelError(
			"block-start-pattern",
			`an inexact pattern cannot start a markdown block (a block quote, heading, list, fence, HTML block or thematic break): write an exact literal, \`\` \`${strip(pattern, " \t")}\` \`\`, or a regex`,
			path,
		);
	}
	return undefined;
}

/**
 * The rules of one entry of a pattern list at `path`. The field rules (the
 * `feedback` and `comment`, the pattern string) report together. Only if none
 * fails, the first failing rule of the whole entry reports, at the entry:
 * a pattern with no visible character (`blank-text`) or a regex that does not
 * compile (`invalid-regex`).
 */
function patternEntryDiagnostics(
	entry: PatternEntry,
	path: readonly PathStep[],
): Diagnostic[] {
	const isString = typeof entry === "string";
	const pattern = isString ? entry : entry.pattern;
	const fields = isString
		? []
		: freeTextFields(entry, ["feedback", "comment"], path);
	const problem = patternStringDiagnostic(
		pattern,
		isString ? path : [...path, "pattern"],
	);
	if (problem !== undefined) fields.push(problem);
	if (fields.length > 0) return fields;

	const text = strip(pattern, " \t");
	const exact = exactLiteral(text);
	if (!hasVisibleCharacter(exact ?? text)) {
		return [modelError("blank-text", "pattern has no visible character", path)];
	}
	if (text.startsWith("/")) {
		try {
			new RegexPattern(pattern);
		} catch (error) {
			if (error instanceof InvalidRegexError) {
				return [
					modelError(
						"invalid-regex",
						`regex does not compile: ${error.message}`,
						path,
					),
				];
			}
			throw error;
		}
	}
	return [];
}

/**
 * The validation of the pattern lists and of `incorrectFeedback` of a short
 * answer key, which a short answer question and a short answer blank share.
 *
 * @param path Where the key sits in the document.
 */
export function patternKeyFields(
	key: Readonly<{
		accept?: readonly PatternEntry[];
		reject?: readonly PatternEntry[];
		preAccept?: readonly PatternEntry[];
		preReject?: readonly PatternEntry[];
		incorrectFeedback?: string;
	}>,
	path: readonly PathStep[],
): Diagnostic[] {
	return [
		...freeTextDiagnostics(key.incorrectFeedback, "incorrectFeedback", [
			...path,
			"incorrectFeedback",
		]),
		...PATTERN_LISTS.flatMap((list) =>
			(key[list] ?? []).flatMap((entry, index) =>
				patternEntryDiagnostics(entry, [...path, list, index]),
			),
		),
	];
}

//
// Lint
//

/**
 * short-answer.md, "Regex flags": a leading `^` is implicit unless the `f`
 * flag is set, and a trailing `$` is implicit unless `f` or `b` is set. A `$`
 * after an odd number of backslashes is a literal.
 */
function redundantRegexAnchor(
	body: string,
	flags: string,
	path: readonly PathStep[],
): Diagnostic[] {
	const leading = body.startsWith("^") && !flags.includes("f");
	let trailing = false;
	if (body.endsWith("$") && !flags.includes("f") && !flags.includes("b")) {
		const backslashes = /\\*$/u.exec(body.slice(0, -1))?.[0].length ?? 0;
		trailing = backslashes % 2 === 0;
	}
	if (!(leading || trailing)) return [];
	return [
		lintDiagnostic(
			"redundant-regex-anchor",
			path,
			"matching is already anchored here, so a leading '^' or trailing '$' is redundant",
		),
	];
}

/** short-answer.md:385: `m`, `g`, `s`, `u`, `v`, `y` and `d` have no effect. */
function ignoredRegexFlags(
	flags: string,
	path: readonly PathStep[],
): Diagnostic[] {
	const ignored = [...new Set(flags)].filter((flag) => IGNORED_FLAGS.has(flag));
	if (ignored.length === 0) return [];
	const listed = ignored
		.sort()
		.map((flag) => repr(flag))
		.join(", ");
	return [
		lintDiagnostic(
			"ignored-regex-flag",
			path,
			`flag(s) ${listed} are accepted but have no effect on matching`,
		),
	];
}

/**
 * patterns.md, "Regex flags": under `n`, an escape for a code point that the
 * strip changes can never match. One diagnostic per pattern.
 */
function unmatchableRegexEscape(
	body: string,
	flags: string,
	path: readonly PathStep[],
): Diagnostic[] {
	if (!flags.includes("n")) return [];
	const stripped = escapedCodePoints(body).some((codePoint) => {
		const char = String.fromCodePoint(codePoint);
		return stripMarks(char) !== char;
	});
	if (!stripped) return [];
	return [
		lintDiagnostic(
			"unmatchable-regex-escape",
			path,
			"the 'n' flag strips diacritics from the response, so an escape for a code point that the strip changes cannot match",
		),
	];
}

/**
 * short-answer.md, "Additional Rules": the regex lints over the four pattern
 * lists, at the frontmatter key (`preAccept`, 0).
 */
function regexLint(
	key: Readonly<{
		[list in (typeof PATTERN_LISTS)[number]]?: readonly PatternEntry[];
	}>,
	path: readonly PathStep[],
): Diagnostic[] {
	const found: Diagnostic[] = [];
	for (const list of ["accept", "preAccept", "reject", "preReject"] as const) {
		for (const [index, entry] of (key[list] ?? []).entries()) {
			const pattern = patternString(entry);
			if (patternKind(pattern) !== "regex") continue;
			let parsed: [string, string];
			try {
				parsed = parseRegex(pattern);
			} catch (error) {
				if (error instanceof InvalidRegexError) continue;
				throw error;
			}
			const [body, flags] = parsed;
			const where = [...path, list, index];
			found.push(
				...redundantRegexAnchor(body, flags, where),
				...ignoredRegexFlags(flags, where),
				...unmatchableRegexEscape(body, flags, where),
			);
		}
	}
	return found;
}

/**
 * The lint rules of a short answer key, which a short answer question and a
 * blank share: the regex lints, and `no-correct-answer` when `unmatched` (the
 * effective one, declared at `unmatchedPath`) is `incorrect` without `accept`.
 *
 * @param path Where the key sits in the document.
 */
export function patternKeyLint(
	key: Readonly<{
		accept?: readonly PatternEntry[];
		reject?: readonly PatternEntry[];
		preAccept?: readonly PatternEntry[];
		preReject?: readonly PatternEntry[];
	}>,
	path: readonly PathStep[],
	unmatched: Unmatched,
	unmatchedPath: readonly PathStep[],
): Diagnostic[] {
	const found = regexLint(key, path);
	if (unmatched === "incorrect" && !key.accept?.length) {
		found.push(
			lintDiagnostic(
				"no-correct-answer",
				unmatchedPath,
				"'unmatched' is 'incorrect' but no 'accept' pattern is given: no response can be correct",
			),
		);
	}
	return found;
}

export const shortAnswerRules: FamilyRules<ShortAnswerQuestion> = {
	fields: patternKeyFields,
	lint: (question) =>
		patternKeyLint(
			question,
			[],
			defaultUnmatched(question.unmatched, question.accept),
			["unmatched"],
		),
};

/** essay.md, "Answer key": the section holds any block except an H1. */
function checkAnswerKeyHasNoH1(
	question: EssayQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (!question.answerKey) return undefined;
	const [description] = findAnswerKeyForbiddenElements(question.answerKey);
	if (description === undefined) return undefined;
	return modelError(
		"forbidden-block-element",
		`'answerKey' holds ${description}, which essay.md's "Answer key" does not allow`,
		[...path, "answerKey"],
	);
}

export const essayRules: FamilyRules<EssayQuestion> = {
	fields: (question, path) =>
		freeTextDiagnostics(question.answerKey, "answerKey", [
			...path,
			"answerKey",
		]),
	models: [checkAnswerKeyHasNoH1],
	lint: (question) => [
		...checkCodeHighlight(question.content, question.highlight),
		...(question.answerKey === undefined
			? [
					lintDiagnostic(
						"missing-answer-key",
						["answerKey"],
						"'answerKey' is not defined",
					),
				]
			: []),
		...checkUnsafeThematicBreak(question.answerKey, ["answerKey"]),
	],
};
