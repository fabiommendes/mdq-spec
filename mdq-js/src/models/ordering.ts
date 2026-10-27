/**
 * Ordering questions. A port of `models/_ordering.py`: validation, lint and
 * scoring.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { NotAutoGradable, ResponseError } from "../errors.js";
import { pyRepr, repr, strip, typeName } from "../parser/text.js";
import type { OrderingQuestion } from "../schema/index.js";
import {
	type FamilyRules,
	freeTextDiagnostics,
	freeTextFields,
	modelError,
} from "./base.js";
import { checkCodeHighlight, renderVisualKey } from "./lint.js";
import { lintDiagnostic } from "./lint-codes.js";
import type { QuestionScore } from "./score.js";

type Line = readonly [level: number, text: string];

/** The normalizations grading applies, with the `dedent` that `lenient` implies. */
function effectiveNormalizations(question: OrderingQuestion): Set<string> {
	const found = new Set<string>(question.normalizations ?? []);
	if (question.indentation === "lenient") found.add("dedent");
	return found;
}

/** Whether `text` has nothing but white space, as `skip-blanks` sees it. */
function isBlank(text: string): boolean {
	return strip(text) === "";
}

/**
 * The form `lines` takes when compared: the normalizations applied, and every
 * level flattened to 0 unless indentation is graded. A string, to be a key.
 */
function comparisonKeys(
	question: OrderingQuestion,
	lines: readonly Line[],
): string[] {
	const normalizations = effectiveNormalizations(question);
	const graded = !normalizations.has("dedent");
	const skipBlanks = normalizations.has("skip-blanks");
	return lines
		.filter(([, text]) => !(skipBlanks && isBlank(text)))
		.map(([level, text]) => JSON.stringify([graded ? level : 0, text]));
}

/**
 * The form `lines` takes when checking which pool lines they use: the level
 * and text under `fixed`, only the text under `lenient` and `strict`.
 */
function identityKeys(
	question: OrderingQuestion,
	lines: readonly Line[],
): string[] {
	const skipBlanks = effectiveNormalizations(question).has("skip-blanks");
	const byText =
		question.indentation !== undefined && question.indentation !== "fixed";
	return lines
		.filter(([, text]) => !(skipBlanks && isBlank(text)))
		.map(([level, text]) => JSON.stringify([byText ? 0 : level, text]));
}

function counts(keys: readonly string[]): Map<string, number> {
	const found = new Map<string, number>();
	for (const key of keys) found.set(key, (found.get(key) ?? 0) + 1);
	return found;
}

/** Why `lines` is not a valid outline, or `undefined` when it is. */
function outlineProblem(lines: readonly Line[]): string | undefined {
	let previous = -1;
	for (const [index, [level, text]] of lines.entries()) {
		if (level > previous + 1) {
			const where = index === 0 ? "the first line" : `line ${index}`;
			return `${where} [${level}, ${repr(text)}] is at level ${level}, but the deepest level allowed there is ${previous + 1}`;
		}
		previous = level;
	}
	return undefined;
}

/** The `accept` and `reject` entries of a question, empty if it has none. */
function alternatives(question: OrderingQuestion) {
	return {
		accept: question.accept ?? [],
		reject: question.reject ?? [],
	};
}

/** ordering.md#whitespace: with `content: text`, only a code block holds a blank line. */
function checkTextLinesNotEmpty(
	question: OrderingQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (question.content !== "text") return undefined;
	const { accept, reject } = alternatives(question);
	const blocks = [
		question.lines,
		question.extra ?? [],
		...[...accept, ...reject].map((alternative) => alternative.lines),
	];
	if (blocks.some((block) => block.some(([, text]) => text === ""))) {
		return modelError(
			"empty-ordering-line",
			"a line of a text ordering question must not be empty",
			path,
		);
	}
	return undefined;
}

/**
 * ordering.md#additional-rules: the `lines` block and every `accept` entry
 * hold a line after normalization. An empty `reject` entry stays valid.
 */
function checkAnswersNotEmpty(
	question: OrderingQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (comparisonKeys(question, question.lines).length === 0) {
		return modelError(
			"empty-ordering-answer",
			"the lines block is empty after normalization",
			[...path, "lines"],
		);
	}
	for (const [index, entry] of (question.accept ?? []).entries()) {
		if (comparisonKeys(question, entry.lines).length === 0) {
			return modelError(
				"empty-ordering-answer",
				"an accept entry is empty after normalization",
				[...path, "accept", index],
			);
		}
	}
	return undefined;
}

