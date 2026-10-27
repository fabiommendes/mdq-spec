/**
 * Choice-based questions: multiple-choice, multiple-selection and
 * true-false. A port of `models/_choice.py`, the part that validates.
 *
 * The rules are `FamilyRules` (`models/base.ts`) that `FAMILY_RULES`
 * (`models/exam.ts`) registers. `checkUniqueChoices` and `choiceFreeTexts`
 * (`models/base.ts`) also serve a fill-in choice blank.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { FALSE_LETTERS, isLetter, normalizeValue } from "../letters.js";
import { repr, strip } from "../parser/text.js";
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

/** The rules every question with a list of choices shares. */
const choiceRules: FamilyRules<
	MultipleChoiceQuestion | MultipleSelectionQuestion | TrueFalseQuestion
> = {
	fields: (question, path) => choiceFreeTexts(question.choices, path),
	models: [(question, path) => checkUniqueChoices(question.choices, path)],
};

export const multipleChoiceRules: FamilyRules<MultipleChoiceQuestion> =
	choiceRules;

export const multipleSelectionRules: FamilyRules<MultipleSelectionQuestion> =
	choiceRules;

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
};
