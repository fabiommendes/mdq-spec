/**
 * `examples/valid/exam/*.resolved.yaml`: what an exam with include blocks
 * becomes once it resolves against the bank in `examples/valid/exam/`
 * (`docs/exam.md`, "Include all" and "Question ids").
 *
 * Each fixture lists the ids of the questions in order and the diagnostics
 * `resolveExam` reports. `max` picks the first candidates, so the expectation
 * is deterministic. A question without an id takes `q<position>`, which is
 * all of Python's `with_ids` that the corpus needs. Mirrors
 * `mdq-py/tests/test_exam_resolution_corpus.py`; the `DictLoader` here stands
 * in for Python's `FileLoader`.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
	type Diagnostic,
	DictLoader,
	Exam,
	isExam,
	parseExamDocument,
	type QuestionSource,
	resolveExam,
	type Select,
} from "@mdq";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import {
	collectFiles,
	collectSources,
	loadDocument,
	RESOLVED_SUFFIX,
	relativeId,
	SOURCE_SUFFIX,
	VALID_EXAMS_DIR,
} from "./corpus.js";
import { corpusIt, RESOLVE } from "./not-ported.js";

interface Resolved {
	readonly questions: readonly string[];
	readonly diagnostics: readonly {
		code: string;
		severity: string;
		path: readonly (string | number)[];
	}[];
}

const first: Select = (candidates, max) =>
	max === undefined ? candidates : candidates.slice(0, max);

/** Every question source under `examples/valid/exam/`, by file name. */
function corpusBank(): DictLoader {
	const questions: Record<string, QuestionSource> = {};
	for (const path of collectSources(VALID_EXAMS_DIR)) {
		questions[basename(path).slice(0, -SOURCE_SUFFIX.length)] = readFileSync(
			path,
			"utf-8",
		);
	}
	return new DictLoader(questions);
}

function stemOf(path: string, suffix: string): string {
	return basename(path).slice(0, -suffix.length);
}

/** The raw document of an exam file: Markdown text or YAML. */
function rawExam(path: string): unknown {
	if (path.endsWith(SOURCE_SUFFIX)) {
		const text = readFileSync(path, "utf-8");
		return isExam(text) ? parseExamDocument(text) : undefined;
	}
	return loadDocument(path);
}

function hasIncludes(document: unknown): boolean {
	const questions = (document as { questions?: unknown } | null)?.questions;
	return (
		Array.isArray(questions) &&
		questions.some(
			(entry) =>
				typeof entry === "object" &&
				entry !== null &&
				("include" in entry || "include-all" in entry),
		)
	);
}

/** Exam documents at the top of the corpus directory with an include block, by stem. */
const EXAMS_WITH_INCLUDES = new Map<string, string>();
for (const path of [
	...collectSources(VALID_EXAMS_DIR),
	...collectFiles(VALID_EXAMS_DIR),
]) {
	if (dirname(path) !== VALID_EXAMS_DIR) {
		continue;
	}
	const suffix = path.endsWith(SOURCE_SUFFIX) ? SOURCE_SUFFIX : ".yaml";
	const stem = stemOf(path, suffix);
	if (!EXAMS_WITH_INCLUDES.has(stem) && hasIncludes(rawExam(path))) {
		EXAMS_WITH_INCLUDES.set(stem, path);
	}
}

const RESOLVED = readdirSync(VALID_EXAMS_DIR)
	.filter((name) => name.endsWith(RESOLVED_SUFFIX))
	.sort()
	.map((name) => join(VALID_EXAMS_DIR, name));

function resolveFixtureExam(path: string): Resolved {
	const exam = Exam.parse(rawExam(path));
	const warnings: Diagnostic[] = [];
	const resolved = resolveExam(exam, corpusBank(), {
		select: first,
		warnings,
	});
	return {
		questions: resolved.questions.map(
			(question, index) => (question as { id?: string }).id ?? `q${index + 1}`,
		),
		diagnostics: warnings.map(({ code, severity, path }) => ({
			code,
			severity,
			path,
		})),
	};
}

/** The diagnostics as a sorted list, so order does not matter but repeats do. */
function asMultiset(diagnostics: Resolved["diagnostics"]): string[] {
	return diagnostics
		.map(({ code, severity, path }) => JSON.stringify({ code, severity, path }))
		.sort();
}

describe("resolved exam fixtures", () => {
	it("there are resolved fixtures", () => {
		expect(RESOLVED.length).toBeGreaterThan(0);
	});

	it("every resolved fixture belongs to an exam with includes", () => {
		for (const fixture of RESOLVED) {
			expect(EXAMS_WITH_INCLUDES.has(stemOf(fixture, RESOLVED_SUFFIX))).toBe(
				true,
			);
		}
	});

	for (const [stem] of [...EXAMS_WITH_INCLUDES].sort()) {
		it(`${stem} has include blocks and a resolved fixture`, () => {
			expect(
				existsSync(join(VALID_EXAMS_DIR, `${stem}${RESOLVED_SUFFIX}`)),
			).toBe(true);
		});
	}
});

describe("an exam resolves to its fixture", () => {
	for (const fixture of RESOLVED) {
		corpusIt(RESOLVE, relativeId(fixture), () => {
			const source = EXAMS_WITH_INCLUDES.get(stemOf(fixture, RESOLVED_SUFFIX));
			expect(source, `${fixture} has no exam document`).toBeDefined();
			const expected = load(readFileSync(fixture, "utf-8")) as Resolved;
			const actual = resolveFixtureExam(source as string);
			expect(actual.questions).toEqual(expected.questions);
			expect(asMultiset(actual.diagnostics)).toEqual(
				asMultiset(expected.diagnostics),
			);
		});
	}
});