/**
 * ordering.md#additional-rules: the same lines are not both accepted and
 * rejected, once fully normalized. The answer key is an accepted answer.
 */
function checkAcceptAndRejectDisjoint(
	question: OrderingQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const { accept, reject } = alternatives(question);
	const rejectKeys = new Set(
		reject.map((entry) => comparisonKeys(question, entry.lines).join("\n")),
	);
	for (const [index, entry] of accept.entries()) {
		if (rejectKeys.has(comparisonKeys(question, entry.lines).join("\n"))) {
			return modelError(
				"accept-reject-overlap",
				"the same lines must not be declared in both accept and reject",
				[...path, "accept", index],
			);
		}
	}
	const answerKey = comparisonKeys(question, question.lines).join("\n");
	for (const [index, entry] of reject.entries()) {
		if (comparisonKeys(question, entry.lines).join("\n") === answerKey) {
			return modelError(
				"accept-reject-overlap",
				"a reject entry must not hold the same lines as the answer key",
				[...path, "reject", index],
			);
		}
	}
	return undefined;
}

/**
 * ordering.md#additional-rules: the lines of an `accept` entry are a
 * sub-multiset of the `lines` block.
 */
function checkAcceptWithinAnswerKey(
	question: OrderingQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const available = counts(identityKeys(question, question.lines));
	for (const [index, entry] of (question.accept ?? []).entries()) {
		for (const [key, count] of counts(identityKeys(question, entry.lines))) {
			if (count > (available.get(key) ?? 0)) {
				return modelError(
					"accept-outside-answer-key",
					"an accept entry must not hold a line the answer key lacks",
					[...path, "accept", index],
				);
			}
		}
	}
	return undefined;
}

/**
 * ordering.md#additional-rules: with `content: text`, the `lines` block and
 * every `accept` and `reject` entry are a valid outline. `extra` is exempt.
 */
function checkTextOutlineLevels(
	question: OrderingQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (question.content !== "text") return undefined;
	const { accept, reject } = alternatives(question);
	const blocks: [PathStep[], readonly Line[]][] = [
		[["lines"], question.lines],
		...accept.map((entry, index): [PathStep[], readonly Line[]] => [
			["accept", index, "lines"],
			entry.lines,
		]),
		...reject.map((entry, index): [PathStep[], readonly Line[]] => [
			["reject", index, "lines"],
			entry.lines,
		]),
	];
	for (const [location, block] of blocks) {
		const problem = outlineProblem(block);
		if (problem !== undefined) {
			return modelError("invalid-outline-level", problem, [
				...path,
				...location,
			]);
		}
	}
	return undefined;
}

//
// Lint
//

/**
 * ordering.md#acceptedrejected-answers: a question SHOULD NOT declare two
 * `accept` sections, or two `reject` sections, whose lines are the same once
 * fully normalized. An accept and reject pair is a model error.
 */
function checkDuplicateAlternatives(question: OrderingQuestion): Diagnostic[] {
	const found: Diagnostic[] = [];
	for (const section of ["accept", "reject"] as const) {
		const seen = new Map<string, number>();
		for (const [index, entry] of (question[section] ?? []).entries()) {
			const key = comparisonKeys(question, entry.lines).join("\n");
			const first = seen.get(key);
			if (first === undefined) {
				seen.set(key, index);
				continue;
			}
			found.push(
				lintDiagnostic(
					"duplicate-alternative-lines",
					[section, index, "lines"],
					`${section}[${index}] holds the same lines as ${section}[${first}], once fully normalized`,
				),
			);
		}
	}
	return found;
}

/** ordering.md#acceptedrejected-answers: `accept` SHOULD NOT repeat `lines`. */
function checkAcceptRepeatsAnswerKey(question: OrderingQuestion): Diagnostic[] {
	const answerKey = comparisonKeys(question, question.lines).join("\n");
	return (question.accept ?? []).flatMap((entry, index) =>
		comparisonKeys(question, entry.lines).join("\n") === answerKey
			? [
					lintDiagnostic(
						"accept-repeats-answer-key",
						["accept", index, "lines"],
						`accept[${index}] repeats the [ordering] block's own lines, once fully normalized`,
					),
				]
			: [],
	);
}

/**
 * ordering.md#acceptedrejected-answers: a `reject` entry that uses a line, or
 * more copies of a line, than the presented pool (`lines` plus `extra`)
 * offers can never match a response.
 */
