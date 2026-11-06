/**
 * Where a diagnostic points in the source text.
 *
 * A `Span` holds 1-based positions, like the `line` of a `Diagnostic` and
 * like `file:line:column` in a terminal. With columns, the span runs from
 * (`line`, `column`) to (`endLine`, `endColumn`), the end exclusive. Without
 * columns, it covers the whole lines from `line` to `endLine`, inclusive: the
 * Markdown parser knows the lines of a block, not the columns.
 *
 * A `Locator` maps a diagnostic path to its span. A path the locator does
 * not know falls back to its closest ancestor that it knows, so every
 * diagnostic of a text document gets a position.
 */

import {
	isMap,
	isScalar,
	isSeq,
	LineCounter,
	type Node,
	parseDocument,
} from "yaml";
import type { Diagnostic, PathStep } from "./diagnostics.js";

/** A region of the source text, 1-based. See the module docs. */
export interface Span {
	readonly line: number;
	readonly column?: number;
	readonly endLine: number;
	readonly endColumn?: number;
}

/** The span of a path, or `undefined` if the locator does not know it. */
export type Locator = (path: readonly PathStep[]) => Span | undefined;

/** The first line of the text: where a diagnostic of the root points. */
const FIRST_LINE: Span = { line: 1, endLine: 1 };

/**
 * A copy of `diagnostic` with the span of its path, or of the closest
 * ancestor `locate` knows. A diagnostic that already has a `line` (a parse
 * failure tied to a source node) keeps it.
 */
export function withSpan(diagnostic: Diagnostic, locate: Locator): Diagnostic {
	if (diagnostic.line !== undefined) return diagnostic;
	const span = closestSpan(diagnostic.path, locate);
	return { ...diagnostic, ...span };
}

function closestSpan(path: readonly PathStep[], locate: Locator): Span {
	for (let end = path.length; end > 0; end--) {
		const span = locate(path.slice(0, end));
		if (span !== undefined) return span;
	}
	return FIRST_LINE;
}

/**
 * A locator over YAML text, also used for JSON: a JSON document is a YAML
 * flow mapping, and only the positions are read here, never the data. The
 * span of a mapping entry runs from its key to the end of its value, so an
 * unknown key and a wrong value both point at the entry. A text that does
 * not parse gives a locator that knows no path.
 *
 * @param lineOffset Lines before the text in the file, for a frontmatter.
 */
export function yamlLocator(text: string, lineOffset = 0): Locator {
	const lines = new LineCounter();
	const document = parseDocument(text, {
		lineCounter: lines,
		uniqueKeys: false,
		merge: false,
	});
	if (document.errors.length > 0) return () => undefined;

	const toSpan = (start: number, end: number): Span => {
		const from = lines.linePos(start);
		// The end offset is exclusive; a value that ends a line ends at its
		// last character, not at the start of the next line.
		const to = lines.linePos(Math.max(start, trimEnd(text, start, end)));
		return {
			line: from.line + lineOffset,
			column: from.col,
			endLine: to.line + lineOffset,
			endColumn: to.col,
		};
	};

	return (path) => {
		let node: unknown = document.contents;
		let start: number | undefined;
		let end: number | undefined;
		for (const step of path) {
			if (isMap(node)) {
				const pair = node.items.find(
					(item) =>
						isScalar(item.key) && String(item.key.value) === String(step),
				);
				if (pair === undefined) return undefined;
				const key = pair.key as Node;
				const value = pair.value as Node | null;
				start = key.range?.[0];
				end = value?.range?.[1] ?? key.range?.[1];
				node = value;
			} else if (isSeq(node) && typeof step === "number") {
				const item = node.items[step] as Node | undefined;
				if (item === undefined) return undefined;
				start = item.range?.[0];
				end = item.range?.[1];
				node = item;
			} else {
				return undefined;
			}
		}
		if (start === undefined || end === undefined) return undefined;
		return toSpan(start, end);
	};
}

/** `end` moved back over trailing line breaks and spaces. */
function trimEnd(text: string, start: number, end: number): number {
	let index = end;
	while (index > start && /\s/.test(text[index - 1] ?? "")) index--;
	return index;
}
