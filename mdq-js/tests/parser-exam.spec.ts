/**
 * Tests for exam documents, batch 1: title, frontmatter, block splitting and
 * instructions -- `docs/handoffs/09-parser-exam.md`, batch 1 criteria 2 and 3.
 * (Criterion 1, the move of the question parser to `parser/question.ts`, is a
 * pure refactor: the existing suite covers it and needs no new test.)
 *
 * Skipped on purpose: non-string `id`/`include` values and `start`/`duration`
 * (rules being changed; batch 2), inheritance and entries (batch 3).
 *
 * Every expected value comes from running the reference, e.g.:
 *
 *   cd mdq-py && uv run python -c "
 *   from mdq._parser._exam import parse_exam
 *   print(parse_exam('# [amazonia] Bacia Amazônica\n'))
 *   "
 *
 * Reference: `mdq-py/mdq/_parser/_exam.py` -- `parse_exam`,
 * `_split_exam_blocks`, `_looks_like_frontmatter`, `_clean_block`.
 */

import { MissingFieldError, ParseError, YamlSyntaxError } from "@mdq";
import { describe, expect, it } from "vitest";
import { parseExamDocument } from "../src/parser/index.js";

/** The `field` of the `MissingFieldError` that `source` raises. */
function missingField(source: string): string | undefined {
	try {
		parseExamDocument(source);
	} catch (error) {
		return (error as MissingFieldError).field;
	}
	return undefined;
}

describe("batch 1: exam title", () => {
	it("the H1 gives the title", () => {
		expect(parseExamDocument("# Prova de Geografia\n")).toEqual({
			type: "exam",
			title: "Prova de Geografia",
			questions: [],
		});
	});

	it("a [slug] prefix in the H1 gives the id", () => {
		expect(parseExamDocument("# [amazonia] Bacia Amazônica\n")).toEqual({
			type: "exam",
			id: "amazonia",
			title: "Bacia Amazônica",
			questions: [],
		});
	});

	it("an H1 with only a slug has an id and no title", () => {
		expect(parseExamDocument("# [amazonia]\n")).toEqual({
			type: "exam",
			id: "amazonia",
			questions: [],
		});
	});

	it("a tab after # and trailing blanks are dropped", () => {
		expect(parseExamDocument("#\tBacia do Prata  \t\n")).toEqual({
			type: "exam",
			title: "Bacia do Prata",
			questions: [],
		});
	});

	it("the first H1 wins", () => {
		expect(parseExamDocument("# Primeira\n\n# Segunda\n")).toEqual({
			type: "exam",
			title: "Primeira",
			instructions: "# Segunda",
			questions: [],
		});
	});

	it("an H1 line inside a fenced code block is skipped", () => {
		expect(
			parseExamDocument("```text\n# Falso título\n```\n\n# Título real\n"),
		).toEqual({
			type: "exam",
			title: "Título real",
			questions: [],
		});
	});

	it("an H1 line inside an indented code block is skipped", () => {
		expect(
			parseExamDocument("Antes.\n\n    # Falso título\n\n# Título real\n"),
		).toEqual({
			type: "exam",
			title: "Título real",
			questions: [],
		});
	});

	it("the H1 may follow instructions text", () => {
		expect(parseExamDocument("Texto solto.\n\n# Título\n")).toEqual({
			type: "exam",
			title: "Título",
			questions: [],
		});
	});

	it("the frontmatter wins over the H1 for id and title", () => {
		expect(
			parseExamDocument(
				"---\nid: from-front\ntitle: Front\n---\n\n# [from-h1] H1 Title\n",
			),
		).toEqual({
			type: "exam",
			id: "from-front",
			title: "Front",
			questions: [],
		});
	});

	it("a frontmatter id keeps a slug-less H1 title", () => {
		expect(parseExamDocument("---\nid: bioma\n---\n\n# Cerrado\n")).toEqual({
			type: "exam",
			title: "Cerrado",
			id: "bioma",
			questions: [],
		});
	});

	it("frontmatter title wins even when the H1 has a slug", () => {
		expect(
			parseExamDocument("---\ntitle: Frontmatter\n---\n\n# [h1] Cabeçalho\n"),
		).toEqual({
			type: "exam",
			id: "h1",
			title: "Frontmatter",
			questions: [],
		});
	});

	it("no H1 at all", () => {
		const source = "Só texto.\n\n===\n\nExplique.\n\n[essay]\n";
		expect(() => parseExamDocument(source)).toThrow(MissingFieldError);
		expect(missingField(source)).toBe("title");
	});

	it("an H1 only inside a code block", () => {
		const source = "```text\n# Falso título\n```\n";
		expect(() => parseExamDocument(source)).toThrow(MissingFieldError);
		expect(missingField(source)).toBe("title");
	});

	it("only frontmatter", () => {
		const source = "---\ncourse: GEO101\n---\n\nTexto.\n";
		expect(() => parseExamDocument(source)).toThrow(MissingFieldError);
		expect(missingField(source)).toBe("title");
	});

	it("an empty document", () => {
		const source = "";
		expect(() => parseExamDocument(source)).toThrow(MissingFieldError);
		expect(missingField(source)).toBe("title");
	});

	it("a setext-less H2", () => {
		const source = "## Prova\n";
		expect(() => parseExamDocument(source)).toThrow(MissingFieldError);
		expect(missingField(source)).toBe("title");
	});
});

