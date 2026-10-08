/**
 * Tests for the fill-in body: the run of `[^id...]:` blank definitions after
 * the stem -- `docs/handoffs/08-parser-fill-in.md`, batch 1 criteria 2 and 3,
 * batch 2 criterion 4. (Criterion 5, `repr`, is in `tests/text.spec.ts`.)
 *
 * Criterion 1 (every `examples/valid/fill-in/*.mdq.md` parses to its `.yaml`)
 * is already covered by the corpus loop in `tests/parser.spec.ts`; this file
 * does not duplicate it.
 *
 * Every expected value here comes from running the reference directly, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._parser._question import parse_question
 *   print(parse_question('O rio [^rio].\n\n[^rio/short-answer]: Amazonas\n'))
 *   "
 *
 * Reference: `mdq-py/mdq/_parser/_question.py` -- `parse_fill_in_body`,
 * `_add_blank`, `BLANK_RE`, `BLANK_KIND_RE`.
 */

import {
	ForeignChoiceMarkerError,
	ParseError,
	parseQuestionDocument,
	UndefinedBlankError,
} from "@mdq";
import { describe, expect, it } from "vitest";

const STEM = "O rio [^rio] passa por [^cidade] e mede [^km].";
const STEM_TEXT = `${STEM}\n\n`;

/** The `blanks` of the document `STEM` + `body` parses to. */
function blanksOf(body: string): unknown {
	return (parseQuestionDocument(STEM_TEXT + body) as { blanks: unknown })
		.blanks;
}

/** A filler definition for the blanks a test does not care about. */
const CIDADE = "[^cidade/short-answer]: b\n\n";
const KM = "[^km/numeric]: 1\n";

//
// Batch 1, criterion 2: definition forms.
//

