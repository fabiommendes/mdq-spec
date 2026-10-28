/**
 * The public form of a question and its correct responses
 * (`docs/public-form.md`).
 *
 * A port of `public()` and `correct_responses()`, which mdq-py spreads over
 * `models/_base.py`, `_choice.py`, `_numeric.py`, `_text.py`, `_fill_in.py`
 * and `_ordering.py`. Here they are two functions that dispatch on the
 * `type` of the question, in one module, like `models/exam.ts` does for
 * `withIds`. `public` is a reserved word in strict-mode JavaScript, so the
 * function is `publicForm`.
 */

import { MissingIdError } from "../errors.js";
import { exactLiteral } from "../exact.js";
import { strip } from "../parser/text.js";
import type {
	Blank,
	ChoiceBlank,
	DiacriticsType,
	EssayQuestion,
	FillInQuestion,
	MultipleChoiceQuestion,
	MultipleSelectionQuestion,
	NumericBlank,
	NumericDomain,
	NumericQuestion,
	OrderingLine,
	OrderingQuestion,
	PatternEntry,
	Question,
	ShortAnswerBlank,
	ShortAnswerQuestion,
	TrueFalseQuestion,
	Unmatched,
} from "../schema/index.js";
import { effectiveGrading } from "./base.js";
import { unspecifiedChoiceScore } from "./choice.js";
import { blankEffectiveUnmatched } from "./fill-in.js";
import {
	effectiveNumericDomain,
	inferDecimalPlaces,
	type NumericAnswer,
	type NumericKey,
	numericValue,
	roundHalfUp,
} from "./numeric.js";
import { effectiveUnmatched, matches, patternKind } from "./text.js";

/** The fields every public form copies as they are. */
type PublicBase<Q extends Question> = Pick<
	Q,
	Extract<
		| "type"
		| "id"
		| "uuid"
		| "title"
		| "stem"
		| "epilogue"
		| "tags"
		| "locale"
		| "weight",
		keyof Q
	>
>;

/** A choice as a student sees it: no score, verdict, feedback or comment. */
export type PublicChoice = { id: string; text: string };

/** A pre-validation pattern without its `comment`. */
export type PublicPattern = string | { pattern: string; feedback?: string };

export type PublicMultipleChoiceQuestion = PublicBase<MultipleChoiceQuestion> &
	Pick<MultipleChoiceQuestion, "shuffle" | "grading"> & {
		choices: PublicChoice[];
	};

export type PublicMultipleSelectionQuestion =
	PublicBase<MultipleSelectionQuestion> &
		Pick<MultipleSelectionQuestion, "shuffle" | "grading"> & {
			choices: PublicChoice[];
		};

export type PublicTrueFalseQuestion = PublicBase<TrueFalseQuestion> &
	Pick<TrueFalseQuestion, "shuffle" | "grading"> & {
		choices: PublicChoice[];
	};

/** The public values of a numeric key: the effective `domain` and `decimalPlaces`. */
type PublicNumericKey = Pick<NumericKey, "unit"> & {
	domain: NumericDomain;
	decimalPlaces?: number;
};

export type PublicNumericQuestion = PublicBase<NumericQuestion> &
	PublicNumericKey;

/** The public values of a short-answer key. */
type PublicPatternKey = {
	preAccept?: PublicPattern[];
	preReject?: PublicPattern[];
};

/**
 * `unmatched` is the effective value, always present: its default depends on
 * `accept`, which is private.
 */
export type PublicShortAnswerQuestion = PublicBase<ShortAnswerQuestion> &
	Pick<ShortAnswerQuestion, "diacritics"> &
	PublicPatternKey & { unmatched: Unmatched };

export type PublicEssayQuestion = PublicBase<EssayQuestion> &
	Pick<EssayQuestion, "content" | "highlight">;

export type PublicChoiceBlank = Pick<ChoiceBlank, "id" | "type"> & {
	choices: PublicChoice[];
};
/** `unmatched` is the effective value of the blank, as in a short answer question. */
export type PublicShortAnswerBlank = Pick<ShortAnswerBlank, "id" | "type"> &
	PublicPatternKey & { unmatched: Unmatched };
export type PublicNumericBlank = Pick<NumericBlank, "id" | "type"> &
	PublicNumericKey;
export type PublicBlank =
	| PublicChoiceBlank
	| PublicShortAnswerBlank
	| PublicNumericBlank;

