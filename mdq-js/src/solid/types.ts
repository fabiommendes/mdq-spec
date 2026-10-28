import type { QuestionScore } from "../models/score.js";

/** How a question view is driven: interactive, frozen for display, or graded. */
export type QuestionMode = "answer" | "readonly" | "review";

/** The sign of a score, which picks how a badge or a feedback box looks. */
export type ScoreSign = "positive" | "negative" | "zero";

export function scoreSign(score: number): ScoreSign {
	if (score > 0) return "positive";
	if (score < 0) return "negative";
	return "zero";
}

/**
 * A graded response as a view shows it: its score and feedback, and the
 * correct responses when the student may see them.
 *
 * `correct` is apart from the question on purpose. A view gets the public
 * form, which holds no answer, and an exam still open for review omits
 * `correct`. Absent means withheld; an empty list is a real key under which
 * every response is wrong.
 */
export interface QuestionResult<R> extends QuestionScore {
	correct?: readonly R[];
}

/**
 * The result of a response that the question does not settle: an essay, a
 * `manual` short answer, an `unmatched: manual` response. It has no score and
 * no feedback until an instructor grades it, see `docs/responses.md`
 * ("Pending"). `correct` is still the key, when the student may see it.
 */
export interface PendingResult<R> {
	readonly pending: true;
	readonly correct?: readonly R[];
}

/** What a view of a question that can be graded by hand takes as `result`. */
export type ReviewResult<R> = QuestionResult<R> | PendingResult<R>;

/** Whether `result` waits for an instructor. */
export function isPending<R>(
	result: ReviewResult<R>,
): result is PendingResult<R> {
	return "pending" in result && result.pending === true;
}
