/**
 * `[ordering]` body parsing: turn the raw `(indent, text)` lines of an
 * `[ordering]`, `[extra]`, `[accept]` or `[reject]` block into the leveled
 * `[level, text]` pairs the schema expects, once the indentation unit is
 * inferred across the whole question (`docs/question-types/ordering.md`,
 * "Indentation").
 *
 * A port of `mdq-py/mdq/_parser/_ordering.py`.
 */

import { ParseError } from "../errors.js";
import { md, span, startsAfter } from "../markdown.js";
import { BLOCK_NAMES, type BlockCursor, type BlockReader } from "./blocks.js";
import { isCommentLine, parseObservations } from "./choices.js";
import { normalizeList } from "./frontmatter.js";
import type { OrderingTag } from "./tags.js";
import { repr, rstrip, strip } from "./text.js";
import type { Node } from "./tree.js";

/**
 * A line before its indentation is reduced to a level: the leading whitespace
 * measured in columns (tab stops of 4) for a code line, or the nesting depth
 * for a `ul` item, and the text.
 */
export type RawLine = readonly [indent: number, text: string];

/** One leveled line of the schema: `[level, text]`. */
export type LeveledLine = [level: number, text: string];

/** One raw `## [accept]` or `## [reject]` section, before leveling. */
export interface RawAlternative {
	readonly lines: readonly RawLine[];
	readonly feedback: string | null;
	readonly comment: string | null;
}

/** One `accept` or `reject` entry of the schema. */
export interface OrderingAlternative {
	lines: LeveledLine[];
	feedback?: string;
	comment?: string;
}

/** `[extra]`, `[accept]` or `[reject]`, the text of an `h2` section heading. */
const ORDERING_SECTION_RE: RegExp = /^\[(?<name>extra|accept|reject)\]$/u;

/**
 * An ordering `ul` item's line: the indentation to measure, the marker, and
 * the raw Markdown source of the item. `[^\n]` stands for Python's `.`.
 */
const ORDERING_ITEM_RE: RegExp =
	/^(?<indent>[ \t]*)[*+-][ \t]+(?<text>[^\n]*)$/u;
/** A bare marker with no text. */
const EMPTY_ITEM_RE: RegExp = /^[ \t]*[*+-][ \t]*$/u;
/** Markers of nested lists opened on the same source line (`- - Bahia`). */
const NESTED_MARKER_RE: RegExp = /^[*+-][ \t]+/u;
const NESTED_ORDERED_RE: RegExp = /^\p{Nd}{1,9}[.)](?:[ \t]|$)/u;

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

/**
 * The language of a code fence: the first word of its info string, after
 * CommonMark backslash and entity processing. A word ends at the first space
 * or tab. `null` when the info string is empty.
 */
function fenceLanguage(info: string): string | null {
	const text = strip(md.utils.unescapeAll(info), " \t");
	return text.split(/[ \t]/u, 1)[0] || null;
}

/** Split a fence's raw content into `(indent, text)` pairs, one per line. */
export function orderingCodeLines(content: string): RawLine[] {
	const rawLines = content.split("\n");
	if (rawLines[rawLines.length - 1] === "") rawLines.pop(); // trailing newline
	return rawLines.map(orderingLineIndent);
}

/**
 * Record the nesting depth of every item of a list node, by source line.
 *
 * @param depth The depth of the items directly under `node`.
 * @param depths Filled with `{0-based source line: depth}`.
 * @param parents When given, filled with the source lines of the items that
 *   hold a nested list.
 */
function collectItemDepths(
	node: Node,
	depth: number,
	depths: Map<number, number>,
	parents?: Set<number>,
): void {
	for (const item of node.children) {
		if (item.type !== "list_item") continue;
		const line = span(item)[0];
		depths.set(line, depth);
		for (const child of item.children) {
			if (child.type === "bullet_list" || child.type === "ordered_list") {
				parents?.add(line);
				collectItemDepths(child, depth + 1, depths, parents);
			}
		}
	}
}

/**
 * Split a `ul` block's raw source lines into `(depth, text)` pairs.
 *
 * The first element of a pair is the item's nesting depth, not a column
 * (ordering.md, "Body"): top-level items are 0, their children 1, and so on.
 *
 * @param rawLines The source lines of the whole list block.
 * @param depths Nesting depth of each list item, by its 0-based source line.
 * @param firstLine The 0-based source line of `rawLines[0]`.
 * @param parents The source lines of the items that hold a nested list. An
 *   item with no text of its own among them is not a line.
 * @throws {ParseError} A non-blank line is not a bullet list item (an item
 *   has a continuation line or a second paragraph, or a nested list is
 *   ordered: an ordering item is exactly one line), or an item has no text
 *   and holds no nested list.
 */
