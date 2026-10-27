/**
 * Functions every question family shares. A port of `models/_base.py`.
 *
 * The validators of `BaseQuestion` (`blank-text`, `malformed-locale`,
 * `malformed-uuid`, `forbidden-block-element`) are here, as functions that
 * return `Diagnostic[]`. A family adds its own through `FamilyRules`
 * (`models/exam.ts`). `normalize`, `withIds` and `automation` are phase P7 of
 * `dev/plan/mdq-js-paridade.md` and `effectiveGrading` and `effectiveShuffle`
 * are P6: they are stubs that throw.
 */

import { type Diagnostic, diagnostic, type PathStep } from "../diagnostics.js";
import { hasVisibleCharacter, UUID_RE } from "../markdown.js";
import { findForbiddenElements } from "../parser/blocks.js";
import { repr } from "../parser/text.js";
import type { Question } from "../schema/index.js";
import type { MdqDocument } from "../validate.js";

/**
 * A rule of a family: `fields` are the checks of single fields (all of them
 * report, as pydantic field validators do), `models` the checks of the whole
 * question, run in order only if no field check and no check of an inner model
 * failed (as pydantic `after` validators). Only the first failing `models`
 * check reports, since a raised error ends the chain.
 */
export interface FamilyRules<Q> {
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

/** How much of the grading the library does without an instructor. */
export type Automation = "automatic" | "semi-automatic" | "manual";

/**
 * The canonical form of a document: the one a render, then a parse, keeps
 * unchanged.
 */
export function normalize<T extends MdqDocument>(_document: T): T {
	throw new Error("not ported (P7)");
}

/** A copy of the document with every derivable id filled in. */
export function withIds<T extends MdqDocument>(_document: T): T {
	throw new Error("not ported (P7)");
}

/** The automation of a question (`docs/question-types/base.md`). */
export function automation(_question: Question): Automation {
	throw new Error("not ported (P7)");
}

/** The `grading` of a question outside any exam, with the default applied. */
export function effectiveGrading(_question: Question): string {
	throw new Error("not ported (P6)");
}

/** The `shuffle` of a question outside any exam, with the default applied. */
export function effectiveShuffle(_question: Question): boolean {
	throw new Error("not ported (P6)");
}
