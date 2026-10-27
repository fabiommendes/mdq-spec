/**
 * Fill-in questions and their blanks. A port of `models/_fill_in.py`.
 *
 * The validation (phase P4b), the lint rules (phase P5) and the scoring
 * (phase P6) are here. `blankAutomation` is NOT PORTED (phase P7 of
 * `dev/plan/mdq-js-paridade.md`): a stub that throws.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { NotAutoGradable, ResponseError } from "../errors.js";
import { findBlankMarkers } from "../markdown.js";
import { pyRepr, repr, typeName } from "../parser/text.js";
import type {
	Blank,
	DiacriticsType,
	FillInQuestion,
	Unmatched,
} from "../schema/index.js";
import {
	type Automation,
	checkUniqueChoices,
	choiceFreeTexts,
	type FamilyRules,
	modelError,
} from "./base.js";
import {
	checkChoiceIdsDefined,
	checkChoicesVisuallyIdentical,
	checkMultipleChoiceAnswers,
	unspecifiedChoiceScore,
} from "./choice.js";
import { lintDiagnostic } from "./lint-codes.js";
import {
	isNumericResponse,
	numericKeyFields,
	numericKeyLint,
	numericKeyModels,
	scoreNumeric,
} from "./numeric.js";
import type { QuestionScore } from "./score.js";
import {
	defaultUnmatched,
	patternKeyFields,
	patternKeyLint,
	scoreText,
} from "./text.js";

/**
 * The rules of a blank at `path`. The checks of the model of a blank are
 * part of the fields of the question: a blank that fails one fails its
 * question before the question's own checks run.
 */
function blankDiagnostics(
	blank: Blank,
	path: readonly PathStep[],
): Diagnostic[] {
	switch (blank.type) {
		case "multiple-choice": {
			const found = choiceFreeTexts(blank.choices, path);
			if (found.length > 0) return found;
			return optional(checkUniqueChoices(blank.choices, path));
		}
		case "short-answer":
			return patternKeyFields(blank, path);
		case "numeric": {
			const found = numericKeyFields(blank, path);
			if (found.length > 0) return found;
			return numericKeyModels.flatMap((check) => optional(check(blank, path)));
		}
	}
}

function optional(found: Diagnostic | undefined): Diagnostic[] {
	return found === undefined ? [] : [found];
}

/** fill-in.md: two blanks sharing an id make the stem's `[^id]` marker ambiguous. */
function checkBlanksHaveUniqueIds(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const seen = new Map<string, number>();
	for (const [index, blank] of question.blanks.entries()) {
		const first = seen.get(blank.id);
		if (first !== undefined) {
			return modelError(
				"duplicate-blank-id",
				`blank id ${repr(blank.id)} is already used by blanks[${first}]; the stem's [^${blank.id}] marker is ambiguous`,
				[...path, "blanks", index, "id"],
			);
		}
		seen.set(blank.id, index);
	}
	return undefined;
}

/**
 * fill-in.md, "Additional Rules": every `[^id]` marker of the stem refers to a
 * declared blank (`undefined-blank`), and every declared blank is referenced
 * by one (`unreferenced-blank`).
 */
function checkBlankMarkers(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const referenced = findBlankMarkers(question.stem).map(([name]) => name);
	const declared = new Set(question.blanks.map((blank) => blank.id));
	for (const name of new Set(referenced)) {
		if (declared.has(name)) continue;
		const variants = [...declared]
			.filter((id) => id.toLowerCase() === name.toLowerCase())
			.sort();
		const hint =
			variants.length > 0
				? `; blank ids are case-sensitive, did you mean [^${variants[0]}]?`
				: "";
		return modelError(
			"undefined-blank",
			`the stem references [^${name}] but no blank with that id is defined${hint}`,
			[...path, "stem"],
		);
	}
	const seen = new Set(referenced);
	for (const [index, blank] of question.blanks.entries()) {
		if (!seen.has(blank.id)) {
			return modelError(
				"unreferenced-blank",
				`blank ${repr(blank.id)} is never referenced by a [^${blank.id}] marker in the stem`,
				[...path, "blanks", index, "id"],
			);
		}
	}
	return undefined;
}

/**
 * fill-in.md, "Where blanks may appear": a `[^id]` marker appears only in a
 * plain text run of a paragraph (`misplaced-blank`).
 */
