/**
 * `docs/lint-codes.md` and `src/models/lint-codes.ts` agree: every
 * `warning` and `info` code of the table is in `SEVERITY`, with the same
 * severity, and `SEVERITY` has no code the table lacks.
 *
 * The codes only the Markdown parser reports (`PARSER_ONLY_CODES`) are not
 * in `SEVERITY`: the parser emits them. The "Errors" table is not checked
 * here. Mirrors the table parsing of
 * `mdq-py/tests/test_lint_codes_consistency.py`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Severity } from "@mdq";
import { SEVERITY } from "@mdq/models/lint-codes.js";
import { describe, expect, it } from "vitest";
import { MDQ_ROOT, PARSER_ONLY_CODES } from "./corpus.js";
import { corpusIt, LINT_CODES } from "./not-ported.js";

const ROW_RE = /^\|\s*`([a-z0-9-]+)`\s*\|\s*([a-z]+)\s*\|/u;

/** The code and severity of each row of the table before "## Errors". */
function documentedCodes(): Map<string, string> {
	const found = new Map<string, string>();
	const text = readFileSync(join(MDQ_ROOT, "docs", "lint-codes.md"), "utf-8");
	for (const line of text.split("\n")) {
		if (line.startsWith("## Errors")) break;
		const match = ROW_RE.exec(line);
		if (match?.[1] !== undefined && match[2] !== undefined) {
			found.set(match[1], match[2]);
		}
	}
	return found;
}

const DOCUMENTED = documentedCodes();
const LINTED = [...DOCUMENTED].filter(([code]) => !PARSER_ONLY_CODES.has(code));

describe("lint codes", () => {
	it("docs/lint-codes.md has rows", () => {
		expect(DOCUMENTED.size).toBeGreaterThan(0);
		expect(LINTED.length).toBeGreaterThan(0);
	});

	for (const [code, severity] of LINTED) {
		corpusIt(LINT_CODES, `documented.${code}`, () => {
			expect(SEVERITY[code]).toBe(severity as Severity);
		});
	}

	it("every code of SEVERITY is documented", () => {
		const undocumented = Object.keys(SEVERITY).filter(
			(code) => !DOCUMENTED.has(code),
		);
		expect(undocumented).toEqual([]);
	});
});