describe("batch 1: exam frontmatter", () => {
	it("every passthrough key is copied", () => {
		expect(
			parseExamDocument(
				"---\nid: cerrado\ntitle: Cerrado\nuuid: 3f2b8c1e-5a7d-4e9f-8b6a-1c2d3e4f5a6b\ncourse: GEO101\ndescription: Bioma brasileiro.\nauthor: Alberto Santos-Dumont\nlocale: pt-BR\nmeta:\n  banca: A\n  ano: 2026\npenalty: 0.25\ngrading: {mode: sum}\n---\n\n# Prova\n",
			),
		).toEqual({
			type: "exam",
			title: "Cerrado",
			id: "cerrado",
			uuid: "3f2b8c1e-5a7d-4e9f-8b6a-1c2d3e4f5a6b",
			course: "GEO101",
			description: "Bioma brasileiro.",
			author: "Alberto Santos-Dumont",
			locale: "pt-BR",
			meta: {
				banca: "A",
				ano: 2026,
			},
			penalty: 0.25,
			grading: {
				mode: "sum",
			},
			questions: [],
		});
	});

	it("a key that is present with null is absent (base.md, 'Frontmatter')", () => {
		expect(
			parseExamDocument(
				"---\ncourse:\ndescription:\nlocale:\nmeta:\ntags:\n---\n\n# Prova\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [],
		});
	});

	it("a null title is kept: it stands for the placeholder H1", () => {
		expect(parseExamDocument("---\ntitle:\n---\n\n# Prova\n")).toEqual({
			type: "exam",
			title: null,
			questions: [],
		});
	});

	it("penalty zero and empty strings are copied", () => {
		expect(
			parseExamDocument("---\npenalty: 0\ncourse: ''\n---\n\n# Prova\n"),
		).toEqual({
			type: "exam",
			title: "Prova",
			course: "",
			penalty: 0,
			questions: [],
		});
	});

	it("tags as a list", () => {
		expect(
			parseExamDocument(
				"---\ntags: [Física Quântica, evolução]\n---\n\n# Prova\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			tags: ["Física Quântica", "evolução"],
			questions: [],
		});
	});

	it("tags as a comma separated string", () => {
		expect(
			parseExamDocument("---\ntags: darwin, clima\n---\n\n# Prova\n"),
		).toEqual({
			type: "exam",
			title: "Prova",
			tags: ["darwin", "clima"],
			questions: [],
		});
	});

	it("tags as a block list", () => {
		expect(
			parseExamDocument(
				"---\ntags:\n  - amazonia\n  - cerrado\n---\n\n# Prova\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			tags: ["amazonia", "cerrado"],
			questions: [],
		});
	});

	it("unknown frontmatter keys are dropped", () => {
		expect(parseExamDocument("---\nsemestre: 2\n---\n\n# Prova\n")).toEqual({
			type: "exam",
			title: "Prova",
			questions: [],
		});
	});

	it("frontmatter type is not copied (type is always exam)", () => {
		expect(parseExamDocument("---\ntype: essay\n---\n\n# Prova\n")).toEqual({
			type: "exam",
			title: "Prova",
			questions: [],
		});
	});

	it("the frontmatter after leading blank lines", () => {
		expect(
			parseExamDocument("\n---\ncourse: GEO101\n---\n\n# Prova\n"),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [],
		});
	});

	it("questions is an empty list with no block", () => {
		expect(parseExamDocument("# Prova\n")).toEqual({
			type: "exam",
			title: "Prova",
			questions: [],
		});
	});
});