describe("batch 1: fill-in definition forms", () => {
	describe("a choice list after [^id]:", () => {
		it("carries score, feedback and comment", () => {
			expect(
				blanksOf(
					"[^rio]:\n* [*] Amazonas\n  > Correto.\n  ! Maior do mundo.\n" +
						"* [ ] Nilo\n  > Africano.\n* [ ] Tietê\n\n" +
						`${CIDADE}[^km/numeric]: 6400\n`,
				),
			).toEqual([
				{
					id: "rio",
					type: "multiple-choice",
					choices: [
						{
							text: "Amazonas",
							score: 1,
							feedback: "Correto.",
							comment: "Maior do mundo.",
						},
						{ text: "Nilo", feedback: "Africano." },
						{ text: "Tietê" },
					],
				},
				{ id: "cidade", type: "short-answer", accept: ["b"] },
				{ id: "km", type: "numeric", answer: 6400, domain: "integer" },
			]);
		});

		it("a percentage value is a fractional score", () => {
			expect(
				blanksOf(
					`${"[^rio]:\n* [*] Amazonas\n* [ ] Nilo\n\n"}[^cidade]:\n* [*] Manaus\n* [50%] Belém\n* [ ] Recife\n\n${KM}`,
				),
			).toEqual([
				{
					id: "rio",
					type: "multiple-choice",
					choices: [{ text: "Amazonas", score: 1 }, { text: "Nilo" }],
				},
				{
					id: "cidade",
					type: "multiple-choice",
					choices: [
						{ text: "Manaus", score: 1 },
						{ text: "Belém", score: 0.5 },
						{ text: "Recife" },
					],
				},
				{ id: "km", type: "numeric", answer: 1, domain: "integer" },
			]);
		});

		it("a letter before the mark is a foreign choice marker", () => {
			// base.md, "Type inference": a choice blank takes the
			// multiple-choice `value` rule; `[a*]` is outside it.
			let error: unknown;
			try {
				blanksOf(
					`[^rio]:\n* [a*] Amazonas\n* [b] Nilo\n\n[^cidade/short-answer]: x\n\n${KM}`,
				);
			} catch (e) {
				error = e;
			}
			expect(error).toBeInstanceOf(ForeignChoiceMarkerError);
			expect((error as ForeignChoiceMarkerError).path).toEqual([
				"blanks",
				0,
				"choices",
				0,
			]);
			expect((error as Error).message).toBe(
				"[a*] is not a multiple-choice choice marker",
			);
		});

		it("the list must start on the line right after the tag", () => {
			expect(() => blanksOf("[^rio]:\n\n* [*] a\n* [ ] b\n")).toThrow(
				"the choice list of [^rio] must start on the line right after its tag, with no blank line in between",
			);
		});
	});

	describe("[^id/numeric]", () => {
		it.each([
			["integer", "42", { answer: 42, domain: "integer" }],
			["negative integer", "-2", { answer: -2, domain: "integer" }],
			[
				"decimal records its places",
				"3.14",
				{ answer: 3.14, domain: "decimal", decimalPlaces: 2 },
			],
			[
				"absolute tolerance",
				"2.5 +- 0.5",
				{
					answer: 2.5,
					domain: "decimal",
					decimalPlaces: 1,
					tolerance: { absolute: 0.5 },
				},
			],
			[
				"relative tolerance",
				"5 +- 10%",
				{
					answer: 5,
					domain: "integer",
					tolerance: { relative: 0.1 },
				},
			],
			["fraction", "1/2", { answer: "1/2", domain: "fraction" }],
		])("%s: %s", (_label, expr, fields) => {
			expect(blanksOf(`[^km/numeric]: ${expr}\n`)).toEqual([
				{ id: "km", type: "numeric", ...(fields as object) },
			]);
		});

		it.each([
			["km", "km"],
			["a slash inside the unit", "km/h"],
			["a non-ASCII unit", "µm"],
			["a degree sign", "°C"],
		])("unit: %s", (_label, unit) => {
			expect(blanksOf(`[^km/numeric(${unit})]: 80\n`)).toEqual([
				{ id: "km", type: "numeric", answer: 80, unit, domain: "integer" },
			]);
		});
	});

	describe("[^id/short-answer]", () => {
		it.each([
			["a plain literal", "Amazonas", "Amazonas"],
			["a backtick-enclosed answer", "`Amazonas`", "`Amazonas`"],
			["a regex keeps its delimiters", "/Amaz.n/", "/Amaz.n/"],
			["an empty regex", "//", "//"],
			["a regex with flags", "/Amaz/i", "/Amaz/i"],
			["a single slash", "/", "/"],
			["an unterminated regex", "/a", "/a"],
			["surrounding spaces are stripped", "  Amazonas  ", "Amazonas"],
		])("%s goes to accept", (_label, text, expected) => {
			expect(blanksOf(`[^rio/short-answer]: ${text}\n`)).toEqual([
				{ id: "rio", type: "short-answer", accept: [expected] },
			]);
		});

		it("an inline pattern on an accept or reject tag is that list", () => {
			expect(
				blanksOf(
					"[^rio/short-answer/accept]: Amazonas\n\n[^rio/short-answer/reject]: Nilo\n",
				),
			).toEqual([
				{
					id: "rio",
					type: "short-answer",
					accept: ["Amazonas"],
					reject: ["Nilo"],
				},
			]);
		});

		it("an empty tag leaves the blank without accept", () => {
			expect(blanksOf("[^rio/short-answer]:\n")).toEqual([
				{ id: "rio", type: "short-answer" },
			]);
		});
	});

	describe("[^id/short-answer/accept] and /reject lists", () => {
		it("accept and reject lists with feedback", () => {
			expect(
				blanksOf(
					"[^rio/short-answer/accept]:\n* Amazonas\n* `Solimões`\n  > Trecho superior.\n\n" +
						"[^rio/short-answer/reject]:\n* Nilo\n  > Africano.\n* *\n  > Não é rio.\n\n" +
						`${CIDADE}${KM}`,
				),
			).toEqual([
				{
					id: "rio",
					type: "short-answer",
					accept: [
						"Amazonas",
						{ pattern: "`Solimões`", feedback: "Trecho superior." },
					],
					reject: [
						{ pattern: "Nilo", feedback: "Africano." },
						{ pattern: "*", feedback: "Não é rio." },
					],
				},
				{ id: "cidade", type: "short-answer", accept: ["b"] },
				{ id: "km", type: "numeric", answer: 1, domain: "integer" },
			]);
		});
	});

	describe("definitions of one slug merge into one blank", () => {
		it("reject then accept, separated by other blanks", () => {
			expect(
				blanksOf(
					`[^rio/short-answer/reject]:\n* Nilo\n\n${CIDADE}${KM}\n[^rio/short-answer/accept]:\n* Amazonas\n`,
				),
			).toEqual([
				{
					id: "rio",
					type: "short-answer",
					reject: ["Nilo"],
					accept: ["Amazonas"],
				},
				{ id: "cidade", type: "short-answer", accept: ["b"] },
				{ id: "km", type: "numeric", answer: 1, domain: "integer" },
			]);
		});

		it("an inline accept merges with a later reject list", () => {
			expect(
				blanksOf(
					`[^rio/short-answer]: /A.*/\n\n${CIDADE}${KM}\n[^rio/short-answer/reject]:\n* Nilo\n`,
				),
			).toEqual([
				{
					id: "rio",
					type: "short-answer",
					accept: ["/A.*/"],
					reject: ["Nilo"],
				},
				{ id: "cidade", type: "short-answer", accept: ["b"] },
				{ id: "km", type: "numeric", answer: 1, domain: "integer" },
			]);
		});

		it("the blank keeps the position where its slug is first seen", () => {
			expect(
				blanksOf(
					`${CIDADE}[^rio/short-answer/reject]:\n* Nilo\n\n${KM}\n[^rio/short-answer]: x\n`,
				),
			).toEqual([
				{ id: "cidade", type: "short-answer", accept: ["b"] },
				{
					id: "rio",
					type: "short-answer",
					reject: ["Nilo"],
					accept: ["x"],
				},
				{ id: "km", type: "numeric", answer: 1, domain: "integer" },
			]);
		});
	});

	describe("the body stops where the definitions stop", () => {
		it("a following paragraph is the epilogue", () => {
			expect(
				parseQuestionDocument(
					`${STEM_TEXT}[^rio/short-answer]: a\n\n[^km/numeric]: 1\n\nEpílogo.\n`,
				),
			).toEqual({
				stem: STEM,
				type: "fill-in",
				blanks: [
					{ id: "rio", type: "short-answer", accept: ["a"] },
					{ id: "km", type: "numeric", answer: 1, domain: "integer" },
				],
				epilogue: "Epílogo.",
			});
		});

		it("a definition on the next line joins the previous paragraph", () => {
			expect(blanksOf("[^rio/short-answer]: a\n[^km/numeric]: 1\n")).toEqual([
				{ id: "rio", type: "short-answer", accept: ["a [^km/numeric]: 1"] },
			]);
		});
	});
});