export type PublicFillInQuestion = PublicBase<FillInQuestion> &
	Pick<FillInQuestion, "shuffle" | "grading" | "diacritics"> & {
		/** The question `unmatched` is not copied: each short answer blank holds its own. */
		blanks: PublicBlank[];
	};

export type PublicOrderingQuestion = PublicBase<OrderingQuestion> &
	Pick<
		OrderingQuestion,
		"content" | "highlight" | "indentation" | "normalizations"
	> & {
		/** The effective value, always present. */
		unmatched: NonNullable<OrderingQuestion["unmatched"]>;
		/** The `lines` and the `extra` lines, sorted, with the levels the student may see. */
		pool: OrderingLine[];
	};

/** A question as a student may see it. */
export type PublicQuestion =
	| PublicMultipleChoiceQuestion
	| PublicMultipleSelectionQuestion
	| PublicTrueFalseQuestion
	| PublicNumericQuestion
	| PublicShortAnswerQuestion
	| PublicEssayQuestion
	| PublicFillInQuestion
	| PublicOrderingQuestion;

const BASE_KEYS = [
	"type",
	"id",
	"uuid",
	"title",
	"stem",
	"epilogue",
	"tags",
	"locale",
	"weight",
] as const;

/** The entries of `source` for `keys` that are defined: an absent field is omitted. */
function copy(
	source: object,
	keys: readonly string[],
): Record<string, unknown> {
	const record = source as Record<string, unknown>;
	const copied: Record<string, unknown> = {};
	for (const key of keys) {
		if (record[key] !== undefined) copied[key] = record[key];
	}
	return copied;
}

/**
 * The id of `choice`.
 *
 * @throws {MissingIdError} The choice has no id. Neither `publicForm` nor
 *   `correctResponses` derives one: grading does not either, so the host calls
 *   `withIds` and stores the result.
 */
function requireChoiceId(choice: {
	readonly id?: string | undefined;
	readonly text: string;
}): string {
	if (choice.id === undefined) {
		throw new MissingIdError(
			`choice ${JSON.stringify(choice.text)} has no id; call withIds() and store the result`,
		);
	}
	return choice.id;
}

function publicChoices(
	choices: readonly {
		readonly id?: string | undefined;
		readonly text: string;
	}[],
): PublicChoice[] {
	return choices.map((choice) => ({
		id: requireChoiceId(choice),
		text: choice.text,
	}));
}

/**
 * The ids of the choices whose effective score is exactly 1. A choice that
 * declares no score gets `unspecifiedChoiceScore`, which is never above 0. A
 * choice blank uses it too, with `symmetric` false.
 *
 * @throws {MissingIdError} A correct choice has no id.
 */
function correctChoiceIds(
	choices: readonly {
		readonly id?: string | undefined;
		readonly text: string;
		readonly score?: number | undefined;
	}[],
	symmetric: boolean,
): string[] {
	const unspecified = unspecifiedChoiceScore(choices, symmetric);
	return choices
		.filter((choice) => (choice.score ?? unspecified) === 1)
		.map(requireChoiceId);
}

/** A pre-validation pattern without its `comment`: the bare string when it has no `feedback`. */
function publicPattern(entry: PatternEntry): PublicPattern {
	if (typeof entry === "string") return entry;
	if (entry.feedback === undefined) return entry.pattern;
	return { pattern: entry.pattern, feedback: entry.feedback };
}

function publicPatternKey(key: {
	readonly preAccept?: readonly PatternEntry[] | undefined;
	readonly preReject?: readonly PatternEntry[] | undefined;
}): PublicPatternKey {
	const data: PublicPatternKey = {};
	if (key.preAccept !== undefined) {
		data.preAccept = key.preAccept.map(publicPattern);
	}
	if (key.preReject !== undefined) {
		data.preReject = key.preReject.map(publicPattern);
	}
	return data;
}

/** The effective `decimalPlaces`: the declared value, or the inferred one in a `decimal` domain. */
function effectiveDecimalPlaces(key: NumericKey): number | undefined {
	if (key.decimalPlaces !== undefined) return key.decimalPlaces;
	return effectiveNumericDomain(key.answer, key.domain, key.tolerance) ===
		"decimal"
		? inferDecimalPlaces(key.answer, key.tolerance)
		: undefined;
}

function publicNumericKey(key: NumericKey): PublicNumericKey {
	const data: PublicNumericKey = {
		domain: effectiveNumericDomain(key.answer, key.domain, key.tolerance),
	};
	if (key.unit !== undefined) data.unit = key.unit;
	const places = effectiveDecimalPlaces(key);
	if (places !== undefined) data.decimalPlaces = places;
	return data;
}

