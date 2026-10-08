/**
 * Every `examples/invalid/**\/*.mdq.md` must be rejected, with the error
 * codes its `.lint.json` pins (see `docs/sync/testing.md`).
 *
 * Only two layers are ported: the parser and the schema. A source whose
 * expected errors are parser codes must make `parseDocument` throw a
 * `ParseError` carrying one of them; a source whose expected error is
 * `schema-error` must parse and then fail `validateDocument`. A source
 * whose errors need the model or lint layer (`LOAD_CODES` in
 * `not-ported.ts`) runs as an expected failure until that layer lands.
 */

import { existsSync, readFileSync } from "node:fs";
import { ParseError, parseDocument, validateDocument } from "@mdq";
import { describe, expect } from "vitest";
import {
	INVALID_SOURCES,
	loadLintSibling,
	parsedSibling,
	relativeId,
} from "./corpus.js";
import { corpusIt, LOAD, LOAD_CODES } from "./not-ported.js";

/**
 * The codes only the parser reports, through `ParseError.code`.
 * `undefined-blank` is not here: the parser reports it for a `preAccept`
 * key, the model for a stem marker.
 */
const PARSER_CODES = new Set([
	"parse-error",
	"yaml-syntax-error",
	"foreign-choice-marker",
	"conflicting-accept",
]);

describe("invalid sources are rejected with the codes their .lint.json pins", () => {
	for (const source of INVALID_SOURCES) {
		const name = relativeId(source);
		const errors = loadLintSibling(source)
			.filter((d) => d.severity === "error")
			.map((d) => d.code);
		const codes = new Set(errors);
		const notPorted = [...codes].find((code) => code in LOAD_CODES);
		const manifest =
			notPorted === undefined
				? LOAD
				: { ...LOAD, [name]: `${notPorted}: ${LOAD_CODES[notPorted]}` };

		corpusIt(manifest, name, () => {
			expect(codes.size, `${name}: .lint.json pins no error`).toBeGreaterThan(
				0,
			);
			const text = readFileSync(source, "utf-8");
			let document: unknown;
			let error: unknown;
			try {
				document = parseDocument(text);
			} catch (e) {
				error = e;
			}
			if (error !== undefined) {
				expect(error, `${name}: not a ParseError`).toBeInstanceOf(ParseError);
				const code = (error as ParseError).code;
				expect(
					codes.has(code),
					`${name}: parse error ${code}, expected one of [${[...codes].join(", ")}]`,
				).toBe(true);
				return;
			}
			expect(
				[...codes].every((code) => !PARSER_CODES.has(code)),
				`${name}: parsed, but the parser must report [${errors.join(", ")}]`,
			).toBe(true);
			const result = validateDocument(document);
			expect(
				result.success,
				`${name}: validated, but must report [${errors.join(", ")}]`,
			).toBe(false);
		});
	}
});

describe("an invalid source and its parsed sibling pin the same errors", () => {
	for (const source of INVALID_SOURCES) {
		const sibling = parsedSibling(source);
		if (!existsSync(sibling)) continue;
		const name = relativeId(source);
		corpusIt({}, name, () => {
			// Both read the same `.lint.json`; the schema suite rejects the
			// sibling, this suite the source. Nothing more to pin here than
			// that the shared file exists and lists an error.
			const errors = loadLintSibling(source).filter(
				(d) => d.severity === "error",
			);
			expect(errors.length).toBeGreaterThan(0);
		});
	}
});
