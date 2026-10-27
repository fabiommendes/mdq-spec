/**
 * The top-level blocks of a Markdown text (`BlockReader`) and the field
 * helpers built on them: the reconstruction of the text of a block and the
 * checks of the `stem`, `epilogue` and `answerKey` fields shared with
 * `models/`.
 *
 * A port of `mdq-py/mdq/_parser/_blocks.py`.
 */

import MarkdownIt from "markdown-it";
import type { Diagnostic } from "../diagnostics.js";
import { ParseError } from "../errors.js";
import { joinPatternLines } from "../exact.js";
import { md, span, splitLines } from "../markdown.js";
import {
	CODE_INDENT,
	dedent,
	indentation,
	isChoiceValue,
	LINK_START_RE,
	matchChoiceMarker,
	parseMarker,
	type RawChoice,
	splitItem,
} from "./choices.js";
import { isReservedLabel, tagLines } from "./tags.js";
import { lstrip, repr, rstrip, strip } from "./text.js";
import { buildTree, type Node } from "./tree.js";

// The markers around the text of an ATX heading.
const ATX_OPENING_RE = /^[ \t]*#{1,6}/u;
const ATX_CLOSING_RE = /(?:[ \t]+#+)?[ \t]*$/u;
/** Reads link reference definitions, which `md` leaves as paragraphs. */
const REFERENCE_MD = new MarkdownIt("commonmark");

/** Readable names of the blocks that can start a pattern or an ordering item. */
export const BLOCK_NAMES: Readonly<Record<string, string>> = {
	blockquote: "block quote",
	heading: "heading",
	bullet_list: "list",
	ordered_list: "list",
	fence: "fenced code block",
	code_block: "code block",
	html_block: "HTML block",
	hr: "thematic break",
};

/** The error for a line of `text` that a setext underline turned into a heading. */
export function setextMessage(text: string): string {
	return (
		`the line ${repr(text)} became a setext heading because the next line is ` +
		"'---' or '==='; add a blank line between them"
	);
}

/**
 * The top-level blocks of a Markdown text, with the helpers that rebuild
 * their source text.
 *
 * The text is read as is: a leading `---` is a thematic break, not a
 * frontmatter. `MDQParser` splits the frontmatter off first and reads the
 * body; the field helpers read a `stem`, `epilogue` or `answerKey` field.
 */
export class BlockReader {
	/** The top-level markdown-it block nodes. */
	readonly children: readonly Node[];
	/** The raw source lines, indexed by `node.map`. */
	readonly lines: readonly string[];

	constructor(readonly text: string) {
		this.children = buildTree(md.parse(text, {}));
		this.lines = splitLines(text);
	}

	rawLines(node: Node): string[] {
		const [start, end] = span(node);
		return this.lines.slice(start, end);
	}

	/**
	 * The source text of a paragraph or an ATX heading, before markdown-it
	 * trims it.
	 *
	 * Only the text of the block itself: the `#` markers and the closing
	 * sequence of a heading are removed. `null` for other blocks.
	 */
	inlineSource(node: Node): string | null {
		const lines = this.rawLines(node);
		const first = lines[0];
		if (first === undefined) return null;
		if (node.type === "paragraph") return lines.join("\n");
		if (node.type === "heading" && node.markup.startsWith("#")) {
			return first.replace(ATX_OPENING_RE, "").replace(ATX_CLOSING_RE, "");
		}
		return null;
	}

	/**
	 * Reconstruct a block's text like the original source.
	 *
	 * Prefer the block's inline child's `.content`: it is markdown-it's own
	 * raw-source text for the block with the block-level markup (heading
	 * `#`s, list markers, blockquote `>`s) already peeled off, which is more
	 * reliable than re-slicing lines ourselves for anything but a plain
	 * paragraph.
	 */
	rawText(node: Node): string {
		const inline = node.children[0];
		if (inline !== undefined && inline.type === "inline") {
			let content = inline.content ?? "";
			const source = this.inlineSource(node);
			if (source !== null) content = restoreTrimmed(content, source);
			return joinSoftBreaks(content);
		}
		const lines = this.rawLines(node);
		// markdown-it's `.map` for a list (bullet or ordered) that is not the
		// last block in the document extends one line past the list's own
		// content, into the blank line that follows it. Trailing blank lines
		// are never part of a block's own content, so dropping them is always
		// correct. CommonMark treats only spaces and tabs as blank, not
		// Unicode whitespace such as NBSP.
		while (lines.length > 0 && !strip(lines[lines.length - 1] ?? "", " \t")) {
			lines.pop();
		}
		return lines.join("\n");
	}

	/**
	 * A block's text as it reads in a `stem`, `epilogue` or `answerKey` field:
	 * `rawText`, plus the `#` markers of an ATX heading, which stay part of
	 * the field and the source lines (underline included) of a setext
	 * heading, so a heading is still a heading when the field is parsed
	 * again.
	 */
	blockText(node: Node): string {
		const text = this.rawText(node);
		if (node.type === "heading" && node.markup.startsWith("#")) {
			return `${node.markup} ${text}`;
		}
		if (node.type === "heading") {
			// A setext heading: keep the underline, or the heading turns into a
			// paragraph (an H1 would go unreported).
			return this.rawLines(node).join("\n");
		}
		return text;
	}

	joinBlocks(nodes: readonly Node[]): string | null {
		if (nodes.length === 0) return null;
		return nodes.map((n) => this.blockText(n)).join("\n\n");
	}

	/**
	 * The content lines of a list item, as CommonMark gives them (grammar.md,
	 * "Content of a list item"): the first line without the list marker and
	 * its padding, the other lines without the indentation of the item
	 * content. Trailing blank lines are dropped.
	 *
	 * The content column comes from markdown-it (`meta.indent`, see
	 * `markdown.ts`). An empty first line has none: CommonMark then puts the
	 * content one column after the marker.
	 */
	itemLines(item: Node): string[] {
		const lines = this.rawLines(item);
		while (lines.length > 0 && !strip(lines[lines.length - 1] ?? "", " \t")) {
			lines.pop();
		}
		const head = lines[0];
		if (head === undefined) return [""];
		const marker = head.length - lstrip(head, " \t").length;
		const first = `${head.slice(0, marker)} ${head.slice(marker + 1)}`;
		const indent = item.meta.indent;
		const column = typeof indent === "number" ? indent : indentation(head) + 2;
		return [
			dedent(first, column),
			...lines.slice(1).map((line) => dedent(line, column)),
		];
	}

	/**
	 * Throw a `ParseError` if `node` is a setext heading whose first line is a
	 * tag that `pattern` matches: the line after the tag content was a setext
	 * underline (short-answer.md, "Pattern lines").
	 */
	checkNoSetextTag(node: Node | null, pattern: RegExp): void {
		if (
			node === null ||
			node.type !== "heading" ||
			(node.markup !== "-" && node.markup !== "=")
		) {
			return;
		}
		const firstLine = this.rawLines(node)[0];
		if (firstLine !== undefined && pattern.test(strip(firstLine, " \t"))) {
			throw new ParseError(setextMessage(strip(firstLine, " \t")));
		}
	}

	/**
	 * Throw a `ParseError` if a setext underline follows the text of the list
	 * item `item`: CommonMark turns the text into a heading (grammar.md,
	 * "Feedback and comment lines").
	 */
	checkNoSetextItem(item: Node): void {
		for (const child of item.children) {
			if (
				child.type === "heading" &&
				(child.markup === "-" || child.markup === "=")
			) {
				const text = this.rawLines(child)[0];
				throw new ParseError(setextMessage(strip(text ?? "", " \t")));
			}
		}
	}
}

/**
 * A cursor over the top-level blocks of a question body.
 *
 * `diagnostics` holds the warnings found while reading, appended in order;
 * `pos` is the index of the next unread node in `reader.children`.
 */
export class BlockCursor {
	pos = 0;

	constructor(
		readonly reader: BlockReader,
		readonly diagnostics: Diagnostic[] = [],
	) {}

	/**
	 * Consume and return the current node, advancing the cursor.
	 *
	 * @throws {ParseError} If the cursor is already exhausted.
	 */
	read(): Node {
		const node = this.peek();
		if (node === null) throw new ParseError("unexpected end of document");
		this.pos += 1;
		return node;
	}

	/** Return the current node without consuming it, or `null` at the end. */
	peek(): Node | null {
		return this.reader.children[this.pos] ?? null;
	}

	/**
	 * Consume and return the current node if it has type `nodeType`.
	 *
	 * @throws {ParseError} If the cursor is exhausted or the current node's
	 *   type does not match `nodeType`.
	 */
	expect(nodeType: string, errorMsg: string): Node {
		const node = this.peek();
		if (node === null || node.type !== nodeType) {
			throw new ParseError(errorMsg);
		}
		return this.read();
	}

	/**
	 * Throw a `ParseError` if a list starts on the line right after the
	 * content list `content`. In CommonMark a change of the list marker (`*`
	 * to `-`, or to `1.`) starts a new list, and that list would go to the
	 * epilogue with no sign: an item would leave the answer.
	 */
	checkNoAdjacentList(content: Node): void {
		const node = this.peek();
		if (node === null) return;
		// The map of a list includes the blank lines inside it.
		const [start, endLine] = span(content);
		let end = endLine;
		while (end > start && !strip(this.reader.lines[end - 1] ?? "", " \t")) {
			end--;
		}
		if (
			(node.type === "bullet_list" || node.type === "ordered_list") &&
			span(node)[0] === end
		) {
			throw new ParseError(
				"use the same list marker for every item, or separate the " +
					"epilogue with a blank line",
			);
		}
	}
}

/** Parse the items of a choice list (choices.md, "Item"). */
export function parseItemList(reader: BlockReader, node: Node): RawChoice[] {
	for (const item of node.children) reader.checkNoSetextItem(item);
	return node.children.map((item) => parseItem(reader.itemLines(item)));
}

/**
 * Parse the content lines of one choice (choices.md, "Item").
 *
 * @throws {ParseError} The item does not start with a choice marker, the
 *   marker is empty, or the lines after the text are not one feedback block
 *   and one comment block.
 */
function parseItem(itemLines: readonly string[]): RawChoice {
	const { marker, id, rest } = parseMarker(itemLines[0] ?? "");
	const choice = splitItem(rest, itemLines.slice(1));
	choice.value = marker;
	choice.explicitId = id;
	return choice;
}

/**
 * Parse the content lines of a list item with no `[value]` marker, e.g. a
 * pattern line.
 *
 * @throws {ParseError} The lines after the text are not one feedback block
 *   and one comment block.
 */
export function parsePlainItem(itemLines: readonly string[]): RawChoice {
	return splitItem(itemLines[0] ?? "", itemLines.slice(1), joinPatternLines);
}

//
// Block reconstruction, shared with models/
//
/**
 * Parse `src` as a standalone sequence of top-level Markdown blocks and
 * reconstruct each one exactly as it would read after being embedded in a
 * full MDQ document and parsed back out.
 *
 * This is `BlockReader.rawText`, applied to every top-level block `src`
 * parses into: a plain paragraph's soft-wrapped lines collapse to single
 * spaces, while a list, blockquote, heading or code block is reproduced
 * byte-for-byte. It exists so `models/` can canonicalize a `stem`/`epilogue`
 * field into the fixed point a render-then-parse round trip actually
 * produces, using the parser's own reconstruction rules.
 *
 * @param src Markdown source for a stem or epilogue -- a sequence of block
 *   elements with no YAML frontmatter of its own. A leading `---` is a
 *   thematic break.
 * @returns One `[nodeType, text]` pair per top-level block found in `src`,
 *   in source order.
 */
export function reconstructBlocks(src: string): [string, string][] {
	const reader = new BlockReader(src);
	return reader.children.map((node) => [node.type, reader.blockText(node)]);
}

/**
 * Join the soft line breaks of a paragraph into one space.
 *
 * A hard break (two or more spaces, or an unescaped `\`, before the line
 * ending) is kept byte for byte, line ending included (question-base.md,
 * "Stem").
 */
function joinSoftBreaks(content: string): string {
	const lines = content.split("\n");
	let out = lines[0] ?? "";
	for (const line of lines.slice(1)) {
		const trailingBackslashes = out.length - out.replace(/\\+$/u, "").length;
		const hard = out.endsWith("  ") || trailingBackslashes % 2 === 1;
		out += (hard ? "\n" : " ") + line;
	}
	return out;
}

/**
 * Put back the Unicode spaces that markdown-it trimmed from `content`.
 *
 * markdown-it trims a paragraph or a heading, which also removes Unicode
 * spaces such as U+00A0. CommonMark and docs/references/grammar.md trim only
 * spaces, tabs and line endings, so these characters are text and stay in the
 * block.
 *
 * JavaScript `trim` and Python `strip` differ at the ends of the content
 * (U+FEFF, U+001C to U+001F, U+0085), so `content` is first brought to the
 * Python form: stripped with `strip`, with a U+FEFF that `trim` removed put
 * back.
 *
 * @param content The trimmed text that markdown-it gives for the block.
 * @param source The source text of the same block.
 * @returns `content`, with the Unicode spaces at the start and at the end of
 *   `source` put back.
 */
function restoreTrimmed(content: string, source: string): string {
	const inner = strip(source, " \t\r\n");
	if (!strip(inner)) return inner;
	const lead = inner.slice(0, inner.length - lstrip(inner).length);
	const trail = inner.slice(rstrip(inner).length);
	const core = inner.slice(lead.length, inner.length - trail.length);
	let text = strip(content);
	if (core.startsWith("﻿") && !text.startsWith("﻿")) {
		text = `﻿${text}`;
	}
	if (core.endsWith("﻿") && !text.endsWith("﻿")) {
		text = `${text}﻿`;
	}
	return lead + text + trail;
}

/**
 * Whether `text` starts with optional `ws` and a `[` that does not start a
 * markdown link (question-base.md, "Forbidden elements").
 */
function startsWithBracket(text: string): boolean {
	const stripped = lstrip(text, " \t");
	return stripped.startsWith("[") && !LINK_START_RE.test(stripped);
}

/**
 * The text of the paragraph `src` after its leading CommonMark link reference
 * definitions (`[inpe]: https://www.inpe.br`), or an empty string when the
 * paragraph holds only definitions.
 *
 * `md` does not read definitions, so that MDQ tags such as `[numeric]: 42`
 * stay paragraphs; `REFERENCE_MD` does.
 */
function afterReferenceDefinitions(src: string): string {
	for (const token of REFERENCE_MD.parse(src, {})) {
		if (token.type === "inline") return token.content;
	}
	return "";
}

/**
 * base.md, "Forbidden elements": return a human-readable description of every
 * forbidden top-level block construct in `src` -- a stem or epilogue field,
 * checked on its own.
 *
 * The forbidden constructs are: an H1 heading; a heading starting with
 * optional whitespace and `[`; an unordered list whose items all start with
 * optional whitespace and `[`; and a paragraph starting with optional
 * whitespace and `[`, unless it is immediately followed by `^` (the fill-in
 * blank marker syntax) or -- see `allowFirstParagraphBracket` -- it is
 * `src`'s own first block (the slug syntax, base.md "Slug"). A `[` that
 * starts a markdown link (`[text](url)`, `[text][ref]`) does not count, and
 * neither does a paragraph of CommonMark link reference definitions
 * (`[inpe]: https://www.inpe.br`) with no reserved tag label.
 *
 * @param src Markdown source for one field -- no YAML frontmatter.
 * @param allowFirstParagraphBracket Exempt a leading `[...]` paragraph as a
 *   possible slug. Only the stem's own first block qualifies -- pass `true`
 *   for the stem, `false` for the epilogue, which is never that first block.
 * @returns One description per forbidden block found, in source order. Empty
 *   when `src` is blank or holds nothing forbidden.
 */
export function findForbiddenElements(
	src: string,
	allowFirstParagraphBracket = false,
): string[] {
	if (!strip(src)) return [];

	const reader = new BlockReader(src);
	const forbidden: string[] = [];
	for (const [index, node] of reader.children.entries()) {
		if (node.type === "heading") {
			if (node.tag === "h1") {
				forbidden.push("an H1 heading");
			} else if (startsWithBracket(reader.rawText(node))) {
				forbidden.push("a heading starting with '['");
			}
			continue;
		}

		if (
			node.type === "bullet_list" &&
			node.children.every((item) => {
				const first = reader.itemLines(item)[0] ?? "";
				return indentation(first) < CODE_INDENT && startsWithBracket(first);
			})
		) {
			forbidden.push("an unordered list whose items all start with '['");
			continue;
		}

		if (node.type === "paragraph") {
			const text = reader.rawText(node);
			const stripped = lstrip(text, " \t");
			if (!startsWithBracket(stripped)) continue;
			const hasTag = tagLines(text, reader.rawLines(node)).some(([label]) =>
				isReservedLabel(label),
			);
			if (
				!hasTag &&
				!startsWithBracket(
					afterReferenceDefinitions(reader.rawLines(node).join("\n")),
				)
			) {
				continue;
			}
			if (stripped.startsWith("[^")) continue;
			if (index === 0 && allowFirstParagraphBracket) continue;
			forbidden.push("a paragraph starting with '['");
		}
	}
	return forbidden;
}

/**
 * essay.md, "Answer key": the section holds every block except an H1
 * heading. Return one description per H1 heading (ATX or setext) in `src`, an
 * `answerKey` field checked on its own, in source order.
 */
export function findAnswerKeyForbiddenElements(src: string): string[] {
	if (!strip(src)) return [];
	const reader = new BlockReader(src);
	return reader.children
		.filter((node) => node.type === "heading" && node.tag === "h1")
		.map(() => "an H1 heading");
}

/**
 * question-base.md, "Forbidden elements": return the choice marker of every
 * stray item in `src`, a stem or epilogue field.
 *
 * A stray item belongs to a top-level unordered list in which some items, but
 * not all, start with a choice marker, and its marker holds the value of a
 * choice type or is empty (`isChoiceValue`). Such a list is valid prose, but
 * it is almost always a broken choice list.
 *
 * @param src Markdown source for one field -- no YAML frontmatter.
 * @returns The marker of each stray item, such as `[x]`, in source order.
 */
export function findStrayChoiceMarkers(src: string): string[] {
	if (!strip(src)) return [];
	const reader = new BlockReader(src);
	const stray: string[] = [];
	for (const node of reader.children) {
		if (node.type !== "bullet_list") continue;
		const markers = node.children.map((item) =>
			matchChoiceMarker(reader.itemLines(item)[0] ?? ""),
		);
		if (markers.every((m) => m !== null)) continue;
		for (const m of markers) {
			if (m !== null && isChoiceValue(m.groups?.value ?? "")) {
				stray.push(m[0]);
			}
		}
	}
	return stray;
}
