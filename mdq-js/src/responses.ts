/**
 * The shapes a student's marked response may take, as `docs/responses.md`
 * describes them.
 *
 * A response is never a document: there is no response schema and no Markdown
 * surface for it, so these aliases are the whole specification of what
 * grading accepts -- which is why this module holds types only, with no Zod
 * schema beside them. Every shape is plain JSON (no `Set` or `Map`), so a
 * response can be stored, sent and loaded from a fixture without conversion.
 *
 * Several aliases collapse to the same runtime type; `string` serves both a
 * chosen choice id and an essay. They are kept apart because which question
 * type produces which is the part a reader needs.
 */

import type { OrderingLine } from "./schema/questions.js";

/**
 * Any response to a single question. `null` means the question was skipped:
 * it scores 0 without its grading formula running, so it produces no feedback
 * either.
 */
export type QuestionResponse =
	| MultipleChoiceResponse
	| MultipleSelectionResponse
	| TextResponse
	| NumericResponse
	| FillInResponse
	| TrueFalseResponse
	| OrderingResponse
	| null;

/** multiple-choice: the id of the choice the student picked. */
export type MultipleChoiceResponse = string;

/**
 * multiple-selection: the ids of the choices the student ticked, as a list.
 * A choice absent from the list was not ticked; order and repeats do not
 * matter.
 */
export type MultipleSelectionResponse = readonly string[];

/**
 * true-false: the student's judgement of each statement, keyed by statement
 * id. An absent key or a `null` value is an abstention.
 */
export type TrueFalseResponse = Readonly<Record<string, boolean | null>>;

/** short-answer and essay: the text the student wrote, before normalisation. */
export type TextResponse = string;

/**
 * numeric: the value the student entered. A number is read as its shortest
 * decimal form; a string as the exact value it spells (`"1/3"`, `"3.1415"`);
 * the mapping form also carries the unit the student wrote.
 */
export type NumericResponse =
	| number
	| string
	| { readonly value: number | string; readonly unit?: string };

/**
 * fill-in: each blank's response, keyed by blank id, taking whatever that
 * blank's own type takes.
 */
export interface FillInResponse {
	readonly [blank: string]: QuestionResponse;
}

/**
 * ordering: the lines the student submitted, in the order they submitted
 * them. The lines carry no id -- they are compared by content.
 */
export type OrderingResponse = readonly OrderingLine[];

/**
 * Every response in one exam attempt, keyed by question id. A question absent
 * from the map is skipped; a key naming no question in the exam is an error.
 */
export type ExamResponses = Readonly<Record<string, QuestionResponse>>;
