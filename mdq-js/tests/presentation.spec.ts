/**
 * `presentation` and `examPresentation` (`docs/public-form.md`, "Presented
 * form"): the cases of `examples/presentation.yaml`, whose header describes
 * the format, the round trip of the grading vectors and the properties of
 * the presented form. Mirrors `mdq-py/tests/test_presentation.py`.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	type Exam,
	examPresentation,
	load,
	MissingIdError,
	NotAutoGradable,
	presentation,
	publicForm,
	type Question,
	ResponseError,
	scoreResponse,
	scoreResponses,
	UnresolvedInclude,
} from "@mdq";
import { digest } from "@mdq/models/presentation.js";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { GRADING_DIR, PRESENTATION_FILE } from "./corpus.js";
import { corpusIt, PRESENTATION } from "./not-ported.js";
import { casesOf, errorsOf } from "./vectors.js";

type Plain = Record<string, unknown>;

interface ResponseEntry {
	readonly real?: unknown;
	readonly presented?: unknown;
	readonly error?: "ResponseError";
}

interface Case {
	readonly name: string;
	readonly seed: string;
	readonly question: Plain;
	readonly shuffle?: boolean;
	readonly presented: Plain;
	readonly responses: ResponseEntry[];
	readonly stableWith?: string;
	readonly changed?: string[];
}

/**
 * The cases, read without the exponent floats of YAML 1.2. The file does not
 * quote the labels, and a label of digits with one `e` (`47e86412`) is
 * `Infinity` there, but a string for `yaml.safe_load` in
 * `mdq-py/tests/test_presentation.py` (YAML 1.1 wants a dot in a float).
 */
const CASES = (
	parse(readFileSync(PRESENTATION_FILE, "utf-8"), {
		customTags: (tags) =>
			tags.filter(
				(tag) =>
					typeof tag === "string" ||
					(tag as { format?: string }).format !== "EXP",
			),
	}) as { cases: Case[] }
).cases;
const BY_NAME = new Map(CASES.map((c) => [c.name, c]));
const LENGTHS = [8, 16, 32, 64];

function questionOf(data: unknown): Question {
	const loaded = load(data as Plain, { kind: "question" });
	expect(errorsOf(loaded.diagnostics)).toEqual([]);
	return loaded.document as Question;
}

/** `value` after a JSON round trip: it must hold only plain JSON values. */
function json(value: unknown): unknown {
	return JSON.parse(JSON.stringify(value));
}

function presentationOf(testCase: Case) {
	const options =
		testCase.shuffle === undefined ? {} : { shuffle: testCase.shuffle };
	return presentation(questionOf(testCase.question), testCase.seed, options);
}

function sha256(text: string): string {
	return createHash("sha256").update(text, "utf8").digest("hex");
}

describe("presented form cases", () => {
	it("there are cases", () => {
		expect(CASES.length).toBeGreaterThan(0);
	});

	for (const testCase of CASES) {
		corpusIt(PRESENTATION, `${testCase.name}: presented form`, () => {
			expect(json(presentationOf(testCase).publicForm())).toEqual(
				testCase.presented,
			);
		});

		corpusIt(PRESENTATION, `${testCase.name}: responses`, () => {
			const own = presentationOf(testCase);
			for (const entry of testCase.responses) {
				if (entry.error !== undefined) {
					expect(entry.error).toBe("ResponseError");
					expect(() =>
						"presented" in entry
							? own.toResponse(entry.presented)
							: own.toPresented(entry.real),
					).toThrow(ResponseError);
					continue;
				}
				expect(own.toPresented(entry.real)).toEqual(entry.presented);
				expect(own.toResponse(entry.presented)).toEqual(entry.real);
			}
		});
	}
});

/** Choice id to label, for the top-level choices of a case. */
function labelById(testCase: Case): Map<string, string> {
	const original = (testCase.question.choices as { id: string }[]).map(
		(c) => c.id,
	);
	const presented = new Set(
		(testCase.presented.choices as { id: string }[]).map((c) => c.id),
	);
	const labels = new Map<string, string>();
	for (const id of original) {
		const full = sha256(
			[testCase.seed, (testCase.question.id as string) ?? "", id].join("\0"),
		);
		const length = LENGTHS.find((n) => presented.has(full.slice(0, n)));
		if (length !== undefined) labels.set(id, full.slice(0, length));
	}
	return labels;
}

