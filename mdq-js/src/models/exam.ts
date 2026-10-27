/**
 * Exams: the model rules of an exam and of the question union, and the
 * inheritance of an exam (`grading` and `shuffle`). A port of
 * `mdq-py/mdq/models/_exam.py`.
 *
 * `validateQuestionModel` and `validateExamModel` are the validators the
 * Pydantic models run, as functions that return diagnostics. They assume
 * Zod accepted the document. `gradingFor`, `shuffleFor` and
 * `resolveQuestion` are NOT PORTED (phase P6 of
 * `dev/plan/mdq-js-paridade.md`): stubs that throw.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { md } from "../markdown.js";
import { repr } from "../parser/text.js";
import { canonicalDuration, canonicalStart } from "../schedule.js";
import type { Exam } from "../schema/exam.js";
import type { Question } from "../schema/index.js";
import type { QuestionType } from "../schema/questions.js";
import type { MdqDocument } from "../validate.js";
import {
	baseFieldRules,
	baseLint,
	checkNoForbiddenBlockElements,
	type FamilyRules,
	freeTextFields,
	localeDiagnostics,
	modelError,
	uuidDiagnostics,
} from "./base.js";
import {
	multipleChoiceRules,
	multipleSelectionRules,
	trueFalseRules,
} from "./choice.js";
import { fillInRules } from "./fill-in.js";
import {
	checkIdAndTitleDefined,
	checkIdIsUrlSafe,
	checkLocaleLanguageSubtag,
	checkSetextHeading,
	checkTags,
	checkUnsafeThematicBreak,
	checkUuidVersionAndVariant,
} from "./lint.js";
import { lintDiagnostic } from "./lint-codes.js";
import { numericRules } from "./numeric.js";
import { orderingRules } from "./ordering.js";
import { isStandardQuery } from "./query.js";
import { essayRules, shortAnswerRules } from "./text.js";

/**
 * The rules of each question family, beyond `BaseQuestion`'s. A family module
 * (`choice.ts`, `numeric.ts`, ...) exports its rules, registered here.
 */
// biome-ignore lint/suspicious/noExplicitAny: each entry takes its own question type
export const FAMILY_RULES: Partial<Record<QuestionType, FamilyRules<any>>> = {
	"multiple-choice": multipleChoiceRules,
	"multiple-selection": multipleSelectionRules,
	"true-false": trueFalseRules,
	numeric: numericRules,
	"short-answer": shortAnswerRules,
	essay: essayRules,
	"fill-in": fillInRules,
	ordering: orderingRules,
};

/**
 * The model rules of a question that Zod accepted: the field validators of
 * `BaseQuestion` and of the family, then, if none failed, the first failing
 * check of the whole model. `path` is where the question sits in the
 * document.
 */
export function validateQuestionModel(
	question: Question,
	path: readonly PathStep[] = [],
): Diagnostic[] {
	const record = question as unknown as Readonly<Record<string, unknown>>;
	const family = FAMILY_RULES[question.type];
	const fields = [
		...baseFieldRules(record, path),
		...(family?.fields?.(question, path) ?? []),
	];
	if (fields.length > 0) return fields;
	const forbidden = checkNoForbiddenBlockElements(record, path);
	if (forbidden !== undefined) return [forbidden];
	for (const check of family?.models ?? []) {
		const found = check(question, path);
		if (found !== undefined) return [found];
	}
	return [];
}

/** Whether `text` holds an H1 heading, ATX (`# Heading`) or setext (`Text` over `===`). */
function hasH1(text: string): boolean {
	return md
		.parse(text, {})
		.some((token) => token.type === "heading_open" && token.tag === "h1");
}

/** Python's `str(exc)` for a `RangeError` of `schedule.ts`. */
function rangeMessage(error: unknown): string {
	if (error instanceof RangeError) return error.message;
	throw error;
}

/**
 * exam.md, "Duration and Start Time": `start` MUST be ISO 8601
 * (`malformed-start`) and `duration` a positive duration of fixed-length
 * units (`invalid-duration`). `value` may be in a surface form the schema
 * does not accept (`1:30`, `2026-03-10 14:00`).
 */
export function scheduleDiagnostic(
	field: "start" | "duration",
	value: unknown,
	path: readonly PathStep[] = [field],
): Diagnostic | undefined {
	try {
		if (field === "start") canonicalStart(value);
		else canonicalDuration(value);
		return undefined;
	} catch (error) {
		return modelError(
			field === "start" ? "malformed-start" : "invalid-duration",
			rangeMessage(error),
			path,
		);
	}
}

/** The free-text fields of an exam. */
const EXAM_TEXT_FIELDS = [
	"title",
	"description",
	"course",
	"author",
	"instructions",
	"comment",
] as const;

/** The field validators of the exam itself. */
function examFieldRules(exam: Readonly<Record<string, unknown>>): Diagnostic[] {
	const found = [
		...freeTextFields(exam, EXAM_TEXT_FIELDS),
		...localeDiagnostics(exam.locale),
		...uuidDiagnostics(exam.uuid),
	];
	const instructions = exam.instructions;
	if (typeof instructions === "string" && instructions && hasH1(instructions)) {
		found.push(
			modelError(
				"forbidden-block-element",
				"'instructions' holds an H1 heading, which exam.md's \"Body\" forbids",
				["instructions"],
			),
		);
	}
	for (const field of ["start", "duration"] as const) {
		if (exam[field] === undefined) continue;
		const problem = scheduleDiagnostic(field, exam[field]);
		if (problem !== undefined) found.push(problem);
	}
	return found;
}

