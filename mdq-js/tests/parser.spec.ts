/**
 * Tests for `parseQuestionDocument` / `parseQuestion` / `isExam` --
 * `docs/handoffs/01-parser-bracket-lists.md`, cycle 1: the question-document
 * skeleton and the three bracket-list body types (`multiple-choice`,
 * `multiple-selection`, `true-false`).
 *
 * Three layers, per the handoff's testing strategy:
 *  1. Corpus pairs -- every in-scope `.mdq.md` must parse to exactly its
 *     `.yaml` sibling.
 *  2. Properties -- a generator (`tests/arbitraries.ts`) builds bracket-list
 *     source alongside the document it must parse into.
 *  3. Focused edge cases the corpus and properties don't reach.
 */

import { readFileSync } from "node:fs";
import { sep } from "node:path";
import {
	isExam,
	MissingFieldError,
	parseQuestionDocument,
	validateQuestion,
} from "@mdq";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bracketListCaseArb } from "./arbitraries.js";
import {
	loadDocument,
	parsedSibling,
	relativeId,
	VALID_SOURCES,
} from "./corpus.js";

const SEED = 20260921;

//
// 1. Corpus pairs
//

const IN_SCOPE_DIRS = ["multiple-choice", "multiple-selection", "true-false"];

const inScopeSources = VALID_SOURCES.filter((path) =>
	IN_SCOPE_DIRS.some((dir) => path.includes(`${sep}valid${sep}${dir}${sep}`)),
);

/**
 * Pairs the parser is known not to reproduce exactly yet, keyed the same way
 * `relativeId` names them -- mirrors `mdq-py/tests/test_parser.py`'s
 * `NOT_YET_SUPPORTED`. A choice's body is folded to single-line prose the
 * same way preamble/stem text is, so a fenced code block nested in a choice
 * loses its line breaks; see the yaml fixture's own comment.
 */
const NOT_YET_SUPPORTED = new Set([
	"multiple-choice.fenced-code-choice.mdq.md",
]);

describe("corpus pairs found", () => {
	it("has the 14 in-scope bracket-list pairs", () => {
		expect(inScopeSources.length).toBe(14);
	});
});

describe("corpus: parseQuestionDocument matches the paired fixture", () => {
	for (const source of inScopeSources) {
		const name = relativeId(source);
		const run = () => {
			const got = parseQuestionDocument(readFileSync(source, "utf-8"));
			const expected = loadDocument(parsedSibling(source));
			expect(got).toEqual(expected);
		};
		if (NOT_YET_SUPPORTED.has(name)) {
			it.fails(name, run);
		} else {
			it(name, run);
		}
	}
});

describe("corpus: every in-scope parse validates", () => {
	it.each(
		inScopeSources.map((path) => [relativeId(path), path]),
	)("%s", (_name, path) => {
		const document = parseQuestionDocument(readFileSync(path, "utf-8"));
		const result = validateQuestion(document);
		expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
	});
});

//
// 2. Properties
//

describe("bracket-list property: parses to exactly the built document", () => {
	it("holds for multiple-choice, multiple-selection and true-false", () => {
		fc.assert(
			fc.property(bracketListCaseArb, ({ source, expected }) => {
				expect(parseQuestionDocument(source)).toEqual(expected);
			}),
			{ numRuns: 200, seed: SEED },
		);
	});
});

describe("bracket-list property: every parse satisfies validateQuestion", () => {
	it("holds for multiple-choice, multiple-selection and true-false", () => {
		fc.assert(
			fc.property(bracketListCaseArb, ({ source }) => {
				const document = parseQuestionDocument(source);
				const result = validateQuestion(document);
				expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
			}),
			{ numRuns: 200, seed: SEED },
		);
	});
});

//
// 3. Focused edge cases
//

describe("edge cases", () => {
	it("throws MissingFieldError('stem') for an empty document", () => {
		try {
			parseQuestionDocument("");
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingFieldError);
			expect((error as MissingFieldError).field).toBe("stem");
		}
	});

	it("throws MissingFieldError('stem') when frontmatter has no body at all", () => {
		const source = "---\ntitle: Only frontmatter\n---\n";
		try {
			parseQuestionDocument(source);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingFieldError);
			expect((error as MissingFieldError).field).toBe("stem");
		}
	});

	it("throws MissingFieldError('stem') when the bracket list has no preceding stem", () => {
		const source = "* [x] Rio de Janeiro\n* [ ] Berlin\n";
		try {
			parseQuestionDocument(source);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingFieldError);
			expect((error as MissingFieldError).field).toBe("stem");
		}
	});

	it("falls back to multiple-selection when markers are uninferable and type is undeclared", () => {
		// Neither "*"/percent (multiple-choice), "x" (multiple-selection), nor
		// a single letter (true-false, which requires len(v) == 1) -- and no
		// frontmatter `type` to settle it. `_infer_choice_type` (parser.py:1653)
		// falls through every check and defaults to multiple-selection.
		const source =
			"Which of these are valid?\n\n* [ab] First option.\n* [cd] Second option.\n";
		const document = parseQuestionDocument(source) as { type: string };
		expect(document.type).toBe("multiple-selection");
	});

	it("throws MissingFieldError('body') for a body that is neither a bracket list nor a known tag", () => {
		const source =
			"What is the meaning of life?\n\n> Not a bracket list, not a recognized tag.\n";
		try {
			parseQuestionDocument(source);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingFieldError);
			expect((error as MissingFieldError).field).toBe("body");
		}
	});

	it("frontmatter `type` overrides what blank markers would otherwise infer", () => {
		// All-blank markers infer as multiple-selection on their own
		// (generic.md's "no correct choice" rule), but frontmatter `type`
		// wins and the choices come back scored, not judged.
		const source =
			"---\ntype: multiple-choice\n---\n\n" +
			"Which is the capital of Brazil?\n\n" +
			"* [ ] Rio de Janeiro\n* [ ] Brasilia\n";
		const document = parseQuestionDocument(source) as {
			type: string;
			choices: Record<string, unknown>[];
		};
		expect(document.type).toBe("multiple-choice");
		for (const choice of document.choices) {
			expect(choice.score).toBe(0);
			expect(choice.correct).toBeUndefined();
		}
	});

	it("isExam is false for a question document", () => {
		expect(isExam("What is 2 + 2?\n\n* [x] 4\n* [ ] 5\n")).toBe(false);
	});

	it("isExam is true for a document with an H1 title", () => {
		expect(isExam("# Sample Exam\n\nWhat is 2 + 2?\n")).toBe(true);
	});
});
