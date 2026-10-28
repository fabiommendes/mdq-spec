/**
 * Functions every question family shares. A port of `models/_base.py`.
 *
 * The validators of `BaseQuestion` (`blank-text`, `malformed-locale`,
 * `malformed-uuid`, `forbidden-block-element`) are here, as functions that
 * return `Diagnostic[]`. A family adds its own through `FamilyRules`
 * (`models/exam.ts`). `normalize` is here; `withIds` and `automation` dispatch
 * on the question type, so they are in `models/exam.ts`.
 */

import { type Diagnostic, diagnostic, type PathStep } from "../diagnostics.js";
import { hasVisibleCharacter, UUID_RE } from "../markdown.js";
import { findForbiddenElements, reconstructBlocks } from "../parser/blocks.js";
import { repr, rstrip, SPACE, strip } from "../parser/text.js";
import type { GradingType, Question } from "../schema/index.js";
import type { MdqDocument } from "../validate.js";
import {
	checkIdAndTitleDefined,
	checkIdIsUrlSafe,
	checkLocaleLanguageSubtag,
	checkStrayChoiceMarkers,
	checkTags,
	checkUnsafeThematicBreak,
	checkUuidVersionAndVariant,
} from "./lint.js";
import { normalizeByType } from "./normalize.js";

/**
 * A rule of a family: `fields` are the checks of single fields (all of them
 * report, as pydantic field validators do), `models` the checks of the whole
 * question, run in order only if no field check and no check of an inner model
 * failed (as pydantic `after` validators). Only the first failing `models`
 * check reports, since a raised error ends the chain.
 */
export interface FamilyRules<Q> {
	/**
	 * The `warning` and `info` rules of the family, beyond `baseLint`, with
	 * paths relative to the question.
	 */
	readonly lint?: (question: Q) => Diagnostic[];
	readonly fields?: (question: Q, path: readonly PathStep[]) => Diagnostic[];
	readonly models?: readonly ((
		question: Q,
		path: readonly PathStep[],
	) => Diagnostic | undefined)[];
}

/** An `error` diagnostic with the code of a named model rule. */
export function modelError(
	code: string,
	message: string,
	path: readonly PathStep[] = [],
): Diagnostic {
	return diagnostic("error", code, message, path);
}

/** The `langtag` and `privateuse` productions of BCP 47 (RFC 5646), case-insensitive. */
const BCP47 =
	/^(?:(?:[a-zA-Z]{2,3}(?:-[a-zA-Z]{3}){0,2}|[a-zA-Z]{4,8})(?:-[a-zA-Z]{4})?(?:-(?:[a-zA-Z]{2}|[0-9]{3}))?(?:-(?:[a-zA-Z0-9]{5,8}|[0-9][a-zA-Z0-9]{3}))*(?:-[a-wyzA-WYZ0-9](?:-[a-zA-Z0-9]{2,8})+)*(?:-[xX](?:-[a-zA-Z0-9]{1,8})+)?|[xX](?:-[a-zA-Z0-9]{1,8})+)$/u;

const GRANDFATHERED_TAGS: ReadonlySet<string> = new Set(
	[
		"en-GB-oed",
		"i-ami",
		"i-bnn",
		"i-default",
		"i-enochian",
		"i-hak",
		"i-klingon",
		"i-lux",
		"i-mingo",
		"i-navajo",
		"i-pwn",
		"i-tao",
		"i-tay",
		"i-tsu",
		"sgn-BE-FR",
		"sgn-BE-NL",
		"sgn-CH-DE",
		"art-lojban",
		"cel-gaulish",
		"no-bok",
		"no-nyn",
		"zh-guoyu",
		"zh-hakka",
		"zh-min",
		"zh-min-nan",
		"zh-xiang",
	].map((tag) => tag.toLowerCase()),
);

/**
 * generic.md [^4]: `locale`, if defined, must be a well-formed BCP 47 tag
 * (`malformed-locale`). Only the grammar is checked, not the registry.
 */
export function localeDiagnostics(
	value: unknown,
	path: readonly PathStep[] = ["locale"],
): Diagnostic[] {
	if (typeof value !== "string") return [];
	if (BCP47.test(value) || GRANDFATHERED_TAGS.has(value.toLowerCase())) {
		return [];
	}
	return [
		modelError(
			"malformed-locale",
			`${repr(value)} is not a well-formed BCP 47 language tag; expected a form like 'en', 'pt-BR', or 'zh-Hans-CN'`,
			path,
		),
	];
}

/** generic.md [^3]: `uuid`, if defined, has the UUID shape (`malformed-uuid`). */
export function uuidDiagnostics(
	value: unknown,
	path: readonly PathStep[] = ["uuid"],
): Diagnostic[] {
	if (typeof value !== "string" || UUID_RE.test(value)) return [];
	return [
		modelError(
			"malformed-uuid",
			`${repr(value)} is not a valid UUID; expected the form xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`,
			path,
		),
	];
}

/**
 * generic.md: a free-text field, if defined, has at least one visible
 * character (`blank-text`). `field` is the name the message quotes.
 */
