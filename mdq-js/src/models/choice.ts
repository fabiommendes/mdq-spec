/**
 * Choice-based questions: multiple-choice, multiple-selection and
 * true-false. A port of `models/_choice.py`: validation, lint and scoring.
 *
 * The rules are `FamilyRules` (`models/base.ts`) that `FAMILY_RULES`
 * (`models/exam.ts`) registers. `checkUniqueChoices` and `choiceFreeTexts`
 * (`models/base.ts`) also serve a fill-in choice blank.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { ResponseError } from "../errors.js";
import {
	FALSE_LETTERS,
	isLetter,
	LOCALE_ROWS,
	nfkc,
	normalizeValue,
	TRUE_LETTERS,
} from "../letters.js";
import { pyRepr, repr, strip, typeName } from "../parser/text.js";
import type {
	MultipleChoiceQuestion,
	MultipleSelectionQuestion,
	TrueFalseQuestion,
} from "../schema/questions.js";
import {
	checkUniqueChoices,
	choiceFreeTexts,
	type FamilyRules,
	modelError,
} from "./base.js";
import { languageSubtag, renderVisualKey } from "./lint.js";
import { lintDiagnostic } from "./lint-codes.js";
import type { QuestionScore } from "./score.js";
import { loose } from "./slugify.js";

type Choice = { readonly id?: string; readonly text: string };

/**
 * multiple-choice.md, "Choices": a choice SHOULD declare its own `id` rather
 * than rely on one derived from its text. `path` is where `choices` sits.
 */
export function checkChoiceIdsDefined(
	choices: readonly Choice[],
	path: readonly PathStep[],
): Diagnostic[] {
	return choices.flatMap((choice, index) =>
		choice.id === undefined
			? [
					lintDiagnostic(
						"missing-choice-id",
						[...path, index, "id"],
						"choice has no explicit id; one will be derived from its text",
					),
				]
			: [],
	);
}

/**
 * multiple-choice.md, "Choices": two choices whose text renders alike but is
 * written differently in source are indistinguishable to a reader.
 */
export function checkChoicesVisuallyIdentical(
	choices: readonly Choice[],
	path: readonly PathStep[],
): Diagnostic[] {
	const seen = new Map<string, number>();
	const found: Diagnostic[] = [];
	for (const [index, choice] of choices.entries()) {
		const key = renderVisualKey(choice.text);
		const first = seen.get(key);
		if (first === undefined) {
			seen.set(key, index);
			continue;
		}
		// An exact repeat is a `duplicate-choice-text` model error, so a
		// choice that renders like an earlier one is written differently.
		found.push(
			lintDiagnostic(
				"visually-identical-choices",
				[...path, index, "text"],
				`choice text renders the same as choices[${first}] but is written differently in source`,
			),
		);
	}
	return found;
}

/**
 * multiple-choice.md: a question MAY mark any number of choices as correct
 * (`score >= 1`) and typically marks one; more than one is unusual and none
 * is likely a mistake. A fill-in choice blank is graded alike, so it follows
 * the same rules.
 */
export function checkMultipleChoiceAnswers(
	choices: readonly { readonly score?: number }[],
	path: readonly PathStep[],
): Diagnostic[] {
	const correct = choices.flatMap((choice, index) =>
		(choice.score ?? 0) >= 1 ? [index] : [],
	);
	const found: Diagnostic[] = [];
	if (correct.length === 0) {
		found.push(
			lintDiagnostic(
				"no-correct-choice",
				path,
				"no choice has a score >= 1; the question has no correct answer",
			),
		);
	}
	if (correct.length > 1) {
		found.push(
			lintDiagnostic(
				"many-correct-choices",
				path,
				`choices ${correct.join(", ")} all have a score >= 1; a question MAY mark any number of choices as correct, but the student still picks a single one`,
			),
		);
	}
	if (correct.length === choices.length) {
		found.push(
			lintDiagnostic(
				"all-choices-correct",
				path,
				"every choice has a score >= 1; the question has no wrong answer",
			),
		);
	}
	return found;
}

/**
 * multiple-selection.md: a well-formed question mixes correct and incorrect
 * choices.
 */
function checkMultipleSelectionAnswers(
	choices: readonly { readonly correct: boolean }[],
	path: readonly PathStep[],
): Diagnostic[] {
	const correct = choices.filter((choice) => choice.correct).length;
	if (correct === 0) {
		return [
			lintDiagnostic(
				"no-correct-choice",
				path,
				"no choice is correct; the question has nothing to select",
			),
		];
	}
	if (correct === choices.length) {
		return [
			lintDiagnostic(
				"all-choices-correct",
				path,
				"every choice is correct; the question has nothing to leave unchecked",
			),
		];
	}
	return [];
}

