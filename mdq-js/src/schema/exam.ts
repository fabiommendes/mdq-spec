/**
 * The exam document -- `schema/exam.yaml`.
 *
 * An exam is recognized by its H1 title, which a question document can never
 * carry. Each entry of `questions` is either a question written inline, an
 * `include` naming one stored elsewhere, or an `includeAll` query matching
 * several at once.
 */

import * as z from "zod";
import {
	DocumentId,
	GradedQuestionType,
	GradingType,
	PenaltyPolicy,
	Uuid,
	uniqueArray,
} from "./common.js";
import { Question } from "./questions.js";

/**
 * A reference to a question defined outside the exam --
 * `schema/exam.yaml#/$defs/Include`. Resolving it is the host system's job;
 * a reference that merely fails to resolve is still a well-formed document.
 */
export const Include = z.strictObject({
	include: DocumentId,
});
export type Include = z.infer<typeof Include>;

/**
 * A query for questions defined outside the exam --
 * `schema/exam.yaml#/$defs/IncludeAll`. Adds every question that matches it,
 * except the ones the exam already contains through an `include`, a declared
 * inline id, or an earlier `includeAll`. Resolving the query is the host
 * system's job; a reference that merely fails to resolve is still a
 * well-formed document.
 */
export const IncludeAll = z.strictObject({
	includeAll: z.string().min(1),
	max: z.number().int().min(1).optional(),
});
export type IncludeAll = z.infer<typeof IncludeAll>;

/** One question block -- `schema/exam.yaml#/$defs/Entry`. */
export const ExamEntry = z.union([Include, IncludeAll, Question]);
export type ExamEntry = z.infer<typeof ExamEntry>;

/**
 * The grading strategy applied to questions that declare none of their own:
 * either one strategy for every question, or a mapping from question type to
 * strategy. A question that declares its own `grading` ignores this entirely.
 */
export const ExamGradingType = z.union([
	GradingType,
	z.strictObject(
		Object.fromEntries(
			GradedQuestionType.options.map((type) => [type, GradingType.optional()]),
		) as Record<GradedQuestionType, z.ZodOptional<typeof GradingType>>,
	),
]);
export type ExamGradingType = z.infer<typeof ExamGradingType>;

/**
 * `schema/exam.yaml#/properties/start` -- an ISO 8601 date or date-time. A
 * value with no UTC offset is in the local time of whoever administers the
 * exam.
 */
export const START_PATTERN =
	/^[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]+)?)?(Z|[+-][0-9]{2}:[0-9]{2})?)?$/;

/**
 * `schema/exam.yaml#/properties/duration` -- an ISO 8601 duration. Only
 * fixed-length units are allowed (weeks, days, hours, minutes, seconds):
 * years and months have no fixed length.
 */
export const DURATION_PATTERN =
	/^P(?!$)([0-9]+W)?([0-9]+D)?(T(?=[0-9])([0-9]+H)?([0-9]+M)?([0-9]+(\.[0-9]+)?S)?)?$/;

/** `schema/exam.yaml`. */
export const Exam = z.strictObject({
	type: z.literal("exam").optional(),
	id: DocumentId.optional(),
	uuid: Uuid.optional(),
	title: z.string().min(1).optional(),
	description: z.string().min(1).optional(),
	course: z.string().min(1).optional(),
	author: z.string().min(1).optional(),
	locale: z.string().optional(),
	instructions: z.string().min(1).optional(),
	tags: uniqueArray(z.string()).optional(),
	meta: z.record(z.string(), z.unknown()).optional(),
	grading: ExamGradingType.optional(),
	shuffle: z.boolean().optional(),
	penalty: PenaltyPolicy.optional(),
	start: z.string().regex(START_PATTERN).optional(),
	duration: z.string().regex(DURATION_PATTERN).optional(),
	questions: z.array(ExamEntry),
});
export type Exam = z.infer<typeof Exam>;
