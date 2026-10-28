/**
 * The pieces every question schema is assembled from.
 *
 * Mirrors `schema/question-base.yaml` and the `$defs` the per-type schemas
 * share (`Choice`, `Tolerance`, the short-answer pattern lists). The JSON
 * names are the schema's own -- camelCase, since this is the JSON document
 * shape itself, not a language-side model.
 */

import * as z from "zod";
import { UNICODE_SPACE } from "../parser/text.js";

/**
 * Url-friendly identifier, as used by question ids, choice ids and blank ids
 * -- `schema/question-base.yaml#/properties/id`.
 */
export const SLUG_PATTERN = /^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*$/;

/** `schema/question-base.yaml#/properties/uuid` -- not a format check, a shape one. */
export const UUID_PATTERN =
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * `schema/numeric.yaml#/properties/unit` -- the `UNIT` terminal of
 * docs/references/grammar.md: any run of characters that are not a
 * `UNICODE_SPACE`, a parenthesis or a bracket (`µm`, `°C`, `m/s`, `km/h`).
 *
 * No `u` flag: a JSON Schema pattern has no flags, and a converter that
 * prints `regex.toString()` would keep `/u`. Every character of the class is
 * in the BMP, so the negated class takes both halves of a surrogate pair and
 * matches the same strings without it.
 */
export const UNIT_PATTERN = new RegExp(`^[^()\\[\\]${UNICODE_SPACE}]+$`);

/**
 * `schema/numeric.yaml#/properties/answer`'s string form -- the bare `sign?
 * value` grammar (docs/question-types/numeric.md, "Answer representation"),
 * with no leading zeros and an optional exponent of one to three digits
 * (a fraction takes none). Shared by a numeric question's `answer` and a
 * numeric fill-in blank's `answer`.
 */
export const NUMERIC_STRING_ANSWER_PATTERN =
	/^[+-]?(?:(?:0|[1-9][0-9]*)\/[1-9][0-9]*|(?:(?:0|[1-9][0-9]*)\.[0-9]+|0|[1-9][0-9]*)(?:[eE][+-]?[0-9]{1,3})?)$/;

/**
 * `schema/short-answer.yaml#/$defs/patternString`: after optional leading
 * blanks, either a backtick literal (a non-empty span on one line, trailing
 * blanks allowed) or a text that does not open with a backtick. No line
 * break anywhere. Together with `minLength: 1`, a pattern of only blanks is
 * valid here.
 */
export const PATTERN_STRING_PATTERN =
	/^[ \t]*(?:`[^\r\n]+`[ \t]*|[^` \t\r\n][^\r\n]*)?$/;

/**
 * `schema/ordering.yaml#/$defs/Line` (text item): no leading or trailing
 * space or tab and no line break; empty is allowed here (a blank line of a
 * code block, which `OrderingLine` pins to level 0).
 */
export const ORDERING_LINE_TEXT_PATTERN =
	/^(?:[^ \t\r\n](?:[^\r\n]*[^ \t\r\n])?)?$/;

export const Slug = z
	.string()
	.regex(SLUG_PATTERN)
	.meta({ examples: ["berlin", "red-green-and-blue"] });

/**
 * The id of a question or an exam, and the target of an `include`. Any
 * non-empty string: the linter warns about ids that are not safe
 * (`unsafe-id`), but the schema accepts them. Choice and blank ids stay slugs.
 */
export const DocumentId = z.string().min(1);
export const Uuid = z
	.string()
	.regex(UUID_PATTERN)
	.meta({
		examples: [
			"123e4567-e89b-12d3-a456-426614174000",
			"550e8400-e29b-41d4-a716-446655440000",
			"f47ac10b-58cc-4372-a567-0e02b2c3d479",
		],
	});

/**
 * Structural equality per JSON Schema's own equality rule: same type,
 * numbers compared by value, arrays compared item-by-item in order, and
 * objects compared by key set regardless of insertion order. Reference
 * equality (`===`) is not enough for `uniqueItems`, since two structurally
 * identical objects or arrays are still duplicates.
 */
function jsonEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((item, index) => jsonEqual(item, b[index]))
		);
	}
	if (
		typeof a === "object" &&
		a !== null &&
		typeof b === "object" &&
		b !== null
	) {
		const aRecord = a as Record<string, unknown>;
		const bRecord = b as Record<string, unknown>;
		const aKeys = Object.keys(aRecord);
		const bKeys = Object.keys(bRecord);
		return (
			aKeys.length === bKeys.length &&
			aKeys.every(
				(key) =>
					Object.hasOwn(bRecord, key) && jsonEqual(aRecord[key], bRecord[key]),
			)
		);
	}
	return false;
}

