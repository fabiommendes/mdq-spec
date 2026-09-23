/**
 * Check the Zod schemas against the shared example corpus.
 *
 * `examples/` at the repo root is the language-agnostic suite both
 * implementations run: `valid/` holds documents that must be accepted,
 * `invalid/` documents that must be rejected, and `warnings/` documents that
 * are schema-valid but that the linter has something to say about. Running
 * the same files here is what keeps the Zod schemas from drifting away from
 * the JSON Schemas in `schema/` that Python validates with.
 */

import { existsSync } from "node:fs";
import { validateDocument, validateExam, validateQuestion } from "@mdq";
import { QUESTION_TYPES } from "@mdq/schema/index.js";
import { describe, expect, it } from "vitest";
import {
	INVALID_PARSED,
	loadDocument,
	parsedSibling,
	relativeId,
	VALID_EXAMS,
	VALID_PARSED,
	VALID_QUESTIONS,
	VALID_SOURCES,
	WARNING_PARSED,
} from "./corpus.js";

/**
 * Render a failure so the assertion names the offending field, not just the
 * file -- a Zod error dumped whole is unreadable at this size.
 */
function explain(path: string, error: unknown): string {
	const issues =
		(error as { issues?: { path: unknown[]; message: string }[] } | undefined)
			?.issues ?? [];
	const lines = issues.map(
		(issue) => `  ${issue.path.join(".") || "<root>"}: ${issue.message}`,
	);
	return `${relativeId(path)} did not validate:\n${lines.join("\n")}`;
}

describe("the corpus is where we think it is", () => {
	it("finds the shared examples", () => {
		expect(VALID_PARSED.length).toBeGreaterThan(0);
		expect(INVALID_PARSED.length).toBeGreaterThan(0);
		expect(WARNING_PARSED.length).toBeGreaterThan(0);
	});

	it("finds the surface-syntax sources", () => {
		expect(VALID_SOURCES.length).toBeGreaterThan(0);
	});
});

describe("valid examples", () => {
	it.each(
		VALID_QUESTIONS.map((path) => [relativeId(path), path]),
	)("accepts %s", (_name, path) => {
		const result = validateQuestion(loadDocument(path));
		expect(result.success, explain(path, result.error)).toBe(true);
	});

	it.each(
		VALID_EXAMS.map((path) => [relativeId(path), path]),
	)("accepts exam %s", (_name, path) => {
		const document = loadDocument(path) as Record<string, unknown>;
		// The exam directory holds the question bank an exam includes as
		// well as the exams themselves; each is validated as what it is.
		const result = Array.isArray(document.questions)
			? validateExam(document)
			: validateQuestion(document);
		expect(result.success, explain(path, result.error)).toBe(true);
	});

	it.each(
		VALID_PARSED.map((path) => [relativeId(path), path]),
	)("routes %s to the right schema without being told", (_name, path) => {
		const result = validateDocument(loadDocument(path));
		expect(result.success, explain(path, result.error)).toBe(true);
	});

	it.each(
		VALID_QUESTIONS.map((path) => [relativeId(path), path]),
	)("%s declares a known question type", (_name, path) => {
		const document = loadDocument(path) as { type?: string };
		expect(QUESTION_TYPES).toContain(document.type);
	});
});

describe("documents that only warn are still valid", () => {
	it.each(
		WARNING_PARSED.map((path) => [relativeId(path), path]),
	)("accepts %s", (_name, path) => {
		const result = validateDocument(loadDocument(path));
		expect(result.success, explain(path, result.error)).toBe(true);
	});
});

describe("invalid examples", () => {
	it.each(
		INVALID_PARSED.map((path) => [relativeId(path), path]),
	)("rejects %s", (_name, path) => {
		const result = validateDocument(loadDocument(path));
		expect(
			result.success,
			`${relativeId(path)} was accepted, but examples/invalid documents must be rejected`,
		).toBe(false);
	});
});

describe("every source has the document it claims to parse into", () => {
	it.each(
		VALID_SOURCES.map((path) => [relativeId(path), path]),
	)("%s has a parsed sibling", (_name, path) => {
		expect(existsSync(parsedSibling(path))).toBe(true);
	});
});
