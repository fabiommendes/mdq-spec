/**
 * The title of an exam parsed with `parseExamDocument` directly, which the
 * corpus cannot reach: `load` routes a text by its shape, so a text with no
 * H1 is read as a question. Mirrors `mdq-py/tests/test_parse_exam_title.py`.
 */

import { describe, expect, it } from "vitest";
import { MissingFieldError, parseExamDocument } from "../src/index.js";

describe("parseExamDocument title", () => {
	it.each([
		"Descreva o ipê.\n\n[essay]\n",
		" # Prova\n\n[essay]\n",
	])("an exam with no H1 has no title: %j", (source) => {
		expect(() => parseExamDocument(source)).toThrow(MissingFieldError);
	});

	it.each([
		"```text\n# Falso título\n```\n\n# Título real\n",
		"Antes.\n\n    # Falso título\n\n# Título real\n",
	])("an H1 line in code is not the title: %j", (source) => {
		expect(parseExamDocument(source).title).toBe("Título real");
	});
});