/**
 * true-false.md, "Locale": the marker rules, in this order, on the normalized
 * value.
 *
 * 1. A false friend of the locale row: only `false-friend-true-false-marker`.
 * 2. A letter the row accepts (even a WARNING letter): no warning.
 * 3. A WARNING letter: only `unlisted-true-false-marker`.
 * 4. A locale without a row: no locale warning.
 * 5. Any other TRUE or FALSE letter: `locale-mismatched-true-false-marker`.
 *
 * The reserved `X`/`x` marker is a model error, so it never reaches here.
 */
function checkTrueFalseMarkers(
	choices: readonly { readonly marker?: string }[],
	locale: string | undefined,
): Diagnostic[] {
	const subtag = languageSubtag(locale);
	const row = Object.hasOwn(LOCALE_ROWS, subtag)
		? LOCALE_ROWS[subtag]
		: undefined;
	const found: Diagnostic[] = [];
	for (const [index, choice] of choices.entries()) {
		const marker = choice.marker;
		if (marker === undefined) continue;
		const value = normalizeValue(marker);
		const path = ["choices", index, "marker"];
		if (row?.falseFriends.has(value)) {
			found.push(
				lintDiagnostic(
					"false-friend-true-false-marker",
					path,
					`${repr(marker)} reads as true (see true-false.md), but it can mean false in the language of locale ${repr(locale ?? "")}; if this choice was meant to be false, use 'F' instead`,
				),
			);
		} else if (
			row !== undefined &&
			(row.true.has(value) || row.false.has(value))
		) {
			// The row accepts this letter.
		} else if (!TRUE_LETTERS.has(value) && !FALSE_LETTERS.has(value)) {
			found.push(
				lintDiagnostic(
					"unlisted-true-false-marker",
					path,
					`${repr(marker)} is in neither the true nor the false marker list: it reads as true`,
				),
			);
		} else if (row !== undefined) {
			found.push(
				lintDiagnostic(
					"locale-mismatched-true-false-marker",
					path,
					`${repr(marker)} does not fit locale ${repr(locale ?? "")}: use 'T'/'F' or a letter of the locale table`,
				),
			);
		}
	}
	return found;
}

/**
 * true-false.md, "Additional Rules": a marker that is not its own NFKC form
 * is valid but read as that form, and renders differently than intended.
 */
function checkTrueFalseMarkerNfkc(
	choices: readonly { readonly marker?: string }[],
): Diagnostic[] {
	return choices.flatMap((choice, index) => {
		const marker = choice.marker;
		if (marker === undefined || nfkc(marker) === marker) return [];
		return [
			lintDiagnostic(
				"non-nfkc-true-false-marker",
				["choices", index, "marker"],
				`${repr(marker)} is not its own NFKC form; read as ${repr(nfkc(marker))}`,
			),
		];
	});
}

/**
 * true-false.md:218: a question whose statements are all true or all false is
 * usually an authoring mistake.
 */
function checkTrueFalseUniformAnswers(
	choices: readonly { readonly correct: boolean }[],
): Diagnostic[] {
	const first = choices[0];
	if (first === undefined) return [];
	if (choices.some((choice) => choice.correct !== first.correct)) return [];
	return [
		lintDiagnostic(
			"uniform-true-false-answers",
			["choices"],
			`every statement is ${first.correct ? "true" : "false"}; a true/false question should mix true and false statements`,
		),
	];
}

/** The lint rules every question with a list of choices shares. */
function choiceLint(question: {
	readonly choices: readonly Choice[];
}): Diagnostic[] {
	return [
		...checkChoiceIdsDefined(question.choices, ["choices"]),
		...checkChoicesVisuallyIdentical(question.choices, ["choices"]),
	];
}

/** The rules every question with a list of choices shares. */
const choiceRules: FamilyRules<
	MultipleChoiceQuestion | MultipleSelectionQuestion | TrueFalseQuestion
> = {
	fields: (question, path) => choiceFreeTexts(question.choices, path),
	models: [(question, path) => checkUniqueChoices(question.choices, path)],
};

export const multipleChoiceRules: FamilyRules<MultipleChoiceQuestion> = {
	...choiceRules,
	lint: (question) => [
		...choiceLint(question),
		...checkMultipleChoiceAnswers(question.choices, ["choices"]),
	],
};

export const multipleSelectionRules: FamilyRules<MultipleSelectionQuestion> = {
	...choiceRules,
	lint: (question) => [
		...choiceLint(question),
		...checkMultipleSelectionAnswers(question.choices, ["choices"]),
	],
};

/**
 * true-false.md, "Additional Rules": a marker is a single letter: its
 * normalized value is one code point in `LETTER`, with no whitespace around it
 * as written (`malformed-true-false-marker`). `X`/`x`, also in a
 * compatibility form such as `Ｘ`, marks a selected multiple-selection choice
 * and never means true or false (`reserved-true-false-marker`).
 */
