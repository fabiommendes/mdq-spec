/**
 * Markdown-level helpers shared by `parser/` and `models/`: the one
 * `markdown-it` instance every MDQ document is parsed with, the blank marker
 * finder, line splitting and the patterns of the grammar terminals.
 *
 * A port of `mdq-py/mdq/_markdown.py`. The instance mirrors
 * `md = MarkdownIt("gfm-like")`.
 *
 * markdown-it-py's `gfm-like` preset (`markdown_it.presets.gfm_like.make`)
 * is CommonMark plus GFM tables, strikethrough and linkify -- which, on
 * this library's own rule catalog (there is no rule beyond this set to add
 * for either language), enables every block and every inline rule
 * (`rules` and `rules2`) markdown-it ships. The JS `"default"` preset
 * already enables that same full catalog with no restriction of its own
 * (unlike Python's `"default"`/`"commonmark"`, which deliberately hold
 * `table`/`strikethrough` back), so no per-rule `.enable()` call is needed
 * to reach it -- only the two rules Python's preset leaves out.
 *
 * `replacements`/`smartquotes` (`typographer`'s core rules) are inert
 * either way since `typographer` is `false`, but Python's preset never
 * enables them in the first place, so they are disabled here too, to
 * match which rules are *active*, not just which are no-ops.
 *
 * `reference` is disabled for a different reason -- MDQ's own tags
 * (`[short-answer]: ...`, `[numeric]: ...`, `[^blank]: ...`) are
 * syntactically indistinguishable from CommonMark link reference
 * definitions, which are otherwise consumed silently with no token emitted
 * at all. Disabling it lets these lines survive as ordinary paragraphs for
 * the parser to pattern-match. `mdq-py/mdq/_markdown.py` disables it for
 * the same reason.
 */

import MarkdownIt, { type Options } from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";
import type Token from "markdown-it/lib/token.mjs";
import { rstrip, SPACE, strip, UNICODE_SPACE } from "./parser/text.js";
import type { Node } from "./parser/tree.js";

export { UNICODE_SPACE };

/**
 * `markdown_it.presets.gfm_like.make()["options"]`, read off a running
 * instance (`uv run python -c "from markdown_it import MarkdownIt as M;
 * print(M('gfm-like').options)"`). `maxNesting` is missing from
 * markdown-it JS's own `Options` type even though the option itself exists
 * and is honored the same as in markdown-it-py -- hence the intersection
 * type, so the object literal below can carry it without an excess-property
 * error while still reaching the constructor as a plain object.
 */
const options: Options & { maxNesting: number } = {
	maxNesting: 20,
	html: true,
	linkify: true,
	typographer: false,
	quotes: "“”‘’",
	xhtmlOut: true,
	breaks: false,
	langPrefix: "language-",
	highlight: null,
};

export const md: MarkdownIt = new MarkdownIt("default", options);
md.block.ruler.disable("reference");
md.core.ruler.disable(["replacements", "smartquotes"]);

/** The `SLUG` terminal of docs/references/grammar.md, unanchored. */
export const SLUG_BODY_RE = "[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*";

/** `SLUG_BODY_RE` anchored: the schema's `pattern` on a choice or blank `id`. */
export const SLUG_PATTERN = `^${SLUG_BODY_RE}$`;

/**
 * generic.md: `uuid` MUST be `xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`
 * (hexadecimal digits). `M` is the version and `N` the variant, at indexes
 * 14 and 19 of a match.
 */
export const UUID_RE =
	/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/u;

/**
 * One line and its line ending. Only `\r\n`, `\r` and `\n` end a line, as in
 * CommonMark and markdown-it.
 */
