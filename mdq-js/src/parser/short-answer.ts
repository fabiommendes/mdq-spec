/**
 * The body of a short-answer question, and the pattern blocks that the
 * short-answer blanks of a fill-in question share with it.
 *
 * A port of `mdq-py/mdq/_parser/_short_answer.py`.
 */

import { type Diagnostic, diagnostic } from "../diagnostics.js";
import { ParseError } from "../errors.js";
import { exactLiteral, joinPatternLines } from "../exact.js";
import { startsAfter } from "../markdown.js";
import {
	BLOCK_NAMES,
	type BlockCursor,
	type BlockReader,
	parsePlainItem,
} from "./blocks.js";
import { isCommentLine, type PatternEntry, patternEntry } from "./choices.js";
import { copyPatternLists } from "./frontmatter.js";
import {
	checkNoTagInContent,
	readShortAnswerTag,
	SHORT_ANSWER_RE,
	type ShortAnswerTag,
	TAG_REST_RE,
} from "./tags.js";
import { repr, SPACE, strip } from "./text.js";
import type { Node } from "./tree.js";

const OBSERVATION_AFTER_CONTENT =
	"a line that starts with '>' or '!' cannot follow the content of a " +
	"short answer tag; use the list form ('* pattern' with the '>' or '!' " +
	"lines indented under it)";

/**
 * Read the short-answer fields from a run of `[short-answer...]` blocks.
 *
 * `[short-answer]` (alias `[short-answer/accept]`) gives `accept` and
 * `[short-answer/reject]` gives `reject`, in any order and at most once each.
 * `[short-answer]` without a colon is a block with no pattern
 * (question-base.md, "Body tags").
 *
 * @throws {ParseError} A block is repeated (the two accept spellings count as
 *   one block), a block has a pattern and a list, a tag with a colon has no
 *   content or a blank line separates it from its list, or a reject tag has
 *   no colon.
 */
export function parseShortAnswerBody(
	cursor: BlockCursor,
	front: Readonly<Record<string, unknown>>,
	firstTag: ShortAnswerTag,
	firstNode: Node,
): Record<string, unknown> {
	const doc: Record<string, unknown> = {};
	for (const key of ["diacritics", "unmatched", "incorrectFeedback"]) {
		if (Object.hasOwn(front, key)) doc[key] = front[key];
	}

	const seen = new Set<string>();
	let tag = firstTag;
	let tagNode = firstNode;
	for (;;) {
		if (seen.has(tag.role)) {
			throw new ParseError(`repeated [short-answer] ${tag.role} block`);
		}
		seen.add(tag.role);
		const patterns = parseAnswerBlock(cursor, tagNode, tag.rest, {
			reject: tag.role === "reject",
			tag: "short-answer",
			path: [tag.role],
		});
		if (patterns.length > 0) doc[tag.role] = patterns;

		const node = cursor.peek();
		cursor.reader.checkNoSetextTag(node, SHORT_ANSWER_RE);
		if (node === null || node.type !== "paragraph") break;
		const nextTag = readShortAnswerTag(cursor.reader.rawText(node));
		if (nextTag === null) break;
		tag = nextTag;
		tagNode = cursor.read();
	}

	copyPatternLists(front, doc);
	return doc;
}

/**
 * The content of a short-answer tag: the text after the colon and the
 * continuation lines, joined with one U+0020 each. A line ending and the
 * indentation of the next line become that space (docs/references/patterns.md,
 * "Continuation lines"). `rest` is the text `rawText` gave, whose line endings
 * already are spaces.
 */
function joinContentLines(
	reader: BlockReader,
	tagNode: Node,
	rest: string,
): string {
	const lines = reader.rawLines(tagNode);
	if (lines.length < 2) return strip(rest, " \t");
	const first = TAG_REST_RE.exec(lines[0] ?? "");
	if (first === null) throw new Error("the caller matched a tag");
	return joinPatternLines([first.groups?.rest ?? "", ...lines.slice(1)]);
}

