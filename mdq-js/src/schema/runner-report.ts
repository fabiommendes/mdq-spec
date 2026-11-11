/**
 * The runner report -- `schema/runner-report.yaml` (docs/runner-report.md): the
 * JSON document a runner returns for the test sources of a code question.
 *
 * The schemas are strict, as the JSON Schema is: no field outside the schema,
 * no coercion between JSON types, and an optional field is absent, never
 * `null`. `meta` keeps any JSON value. Zod gives a number with no fraction
 * (`5.0` is `5` in JavaScript) the `integer` type of JSON Schema. A `version`
 * this reader does not know is an error, as grading it in silence would hide
 * a runner that is out of step with MDQ. A port of `mdq-py/mdq/models/_report.py`.
 */

import * as z from "zod";

/** A JSON integer. Not `int()`: Zod limits that to the safe integers. */
const integer = () => z.number().refine(Number.isInteger, "must be an integer");

/** `schema/runner-report.yaml#/$defs/Digest` -- 64 lowercase hexadecimal digits. */
const Digest = z.string().regex(/^[0-9a-f]{64}$/);

/** `schema/runner-report.yaml#/$defs/Output` -- a captured stream. */
export const ReportOutput = z.strictObject({
	text: z.string(),
	truncated: z.boolean().optional(),
});
export type ReportOutput = z.infer<typeof ReportOutput>;

/** `schema/runner-report.yaml#/$defs/Case` -- one test case and its verdict. */
export const ReportCase = z.strictObject({
	source: integer().min(0),
	line: integer().min(1),
	verdict: z.enum([
		"pass",
		"fail",
		"error",
		"timeout",
		"resource-limit",
		"skipped",
	]),
	id: z.string().min(1).optional(),
	message: z.string().optional(),
	expected: z.string().optional(),
	actual: z.string().optional(),
	stdout: ReportOutput.optional(),
	stderr: ReportOutput.optional(),
	duration: z.number().min(0).optional(),
	memory: z.number().min(0).optional(),
	meta: z.record(z.string(), z.unknown()).optional(),
});
export type ReportCase = z.infer<typeof ReportCase>;

/** `schema/runner-report.yaml` -- the report. */
export const RunnerReport = z.strictObject({
	version: z.literal(1).optional(),
	status: z.enum(["completed", "build-error", "runner-error"]),
	cases: z.array(ReportCase),
	build: z.string().optional(),
	message: z.string().optional(),
	runner: z
		.strictObject({
			name: z.string().min(1),
			version: z.string().min(1).optional(),
			language: z.string().min(1).optional(),
			toolchainVersion: z.string().min(1).optional(),
		})
		.optional(),
	hashes: z
		.strictObject({
			submission: Digest.optional(),
			sources: z.array(Digest).optional(),
		})
		.optional(),
	meta: z.record(z.string(), z.unknown()).optional(),
});
export type RunnerReport = z.infer<typeof RunnerReport>;
