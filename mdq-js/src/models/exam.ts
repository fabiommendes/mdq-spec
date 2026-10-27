/**
 * Exams: the model rules of an exam and of the question union, and the
 * inheritance of an exam (`grading` and `shuffle`). A port of
 * `mdq-py/mdq/models/_exam.py`.
 *
 * `validateQuestionModel` and `validateExamModel` are the validators the
 * Pydantic models run, as functions that return diagnostics. They assume
 * Zod accepted the document. `gradingFor`, `shuffleFor` and
 * `resolveQuestion` apply the inheritance of an exam.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { UnresolvedInclude } from "../errors.js";
import { md } from "../markdown.js";
import { repr } from "../parser/text.js";
import { canonicalDuration, canonicalStart } from "../schedule.js";
import type { Exam } from "../schema/exam.js";
import type { GradingType, Question } from "../schema/index.js";
import type { QuestionType } from "../schema/questions.js";
import type { MdqDocument } from "../validate.js";
import {
	type Automation,
	baseFieldRules,
	baseLint,
	checkNoForbiddenBlockElements,
	type FamilyRules,
	freeTextFields,
	isGradedQuestion,
	localeDiagnostics,
	modelError,
	uuidDiagnostics,
} from "./base.js";
import {
	multipleChoiceRules,
	multipleSelectionRules,
	trueFalseRules,
	withChoiceIds,
} from "./choice.js";
import { blankAutomation, blankWithIds, fillInRules } from "./fill-in.js";
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
import {
	defaultUnmatched,
	essayRules,
	shortAnswerAutomation,
	shortAnswerRules,
} from "./text.js";

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

/**
 * The translation of the exam's scalar `grading` for each question type that
 * chooses a strategy (`docs/exam.md`, "Grading"). Multiple choice has a single
 * pick, and multiple selection has no abstention, so `no-mistakes` and
 * `all-or-nothing` collapse there.
 */
const SCALAR_GRADING: Readonly<
	Record<GradingType, Readonly<Record<string, GradingType>>>
> = {
	partial: {
		"multiple-choice": "partial",
		"multiple-selection": "partial",
		"true-false": "partial",
		"fill-in": "partial",
	},
	"no-mistakes": {
		"multiple-choice": "partial",
		"multiple-selection": "all-or-nothing",
		"true-false": "no-mistakes",
		"fill-in": "no-mistakes",
	},
	"all-or-nothing": {
		"multiple-choice": "partial",
		"multiple-selection": "all-or-nothing",
		"true-false": "all-or-nothing",
		"fill-in": "all-or-nothing",
	},
	symmetric: {
		"multiple-choice": "symmetric",
		"multiple-selection": "symmetric",
		"true-false": "symmetric",
		"fill-in": "symmetric",
	},
};

/**
 * The grading strategy `question` is scored with: its own, unless it is
 * `inherit` (or it has none); then the exam's scalar `grading` translated for
 * the question's type, or the entry of the exam's mapping for the question's
 * type, or `symmetric` (`docs/exam.md`, "Grading").
 */
export function gradingFor(exam: Exam, question: Question): GradingType {
	const examGrading = exam.grading ?? "symmetric";
	if (!isGradedQuestion(question)) {
		return typeof examGrading === "string" ? examGrading : "symmetric";
	}
	if (question.grading !== undefined && question.grading !== "inherit") {
		return question.grading;
	}
	if (typeof examGrading === "string") {
		return SCALAR_GRADING[examGrading][question.type] ?? "symmetric";
	}
	return examGrading[question.type] ?? "symmetric";
}

/**
 * Whether `question` is shuffled: its own `shuffle`, unless it is `inherit`
 * (or it has none); then the exam's `shuffle`.
 */
export function shuffleFor(exam: Exam, question: Question): boolean {
	const own = isGradedQuestion(question) ? question.shuffle : undefined;
	return own === undefined || own === "inherit" ? (exam.shuffle ?? false) : own;
}

/**
 * A copy of `question` whose `grading` and `shuffle` are the values it gets in
 * the exam (`gradingFor`, `shuffleFor`). A question without those fields is
 * returned unchanged.
 */
export function resolveQuestion(exam: Exam, question: Question): Question {
	if (!isGradedQuestion(question)) return question;
	return {
		...question,
		grading: gradingFor(exam, question),
		shuffle: shuffleFor(exam, question),
	} as Question;
}

//
// Derived properties and ids
//

/**
 * How much of the grading the library does without an instructor
 * (`docs/question-types/base.md`, "Automation"): `automatic` for choice,
 * true/false and numeric questions, `manual` for an essay, and a rule of
 * their own for short answer, fill-in and ordering.
 */
export function automation(question: Question): Automation {
	switch (question.type) {
		case "essay":
			return "manual";
		case "short-answer":
			return shortAnswerAutomation(
				defaultUnmatched(question.unmatched, question.accept),
				question.accept,
				question.reject,
			);
		case "ordering":
			return question.unmatched === "manual" ? "semi-automatic" : "automatic";
		case "fill-in": {
			const levels = new Set(
				question.blanks.map((blank) =>
					blankAutomation(blank, question.unmatched),
				),
			);
			if (levels.size === 1 && levels.has("automatic")) return "automatic";
			if (levels.size === 1 && levels.has("manual")) return "manual";
			return "semi-automatic";
		}
		default:
			return "automatic";
	}
}

/** The question with a derived id on every choice that has none. */
function questionWithIds(question: Question): Question {
	switch (question.type) {
		case "multiple-choice":
		case "multiple-selection":
		case "true-false":
			return {
				...question,
				choices: withChoiceIds(question.choices),
			} as Question;
		case "fill-in":
			return { ...question, blanks: question.blanks.map(blankWithIds) };
		default:
			return { ...question };
	}
}

/**
 * A copy of the document with every derivable id filled in. A question gets a
 * derived id on every choice that has none; an exam also gives each question
 * without an id the implicit one of its position, `q<position>`, counting
 * every block, includes included (exam.md, "Question ids"). An id already
 * written is never touched, and running it twice gives the same result.
 *
 * @throws {UnresolvedInclude} The exam has an `includeAll` block, so the
 *   positions after it are unknown. Resolve the exam first.
 */
export function withIds<T extends MdqDocument>(document: T): T {
	if (!("questions" in document)) {
		return questionWithIds(document as Question) as T;
	}
	const exam = document as Exam;
	if (exam.questions.some((entry) => "includeAll" in entry)) {
		throw new UnresolvedInclude(
			"the positions after an 'includeAll' block are only known after resolve()",
		);
	}
	const questions = exam.questions.map((entry, index) => {
		if ("include" in entry) return entry;
		const withChoices = questionWithIds(entry as Question);
		return withChoices.id === undefined
			? { ...withChoices, id: `q${index + 1}` }
			: withChoices;
	});
	return { ...exam, questions } as T;
}