export function freeTextDiagnostics(
	value: unknown,
	field: string,
	path: readonly PathStep[],
): Diagnostic[] {
	if (typeof value !== "string" || hasVisibleCharacter(value)) return [];
	return [
		modelError(
			"blank-text",
			`'${field}' is defined but has no visible characters`,
			path,
		),
	];
}

/** `freeTextDiagnostics` for each named field of `record` and each entry of `tags`. */
export function freeTextFields(
	record: Readonly<Record<string, unknown>>,
	fields: readonly string[],
	prefix: readonly PathStep[] = [],
): Diagnostic[] {
	const found: Diagnostic[] = [];
	for (const field of fields) {
		found.push(
			...freeTextDiagnostics(record[field], field, [...prefix, field]),
		);
	}
	const tags = record.tags;
	if (Array.isArray(tags)) {
		tags.forEach((tag, index) => {
			found.push(
				...freeTextDiagnostics(tag, "tags", [...prefix, "tags", index]),
			);
		});
	}
	return found;
}

/** The free-text fields of a question (`BaseQuestion`). */
const QUESTION_TEXT_FIELDS = [
	"title",
	"author",
	"stem",
	"epilogue",
	"comment",
] as const;

/** The field validators of `BaseQuestion`. */
export function baseFieldRules(
	question: Readonly<Record<string, unknown>>,
	prefix: readonly PathStep[] = [],
): Diagnostic[] {
	return [
		...freeTextFields(question, QUESTION_TEXT_FIELDS, prefix),
		...localeDiagnostics(question.locale, [...prefix, "locale"]),
		...uuidDiagnostics(question.uuid, [...prefix, "uuid"]),
	];
}

/**
 * base.md, "Forbidden elements": `stem` and `epilogue` may not hold an H1
 * heading (ATX or setext), a heading or paragraph that starts with `[`, or an
 * unordered list whose items all start with `[`. A leading `[slug]` prefix is
 * exempt only on the first block of the stem. The first problem found is the
 * one reported.
 */
export function checkNoForbiddenBlockElements(
	question: Readonly<Record<string, unknown>>,
	prefix: readonly PathStep[] = [],
): Diagnostic | undefined {
	for (const [field, allowLeadingBracket] of [
		["stem", true],
		["epilogue", false],
	] as const) {
		const text = question[field];
		if (typeof text !== "string" || text === "") continue;
		const [description] = findForbiddenElements(text, allowLeadingBracket);
		if (description !== undefined) {
			return modelError(
				"forbidden-block-element",
				`'${field}' holds ${description}, which base.md's "Forbidden elements" reserves for the question body`,
				[...prefix, field],
			);
		}
	}
	return undefined;
}

/** The lint rules common to every question type (`BaseQuestion.lint`). */
export function baseLint(question: Question): Diagnostic[] {
	const found = [
		...checkUuidVersionAndVariant(question.uuid),
		...checkTags(question.tags ?? []),
		...checkLocaleLanguageSubtag(question.locale),
		...checkIdIsUrlSafe(question.id),
		...checkIdAndTitleDefined(question.id, question.title),
	];
	for (const field of ["stem", "epilogue"] as const) {
		found.push(
			...checkUnsafeThematicBreak(question[field], [field]),
			...checkStrayChoiceMarkers(question[field], [field]),
		);
	}
	return found;
}

