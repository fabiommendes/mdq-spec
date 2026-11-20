/**
 * Code questions (docs/question-types/code.md). A port of the model part of
 * `models/_code.py`: the validation rules, the derived values (`fullRubric`,
 * `referenceSolution`, `codeAutomation`) and `resolveTests`. The grading is
 * in `code-grading.ts`, the public form in `public-form.ts`.
 *
 * MDQ never runs code and does not read the content of a test source, except
 * its annotations.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { InvalidDocumentError, UnresolvedTestSource } from "../errors.js";
import { stripBom } from "../markdown.js";
import {
	firstFencedCode,
	hasUnclosedFence,
	reconstructBlocks,
} from "../parser/blocks.js";
import {
	type Annotations,
	checkCriterionStart,
	RubricSyntaxError,
	scanAnnotations,
} from "../parser/rubric.js";
import { lstrip, pyRepr, repr } from "../parser/text.js";
import type {
	CodeQuestion,
	RubricItem,
	TestSource,
} from "../schema/questions.js";
import {
	type Automation,
	type FamilyRules,
	freeTextDiagnostics,
	freeTextFields,
	modelError,
} from "./base.js";
import { checkUnsafeThematicBreak } from "./lint.js";
import { lintDiagnostic } from "./lint-codes.js";
import { checkAnswerKeyHasNoH1 } from "./text.js";

/**
 * One item of the full rubric (code.md, "Full rubric"): derived from the test
 * sources and the `rubric`, never a field of the document.
 */
export interface FullRubricItem {
	/** The value, always present. */
	readonly value: number;
	readonly binding: "tests" | "manual";
	/** The criterion. `undefined` in an implicit item. */
	readonly text?: string;
	readonly feedback?: string;
	readonly comment?: string;
	/** An item of tests: the index of the test source. */
	readonly source?: number;
	/** An item of tests: the line of its annotation. `undefined` in an implicit item. */
	readonly line?: number;
	/** An item of tests: `{public}` or `{example}`. */
	readonly public: boolean;
	/** An item of tests: `{example}`. */
	readonly example: boolean;
}

/** The value of a rubric item: 1 when it has none. */
export function rubricPoints(item: Pick<RubricItem, "value">): number {
	return item.value ?? 1;
}

/** Whether `source` has its `text`. */
export function isResolvedSource(source: TestSource): boolean {
	return source.text !== undefined;
}

/** Whether every test source of `question` has its `text`. */
export function isResolved(question: CodeQuestion): boolean {
	return (question.tests ?? []).every(isResolvedSource);
}

/** The scan of each source, kept while the source object lives. */
const scans = new WeakMap<TestSource, { text: string; scan: Annotations }>();

/**
 * The annotations of the text of `source`, with their regions. The scan of a
 * source is done once, as `cached_property` does in mdq-py.
 *
 * @throws {UnresolvedTestSource} The source has no text.
 */
export function annotationsOf(source: TestSource): Annotations {
	const { text } = source;
	if (text === undefined) {
		throw new UnresolvedTestSource(
			`the test source ${pyRepr(source.origin)} is not resolved: it has no text`,
		);
	}
	const cached = scans.get(source);
	if (cached?.text === text) return cached.scan;
	const scan = scanAnnotations(text);
	scans.set(source, { text, scan });
	return scan;
}

/**
 * The number of lines of the text of `source`, as the runner counts them. A
 * final line ending does not start another line.
 *
 * @throws {UnresolvedTestSource} The source has no text.
 */
export function lineCount(source: TestSource): number {
	return annotationsOf(source).lines.length;
}

/**
 * @throws {UnresolvedTestSource} A test source has no text.
 */
export function requireResolved(question: CodeQuestion): void {
	for (const [index, source] of (question.tests ?? []).entries()) {
		if (!isResolvedSource(source)) {
			throw new UnresolvedTestSource(
				`tests[${index}] (${pyRepr(source.origin)}) is not resolved: call ` +
					"`resolveTests` with the text of its file",
			);
		}
	}
}

/**
 * Every item of the question: the items of the test sources, in the order of
 * the sources and then of the lines, with the implicit item of each source
 * that has no annotation, and then the items of `rubric`.
 *
 * @throws {UnresolvedTestSource} A test source has no text.
 */
export function fullRubric(question: CodeQuestion): FullRubricItem[] {
	requireResolved(question);
	const items: FullRubricItem[] = [];
	for (const [index, source] of (question.tests ?? []).entries()) {
		const scan = annotationsOf(source);
		if (!scan.annotated) {
			items.push({
				value: 1,
				binding: "tests",
				source: index,
				public: false,
				example: false,
			});
			continue;
		}
		for (const note of scan.items) {
			items.push({
				value: note.value ?? 1,
				binding: "tests",
				text: note.text,
				...(note.feedback === null ? {} : { feedback: note.feedback }),
				...(note.comment === null ? {} : { comment: note.comment }),
				source: index,
				line: note.line,
				public: note.public,
				example: note.example,
			});
		}
	}
	for (const item of question.rubric ?? []) {
		items.push({
			value: rubricPoints(item),
			binding: "manual",
			text: item.text,
			...(item.feedback === undefined ? {} : { feedback: item.feedback }),
			...(item.comment === undefined ? {} : { comment: item.comment }),
			public: false,
			example: false,
		});
	}
	return items;
}

/**
 * The code text of the first fenced block that is a direct child of the
 * `answerKey`, or `null` (code.md, "Answer key").
 */
export function referenceSolution(question: CodeQuestion): string | null {
	return question.answerKey === undefined
		? null
		: firstFencedCode(question.answerKey);
}

