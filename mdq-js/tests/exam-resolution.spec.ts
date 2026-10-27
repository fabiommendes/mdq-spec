/**
 * `examples/valid/exam/*.resolved.yaml`: what an exam with include blocks
 * becomes once it resolves against the bank in `examples/valid/exam/`
 * (`docs/exam.md`, "Include all" and "Question ids").
 *
 * Each fixture lists the ids of the questions in order and the diagnostics
 * `resolveExam` reports. `max` picks the first candidates, so the expectation
 * is deterministic. Two optional keys: `fields`, a field the questions inherit
 * from the exam (e.g. `locale`) to its value for each question, in order; and
 * `lint`, every diagnostic of the resolved exam (`lint`, before the ids are
 * filled in), whose path of a question starts with `questions[i]`. A question without an id takes `q<position>`, which is
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
	lint,
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
	type ExpectedDiagnostic,
	loadDocument,
	RESOLVED_SUFFIX,
	relativeId,
	SOURCE_SUFFIX,
	VALID_EXAMS_DIR,
} from "./corpus.js";
import { corpusIt, notPorted, RESOLVE } from "./not-ported.js";
import { asMultiset, entryOf } from "./vectors.js";

interface Resolved {
	readonly questions: readonly string[];
	readonly diagnostics: readonly ExpectedDiagnostic[];
	readonly fields?: Readonly<Record<string, readonly unknown[]>>;
	readonly lint?: readonly ExpectedDiagnostic[];
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
				("include" in entry || "includeAll" in entry),
		)
	);
}

/** Exam documents at the top of the corpus directory with an include block, by stem. */
const EXAMS_WITH_INCLUDES = new Map<string, string>();
/**
 * Exam documents the parser rejects, with the error. Each one fails its own
 * test below, so a parser gap does not stop the whole suite from loading.
 */
const UNPARSED = new Map<string, unknown>();
for (const path of [
	...collectSources(VALID_EXAMS_DIR),
	...collectFiles(VALID_EXAMS_DIR),
]) {
	if (dirname(path) !== VALID_EXAMS_DIR) {
		continue;
	}
	const suffix = path.endsWith(SOURCE_SUFFIX) ? SOURCE_SUFFIX : ".yaml";
	const stem = stemOf(path, suffix);
	let document: unknown;
	try {
		document = rawExam(path);
	} catch (error) {
		UNPARSED.set(relativeId(path), error);
		continue;
	}
	if (!EXAMS_WITH_INCLUDES.has(stem) && hasIncludes(document)) {
		EXAMS_WITH_INCLUDES.set(stem, path);
	}
}

const RESOLVED = readdirSync(VALID_EXAMS_DIR)
	.filter((name) => name.endsWith(RESOLVED_SUFFIX))
	.sort()
	.map((name) => join(VALID_EXAMS_DIR, name));

/**
 * Resolve the exam of a fixture. `fields` and `lint` are computed only when
 * the fixture (`expected`) has them.
 */
function resolveFixtureExam(path: string, expected: Resolved): Resolved {
	const exam = Exam.parse(rawExam(path));
	const warnings: Diagnostic[] = [];
	const resolved = resolveExam(exam, corpusBank(), {
		select: first,
		warnings,
	});
	const result: Resolved = {
		questions: resolved.questions.map(
			(question, index) => (question as { id?: string }).id ?? `q${index + 1}`,
		),
		diagnostics: warnings.map(entryOf),
	};
	return {
		...result,
		...(expected.fields === undefined
			? {}
			: {
					fields: Object.fromEntries(
						Object.keys(expected.fields).map((field) => [
							field,
							resolved.questions.map(
								(question) => (question as Record<string, unknown>)[field],
							),
						]),
					),
				}),
		...(expected.lint === undefined
			? {}
			: { lint: lint(resolved).map(entryOf) }),
	};
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

describe("every exam of the bank directory parses", () => {
	it("none is rejected unlisted", () => {
		const unlisted = [...UNPARSED.keys()].filter(
			(name) => notPorted(RESOLVE, name) === undefined,
		);
		expect(unlisted).toEqual([]);
	});

	for (const [name, error] of [...UNPARSED].sort()) {
		corpusIt(RESOLVE, name, () => {
			throw error;
		});
	}
});

describe("an exam resolves to its fixture", () => {
	for (const fixture of RESOLVED) {
		corpusIt(RESOLVE, relativeId(fixture), () => {
			const source = EXAMS_WITH_INCLUDES.get(stemOf(fixture, RESOLVED_SUFFIX));
			expect(source, `${fixture} has no exam document`).toBeDefined();
			const expected = load(readFileSync(fixture, "utf-8")) as Resolved;
			const actual = resolveFixtureExam(source as string, expected);
			expect(actual.questions).toEqual(expected.questions);
			expect(asMultiset(actual.diagnostics)).toEqual(
				asMultiset(expected.diagnostics),
			);
			if (expected.fields !== undefined) {
				expect(actual.fields).toEqual(expected.fields);
			}
			if (expected.lint !== undefined) {
				expect(asMultiset(actual.lint ?? [])).toEqual(
					asMultiset(expected.lint),
				);
			}
		});
	}
});
