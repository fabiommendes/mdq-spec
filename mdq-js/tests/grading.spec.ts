/**
 * `examples/grading/*.yaml`: tables of answer keys and the score each
 * response gets. The choice types list every grading strategy
 * (`multiple-choice.md`, `multiple-selection.md` and `true-false.md`,
 * "Grading"); numeric and short answer are binary, and also list the
 * responses that are malformed or pending (`responses.md`). `exam.yaml`
 * scores whole exams and resolves the inheritance of `grading` and
 * `shuffle`; `automation.yaml` gives the `automation` of a question;
 * `essay.yaml` lists the essay responses. Mirrors
 * `mdq-py/tests/test_grading_examples.py`.
 *
 * `"malformed"` is a `ResponseError` and `"pending"` a `NotAutoGradable`.
 * A `feedback` key is checked only when the example has it.
 *
 * The first word of a test name is its group, one per Python test:
 * `multiple-choice`, `multiple-selection`, `true-false`, `numeric`,
 * `short-answer`, `short-answer-prevalidation`, `fill-in`, `ordering`,
 * `essay`, `automation`, `exam-question-effective`, `exam-effective` and
 * `exam-score`.
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
	automation,
	type Exam,
	effectiveGrading,
	effectiveShuffle,
	effectiveUnmatched,
	gradingFor,
	load,
	NotAutoGradable,
	type Question,
	ResponseError,
	resolveQuestion,
	scoreResponse,
	scoreResponses,
	shuffleFor,
} from "@mdq";
import {
	blankAutomation,
	blankEffectiveUnmatched,
} from "@mdq/models/fill-in.js";
import { prevalidate } from "@mdq/models/score.js";
import { describe, expect, it } from "vitest";
import { EXAMPLES_ROOT, formatOf, GRADING_DIR, readText } from "./corpus.js";
import { corpusIt, GRADING } from "./not-ported.js";
import {
	casesOf,
	errorsOf,
	expectApprox,
	reprOf,
	scoreValue,
} from "./vectors.js";

type Plain = Record<string, unknown>;

const gradingFile = (name: string): string => join(GRADING_DIR, `${name}.yaml`);
const questionsOf = (name: string): Plain[] =>
	casesOf<Plain>(gradingFile(name), "questions");

/** Load a question document; it must report no error. */
function loadQuestion(document: Plain): Question {
	const loaded = load(document, { kind: "question" });
	expect(errorsOf(loaded.diagnostics)).toEqual([]);
	return loaded.document as Question;
}

/** The result of `scoreResponse`, for an example that is not an error. */
function scoreOf(question: Question, response: unknown) {
	return scoreResponse(question, response);
}

/** Expect `run` to reject the response, as the example's `score` says. */
function expectRejected(run: () => unknown, score: unknown): boolean {
	if (score === "malformed") {
		expect(run).toThrow(ResponseError);
		return true;
	}
	if (score === "pending") {
		expect(run).toThrow(NotAutoGradable);
		return true;
	}
	return false;
}

/** The first feedback string, or `null`; at most one is allowed. */
function firstFeedback(feedback: readonly string[]): string | null {
	return feedback[0] ?? null;
}

//
// Choice types
//
function choiceQuestion(type: string, testCase: Plain): Question {
	const key = type === "multiple-choice" ? "score" : "correct";
	const feedback = (testCase.feedback ?? {}) as Record<string, string>;
	const choices = Object.entries(testCase.choices as Plain).map(
		([id, value]) => ({
			id,
			text: id,
			...(value === null ? {} : { [key]: value }),
			...(id in feedback ? { feedback: feedback[id] } : {}),
		}),
	);
	return loadQuestion({
		type,
		stem: testCase.name,
		grading: testCase.grading,
		choices,
	});
}

describe("grading files", () => {
	it("every grading file is covered", () => {
		const names = readdirSync(GRADING_DIR)
			.filter((name) => name.endsWith(".yaml"))
			.map((name) => name.slice(0, -".yaml".length))
			.sort();
		expect(names).toEqual([
			"automation",
			"essay",
			"exam",
			"fill-in",
			"multiple-choice",
			"multiple-selection",
			"numeric",
			"ordering",
			"short-answer",
			"short-answer-prevalidation",
			"true-false",
		]);
	});
});

