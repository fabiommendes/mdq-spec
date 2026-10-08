/**
 * Question banks and exam resolution: `DictLoader`, `selectRandom` and
 * `resolveExam`. Port of the "Resolution" section of
 * `mdq-py/tests/test_include_all.py`, which does not need `with_ids`, `load`
 * or the linter. The corpus side is in `tests/exam-resolution.spec.ts`.
 */

import {
	type Diagnostic,
	DictLoader,
	Exam,
	IncludeNotFoundError,
	MdqError,
	ParseError,
	parseExamDocument,
	type QuestionSource,
	resolveExam,
	type Select,
	selectRandom,
} from "@mdq";
import { describe, expect, it } from "vitest";

const BANK_QUESTIONS: Record<string, QuestionSource> = {
	amazonia: { type: "essay", stem: "Amazônia.", tags: ["biome", "forest"] },
	cerrado: { type: "essay", stem: "Cerrado.", tags: ["biome", "savanna"] },
	pantanal: { type: "essay", stem: "Pantanal.", tags: ["biome", "wetland"] },
	mata: {
		type: "essay",
		stem: "Mata Atlântica.",
		tags: ["biome", "forest", "draft"],
	},
	caju: "---\ntags: fruit\n---\n\nCaju.\n\n[essay]\n",
};

const BANK = new DictLoader(BANK_QUESTIONS);

/** A question as the tests read it back, whatever its type. */
interface LooseQuestion {
	id?: string;
	locale?: string;
	author?: string;
}

/** Exam Markdown from blocks, as `exam(...)` does in the Python tests. */
function examText(...blocks: string[]): string {
	return `# [ex] Exam\n\n${blocks.join("\n\n")}\n`;
}

function includeAll(query: string, max?: number): string {
	const lines = ["---", `include-all: ${query}`];
	if (max !== undefined) {
		lines.push(`max: ${max}`);
	}
	return [...lines, "---"].join("\n");
}

function include(id: string): string {
	return `---\ninclude: ${id}\n---`;
}

function parseExam(text: string): Exam {
	return Exam.parse(parseExamDocument(text));
}

/** A deterministic `Select`: the first `max` candidates. */
const first: Select = (candidates, max) =>
	max === undefined ? candidates : candidates.slice(0, max);

function resolvedQuestions(
	text: string,
	options: { select?: Select; warnings?: Diagnostic[] } = { select: first },
): LooseQuestion[] {
	return resolveExam(parseExam(text), BANK, options)
		.questions as LooseQuestion[];
}

function questionIds(
	text: string,
	select: Select = first,
): (string | undefined)[] {
	return resolvedQuestions(text, { select }).map((question) => question.id);
}

describe("DictLoader.load", () => {
	it("returns the source it was given", () => {
		expect(BANK.load("caju")).toBe(BANK_QUESTIONS.caju);
		expect(BANK.load("cerrado")).toBe(BANK_QUESTIONS.cerrado);
	});

	it("reports a missing id as IncludeNotFoundError", () => {
		expect(() => BANK.load("tundra")).toThrow(IncludeNotFoundError);
		expect(() => BANK.load("tundra")).toThrow(
			"cannot resolve included question 'tundra': not in the mapping",
		);
	});

	it("IncludeNotFoundError carries the id and is an MdqError", () => {
		const error = new IncludeNotFoundError("tundra");
		expect(error).toBeInstanceOf(MdqError);
		expect(error.questionId).toBe("tundra");
		expect(error.message).toBe("cannot resolve included question 'tundra'");
	});
});

