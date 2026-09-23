/**
 * Validating a parsed MDQ document against the schemas.
 *
 * This is step 3 of the pipeline `docs/sync/schemas.md` describes: Markdown
 * source, JSON-like AST, *validation*, final document. Zod validates the
 * plain object in place, so what comes back is the same shape the parser
 * built -- narrowed, not wrapped.
 */

import type * as z from "zod";
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
 * Validate a document of either kind.
 *
 * An exam is told apart by its `questions` array: in the surface syntax it is
 * recognized by an H1 title, which a question can never carry, and the parsed
 * form keeps that distinction as a field a question never has.
 */
export function validateDocument(
	document: unknown,
): ValidationResult<MdqDocument> {
	return isExamShaped(document)
		? validateExam(document)
		: validateQuestion(document);
}

/** Whether a parsed document looks like an exam rather than a question. */
export function isExamShaped(document: unknown): boolean {
	if (typeof document !== "object" || document === null) {
		return false;
	}
	const record = document as Record<string, unknown>;
	return record.type === "exam" || Array.isArray(record.questions);
}