/**
 * An array that rejects a duplicate item -- the JSON Schema `uniqueItems:
 * true` keyword, compared with JSON Schema equality (deep, not by
 * reference). Also registers `uniqueItems: true` as schema metadata, so
 * `z.toJSONSchema()` emits the same constraint it enforces at runtime.
 */
export function uniqueArray<Item extends z.ZodType>(item: Item) {
	return z
		.array(item)
		.refine(
			(items) =>
				items.every(
					(value, index) =>
						items.findIndex((other) => jsonEqual(other, value)) === index,
				),
			{ error: "array items must be unique" },
		)
		.meta({ uniqueItems: true });
}

/**
 * How a partially correct answer is scored. See the `Grading` section of the
 * matching document in `docs/question-types`. This is the strategy itself,
 * `schema/exam.yaml#/$defs/GradingStrategy`; a question may also write
 * `inherit`, and only some strategies apply to each type (the per-type enums
 * below).
 */
export const GradingType = z.enum([
	"partial",
	"no-mistakes",
	"all-or-nothing",
	"symmetric",
]);
export type GradingType = z.infer<typeof GradingType>;

/** `schema/multiple-choice.yaml#/allOf/1/properties/grading`, minus `inherit`. */
export const MultipleChoiceGradingType = z.enum(["partial", "symmetric"]);
export type MultipleChoiceGradingType = z.infer<
	typeof MultipleChoiceGradingType
>;

/** `schema/multiple-selection.yaml#/allOf/1/properties/grading`, minus `inherit`. */
export const MultipleSelectionGradingType = z.enum([
	"partial",
	"all-or-nothing",
	"symmetric",
]);
export type MultipleSelectionGradingType = z.infer<
	typeof MultipleSelectionGradingType
>;

/**
 * `schema/true-false.yaml#/allOf/1/properties/grading` and
 * `schema/fill-in.yaml#/allOf/1/properties/grading`, minus `inherit`: both
 * take every strategy.
 */
export const TrueFalseGradingType = GradingType;
export type TrueFalseGradingType = GradingType;

/** The `grading` of a question: one of its strategies, or `inherit` (the default) to take the exam's. */
export const MultipleChoiceGrading = z.enum([
	...MultipleChoiceGradingType.options,
	"inherit",
]);
export type MultipleChoiceGrading = z.infer<typeof MultipleChoiceGrading>;

export const MultipleSelectionGrading = z.enum([
	...MultipleSelectionGradingType.options,
	"inherit",
]);
export type MultipleSelectionGrading = z.infer<typeof MultipleSelectionGrading>;

export const TrueFalseGrading = z.enum([
	...TrueFalseGradingType.options,
	"inherit",
]);
export type TrueFalseGrading = z.infer<typeof TrueFalseGrading>;

/** `schema/fill-in.yaml#/allOf/1/properties/grading`: the same strategies as true/false. */
export const FillInGradingType = GradingType;
export type FillInGradingType = GradingType;

export const FillInGrading = TrueFalseGrading;
export type FillInGrading = TrueFalseGrading;

/**
 * The `shuffle` of a question: a value of its own, or `inherit` (the
 * default) to take the exam's, which is false outside an exam. Mirrors
 * `mdq.types.QuestionShuffle`.
 */
export const QuestionShuffle = z.union([z.boolean(), z.literal("inherit")]);
export type QuestionShuffle = z.infer<typeof QuestionShuffle>;

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

/** `schema/essay.yaml` -- the kind of response, and so of editor shown to the student. */
export const EssayContent = z.enum(["code", "text", "plain"]);
export type EssayContent = z.infer<typeof EssayContent>;

/** `schema/ordering.yaml` -- how the lines are written and presented. */
export const OrderingContent = z.enum(["code", "text"]);
export type OrderingContent = z.infer<typeof OrderingContent>;

/**
 * `schema/ordering.yaml` -- whether the student may re-indent a line, and
 * whether that indentation counts when grading.
 */
export const Indentation = z.enum(["fixed", "lenient", "strict"]);
export type Indentation = z.infer<typeof Indentation>;

/**
 * What becomes of a response no answer key matches -- `schema/ordering.yaml`
 * and `schema/short-answer.yaml#/$defs/unmatched`. `incorrect` scores it 0;
 * `manual` leaves it pending for the instructor.
 */
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
 * `schema/short-answer.yaml#/$defs/diacritics` -- how a plain literal, the
 * pattern compared inexactly, treats diacritics. Shared by a short-answer
 * question and a fill-in question, where it applies to every short-answer
 * blank.
 */
export const DiacriticsType = z.enum(["fold", "keep"]);
export type DiacriticsType = z.infer<typeof DiacriticsType>;