describe("DictLoader index", () => {
	it("tagged lists the ids of both kinds of source", () => {
		expect([...BANK.tagged("forest")].sort()).toEqual(["amazonia", "mata"]);
		expect([...BANK.tagged("fruit")]).toEqual(["caju"]);
	});

	it("tagged is empty for an unknown tag", () => {
		expect(BANK.tagged("tundra").size).toBe(0);
	});

	it("ids lists every question", () => {
		expect([...BANK.ids()].sort()).toEqual([
			"amazonia",
			"caju",
			"cerrado",
			"mata",
			"pantanal",
		]);
	});

	it("a source without tags is in ids but in no tagged", () => {
		const bank = new DictLoader({
			bare: { type: "essay", stem: "Sem tags." },
			bareText: "Sem tags.\n\n[essay]\n",
		});
		expect([...bank.ids()].sort()).toEqual(["bare", "bareText"]);
		expect(bank.tagged("anything").size).toBe(0);
	});

	it("skips an exam, whether text or object", () => {
		const bank = new DictLoader({
			prova: "# Prova\n\n---\ninclude: a\n---\n",
			outra: { type: "exam", questions: [], tags: ["biome"] },
			q: { type: "essay", stem: "Q.", tags: ["biome"] },
		});
		expect([...bank.ids()]).toEqual(["q"]);
		expect([...bank.tagged("biome")]).toEqual(["q"]);
	});

	it("skips a text that is not a valid question", () => {
		const bank = new DictLoader({
			broken: "Only text, no answer block.",
			q: { type: "essay", stem: "Q.", tags: ["biome"] },
		});
		expect([...bank.ids()]).toEqual(["q"]);
	});

	it("still loads a source the index skips", () => {
		const bank = new DictLoader({ broken: "Only text." });
		expect(bank.load("broken")).toBe("Only text.");
	});

	it("splits a string `tags` at commas and trims", () => {
		const bank = new DictLoader({
			a: { type: "essay", stem: "A.", tags: " biome ,savanna,  " },
			b: "---\ntags: biome, forest\n---\n\nB.\n\n[essay]\n",
		});
		expect([...bank.tagged("biome")].sort()).toEqual(["a", "b"]);
		expect([...bank.tagged("savanna")]).toEqual(["a"]);
		expect([...bank.tagged("forest")]).toEqual(["b"]);
		expect(bank.tagged(" biome ").size).toBe(0);
	});

	it("turns the items of a list `tags` into strings", () => {
		const bank = new DictLoader({
			a: { type: "essay", stem: "A.", tags: [2024, "biome"] },
		});
		expect([...bank.tagged("2024")]).toEqual(["a"]);
	});

	it("builds the index once, on first use", () => {
		const questions: Record<string, QuestionSource> = {
			a: { type: "essay", stem: "A.", tags: ["x"] },
		};
		const bank = new DictLoader(questions);
		expect([...bank.ids()]).toEqual(["a"]);
		questions.b = { type: "essay", stem: "B.", tags: ["x"] };
		expect([...bank.ids()]).toEqual(["a"]);
		expect([...bank.tagged("x")]).toEqual(["a"]);
	});
});

describe("selectRandom", () => {
	it("returns every candidate without max", () => {
		expect(selectRandom(["a", "b", "c"], undefined)).toEqual(["a", "b", "c"]);
	});

	it("returns every candidate when max is not smaller", () => {
		expect(selectRandom(["a", "b", "c"], 3)).toEqual(["a", "b", "c"]);
		expect(selectRandom(["a", "b", "c"], 5)).toEqual(["a", "b", "c"]);
	});

	it("returns a copy of the candidates", () => {
		const candidates = ["a", "b"];
		expect(selectRandom(candidates, undefined)).not.toBe(candidates);
	});

	it("samples max candidates and keeps their order", () => {
		const candidates = ["a", "b", "c", "d", "e", "f"];
		const seen = new Set<string>();
		for (let round = 0; round < 50; round++) {
			const chosen = selectRandom(candidates, 3);
			expect(chosen).toHaveLength(3);
			expect(new Set(chosen).size).toBe(3);
			expect(chosen).toEqual(
				candidates.filter((candidate) => chosen.includes(candidate)),
			);
			for (const id of chosen) {
				seen.add(id);
			}
		}
		expect(seen.size).toBeGreaterThan(3);
	});

	it("returns nothing for no candidates", () => {
		expect(selectRandom([], 2)).toEqual([]);
	});
});

