/**
 * `Diagnostic`, the one problem shape every stage of loading reports
 * through: a parse failure, a schema error, a lint warning, an unknown
 * frontmatter key. A port of `mdq-py/mdq/_diagnostics.py`.
 */

export type Severity = "error" | "warning" | "info";

/** Severity, ranked so "at or above" is a plain comparison. Higher is more severe. */
export const RANK: Readonly<Record<Severity, number>> = {
	info: 1,
	warning: 2,
	error: 3,
};

/** One step of a `Diagnostic` path: a key or an index from the document's root. */
export type PathStep = string | number;

/**
 * One problem found while loading a document.
 *
 * `path` locates the offending value as a list of keys and indices from the
 * document's root, like a JSON Schema error path. `line` is set only for a
 * parse failure tied to a source node whose position is known.
 */
export interface Diagnostic {
	readonly severity: Severity;
	readonly code: string;
	readonly message: string;
	readonly path: readonly PathStep[];
	readonly line?: number;
}

/** Build a `Diagnostic`; `path` defaults to the document root. */
export function diagnostic(
	severity: Severity,
	code: string,
	message: string,
	path: readonly PathStep[] = [],
	line?: number,
): Diagnostic {
	return line === undefined
		? { severity, code, message, path }
		: { severity, code, message, path, line };
}

/** A copy of `diagnostic` with `prefix` put before its path. */
export function prefixPath(
	diagnostic: Diagnostic,
	prefix: readonly PathStep[],
): Diagnostic {
	return { ...diagnostic, path: [...prefix, ...diagnostic.path] };
}