function checkBlankMarkersArePlain(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const misplaced = findBlankMarkers(question.stem).find(([, bad]) => bad);
	if (misplaced === undefined) return undefined;
	return modelError(
		"misplaced-blank",
		`[^${misplaced[0]}] must appear in a plain text run of the stem, not inside a heading, list, table, quote, emphasis, or a link`,
		[...path, "stem"],
	);
}

/** fill-in.md, "Blank definitions": each blank id appears at most once in the stem. */
function checkBlankReferencesAreUnique(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const seen = new Set<string>();
	for (const [name] of findBlankMarkers(question.stem)) {
		if (seen.has(name)) {
			return modelError(
				"duplicate-blank-reference",
				`the stem references [^${name}] more than once; each blank id may appear only once in the stem`,
				[...path, "stem"],
			);
		}
		seen.add(name);
	}
	return undefined;
}

/**
 * The lint rules of a blank at `path`. Each blank is graded like the question
 * type it names, so it inherits that type's rules.
 */
function blankLint(
	blank: Blank,
	path: readonly PathStep[],
	unmatched: Unmatched | undefined,
): Diagnostic[] {
	switch (blank.type) {
		case "multiple-choice": {
			const choices = [...path, "choices"];
			return [
				...checkMultipleChoiceAnswers(blank.choices, choices),
				...checkChoiceIdsDefined(blank.choices, choices),
				...checkChoicesVisuallyIdentical(blank.choices, choices),
			];
		}
		case "short-answer":
			return patternKeyLint(
				blank,
				path,
				defaultUnmatched(unmatched, blank.accept),
				path,
			);
		case "numeric":
			return numericKeyLint(blank, path);
	}
}

/**
 * fill-in.md, "Blank definitions": blank ids are compared exactly, so two ids
 * that differ only in ASCII case are two blanks, which CommonMark would merge
 * (`case-variant-blank-id`).
 */
function checkCaseVariantBlankIds(blankIds: readonly string[]): Diagnostic[] {
	const firstByFolded = new Map<string, string>();
	const found: Diagnostic[] = [];
	for (const [index, blankId] of blankIds.entries()) {
		const folded = blankId.toLowerCase();
		const first = firstByFolded.get(folded);
		if (first === undefined) {
			firstByFolded.set(folded, blankId);
		} else if (first !== blankId) {
			found.push(
				lintDiagnostic(
					"case-variant-blank-id",
					["blanks", index, "id"],
					`blank id ${repr(blankId)} differs from ${repr(first)} only in case; blank ids are case-sensitive, but CommonMark labels are not`,
				),
			);
		}
	}
	return found;
}

export const fillInRules: FamilyRules<FillInQuestion> = {
	lint: (question) => [
		...checkCaseVariantBlankIds(question.blanks.map((blank) => blank.id)),
		...question.blanks.flatMap((blank, index) =>
			blankLint(blank, ["blanks", index], question.unmatched),
		),
	],
	fields: (question, path) =>
		question.blanks.flatMap((blank, index) =>
			blankDiagnostics(blank, [...path, "blanks", index]),
		),
	models: [
		checkBlanksHaveUniqueIds,
		checkBlankMarkers,
		checkBlankMarkersArePlain,
		checkBlankReferencesAreUnique,
	],
};

/**
 * The `unmatched` of a short answer blank, given the `unmatched` of its
 * question.
 */
export function blankEffectiveUnmatched(
	blank: Blank,
	unmatched: Unmatched | undefined,
): Unmatched {
	return defaultUnmatched(
		unmatched,
		blank.type === "short-answer" ? blank.accept : undefined,
	);
}

/** The automation of a blank, given the `unmatched` of its question. */
export function blankAutomation(
	_blank: Blank,
	_unmatched: Unmatched | undefined,
): Automation {
	throw new Error("not ported (P7)");
}

//
// Scoring
//

/**
 * The response to one blank, scored. `undefined` means pending: the
 * instructor has to score it.
 */
