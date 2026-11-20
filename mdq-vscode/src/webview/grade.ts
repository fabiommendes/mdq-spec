/**
 * What the review mode of the preview shows.
 *
 * The preview is for the author of a question, so review works without an
 * answer: with no response from the answer mode, it grades the first correct
 * response and shows the answer key. An upload has no correct response: it is
 * always pending, and its answer key is only guidance for the grader.
 */

import {
	correctResponses,
	NotAutoGradable,
	type Question,
	scoreResponse,
} from "@mdq-format/core";

/** The `value` and `result` props of a view in review mode. */
export interface Review {
	readonly response: unknown;
	readonly result: object;
	/** The answer key of an upload, shown as guidance; absent for other types. */
	readonly answerKey?: string;
}

/** Why a review cannot be shown. */
export interface NoReview {
	readonly error: string;
}

export function review(
	question: Question,
	response: unknown,
): Review | NoReview {
	if (question.type === "upload") return reviewUpload(question, response);
	const correct: unknown = correctResponses(question);
	const shown = response ?? keyResponse(correct);
	if (shown === undefined) {
		return { error: "Answer the question to see its review." };
	}
	if (question.type === "code") {
		// The preview has no runner, so it has no runner report: the response
		// of a code question is always pending here.
		return { response: shown, result: { pending: true, correct } };
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
 * An upload is always pending: a response is only checked for shape, and the
 * answer key goes to the preview as `answerKey` when the question has one.
 */
function reviewUpload(
	question: Extract<Question, { type: "upload" }>,
	response: unknown,
): Review | NoReview {
	// `null` is a skip, which is not malformed.
	if (response !== undefined && response !== null) {
		try {
			scoreResponse(question, response);
		} catch (error) {
			if (!(error instanceof NotAutoGradable)) {
				return {
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}
	}
	return {
		response: response ?? null,
		result: { pending: true, correct: [] },
		...(question.answerKey === undefined
			? {}
			: { answerKey: question.answerKey }),
	};
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