/**
 * The `answer` as a response that scores 1: the answer as the document holds
 * it, with no unit. A fraction answer in a `decimal` domain is not a valid
 * response, so it is the answer rounded to the effective `decimalPlaces` and
 * written as a decimal string (`"1/3"` with 2 places is `"0.33"`).
 */
function correctNumericAnswer(key: NumericKey): NumericAnswer {
	const places = effectiveDecimalPlaces(key);
	const isFraction = typeof key.answer === "string" && key.answer.includes("/");
	if (
		!isFraction ||
		places === undefined ||
		effectiveNumericDomain(key.answer, key.domain, key.tolerance) !== "decimal"
	) {
		return key.answer;
	}
	const rounded = roundHalfUp(numericValue(key.answer), places);
	const units = rounded
		.abs()
		.mul(10n ** BigInt(places))
		.floor().n;
	const digits = units.toString().padStart(places + 1, "0");
	const whole = digits.slice(0, digits.length - places);
	const decimals = digits.slice(digits.length - places);
	const sign = rounded.lt(0) ? "-" : "";
	return places > 0 ? `${sign}${whole}.${decimals}` : `${sign}${whole}`;
}

/**
 * The texts of the `accept` literals, inexact and exact, without delimiters,
 * in document order. A regex is left out, and so is a literal that does not
 * match itself: each text returned scores 1.
 */
function literalResponses(
	accept: readonly PatternEntry[] | undefined,
	diacritics: DiacriticsType,
): string[] {
	const responses: string[] = [];
	for (const entry of accept ?? []) {
		const pattern = typeof entry === "string" ? entry : entry.pattern;
		const kind = patternKind(pattern);
		if (kind === "regex") continue;
		const text =
			kind === "exact" ? exactLiteral(pattern) : strip(pattern, " \t");
		if (text !== undefined && matches(entry, text, diacritics)) {
			responses.push(text);
		}
	}
	return responses;
}

/** Compare two strings by code point, not by UTF-16 code unit. */
function compareCodePoints(a: string, b: string): number {
	const left = Array.from(a, (char) => char.codePointAt(0) as number);
	const right = Array.from(b, (char) => char.codePointAt(0) as number);
	const shared = Math.min(left.length, right.length);
	for (let i = 0; i < shared; i++) {
		const diff = (left[i] as number) - (right[i] as number);
		if (diff !== 0) return diff;
	}
	return left.length - right.length;
}

/**
 * The `pool`: the `lines` and the `extra` lines together, sorted by text in
 * code point order, then by level. Under `fixed` a line keeps its authored
 * level; under `lenient` and `strict` the student sets the levels, so every
 * level is 0. Texts are verbatim: blank and repeated lines stay.
 */
function orderingPool(question: OrderingQuestion): OrderingLine[] {
	const fixed = (question.indentation ?? "fixed") === "fixed";
	const lines = [...question.lines, ...(question.extra ?? [])];
	return lines
		.map(([level, text]): OrderingLine => [fixed ? level : 0, text])
		.sort((a, b) => compareCodePoints(a[1], b[1]) || a[0] - b[0]);
}

function publicBlank(
	blank: Blank,
	unmatched: Unmatched | undefined,
): PublicBlank {
	switch (blank.type) {
		case "multiple-choice":
			return {
				id: blank.id,
				type: blank.type,
				choices: publicChoices(blank.choices),
			};
		case "numeric":
			return { id: blank.id, type: blank.type, ...publicNumericKey(blank) };
		case "short-answer":
			return {
				id: blank.id,
				type: blank.type,
				...publicPatternKey(blank),
				unmatched: blankEffectiveUnmatched(blank, unmatched),
			};
	}
}

/**
 * The public form of `question`: what a student may see.
 *
 * An object in the shape of the question document, without the private
 * fields (the answer key, `feedback`, `comment`, `author`, `meta` and the
 * like), and with some derived values (the effective `domain` of a numeric
 * question, the `pool` of an ordering question). An absent field is omitted,
 * never `null`. See `docs/public-form.md`.
 *
 * @throws {MissingIdError} A choice has no id. Call `withIds` first, and
 *   store the result: grading needs the same ids.
 */