/**
 * `manual` with no test source, `automatic` with tests and no manual item that
 * counts, `semi-automatic` with both (code.md, "Automation"). It does not
 * need the text of a source.
 */
export function codeAutomation(question: CodeQuestion): Automation {
	if (!question.tests?.length) return "manual";
	if ((question.rubric ?? []).some((item) => rubricPoints(item) !== 0)) {
		return "semi-automatic";
	}
	return "automatic";
}

/**
 * The model rules of a test source (a path step of `["tests", i]` is
 * `path`): the format is the extension of the origin, and the annotations of
 * the text follow the rubric item syntax. A source with no text is not
 * checked: the check runs when it is resolved.
 */
function testSourceDiagnostics(
	source: TestSource,
	path: readonly PathStep[],
): Diagnostic[] {
	if (source.origin !== undefined) {
		const extension = source.origin.slice(source.origin.lastIndexOf(".") + 1);
		if (source.format !== extension) {
			return [
				modelError(
					"test-format-disagrees-with-origin",
					`the format ${repr(source.format)} is not the extension ${repr(extension)} of the origin ${repr(source.origin)}`,
					[...path, "format"],
				),
			];
		}
	}
	if (source.text === undefined) return [];
	return scanAnnotations(source.text).problems.map((problem) =>
		modelError(problem.code, `line ${problem.line}: ${problem.message}`, [
			...path,
			"text",
		]),
	);
}

/**
 * rubric.md, "Criterion": the criterion does not start with `{`, `>`, a `!`
 * not followed by `[`, or a `[` that does not start a link. The path is the
 * item, in every form of the document. Runs only for an item with no blank
 * field, as a Pydantic model validator does.
 */
function rubricItemDiagnostics(
	item: RubricItem,
	path: readonly PathStep[],
): Diagnostic[] {
	const blank = freeTextFields(item, ["text", "feedback", "comment"], path);
	if (blank.length > 0) return blank;
	try {
		checkCriterionStart(lstrip(item.text, " \t"));
	} catch (error) {
		if (!(error instanceof RubricSyntaxError)) throw error;
		return [modelError("invalid-rubric-item", error.message, path)];
	}
	return [];
}

/** code.md, "Template": in every form, exactly one fenced code block. */
function checkTemplateIsOneFencedBlock(
	question: CodeQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (question.template === undefined) return undefined;
	const kinds = reconstructBlocks(question.template).map(([kind]) => kind);
	if (
		kinds.length === 1 &&
		kinds[0] === "fence" &&
		!hasUnclosedFence(question.template)
	) {
		return undefined;
	}
	return modelError(
		"forbidden-block-element",
		"'template' must be exactly one fenced code block, with its closing fence",
		[...path, "template"],
	);
}

/**
 * code.md, "Additional Rules": the sum of the positive values of the full
 * rubric is 0. The lint needs the text of every test source, so it reports
 * nothing while one is unresolved.
 */
function checkRubricHasPositiveItem(question: CodeQuestion): Diagnostic[] {
	if (!isResolved(question)) return [];
	const rubric = fullRubric(question);
	if (rubric.length === 0 || rubric.some((item) => item.value > 0)) return [];
	return [
		lintDiagnostic(
			"rubric-without-positive-item",
			[],
			"the sum of the positive values of the rubric is 0, so the question can never score above 0",
		),
	];
}

export const codeRules: FamilyRules<CodeQuestion> = {
	fields: (question, path) => [
		...(question.tests ?? []).flatMap((source, index) =>
			testSourceDiagnostics(source, [...path, "tests", index]),
		),
		...(question.rubric ?? []).flatMap((item, index) =>
			rubricItemDiagnostics(item, [...path, "rubric", index]),
		),
		...freeTextDiagnostics(question.template, "template", [
			...path,
			"template",
		]),
		...freeTextDiagnostics(question.answerKey, "answerKey", [
			...path,
			"answerKey",
		]),
	],
	models: [checkTemplateIsOneFencedBlock, checkAnswerKeyHasNoH1],
	lint: (question) => [
		...checkUnsafeThematicBreak(question.answerKey, ["answerKey"]),
		...checkRubricHasPositiveItem(question),
	],
};

/**
 * A copy of `question` in which each linked test source whose `origin` is a
 * key of `texts` has its `text` (code.md, "JSON form").
 *
 * A key fills every source with that origin, and a key that no source uses is
 * ignored. A source whose origin is not a key stays unresolved, with no error:
 * a second call with a larger map fills the rest. The origin is an opaque key,
 * compared as a string. A leading byte order mark (U+FEFF) of a text is
 * removed before the lines are counted. A source that already has a text is
 * not touched.
 *
 * @throws {InvalidDocumentError} A text breaks the rules of the annotations
 *   (`invalid-rubric-item`, `blank-text`). The path of each diagnostic is
 *   `["tests", i, "text"]`.
 */
export function resolveTests(
	question: CodeQuestion,
	texts: Readonly<Record<string, string>>,
): CodeQuestion {
	if (!question.tests?.length) return { ...question };
	const problems: Diagnostic[] = [];
	const tests = question.tests.map((source, index) => {
		const origin = source.origin;
		if (
			source.text !== undefined ||
			origin === undefined ||
			!Object.hasOwn(texts, origin)
		) {
			return source;
		}
		const resolved: TestSource = {
			format: source.format,
			origin,
			text: stripBom(texts[origin] as string),
		};
		problems.push(...testSourceDiagnostics(resolved, ["tests", index]));
		return resolved;
	});
	if (problems.length > 0) throw new InvalidDocumentError(problems);
	return { ...question, tests };
}