describe("multiple choice", () => {
	for (const testCase of questionsOf("multiple-choice")) {
		for (const [response, expected] of Object.entries(
			testCase.examples as Plain,
		)) {
			corpusIt(
				GRADING,
				`multiple-choice.${testCase.grading}/${testCase.name}/${response}`,
				() => {
					const question = choiceQuestion("multiple-choice", testCase);
					if (expectRejected(() => scoreOf(question, response), expected)) {
						return;
					}
					const result = scoreOf(question, response);
					if (typeof expected === "object" && expected !== null) {
						const detail = expected as Plain;
						expectApprox(result.score, scoreValue(detail.score));
						expect(result.feedback).toEqual(detail.feedback);
					} else {
						expectApprox(result.score, scoreValue(expected));
					}
				},
			);
		}
	}
});

describe("multiple selection", () => {
	for (const testCase of questionsOf("multiple-selection")) {
		for (const example of testCase.examples as Plain[]) {
			corpusIt(
				GRADING,
				`multiple-selection.${testCase.grading}/${testCase.name}/${reprOf("ticks" in example ? example.ticks : example.response)}`,
				() => {
					const question = choiceQuestion("multiple-selection", testCase);
					// `ticks` is the ticked ids; `response` is passed as it is.
					const response =
						"ticks" in example
							? [...new Set(example.ticks as string[])]
							: example.response;
					if (
						expectRejected(() => scoreOf(question, response), example.score)
					) {
						return;
					}
					const result = scoreOf(question, response);
					expectApprox(result.score, scoreValue(example.score));
					if ("feedback" in example) {
						expect(result.feedback).toEqual(example.feedback);
					}
				},
			);
		}
	}
});

describe("true/false", () => {
	for (const testCase of questionsOf("true-false")) {
		for (const example of testCase.examples as Plain[]) {
			corpusIt(
				GRADING,
				`true-false.${testCase.grading}/${testCase.name}/${reprOf(example.marks)}`,
				() => {
					const question = choiceQuestion("true-false", testCase);
					const marks = {
						...Object.fromEntries(
							Object.keys(testCase.choices as Plain).map((id) => [id, null]),
						),
						...(example.marks as Plain),
					};
					if (expectRejected(() => scoreOf(question, marks), example.score)) {
						return;
					}
					const result = scoreOf(question, marks);
					expectApprox(result.score, scoreValue(example.score));
					if ("feedback" in example) {
						expect(result.feedback).toEqual(example.feedback);
					}
				},
			);
		}
	}
});

//
// Binary types
//
function binaryQuestion(type: string, testCase: Plain): Question {
	return loadQuestion({
		type,
		stem: testCase.name,
		...(testCase.question as Plain),
	});
}

/** One test for each example of a binary file, scored by `scoreResponse`. */
function describeBinary(
	group: string,
	title: string,
	options: { oneFeedbackAtMost: boolean; checkFeedback?: boolean },
): void {
	describe(title, () => {
		for (const testCase of questionsOf(group)) {
			for (const example of testCase.examples as Plain[]) {
				corpusIt(
					GRADING,
					`${group}.${testCase.name}/${reprOf(example.response)}`,
					() => {
						const question = binaryQuestion(group, testCase);
						const response = example.response;
						if (
							expectRejected(() => scoreOf(question, response), example.score)
						) {
							return;
						}
						const result = scoreOf(question, response);
						expectApprox(result.score, scoreValue(example.score));
						if ("feedback" in example) {
							expect(firstFeedback(result.feedback)).toEqual(example.feedback);
							if (options.oneFeedbackAtMost) {
								expect(result.feedback.length).toBeLessThanOrEqual(1);
							}
						}
					},
				);
			}
		}
	});
}

describeBinary("numeric", "numeric", { oneFeedbackAtMost: true });
describeBinary("short-answer", "short answer", { oneFeedbackAtMost: true });
describeBinary("ordering", "ordering", { oneFeedbackAtMost: false });

