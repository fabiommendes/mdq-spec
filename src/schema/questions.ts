/**
 * One Zod schema per question type, mirroring `schema/<type>.yaml`.
 *
 * Each YAML schema is `allOf: [question-base.yaml, {...}]` closed with
 * `unevaluatedProperties: false`; here that is a strict object spreading
 * `questionBaseShape` alongside the type's own fields. Constraints the JSON
 * Schema expresses with `if`/`then` become `.refine()` calls -- noted where
 * they appear.
 */

import * as z from "zod";
import {
	BooleanChoice,
	EssayInput,
	GradingType,
	Indentation,
	Normalization,
	numericAnswerShape,
	OrderingContent,
	questionBaseShape,
	ScoredChoice,
	Slug,
	Statement,
	shortAnswerKeyShape,
	Unmatched,
} from "./common.js";

/** Every question type's discriminator -- `mdq.types.QuestionType`. */
export const QuestionType = z.enum([
	"multiple-choice",
	"multiple-selection",
	"true-false",
	"numeric",
	"short-answer",
	"essay",
	"fill-in",
	"ordering",
]);
export type QuestionType = z.infer<typeof QuestionType>;

/** The set form, for membership tests. */
export const QUESTION_TYPES: ReadonlySet<QuestionType> = new Set(
	QuestionType.options,
);

/** `schema/multiple-choice.yaml` -- select exactly one choice. */
export const MultipleChoiceQuestion = z.strictObject({
	...questionBaseShape,
	type: z.literal("multiple-choice"),
	choices: z.array(ScoredChoice).min(2),
	grading: GradingType.optional(),
	shuffle: z.boolean().optional(),
});
export type MultipleChoiceQuestion = z.infer<typeof MultipleChoiceQuestion>;

/** `schema/multiple-selection.yaml` -- select every choice believed correct. */
export const MultipleSelectionQuestion = z.strictObject({
	...questionBaseShape,
	type: z.literal("multiple-selection"),
	choices: z.array(BooleanChoice).min(2),
	grading: GradingType.optional(),
	shuffle: z.boolean().optional(),
});
export type MultipleSelectionQuestion = z.infer<
	typeof MultipleSelectionQuestion
>;

/** `schema/true-false.yaml` -- judge each statement true or false. */
export const TrueFalseQuestion = z.strictObject({
	...questionBaseShape,
	type: z.literal("true-false"),
	choices: z.array(Statement).min(2),
	grading: GradingType.optional(),
	shuffle: z.boolean().optional(),
});
export type TrueFalseQuestion = z.infer<typeof TrueFalseQuestion>;

/** `schema/numeric.yaml` -- enter a value, graded within a tolerance. */
export const NumericQuestion = z.strictObject({
	...questionBaseShape,
	...numericAnswerShape,
	type: z.literal("numeric"),
});
export type NumericQuestion = z.infer<typeof NumericQuestion>;

/**
 * `schema/short-answer.yaml` -- a short piece of free text, graded against an
 * answer key or a regular expression.
 *
 * The `if`/`then` in the YAML forbids an answer key on an `openEnded`
 * question: there would be nothing to grade it against. `preAccept` and
 * `preReject` stay allowed -- they validate a submission, never score it.
 */
export const ShortAnswerQuestion = z
	.strictObject({
		...questionBaseShape,
		...shortAnswerKeyShape,
		type: z.literal("short-answer"),
		openEnded: z.boolean().optional(),
	})
	.refine(
		(question) =>
			!question.openEnded ||
			(question.oneOf === undefined &&
				question.regex === undefined &&
				question.accept === undefined &&
				question.reject === undefined),
		{
			error:
				"an openEnded question is graded by hand and must not carry an answer key (oneOf, regex, accept or reject)",
		},
	);
export type ShortAnswerQuestion = z.infer<typeof ShortAnswerQuestion>;

/** `schema/essay.yaml` -- a free-form written answer. */
export const EssayQuestion = z.strictObject({
	...questionBaseShape,
	type: z.literal("essay"),
	input: EssayInput.optional(),
	highlight: z.string().min(1).optional(),
	answerKey: z.string().min(1).regex(/\S/).optional(),
});
export type EssayQuestion = z.infer<typeof EssayQuestion>;

/**
 * `schema/fill-in.yaml#/$defs/ChoiceBlank` -- a blank graded like a
 * multiple-choice question.
 */