/**
 * Report an exact literal or a regex of the body that spans more than one
 * line: the line ending becomes a significant U+0020 (patterns.md,
 * "Continuation lines").
 */
function warnMultiLinePattern(
	diagnostics: Diagnostic[],
	path: readonly (string | number)[],
	pattern: string,
	lines: number,
): void {
	if (lines > 1 && (pattern.startsWith("`") || pattern.startsWith("/"))) {
		diagnostics.push(
			diagnostic(
				"warning",
				"multi-line-pattern",
				"an exact literal or a regex spans more than one line, so " +
					"each line ending becomes a space that is part of the " +
					`pattern: write it on one line: ${repr(pattern)}`,
				path,
			),
		);
	}
}

/** What `parseAnswerBlock` needs to know about the tag it reads. */
export interface AnswerBlockOptions {
	/** Whether the tag is a `reject` tag. */
	reject: boolean;
	/** The tag without brackets (`short-answer` or `^id/short-answer`). */
	tag: string;
	/** The path of the pattern list in the document. */
	path: readonly (string | number)[];
}

/**
 * Read the patterns of one short-answer tag: the text on its line, or the
 * list on the lines right after it.
 *
 * @param tagNode The paragraph of the tag.
 * @param rest The text after the colon, or `null` for a tag without a colon.
 * @returns The patterns. Empty for a tag without a colon.
 * @throws {ParseError} The tag has text and an attached list; a tag with a
 *   colon has no text and no list on the next line (a blank line before the
 *   list included); a tag without a colon is a `reject` tag, or has a list on
 *   the next line.
 */
export function parseAnswerBlock(
	cursor: BlockCursor,
	tagNode: Node,
	rest: string | null,
	{ reject, tag, path }: AnswerBlockOptions,
): PatternEntry[] {
	if (rest === null) return bareAnswerBlock(cursor, tagNode, reject, tag);
	const reader = cursor.reader;
	const content = joinContentLines(reader, tagNode, rest);
	// The tag paragraph also holds the lazy continuation lines of the content.
	// A `!` line is not lazy (a comment), so it is an error.
	const tagLines = reader.rawLines(tagNode);
	checkNoTagInContent(tagLines.slice(1));
	for (const line of tagLines.slice(1)) {
		if (isCommentLine(line)) throw new ParseError(OBSERVATION_AFTER_CONTENT);
	}
	const node = cursor.peek();
	if (
		node !== null &&
		node.type === "blockquote" &&
		startsAfter(tagNode, node)
	) {
		throw new ParseError(OBSERVATION_AFTER_CONTENT);
	}
	const attached =
		node !== null && node.type === "bullet_list" && startsAfter(tagNode, node);
	if (!content) {
		if (!attached) throw new ParseError(emptyAnswerTagMessage(tag, reject));
	} else if (attached) {
		throw new ParseError(
			`a [${tag}] tag with a pattern on its line cannot be followed by a list`,
		);
	}
	if (!attached) {
		checkExactPattern(content);
		const [tagLine, ...otherLines] = tagLines;
		const first = TAG_REST_RE.exec(tagLine ?? "");
		const contentLines = [first?.groups?.rest ?? "", ...otherLines];
		warnMultiLinePattern(
			cursor.diagnostics,
			[...path, 0],
			content,
			contentLines.filter((line) => strip(line, " \t")).length,
		);
		return [content];
	}
	if (node === null) throw new Error("attached implies a node");
	cursor.read();
	cursor.checkNoAdjacentList(node);
	for (const item of node.children) {
		reader.checkNoSetextItem(item);
		checkPatternItemParagraph(reader, item);
	}
	const rawItems = node.children.map((item) =>
		parsePlainItem(reader.itemLines(item)),
	);
	const entries = rawItems.map(patternEntry);
	for (const [index, entry] of entries.entries()) {
		const pattern = typeof entry === "string" ? entry : entry.pattern;
		checkExactPattern(pattern);
		warnMultiLinePattern(
			cursor.diagnostics,
			[...path, index],
			pattern,
			rawItems[index]?.textLines ?? 0,
		);
	}
	return entries;
}