export function publicForm(
	question: MultipleChoiceQuestion,
): PublicMultipleChoiceQuestion;
export function publicForm(
	question: MultipleSelectionQuestion,
): PublicMultipleSelectionQuestion;
export function publicForm(
	question: TrueFalseQuestion,
): PublicTrueFalseQuestion;
export function publicForm(question: NumericQuestion): PublicNumericQuestion;
export function publicForm(
	question: ShortAnswerQuestion,
): PublicShortAnswerQuestion;
export function publicForm(question: EssayQuestion): PublicEssayQuestion;
export function publicForm(question: FillInQuestion): PublicFillInQuestion;
export function publicForm(question: OrderingQuestion): PublicOrderingQuestion;
export function publicForm(question: Question): PublicQuestion;
export function publicForm(question: Question): PublicQuestion {
	const base = copy(question, BASE_KEYS);
	switch (question.type) {
		case "multiple-choice":
		case "multiple-selection":
		case "true-false":
			return {
				...base,
				...copy(question, ["shuffle", "grading"]),
				choices: publicChoices(question.choices),
			} as PublicQuestion;
		case "numeric":
			return { ...base, ...publicNumericKey(question) } as PublicQuestion;
		case "short-answer":
			return {
				...base,
				...copy(question, ["diacritics"]),
				...publicPatternKey(question),
				unmatched: effectiveUnmatched(question),
			} as PublicQuestion;
		case "essay":
			return {
				...base,
				...copy(question, ["content", "highlight"]),
			} as PublicQuestion;
		case "fill-in":
			return {
				...base,
				...copy(question, ["shuffle", "grading", "diacritics"]),
				blanks: question.blanks.map((blank) =>
					publicBlank(blank, question.unmatched),
				),
			} as PublicQuestion;
		case "ordering":
			return {
				...base,
				...copy(question, [
					"content",
					"highlight",
					"indentation",
					"normalizations",
				]),
				unmatched: question.unmatched ?? "incorrect",
				pool: orderingPool(question),
			} as PublicQuestion;
	}
}

/** The correct responses of a blank, by its kind. */
function blankCorrectResponses(
	blank: Blank,
	diacritics: DiacriticsType,
): (string | number)[] {
	switch (blank.type) {
		case "multiple-choice":
			return correctChoiceIds(blank.choices, false);
		case "numeric":
			return [correctNumericAnswer(blank)];
		case "short-answer":
			return literalResponses(blank.accept, diacritics);
	}
}

/**
 * The responses that score 1, derived from the answer key.
 *
 * A list of full responses, each in the shape of `docs/responses.md`. A
 * fill-in question returns a record from blank id to the responses of that
 * blank instead, since a list of full responses would hold every combination.
 * An essay gives its `answerKey`, a model answer that does not score 1
 * automatically.
 *
 * @throws {MissingIdError} A correct choice has no id.
 */
export function correctResponses(question: MultipleChoiceQuestion): string[];
export function correctResponses(
	question: MultipleSelectionQuestion,
): string[][];
export function correctResponses(
	question: TrueFalseQuestion,
): Record<string, boolean>[];
export function correctResponses(question: NumericQuestion): NumericAnswer[];
export function correctResponses(
	question: ShortAnswerQuestion | EssayQuestion,
): string[];
export function correctResponses(
	question: FillInQuestion,
): Record<string, (string | number)[]>;
export function correctResponses(question: OrderingQuestion): OrderingLine[][];
export function correctResponses(
	question: Question,
):
	| string[]
	| string[][]
	| Record<string, boolean>[]
	| NumericAnswer[]
	| Record<string, (string | number)[]>
	| OrderingLine[][];
export function correctResponses(question: Question): unknown {
	switch (question.type) {
		case "multiple-choice":
			return correctChoiceIds(
				question.choices,
				effectiveGrading(question) === "symmetric",
			);
		case "multiple-selection":
			return [
				question.choices
					.filter((choice) => choice.correct)
					.map(requireChoiceId),
			];
		case "true-false":
			return [
				Object.fromEntries(
					question.choices.map((choice) => [
						requireChoiceId(choice),
						choice.correct,
					]),
				),
			];
		case "numeric":
			return [correctNumericAnswer(question)];
		case "short-answer":
			return literalResponses(question.accept, question.diacritics ?? "fold");
		case "essay":
			return question.answerKey === undefined ? [] : [question.answerKey];
		case "fill-in":
			return Object.fromEntries(
				question.blanks.map((blank) => [
					blank.id,
					blankCorrectResponses(blank, question.diacritics ?? "fold"),
				]),
			);
		case "ordering":
			return [
				question.lines,
				...(question.accept ?? []).map((alt) => alt.lines),
			].map((block) =>
				block.map(([level, text]): OrderingLine => [level, text]),
			);
	}
}