export function orderingUlLines(
	rawLines: readonly string[],
	depths: ReadonlyMap<number, number>,
	firstLine: number,
	parents?: ReadonlySet<number>,
): RawLine[] {
	const items: RawLine[] = [];
	for (const [offset, line] of rawLines.entries()) {
		if (strip(line, " \t") === "") continue;
		if (parents?.has(firstLine + offset) && EMPTY_ITEM_RE.test(line)) {
			continue;
		}
		const groups = ORDERING_ITEM_RE.exec(line)?.groups;
		const depth = depths.get(firstLine + offset);
		if (groups === undefined || depth === undefined) {
			throw new ParseError(
				"an ordering item is exactly one line and a nested list is " +
					`a \`ul\`, found: ${repr(line)}`,
			);
		}
		let text = rstrip(groups.text ?? "", " \t");
		// An item holding only a nested list is not a line: it adds a level of
		// depth, which `depths` already holds (`- - Bahia`).
		for (let nested = NESTED_MARKER_RE.exec(text); nested; ) {
			text = text.slice(nested[0].length);
			nested = NESTED_MARKER_RE.exec(text);
		}
		if (!text) {
			throw new ParseError(
				`an ordering item must have text, found: ${repr(line)}`,
			);
		}
		if (NESTED_ORDERED_RE.test(text)) {
			throw new ParseError(
				"an ordering item is exactly one line and a nested list is " +
					`a \`ul\`, found: ${repr(line)}`,
			);
		}
		items.push([depth, text]);
	}
	return items;
}

/**
 * The `(indent, text)` pair of one code line. Trailing spaces and tabs are
 * removed. The leading whitespace is measured in columns, with CommonMark
 * tab stops: a tab advances to the next multiple of 4. A blank line (spaces
 * and tabs only) is level 0 with empty text.
 */
export function orderingLineIndent(line: string): RawLine {
	const trimmed = rstrip(line, " \t");
	if (!trimmed) return [0, ""];
	const expanded = expandTabs(trimmed);
	const stripped = expanded.replace(/^ +/u, "");
	return [expanded.length - stripped.length, stripped];
}

/**
 * The indentation unit of a question: the GCD of every positive indent, or 4
 * when none is indented at all (ordering.md, "Indentation").
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

/** Build one `accept` or `reject` entry from its raw lines and observations. */
export function orderingAlternative(
	alt: RawAlternative,
	unit: number,
): OrderingAlternative {
	const entry: OrderingAlternative = {
		lines: orderingLeveled(alt.lines, unit),
	};
	if (alt.feedback !== null) entry.feedback = alt.feedback;
	if (alt.comment !== null) entry.comment = alt.comment;
	return entry;
}

/** Whether every raw line of a paragraph is a comment line. */
export function isCommentBlock(lines: readonly string[]): boolean {
	return lines.length > 0 && lines.every(isCommentLine);
}

/**
 * Throw a `ParseError` unless `tag` is `[ordering]:` alone: the tag has a
 * colon and no text after it (question-base.md, "Body tags").
 */
export function checkOrderingTag(tag: OrderingTag): void {
	if (tag.rest === null) {
		throw new ParseError(
			"the tag of an ordering question is `[ordering]:`, with a colon; " +
				"the code block or list follows on the next line",
		);
	}
	if (tag.rest) {
		throw new ParseError(
			"the line of `[ordering]:` has no text after the colon; the " +
				"code block or list starts on the next line",
		);
	}
}

/**
 * Fill `lines`, `extra`, `accept` and `reject` from an `[ordering]` block and
 * its `## [extra]`/`## [accept]`/`## [reject]` sections.
 *
 * The optional epilogue sits between the content block and the first
 * section; the sections are contiguous after it and nothing follows the last
 * one.
 *
 * The indentation unit is inferred once across every block of the question
 * (ordering.md, "Indentation"), so every block is read raw first and only
 * converted to `[level, text]` pairs at the end. `content` and `highlight`
 * always come from the body (a code fence implies `code` and its language, a
 * list implies `text`); the frontmatter cannot declare them.
 *
 * @param tagNode The `[ordering]` tag paragraph; the content block must start
 *   on the line right after it.
 * @returns The fields of the question, and the epilogue nodes between the
 *   content block and the first section.
 * @throws {ParseError} The block after `[ordering]` (or a section) is neither
 *   a fenced code block nor a `ul` list, a blank line separates `[ordering]`
 *   from its block, a section has no content block, a section's content is
 *   not the same kind as `[ordering]`'s or its fence names another language
 *   than the `[ordering]` fence, two `## [extra]` sections are declared, a
 *   section's observations carry more than one feedback/comment block or
 *   interleave the two, or a block that is not a section follows the first
 *   section.
 */
