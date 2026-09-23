/**
 * The shapes a student's marked response may take.
 *
 * A response is never a document: there is no response schema and no Markdown
 * surface for it (see `docs/adr/0003-no-response-document.md`), so these
 * aliases are the whole specification of what grading accepts -- which is why
 * this module holds types only, with no Zod schema beside them.
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
 * multiple-selection: the set of choice ids the student marked. A choice
 * absent from the set was not marked.
 */
export type MultipleSelectionResponse = Set<string>;

/**
 * true-false: the student's judgement of each statement, keyed by statement
 * id. An explicit skip is `null`.
 */
export type TrueFalseResponse = Map<string, boolean | null>;

/** short-answer and essay: the text the student wrote, before normalisation. */
export type TextResponse = string;

/** numeric: the value the student entered. */
export type NumericResponse = number;

/**
 * fill-in: each blank's response, keyed by blank id, taking whatever that
 * blank's own type takes.
 */
export type FillInResponse = Map<string, QuestionResponse>;

/**
 * ordering: the lines the student submitted, in the order they submitted
 * them. The lines carry no id -- they are compared by content.
 */
export type OrderingResponse = readonly OrderingLine[];

/**
 * Every response in one exam attempt, keyed by question id. A question absent
 * from the map is skipped; a key naming no question in the exam is an error.
 */
export type ExamResponses = Map<string, QuestionResponse>;
