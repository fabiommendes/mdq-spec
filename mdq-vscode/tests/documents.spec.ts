import { describe, expect, it } from "vitest";
import { mdqFormat } from "../src/documents.js";

describe("mdqFormat", () => {
	it.each([
		["questoes/pantanal.mdq.md", "mdq"],
		["prova.MDQ.MD", "mdq"],
		["cerrado.mdq.yaml", "yaml"],
		["cerrado.mdq.yml", "yaml"],
		["caatinga.mdq.json", "json"],
	])("%s is %s", (path, format) => {
		expect(mdqFormat(path)).toBe(format);
	});

	it.each(["README.md", "notas.yaml", "package.json", "mdq.md"])(
		"%s is not MDQ",
		(path) => {
			expect(mdqFormat(path)).toBeUndefined();
		},
	);
});
