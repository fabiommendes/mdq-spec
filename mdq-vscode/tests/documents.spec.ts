import { describe, expect, it } from "vitest";
import { mdqFormat } from "../src/documents.js";

const file = (fileName: string, languageId = "plaintext") => ({
	fileName,
	languageId,
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
