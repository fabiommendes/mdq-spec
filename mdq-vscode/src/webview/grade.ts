/**
 * What the review mode of the preview shows.
 *
 * The preview is for the author of a question, so review works without an
 * answer: with no response from the answer mode, it grades the first correct
 * response and shows the answer key.
 */

import {
	correctResponses,
	NotAutoGradable,
	type Question,
	scoreResponse,
} from "mdq";

/** The `value` and `result` props of a view in review mode. */
export interface Review {
	readonly response: unknown;
	readonly result: object;
}

/** Why a review cannot be shown. */
export interface NoReview {
	readonly error: string;
}

export function review(
	question: Question,
	response: unknown,
): Review | NoReview {
	const correct: unknown = correctResponses(question);
	const shown = response ?? keyResponse(correct);
	if (shown === undefined) {
		return { error: "Answer the question to see its review." };
	}
	try {
		return {
			response: shown,
			result: { ...scoreResponse(question, shown), correct },
		};
	} catch (error) {
		if (error instanceof NotAutoGradable) {
			return { response: shown, result: { pending: true, correct } };
		}
		return { error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * One response that scores 1, from `correctResponses`: its first entry, or
 * for a fill-in question (a record from blank to answers) the first answer of
 * each blank. `undefined` when the key has none, as in an essay without
 * `answerKey`.
 */
function keyResponse(correct: unknown): unknown {
	if (Array.isArray(correct)) return correct[0];
	const blanks = Object.entries(correct as Record<string, unknown[]>);
	if (blanks.some(([, answers]) => answers.length === 0)) return undefined;
	return Object.fromEntries(blanks.map(([id, answers]) => [id, answers[0]]));
}