export function markerDiagnostic(
	marker: string,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (!isLetter(normalizeValue(marker)) || marker !== strip(marker)) {
		return modelError(
			"malformed-true-false-marker",
			`${repr(marker)} is not a true/false marker: a marker is a single letter, with no whitespace around it`,
			path,
		);
	}
	if (normalizeValue(marker) === "x") {
		return modelError(
			"reserved-true-false-marker",
			`${repr(marker)} marks a selected multiple-selection choice and has no true/false meaning`,
			path,
		);
	}
	return undefined;
}

/**
 * true-false.md: a marker's category (TRUE, FALSE or WARNING, see
 * `letters.ts`) agrees with `correct`. A FALSE marker disagrees with
 * `correct: true`; a TRUE or WARNING marker, which both read as true,
 * disagrees with `correct: false`.
 */
function checkMarkersAgreeWithCorrect(
	question: TrueFalseQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	for (const [index, choice] of question.choices.entries()) {
		const marker = choice.marker;
		if (marker === undefined) continue;
		const expected = !FALSE_LETTERS.has(normalizeValue(marker));
		if (choice.correct !== expected) {
			return modelError(
				"true-false-marker-disagrees-with-correct",
				`marker ${repr(marker)} disagrees with correct=${choice.correct ? "True" : "False"} for choices[${index}]`,
				[...path, "choices", index, "marker"],
			);
		}
	}
	return undefined;
}

export const trueFalseRules: FamilyRules<TrueFalseQuestion> = {
	fields: (question, path) => [
		...choiceFreeTexts(question.choices, path),
		...question.choices.flatMap((choice, index) => {
			if (choice.marker === undefined) return [];
			const found = markerDiagnostic(choice.marker, [
				...path,
				"choices",
				index,
				"marker",
			]);
			return found === undefined ? [] : [found];
		}),
	],
	models: [
		(question, path) => checkUniqueChoices(question.choices, path),
		checkMarkersAgreeWithCorrect,
	],
	lint: (question) => [
		...choiceLint(question),
		...checkTrueFalseMarkers(question.choices, question.locale),
		...checkTrueFalseUniformAnswers(question.choices),
		...checkTrueFalseMarkerNfkc(question.choices),
	],
};

//
// Scoring
//

/**
 * The score of a picked choice that declares none (multiple-choice.md,
 * "Grading"). It is 0 under `partial`. Under `symmetric` it spreads the
 * negative of the declared scores evenly over the choices that declare none,
 * clamped to [-1, 0]. A fill-in choice blank uses it too.
 */
export function unspecifiedChoiceScore(
	choices: readonly { readonly score?: number | undefined }[],
	symmetric: boolean,
): number {
	if (!symmetric) return 0;
	const declared = choices.flatMap((choice) =>
		choice.score === undefined ? [] : [choice.score],
	);
	const missing = choices.length - declared.length;
	if (missing === 0) return 0;
	const total = declared.reduce((sum, value) => sum + value, 0);
	// `+ 0` turns -0 into 0.
	return Math.max(-1, Math.min(0, -total / missing)) + 0;
}

/** The `grading` of a multiple-choice, multiple-selection or true-false question, `inherit` read as `symmetric`. */
export function choiceGrading(
	question: Pick<
		MultipleChoiceQuestion | MultipleSelectionQuestion | TrueFalseQuestion,
		"grading"
	>,
): string {
	return question.grading === undefined || question.grading === "inherit"
		? "symmetric"
		: question.grading;
}

/**
 * Score a response to a multiple-choice question by the `score` of the picked
 * choice, or by `unspecifiedChoiceScore` when it declares none.
 *
 * @throws {ResponseError} The response names no choice.
 */
export function scoreMultipleChoice(
	question: MultipleChoiceQuestion,
	response: unknown,
): QuestionScore {
	const choice =
		typeof response === "string"
			? question.choices.find((candidate) => candidate.id === response)
			: undefined;
	if (choice === undefined) {
		throw new ResponseError(
			`Response id ${pyRepr(response)} not found in choices`,
		);
	}
	const score =
		choice.score ??
		unspecifiedChoiceScore(
			question.choices,
			choiceGrading(question) === "symmetric",
		);
	return { score, feedback: choice.feedback ? [choice.feedback] : [] };
}

/**
 * Score a response to a multiple-selection question. The response is the
 * list of ticked ids; a choice not in it asserts false.
 *
 * @throws {ResponseError} The response is not a list of ids of the question.
 */
