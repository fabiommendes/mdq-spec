/**
 * The exam document -- `schema/exam.yaml`.
 *
 * An exam is recognized by its H1 title, which a question document can never
 * carry. Each entry of `questions` is either a question written inline or an
 * `include` naming one stored elsewhere.
 */

import * as z from "zod";
import {
	GradedQuestionType,
	GradingType,
	PenaltyPolicy,
	Slug,
	Uuid,
} from "./common.js";
import { Question } from "./questions.js";

/**
 * A reference to a question defined outside the exam --
 * `schema/exam.yaml#/$defs/Include`. Resolving it is the host system's job;
 * a reference that merely fails to resolve is still a well-formed document.
 */
export const Include = z.strictObject({
	include: z.string().regex(/^.*(\/?([a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*))+$/),
});
export type Include = z.infer<typeof Include>;

/** One question block -- `schema/exam.yaml#/$defs/Entry`. */
export const ExamEntry = z.union([Include, Question]);
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

/** `schema/exam.yaml`. */
export const Exam = z.strictObject({
	type: z.literal("exam").optional(),
	id: Slug.optional(),
	uuid: Uuid.optional(),
	title: z.string().min(1).optional(),
	course: z.string().min(1).optional(),
	author: z.string().min(1).optional(),
	locale: z.string().optional(),
	instructions: z.string().optional(),
	tags: z.array(z.string()).optional(),
	meta: z.record(z.string(), z.unknown()).optional(),
	grading: ExamGradingType.optional(),
	penalty: PenaltyPolicy.optional(),
	questions: z.array(ExamEntry),
});
export type Exam = z.infer<typeof Exam>;
