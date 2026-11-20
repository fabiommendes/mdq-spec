import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load, type Question } from "@mdq-format/core";
import { describe, expect, it } from "vitest";
import { review } from "../src/webview/grade.js";

const NO_KEY = "Answer the question to see its review.";

const VALID = join(import.meta.dirname, "..", "..", "examples", "valid");

/** Every valid question of the shared corpus, written in Markdown. */
function corpus(): [string, Question][] {
	const found: [string, Question][] = [];
	for (const type of readdirSync(VALID)) {
		if (type === "exam") continue;
		for (const file of readdirSync(join(VALID, type))) {
			if (!file.endsWith(".mdq.md")) continue;
			const text = readFileSync(join(VALID, type, file), "utf8");
			const { document } = load(text, { kind: "question", ids: "fill" });
			if (document !== undefined) found.push([`${type}/${file}`, document]);
		}
	}
	return found;
}

describe("review without a response shows the answer key", () => {
	const questions = corpus();

	it("reads the corpus", () => {
		expect(questions.length).toBeGreaterThan(50);
	});

	for (const [name, question] of questions) {
		it(name, () => {
			const shown = review(question, undefined);
			if ("error" in shown) {
				// A key with no literal response (a regex, `manual`, no
				// correct choice) has nothing to fill in; grading never fails.
				expect(shown.error).toBe(NO_KEY);
				return;
			}
			const result = shown.result as { pending?: true; score?: number };
			if (result.pending) return;
			expect(result.score).toBe(1);
		});
	}
});

describe("review with a response", () => {
	const text =
		"Qual é o maior bioma do Brasil?\n\n* [*] [amazonia] Amazônia\n* [ ] [pampa] Pampa\n";
	const question = load(text, { kind: "question", ids: "fill" })
		.document as Question;

	it("grades the response, not the key", () => {
		const shown = review(question, "pampa");
		expect(shown).toMatchObject({ response: "pampa" });
		expect((shown as { result: { score: number } }).result.score).toBeLessThan(
			1,
		);
	});

	it("reports a response of the wrong shape", () => {
		expect(review(question, 42)).toHaveProperty("error");
	});
});

describe("review of an upload", () => {
	const withKey = load(
		[
			"---",
			"id: ciclo-da-agua",
			"title: Ciclo da água",
			"---",
			"",
			"Desenhe o ciclo da água e envie uma foto do desenho.",
			"",
			"[upload]",
			"",
			"## [answer-key]",
			"",
			"O desenho mostra evaporação, condensação e precipitação.",
			"",
		].join("\n"),
		{ kind: "question", ids: "fill" },
	).document as Question;
	const withoutKey = load(
		[
			"---",
			"id: ciclo-sem-chave",
			"title: Ciclo da água",
			"---",
			"",
			"Desenhe o ciclo da água e envie uma foto do desenho.",
			"",
			"[upload]",
			"",
		].join("\n"),
		{ kind: "question", ids: "fill" },
	).document as Question;
	const files = [
		{ name: "desenho.png", path: "uploads/desenho.png", size: 2048 },
	];

	it("is pending without a response, with its answer key as guidance", () => {
		expect(review(withKey, undefined)).toEqual({
			response: null,
			result: { pending: true, correct: [] },
			answerKey: "O desenho mostra evaporação, condensação e precipitação.",
		});
	});

	it("has no answer key to show when the question has none", () => {
		const shown = review(withoutKey, undefined);
		expect(shown).toEqual({
			response: null,
			result: { pending: true, correct: [] },
		});
		expect(shown).not.toHaveProperty("answerKey");
	});

	it("is pending with a valid response list, and does not score it", () => {
		const shown = review(withKey, files);
		expect(shown).toEqual({
			response: files,
			result: { pending: true, correct: [] },
			answerKey: "O desenho mostra evaporação, condensação e precipitação.",
		});
	});

	it("reports a malformed response list", () => {
		expect(review(withKey, [])).toHaveProperty("error");
		expect(review(withKey, "desenho.png")).toHaveProperty("error");
	});
});
