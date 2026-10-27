/**
 * Scoring: what a response is worth. A port of `mdq-py/mdq/models/_score.py`
 * and of the `score_response`, `prevalidate` and `score_responses` methods of
 * the models. Each family scores in its own module (`choice.ts`, `numeric.ts`,
 * `text.ts`, `fill-in.ts`, `ordering.ts`); this one holds the result types and
 * the entry points that dispatch on `type`.
 */

import {
	MissingIdError,
	NotAutoGradable,
	ResponseError,
	UnresolvedInclude,
} from "../errors.js";
import { pyRepr } from "../parser/text.js";
import type { ExamResponses } from "../responses.js";
import type { Exam } from "../schema/exam.js";
import type {
	PenaltyPolicy,
	Question,
	ShortAnswerBlank,
	ShortAnswerQuestion,
} from "../schema/index.js";
import {
	scoreMultipleChoice,
	scoreMultipleSelection,
	scoreTrueFalse,
} from "./choice.js";
import { resolveQuestion } from "./exam.js";
import { scoreFillIn } from "./fill-in.js";
import { scoreNumeric } from "./numeric.js";
import { scoreOrdering } from "./ordering.js";
import {
	type Prevalidation,
	prevalidateText,
	scoreEssay,
	scoreShortAnswer,
} from "./text.js";

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

/**
 * Score a response to a question.
 *
 * @throws {ResponseError} If the response has the wrong shape.
 * @throws {NotAutoGradable} If the response waits for an instructor.
 */
export function scoreResponse(
	question: Question,
	response: unknown,
): QuestionScore {
	switch (question.type) {
		case "multiple-choice":
			return scoreMultipleChoice(question, response);
		case "multiple-selection":
			return scoreMultipleSelection(question, response);
		case "true-false":
			return scoreTrueFalse(question, response);
		case "numeric":
			return scoreNumeric(question, response);
		case "short-answer":
			return scoreShortAnswer(question, response);
		case "essay":
			return scoreEssay(question, response);
		case "fill-in":
			return scoreFillIn(question, response);
		case "ordering":
			return scoreOrdering(question, response);
	}
}

/**
 * Check a submission against `preAccept` and `preReject` of a short answer
 * question or blank (short-answer.md, "Pre-validation"). Grading never uses
 * these lists.
 *
 * @param diacritics The `diacritics` of the fill-in question, for a blank. A
 *   question uses its own.
 */
export function prevalidate(
	key: ShortAnswerQuestion | ShortAnswerBlank,
	response: string,
	diacritics: "fold" | "keep" = "fold",
): Prevalidation {
	return prevalidateText(
		key,
		response,
		"stem" in key ? (key.diacritics ?? "fold") : diacritics,
	);
}

/**
 * Score the responses of one attempt at an exam: a mapping from question id to
 * response (`docs/responses.md`, "Responses to an exam"; `docs/exam.md`, "Exam
 * score"). The include blocks of the exam must be resolved.
 *
 * @throws {UnresolvedInclude} The exam still holds an include block.
 * @throws {MissingIdError} A question has no id.
 * @throws {ResponseError} A key of `responses` is not a question of the exam,
 *   or a response cannot be graded by its question.
 */
export function scoreResponses(
	exam: Exam,
	responses: ExamResponses,
): ExamScore {
	const questions: (Question & { id: string })[] = [];
	for (const entry of exam.questions) {
		if ("include" in entry || "includeAll" in entry) {
			throw new UnresolvedInclude("cannot score an exam with include blocks");
		}
		if (entry.id === undefined) {
			throw new MissingIdError("cannot score a question without an id");
		}
		questions.push(entry as Question & { id: string });
	}
	const ids = new Set(questions.map((question) => question.id));
	for (const key of Object.keys(responses)) {
		if (!ids.has(key)) {
			throw new ResponseError(`response for unknown question ${pyRepr(key)}`);
		}
	}

	const penalty = exam.penalty ?? "none";
	const scores: [string, QuestionScore | null][] = [];
	const pending: string[] = [];
	const skipped: string[] = [];
	let weighted = 0;
	let settledWeight = 0;
	let totalWeight = 0;
	for (const question of questions) {
		const weight = question.weight ?? 1;
		totalWeight += weight;
		const response = Object.hasOwn(responses, question.id)
			? responses[question.id]
			: undefined;
		let result: QuestionScore;
		if (response === undefined || response === null) {
			skipped.push(question.id);
			result = { score: 0, feedback: [] };
		} else {
			try {
				result = scoreResponse(resolveQuestion(exam, question), response);
			} catch (error) {
				if (!(error instanceof NotAutoGradable)) throw error;
				pending.push(question.id);
				scores.push([question.id, null]);
				continue;
			}
		}
		scores.push([question.id, result]);
		weighted +=
			weight * (penalty === "none" ? Math.max(0, result.score) : result.score);
		settledWeight += weight;
	}

	let provisional = settledWeight > 0 ? weighted / settledWeight : 0;
	if (penalty === "capped") provisional = Math.max(0, provisional);
	return {
		score: pending.length > 0 ? null : provisional,
		provisional,
		questions: Object.fromEntries(scores),
		pending,
		skipped,
		totalWeight,
		penalty,
	};
}
