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
import { type CodeGrading, scoreCode } from "./code-grading.js";
import { resolveQuestion } from "./exam.js";
import { scoreFillIn } from "./fill-in.js";
import { scoreNumeric } from "./numeric.js";
import { scoreOrdering } from "./ordering.js";
import {
	type Prevalidation,
	parseTextResponse,
	prevalidateText,
	scoreEssay,
	scoreShortAnswer,
} from "./text.js";
import { scoreUpload } from "./upload.js";

/** What the response to one blank of a fill-in question was worth. */
export interface BlankScore {
	/** The raw value, in [-1, 1]. */
	readonly score: number;
	/** The feedback the blank's response triggers. */
	readonly feedback: readonly string[];
}

/** What one response to one question was worth. */
export interface QuestionScore {
	/** The raw value, in [-1, 1], with no exam policy applied. */
	readonly score: number;
	/** The feedback the response triggers, in document order. */
	readonly feedback: readonly string[];
	/**
	 * The score of each blank of a fill-in question, keyed by blank id in
	 * definition order, with that blank's own feedback (fill-in.md, "Blank
	 * scores"). A blank scores as the question's strategy gives it, before the
	 * strategy combines the blanks; an empty blank is `{score: 0, feedback:
	 * []}`; `null` marks a pending blank. Only fill-in sets it.
	 */
	readonly blanks?: Readonly<Record<string, BlankScore | null>>;
}

/** What the host adds to the responses of the code questions of an exam, by question id. */
export interface ExamCodeGrading {
	readonly reports?: Readonly<Record<string, unknown>>;
	readonly manual?: Readonly<
		Record<string, readonly (number | null | undefined)[]>
	>;
	readonly instructor?: Readonly<Record<string, number>>;
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
 *
 * @param grading What the host adds for a code question: the runner report and
 *   the scores of the instructor. Any other type ignores it. A code question
 *   throws `UnresolvedTestSource`, `ReportError` or `RangeError` as `scoreCode`
 *   does.
 */
export function scoreResponse(
	question: Question,
	response: unknown,
	grading: CodeGrading = {},
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
		case "code":
			parseTextResponse(response);
			return scoreCode(question, grading);
		case "upload":
			return scoreUpload(question, response);
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

/** The entry of `key`, ignoring the properties `Object` has. */
function own<T>(map: Readonly<Record<string, T>> | undefined, key: string) {
	return map !== undefined && Object.hasOwn(map, key) ? map[key] : undefined;
}

/**
 * Score the responses of one attempt at an exam: a mapping from question id to
 * response (`docs/responses.md`, "Responses to an exam"; `docs/exam.md`, "Exam
 * score"). The include blocks of the exam must be resolved.
 *
 * A code question also takes the runner report of its response (`reports`),
 * the scores of the instructor for its manual items (`manual`) and, when it
 * has no item at all, one score for the whole response (`instructor`), each by
 * question id. See `scoreCode`. A key of these mappings that is not a code
 * question of the exam is an error, as for `responses`.
 *
 * @throws {UnresolvedInclude} The exam still holds an include block.
 * @throws {MissingIdError} A question has no id.
 * @throws {ResponseError} A key of `responses` is not a question of the exam,
 *   or a response cannot be graded by its question.
 * @throws {UnresolvedTestSource} A code question has an unresolved test source.
 * @throws {ReportError} A code question that has a test source has no valid report.
 * @throws {RangeError} The scores of the instructor do not fit a code question.
 */
export function scoreResponses(
	exam: Exam,
	responses: ExamResponses,
	grading: ExamCodeGrading = {},
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

	const codeIds = new Set(
		questions.filter((q) => q.type === "code").map((q) => q.id),
	);
	for (const mapping of [grading.reports, grading.manual, grading.instructor]) {
		for (const key of Object.keys(mapping ?? {})) {
			if (!codeIds.has(key)) {
				throw new ResponseError(
					`${pyRepr(key)} is not a code question of the exam`,
				);
			}
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
				result =
					question.type === "code"
						? scoreResponse(question, response, {
								report: own(grading.reports, question.id),
								manual: own(grading.manual, question.id),
								instructor: own(grading.instructor, question.id),
							})
						: scoreResponse(resolveQuestion(exam, question), response);
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