describe("resolveExam: include", () => {
	it("adds an object source with the id it was loaded by", () => {
		const questions = resolvedQuestions(examText(include("cerrado")));
		expect(questions).toHaveLength(1);
		expect(questions[0]).toMatchObject({
			type: "essay",
			stem: "Cerrado.",
			id: "cerrado",
		});
	});

	it("parses a Markdown source", () => {
		expect(resolvedQuestions(examText(include("caju")))[0]).toMatchObject({
			type: "essay",
			id: "caju",
		});
	});

	it("keeps the id a source declares", () => {
		const bank = new DictLoader({
			key: { type: "essay", stem: "S.", id: "own" },
			text: "---\nid: declared\n---\n\nS.\n\n[essay]\n",
		});
		const exam = parseExam(examText(include("key"), include("text")));
		const ids = (resolveExam(exam, bank).questions as LooseQuestion[]).map(
			(question) => question.id,
		);
		expect(ids).toEqual(["own", "declared"]);
	});

	it("keeps inline questions and the order of the entries", () => {
		const inline = "---\nid: nova\n---\n\nNova questão.\n\n[essay]";
		expect(
			questionIds(examText(include("caju"), inline, include("mata"))),
		).toEqual(["caju", "nova", "mata"]);
	});

	it("fails with IncludeNotFoundError for an id the bank lacks", () => {
		expect(() => resolvedQuestions(examText(include("tundra")))).toThrow(
			IncludeNotFoundError,
		);
	});

	it("fails with ParseError for a text source that is not a question", () => {
		const bank = new DictLoader({ broken: "Only text." });
		expect(() =>
			resolveExam(parseExam(examText(include("broken"))), bank),
		).toThrow(ParseError);
	});

	it("does not change the exam it receives", () => {
		const exam = parseExam(examText(include("cerrado"), includeAll("fruit")));
		const before = structuredClone(exam);
		resolveExam(exam, BANK, { select: first });
		expect(exam).toEqual(before);
	});
});

describe("resolveExam: inheritance", () => {
	const header = "---\nlocale: pt-BR\nauthor: Ana\n---\n\n";

	it("an included question takes locale and author from the exam", () => {
		const [question] = resolvedQuestions(
			header + examText(includeAll("savanna")),
		);
		expect(question).toMatchObject({ locale: "pt-BR", author: "Ana" });
	});

	it("a question keeps its own locale and author", () => {
		const bank = new DictLoader({
			q: { type: "essay", stem: "Q.", locale: "en", author: "Bia" },
		});
		const exam = parseExam(header + examText(include("q")));
		expect(resolveExam(exam, bank).questions[0]).toMatchObject({
			locale: "en",
			author: "Bia",
		});
	});

	it("nothing is added when the exam has no locale", () => {
		const [question] = resolvedQuestions(examText(include("cerrado")));
		expect(question).not.toHaveProperty("locale");
	});
});

describe("resolveExam: include-all", () => {
	it("adds every match, sorted", () => {
		expect(questionIds(examText(includeAll("biome AND NOT draft")))).toEqual([
			"amazonia",
			"cerrado",
			"pantanal",
		]);
	});

	it("matches a Markdown source by its tags", () => {
		expect(questionIds(examText(includeAll("fruit")))).toEqual(["caju"]);
	});

	it("passes the sorted candidates and max to select", () => {
		const calls: [readonly string[], number | undefined][] = [];
		const spy: Select = (candidates, max) => {
			calls.push([candidates, max]);
			return candidates.slice(-1);
		};
		expect(questionIds(examText(includeAll("biome", 2)), spy)).toEqual([
			"pantanal",
		]);
		expect(calls).toEqual([[["amazonia", "cerrado", "mata", "pantanal"], 2]]);
	});

	it("passes an undefined max when the block has none", () => {
		const maxima: (number | undefined)[] = [];
		questionIds(examText(includeAll("fruit")), (candidates, max) => {
			maxima.push(max);
			return candidates;
		});
		expect(maxima).toEqual([undefined]);
	});

	it("skips an explicit include, even a later one", () => {
		const text = examText(
			includeAll("biome AND NOT draft"),
			include("cerrado"),
		);
		expect(questionIds(text)).toEqual(["amazonia", "pantanal", "cerrado"]);
	});

	it("applies max after skipping", () => {
		const text = examText(include("amazonia"), includeAll("biome", 2));
		expect(questionIds(text)).toEqual(["amazonia", "cerrado", "mata"]);
	});

	it("skips a declared inline id", () => {
		const inline = "---\nid: pantanal\n---\n\nOutro Pantanal.\n\n[essay]";
		const warnings: Diagnostic[] = [];
		const questions = resolvedQuestions(
			examText(includeAll("wetland"), inline),
			{ select: first, warnings },
		);
		expect(questions.map((question) => question.id)).toEqual(["pantanal"]);
		expect(warnings.map((warning) => warning.code)).toEqual([
			"empty-include-all",
		]);
	});

	it("a later include-all skips what an earlier one added", () => {
		const text = examText(
			includeAll("forest AND NOT draft"),
			includeAll("biome AND NOT draft"),
		);
		expect(questionIds(text)).toEqual(["amazonia", "cerrado", "pantanal"]);
	});

	it("a complement query reads every id of the bank", () => {
		expect(questionIds(examText(includeAll("NOT biome")))).toEqual(["caju"]);
	});

	it("EXCEPT leaves the listed ids out", () => {
		const text = examText(includeAll("forest EXCEPT mata"));
		expect(questionIds(text)).toEqual(["amazonia"]);
	});

	it("the default select samples max questions of the candidates", () => {
		const everyCandidate = ["amazonia", "cerrado", "mata", "pantanal"];
		const seen = new Set<string | undefined>();
		for (let round = 0; round < 50; round++) {
			const ids = resolveExam(
				parseExam(examText(includeAll("biome", 2))),
				BANK,
			).questions.map((question) => (question as LooseQuestion).id);
			expect(ids).toHaveLength(2);
			expect(new Set(ids).size).toBe(2);
			expect(ids).toEqual(
				everyCandidate.filter((candidate) => ids.includes(candidate)),
			);
			for (const id of ids) {
				seen.add(id);
			}
		}
		expect(seen.size).toBeGreaterThan(2);
	});

	it("the default select keeps every candidate without max", () => {
		const exam = parseExam(examText(includeAll("biome")));
		const ids = resolveExam(exam, BANK).questions.map(
			(question) => (question as LooseQuestion).id,
		);
		expect(ids).toEqual(["amazonia", "cerrado", "mata", "pantanal"]);
	});

	it("a nonstandard query adds nothing and does not fail", () => {
		const text = examText(includeAll("tags ~ savanna"), include("cerrado"));
		expect(questionIds(text)).toEqual(["cerrado"]);
	});

	it("an exam with no includes resolves to its own questions", () => {
		const inline = "===\n\nNova questão.\n\n[essay]";
		const questions = resolvedQuestions(examText(inline));
		expect(questions).toHaveLength(1);
		expect(questions[0]?.id).toBeUndefined();
	});
});