/**
 * Fields common to every question type -- `schema/question-base.yaml`.
 *
 * Exposed as a shape rather than a schema because the per-type schemas
 * compose it the way the YAML does with `allOf`, then close the result with
 * `unevaluatedProperties: false`; spreading the shape into a strict object is
 * the Zod equivalent of that composition.
 */
export const questionBaseShape = {
	id: DocumentId.optional(),
	uuid: Uuid.optional(),
	title: z.string().optional(),
	author: z.string().optional(),
	stem: z.string(),
	epilogue: z.string().optional(),
	comment: z.string().optional(),
	locale: z.string().optional(),
	tags: uniqueArray(z.string()).optional(),
	weight: z.number().min(0).optional(),
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
	text: z.string(),
	score: z.number().min(-1).max(1).optional(),
	feedback: z.string().optional(),
	comment: z.string().optional(),
});
export type ScoredChoice = z.infer<typeof ScoredChoice>;

/**
 * A multiple-selection option -- `schema/multiple-selection.yaml#/$defs/Choice`.
 * `correct` is required: every choice states its verdict, unlike
 * multiple-choice where a blank `[ ]` omits `score`.
 */
export const BooleanChoice = z.strictObject({
	id: Slug.optional(),
	text: z.string(),
	correct: z.boolean(),
	feedback: z.string().optional(),
	comment: z.string().optional(),
});
export type BooleanChoice = z.infer<typeof BooleanChoice>;

/**
 * A true/false statement -- `schema/true-false.yaml#/$defs/Choice`.
 *
 * `marker` keeps the letter written between the brackets verbatim: `correct`
 * carries the meaning, but the letter is what lets the linter warn about
 * unlisted spellings and locale mismatches, and what round-trips the
 * document unchanged. The schema only checks that it is not empty; the
 * single-letter rule is a lint rule (`malformed-true-false-marker`).
 */
export const Statement = z.strictObject({
	id: Slug.optional(),
	text: z.string(),
	correct: z.boolean(),
	marker: z.string().min(1).optional(),
	feedback: z.string().optional(),
	comment: z.string().optional(),
});
export type Statement = z.infer<typeof Statement>;

/**
 * Acceptable margin of error around a numeric answer --
 * `schema/numeric.yaml#/$defs/Tolerance`. At least one field is required; when both fields are given, a
 * submitted value is accepted if it satisfies either one.
 */
export const Tolerance = z
	.strictObject({
		absolute: z.number().min(0).optional(),
		relative: z.number().min(0).optional(),
	})
	// `minProperties: 1` -- an empty mapping is not a tolerance.
	.refine((tolerance) => Object.keys(tolerance).length >= 1, {
		error: "a tolerance needs at least one of `absolute` or `relative`",
	});
export type Tolerance = z.infer<typeof Tolerance>;

/**
 * One answer pattern -- `schema/short-answer.yaml#/$defs/patternString`.
 *
 * A regular expression when delimited by `/`, an exact literal when enclosed
 * in backticks, and a plain literal compared inexactly otherwise.
 */
export const PatternString = z
	.string()
	.min(1)
	.regex(PATTERN_STRING_PATTERN)
	.meta({ examples: ["Brasília", "`H2O`", "/rio s[aã]o francisco/i"] });

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
 * -- `accept`/`reject` for graded patterns that can carry feedback, and
 * `preAccept`/`preReject` for pre-submission validation that never touches
 * a score.
 */
export const shortAnswerKeyShape = {
	accept: PatternList.optional(),
	reject: PatternList.optional(),
	preAccept: PatternList.optional(),
	preReject: PatternList.optional(),
} as const;

/**
 * Numeric answer fields shared by a numeric question and a numeric blank.
 * `decimalPlaces` is ignored when `domain` is `integer` or `fraction`.
 *
 * `answer` written directly (not parsed from Markdown) may be a string
 * holding an exact fraction or decimal in the numeric body's own grammar,
 * e.g. `"1/3"` or `"-0.25"` -- `NUMERIC_STRING_ANSWER_PATTERN` rejects a
 * malformed one, including a fraction with a zero denominator.
 */
export const numericAnswerShape = {
	answer: z.union([
		z.number(),
		z
			.string()
			.regex(NUMERIC_STRING_ANSWER_PATTERN)
			.meta({ examples: ["1/3", "2.50", "6.022e23"] }),
	]),
	unit: z
		.string()
		.regex(UNIT_PATTERN)
		.meta({ examples: ["m/s", "km", "°C"] })
		.optional(),
	domain: NumericDomain.optional(),
	decimalPlaces: z.number().int().min(0).optional(),
	tolerance: Tolerance.optional(),
} as const;