//
// Batch 1, criterion 3: frontmatter.
//

describe("batch 1: fill-in frontmatter", () => {
	const body = `${STEM_TEXT}[^rio/short-answer]: a\n\n[^km/numeric]: 1\n`;
	const blanks = [
		{ id: "rio", type: "short-answer", accept: ["a"] },
		{ id: "km", type: "numeric", answer: 1, domain: "integer" },
	];

	it("shuffle, grading and diacritics are copied", () => {
		expect(
			parseQuestionDocument(
				`---\nshuffle: false\ngrading: partial\ndiacritics: keep\n---\n\n${body}`,
			),
		).toEqual({
			stem: STEM,
			type: "fill-in",
			shuffle: false,
			grading: "partial",
			diacritics: "keep",
			blanks,
		});
	});

	it("shuffle true alone", () => {
		expect(parseQuestionDocument(`---\nshuffle: true\n---\n\n${body}`)).toEqual(
			{
				stem: STEM,
				type: "fill-in",
				shuffle: true,
				blanks,
			},
		);
	});

	it("grading alone", () => {
		expect(
			parseQuestionDocument(`---\ngrading: all-or-nothing\n---\n\n${body}`),
		).toEqual({
			stem: STEM,
			type: "fill-in",
			grading: "all-or-nothing",
			blanks,
		});
	});

	it("diacritics alone", () => {
		expect(
			parseQuestionDocument(`---\ndiacritics: ignore\n---\n\n${body}`),
		).toEqual({
			stem: STEM,
			type: "fill-in",
			diacritics: "ignore",
			blanks,
		});
	});

	it("unmatched is copied", () => {
		expect(
			parseQuestionDocument(`---\nunmatched: manual\n---\n\n${body}`),
		).toEqual({
			stem: STEM,
			type: "fill-in",
			unmatched: "manual",
			blanks,
		});
	});

	describe("preAccept/preReject map blank ids to pattern lists", () => {
		it("each list lands on its blank", () => {
			expect(
				parseQuestionDocument(
					`---\npreAccept:\n  rio: ["/^[A-Z]/"]\npreReject:\n  rio:\n    - pattern: /\\d/\n      feedback: No digits.\n---\n\n${body}`,
				),
			).toEqual({
				stem: STEM,
				type: "fill-in",
				blanks: [
					{
						id: "rio",
						type: "short-answer",
						accept: ["a"],
						preAccept: ["/^[A-Z]/"],
						preReject: [{ pattern: "/\\d/", feedback: "No digits." }],
					},
					{ id: "km", type: "numeric", answer: 1, domain: "integer" },
				],
			});
		});

		it("a key that is not a blank is an UndefinedBlankError", () => {
			let error: unknown;
			try {
				parseQuestionDocument(
					`---\npreReject:\n  foo: ["/x/"]\n---\n\n${body}`,
				);
			} catch (e) {
				error = e;
			}
			expect(error).toBeInstanceOf(UndefinedBlankError);
			expect((error as UndefinedBlankError).code).toBe("undefined-blank");
			expect((error as UndefinedBlankError).path).toEqual(["preReject", "foo"]);
			expect((error as Error).message).toBe(
				"preReject has a key 'foo' but no blank with that id is defined",
			);
		});

		it.each([
			[
				"a map whose entry is not a list",
				`---\npreAccept:\n  rio: /x/\n---\n\n${body}`,
				"frontmatter 'preAccept' entry 'rio' must be a list of patterns",
			],
			[
				"a list instead of a map",
				`---\npreAccept: ["/x/"]\n---\n\n${body}`,
				"frontmatter 'preAccept' of a fill-in question must map blank ids to pattern lists",
			],
		])("%s is a ParseError", (_label, source, message) => {
			expect(() => parseQuestionDocument(source)).toThrow(ParseError);
			expect(() => parseQuestionDocument(source)).toThrow(message);
		});
	});
});

