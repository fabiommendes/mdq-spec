/**
 * The `[ordering]` body: turn the raw `(indent, text)` lines of an
 * `[ordering]`, `[extra]`, `[accept]` or `[reject]` block into the
 * `[level, text]` pairs of the schema, after the indentation unit is inferred
 * across the whole question (`docs/question-types/ordering.md`,
 * "Indentation"). A port of `mdq-py/mdq/_parser/_ordering.py`.
 */

import { ParseError } from "../errors.js";
import { repr, strip } from "./text.js";

/**
 * A line before its indentation becomes a level: the leading whitespace in
 * columns (a tab moves to the next multiple of 4, as Python's
 * `str.expandtabs(4)`), and the text.
 */
export type RawLine = readonly [indent: number, text: string];

/** One leveled line of the schema: `[level, text]`. */
export type LeveledLine = [level: number, text: string];

/** One raw `## [accept]` or `## [reject]` section, before leveling. */
export interface RawAlternative {
	readonly lines: readonly RawLine[];
	readonly feedback: string | undefined;
	readonly comment: string | undefined;
}

/** One `accept` or `reject` entry of the schema. */
export interface OrderingAlternative {
	lines: LeveledLine[];
	feedback?: string;
	comment?: string;
}

/** `[extra]`, `[accept]` or `[reject]`, the text of an `h2` section heading. */
export const ORDERING_SECTION_RE: RegExp =
	/^\[(?<name>extra|accept|reject)\]$/u;

/**
 * An ordering `ul` item's line: the indentation to measure, the marker, and
 * the raw Markdown source of the item. `[^\n]` stands for Python's `.`.
 */
const ORDERING_ITEM_RE: RegExp =
	/^(?<indent>[ \t]*)[*+-][ \t]+(?<text>[^\n]*)$/u;

/** Python's `str.expandtabs(4)`: a tab moves to the next multiple of 4. */
function expandTabs(text: string): string {
	let column = 0;
	let out = "";
	for (const char of text) {
		if (char === "\t") {
			const pad = 4 - (column % 4);
			out += " ".repeat(pad);
			column += pad;
		} else {
			out += char;
			column = char === "\n" || char === "\r" ? 0 : column + 1;
		}
	}
	return out;
}

/** Python's `math.gcd` of two non-negative integers. */
function gcd(a: number, b: number): number {
	return b === 0 ? a : gcd(b, a % b);
}

/** Split the raw content of a fence into `(indent, text)` pairs, one per line. */
export function orderingCodeLines(content: string): RawLine[] {
	const rawLines = content.split("\n");
	if (rawLines[rawLines.length - 1] === "") rawLines.pop(); // trailing newline
	return rawLines.map(orderingLineIndent);
}

/**
 * Split the raw source lines of a `ul` block into `(indent, text)` pairs.
 *
 * @throws {ParseError} A non-blank line is not a list item: an item has a
 *   continuation line or a second paragraph (an ordering item is exactly
 *   one line).
 */
export function orderingUlLines(rawLines: readonly string[]): RawLine[] {
	const items: RawLine[] = [];
	for (const line of rawLines) {
		if (strip(line, " \t") === "") continue;
		const groups = ORDERING_ITEM_RE.exec(line)?.groups;
		if (!groups) {
			throw new ParseError(
				`an ordering item is exactly one line, found extra line: ${repr(line)}`,
			);
		}
		items.push([expandTabs(groups.indent ?? "").length, groups.text ?? ""]);
	}
	return items;
}

/**
 * The `(indent, text)` pair of one code line, with tabs expanded to tab
 * stops of 4. A blank line (whitespace only) has indent 0 and empty text.
 */
export function orderingLineIndent(line: string): RawLine {
	if (strip(line, " \t") === "") return [0, ""];
	const expanded = expandTabs(line);
	const stripped = expanded.replace(/^ +/u, "");
	return [expanded.length - stripped.length, stripped];
}

/**
 * The indentation unit of a question: the GCD of every positive indent, or
 * 4 when no line is indented.
 */
export function orderingUnit(indents: readonly number[]): number {
	const positives = indents.filter((indent) => indent > 0);
	return positives.length > 0 ? positives.reduce(gcd) : 4;
}

/** Convert `(indent, text)` pairs into `[level, text]` pairs. */
export function orderingLeveled(
	raw: readonly RawLine[],
	unit: number,
): LeveledLine[] {
	return raw.map(([indent, text]) => [Math.floor(indent / unit), text]);
}

/** Build one `accept` or `reject` entry from its raw section. */
export function orderingAlternative(
	alt: RawAlternative,
	unit: number,
): OrderingAlternative {
	const entry: OrderingAlternative = {
		lines: orderingLeveled(alt.lines, unit),
	};
	if (alt.feedback) entry.feedback = alt.feedback;
	if (alt.comment) entry.comment = alt.comment;
	return entry;
}

/**
 * Remove a `>` or `!` prefix from each raw line and join the remaining text
 * with spaces, skipping empty parts.
 */
export function joinPrefixedLines(
	lines: readonly string[],
	prefix: string,
): string {
	const parts = lines.map((line) => {
		const stripped = strip(line, " \t");
		return stripped.startsWith(prefix)
			? strip(stripped.slice(prefix.length), " \t")
			: stripped;
	});
	return parts.filter((part) => part !== "").join(" ");
}

/** Whether every raw line of a paragraph starts with `!` (a comment block). */
export function isCommentBlock(lines: readonly string[]): boolean {
	return (
		lines.length > 0 &&
		lines.every((line) => strip(line, " \t").startsWith("!"))
	);
}