export function parseOrderingBody(
	cursor: BlockCursor,
	front: Readonly<Record<string, unknown>>,
	tagNode: Node,
): [Record<string, unknown>, Node[]] {
	const [mainKind, mainHighlight, mainRaw] = parseOrderingContent(cursor, {
		tagNode,
	});

	const children = cursor.reader.children;
	let firstSection = children.length;
	for (let i = cursor.pos; i < children.length; i++) {
		if (isOrderingSection(cursor.reader, children[i] as Node)) {
			firstSection = i;
			break;
		}
	}
	const epilogueNodes = children.slice(cursor.pos, firstSection);
	cursor.pos = firstSection;

	let extraRaw: RawLine[] | null = null;
	const acceptRaw: RawAlternative[] = [];
	const rejectRaw: RawAlternative[] = [];

	for (;;) {
		const node = cursor.peek();
		if (node === null || node.type !== "heading" || node.tag !== "h2") break;
		const name = ORDERING_SECTION_RE.exec(cursor.reader.rawText(node))?.groups
			?.name;
		if (name === undefined) break;
		cursor.read();
		if (name === "extra") {
			if (extraRaw !== null) {
				throw new ParseError("a question defines at most one [extra] section");
			}
			const [kind, highlight, raw] = parseOrderingContent(cursor, {
				section: name,
			});
			extraRaw = raw;
			if (kind !== mainKind) {
				throw new ParseError(
					"[extra] must use the same content type as [ordering]",
				);
			}
			checkSectionHighlight(name, highlight, mainHighlight);
		} else {
			const [feedback, comment] = parseOrderingObservations(cursor);
			const [kind, highlight, raw] = parseOrderingContent(cursor, {
				section: name,
			});
			if (kind !== mainKind) {
				throw new ParseError(
					`[${name}] must use the same content type as [ordering]`,
				);
			}
			checkSectionHighlight(name, highlight, mainHighlight);
			(name === "accept" ? acceptRaw : rejectRaw).push({
				lines: raw,
				feedback,
				comment,
			});
		}
	}

	if (cursor.pos < children.length) {
		throw new ParseError(
			"only [extra], [accept] and [reject] sections can follow the " +
				"first section; the epilogue goes before it",
		);
	}

	// A `ul` line already holds its nesting depth: no unit applies.
	const unit =
		mainKind === "text"
			? 1
			: orderingUnit([
					...mainRaw.map(([indent]) => indent),
					...(extraRaw ?? []).map(([indent]) => indent),
					...[...acceptRaw, ...rejectRaw].flatMap((alt) =>
						alt.lines.map(([indent]) => indent),
					),
				]);

	const doc: Record<string, unknown> = {};
	doc.content = mainKind;
	if (mainHighlight) doc.highlight = mainHighlight;
	for (const key of ["indentation", "unmatched", "incorrectFeedback"]) {
		if (Object.hasOwn(front, key)) doc[key] = front[key];
	}
	if (front.normalizations !== undefined && front.normalizations !== null) {
		doc.normalizations = normalizeList(front.normalizations);
	}

	doc.lines = orderingLeveled(mainRaw, unit);
	if (extraRaw !== null) doc.extra = orderingLeveled(extraRaw, unit);
	if (acceptRaw.length > 0) {
		doc.accept = acceptRaw.map((alt) => orderingAlternative(alt, unit));
	}
	if (rejectRaw.length > 0) {
		doc.reject = rejectRaw.map((alt) => orderingAlternative(alt, unit));
	}
	return [doc, epilogueNodes];
}

/**
 * A section's fence MUST name the language of the `[ordering]` fence or
 * none, which inherits it (ordering.md, "Body").
 *
 * @throws {ParseError} The section's fence names another language.
 */
