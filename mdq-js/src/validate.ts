/**
 * Validating a parsed MDQ document against the schemas.
 *
 * This is step 3 of the pipeline `docs/sync/schemas.md` describes: Markdown
 * source, JSON-like AST, *validation*, final document. Zod validates the
 * plain object in place, so what comes back is the same shape the parser
 * built -- narrowed, not wrapped.
 */

import * as z from "zod";
import type { Diagnostic } from "./diagnostics.js";
import { validateExamModel, validateQuestionModel } from "./models/exam.js";
import { Exam } from "./schema/exam.js";
import {
	QUESTION_SCHEMAS,
	Question,
	type QuestionType,
} from "./schema/questions.js";

/** A question document, or the exam that gathers several of them. */
export type MdqDocument = Question | Exam;

/**
 * The outcome of validating a document: either the narrowed value, or the
 * error explaining why it was rejected.
 *
 * Returned rather than thrown because an invalid document is an ordinary
 * result here -- the CLI reports every problem it finds, and an editor wants
 * to show them as it types.
 */
export type ValidationResult<T> =
	| { success: true; data: T; error?: undefined }
	| { success: false; data?: undefined; error: z.ZodError };

/**
 * Validate a question document against the schema for its `type`.
 *
 * @param type - Validate against this type specifically. Inferred from the
 *   document's own `type` field when omitted.
 */
export function validateQuestion(
	document: unknown,
	type?: QuestionType,
): ValidationResult<Question> {
	const schema = type === undefined ? Question : QUESTION_SCHEMAS[type];
	return schema.safeParse(document) as ValidationResult<Question>;
}

/** Validate an exam document against `schema/exam.yaml`. */
export function validateExam(document: unknown): ValidationResult<Exam> {
	return Exam.safeParse(document);
}

/**
 * The model rules of a document the schemas accepted: blank text, locale,
 * forbidden block elements, unique ids and the rest of what Pydantic
 * validators check in mdq-py (`docs/sync/schemas.md`). At most one
 * diagnostic per code and path.
 */
export function modelDiagnostics(document: MdqDocument): Diagnostic[] {
	const found =
		"questions" in document
			? validateExamModel(document)
			: validateQuestionModel(document);
	return uniqueDiagnostics(found);
}

/** `diagnostics` with a second diagnostic of the same code and path dropped. */
export function uniqueDiagnostics(
	diagnostics: readonly Diagnostic[],
): Diagnostic[] {
	const seen = new Set<string>();
	return diagnostics.filter((d) => {
		const key = JSON.stringify([d.code, d.path]);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/**
 * Validate a document of either kind: against its schema, then against the
 * model rules. A model rule that fails is a `custom` issue of the returned
 * error, with the rule's code in `params.code`.
 *
 * An exam is told apart by its `questions` array: in the surface syntax it is
 * recognized by an H1 title, which a question can never carry, and the parsed
 * form keeps that distinction as a field a question never has.
 */
export function validateDocument(
	document: unknown,
): ValidationResult<MdqDocument> {
	const result: ValidationResult<MdqDocument> = isExamShaped(document)
		? validateExam(document)
		: validateQuestion(document);
	if (!result.success) return result;
	const problems = modelDiagnostics(result.data);
	if (problems.length === 0) return result;
	return {
		success: false,
		error: new z.ZodError(
			problems.map((d) => ({
				code: "custom" as const,
				path: [...d.path],
				message: d.message,
				params: { code: d.code },
				input: undefined,
			})),
		),
	};
}

/** Whether a parsed document looks like an exam rather than a question. */
export function isExamShaped(document: unknown): boolean {
	if (typeof document !== "object" || document === null) {
		return false;
	}
	const record = document as Record<string, unknown>;
	return record.type === "exam" || Array.isArray(record.questions);
}
