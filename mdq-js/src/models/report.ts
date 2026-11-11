/**
 * The runner report (docs/runner-report.md) checked against a code question. A
 * port of `mdq-py/mdq/models/_report.py` and of `CodeQuestion._check_report`
 * in `mdq-py/mdq/models/_code.py`. The shape is in `schema/runner-report.ts`.
 */

import * as z from "zod";
import { ReportError } from "../errors.js";
import type { CodeQuestion } from "../schema/questions.js";
import { RunnerReport } from "../schema/runner-report.js";
import { lineCount } from "./code.js";

/**
 * The report as a `RunnerReport`, validated with no coercion.
 *
 * @throws {ReportError} `report` does not follow `schema/runner-report.yaml`.
 */
export function parseReport(report: unknown): RunnerReport {
	const parsed = RunnerReport.safeParse(report);
	if (!parsed.success) {
		throw new ReportError(
			`the runner report is not valid: ${z.prettifyError(parsed.error)}`,
		);
	}
	return parsed.data;
}

/**
 * The report checked against `question` (runner-report.md, "Errors"), or
 * `null` when the question has no test source and `report` is missing. The
 * cases are read only with the status `completed`.
 *
 * @throws {ReportError} The report is invalid, does not fit the question, or
 *   is missing while the question has a test source.
 * @throws {UnresolvedTestSource} A test source of a `completed` report has no text.
 */
export function checkReport(
	question: CodeQuestion,
	report: unknown,
): RunnerReport | null {
	const tests = question.tests ?? [];
	if (report === undefined || report === null) {
		if (tests.length > 0) {
			throw new ReportError(
				"the question has a test source and no runner report",
			);
		}
		return null;
	}
	const parsed = parseReport(report);
	if (parsed.status !== "completed") return parsed;
	for (const item of parsed.cases) {
		const source = tests[item.source];
		if (source === undefined) {
			throw new ReportError(
				`a case has the source ${item.source}, but the question has ` +
					`${tests.length} test source(s)`,
			);
		}
		if (item.line > lineCount(source)) {
			throw new ReportError(
				`a case has the line ${item.line}, after the last line of ` +
					`tests[${item.source}]`,
			);
		}
	}
	return parsed;
}