describe("stability", () => {
	for (const testCase of CASES.filter((c) => c.stableWith !== undefined)) {
		it(testCase.name, () => {
			const other = BY_NAME.get(testCase.stableWith as string) as Case;
			expect(testCase.seed).toBe(other.seed);
			const mine = labelById(testCase);
			const theirs = labelById(other);
			const changed = new Set(testCase.changed ?? []);
			const shared = [...mine.keys()].filter((id) => theirs.has(id));
			expect(shared.filter((id) => !changed.has(id)).length).toBeGreaterThan(0);
			for (const id of shared) {
				if (changed.has(id)) expect(mine.get(id)).not.toBe(theirs.get(id));
				else expect(mine.get(id)).toBe(theirs.get(id));
			}
			for (const id of changed) expect(mine.has(id)).toBe(true);
		});
	}
});

describe("labels", () => {
	it("only the colliding labels are longer", () => {
		const collision = "only the colliding labels grow to 16 digits";
		const stable =
			"stability: a choice that collides at 8 digits changes only the two labels";
		const lengths = (name: string): number[] =>
			(BY_NAME.get(name)?.presented.choices as { id: string }[])
				.map((c) => c.id.length)
				.sort((a, b) => a - b);
		expect(lengths(collision)).toEqual([8, 8, 16, 16]);
		expect(lengths(stable)).toEqual([8, 8, 16, 16]);
		for (const testCase of CASES) {
			if ([collision, stable].includes(testCase.name)) continue;
			if (!Array.isArray(testCase.presented.choices)) continue;
			for (const choice of testCase.presented.choices as { id: string }[]) {
				expect(choice.id).toHaveLength(8);
			}
		}
	});

	it("the order by label is the order by digest", () => {
		const testCase = BY_NAME.get(
			"only the colliding labels grow to 16 digits",
		) as Case;
		const labels = (testCase.presented.choices as { id: string }[]).map(
			(c) => c.id,
		);
		expect(labels).toEqual([...labels].sort());
		const digests = (testCase.question.choices as { id: string }[])
			.map((c) =>
				sha256(
					[testCase.seed, testCase.question.id as string, c.id].join("\0"),
				),
			)
			.sort();
		expect(
			labels.flatMap((label) => digests.filter((d) => d.startsWith(label))),
		).toEqual(digests);
	});

	it("the digest is the SHA-256 of the NUL-joined parts", () => {
		const expected = sha256("s3cr3t\0encontro-das-aguas\0correct");
		expect(digest("s3cr3t", "encontro-das-aguas", "correct")).toBe(expected);
		expect(expected).toHaveLength(64);
		// Non-ASCII text is UTF-8 encoded.
		expect(digest("ana.souza:prova-geografia-ç", "q", "c")).toBe(
			sha256("ana.souza:prova-geografia-ç\0q\0c"),
		);
	});

	it("a seed with U+0000 is rejected, even with no scope", () => {
		const first = questionOf(CASES[0]?.question);
		expect(() => presentation(first, "a\0b")).toThrow(RangeError);
		const numeric = questionOf(
			BY_NAME.get("a question without choices has no scope")?.question,
		);
		expect(() => presentation(numeric, "a\0b")).toThrow(RangeError);
	});

	it("a choice without id is not addressable", () => {
		const question = questionOf({
			type: "multiple-choice",
			stem: "Qual é a capital do Brasil?",
			choices: [{ text: "Brasília", score: 1 }, { text: "Rio de Janeiro" }],
		});
		expect(() => presentation(question, "seed")).toThrow(MissingIdError);
	});

	it("labels depend on the seed", () => {
		const question = questionOf(CASES[0]?.question);
		const ids = (seed: string): string[] =>
			(
				presentation(question, seed).publicForm() as unknown as {
					choices: { id: string }[];
				}
			).choices.map((c) => c.id);
		const two = new Set(ids("two"));
		expect(ids("one").some((id) => two.has(id))).toBe(false);
	});

	it("the default shuffle is the effective shuffle", () => {
		const base = CASES[0]?.question as Plain;
		const texts = (question: Question, options = {}): string[] =>
			(
				presentation(question, "s3cr3t", options).publicForm() as unknown as {
					choices: { text: string }[];
				}
			).choices.map((c) => c.text);
		const shuffled = questionOf({ ...base, shuffle: true });
		const plain = questionOf({ ...base, shuffle: false });
		expect(texts(shuffled)).toEqual(texts(plain, { shuffle: true }));
		expect(texts(plain)).toEqual(
			(
				publicForm(plain) as unknown as { choices: { text: string }[] }
			).choices.map((c) => c.text),
		);
	});
});

//
// Round trip and the absence of the original ids
//

