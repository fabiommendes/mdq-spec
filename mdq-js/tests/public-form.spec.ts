/**
 * `publicForm` and `correctResponses` (`docs/public-form.md`): the cases of
 * `examples/public.yaml`, whose header describes the format, and a property
 * over the valid corpus. Mirrors `mdq-py/tests/test_public_form.py`.
 */

import {
	correctResponses,
	lint,
	load,
	MissingIdError,
	publicForm,
	type Question,
	scoreResponse,
	withIds,
} from "@mdq";
import { describe, expect, it } from "vitest";
import {
	loadDocument,
	PUBLIC_FILE,
	relativeId,
	VALID_QUESTIONS,
} from "./corpus.js";
import { corpusIt, PUBLIC_FORM } from "./not-ported.js";
import { casesOf, errorsOf } from "./vectors.js";

interface Case {
	readonly name: string;
	readonly question: Record<string, unknown>;
	readonly public?: unknown;
	readonly correctResponses?: unknown;
	readonly error?: "MissingIdError";
}

const CASES = casesOf<Case>(PUBLIC_FILE);

function questionOf(data: unknown): Question {
	const loaded = load(data as Record<string, unknown>);
	expect(errorsOf(loaded.diagnostics)).toEqual([]);
	return loaded.document as Question;
}

/** `value` after a JSON round trip: it must hold only plain JSON values. */
function json(value: unknown): unknown {
	return JSON.parse(JSON.stringify(value));
}

/**
 * The correct responses as full responses. Fill-in: one response with the
 * first correct response of each blank, none if a blank has none.
 */
function fullResponses(question: Question): unknown[] {
	const responses = correctResponses(question);
	if (question.type !== "fill-in") return responses as unknown[];
	const byBlank = Object.entries(responses as Record<string, unknown[]>);
	if (byBlank.some(([, values]) => values.length === 0)) return [];
	return [
		Object.fromEntries(byBlank.map(([blank, values]) => [blank, values[0]])),
	];
}

describe("public form cases", () => {
	it("there are public form cases", () => {
		expect(CASES.length).toBeGreaterThan(0);
	});

	for (const testCase of CASES) {
		corpusIt(PUBLIC_FORM, testCase.name, () => {
			const question = questionOf(testCase.question);
			if (testCase.error !== undefined) {
				expect(testCase.error).toBe("MissingIdError");
				expect(() => publicForm(question)).toThrow(MissingIdError);
				return;
			}
			expect(json(publicForm(question))).toEqual(testCase.public);
			expect(json(correctResponses(question))).toEqual(
				testCase.correctResponses,
			);
		});
	}

	for (const testCase of CASES) {
		if (testCase.error !== undefined || testCase.question.type === "essay") {
			continue;
		}
		corpusIt(PUBLIC_FORM, `${testCase.name} scores one`, () => {
			const question = questionOf(testCase.question);
			for (const response of fullResponses(question)) {
				expect(scoreResponse(question, response as never).score).toBe(1);
			}
		});
	}
});

/** Keys that are private at any depth of a public form. */
const PRIVATE_KEYS: ReadonlySet<string> = new Set([
	"comment",
	"feedback",
	"incorrectFeedback",
	"score",
	"correct",
	"marker",
	"answer",
	"tolerance",
	"accept",
	"reject",
	"answerKey",
	"extra",
	"lines",
	"meta",
	"author",
]);

/**
 * Lint codes of a question whose correct responses may not score 1: an
 * earlier pattern or section shadows them, or the answer is outside its
 * domain.
 */
const SHADOWING_CODES: ReadonlySet<string> = new Set([
	"accept-reject-overlap",
	"duplicate-alternative-lines",
	"answer-outside-domain",
]);

/** The lists whose entries keep their `feedback`: the student sees it before the submission. */
const PATTERN_LISTS: ReadonlySet<string> = new Set(["preAccept", "preReject"]);

/** Every key of `value`, at any depth, but the `feedback` of a pre-validation pattern. */
function keysOf(value: unknown): Set<string> {
	const keys = new Set<string>();
	if (Array.isArray(value)) {
		for (const item of value) for (const key of keysOf(item)) keys.add(key);
	} else if (typeof value === "object" && value !== null) {
		for (const [key, item] of Object.entries(value)) {
			keys.add(key);
			if (PATTERN_LISTS.has(key) && Array.isArray(item)) {
				for (const entry of item) {
					if (typeof entry !== "object" || entry === null) continue;
					for (const inner of Object.keys(entry)) {
						if (inner !== "feedback") keys.add(inner);
					}
				}
			} else {
				for (const inner of keysOf(item)) keys.add(inner);
			}
		}
	}
	return keys;
}

const CORPUS_QUESTIONS = VALID_QUESTIONS.flatMap((path) => {
	const document = loadDocument(path);
	const loaded = load(document as Record<string, unknown>);
	if (errorsOf(loaded.diagnostics).length > 0) return [];
	return [[relativeId(path), withIds(loaded.document as Question)] as const];
});

describe("valid corpus", () => {
	it("has questions", () => {
		expect(CORPUS_QUESTIONS.length).toBeGreaterThan(0);
	});

	for (const [name, question] of CORPUS_QUESTIONS) {
		it(`${name}: the public form has no private key`, () => {
			const form = publicForm(question);
			expect(json(form)).toEqual(form);
			const leaked = [...keysOf(form)].filter((key) => PRIVATE_KEYS.has(key));
			expect(leaked).toEqual([]);
		});

		if (question.type === "essay") continue;
		if (lint(question).some((entry) => SHADOWING_CODES.has(entry.code))) {
			continue;
		}
		it(`${name}: every correct response scores 1`, () => {
			for (const response of fullResponses(question)) {
				expect(scoreResponse(question, response as never).score).toBe(1);
			}
		});
	}
});
