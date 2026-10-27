/**
 * `load`: the one path from Markdown or data to a document and its
 * diagnostics. A port of `mdq-py/mdq/_loading.py`.
 *
 * NOT PORTED (phase P4 of `dev/plan/mdq-js-paridade.md`): `load` is a stub
 * that throws. `tests/not-ported.ts` lists the corpus examples that need it.
 */

import type { Diagnostic } from "./diagnostics.js";
import type { MdqDocument } from "./validate.js";

/** The text formats `load` reads; a mapping needs none. */
export type Format = "mdq" | "yaml" | "json";

/** The kind of document `load` expects. Another kind is `wrong-kind`. */
export type Kind = "question" | "exam";

/** Options of `load`. */
export interface LoadOptions {
	/** Overrides the format a string would otherwise have (`mdq`). */
	readonly format?: Format;
	/** Narrows the document to a question or an exam. */
	readonly kind?: Kind;
}

/** What `load` found: the document, if one was built, and every diagnostic. */
export interface Loaded {
	readonly document: MdqDocument | undefined;
	readonly diagnostics: readonly Diagnostic[];
}

/**
 * Load a document from MDQ Markdown text, from YAML or JSON text, or from an
 * already parsed mapping. A problem in the document is a diagnostic, never a
 * thrown error.
 */
export function load(
	_source: string | Readonly<Record<string, unknown>>,
	_options?: LoadOptions,
): Loaded {
	throw new Error("not ported (P4)");
}