describe("resolveExam: select contract", () => {
	const text = examText(includeAll("biome", 2));

	it("rejects an id that is not a candidate", () => {
		expect(() => questionIds(text, () => ["tundra"])).toThrow(RangeError);
		expect(() => questionIds(text, () => ["tundra"])).toThrow(
			"select() returned ids that are not candidates: ['tundra']",
		);
	});

	it("rejects more than max ids", () => {
		const tooMany: Select = (candidates) => candidates.slice(0, 3);
		expect(() => questionIds(text, tooMany)).toThrow(RangeError);
		expect(() => questionIds(text, tooMany)).toThrow(
			"select() returned 3 ids, but max is 2",
		);
	});

	it("rejects the same id twice", () => {
		const twice: Select = (candidates) => [
			candidates[0] ?? "",
			candidates[0] ?? "",
		];
		expect(() => questionIds(text, twice)).toThrow(RangeError);
		expect(() => questionIds(text, twice)).toThrow(
			"select() returned the same id twice",
		);
	});

	it("accepts fewer than max ids, in any order", () => {
		expect(questionIds(text, () => ["pantanal", "cerrado"])).toEqual([
			"pantanal",
			"cerrado",
		]);
		expect(questionIds(text, () => [])).toEqual([]);
	});
});

describe("resolveExam: empty-include-all warnings", () => {
	function warningsOf(text: string): Diagnostic[] {
		const warnings: Diagnostic[] = [];
		resolvedQuestions(text, { select: first, warnings });
		return warnings;
	}

	it("reports a block that adds nothing", () => {
		const [warning, ...others] = warningsOf(examText(includeAll("tundra")));
		expect(others).toEqual([]);
		expect(warning).toMatchObject({
			code: "empty-include-all",
			severity: "warning",
			message: "the query 'tundra' adds no question to the exam",
			path: ["questions", 0],
		});
	});

	it("reports nothing when every block adds a question", () => {
		expect(warningsOf(examText(includeAll("fruit")))).toEqual([]);
	});

	it("uses the position before resolution", () => {
		const text = examText(
			includeAll("biome AND NOT draft"),
			include("caju"),
			includeAll("fruit"),
			includeAll("tundra"),
		);
		const warnings = warningsOf(text);
		expect(warnings.map((warning) => warning.path)).toEqual([
			["questions", 2],
			["questions", 3],
		]);
	});

	it("reports a nonstandard query as empty", () => {
		const [warning] = warningsOf(examText(includeAll("tags ~ savanna")));
		expect(warning).toMatchObject({
			code: "empty-include-all",
			message: "the query 'tags ~ savanna' adds no question to the exam",
		});
	});

	it("works without a warnings list", () => {
		expect(() => questionIds(examText(includeAll("tundra")))).not.toThrow();
	});
});