describe("short answer pre-validation", () => {
	for (const testCase of questionsOf("short-answer-prevalidation")) {
		for (const example of testCase.examples as Plain[]) {
			corpusIt(
				GRADING,
				`short-answer-prevalidation.${testCase.name}/${reprOf(example.response)}`,
				() => {
					const response = example.response as string;
					let result: { valid: boolean; feedback: string | null };
					if ("blank" in testCase) {
						const fillIn = binaryQuestion("fill-in", testCase) as Question & {
							blanks: { id: string; type: string }[];
						};
						const blank = fillIn.blanks.find((b) => b.id === testCase.blank);
						expect(blank, `no blank ${String(testCase.blank)}`).toBeDefined();
						result = prevalidate(
							blank as Parameters<typeof prevalidate>[0],
							response,
						);
					} else {
						result = prevalidate(
							binaryQuestion("short-answer", testCase) as Parameters<
								typeof prevalidate
							>[0],
							response,
						);
					}
					expect(result).toEqual({
						valid: example.valid,
						feedback: example.feedback,
					});
				},
			);
		}
	}
});

//
// Fill-in
//
const STRATEGIES = ["partial", "no-mistakes", "all-or-nothing", "symmetric"];

describe("fill-in", () => {
	for (const testCase of questionsOf("fill-in")) {
		for (const example of testCase.examples as Plain[]) {
			const scores = (example.scores ??
				Object.fromEntries(
					STRATEGIES.map((strategy) => [strategy, example.score]),
				)) as Plain;
			for (const [strategy, expected] of Object.entries(scores)) {
				corpusIt(
					GRADING,
					`fill-in.${strategy}/${testCase.name}/${reprOf(example.response)}`,
					() => {
						const question = loadQuestion({
							type: "fill-in",
							grading: strategy,
							...(testCase.question as Plain),
						});
						const response = example.response;
						if (expected === "malformed") {
							expect(() => scoreOf(question, response)).toThrow(ResponseError);
							return;
						}
						if (expected === "pending") {
							expect(() => scoreOf(question, response)).toThrow(
								NotAutoGradable,
							);
							// A pending response shows no feedback (responses.md, "Pending").
							expect(example.feedback ?? []).toEqual([]);
							return;
						}
						const result = scoreOf(question, response);
						expectApprox(result.score, scoreValue(expected));
						if ("feedback" in example) {
							expect(result.feedback).toEqual(example.feedback);
						}
					},
				);
			}
		}
	}
});

describe("essay", () => {
	for (const testCase of questionsOf("essay")) {
		for (const example of testCase.examples as Plain[]) {
			corpusIt(
				GRADING,
				`essay.${testCase.name}/${reprOf(example.response)}`,
				() => {
					const question = binaryQuestion("essay", testCase);
					const error =
						example.score === "pending" ? NotAutoGradable : ResponseError;
					expect(() => scoreOf(question, example.response)).toThrow(error);
				},
			);
		}
	}
});

//
// Automation
//
describe("automation", () => {
	for (const testCase of questionsOf("automation")) {
		corpusIt(GRADING, `automation.${testCase.name}`, () => {
			const question = loadQuestion(testCase.question as Plain);
			expect(automation(question)).toBe(testCase.automation);
			if ("unmatched" in testCase) {
				expect(
					effectiveUnmatched(
						question as Parameters<typeof effectiveUnmatched>[0],
					),
				).toBe(testCase.unmatched);
			}
			if ("blanks" in testCase) {
				const fillIn = question as Question & {
					blanks: { id: string }[];
					unmatched?: "manual" | "incorrect";
				};
				for (const blank of fillIn.blanks) {
					const expected = (testCase.blanks as Record<string, Plain>)[
						blank.id
					] as Plain;
					const asBlank = blank as Parameters<typeof blankAutomation>[0];
					expect(blankEffectiveUnmatched(asBlank, fillIn.unmatched)).toBe(
						expected.unmatched,
					);
					expect(blankAutomation(asBlank, fillIn.unmatched)).toBe(
						expected.automation,
					);
				}
			}
		});
	}
});

