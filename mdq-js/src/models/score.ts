/**
 * Scoring: what a response is worth. A port of `mdq-py/mdq/models/_score.py`
 * and of the `score_response`, `prevalidate` and `score_responses` methods of
 * the models.
 *
 * PARTLY PORTED: `scoreResponse` scores short answer questions and the
 * short answer blanks of fill-in questions (phase P3 of
 * `dev/plan/mdq-js-paridade.md`, the pattern matching). The rest is a stub
 * that throws (phase P6).
 */

import { NotAutoGradable, ResponseError } from "../errors.js";
import { repr } from "../parser/text.js";
import type { ExamResponses } from "../responses.js";
import type { Exam } from "../schema/exam.js";
import type {
	FillInQuestion,
	PenaltyPolicy,
	Question,
	ShortAnswerBlank,
	ShortAnswerQuestion,
} from "../schema/index.js";
import { defaultUnmatched, scoreText } from "./text.js";

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

/** The Python type name of a JSON value, as the messages of mdq-py show it. */
function typeName(value: unknown): string {
	if (value === null) return "NoneType";
	if (typeof value === "string") return "str";
	if (typeof value === "boolean") return "bool";
	if (typeof value === "number")
		return Number.isInteger(value) ? "int" : "float";
	return Array.isArray(value) ? "list" : "dict";
}

/**
 * Return `response` if it is a string (`docs/responses.md`, "Short answer
 * and essay"). A number is not converted: `1.0` and `1` would become
 * different texts.
 *
 * @throws {ResponseError} If `response` is not a string.
 */
function parseTextResponse(response: unknown): string {
	if (typeof response !== "string") {
		throw new ResponseError(
			`A text response must be a string, found ${typeName(response)}`,
		);
	}
	return response;
}

/** Score a fill-in response whose blanks are all short answer blanks. */
function scoreFillIn(
	question: FillInQuestion,
	response: unknown,
): QuestionScore {
	if (
		typeof response !== "object" ||
		response === null ||
		Array.isArray(response)
	) {
		throw new ResponseError(
			`A fill-in response must be a mapping of blank ids, found ${typeName(response)}`,
		);
	}
	const answers = response as Record<string, unknown>;
	const known = new Set(question.blanks.map((blank) => blank.id));
	const unknown = Object.keys(answers)
		.filter((key) => !known.has(key))
		.sort();
	if (unknown.length > 0) {
		throw new ResponseError(
			`Blank ids [${unknown.map((id) => repr(id)).join(", ")}] not found in the question`,
		);
	}

	const scores: number[] = [];
	const feedback: string[] = [];
	const pending: string[] = [];
	for (const blank of question.blanks) {
		const answer = answers[blank.id];
		if (answer === undefined || answer === null) {
			scores.push(0);
			continue;
		}
		if (blank.type !== "short-answer") throw new Error("not ported (P6)");
		if (typeof answer !== "string") {
			throw new ResponseError(
				`Response ${JSON.stringify(answer)} to blank ${repr(blank.id)} is not text`,
			);
		}
		const result = scoreText(blank, answer, {
			unmatched: defaultUnmatched(question.unmatched, blank.accept),
			diacritics: question.diacritics ?? "fold",
			incorrectFeedback: blank.incorrectFeedback,
		});
		if (result === undefined) {
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
	const grading = question.grading ?? "inherit";
	let score: number;
	switch (grading === "inherit" ? "symmetric" : grading) {
		case "all-or-nothing":
			score = scores.every((value) => value === 1) ? 1 : 0;
			break;
		case "no-mistakes": {
			// An empty blank scores 0 but is no mistake: only a filled blank
			// below 1 zeroes the question.
			const mistaken = question.blanks.some(
				(blank, index) =>
					(scores[index] ?? 0) < 1 &&
					answers[blank.id] !== undefined &&
					answers[blank.id] !== null,
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

/**
 * Score a response to a question.
 *
 * Only short answer questions and fill-in questions with short answer blanks
 * are scored so far.
 *
 * @throws {ResponseError} If the response has the wrong shape.
 * @throws {NotAutoGradable} If the response waits for an instructor.
 */
export function scoreResponse(
	question: Question,
	response: unknown,
): QuestionScore {
	if (question.type === "short-answer") {
		const result = scoreText(question, parseTextResponse(response), {
			unmatched: defaultUnmatched(question.unmatched, question.accept),
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
	if (question.type === "fill-in") return scoreFillIn(question, response);
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
