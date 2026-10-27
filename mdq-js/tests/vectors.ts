/**
 * Helpers the corpus suites share: reading a vector file, comparing
 * diagnostics as a multiset and comparing scores. Mirrors the helpers the
 * Python runners repeat (`mdq-py/tests/test_*_corpus.py`).
 */

import type { Diagnostic } from "@mdq";
import { expect } from "vitest";
import { type ExpectedDiagnostic, loadDocument } from "./corpus.js";

/** The file of a vector corpus: a mapping, read with the corpus YAML loader. */
export function loadVectors(path: string): Record<string, unknown> {
	return loadDocument(path) as Record<string, unknown>;
}

/** The cases of a vector file under `key`. */
export function casesOf<T>(path: string, key = "cases"): T[] {
	return loadVectors(path)[key] as T[];
}

/** `{code, severity, path}` of a diagnostic, the shape a `.lint.json` pins. */
export function entryOf(
	diagnostic: Pick<Diagnostic, "code" | "severity" | "path">,
): ExpectedDiagnostic {
	return {
		code: diagnostic.code,
		severity: diagnostic.severity,
		path: [...diagnostic.path],
	};
}

/** The entries as a sorted list, so order does not matter but repeats do. */
export function asMultiset(entries: readonly ExpectedDiagnostic[]): string[] {
	return entries
		.map((entry) =>
			JSON.stringify({
				code: entry.code,
				severity: entry.severity,
				path: entry.path,
			}),
		)
		.sort();
}

/** The errors among `diagnostics`. */
export function errorsOf(diagnostics: readonly Diagnostic[]): Diagnostic[] {
	return diagnostics.filter((d) => d.severity === "error");
}

/**
 * A score of a file as a number. A string `a/b` stands for a value that a
 * float cannot write exactly (`Fraction` in `test_grading_examples.py`).
 */
export function scoreValue(value: unknown): number {
	if (typeof value === "number") return value;
	const text = String(value);
	const [numerator, denominator] = text.split("/");
	return denominator === undefined
		? Number(numerator)
		: Number(numerator) / Number(denominator);
}

/** `pytest.approx`: relative 1e-6, absolute 1e-12. */
export function expectApprox(actual: number, expected: number): void {
	const tolerance = Math.max(1e-6 * Math.abs(expected), 1e-12);
	expect(
		Math.abs(actual - expected) <= tolerance,
		`${actual} is not approximately ${expected}`,
	).toBe(true);
}

/**
 * Python `repr` stand-in for a case id: the JSON text of the value, with the
 * non-finite numbers JSON cannot write spelled out.
 */
export function reprOf(value: unknown): string {
	return JSON.stringify(value, (_key, item: unknown) =>
		typeof item === "number" && !Number.isFinite(item) ? String(item) : item,
	);
}