export function scoreMultipleSelection(
	question: MultipleSelectionQuestion,
	response: unknown,
): QuestionScore {
	if (!Array.isArray(response)) {
		throw new ResponseError(
			`A multiple-selection response must be a set of ids, found ${typeName(response)}`,
		);
	}
	const known = new Set(question.choices.map((choice) => choice.id));
	for (const tick of response) {
		if (typeof tick !== "string") {
			throw new ResponseError(`Ticked id ${pyRepr(tick)} is not a string`);
		}
	}
	const unknown = (response as string[])
		.filter((tick) => !known.has(tick))
		.sort();
	if (unknown.length > 0) {
		throw new ResponseError(
			`Ticked ids ${pyRepr(unknown)} not found in choices`,
		);
	}
	const ticked = new Set(response as string[]);
	const n = question.choices.length;
	const marks = question.choices.map(
		(choice) =>
			[choice, choice.id !== undefined && ticked.has(choice.id)] as const,
	);
	const judged = marks.filter(
		([choice, mark]) => mark === choice.correct,
	).length;

	let score: number;
	switch (choiceGrading(question)) {
		case "all-or-nothing":
			score = judged === n ? 1 : 0;
			break;
		case "partial":
			score = judged / n;
			break;
		default:
			score = (2 * judged - n) / n;
	}
	const feedback = marks.flatMap(([choice, mark]) =>
		mark !== choice.correct && choice.feedback ? [choice.feedback] : [],
	);
	return { score, feedback };
}

/**
 * Check a true/false response: a mapping whose keys are statement ids and
 * whose values are booleans or `null` (responses.md, "True/false").
 *
 * @throws {ResponseError} The response is malformed.
 */
function parseTrueFalse(
	question: TrueFalseQuestion,
	response: unknown,
): Readonly<Record<string, unknown>> {
	const notAMapping = new ResponseError(
		`A true/false response must be a mapping of statement ids, found ${typeName(response)}`,
	);
	if (typeof response !== "object" || response === null) throw notAMapping;
	const known = new Set(question.choices.map((statement) => statement.id));
	const keys = Array.isArray(response)
		? response.map((item) => (typeof item === "string" ? item : pyRepr(item)))
		: Object.keys(response);
	const unknown = keys.filter((key) => !known.has(key)).sort();
	if (unknown.length > 0) {
		throw new ResponseError(
			`Statement ids ${pyRepr(unknown)} not found in choices`,
		);
	}
	if (Array.isArray(response)) throw notAMapping;
	for (const [key, value] of Object.entries(response)) {
		if (value !== null && value !== undefined && typeof value !== "boolean") {
			throw new ResponseError(
				`Response for statement ${repr(key)} must be a boolean or null, got ${pyRepr(value)}`,
			);
		}
	}
	return response as Record<string, unknown>;
}

/**
 * Score judged statements against their `correct` flags. A statement missing
 * from the response counts as an abstention, like an explicit `null`.
 *
 * @throws {ResponseError} The response is malformed.
 */
export function scoreTrueFalse(
	question: TrueFalseQuestion,
	response: unknown,
): QuestionScore {
	const judgements = parseTrueFalse(question, response);
	const n = question.choices.length;
	const marks = question.choices.map((statement) => {
		const mark =
			statement.id !== undefined && Object.hasOwn(judgements, statement.id)
				? judgements[statement.id]
				: null;
		return [statement, mark ?? null] as const;
	});
	const correct = marks.filter(([s, mark]) => mark === s.correct).length;
	const incorrect = marks.filter(
		([s, mark]) => mark !== null && mark !== s.correct,
	).length;

	let score: number;
	switch (choiceGrading(question)) {
		case "all-or-nothing":
			score = correct === n ? 1 : 0;
			break;
		case "no-mistakes":
			score = incorrect > 0 ? 0 : correct / n;
			break;
		case "partial":
			score = correct / n;
			break;
		default:
			score = (correct - incorrect) / n;
	}
	const feedback = marks.flatMap(([statement, mark]) =>
		mark !== statement.correct && statement.feedback
			? [statement.feedback]
			: [],
	);
	return { score, feedback };
}

/** A choice of any choice question, as `withChoiceIds` sees it. */
interface IdentifiableChoice {
	readonly id?: string;
	readonly text: string;
}

/**
 * `choices` with a derived id wherever one is missing. A choice that has an
 * id keeps it. Every derived id avoids every id in use, explicit or derived.
 * Returns a new list. A port of `_with_choice_ids`.
 */
export function withChoiceIds<C extends IdentifiableChoice>(
	choices: readonly C[],
): C[] {
	const missing = choices.filter((choice) => choice.id === undefined);
	if (missing.length === 0) return [...choices];
	const forbid = choices.flatMap((choice) =>
		choice.id === undefined ? [] : [choice.id],
	);
	const derived = loose(
		missing.map((choice) => choice.text),
		{ forbid },
	);
	return choices.map((choice) =>
		choice.id === undefined
			? { ...choice, id: derived.get(choice.text) as string }
			: choice,
	);
}