function checkSectionHighlight(
	name: string,
	highlight: string | null,
	mainHighlight: string | null,
): void {
	if (highlight !== null && highlight !== mainHighlight) {
		throw new ParseError(
			`the fence of [${name}] must use the language of the [ordering] ` +
				`fence (${mainHighlight || "none"}) or none, found ${repr(highlight)}`,
		);
	}
}

/** Whether `node` is an `## [extra]`, `## [accept]` or `## [reject]` heading. */
function isOrderingSection(reader: BlockReader, node: Node): boolean {
	return (
		node.type === "heading" &&
		node.tag === "h2" &&
		ORDERING_SECTION_RE.test(reader.rawText(node))
	);
}

/**
 * Read the fenced code block or `ul` list holding one content block's raw
 * `(indent, text)` lines, with the content kind and the highlight language it
 * implies.
 *
 * @param options.tagNode The `[ordering]` tag paragraph, when reading the
 *   main block: the block must start on the next line.
 * @param options.section The name of the `extra`/`accept`/`reject` section
 *   whose block is read, when reading a section.
 * @throws {ParseError} The current node is neither a fence nor a bullet list,
 *   or a blank line separates the main block from its tag.
 */
function parseOrderingContent(
	cursor: BlockCursor,
	options: { tagNode?: Node; section?: string },
): ["code" | "text", string | null, RawLine[]] {
	const node = cursor.peek();
	if (node === null || (node.type !== "fence" && node.type !== "bullet_list")) {
		if (options.section !== undefined) {
			throw new ParseError(
				`the ## [${options.section}] section has no content block`,
			);
		}
		throw new ParseError(
			"an [ordering] block must be followed by a code block or a list",
		);
	}
	if (options.tagNode !== undefined && !startsAfter(options.tagNode, node)) {
		throw new ParseError(
			"the content of [ordering]: must start on the line right after " +
				"the tag, with no blank line in between",
		);
	}
	cursor.read();
	if (node.type === "bullet_list") cursor.checkNoAdjacentList(node);
	if (node.type === "fence") {
		return [
			"code",
			fenceLanguage(node.info ?? ""),
			orderingCodeLines(node.content ?? ""),
		];
	}
	checkOrderingItemBlocks(cursor.reader, node);
	const depths = new Map<number, number>();
	const parents = new Set<number>();
	collectItemDepths(node, 0, depths, parents);
	return [
		"text",
		null,
		orderingUlLines(
			cursor.reader.rawLines(node),
			depths,
			span(node)[0],
			parents,
		),
	];
}

/**
 * Throw a `ParseError` if an item of the `ul` block `node`, at any depth,
 * holds a block that is neither a paragraph nor a nested list: indented code,
 * a heading, a block quote, a fence, an HTML block or a thematic break
 * (ordering.md, "Body"). An item is one paragraph.
 */
function checkOrderingItemBlocks(reader: BlockReader, node: Node): void {
	for (const item of node.children) {
		if (item.type !== "list_item") continue;
		for (const child of item.children) {
			if (child.type === "bullet_list" || child.type === "ordered_list") {
				checkOrderingItemBlocks(reader, child);
			} else if (child.type !== "paragraph") {
				const line = strip(reader.rawLines(item)[0] ?? "", " \t");
				throw new ParseError(
					`an ordering item is one paragraph, but the item ${repr(line)} ` +
						`holds a ${BLOCK_NAMES[child.type] ?? child.type}`,
				);
			}
		}
	}
}

/**
 * Consume an accept/reject section's optional feedback (`>`) and comment
 * (`!`) blocks, in either order (ordering.md, "Accepted/rejected answers").
 *
 * The blocks are read from the raw lines, not from the markdown nodes: with
 * no blank line between them, CommonMark folds a `!` line into the
 * blockquote before it as a lazy continuation, which the grammar does not do.
 *
 * @throws {ParseError} A section carries more than one feedback or comment
 *   block, or a line that is not part of one.
 */
function parseOrderingObservations(
	cursor: BlockCursor,
): [string | null, string | null] {
	let first: Node | null = null;
	let last: Node | null = null;
	for (;;) {
		const node = cursor.peek();
		if (node === null) break;
		if (
			node.type === "blockquote" ||
			(node.type === "paragraph" &&
				isCommentBlock(cursor.reader.rawLines(node).slice(0, 1)))
		) {
			first ??= node;
			last = node;
			cursor.read();
		} else {
			break;
		}
	}
	if (first === null || last === null) return [null, null];
	return parseObservations(
		cursor.reader.lines.slice(span(first)[0], span(last)[1]),
	);
}