function checkUnreachableReject(question: OrderingQuestion): Diagnostic[] {
	const pool = counts([
		...identityKeys(question, question.lines),
		...identityKeys(question, question.extra ?? []),
	]);
	return (question.reject ?? []).flatMap((entry, index) => {
		const exceeds = [...counts(identityKeys(question, entry.lines))].some(
			([key, count]) => count > (pool.get(key) ?? 0),
		);
		return exceeds
			? [
					lintDiagnostic(
						"unreachable-alternative",
						["reject", index, "lines"],
						`reject[${index}] uses a line, or more copies of a line, than the lines and extra blocks offer, so no response can match it`,
					),
				]
			: [];
	});
}

/**
 * ordering.md#indentation: `dedent` flattens every line to level 0, so
 * `indentation: "strict"` has nothing left to compare. Only an explicit
 * `dedent` can trigger this: `lenient` implies it and never combines with
 * `strict`.
 */
function checkRedundantStrictIndentation(
	question: OrderingQuestion,
): Diagnostic[] {
	if (question.indentation !== "strict") return [];
	if (!effectiveNormalizations(question).has("dedent")) return [];
	return [
		lintDiagnostic(
			"redundant-strict-indentation",
			["indentation"],
			"indentation is 'strict' but 'dedent' is normalized, which flattens every line to level 0, so there is nothing left for 'strict' to compare",
		),
	];
}

/**
 * ordering.md#additional-rules: a blank `lines` or `extra` entry should only
 * appear when `skip-blanks` is normalized, otherwise it counts when comparing
 * a response.
 */
function checkBlankLines(question: OrderingQuestion): Diagnostic[] {
	if (effectiveNormalizations(question).has("skip-blanks")) return [];
	const found: Diagnostic[] = [];
	for (const field of ["lines", "extra"] as const) {
		for (const [index, [, text]] of (question[field] ?? []).entries()) {
			if (!isBlank(text)) continue;
			found.push(
				lintDiagnostic(
					"blank-ordering-line",
					[field, index],
					"line is blank, and 'skip-blanks' is not normalized, so it counts when comparing a response",
				),
			);
		}
	}
	return found;
}

/** ordering.md#feedback: a `reject` section SHOULD declare feedback. */
function checkRejectWithoutFeedback(question: OrderingQuestion): Diagnostic[] {
	return (question.reject ?? []).flatMap((entry, index) =>
		entry.feedback === undefined
			? [
					lintDiagnostic(
						"reject-without-feedback",
						["reject", index],
						`reject[${index}] declares no feedback, so it explains nothing to the student`,
					),
				]
			: [],
	);
}

/**
 * ordering.md#body: two `lines` or `extra` entries at the same level should
 * not render alike while differing in source. Only for `content: text`: a
 * code block is shown verbatim.
 */
function checkVisuallyIdenticalLines(question: OrderingQuestion): Diagnostic[] {
	if (question.content !== "text") return [];
	const seen = new Map<
		string,
		{ field: string; index: number; text: string }
	>();
	const found: Diagnostic[] = [];
	for (const field of ["lines", "extra"] as const) {
		for (const [index, [level, text]] of (question[field] ?? []).entries()) {
			const key = JSON.stringify([level, renderVisualKey(text)]);
			const first = seen.get(key);
			if (first === undefined) {
				seen.set(key, { field, index, text });
				continue;
			}
			if (text === first.text) continue; // An intentional repeat.
			found.push(
				lintDiagnostic(
					"visually-identical-lines",
					[field, index],
					`line renders the same as ${first.field}[${first.index}] but is written differently in source; a student ordering the rendered text cannot tell them apart`,
				),
			);
		}
	}
	return found;
}

export const orderingRules: FamilyRules<OrderingQuestion> = {
	fields: (question, path) => [
		...freeTextDiagnostics(question.incorrectFeedback, "incorrectFeedback", [
			...path,
			"incorrectFeedback",
		]),
		...["accept", "reject"].flatMap((list) =>
			(question[list as "accept" | "reject"] ?? []).flatMap((entry, index) =>
				freeTextFields(entry, ["feedback", "comment"], [...path, list, index]),
			),
		),
	],
	models: [
		checkTextLinesNotEmpty,
		checkAnswersNotEmpty,
		checkAcceptAndRejectDisjoint,
		checkAcceptWithinAnswerKey,
		checkTextOutlineLevels,
	],
	lint: (question) => [
		...checkCodeHighlight(question.content, question.highlight),
		...checkDuplicateAlternatives(question),
		...checkAcceptRepeatsAnswerKey(question),
		...checkUnreachableReject(question),
		...checkRedundantStrictIndentation(question),
		...checkBlankLines(question),
		...checkRejectWithoutFeedback(question),
		...checkVisuallyIdenticalLines(question),
	],
};