export const ChoiceBlank = z.strictObject({
	id: Slug,
	type: z.literal("multiple-choice"),
	choices: z.array(ScoredChoice).min(2),
});
export type ChoiceBlank = z.infer<typeof ChoiceBlank>;

/** `schema/fill-in.yaml#/$defs/ShortAnswerBlank`. */
export const ShortAnswerBlank = z.strictObject({
	...shortAnswerKeyShape,
	id: Slug,
	type: z.literal("short-answer"),
});
export type ShortAnswerBlank = z.infer<typeof ShortAnswerBlank>;

/** `schema/fill-in.yaml#/$defs/NumericBlank`. */
export const NumericBlank = z.strictObject({
	...numericAnswerShape,
	id: Slug,
	type: z.literal("numeric"),
});
export type NumericBlank = z.infer<typeof NumericBlank>;

/** `schema/fill-in.yaml#/$defs/Blank`, discriminated by `type`. */
export const Blank = z.discriminatedUnion("type", [
	ChoiceBlank,
	ShortAnswerBlank,
	NumericBlank,
]);
export type Blank = z.infer<typeof Blank>;

/**
 * `schema/fill-in.yaml` -- a stem with named blanks, each its own small
 * graded question referenced from the stem as `[^id]`.
 */
export const FillInQuestion = z.strictObject({
	...questionBaseShape,
	type: z.literal("fill-in"),
	blanks: z.array(Blank).min(1),
	grading: GradingType.optional(),
	shuffle: z.boolean().optional(),
});
export type FillInQuestion = z.infer<typeof FillInQuestion>;

/**
 * One line as an `[indentation level, text]` pair --
 * `schema/ordering.yaml#/$defs/Line`. The level counts indentation units,
 * not spaces; the unit is inferred from the question.
 */
export const OrderingLine = z.tuple([z.number().int().min(0), z.string()]);
export type OrderingLine = z.infer<typeof OrderingLine>;

/** A sequence of lines in the order they are meant to be read. */
export const OrderingLines = z.array(OrderingLine).min(1);
export type OrderingLines = z.infer<typeof OrderingLines>;

/** `schema/ordering.yaml#/$defs/Alternative` -- an accepted or rejected ordering. */
export const OrderingAlternative = z.strictObject({
	lines: OrderingLines,
	feedback: z.string().min(1).optional(),
	comment: z.string().min(1).optional(),
});
export type OrderingAlternative = z.infer<typeof OrderingAlternative>;

/** `schema/ordering.yaml` -- sort a list of lines into the correct order. */
export const OrderingQuestion = z.strictObject({
	...questionBaseShape,
	type: z.literal("ordering"),
	lines: z.array(OrderingLine).min(2),
	extra: OrderingLines.optional(),
	accept: z.array(OrderingAlternative).min(1).optional(),
	reject: z.array(OrderingAlternative).min(1).optional(),
	content: OrderingContent.optional(),
	highlight: z.string().min(1).optional(),
	indentation: Indentation.optional(),
	unmatched: Unmatched.optional(),
	normalizations: z.array(Normalization).optional(),
});
export type OrderingQuestion = z.infer<typeof OrderingQuestion>;

/**
 * Any question document, discriminated by `type`.
 *
 * `ShortAnswerQuestion` carries a `.refine()`, so it is not a bare object
 * schema and cannot join a `discriminatedUnion`; the plain union costs a
 * little error-message precision and buys the conditional constraint.
 */
export const Question = z.union([
	MultipleChoiceQuestion,
	MultipleSelectionQuestion,
	TrueFalseQuestion,
	NumericQuestion,
	ShortAnswerQuestion,
	EssayQuestion,
	FillInQuestion,
	OrderingQuestion,
]);
export type Question = z.infer<typeof Question>;

/** The schema validating one specific question type. */
export const QUESTION_SCHEMAS = {
	"multiple-choice": MultipleChoiceQuestion,
	"multiple-selection": MultipleSelectionQuestion,
	"true-false": TrueFalseQuestion,
	numeric: NumericQuestion,
	"short-answer": ShortAnswerQuestion,
	essay: EssayQuestion,
	"fill-in": FillInQuestion,
	ordering: OrderingQuestion,
} as const satisfies Record<QuestionType, z.ZodType>;