//
// Exams
//
const EXAMS = casesOf<Plain>(gradingFile("exam"), "cases");

/** The exam of a case: a corpus document (`source`) or an inline mapping. */
function loadExam(testCase: Plain): Exam {
	const loaded =
		"source" in testCase
			? (() => {
					const path = join(EXAMPLES_ROOT, testCase.source as string);
					return load(readText(path), { format: formatOf(path), kind: "exam" });
				})()
			: load(
					{ type: "exam", title: "Prova", ...(testCase.exam as Plain) },
					{ kind: "exam" },
				);
	expect(errorsOf(loaded.diagnostics)).toEqual([]);
	return loaded.document as Exam;
}

describe("effective values of a question", () => {
	for (const testCase of EXAMS.filter(
		(c) => "effective" in c && "question" in c,
	)) {
		corpusIt(GRADING, `exam-question-effective.${testCase.name}`, () => {
			const question = loadQuestion({
				...(testCase.question as Plain),
				...((testCase.override ?? {}) as Plain),
			});
			const expected = testCase.effective as Plain;
			expect(effectiveGrading(question)).toBe(expected.grading);
			expect(effectiveShuffle(question)).toBe(expected.shuffle);
		});
	}
});

describe("effective values in an exam", () => {
	for (const testCase of EXAMS.filter(
		(c) => "effective" in c && !("question" in c),
	)) {
		corpusIt(GRADING, `exam-effective.${testCase.name}`, () => {
			const exam = loadExam(testCase);
			const byId = new Map(
				(exam.questions as (Question & { id?: string })[]).map((q) => [
					q.id,
					q,
				]),
			);
			for (const [id, expected] of Object.entries(
				testCase.effective as Record<string, Plain>,
			)) {
				const question = byId.get(id) as Question;
				expect(question, `no question ${id}`).toBeDefined();
				const resolved = resolveQuestion(exam, question) as Question & Plain;
				if ("grading" in expected) {
					expect(gradingFor(exam, question)).toBe(expected.grading);
					expect(resolved.grading).toBe(expected.grading);
				}
				if ("shuffle" in expected) {
					expect(shuffleFor(exam, question)).toBe(expected.shuffle);
					expect(resolved.shuffle).toBe(expected.shuffle);
				}
			}
		});
	}
});

describe("exam score", () => {
	EXAMS.forEach((testCase) => {
		((testCase.examples ?? []) as Plain[]).forEach((example, index) => {
			corpusIt(GRADING, `exam-score.${testCase.name}/${index}`, () => {
				const exam = loadExam(testCase);
				const responses = example.responses as Parameters<
					typeof scoreResponses
				>[1];
				if (example.score === "malformed") {
					expect(() => scoreResponses(exam, responses)).toThrow(ResponseError);
					return;
				}
				const result = scoreResponses(exam, responses);
				if (example.score === "pending") {
					expect(result.score).toBeNull();
				} else {
					expectApprox(result.score as number, example.score as number);
				}
				if ("provisional" in example) {
					expectApprox(result.provisional, example.provisional as number);
				}
				if ("total_weight" in example) {
					expectApprox(result.totalWeight, example.total_weight as number);
				}
				if ("penalty" in example) {
					expect(result.penalty).toBe(example.penalty);
				}
				for (const key of ["skipped", "pending"] as const) {
					if (key in example) {
						expect([...result[key]]).toEqual(example[key]);
					}
				}
				if ("questions" in example) {
					const expected = example.questions as Record<string, number | null>;
					const scores = Object.fromEntries(
						Object.entries(result.questions).map(([id, question]) => [
							id,
							question === null ? null : question.score,
						]),
					);
					expect(Object.keys(scores).sort()).toEqual(
						Object.keys(expected).sort(),
					);
					for (const [id, value] of Object.entries(expected)) {
						if (value === null) {
							expect(scores[id]).toBeNull();
						} else {
							expectApprox(scores[id] as number, value);
						}
					}
				}
			});
		});
	});
});