function scoreBlank(
	blank: Blank,
	response: unknown,
	options: {
		readonly symmetric: boolean;
		readonly diacritics: DiacriticsType;
		readonly unmatched: Unmatched | undefined;
	},
): QuestionScore | undefined {
	switch (blank.type) {
		case "multiple-choice": {
			const choice =
				typeof response === "string"
					? blank.choices.find((candidate) => candidate.id === response)
					: undefined;
			if (choice === undefined) {
				throw new ResponseError(
					`Response id ${pyRepr(response)} not found in blank ${repr(blank.id)}`,
				);
			}
			return {
				score:
					choice.score ??
					unspecifiedChoiceScore(blank.choices, options.symmetric),
				feedback: choice.feedback ? [choice.feedback] : [],
			};
		}
		case "short-answer":
			if (typeof response !== "string") {
				throw new ResponseError(
					`Response ${pyRepr(response)} to blank ${repr(blank.id)} is not text`,
				);
			}
			return scoreText(blank, response, {
				unmatched: blankEffectiveUnmatched(blank, options.unmatched),
				diacritics: options.diacritics,
				incorrectFeedback: blank.incorrectFeedback,
			});
		case "numeric":
			if (!isNumericResponse(response)) {
				throw new ResponseError(
					`Response ${pyRepr(response)} to blank ${repr(blank.id)} is not numeric`,
				);
			}
			return scoreNumeric(blank, response);
	}
}

/**
 * Check a fill-in response: a mapping whose keys are blank ids.
 *
 * @throws {ResponseError} The response is not a mapping, or a key names no blank.
 */
function parseFillIn(
	question: FillInQuestion,
	response: unknown,
): Readonly<Record<string, unknown>> {
	const notAMapping = new ResponseError(
		`A fill-in response must be a mapping of blank ids, found ${typeName(response)}`,
	);
	if (typeof response !== "object" || response === null) throw notAMapping;
	const known = new Set(question.blanks.map((blank) => blank.id));
	const keys = Array.isArray(response)
		? response.map((item) => (typeof item === "string" ? item : pyRepr(item)))
		: Object.keys(response);
	const unknown = keys.filter((key) => !known.has(key)).sort();
	if (unknown.length > 0) {
		throw new ResponseError(
			`Blank ids ${pyRepr(unknown)} not found in the question`,
		);
	}
	if (Array.isArray(response)) throw notAMapping;
	return response as Record<string, unknown>;
}

/**
 * Score each blank independently and combine by `grading`. A blank with no
 * key, or a `null` value, is empty and scores 0 (fill-in.md, "Grading"); `{}`
 * is a response with every blank empty.
 *
 * @throws {ResponseError} The response is malformed, or a blank's response
 *   does not match its type.
 * @throws {NotAutoGradable} A short answer blank response is pending.
 */
export function scoreFillIn(
	question: FillInQuestion,
	response: unknown,
): QuestionScore {
	const answers = parseFillIn(question, response);
	const grading =
		question.grading === undefined || question.grading === "inherit"
			? "symmetric"
			: question.grading;
	const filled = (id: string): unknown =>
		Object.hasOwn(answers, id) ? (answers[id] ?? undefined) : undefined;

	const scores: number[] = [];
	const feedback: string[] = [];
	const pending: string[] = [];
	for (const blank of question.blanks) {
		const answer = filled(blank.id);
		if (answer === undefined) {
			scores.push(0);
			continue;
		}
		const result = scoreBlank(blank, answer, {
			symmetric: grading === "symmetric",
			diacritics: question.diacritics ?? "fold",
			unmatched: question.unmatched,
		});
		if (result === undefined) {
			// The instructor scores a pending blank; the question stays
			// pending, but the other blanks are still checked.
			pending.push(blank.id);
			continue;
		}
		scores.push(result.score);
		feedback.push(...result.feedback);
	}
	if (pending.length > 0) {
		throw new NotAutoGradable(
			`the response to blank ${repr(pending[0] ?? "")} is pending: it matches no pattern and 'unmatched' is 'manual'`,
		);
	}

	const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
	let score: number;
	switch (grading) {
		case "all-or-nothing":
			score = scores.every((value) => value === 1) ? 1 : 0;
			break;
		case "no-mistakes": {
			// An empty blank scores 0 but is no mistake: only a filled blank
			// below 1 zeroes the question.
			const mistaken = question.blanks.some(
				(blank, index) =>
					(scores[index] ?? 0) < 1 && filled(blank.id) !== undefined,
			);
			score = mistaken ? 0 : mean;
			break;
		}
		case "partial":
			score = Math.max(0, mean);
			break;
		default:
			score = mean;
	}
	return { score, feedback };
}
