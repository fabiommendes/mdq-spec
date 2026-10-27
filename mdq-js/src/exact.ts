/**
 * The exact literal of a pattern string (docs/references/patterns.md,
 * "Exact literals"): a CommonMark code span.
 *
 * A port of `mdq-py/mdq/_exact.py`.
 */

import { strip } from "./parser/text.js";

const BACKTICK_RUN_RE = /`+/gu;

/** The runs of backticks of `text`, as `[start, end)` offsets from `from`. */
function runs(text: string, from = 0): [number, number][] {
	const found: [number, number][] = [];
	BACKTICK_RUN_RE.lastIndex = from;
	for (let m = BACKTICK_RUN_RE.exec(text); m; m = BACKTICK_RUN_RE.exec(text)) {
		found.push([m.index, m.index + m[0].length]);
	}
	return found;
}

/**
 * The text of an exact literal, or `undefined` if `pattern` is not one.
 *
 * The literal follows the CommonMark code span (patterns.md, "Exact
 * literals"): N backticks open it and the first run of exactly N backticks
 * closes it. The closing run MUST end the pattern, otherwise the span is not
 * complete and the result is `undefined`. If the content starts and ends
 * with a space and is not only spaces, one space is removed from each end.
 */
export function exactLiteral(pattern: string): string | undefined {
	const text = strip(pattern, " \t");
	const opening = /^`+/u.exec(text);
	if (opening === null) return undefined;
	const width = opening[0].length;
	for (const [start, end] of runs(text, width)) {
		if (end - start !== width) continue;
		if (end !== text.length) return undefined;
		let content = text.slice(width, start);
		if (
			content.startsWith(" ") &&
			content.endsWith(" ") &&
			strip(content, " ") !== ""
		) {
			content = content.slice(1, -1);
		}
		return content;
	}
	return undefined;
}

/**
 * The pattern string of the exact literal whose content is `text`: the
 * inverse of `exactLiteral`. The fence is the shortest backtick run that no
 * run of `text` equals. A space on each end keeps a backtick, or a space, at
 * the end of `text` out of the fence.
 */
export function exactSpan(text: string): string {
	const widths = new Set(runs(text).map(([start, end]) => end - start));
	let width = 1;
	while (widths.has(width)) width++;
	const fence = "`".repeat(width);
	const needsPadding =
		text.startsWith("`") ||
		text.endsWith("`") ||
		(text.startsWith(" ") && text.endsWith(" ") && strip(text, " ") !== "");
	return `${fence}${needsPadding ? ` ${text} ` : text}${fence}`;
}

/**
 * Join the lines of a pattern in the body of a document with one space each,
 * as docs/references/patterns.md ("Continuation lines") defines.
 *
 * An exact literal cannot open at the end of a line, and its closing run
 * cannot start a continuation line (patterns.md, "Exact literals"). The line
 * endings of a literal exist for word wrap, and an edge space would need a
 * rule on whether it is removed. For such a literal the lines are joined with
 * a line feed instead, which no pattern string can hold, so the model reports
 * a `schema-error` for it.
 */
export function joinPatternLines(input: readonly string[]): string {
	const lines = input.map((line) => strip(line, " \t")).filter((l) => l !== "");
	if (lines.length === 0) return "";
	const first = lines[0] ?? "";
	const opening = /^`+/u.exec(first);
	if (opening === null || lines.length === 1) return lines.join(" ");
	const width = opening[0].length;
	if (width === first.length) return lines.join("\n");
	const text = lines.join("\n");
	for (const [start, end] of runs(text, width)) {
		if (end - start === width) {
			if (text[start - 1] === "\n") return lines.join("\n");
			break;
		}
	}
	return lines.join(" ");
}