const LINE_RE = /[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/gu;

const BOM = "﻿";

/** The source lines of a block node: `[start, end)`, `end` exclusive. */
export function span(node: Node): readonly [number, number] {
	// markdown-it sets the line map of every block node.
	if (node.map === null) throw new Error("block node without a line map");
	return node.map;
}

/** Whether `node` starts on the line right after `previous` ends. */
export function startsAfter(previous: Node, node: Node): boolean {
	return span(node)[0] === span(previous)[1];
}

/**
 * Store the content column of a list item in the `meta` of its token.
 *
 * The list rule of markdown-it opens an item, sets `blkIndent` to the column
 * where the content of the item starts (after the list marker and its
 * padding, as CommonMark defines it) and then parses the content. This rule
 * runs first on the first line of that content and copies the column to
 * `meta.indent`. It never consumes a line.
 */
function recordItemIndent(
	state: StateBlock,
	_startLine: number,
	_endLine: number,
	silent: boolean,
): boolean {
	const token = state.tokens[state.tokens.length - 1];
	if (!silent && token?.type === "list_item_open") {
		const meta = (token.meta ?? {}) as Record<string, unknown>;
		if (!("indent" in meta)) token.meta = { ...meta, indent: state.blkIndent };
	}
	return false;
}

md.block.ruler.before("table", "mdq_item_indent", recordItemIndent);

/**
 * `[^id]` markers, as written in a fill-in stem. The id is a `SLUG`
 * (base.md, "Bracketed tags"): `[^ a]` and `[^-x]` are ordinary text. A `]`
 * followed by `(` or `[` starts a markdown link (`[^x](url)`, `[^x][ref]`),
 * so that is not a blank (fill-in.md, "Stem").
 */
const BLANK_MARKER_SOURCE = `\\[\\^(${SLUG_BODY_RE})\\](?![(\\[])`;
const BLANK_MARKER_RE = new RegExp(BLANK_MARKER_SOURCE, "gu");
const BLANK_MARKER_STICKY_RE = new RegExp(BLANK_MARKER_SOURCE, "yu");

/**
 * The `markup` of the `link_open` token of an autolink: `<https://...>` and
 * the bare URL or `www.` address of GFM.
 */
const AUTOLINK_MARKUPS: ReadonlySet<string> = new Set(["autolink", "linkify"]);

/**
 * Key of `env` where `noteBlankPosition` records the offsets of the `[^id]`
 * candidates: `{inline source: set of offsets}`.
 */
const POSITIONS_KEY = "mdq_blank_positions";

type Positions = Map<string, Set<number>>;

/**
 * Record the offset of a `[^id]` candidate in `env`, when `env` asks for it.
 *
 * markdown-it does not keep source offsets in its tokens. The inline rules
 * reach a candidate only when it is not inside code or an autolink, so the
 * offsets recorded here are the ones `locateBlankMarkers` needs. It never
 * consumes any text.
 */
function noteBlankPosition(state: StateInline, _silent: boolean): boolean {
	const positions = (state.env as Record<string, unknown>)[POSITIONS_KEY] as
		| Positions
		| undefined;
	if (positions === undefined) return false;
	BLANK_MARKER_STICKY_RE.lastIndex = state.pos;
	if (BLANK_MARKER_STICKY_RE.test(state.src)) {
		let offsets = positions.get(state.src);
		if (offsets === undefined) {
			offsets = new Set();
			positions.set(state.src, offsets);
		}
		offsets.add(state.pos);
	}
	return false;
}

md.inline.ruler.before("link", "mdq_blank_position", noteBlankPosition);

/** One `[^id]` marker of a stem, as `locateBlankMarkers` reports it. */
export interface BlankMarker {
	readonly id: string;
	/** Whether the marker sits where fill-in.md does not allow a blank. */
	readonly misplaced: boolean;
	/**
	 * `[start, end)` offsets (UTF-16 code units) of the marker in the text.
	 * `null` when the marker cannot be located (an escaped `\[^id]`).
	 */
	readonly span: readonly [number, number] | null;
}

/**
 * fill-in.md, "Where blanks may appear": find the `[^id]` markers of a stem,
 * tell which ones are misplaced and where each one is.
 *
 * The inline parse of each paragraph comes first (CommonMark). A marker is
 * misplaced if it sits in a heading, list item, table cell or blockquote, or
 * inside emphasis, a strong span, link text or image alt text. Code (fenced,
 * indented or a code span) and the text of an autolink (`<https://...>`, a
 * bare URL, a `www.` address) are literal: they hold no marker. `[^x](url)`
 * and `[^x][ref]` are links, not markers.
 *
 * @param text A fill-in question's stem.
 * @returns A `BlankMarker` for every marker, in source order (an id may
 *   appear more than once).
 */
export function locateBlankMarkers(text: string): BlankMarker[] {
	const positions: Positions = new Map();
	const tokens = md.parse(text, { [POSITIONS_KEY]: positions });
	const lineStarts = [0];
	for (const line of splitLines(text, true)) {
		lineStarts.push((lineStarts[lineStarts.length - 1] ?? 0) + line.length);
	}
	const found: BlankMarker[] = [];
	const openBlocks: string[] = [];
	for (const blockToken of tokens) {
		if (blockToken.nesting === 1) {
			openBlocks.push(blockToken.type);
		} else if (blockToken.nesting === -1) {
			openBlocks.pop();
		} else if (
			blockToken.type === "inline" &&
			blockToken.children !== null &&
			blockToken.children.length > 0
		) {
			const inParagraph =
				openBlocks.length === 1 && openBlocks[0] === "paragraph_open";
			const markers = markersInInline(blockToken.children, !inParagraph);
			const offsets = [...(positions.get(blockToken.content) ?? [])].sort(
				(a, b) => a - b,
			);
			for (const [id, misplaced, markerSpan] of placeMarkers(
				markers,
				offsets,
				blockToken,
				text,
				lineStarts,
			)) {
				found.push({ id, misplaced, span: markerSpan });
			}
		}
	}
	return found;
}

/** Pair the markers of one inline token with their offsets in `text`. */
function placeMarkers(
	markers: readonly (readonly [string, boolean])[],
	offsets: readonly number[],
	blockToken: Token,
	text: string,
	lineStarts: readonly number[],
): [string, boolean, readonly [number, number] | null][] {
	const placed: [string, boolean, readonly [number, number] | null][] = [];
	const content = blockToken.content;
	let cursor = 0;
	for (const [name, misplaced] of markers) {
		const literal = `[^${name}]`;
		let markerSpan: readonly [number, number] | null = null;
		for (let index = cursor; index < offsets.length; index++) {
			const offset = offsets[index] ?? 0;
			if (content.startsWith(literal, offset)) {
				cursor = index + 1;
				const start = sourceOffset(blockToken, text, lineStarts, offset);
				if (start !== null && text.startsWith(literal, start)) {
					markerSpan = [start, start + literal.length];
				}
				break;
			}
		}
		placed.push([name, misplaced, markerSpan]);
	}
	return placed;
}

/**
 * Map an offset in the content of an inline token to an offset in `text`.
 *
 * The content is the source lines of the block with their prefix (indent,
 * list marker, `#`) removed, so each content line is found in the source
 * line of the same index. Returns `null` when it is not found there.
 */
function sourceOffset(
	blockToken: Token,
	text: string,
	lineStarts: readonly number[],
	offset: number,
): number | null {
	if (blockToken.map === null) return null;
	const content = blockToken.content;
	const before = content.slice(0, offset);
	const lineIndex = before.split("\n").length - 1;
	const column = offset - (before.lastIndexOf("\n") + 1);
	const sourceLineIndex = blockToken.map[0] + lineIndex;
	if (sourceLineIndex >= lineStarts.length - 1) return null;
	const contentLine = content.split("\n")[lineIndex] ?? "";
	const lineStart = lineStarts[sourceLineIndex] ?? 0;
	const lineEnd = lineStarts[sourceLineIndex + 1] ?? lineStart;
	const sourceLine = text.slice(lineStart, lineEnd).replace(/[\r\n]+$/u, "");
	let shift = -1;
	for (const candidate of [sourceLine, rstrip(sourceLine)]) {
		if (candidate.endsWith(contentLine)) {
			shift = candidate.length - contentLine.length;
			break;
		}
	}
	if (shift < 0) {
		shift = sourceLine.indexOf(contentLine);
		if (shift < 0) return null;
	}
	return lineStart + shift + column;
}

/**
 * fill-in.md, "Where blanks may appear": find the `[^id]` markers of a stem
 * and tell which ones are misplaced. See `locateBlankMarkers`.
 *
 * @returns An `[id, misplaced]` pair for every marker, in source order.
 */
export function findBlankMarkers(text: string): [string, boolean][] {
	return locateBlankMarkers(text).map((m) => [m.id, m.misplaced]);
}

/** The ids of the markers that `findBlankMarkers` reports as misplaced. */
export function findMisplacedBlankMarkers(text: string): string[] {
	return findBlankMarkers(text)
		.filter(([, misplaced]) => misplaced)
		.map(([name]) => name);
}

/** Markers of one inline run, flagged when outside plain paragraph text. */
function markersInInline(
	children: readonly Token[],
	misplaced: boolean,
): [string, boolean][] {
	const found: [string, boolean][] = [];
	let depth = 0;
	// Depth at which an autolink opened; its text is the address, literal.
	let autolinkDepth: number | null = null;
	for (const token of children) {
		if (token.nesting === 1) {
			depth++;
			if (autolinkDepth === null && AUTOLINK_MARKUPS.has(token.markup)) {
				autolinkDepth = depth;
			}
		} else if (token.nesting === -1) {
			if (depth === autolinkDepth) autolinkDepth = null;
			depth--;
		} else if (autolinkDepth !== null) {
			// The text of an autolink is the address, literal.
		} else if (token.type === "image") {
			// Alt text: the children are the inline tokens of the label.
			found.push(...markersInInline(token.children ?? [], true));
		} else if (token.type === "text") {
			for (const match of token.content.matchAll(BLANK_MARKER_RE)) {
				found.push([match[1] ?? "", misplaced || depth > 0]);
			}
		}
	}
	return found;
}

/**
 * Split `text` into lines at `\r\n`, `\r` and `\n` only. Like Python's
 * `str.splitlines()`, a line ending at the end of `text` does not start one
 * more, empty line, and an empty `text` has no line.
 *
 * @param keepends Keep the line ending at the end of each line.
 *
 * @example
 * splitLines("a\r\nb\x85c\rd\n"); // ["a", "b\x85c", "d"]
 * splitLines("a\n\nb", true); // ["a\n", "\n", "b"]
 */
export function splitLines(text: string, keepends = false): string[] {
	const lines = text.match(LINE_RE) ?? [];
	return keepends ? lines : lines.map((line) => line.replace(/[\r\n]+$/u, ""));
}

/**
 * Remove the byte order mark (U+FEFF) at the start of `text`, if any.
 *
 * docs/references/grammar.md: implementations remove it before they parse a
 * file. A U+FEFF anywhere else is text.
 */
export function stripBom(text: string): string {
	return text.startsWith(BOM) ? text.slice(BOM.length) : text;
}

/**
 * Report whether `pattern` is an inexact literal whose text starts a
 * CommonMark block other than a paragraph (patterns.md, "Pattern string").
 * An exact literal (opens with a backtick) and a regex (opens with `/`) are
 * never concerned.
 */
export function startsBlock(pattern: string): boolean {
	const text = strip(pattern, " \t");
	if (text.startsWith("`") || text.startsWith("/")) return false;
	const first = md.parse(text, {})[0];
	return first !== undefined && first.type !== "paragraph_open";
}

const SPACE_CHAR_RE = new RegExp(`^[${SPACE}]$`, "u");
const INVISIBLE_RE = /^[\p{Cc}\p{Cf}]$/u;

/**
 * Whether `value` has a visible character, as grammar.md "Visible
 * characters" defines it: not white space, and not a control (`Cc`) or
 * format (`Cf`) character such as U+200B.
 */
export function hasVisibleCharacter(value: string): boolean {
	for (const char of value) {
		if (!SPACE_CHAR_RE.test(char) && !INVISIBLE_RE.test(char)) return true;
	}
	return false;
}
