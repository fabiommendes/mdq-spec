/**
 * A code block is literal text: a line inside it is never MDQ structure.
 * Ported from mdq-py/tests/test_code_blocks_in_structure.py (mdq-py
 * `15b9014`). The exam scanners (`===`, `---`, body tags) come with F4.
 *
 * Expected values come from Python, e.g.:
 *
 *   cd mdq-py && uv run python -c "
 *   from mdq._parser._question import parse_question
 *   print(parse_question('Quantos estados tem o Brasil?\n\n[numeric]: 26\n\n    \xa0\n'))
 *   "
 */

import { describe, expect, it } from "vitest";
import { isExam, parseQuestionDocument } from "../src/parser/index.js";

const PYTHON_BLOCK = "```python\n# soma dos estados\nprint(26 + 1)\n```";
const TILDE_BLOCK = "~~~\n# Região Norte\n~~~";

describe("isExam ignores code lines", () => {
	it.each([
		PYTHON_BLOCK,
		TILDE_BLOCK,
	])("an H1 line in an epilogue code block does not make an exam: %j", (block) => {
		const text = `Quantos estados tem o Brasil?\n\n[numeric]: 26\n\n${block}\n`;
		expect(isExam(text)).toBe(false);
		expect(parseQuestionDocument(text)).toEqual({
			stem: "Quantos estados tem o Brasil?",
			answer: 26,
			domain: "integer",
			type: "numeric",
			epilogue: block,
		});
	});

	it("an H1 line in a preamble code block does not make an exam", () => {
		const text = `${PYTHON_BLOCK}\n\nQuantos estados tem o Brasil?\n\n[numeric]: 26\n`;
		expect(isExam(text)).toBe(false);
		expect(parseQuestionDocument(text)).toMatchObject({
			preamble: PYTHON_BLOCK,
		});
	});

	it("an H1 line outside code still makes an exam", () => {
		expect(isExam(`# Prova\n\n${PYTHON_BLOCK}\n`)).toBe(true);
	});
});

describe("rawText keeps a code line of Unicode whitespace", () => {
	it.each([
		["    \xa0", "    \xa0"],
		["    a\n     ", "    a"],
	])("epilogue %j reconstructs as %j", (epilogue, expected) => {
		const text = `Quantos estados tem o Brasil?\n\n[numeric]: 26\n\n${epilogue}\n`;
		expect(parseQuestionDocument(text)).toMatchObject({ epilogue: expected });
	});
});
