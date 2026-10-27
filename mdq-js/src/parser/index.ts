/**
 * Parsing MDQ Markdown into the document shape the schemas validate.
 *
 * A barrel, like `mdq-py/mdq/_parser/__init__.py`: the question parser is in
 * `./question.ts` and the exam parser in `./exam.ts`. `./legacy/` holds the
 * code of the bodies not ported yet (phases P2b and P2c).
 */

export {
	findAnswerKeyForbiddenElements,
	findForbiddenElements,
	findStrayChoiceMarkers,
	reconstructBlocks,
} from "./blocks.js";
export { SLUG_PREFIX_RE } from "./choices.js";
export {
	INHERITED_FIELDS,
	isExam,
	parseExam,
	parseExamDocument,
	SEPARATOR,
} from "./exam.js";
export { loadYaml } from "./frontmatter.js";
export { parseNumericAnswer, parseNumericString } from "./numeric.js";
export {
	parseQuestion,
	parseQuestionDocument,
	type RawDocument,
} from "./question.js";
export { findUnicodeSpaces } from "./spaces.js";

import type { Diagnostic } from "../diagnostics.js";
import { isExam, parseExamDocument } from "./exam.js";
import { parseQuestionDocument, type RawDocument } from "./question.js";

/**
 * Parse a document of either kind into its unvalidated JSON shape: an exam
 * when `isExam` says so, a question otherwise. The dispatch `load()` does.
 */
export function parseDocument(
	source: string,
	warnings?: Diagnostic[],
): RawDocument {
	return isExam(source)
		? parseExamDocument(source, warnings)
		: parseQuestionDocument(source, warnings);
}
