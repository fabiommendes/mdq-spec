/**
 * The editor range of an MDQ diagnostic.
 *
 * mdq-js gives 1-based positions, the end exclusive; without columns, the
 * diagnostic covers whole lines. VS Code wants 0-based positions. This module
 * has no dependency on `vscode`, so it is tested on its own.
 */

import type { Diagnostic } from "mdq";

/** A 0-based range, the end exclusive, as VS Code reads it. */
export interface EditorRange {
	readonly startLine: number;
	readonly startCharacter: number;
	readonly endLine: number;
	readonly endCharacter: number;
}

/**
 * The range of `diagnostic` in a document with `lineCount` lines, where
 * `lineLength(i)` is the length of the 0-based line `i`. A diagnostic with no
 * position covers the first line. Lines past the end are clamped.
 */
export function editorRange(
	diagnostic: Pick<Diagnostic, "line" | "column" | "endLine" | "endColumn">,
	lineCount: number,
	lineLength: (line: number) => number,
): EditorRange {
	const last = Math.max(0, lineCount - 1);
	const clamp = (line: number) => Math.min(Math.max(line, 0), last);
	const startLine = clamp((diagnostic.line ?? 1) - 1);
	const endLine = clamp((diagnostic.endLine ?? diagnostic.line ?? 1) - 1);

	if (diagnostic.column === undefined) {
		// Whole lines.
		return {
			startLine,
			startCharacter: 0,
			endLine,
			endCharacter: lineLength(endLine),
		};
	}
	const startCharacter = diagnostic.column - 1;
	const endCharacter =
		diagnostic.endColumn !== undefined && diagnostic.endLine !== undefined
			? diagnostic.endColumn - 1
			: lineLength(startLine);
	// An empty range draws no squiggle: cover at least one character.
	if (endLine === startLine && endCharacter <= startCharacter) {
		return {
			startLine,
			startCharacter,
			endLine,
			endCharacter: Math.max(startCharacter + 1, lineLength(startLine)),
		};
	}
	return { startLine, startCharacter, endLine, endCharacter };
}