//
// Scoring
//

/**
 * Read a JSON-shaped ordering response as `[level, text]` pairs.
 *
 * @throws {ResponseError} Some entry is not a `[non-negative int, string]` pair.
 */
function coerceLines(lines: readonly unknown[]): Line[] {
	return lines.map((entry) => {
		if (!Array.isArray(entry) || entry.length !== 2) {
			throw new ResponseError(
				`Line ${pyRepr(entry)} is not a [level, text] pair`,
			);
		}
		const [level, text] = entry as [unknown, unknown];
		if (typeof level !== "number" || !Number.isInteger(level) || level < 0) {
			throw new ResponseError(
				`Line level ${pyRepr(level)} is not a non-negative int`,
			);
		}
		if (typeof text !== "string") {
			throw new ResponseError(`Line text ${pyRepr(text)} is not a string`);
		}
		return [level, text] as const;
	});
}

/**
 * Check that `lines` can come from the presented pool of the question: the
 * `lines` and `extra` blocks together (ordering.md, "Response"). Under
 * `lenient` and `strict`, a `content: text` response must also be a valid
 * outline; under `fixed` an invalid outline is a wrong answer, not an error.
 *
 * @throws {ResponseError} A line is not in the pool, a line is used more
 *   often than the pool offers it, or the outline is not valid.
 */
function checkResponseLines(
	question: OrderingQuestion,
	lines: readonly Line[],
): void {
	if (
		question.content === "text" &&
		(question.indentation ?? "fixed") !== "fixed"
	) {
		const problem = outlineProblem(lines);
		if (problem !== undefined) throw new ResponseError(problem);
	}
	const pool = counts(
		identityKeys(question, [...question.lines, ...(question.extra ?? [])]),
	);
	for (const key of identityKeys(question, lines)) {
		const left = pool.get(key) ?? 0;
		if (left <= 0) {
			const line = JSON.parse(key) as unknown[];
			throw new ResponseError(
				`Line ${pyRepr(line)} is not in the pool, or is used more often than the question offers it`,
			);
		}
		pool.set(key, left - 1);
	}
}

/** Whether two lists of comparison keys are the same. */
function sameKeys(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((key, index) => key === b[index]);
}

/**
 * Score 1 for the answer key or an accepted ordering, 0 for a rejected one,
 * and otherwise whatever `unmatched` dictates. When several declared answers
 * match, the first in document order wins: the `lines` block, then the
 * `accept` entries, then the `reject` entries.
 *
 * @throws {ResponseError} The response is malformed (responses.md, "Ordering").
 * @throws {NotAutoGradable} Nothing matched and `unmatched` is `"manual"`.
 */
export function scoreOrdering(
	question: OrderingQuestion,
	response: unknown,
): QuestionScore {
	if (!Array.isArray(response)) {
		throw new ResponseError(
			`An ordering response must be a sequence of [level, text] pairs, found ${typeName(response)}`,
		);
	}
	const lines = coerceLines(response);
	checkResponseLines(question, lines);

	const incorrect = question.incorrectFeedback
		? [question.incorrectFeedback]
		: [];
	const key = comparisonKeys(question, lines);
	if (sameKeys(key, comparisonKeys(question, question.lines))) {
		return { score: 1, feedback: [] };
	}
	for (const alternative of question.accept ?? []) {
		if (sameKeys(key, comparisonKeys(question, alternative.lines))) {
			return {
				score: 1,
				feedback: alternative.feedback ? [alternative.feedback] : [],
			};
		}
	}
	for (const alternative of question.reject ?? []) {
		if (sameKeys(key, comparisonKeys(question, alternative.lines))) {
			return {
				score: 0,
				feedback: alternative.feedback ? [alternative.feedback] : incorrect,
			};
		}
	}
	if ((question.unmatched ?? "incorrect") === "incorrect") {
		return { score: 0, feedback: incorrect };
	}
	throw new NotAutoGradable(
		"ordering response matched no answer key and requires manual grading",
	);
}