const gradingCases = (name: string): Plain[] =>
	casesOf<Plain>(join(GRADING_DIR, `${name}.yaml`), "questions");

function choiceQuestion(type: string, testCase: Plain): Question {
	const key = type === "multiple-choice" ? "score" : "correct";
	const choices = Object.entries(testCase.choices as Plain).map(
		([id, value]) => ({
			id,
			text: id,
			...(value === null ? {} : { [key]: value }),
		}),
	);
	return questionOf({
		type,
		stem: testCase.name,
		grading: testCase.grading,
		choices,
	});
}

function binaryQuestion(type: string, testCase: Plain): Question {
	return questionOf({
		type,
		stem: testCase.name,
		...(testCase.question as Plain),
	});
}

interface RoundTrip {
	readonly name: string;
	readonly question: Question;
	readonly response: unknown;
}

function roundTrips(): RoundTrip[] {
	const found: RoundTrip[] = [];
	for (const testCase of gradingCases("multiple-choice")) {
		const question = choiceQuestion("multiple-choice", testCase);
		for (const [response, score] of Object.entries(
			testCase.examples as Plain,
		)) {
			if (score !== "malformed") {
				found.push({
					name: `mc/${testCase.name}/${response}`,
					question,
					response,
				});
			}
		}
	}
	for (const testCase of gradingCases("multiple-selection")) {
		const question = choiceQuestion("multiple-selection", testCase);
		for (const example of testCase.examples as Plain[]) {
			if (example.score === "malformed") continue;
			const ticks =
				"ticks" in example
					? [...new Set(example.ticks as string[])]
					: example.response;
			found.push({
				name: `ms/${testCase.name}/${JSON.stringify(ticks)}`,
				question,
				response: ticks,
			});
		}
	}
	for (const testCase of gradingCases("true-false")) {
		const question = choiceQuestion("true-false", testCase);
		for (const example of testCase.examples as Plain[]) {
			if (example.score === "malformed") continue;
			const marks = {
				...Object.fromEntries(
					Object.keys(testCase.choices as Plain).map((id) => [id, null]),
				),
				...(example.marks as Plain),
			};
			found.push({
				name: `tf/${testCase.name}/${JSON.stringify(marks)}`,
				question,
				response: marks,
			});
		}
	}
	for (const testCase of gradingCases("fill-in")) {
		const question = binaryQuestion("fill-in", testCase);
		for (const example of testCase.examples as Plain[]) {
			const scores = Object.values(
				(example.scores as Plain | undefined) ?? { x: example.score },
			);
			if (scores.includes("malformed")) continue;
			found.push({
				name: `fill-in/${testCase.name}/${JSON.stringify(example.response)}`,
				question,
				response: example.response,
			});
		}
	}
	return found;
}

const ROUND_TRIPS = roundTrips();

describe("round trip of the grading vectors", () => {
	it("there are vectors", () => {
		expect(ROUND_TRIPS.length).toBeGreaterThan(50);
	});

	for (const shuffle of [true, false]) {
		for (const { name, question, response } of ROUND_TRIPS) {
			it(`${name} (shuffle ${shuffle})`, () => {
				const own = presentation(question, "ana.souza:prova", { shuffle });
				const presented = own.toPresented(response);
				expect(own.toResponse(presented)).toEqual(response);
				// The presented response grades as the real one.
				const grade = (value: unknown): number | "pending" => {
					try {
						return scoreResponse(question, value as never).score;
					} catch (error) {
						if (error instanceof NotAutoGradable) return "pending";
						throw error;
					}
				};
				expect(grade(own.toResponse(presented))).toBe(grade(response));
			});
		}
	}
});

/** The ids of the choices of a question, at the top level and in the blanks. */
function choiceIds(form: Plain): string[] {
	const choices = [...((form.choices as { id: string }[] | undefined) ?? [])];
	for (const blank of (form.blanks as
		| { choices?: { id: string }[] }[]
		| undefined) ?? []) {
		choices.push(...(blank.choices ?? []));
	}
	return choices.map((c) => c.id);
}