/**
 * Check a short-answer tag written without a colon. It has no content, so it
 * is no `reject` tag (that one needs patterns) and no list starts on the line
 * after it (the colon is missing).
 */
function bareAnswerBlock(
	cursor: BlockCursor,
	tagNode: Node,
	reject: boolean,
	tag: string,
): PatternEntry[] {
	if (reject) {
		throw new ParseError(
			`[${tag}/reject] needs patterns: write \`[${tag}/reject]:\` ` +
				"followed by a pattern or a list",
		);
	}
	const node = cursor.peek();
	const adjacent = node !== null && startsAfter(tagNode, node);
	if (adjacent && node.type === "bullet_list") {
		throw new ParseError(
			`[${tag}] without a colon has no content: write \`[${tag}]:\` ` +
				"before a list of patterns",
		);
	}
	if (adjacent && node.type === "blockquote") {
		throw new ParseError(
			`a line that starts with '>' cannot follow [${tag}] without a ` +
				`colon: it would be feedback for no pattern; write \`[${tag}]:\` ` +
				"with a pattern or a list, or leave a blank line before the " +
				"epilogue",
		);
	}
	return [];
}

/**
 * Throw a `ParseError` if the content of the pattern item `item` starts with
 * a block that is not a paragraph in CommonMark: a block quote, a heading, a
 * list, a fenced or indented code block, an HTML block or a thematic break
 * (patterns.md, "Pattern items").
 */
export function checkPatternItemParagraph(
	reader: BlockReader,
	item: Node,
): void {
	const first = item.children[0];
	if (first === undefined || first.type === "paragraph") return;
	const line = strip(reader.itemLines(item)[0] ?? "", " \t");
	throw new ParseError(
		`the pattern line ${repr(line)} starts a block of its own ` +
			`(${BLOCK_NAMES[first.type] ?? first.type}) ` +
			"in markdown, so it is not a pattern: write an exact literal " +
			`instead, e.g. \`${line}\``,
	);
}

/**
 * Throw a `ParseError` if `pattern`, a pattern of the Markdown body, opens
 * with a backtick and is not a complete exact literal (patterns.md, "Exact
 * literals"). A literal that opens at the end of a line, or whose closing run
 * starts a continuation line, holds a line feed after the join of the lines.
 * The form of the YAML, JSON and frontmatter has no line ending and stays a
 * `schema-error`.
 */
export function checkExactPattern(pattern: string): void {
	if (!pattern.startsWith("`")) return;
	if (pattern.includes("\n")) {
		throw new ParseError(
			"an exact literal cannot open at the end of a line, nor close at " +
				`the start of a line: ${repr(pattern.split(SPACE_RUN_RE).filter(Boolean).join(" "))}`,
		);
	}
	if (exactLiteral(pattern) === undefined) {
		throw new ParseError(
			"a pattern that opens with a backtick must be a complete exact " +
				`literal: ${repr(pattern)}`,
		);
	}
}

/** A run of `str.isspace` characters, where `str.split()` splits. */
const SPACE_RUN_RE = new RegExp(`[${SPACE}]+`, "u");

/** The error for a short-answer tag with a colon and no content. */
function emptyAnswerTagMessage(tag: string, reject: boolean): string {
	if (reject) {
		return (
			`[${tag}/reject]: has no pattern: write it on the same line ` +
			"or in a list on the line right after the tag"
		);
	}
	return (
		`[${tag}]: has no content: write the answer on the same line or in a ` +
		"list on the line right after the tag, with no blank line in between, " +
		`or use \`[${tag}]\` for a manual question`
	);
}