describe("batch 1: exam blocks", () => {
	it("a === block after the title", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nExplique a deriva continental.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					stem: "Explique a deriva continental.",
					type: "essay",
				},
			],
		});
	});

	it("=== right after the title line is a separator (start of the text)", () => {
		expect(parseExamDocument("# Exam\n===\n\nQ\n\n[essay]\n")).toEqual({
			type: "exam",
			title: "Exam",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("=== without a blank line before it is not a separator", () => {
		expect(
			parseExamDocument("# Exam\n\nJudge this\n===\n\nmore text\n"),
		).toEqual({
			type: "exam",
			title: "Exam",
			instructions: "Judge this\n===\n\nmore text",
			questions: [],
		});
	});

	it("=== with trailing Unicode whitespace is not a separator", () => {
		expect(parseExamDocument("# Prova\n\n===\u3000\n\nQ\n\n[essay]\n")).toEqual(
			{
				type: "exam",
				title: "Prova",
				instructions: "===\u3000\n\nQ\n\n[essay]",
				questions: [],
			},
		);
	});

	it("=== indented is not a separator", () => {
		expect(parseExamDocument("# Prova\n\n ===\n\ntexto\n")).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "===\n\ntexto",
			questions: [],
		});
	});

	it("==== is not a separator", () => {
		expect(parseExamDocument("# Prova\n\n====\n\ntexto\n")).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "====\n\ntexto",
			questions: [],
		});
	});

	it.each([
		["CRLF", "\r\n"],
		["CR", "\r"],
	])("%s line ends parse like LF", (_label, eol) => {
		const lines = [
			"---",
			"id: prova",
			"---",
			"",
			"# Prova",
			"",
			"Leia com atenção.",
			"",
			"===",
			"",
			"---",
			"id: q1",
			"---",
			"",
			"Um.",
			"",
			"[essay]",
			"",
			"===",
			"",
			"Dois.",
			"",
			"* [*] A",
			"* [ ] B",
			"",
		];
		expect(parseExamDocument(lines.join(eol))).toEqual(
			parseExamDocument(lines.join("\n")),
		);
	});

	it("consecutive === blocks", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nUm.\n\n[essay]\n\n===\n\nDois.\n\n[essay]\n\n===\n\nTrês.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					stem: "Um.",
					type: "essay",
				},
				{
					stem: "Dois.",
					type: "essay",
				},
				{
					stem: "Três.",
					type: "essay",
				},
			],
		});
	});

	it("a bare --- as the first fence opens a block", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n---\ntype: essay\nid: q1\n---\n\nDescreva o El Niño.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					id: "q1",
					stem: "Descreva o El Niño.",
					type: "essay",
				},
			],
		});
	});

	it("a bare --- fence opens a block after arbitrary instructions", () => {
		expect(
			parseExamDocument(
				"# Prova\n\nLeia com atenção.\n\nUse caneta azul.\n\n---\nid: q1\n---\n\nDescreva.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "Leia com atenção.\n\nUse caneta azul.",
			questions: [
				{
					id: "q1",
					stem: "Descreva.",
					type: "essay",
				},
			],
		});
	});

	it("two bare-fence essays with bodies chain through epilogue text", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n---\nid: a\n---\n\nDescreva a fotossíntese.\n\n[essay]\n\nRubrica livre.\n\n---\nid: b\n---\n\nDescreva a respiração.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					id: "a",
					stem: "Descreva a fotossíntese.",
					type: "essay",
					epilogue: "Rubrica livre.",
				},
				{
					id: "b",
					stem: "Descreva a respiração.",
					type: "essay",
				},
			],
		});
	});

	it("a --- right after === is the own frontmatter of that block", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\n---\nid: q1\n---\n\nDescreva a fotossíntese.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					id: "q1",
					stem: "Descreva a fotossíntese.",
					type: "essay",
				},
			],
		});
	});

	it("own frontmatter is kept even with more blank lines after ===", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\n\n\n---\nid: q1\n---\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					id: "q1",
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("a bare --- in the preamble is a thematic break, not a fence", () => {
		expect(
			parseExamDocument(
				"# Sample Exam\n\n===\n\nSome background text.\n\n---\n\nMore background, after a thematic break.\n\nWhat is 2 + 2?\n\n[short-answer]: 4\n\n---\ntype: essay\n---\n\nDescribe the water cycle.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Sample Exam",
			questions: [
				{
					preamble:
						"Some background text.\n\n---\n\nMore background, after a thematic break.",
					stem: "What is 2 + 2?",
					accept: ["4"],
					type: "short-answer",
				},
				{
					stem: "Describe the water cycle.",
					type: "essay",
				},
			],
		});
	});

	it("a colon-bearing preamble line after --- is not frontmatter", () => {
		expect(
			parseExamDocument(
				"# Sample Exam\n\n===\n\nConsidere o processo abaixo.\n\n---\n\nAtenção: a resposta deve ser justificada.\n\nExplique a seleção natural.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Sample Exam",
			questions: [
				{
					preamble:
						"Considere o processo abaixo.\n\n---\n\nAtenção: a resposta deve ser justificada.",
					stem: "Explique a seleção natural.",
					type: "essay",
				},
			],
		});
	});

	it("=== then own frontmatter then a second === block", () => {
		expect(
			parseExamDocument(
				"# Prova de Biologia\n\nLeia com atenção.\n\n===\n\nConsidere o processo abaixo.\n\n---\n\nAtenção: a resposta deve ser justificada.\n\nExplique a seleção natural.\n\n[essay]\n\n===\n\n---\ntype: essay\nid: q2\n---\n\nDescreva a fotossíntese.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova de Biologia",
			instructions: "Leia com atenção.",
			questions: [
				{
					preamble:
						"Considere o processo abaixo.\n\n---\n\nAtenção: a resposta deve ser justificada.",
					stem: "Explique a seleção natural.",
					type: "essay",
				},
				{
					id: "q2",
					stem: "Descreva a fotossíntese.",
					type: "essay",
				},
			],
		});
	});

	it("a bracket item counts as a body: the next bare fence opens a block", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nQual é a capital do Brasil?\n\n* [ ] Lisboa\n* [*] Brasília\n\n---\nid: q2\n---\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					stem: "Qual é a capital do Brasil?",
					choices: [
						{
							text: "Lisboa",
						},
						{
							text: "Brasília",
							score: 1,
						},
					],
					type: "multiple-choice",
				},
				{
					id: "q2",
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("a body tag with text counts as a body", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nQuantos estados?\n\n[numeric]: 26\n\n---\nid: q2\n---\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					stem: "Quantos estados?",
					answer: 26,
					domain: "integer",
					type: "numeric",
				},
				{
					id: "q2",
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("a fence closed by an empty frontmatter", () => {
		expect(parseExamDocument("# Prova\n\n---\n---\n\nQ\n\n[essay]\n")).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("a fence with a mapping enclosing a comment only", () => {
		expect(
			parseExamDocument("# Prova\n\n---\n# comentário\n---\n\nQ\n\n[essay]\n"),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					comment: "comentário",
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it.each([
		["the exam frontmatter", "---\nid: a\nid: b\n---\n\n# Prova\n"],
		[
			"a question block",
			"# Prova\n\n===\n\n---\nid: a\nid: b\n---\n\nQ\n\n[essay]\n",
		],
		["an include block", "# Prova\n\n---\ninclude: a\ninclude: b\n---\n"],
	])("a repeated YAML key in %s is a yaml-syntax-error", (_label, source) => {
		let error: unknown;
		try {
			parseExamDocument(source);
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(YamlSyntaxError);
		expect((error as YamlSyntaxError).code).toBe("yaml-syntax-error");
	});

	it("a block with a repeated key still counts as a block", () => {
		// The splitter does not read the YAML: a `---` pair in block position
		// is a block, and the loader reports the repeated key.
		expect(() =>
			parseExamDocument(
				"# Prova\n\n===\n\nQ\n\n[essay]\n\n---\nid: a\nid: b\n---\n\nR\n\n[essay]\n",
			),
		).toThrow(YamlSyntaxError);
	});

	it("a non-mapping between two --- is not a fence (preamble stays)", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nAntes.\n\n---\n\nsó um texto solto\n\n---\n\nDescreva.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					preamble: "Antes.\n\n---\n\nsó um texto solto\n\n---",
					stem: "Descreva.",
					type: "essay",
				},
			],
		});
	});

	it("a list between two --- is not a fence", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nAntes.\n\n---\n\n- a\n- b\n\n---\n\nDescreva.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					preamble: "Antes.\n\n---\n\n- a\n- b\n\n---",
					stem: "Descreva.",
					type: "essay",
				},
			],
		});
	});

	it("invalid YAML between two --- is not a fence", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nAntes.\n\n---\n\n: [\n\n---\n\nDescreva.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					preamble: "Antes.\n\n---\n\n: [\n\n---",
					stem: "Descreva.",
					type: "essay",
				},
			],
		});
	});

	it("*** and ___ are thematic breaks allowed in an epilogue", () => {
		expect(
			parseExamDocument(
				"# Exam\n\n===\n\nExplique.\n\n[essay]\n\n***\n\nRubrica.\n",
			),
		).toEqual({
			type: "exam",
			title: "Exam",
			questions: [
				{
					stem: "Explique.",
					type: "essay",
					epilogue: "***\n\nRubrica.",
				},
			],
		});
	});

	it("___ thematic break in an epilogue", () => {
		expect(
			parseExamDocument(
				"# Exam\n\n===\n\nExplique.\n\n[essay]\n\n___\n\nRubrica.\n",
			),
		).toEqual({
			type: "exam",
			title: "Exam",
			questions: [
				{
					stem: "Explique.",
					type: "essay",
					epilogue: "___\n\nRubrica.",
				},
			],
		});
	});

	it("--- without a blank line before it never opens a block", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nTexto\n---\nid: x\n---\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					preamble: "Texto\n\nid: x",
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("--- with trailing blanks still counts as a fence", () => {
		expect(
			parseExamDocument("# Prova\n\n---  \nid: a\n---\t\n\nQ\n\n[essay]\n"),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					preamble: "---  \n\nid: a",
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("an epilogue --- thematic break raises with the 1-based line number", () => {
		const source = "# Exam\n\n===\n\nExplique.\n\n[essay]\n\n---\n\nRubrica.\n";
		expect(() => parseExamDocument(source)).toThrow(ParseError);
		expect(() => parseExamDocument(source)).toThrow(
			"line 8: a question's epilogue cannot use '---' as a thematic break inside an exam; use '***' or '___'",
		);
	});

	it("the line number counts the frontmatter and the title lines", () => {
		const source =
			"---\ncourse: X\n---\n\n# Exam\n\n===\n\nExplique.\n\n[essay]\n\n---\n\nRubrica.\n";
		expect(() => parseExamDocument(source)).toThrow(ParseError);
		expect(() => parseExamDocument(source)).toThrow(
			"line 8: a question's epilogue cannot use '---' as a thematic break inside an exam; use '***' or '___'",
		);
	});

	it("a bracket item body followed by a --- that opens nothing", () => {
		const source =
			"# Exam\n\n===\n\nQual?\n\n* [ ] Sim\n* [*] Não\n\n---\n\nRubrica.\n";
		expect(() => parseExamDocument(source)).toThrow(ParseError);
		expect(() => parseExamDocument(source)).toThrow(
			"line 9: a question's epilogue cannot use '---' as a thematic break inside an exam; use '***' or '___'",
		);
	});

	it("a --- pair after the body is a block even when its text is not a mapping", () => {
		// exam.md, "Questions": a `---` pair in block position opens a block
		// whatever it encloses. A scalar is not a mapping, so the block has
		// no frontmatter and, with no body either, no stem.
		const source =
			"# Exam\n\n===\n\nQual?\n\n[essay]\n\n---\n\ntexto solto\n\n---\n";
		let error: unknown;
		try {
			parseExamDocument(source);
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(MissingFieldError);
		expect((error as MissingFieldError).field).toBe("stem");
	});

	it("a --- pair after the body with broken YAML is a yaml-syntax-error", () => {
		const source = "# Exam\n\n===\n\nQual?\n\n[essay]\n\n---\nid: [\n---\n";
		let error: unknown;
		try {
			parseExamDocument(source);
		} catch (e) {
			error = e;
		}
		expect(error).toBeInstanceOf(YamlSyntaxError);
		expect((error as YamlSyntaxError).code).toBe("yaml-syntax-error");
	});

	it("a body then a bare --- at the end of the text", () => {
		const source = "# Exam\n\n===\n\nExplique.\n\n[essay]\n\n---\n";
		expect(() => parseExamDocument(source)).toThrow(ParseError);
		expect(() => parseExamDocument(source)).toThrow(
			"line 8: a question's epilogue cannot use '---' as a thematic break inside an exam; use '***' or '___'",
		);
	});

	it("the epilogue --- after a chained bare fence", () => {
		const source =
			"# Exam\n\n---\nid: a\n---\n\nExplique.\n\n[essay]\n\nNota.\n\n---\n\nRubrica.\n";
		expect(() => parseExamDocument(source)).toThrow(ParseError);
		expect(() => parseExamDocument(source)).toThrow(
			"line 12: a question's epilogue cannot use '---' as a thematic break inside an exam; use '***' or '___'",
		);
	});
});

describe("batch 1: exam blocks ignore code lines", () => {
	it("structure lines inside a code block are not structure", () => {
		expect(
			parseExamDocument(
				"# Prova de Programação\n\nLeia com atenção.\n\n===\n\nQual é a saída de `print(1 + 1)`?\n\n[numeric]: 2\n\n```text\n# não é título\n\n===\n\n---\nid: nada\n---\n\n[numeric]: 7\n```\n\n===\n\nQuantos estados tem o Brasil?\n\n[numeric]: 26\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova de Programação",
			instructions: "Leia com atenção.",
			questions: [
				{
					stem: "Qual é a saída de `print(1 + 1)`?",
					answer: 2,
					domain: "integer",
					type: "numeric",
					epilogue:
						"```text\n# não é título\n\n===\n\n---\nid: nada\n---\n\n[numeric]: 7\n```",
				},
				{
					stem: "Quantos estados tem o Brasil?",
					answer: 26,
					domain: "integer",
					type: "numeric",
				},
			],
		});
	});

	it("=== inside a tilde fence in the instructions is text", () => {
		expect(
			parseExamDocument("# Prova\n\n~~~\n===\n~~~\n\n===\n\nQ\n\n[essay]\n"),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "~~~\n===\n~~~",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("--- inside an indented code block after the body is not a break", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nExplique.\n\n[essay]\n\n    ---\n    x: 1\n    ---\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					stem: "Explique.",
					type: "essay",
					epilogue: "    ---\n    x: 1\n    ---",
				},
			],
		});
	});

	it("a body tag inside a code block does not count as a body", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\nAntes.\n\n```\n[essay]\n```\n\n---\n\nDepois.\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					preamble: "Antes.\n\n```\n[essay]\n```\n\n---",
					stem: "Depois.",
					type: "essay",
				},
			],
		});
	});
});

