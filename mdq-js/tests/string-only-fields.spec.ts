/**
 * `id`, `include` and `includeAll` keep their YAML type: the parser never
 * converts them, and a null `id` counts as absent (root `40591e2`, mdq-py
 * `4409033`). The model layer rejects a non-string value (F5). Expected
 * values come from `parse_question` and `parse_exam`.
 */

import { describe, expect, it } from "vitest";
import {
	parseExamDocument,
	parseQuestionDocument,
} from "../src/parser/index.js";

describe("string-only fields pass through unconverted", () => {
	it("a question id keeps its YAML type", () => {
		expect(
			parseQuestionDocument("---\nid: 2024\n---\n\nQ?\n\n[essay]\n"),
		).toEqual({
			id: 2024,
			stem: "Q?",
			type: "essay",
		});
	});

	it("a null question id is absent", () => {
		expect(parseQuestionDocument("---\nid:\n---\n\nQ?\n\n[essay]\n")).toEqual({
			stem: "Q?",
			type: "essay",
		});
	});

	it("an exam id, include and includeAll keep their YAML type", () => {
		// `yes` is a string in the YAML 1.2 Core schema (base.md,
		// "Frontmatter"); `true` and `7` keep their types.
		const source =
			"---\nid: 2024\n---\n# Prova\n\n===\n\n---\ninclude: true\n---\n\n===\n\n---\nincludeAll: 7\n---\n\n===\n\n---\ninclude: yes\n---\n";
		expect(parseExamDocument(source)).toEqual({
			type: "exam",
			title: "Prova",
			id: 2024,
			questions: [{ include: true }, { includeAll: 7 }, { include: "yes" }],
		});
	});

	it("a null exam id is absent", () => {
		expect(parseExamDocument("---\nid:\n---\n# Prova\n")).toEqual({
			type: "exam",
			title: "Prova",
			questions: [],
		});
	});
});
