import { load } from "mdq";
import { describe, expect, it } from "vitest";
import { editorRange } from "../src/ranges.js";

const lines = ["type: essay", "stem: Oi", "foo: 1", "", "# fim"];
const range = (diagnostic: Parameters<typeof editorRange>[0]) =>
	editorRange(diagnostic, lines.length, (i) => lines[i]?.length ?? 0);

describe("editorRange", () => {
	it("turns a 1-based span with columns into a 0-based range", () => {
		expect(range({ line: 3, column: 1, endLine: 3, endColumn: 7 })).toEqual({
			startLine: 2,
			startCharacter: 0,
			endLine: 2,
			endCharacter: 6,
		});
	});

	it("covers whole lines when there are no columns", () => {
		expect(range({ line: 2, endLine: 3 })).toEqual({
			startLine: 1,
			startCharacter: 0,
			endLine: 2,
			endCharacter: 6,
		});
	});

	it("puts a diagnostic with no position on the first line", () => {
		expect(range({})).toEqual({
			startLine: 0,
			startCharacter: 0,
			endLine: 0,
			endCharacter: 11,
		});
	});

	it("covers the rest of the line when only the start column is known", () => {
		expect(range({ line: 2, column: 7 })).toEqual({
			startLine: 1,
			startCharacter: 6,
			endLine: 1,
			endCharacter: 8,
		});
	});

	it("clamps lines past the end of the document", () => {
		expect(range({ line: 40, endLine: 41 })).toMatchObject({
			startLine: 4,
			endLine: 4,
		});
	});

	it("places a schema error of a YAML document on its entry", () => {
		const text = lines.join("\n");
		const [found] = load(text, { format: "yaml" }).diagnostics.filter(
			(d) => d.code === "schema-error",
		);
		expect(found && range(found)).toEqual({
			startLine: 2,
			startCharacter: 0,
			endLine: 2,
			endCharacter: 6,
		});
	});
});