describe("batch 1: exam instructions", () => {
	it("instructions are the stripped text before the first block", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n  Responda tudo.  \n\nTempo: 2 horas.\n\n===\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "Responda tudo.  \n\nTempo: 2 horas.",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("instructions are absent when empty", () => {
		expect(parseExamDocument("# Prova\n\n===\n\nQ\n\n[essay]\n")).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("with no block all the text is instructions", () => {
		expect(
			parseExamDocument(
				"# Prova\n\nLeia o texto sobre a Mata Atlântica.\n\nDepois responda.\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "Leia o texto sobre a Mata Atlântica.\n\nDepois responda.",
			questions: [],
		});
	});

	it("with no block and blank text, questions is empty and no instructions", () => {
		expect(parseExamDocument("# Prova\n\n\n   \n")).toEqual({
			type: "exam",
			title: "Prova",
			questions: [],
		});
	});

	it("instructions keep Unicode whitespace at both ends", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n　Leia com atenção.　\n\n===\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "\u3000Leia com atenção.\u3000",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("instructions keep a thematic break with *** inside", () => {
		expect(
			parseExamDocument(
				"# Prova\n\nLinha um.\n\n***\n\nLinha dois.\n\n===\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "Linha um.\n\n***\n\nLinha dois.",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("text before the title goes nowhere; only text after the title is instructions", () => {
		expect(
			parseExamDocument("Antes do título.\n\n# Prova\n\nDepois.\n"),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "Depois.",
			questions: [],
		});
	});

	it("instructions before a bare fence", () => {
		expect(
			parseExamDocument(
				"# Prova\n\nUse caneta.\n\n---\nid: a\n---\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "Use caneta.",
			questions: [
				{
					id: "a",
					stem: "Q",
					type: "essay",
				},
			],
		});
	});

	it("an H1 inside a code block in the instructions is kept as text", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n```text\n# comentário\n```\n\n===\n\nQ\n\n[essay]\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			instructions: "```text\n# comentário\n```",
			questions: [
				{
					stem: "Q",
					type: "essay",
				},
			],
		});
	});
});

describe("batch 3: chained fences with include", () => {
	it("a bare fence chained after the previous fence close opens a block", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n---\ninclude: biomas\n---\n\n---\ninclude: rios\n---\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					include: "biomas",
				},
				{
					include: "rios",
				},
			],
		});
	});

	it("a --- after === with the own frontmatter, then a chained fence", () => {
		expect(
			parseExamDocument(
				"# Prova\n\n===\n\n---\ninclude: biomas\n---\n\n---\ninclude: rios\n---\n",
			),
		).toEqual({
			type: "exam",
			title: "Prova",
			questions: [
				{
					include: "biomas",
				},
				{
					include: "rios",
				},
			],
		});
	});
});
