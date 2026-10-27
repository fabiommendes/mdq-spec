/**
 * The TypeScript API of `load`, `parse` and `assertValid`: what the corpus
 * does not say because it is about the call, not the format.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	assertValid,
	InvalidDocumentError,
	load,
	parse,
	validateDocument,
} from "@mdq";
import { describe, expect, it } from "vitest";
import { INVALID_DIR } from "./corpus.js";

/** A question with no lint diagnostic. */
const ESSAY = {
	type: "essay",
	id: "water-cycle",
	title: "Water cycle",
	stem: "Explique o ciclo da água.",
	answerKey: "Evaporação, condensação e precipitação.",
} as const;

describe("load", () => {
	it("returns the document and no diagnostic for a valid mapping", () => {
		const loaded = load({ ...ESSAY });
		expect(loaded.document).toEqual(ESSAY);
		expect(loaded.diagnostics).toEqual([]);
	});

	it("does not change the mapping it is given", () => {
		const source = { ...ESSAY, tags: ["a"], meta: { x: null }, title: null };
		const before = structuredClone(source);
		load(source);
		expect(source).toEqual(before);
	});

	it("rejects an unknown format with a RangeError", () => {
		expect(() => load("{}", { format: "toml" as "json" })).toThrow(RangeError);
	});

	it("reports wrong-kind before validating", () => {
		const loaded = load({ ...ESSAY }, { kind: "exam" });
		expect(loaded.document).toBeUndefined();
		expect(loaded.diagnostics.map((d) => d.code)).toEqual(["wrong-kind"]);
	});

	it("reads JSON text, and a repeated key is a json-syntax-error", () => {
		expect(load(JSON.stringify(ESSAY), { format: "json" }).document).toEqual(
			ESSAY,
		);
		const loaded = load('{"type": "essay", "stem": "a", "stem": "b"}', {
			format: "json",
		});
		expect(loaded.diagnostics.map((d) => d.code)).toEqual([
			"json-syntax-error",
		]);
	});

	it("tells a repeated key from the same key in two objects", () => {
		const text =
			'{"type": "exam", "questions": [{"type": "essay", "stem": "a"}, {"type": "essay", "stem": "b"}]}';
		const codes = load(text, { format: "json" }).diagnostics.map((d) => d.code);
		expect(codes).not.toContain("json-syntax-error");
	});

	it("gives a parse error the line of its node", () => {
		const source = readFileSync(
			join(INVALID_DIR, "ordering-paragraph-after-tag.mdq.md"),
			"utf-8",
		);
		const error = load(source).diagnostics.find(
			(d) => d.code === "parse-error",
		);
		expect(error?.line).toBe(5);
	});
});

describe("assertValid and parse", () => {
	it("returns the document of a valid load", () => {
		expect(assertValid(load({ ...ESSAY }))).toEqual(ESSAY);
		expect(parse({ ...ESSAY })).toEqual(ESSAY);
	});

	it("throws InvalidDocumentError with every diagnostic", () => {
		const loaded = load({ type: "essay", stem: "  " });
		expect(() => assertValid(loaded)).toThrow(InvalidDocumentError);
		try {
			assertValid(loaded);
		} catch (error) {
			expect((error as InvalidDocumentError).diagnostics).toEqual(
				loaded.diagnostics,
			);
		}
	});
});

describe("validateDocument runs the model rules", () => {
	it("reports a model rule as a custom issue with its code", () => {
		const result = validateDocument({ type: "essay", stem: "  " });
		expect(result.success).toBe(false);
		const issue = result.error?.issues[0];
		expect(issue?.code).toBe("custom");
		expect(issue?.path).toEqual(["stem"]);
		expect((issue as { params?: { code?: string } }).params?.code).toBe(
			"blank-text",
		);
	});
});