/**
 * exam.md, "Question ids": declared ids are unique within the exam, and none
 * equals the implicit id (`q1`, `q2`, ...) another question would get. An
 * `include` counts with the id it references; an `includeAll` adds unknown
 * questions, so the implicit ids after it are not checked.
 */
function checkQuestionsHaveUniqueIds(
	entries: readonly Readonly<Record<string, unknown>>[],
): Diagnostic | undefined {
	const seen = new Map<string, number>();
	for (const [index, entry] of entries.entries()) {
		if ("includeAll" in entry) continue;
		const id = "include" in entry ? entry.include : entry.id;
		if (typeof id !== "string") continue;
		const first = seen.get(id);
		if (first !== undefined) {
			return modelError(
				"duplicate-question-id",
				`question id ${repr(id)} is already used by questions[${first}]`,
				["questions", index],
			);
		}
		seen.set(id, index);
	}
	for (const [index, entry] of entries.entries()) {
		if ("includeAll" in entry) break;
		if ("include" in entry || entry.id !== undefined) continue;
		const implicit = `q${index + 1}`;
		const colliding = seen.get(implicit);
		if (colliding !== undefined) {
			return modelError(
				"duplicate-question-id",
				`question id ${repr(implicit)}, the implicit id questions[${index}] would get, is already used by questions[${colliding}]`,
				["questions", index],
			);
		}
	}
	return undefined;
}

/**
 * The model rules of an exam that Zod accepted: the field validators of the
 * exam and of each inline question, then, if none failed, the uniqueness of
 * the question ids. `include` and `includeAll` blocks have no rule here:
 * their unknown fields are `unknown-include-field` (see `loading.ts`, which
 * reads them from the schema issue) and `include`/`includeAll` that are not
 * strings are schema errors.
 */
export function validateExamModel(exam: Exam): Diagnostic[] {
	const found = examFieldRules(exam as unknown as Record<string, unknown>);
	const entries = exam.questions as unknown as Readonly<
		Record<string, unknown>
	>[];
	for (const [index, entry] of entries.entries()) {
		if ("include" in entry || "includeAll" in entry) continue;
		found.push(
			...validateQuestionModel(entry as unknown as Question, [
				"questions",
				index,
			]),
		);
	}
	if (found.length > 0) return found;
	const duplicate = checkQuestionsHaveUniqueIds(entries);
	return duplicate === undefined ? [] : [duplicate];
}

/**
 * The `warning` and `info` diagnostics of a question that Zod and the model
 * rules accepted: the rules of every question type, then those of its
 * family. `path` is where the question sits in the document.
 */
export function lintQuestion(
	question: Question,
	path: readonly PathStep[] = [],
): Diagnostic[] {
	const found = [
		...baseLint(question),
		...(FAMILY_RULES[question.type]?.lint?.(question) ?? []),
	];
	return found.map((d) => ({ ...d, path: [...path, ...d.path] }));
}

/**
 * The lint rules of an exam, then those of each inline question with
 * `["questions", i]` before its paths.
 *
 * exam.md, "Additional Rules", imports every base rule of a field the exam
 * shares with a question. A `---` or `===` glued to the text of a `stem` or
 * `epilogue` inside an exam is a setext heading (`setext-heading`).
 */
export function lintExam(exam: Exam): Diagnostic[] {
	const found: Diagnostic[] = [];
	if (exam.questions.length === 0) {
		found.push(
			lintDiagnostic(
				"exam-without-questions",
				["questions"],
				"the exam contains no questions, so it cannot be answered",
			),
		);
	}
	found.push(
		...checkIdIsUrlSafe(exam.id),
		...checkIdAndTitleDefined(exam.id, exam.title),
		...checkUuidVersionAndVariant(exam.uuid),
		...checkTags(exam.tags ?? []),
		...checkLocaleLanguageSubtag(exam.locale),
		...checkSetextHeading(exam.instructions, ["instructions"]),
		...checkUnsafeThematicBreak(exam.instructions, ["instructions"]),
	);
	let afterIncludeAll = false;
	for (const [index, entry] of exam.questions.entries()) {
		const path = ["questions", index];
		if ("includeAll" in entry) {
			afterIncludeAll = true;
			if (!isStandardQuery(entry.includeAll)) {
				found.push(
					lintDiagnostic(
						"nonstandard-include-query",
						[...path, "includeAll"],
						`the query ${repr(entry.includeAll)} does not follow the recommended query language`,
					),
				);
			}
		} else if (!("include" in entry)) {
			const question = entry as Question;
			if (afterIncludeAll && question.id === undefined) {
				found.push(
					lintDiagnostic(
						"undeclared-id-after-include-all",
						[...path, "id"],
						"the derived id of a question after an 'includeAll' changes with the questions the query adds; declare an 'id'",
					),
				);
			}
			found.push(...lintQuestion(question, path));
			for (const field of ["stem", "epilogue"] as const) {
				found.push(...checkSetextHeading(question[field], [...path, field]));
			}
		}
	}
	return found;
}

/**
 * Every `warning` and `info` diagnostic of a question or an exam that passed
 * validation (`Question.lint()` and `Exam.lint()`).
 */
export function lint(document: MdqDocument): Diagnostic[] {
	return "questions" in document
		? lintExam(document)
		: lintQuestion(document as Question);
}

/** The `grading` a question has once the exam default is applied. */
export function gradingFor(_exam: Exam, _question: Question): string {
	throw new Error("not ported (P6)");
}

/** The `shuffle` a question has once the exam default is applied. */
export function shuffleFor(_exam: Exam, _question: Question): boolean {
	throw new Error("not ported (P6)");
}

/** A copy of `question` with the `grading` and `shuffle` of the exam applied. */
export function resolveQuestion(_exam: Exam, _question: Question): Question {
	throw new Error("not ported (P6)");
}
