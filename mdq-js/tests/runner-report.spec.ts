/**
 * The runner report (`schema/runner-report.yaml`): what `parseReport` accepts
 * and rejects. A port of `mdq-py/tests/test_runner_report_schema.py`, with
 * the verdict of the JSON Schema written out: mdq-js has no JSON Schema
 * validator, so the Zod shapes are paired with the bundle in
 * `schema-agreement.spec.ts` and the values are listed here.
 */

import { parseReport, ReportError } from "@mdq";
import { describe, expect, it } from "vitest";

const DIGEST =
	"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/** A report that has every field of the schema. */
const FULL = {
	version: 1,
	status: "completed",
	cases: [
		{
			source: 0,
			line: 3,
			verdict: "fail",
			id: "test_a",
			message: "m",
			expected: "1",
			actual: "2",
			stdout: { text: "o", truncated: false },
			stderr: { text: "e" },
			duration: 0.5,
			memory: 1024,
			meta: { k: [null, 1] },
		},
	],
	build: "warning",
	message: "ok",
	runner: {
		name: "r",
		version: "1",
		language: "python",
		toolchainVersion: "3.13",
	},
	hashes: { submission: DIGEST, sources: [DIGEST] },
	meta: { coverage: null },
};

const MINIMAL = { status: "completed", cases: [] };

const pass = { source: 0, line: 1, verdict: "pass" };

/** `FULL` with the case changed. */
const withCase = (fields: Record<string, unknown>) => ({
	...MINIMAL,
	cases: [{ ...pass, ...fields }],
});

const VALID: [string, unknown][] = [
	["the full report", FULL],
	["the minimal report", MINIMAL],
	["integral floats", withCase({ source: 0.0, line: 5.0 })],
	["version 1.0", { version: 1.0, status: "build-error", cases: [] }],
	["a huge duration", withCase({ duration: 1e300 })],
	["a negative zero duration", withCase({ duration: -0 })],
	["a free meta", { ...MINIMAL, meta: { a: { b: [null] }, c: null } }],
	["a runner with only a name", { ...MINIMAL, runner: { name: "r" } }],
	["a source with a huge integer index", withCase({ source: 1e300 })],
];

const INVALID: [string, unknown][] = [
	["no cases", { status: "completed" }],
	["no status", { cases: [] }],
	["an unknown status", { ...MINIMAL, status: "done" }],
	["an extra key", { ...MINIMAL, extra: 1 }],
	["an extra key of a case", withCase({ x: 1 })],
	[
		"a snake case key",
		{ ...MINIMAL, runner: { name: "r", toolchain_version: "1" } },
	],
	["version true", { ...MINIMAL, version: true }],
	["version as a string", { ...MINIMAL, version: "1" }],
	["version 2", { version: 2, status: "build-error", cases: [] }],
	["version 0", { version: 0, status: "build-error", cases: [] }],
	["a null version", { ...MINIMAL, version: null }],
	["a null optional field", { ...MINIMAL, build: null }],
	["a null case field", withCase({ message: null })],
	["null cases", { status: "completed", cases: null }],
	["a source as a string", withCase({ source: "0" })],
	["a fractional source", withCase({ source: 0.5 })],
	["a negative source", withCase({ source: -1 })],
	["line 0", withCase({ line: 0 })],
	["a boolean line", withCase({ line: true })],
	["an unknown verdict", withCase({ verdict: "ok" })],
	["an empty id", withCase({ id: "" })],
	["a negative duration", withCase({ duration: -1 })],
	["a negative memory", withCase({ memory: -1 })],
	["a boolean duration", withCase({ duration: true })],
	["an output with no text", withCase({ stdout: {} })],
	["an output with an extra key", withCase({ stdout: { text: "", x: 1 } })],
	["a short digest", { ...MINIMAL, hashes: { submission: "abc" } }],
	[
		"an uppercase digest",
		{ ...MINIMAL, hashes: { submission: DIGEST.toUpperCase() } },
	],
	["a long digest", { ...MINIMAL, hashes: { sources: [`${DIGEST}0`] } }],
	["a runner with no name", { ...MINIMAL, runner: { version: "1" } }],
	["an empty runner name", { ...MINIMAL, runner: { name: "" } }],
	["a meta that is a list", { ...MINIMAL, meta: [] }],
	["a case meta that is a string", withCase({ meta: "x" })],
	["a list", []],
	["a string", "report"],
	["null", null],
];

describe("parseReport", () => {
	it.each(VALID)("accepts %s", (_name, report) => {
		expect(() => parseReport(report)).not.toThrow();
	});

	it.each(INVALID)("rejects %s", (_name, report) => {
		expect(() => parseReport(report)).toThrow(ReportError);
	});

	it("keeps the fields as they are", () => {
		expect(parseReport(FULL)).toEqual(FULL);
	});
});
