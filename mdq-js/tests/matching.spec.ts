/**
 * `examples/matching/`: the pattern vectors (`exact.yaml`, `inexact.yaml`,
 * `regex.yaml`) and the `includeAll` query language (`query.yaml`).
 * Mirrors `mdq-py/tests/test_exact_comparison.py`,
 * `test_inexact_comparison.py`, `test_regex_table.py` and
 * `test_query_corpus.py`. The header of each file describes its format.
 *
 * The first word of a test name is its group: `exact-short-answer`,
 * `exact-fill-in`, `inexact-short-answer`, `inexact-fill-in`,
 * `letters-applies`, `letters-once`, `regex` and `query`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	isStandardQuery,
	parseQuery,
	QuerySyntaxError,
	type Question,
	scoreResponse,
	type TagIndex,
} from "@mdq";
import { RegexPattern } from "@mdq/models/regex.js";
import { describe, expect, it } from "vitest";
import { MATCHING_DIR, MDQ_ROOT } from "./corpus.js";
import { corpusIt, MATCHING } from "./not-ported.js";
import { casesOf, loadVectors } from "./vectors.js";

type Mode = "fold" | "keep";
const MODES: readonly Mode[] = ["fold", "keep"];

const matchingFile = (name: string): string =>
	join(MATCHING_DIR, `${name}.yaml`);

/** A short answer question whose only `accept` entry is `pattern`. */
function shortAnswerScore(
	pattern: string,
	response: string,
	mode: Mode,
): number {
	const question = {
		type: "short-answer",
		stem: "Qual é a capital do Brasil?",
		accept: [pattern],
		diacritics: mode,
	} satisfies Question;
	return scoreResponse(question, response).score;
}

/** A fill-in question with one short answer blank, `capital`. */
function blankScore(pattern: string, response: string, mode: Mode): number {
	const question = {
		type: "fill-in",
		stem: "A capital do Ceará é [^capital].",
		diacritics: mode,
		blanks: [{ type: "short-answer", id: "capital", accept: [pattern] }],
	} satisfies Question;
	return scoreResponse(question, { capital: response }).score;
}

//
// Exact comparison
//
interface ExactCase {
	readonly name: string;
	readonly pattern: string;
	readonly response: string;
	readonly match: boolean;
}
const EXACT = casesOf<ExactCase>(matchingFile("exact"));

describe("exact literals", () => {
	it("there are exact vectors", () => {
		expect(EXACT.length).toBeGreaterThan(0);
	});

	for (const group of ["exact-short-answer", "exact-fill-in"] as const) {
		const score = group === "exact-fill-in" ? blankScore : shortAnswerScore;
		for (const testCase of EXACT) {
			for (const mode of MODES) {
				corpusIt(MATCHING, `${group}.${testCase.name}-${mode}`, () => {
					expect(
						score(`\`${testCase.pattern}\``, testCase.response, mode),
					).toBe(testCase.match ? 1 : 0);
				});
			}
		}
	}
});

//
// Inexact comparison
//
interface InexactCase {
	readonly name: string;
	readonly pattern: string;
	readonly response: string;
	readonly fold: boolean;
	readonly keep: boolean;
}
const INEXACT = casesOf<InexactCase>(matchingFile("inexact"));

describe("inexact literals", () => {
	it("there are inexact vectors", () => {
		expect(INEXACT.length).toBeGreaterThan(0);
	});

	for (const group of ["inexact-short-answer", "inexact-fill-in"] as const) {
		const score = group === "inexact-fill-in" ? blankScore : shortAnswerScore;
		for (const testCase of INEXACT) {
			for (const mode of MODES) {
				corpusIt(MATCHING, `${group}.${testCase.name}-${mode}`, () => {
					expect(score(testCase.pattern, testCase.response, mode)).toBe(
						testCase[mode] ? 1 : 0,
					);
				});
			}
		}
	}
});

//
// The letters table of docs/references/inexact-tables.json
//
const TABLES = JSON.parse(
	readFileSync(
		join(MDQ_ROOT, "docs", "references", "inexact-tables.json"),
		"utf-8",
	),
) as { letters: Record<string, string> };

/** The entries that one NFKC pass leaves alone. */
const ONCE = Object.entries(TABLES.letters).filter(
	([key]) => key.normalize("NFKC") === key,
);

function codePointId(key: string): string {
	const point = key.codePointAt(0) ?? 0;
	return `U+${point.toString(16).toUpperCase().padStart(4, "0")}`;
}

describe("the letters table", () => {
	it("there are letter entries", () => {
		expect(ONCE.length).toBeGreaterThan(0);
	});

	for (const [key, value] of ONCE) {
		corpusIt(MATCHING, `letters-applies.${codePointId(key)}`, () => {
			expect(shortAnswerScore(key, value, "fold")).toBe(1);
		});
		// The result of a replacement is not replaced again.
		corpusIt(MATCHING, `letters-once.${codePointId(key)}`, () => {
			expect(shortAnswerScore(key, value + value, "fold")).toBe(0);
		});
	}
});

//
// Regex syntax table
//
interface RegexCase {
	readonly name: string;
	readonly pattern: string;
	readonly accept: readonly string[];
	readonly reject: readonly string[];
}
const REGEX = casesOf<RegexCase>(matchingFile("regex"));

describe("regex constructs", () => {
	it("there are regex vectors", () => {
		expect(REGEX.length).toBeGreaterThan(0);
	});

	for (const testCase of REGEX) {
		const vectors: [string, boolean][] = [
			...testCase.accept.map((response): [string, boolean] => [response, true]),
			...testCase.reject.map((response): [string, boolean] => [
				response,
				false,
			]),
		];
		vectors.forEach(([response, expected], index) => {
			corpusIt(MATCHING, `regex.${testCase.name}-${index}`, () => {
				expect(new RegexPattern(testCase.pattern).match(response)).toBe(
					expected,
				);
			});
		});
	}
});

//
// The includeAll query language
//
interface QueryCase {
	readonly name: string;
	readonly query: string;
	readonly standard: boolean;
	readonly matches?: readonly {
		readonly tags: readonly string[];
		readonly id?: string;
		readonly match: boolean;
	}[];
	readonly select?: readonly string[];
}
const QUERY_FILE = loadVectors(matchingFile("query")) as {
	index: { tags: Record<string, string[]>; ids: string[] };
	cases: QueryCase[];
};

/** The tag index of the file, as a `select` receives it. */
const QUERY_INDEX: TagIndex = {
	tagged: (tag) => new Set(QUERY_FILE.index.tags[tag] ?? []),
	ids: () => new Set(QUERY_FILE.index.ids),
};

describe("includeAll queries", () => {
	it("there are query cases", () => {
		expect(QUERY_FILE.cases.length).toBeGreaterThan(0);
	});

	for (const testCase of QUERY_FILE.cases) {
		corpusIt(MATCHING, `query.${testCase.name}`, () => {
			expect(isStandardQuery(testCase.query)).toBe(testCase.standard);
			if (!testCase.standard) {
				expect(() => parseQuery(testCase.query)).toThrow(QuerySyntaxError);
				return;
			}
			const parsed = parseQuery(testCase.query);
			for (const entry of testCase.matches ?? []) {
				expect(parsed.matches(new Set(entry.tags), entry.id ?? "q")).toBe(
					entry.match,
				);
			}
			if (testCase.select !== undefined) {
				expect(parsed.select(QUERY_INDEX)).toEqual(new Set(testCase.select));
			}
		});
	}
});
