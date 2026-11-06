import { describe, expect, it } from "vitest";
import { frontmatterType, mdqFormat } from "../src/documents.js";

const file = (fileName: string, languageId = "plaintext", text = "") => ({
	fileName,
	languageId,
	getText: () => text,
});

describe("mdqFormat", () => {
	it.each([
		["questoes/pantanal.mdq.md", "mdq"],
		["questoes/pantanal.mdq", "mdq"],
		["prova.MDQ.MD", "mdq"],
		["cerrado.mdq.yaml", "yaml"],
		["cerrado.mdq.yml", "yaml"],
		["caatinga.mdq.json", "json"],
	])("%s is %s", (path, format) => {
		expect(mdqFormat(file(path))).toBe(format);
	});

	it.each(["README.md", "notas.yaml", "package.json", "mdq.md", "a.mdqx"])(
		"%s is not MDQ",
		(path) => {
			expect(mdqFormat(file(path, "markdown"))).toBeUndefined();
		},
	);

	it("reads any file in the mdq language as MDQ Markdown", () => {
		expect(mdqFormat(file("questoes/mata-atlantica.md", "mdq"))).toBe("mdq");
	});
});

describe("a Markdown document", () => {
	const markdown = (text: string) => file("notas/cerrado.md", "markdown", text);

	it("is MDQ when a glob of mdq.files matches it", () => {
		expect(mdqFormat(markdown("# Cerrado"), true)).toBe("mdq");
	});

	it("is MDQ when its frontmatter declares a question type", () => {
		const text = "---\nid: ipe\ntype: multiple-choice\n---\n\nQual?\n";
		expect(mdqFormat(markdown(text))).toBe("mdq");
	});

	it("is MDQ when its frontmatter declares an exam", () => {
		expect(mdqFormat(markdown("---\ntype: exam\n---\n# Prova\n"))).toBe("mdq");
	});

	it.each([
		["no frontmatter", "# Cerrado\n\ntype: essay\n"],
		["another type", "---\ntype: post\n---\n"],
		["type in the body", "---\nid: a\n---\ntype: essay\n"],
		["a nested type", "---\nmeta:\n  type: essay\n---\n"],
	])("is not MDQ with %s", (_, text) => {
		expect(mdqFormat(markdown(text))).toBeUndefined();
	});

	it("is not read for its frontmatter unless it is Markdown", () => {
		expect(
			mdqFormat(file("a.txt", "plaintext", "---\ntype: essay\n---\n")),
		).toBeUndefined();
	});
});

describe("frontmatterType", () => {
	it.each([
		["---\ntype: essay\n---\n", "essay"],
		["---\r\ntype: 'true-false'\r\n---\r\n", "true-false"],
		['\uFEFF---\ntype: "ordering" # comment\n---\n', "ordering"],
		["---\n# Comentário\ntype: numeric\n---\n", "numeric"],
	])("reads %j", (text, type) => {
		expect(frontmatterType(text)).toBe(type);
	});

	it("does not read past an unclosed frontmatter's limit", () => {
		const text = `---\n${"a: 1\n".repeat(300)}type: essay\n`;
		expect(frontmatterType(text)).toBeUndefined();
	});
});