/** Runs of backticks around a code span, kept apart when text is compared. */
const CODE_SPAN_RE = /(`+[^`]*`+)/u;
const SPACE_RUN_RE = new RegExp(`[${SPACE}]+`, "gu");

/**
 * Normalize `text` the way a Markdown renderer would, for comparing choice
 * texts as a reader sees them once rendered: whitespace runs collapse to a
 * single space in prose, but not inside code spans. A port of `_visual_key`.
 */
export function visualKey(text: string): string {
	const parts = text.split(CODE_SPAN_RE);
	const normalized = parts.map((part, index) =>
		index % 2 === 1 ? part : part.replace(SPACE_RUN_RE, " "),
	);
	return strip(normalized.join("").normalize("NFC"));
}

/** A choice, as the rules over a list of choices see it. */
interface ChoiceLike {
	readonly id?: string;
	readonly text: string;
}

/**
 * multiple-choice.md, "Choices": ids and texts are each unique in a list of
 * choices (`duplicate-choice-id`, `duplicate-choice-text`). Ids are compared
 * as they are, texts with `visualKey`. Only the first problem is reported.
 *
 * @param prefix Where the model that owns `choices` sits in the document.
 */
export function checkUniqueChoices(
	choices: readonly ChoiceLike[],
	prefix: readonly PathStep[] = [],
): Diagnostic | undefined {
	const seenIds = new Map<string, number>();
	const seenVisuals = new Map<string, number>();
	for (const [index, choice] of choices.entries()) {
		if (choice.id !== undefined) {
			const first = seenIds.get(choice.id);
			if (first !== undefined) {
				return modelError(
					"duplicate-choice-id",
					`choice id ${repr(choice.id)} is already used by choices[${first}]`,
					[...prefix, "choices", index, "id"],
				);
			}
			seenIds.set(choice.id, index);
		}
		const visual = visualKey(choice.text);
		const first = seenVisuals.get(visual);
		if (first !== undefined) {
			return modelError(
				"duplicate-choice-text",
				`choice text ${repr(choice.text)} is already used by choices[${first}]`,
				[...prefix, "choices", index, "text"],
			);
		}
		seenVisuals.set(visual, index);
	}
	return undefined;
}

/**
 * The `blank-text` check of the `text`, `feedback` and `comment` of each
 * choice of a list.
 *
 * @param prefix Where the model that owns `choices` sits in the document.
 */
export function choiceFreeTexts(
	choices: readonly object[],
	prefix: readonly PathStep[] = [],
): Diagnostic[] {
	return choices.flatMap((choice, index) =>
		freeTextFields(
			choice as Readonly<Record<string, unknown>>,
			["text", "feedback", "comment"],
			[...prefix, "choices", index],
		),
	);
}

/** How much of the grading the library does without an instructor. */
export type Automation = "automatic" | "semi-automatic" | "manual";

/** Trailing whitespace of each line, as `remove_trailing_ws` removes it. */
function removeTrailingWhitespace(text: string): string {
	return text
		.split("\n")
		.map((line) => rstrip(line))
		.join("\n");
}

/** The whitespace that CommonMark trims around a block. */
const ASCII_WS = " \t\r\n";

/**
 * Normalize a Markdown paragraph or series of blocks (an `epilogue`) with the
 * parser's own reconstruction of each block, so the result is a fixed point of
 * render-then-parse. A port of `normalize_paragraphs`.
 */
export function normalizeParagraphs(src: string): string {
	return reconstructBlocks(src)
		.map(([, text]) => text)
		.join("\n\n");
}

/**
 * Normalize a `stem`. Like {@link normalizeParagraphs}, but trims only ASCII
 * whitespace: a Unicode space is text. A stem with no block is returned
 * trimmed. A port of `normalize_stem`.
 */
export function normalizeStem(stem: string): string {
	const blocks = reconstructBlocks(strip(stem, ASCII_WS));
	if (blocks.length === 0) return strip(stem, ASCII_WS);
	return blocks.map(([, text]) => text).join("\n\n");
}

/**
 * The canonical form of a question: the one a render, then a parse, keeps
 * unchanged. Returns a copy; an empty `tags`, `epilogue` or `comment` becomes
 * absent.
 *
 * @throws {TypeError} The document is an exam: mdq-py has no `Exam.normalize`.
 */
export function normalize<T extends MdqDocument>(document: T): T {
	if ("questions" in document) {
		throw new TypeError("an exam has no normal form; normalize its questions");
	}
	const question: Question = document;
	const copy: Record<string, unknown> = { ...question };
	copy.stem = normalizeStem(question.stem);
	const setOrDrop = (key: string, value: string | undefined): void => {
		if (value === undefined || value === "") delete copy[key];
		else copy[key] = value;
	};
	setOrDrop(
		"epilogue",
		question.epilogue === undefined
			? undefined
			: normalizeParagraphs(question.epilogue),
	);
	setOrDrop(
		"comment",
		question.comment === undefined
			? undefined
			: removeTrailingWhitespace(question.comment),
	);
	if (question.tags !== undefined) {
		const tags = question.tags.map((tag) => strip(tag)).filter((tag) => tag);
		if (tags.length > 0) copy.tags = tags;
		else delete copy.tags;
	}
	if (question.author !== undefined) copy.author = strip(question.author);
	normalizeByType(question, copy);
	return copy as T;
}

/** The questions that choose a grading strategy and may be shuffled. */
export type GradedQuestion = Extract<
	Question,
	{ type: "multiple-choice" | "multiple-selection" | "true-false" | "fill-in" }
>;

/** Whether `question` has the `grading` and `shuffle` fields. */
export function isGradedQuestion(
	question: Question,
): question is GradedQuestion {
	return (
		question.type === "multiple-choice" ||
		question.type === "multiple-selection" ||
		question.type === "true-false" ||
		question.type === "fill-in"
	);
}

/**
 * The `grading` of a question outside any exam, with `inherit` read as
 * `symmetric`.
 *
 * @throws {TypeError} The question type has no `grading`.
 */
export function effectiveGrading(question: Question): GradingType {
	if (!isGradedQuestion(question)) {
		throw new TypeError(`a ${question.type} question has no grading`);
	}
	return question.grading === undefined || question.grading === "inherit"
		? "symmetric"
		: question.grading;
}

/**
 * The `shuffle` of a question outside any exam, with `inherit` read as
 * `false`.
 *
 * @throws {TypeError} The question type has no `shuffle`.
 */
export function effectiveShuffle(question: Question): boolean {
	if (!isGradedQuestion(question)) {
		throw new TypeError(`a ${question.type} question has no shuffle`);
	}
	return question.shuffle === undefined || question.shuffle === "inherit"
		? false
		: question.shuffle;
}
