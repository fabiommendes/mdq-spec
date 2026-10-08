/**
 * Parsing MDQ Markdown into the document shape the schemas validate.
 *
 * A barrel, like `mdq-py/mdq/_parser/__init__.py`: the question parser is in
 * `./question.ts` and the exam parser in `./exam.ts`.
 */

export {
	INHERITED_FIELDS,
	isExam,
	parseExam,
	parseExamDocument,
	SEPARATOR,
} from "./exam.js";
export {
	parseQuestion,
	parseQuestionDocument,
	type RawDocument,
} from "./question.js";
