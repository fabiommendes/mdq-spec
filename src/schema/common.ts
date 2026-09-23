/**
 * The pieces every question schema is assembled from.
 *
 * Mirrors `schema/question-base.yaml` and the `$defs` the per-type schemas
 * share (`Choice`, `Tolerance`, the short-answer pattern lists). The JSON
 * names are the schema's own -- camelCase, since this is the JSON document
 * shape itself, not a language-side model.
 */

import * as z from "zod";

/**
 * Url-friendly identifier, as used by question ids, choice ids and blank ids
 * -- `schema/question-base.yaml#/properties/id`.
 */
export const SLUG_PATTERN = /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/;

/** `schema/question-base.yaml#/properties/uuid` -- not a format check, a shape one. */
export const UUID_PATTERN =
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** `schema/numeric.yaml#/properties/unit`. */
export const UNIT_PATTERN = /^[\w.-]+$/;

/** At least one non-space character, the `pattern: "\\S"` the schemas use. */
export const NON_BLANK_PATTERN = /\S/;

export const Slug = z.string().regex(SLUG_PATTERN);
export const Uuid = z.string().regex(UUID_PATTERN);

/**
 * How a partially correct answer is scored. See the `Grading` section of the
 * matching document in `docs/question-types`.
 */
export const GradingType = z.enum(["partial", "all-or-nothing", "symmetric"]);
export type GradingType = z.infer<typeof GradingType>;

/** The question types an exam may assign a default grading strategy to. */
export const GradedQuestionType = z.enum([
	"multiple-choice",
	"multiple-selection",
	"true-false",
	"fill-in",
]);
export type GradedQuestionType = z.infer<typeof GradedQuestionType>;

/** `schema/numeric.yaml` and `schema/fill-in.yaml#/$defs/NumericBlank`. */
export const NumericDomain = z.enum(["integer", "decimal", "fraction"]);
export type NumericDomain = z.infer<typeof NumericDomain>;

/** `schema/essay.yaml` -- the kind of editor shown to the student. */
export const EssayInput = z.enum(["code", "text", "plain"]);
export type EssayInput = z.infer<typeof EssayInput>;

/** `schema/ordering.yaml` -- how the lines are written and presented. */
export const OrderingContent = z.enum(["code", "text"]);
export type OrderingContent = z.infer<typeof OrderingContent>;

/**
 * `schema/ordering.yaml` -- whether the student may re-indent a line, and
 * whether that indentation counts when grading.
 */
export const Indentation = z.enum(["fixed", "lenient", "strict"]);
export type Indentation = z.infer<typeof Indentation>;

/** `schema/ordering.yaml` -- what becomes of a response no answer key matches. */
export const Unmatched = z.enum(["manual", "incorrect"]);
export type Unmatched = z.infer<typeof Unmatched>;

/**
 * `schema/ordering.yaml` -- a transformation applied to both sides of every
 * comparison before they are matched.
 */
export const Normalization = z.enum(["dedent", "skip-blanks"]);
export type Normalization = z.infer<typeof Normalization>;

/** `schema/exam.yaml` -- whether a negative question score survives. */
export const PenaltyPolicy = z.enum(["none", "capped", "full"]);
export type PenaltyPolicy = z.infer<typeof PenaltyPolicy>;

/**
 * Fields common to every question type -- `schema/question-base.yaml`.
 *
 * Exposed as a shape rather than a schema because the per-type schemas
 * compose it the way the YAML does with `allOf`, then close the result with
 * `unevaluatedProperties: false`; spreading the shape into a strict object is
 * the Zod equivalent of that composition.
 */
export const questionBaseShape = {
	id: Slug.optional(),
	uuid: Uuid.optional(),
	title: z.string().min(1).optional(),
	author: z.string().min(1).optional(),
	stem: z.string().min(1),
	preamble: z.string().optional(),
	epilogue: z.string().optional(),
	comment: z.string().optional(),
	locale: z.string().optional(),
	tags: z.array(z.string()).optional(),
	meta: z.record(z.string(), z.unknown()).optional(),
} as const;

