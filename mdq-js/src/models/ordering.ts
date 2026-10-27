/**
 * Ordering questions. A port of `models/_ordering.py`, the part that
 * validates.
 *
 * Scoring is NOT PORTED (phase P6 of `dev/plan/mdq-js-paridade.md`).
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { repr, strip } from "../parser/text.js";
import type { OrderingQuestion } from "../schema/index.js";
import {
	type FamilyRules,
	freeTextDiagnostics,
	freeTextFields,
	modelError,
} from "./base.js";

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
};
