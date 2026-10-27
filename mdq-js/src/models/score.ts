/**
 * Scoring: what a response is worth. A port of `mdq-py/mdq/models/_score.py`
 * and of the `score_response`, `prevalidate` and `score_responses` methods of
 * the models.
 *
 * NOT PORTED (phases P3 and P6 of `dev/plan/mdq-js-paridade.md`): the
 * functions are stubs that throw.
 */

import type { ExamResponses } from "../responses.js";
import type { Exam } from "../schema/exam.js";
import type {
	PenaltyPolicy,
	Question,
	ShortAnswerBlank,
	ShortAnswerQuestion,
} from "../schema/index.js";

/** What one response to one question was worth. */
export interface QuestionScore {
	/** The raw value, in [-1, 1], with no exam policy applied. */
	readonly score: number;
	/** The feedback the response triggers, in document order. */
	readonly feedback: readonly string[];
}

/** What one attempt at an exam was worth (`docs/exam.md`, "Exam score"). */
export interface ExamScore {
	/** `null` while a response is pending. */
	readonly score: number | null;
	/** The mean over the settled questions only. */
	readonly provisional: number;
	/** Every question id to its score, or `null` when it is pending. */
	readonly questions: Readonly<Record<string, QuestionScore | null>>;
	readonly pending: readonly string[];
	readonly skipped: readonly string[];
	readonly totalWeight: number;
	readonly penalty: PenaltyPolicy;
}

/** The result of `prevalidate`: whether to accept a submission, and why not. */
export interface Prevalidation {
	readonly valid: boolean;
	/** The pattern feedback shown for an invalid submission, if any. */
	readonly feedback: string | null;
}

/**
 * Score a response to a question.
 *
 * @throws {ResponseError} If the response has the wrong shape.
 * @throws {NotAutoGradable} If the response waits for an instructor.
 */
export function scoreResponse(
	_question: Question,
	_response: unknown,
): QuestionScore {
	throw new Error("not ported (P6)");
}

/**
 * Check a submission against `preAccept` and `preReject` of a short answer
 * question or blank. Grading never uses these lists.
 */
export function prevalidate(
	_question: ShortAnswerQuestion | ShortAnswerBlank,
	_response: string,
): Prevalidation {
	throw new Error("not ported (P6)");
}

/**
 * Score the responses of one attempt at an exam. The include blocks of the
 * exam must be resolved.
 *
 * @throws {ResponseError} If a response has the wrong shape.
 */
export function scoreResponses(
	_exam: Exam,
	_responses: ExamResponses,
): ExamScore {
	throw new Error("not ported (P6)");
}