/**
 * A multiple-choice option -- `schema/multiple-choice.yaml#/$defs/Choice`.
 *
 * `score` is never clamped here: a value outside [-1, 1] is a malformed
 * question, and whether a negative one survives into an exam total is the
 * exam's `penalty` policy to decide.
 */
export const ScoredChoice = z.strictObject({
	id: Slug.optional(),
	text: z.string().min(1),
	score: z.number().min(-1).max(1).optional(),
	feedback: z.string().optional(),
	comment: z.string().optional(),
});
export type ScoredChoice = z.infer<typeof ScoredChoice>;

/** A multiple-selection option -- `schema/multiple-selection.yaml#/$defs/Choice`. */
export const BooleanChoice = z.strictObject({
	id: Slug.optional(),
	text: z.string().min(1),
	correct: z.boolean().optional(),
	feedback: z.string().optional(),
	comment: z.string().optional(),
});
export type BooleanChoice = z.infer<typeof BooleanChoice>;

/**
 * A true/false statement -- `schema/true-false.yaml#/$defs/Choice`.
 *
 * `marker` keeps the letter written between the brackets verbatim: `correct`
 * carries the meaning, but the letter is what lets the linter warn about
 * provisional spellings and locale mismatches, and what round-trips the
 * document unchanged.
 */
export const Statement = z.strictObject({
	id: Slug.optional(),
	text: z.string().min(1),
	correct: z.boolean().optional(),
	marker: z.string().min(1).max(1).optional(),
	feedback: z.string().optional(),
	comment: z.string().optional(),
});
export type Statement = z.infer<typeof Statement>;

/**
 * Acceptable margin of error around a numeric answer --
 * `schema/numeric.yaml#/$defs/Tolerance`. When both fields are given, a
 * submitted value is accepted if it satisfies either one.
 */
export const Tolerance = z.strictObject({
	absolute: z.number().min(0).optional(),
	relative: z.number().min(0).optional(),
});
export type Tolerance = z.infer<typeof Tolerance>;

/**
 * One answer pattern -- `schema/short-answer.yaml#/$defs/patternString`.
 *
 * A regular expression when delimited by `/`, an exact literal when enclosed
 * in backticks, and a plain literal compared inexactly otherwise; a lone `*`
 * is a wildcard matching every response.
 */
export const PatternString = z.string().min(1).regex(NON_BLANK_PATTERN);

/** The object form of a pattern -- `schema/short-answer.yaml#/$defs/pattern`. */
export const Pattern = z.strictObject({
	pattern: PatternString,
	feedback: z.string().optional(),
	comment: z.string().optional(),
});
export type Pattern = z.infer<typeof Pattern>;

/** An accept/reject entry: a bare pattern string, or the object form. */
export const PatternEntry = z.union([PatternString, Pattern]);
export type PatternEntry = z.infer<typeof PatternEntry>;

/** A list of answer patterns, tried in the order written. */
export const PatternList = z.array(PatternEntry).min(1);
export type PatternList = z.infer<typeof PatternList>;

/**
 * The answer machinery a short-answer question and a short-answer blank share
 * -- `oneOf`/`regex` for the key, `accept`/`reject` for graded patterns that
 * can carry feedback, and `preAccept`/`preReject` for pre-submission
 * validation that never touches a score.
 */
export const shortAnswerKeyShape = {
	oneOf: z.array(PatternString).min(1).optional(),
	regex: z.string().min(1).optional(),
	accept: PatternList.optional(),
	reject: PatternList.optional(),
	preAccept: PatternList.optional(),
	preReject: PatternList.optional(),
} as const;

/**
 * Numeric answer fields shared by a numeric question and a numeric blank.
 * `decimalPlaces` is ignored when `domain` is `integer` or `fraction`.
 */
export const numericAnswerShape = {
	answer: z.number(),
	unit: z.string().regex(UNIT_PATTERN).optional(),
	domain: NumericDomain.optional(),
	decimalPlaces: z.number().int().min(0).optional(),
	tolerance: Tolerance.optional(),
} as const;