//
// Batch 2, criterion 4: error paths.
//

describe("batch 2: fill-in errors", () => {
	function expectParseError(body: string, message: string): void {
		let error: unknown;
		try {
			parseQuestionDocument(STEM_TEXT + body);
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(ParseError);
		expect((error as Error).constructor).toBe(ParseError);
		expect((error as Error).message).toBe(message);
	}

	describe("an unknown kind suffix", () => {
		it.each([
			["an unknown kind", "[^rio/foo]: x", "[^rio/foo]: x"],
			[
				"a unit on short-answer",
				"[^rio/short-answer(km)]: x",
				"[^rio/short-answer(km)]: x",
			],
			[
				"a variant on numeric",
				"[^rio/numeric/accept]: x",
				"[^rio/numeric/accept]: x",
			],
			[
				"an unknown variant on numeric",
				"[^rio/numeric/extra]: 1",
				"[^rio/numeric/extra]: 1",
			],
			[
				"an unknown short-answer variant",
				"[^rio/short-answer/foo]:\n* a",
				"[^rio/short-answer/foo]:",
			],
			["an empty numeric unit", "[^rio/numeric()]: 1", "[^rio/numeric()]: 1"],
		])("%s", (_label, definition, quoted) => {
			expectParseError(
				`${definition}\n`,
				`unrecognized blank definition: '${quoted}'`,
			);
		});

		it("the message quotes the definition text with Python repr", () => {
			expectParseError(
				"[^rio/fo'o]: x\n",
				`unrecognized blank definition: "[^rio/fo'o]: x"`,
			);
			expectParseError(
				'[^rio/fo"o]: x\n',
				`unrecognized blank definition: '[^rio/fo"o]: x'`,
			);
			expectParseError(
				"[^rio/foo\"'bar]: x\n",
				`unrecognized blank definition: '[^rio/foo"\\'bar]: x'`,
			);
			expectParseError(
				"[^rio/fo\\o]: x\n",
				"unrecognized blank definition: '[^rio/fo\\\\o]: x'",
			);
			expectParseError(
				"[^rio/foo\tbar]: x\n",
				"unrecognized blank definition: '[^rio/foo\\tbar]: x'",
			);
			expectParseError(
				"[^rio/fooé😀]: x\n",
				"unrecognized blank definition: '[^rio/fooé😀]: x'",
			);
		});

		it("a soft line break in the paragraph is one space in the message", () => {
			expectParseError(
				"[^rio/foo]: x\nsegunda linha\n\n[^km/short-answer]: y\n",
				"unrecognized blank definition: '[^rio/foo]: x segunda linha'",
			);
		});
	});

	describe("[^id]: with neither text nor a list", () => {
		it("nothing after the tag", () => {
			expectParseError("[^rio]:\n", "unrecognized blank definition: '[^rio]:'");
		});

		it("inline text without a list", () => {
			expectParseError(
				"[^rio]: texto\n",
				"unrecognized blank definition: '[^rio]: texto'",
			);
		});

		it("a paragraph instead of a list", () => {
			expectParseError(
				"[^rio]:\n\nO texto.\n",
				"unrecognized blank definition: '[^rio]:'",
			);
		});
	});

	describe("a reject definition with no pattern", () => {
		it.each([
			["nothing after it", "[^rio/short-answer/reject]:\n"],
			[
				"a paragraph after a blank line",
				"[^rio/short-answer/reject]:\n\nParagraph.\n",
			],
			[
				"a code block after a blank line",
				"[^rio/short-answer/reject]:\n\n```\ncode\n```\n",
			],
			["a list after a blank line", "[^rio/short-answer/reject]:\n\n* Nilo\n"],
		])("%s", (_label, body) => {
			expectParseError(body, "a [short-answer/reject] block has no pattern");
		});
	});

	describe("one slug defined as two kinds", () => {
		it.each([
			[
				"short-answer then numeric",
				"[^rio/short-answer]: a\n\n[^rio/numeric]: 1\n",
				"blank 'rio' is defined both as short-answer and as numeric",
			],
			[
				"numeric then short-answer",
				"[^rio/numeric]: 1\n\n[^rio/short-answer]: a\n",
				"blank 'rio' is defined both as numeric and as short-answer",
			],
			[
				"choice list then numeric",
				"[^rio]:\n* [*] a\n\n[^rio/numeric]: 1\n",
				"blank 'rio' is defined both as multiple-choice and as numeric",
			],
		])("%s", (_label, body, message) => {
			expectParseError(body, message);
		});
	});

	describe("a repeated numeric or choice blank", () => {
		it("two numeric definitions", () => {
			expectParseError(
				"[^rio/numeric]: 1\n\n[^rio/numeric]: 2\n",
				"repeated definition of blank 'rio'",
			);
		});

		it("two choice lists", () => {
			expectParseError(
				"[^rio]:\n* [*] a\n\n[^rio]:\n* [*] b\n",
				"repeated definition of blank 'rio'",
			);
		});
	});

	describe("a repeated accept or reject definition of a short-answer blank", () => {
		it.each([
			[
				"accept",
				"[^rio/short-answer/accept]:\n* a\n\n[^rio/short-answer/accept]:\n* b\n",
			],
			[
				"reject",
				"[^rio/short-answer/reject]:\n* a\n\n[^rio/short-answer/reject]:\n* b\n",
			],
			["accept", "[^rio/short-answer]: a\n\n[^rio/short-answer]: b\n"],
			[
				"accept",
				"[^rio/short-answer]: a\n\n[^rio/short-answer/accept]:\n* b\n",
			],
		])("%s", (role, body) => {
			expectParseError(body, `repeated [^rio/short-answer] ${role} definition`);
		});
	});

	describe("errors of the reused numeric parser", () => {
		it("a malformed numeric answer", () => {
			expectParseError(
				"[^rio/numeric]: abc\n",
				"malformed numeric body: 'abc'",
			);
		});

		it("a number with an exponent", () => {
			expectParseError(
				"[^km/numeric(km)]: 6.4e3\n",
				"malformed numeric body: '6.4e3'",
			);
		});
	});
});