describe("properties of the presented form", () => {
	const questions = [
		...gradingCases("multiple-choice").map((c) =>
			choiceQuestion("multiple-choice", c),
		),
		...gradingCases("multiple-selection").map((c) =>
			choiceQuestion("multiple-selection", c),
		),
		...gradingCases("true-false").map((c) => choiceQuestion("true-false", c)),
		...gradingCases("fill-in").map((c) => binaryQuestion("fill-in", c)),
	];

	for (const shuffle of [true, false]) {
		it(`holds no original choice id and keeps the other fields (shuffle ${shuffle})`, () => {
			for (const question of questions) {
				const presented = presentation(question, "ana.souza:prova", {
					shuffle,
				}).publicForm() as unknown as Plain;
				const publicOne = publicForm(question) as unknown as Plain;
				const original = new Set(choiceIds(publicOne));
				expect(choiceIds(presented).some((id) => original.has(id))).toBe(false);
				expect(Object.keys(presented)).toEqual(Object.keys(publicOne));
				const rest = (form: Plain): Plain =>
					Object.fromEntries(
						Object.entries(form).filter(
							([key]) => key !== "choices" && key !== "blanks",
						),
					);
				expect(rest(presented)).toEqual(rest(publicOne));
				if (!shuffle) {
					const texts = (form: Plain): string[] =>
						((form.choices ?? []) as { text: string }[]).map((c) => c.text);
					expect(texts(presented)).toEqual(texts(publicOne));
				}
			}
		});
	}
});

//
// Exam
//

function examOf(shuffle: boolean, own: unknown = "inherit"): Exam {
	const loaded = load(
		{
			title: "Prova de Geografia",
			shuffle,
			questions: [
				{
					...(BY_NAME.get(
						"multiple choice with shuffle false keeps the document order",
					)?.question as Plain),
					shuffle: own,
				},
				BY_NAME.get("multiple selection translates a list of ticked ids")
					?.question,
				BY_NAME.get("a question without choices has no scope")?.question,
			],
		},
		{ kind: "exam" },
	);
	expect(errorsOf(loaded.diagnostics)).toEqual([]);
	return loaded.document as Exam;
}

const choicesOf = (form: unknown): { id: string; text: string }[] =>
	(form as { choices: { id: string; text: string }[] }).choices;

describe("exam presentation", () => {
	it("uses the shuffle of the exam, and the question wins", () => {
		const forms = examPresentation(examOf(true), "s3cr3t").publicForm();
		expect(forms.map((f) => f.id)).toEqual([
			"encontro-das-aguas",
			"biomas-do-brasil",
			"pico-da-neblina",
		]);
		const labels = choicesOf(forms[0]).map((c) => c.id);
		expect(labels).toEqual([...labels].sort());
		const plain = choicesOf(
			examPresentation(examOf(true, false), "s3cr3t").publicForm()[0],
		);
		const expected = choicesOf(
			BY_NAME.get("multiple choice with shuffle false keeps the document order")
				?.presented,
		);
		expect(plain.map((c) => c.text)).toEqual(expected.map((c) => c.text));
		const unshuffled = choicesOf(
			examPresentation(examOf(false), "s3cr3t").publicForm()[0],
		);
		expect(unshuffled.map((c) => c.text)).toEqual(plain.map((c) => c.text));
	});

	it("round trips the responses of an attempt", () => {
		const exam = examOf(true);
		const own = examPresentation(exam, "s3cr3t");
		const responses = {
			"encontro-das-aguas": "correct",
			"biomas-do-brasil": ["cerrado", "caatinga", "pantanal"],
			"pico-da-neblina": 2995,
		};
		const presented = own.toPresentedResponses(responses);
		expect(presented["encontro-das-aguas"]).not.toBe("correct");
		expect(presented["pico-da-neblina"]).toBe(2995);
		expect(own.toResponses(presented)).toEqual(responses);
		expect(
			scoreResponses(exam, own.toResponses(presented) as never).score,
		).toBe(1);
	});

	it("rejects an unknown question and an unknown label", () => {
		const own = examPresentation(examOf(true), "s3cr3t");
		expect(() => own.toResponses({ nope: "x" })).toThrow(ResponseError);
		expect(() => own.toResponses({ "encontro-das-aguas": "correct" })).toThrow(
			ResponseError,
		);
		expect(own.toResponses({})).toEqual({});
		expect(own.toResponses({ "encontro-das-aguas": null })).toEqual({
			"encontro-das-aguas": null,
		});
	});

	it("needs ids and no include", () => {
		const exam = load(
			{
				title: "Prova",
				questions: [{ type: "essay", stem: "Explique o efeito estufa." }],
			},
			{ kind: "exam" },
		).document as Exam;
		expect(() => examPresentation(exam, "seed")).toThrow(MissingIdError);
		const withInclude = load(
			{ title: "Prova", questions: [{ include: "outra-questao" }] },
			{ kind: "exam" },
		).document as Exam;
		expect(() => examPresentation(withInclude, "seed")).toThrow(
			UnresolvedInclude,
		);
	});
});
