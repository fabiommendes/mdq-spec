/**
 * The `## [attachments]` section (question-base.md, "Attachments") and the
 * helpers that the sections of a question share: the heading of a section,
 * the split of the blocks into sections, and the paragraph with one link that
 * both `## [tests]` and `## [attachments]` read.
 *
 * A port of `mdq-py/mdq/_parser/_attachments.py`.
 */

import MarkdownIt from "markdown-it";
import { ParseError } from "../errors.js";
import { hasVisibleCharacter, md } from "../markdown.js";
import {
	BLOCK_NAMES,
	type BlockCursor,
	type BlockReader,
	lineOf,
} from "./blocks.js";
import { repr, strip, UNICODE_SPACE } from "./text.js";
import type { Node } from "./tree.js";

/** The name of the section that every question type and the exam have. */
export const ATTACHMENTS = "attachments";

/** The text of the heading of a section: `[name]` alone. */
const SECTION_RE: RegExp = /^\[(?<name>[^[\]]+)\]$/u;

/**
 * The `ORIGIN` terminal of docs/question-types/code.md, after the reading of
 * the destination of the link.
 */
export const ORIGIN_RE: RegExp =
	/^(?![A-Za-z][A-Za-z0-9+.-]*:)(?!\/)[^?#]*[.][^./?#]+$/u;
const SCHEME_RE: RegExp = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

/** A character that a name of an attachment cannot have, besides `/` and `\`. */
const NAME_FORBIDDEN_RE: RegExp = new RegExp(`[${UNICODE_SPACE}\`]`, "u");

/**
 * Reads a paragraph as CommonMark does, keeping the destination of a link as
 * the author wrote it. `normalizeLink` would percent-encode it, and the origin
 * is an opaque key: MDQ does not decode or encode it. Link reference
 * definitions are off, so `[t][ref]` is text.
 */
const LINK_MD: MarkdownIt = new MarkdownIt("commonmark");
LINK_MD.normalizeLink = (url: string): string => url;
LINK_MD.block.ruler.disable("reference");

/** An attachment of the parsed data: `text` or `origin`, never both. */
export interface AttachmentDict {
	name: string;
	format: string;
	text?: string;
	origin?: string;
	label?: string;
}

/** One section of a question: its name, its heading and its blocks. */
export interface Section {
	name: string;
	heading: Node;
	blocks: Node[];
}

/**
 * The name of the section that `node` opens, if it is the H2 heading (ATX or
 * setext) of a section in `names`, else `null`. An escaped heading,
 * `## \[name]`, opens no section.
 */
export function sectionName(
	reader: BlockReader,
	node: Node,
	names: ReadonlySet<string>,
): string | null {
	if (node.type !== "heading" || node.tag !== "h2") return null;
	const name = SECTION_RE.exec(reader.rawText(node))?.groups?.name;
	return name !== undefined && names.has(name) ? name : null;
}

/**
 * Read the rest of a question as an epilogue and a sequence of sections.
 *
 * The epilogue holds the blocks before the first heading of a section in
 * `names`. Each section holds the blocks up to the next such heading or the
 * end of the question. The cursor ends at the end of the question.
 *
 * @throws {ParseError} A section is declared twice.
 */
export function splitSections(
	cursor: BlockCursor,
	names: ReadonlySet<string>,
): [Node[], Section[]] {
	const reader = cursor.reader;
	const epilogue: Node[] = [];
	for (
		let node = cursor.peek();
		node !== null && sectionName(reader, node, names) === null;
		node = cursor.peek()
	) {
		epilogue.push(cursor.read());
	}
	const sections: Section[] = [];
	const seen = new Set<string>();
	for (let heading = cursor.peek(); heading !== null; heading = cursor.peek()) {
		const name = sectionName(reader, heading, names) as string;
		if (seen.has(name)) {
			throw new ParseError(
				`the ## [${name}] section is declared at most once`,
				[],
				lineOf(heading),
			);
		}
		seen.add(name);
		cursor.read();
		const blocks: Node[] = [];
		for (
			let block = cursor.peek();
			block !== null && sectionName(reader, block, names) === null;
			block = cursor.peek()
		) {
			blocks.push(cursor.read());
		}
		sections.push({ name, heading, blocks });
	}
	return [epilogue, sections];
}

/**
 * The origin and the inline tokens of the text of a paragraph whose only
 * content is an inline link (code.md, "Test sources").
 *
 * @param message The error when the paragraph is not one inline link.
 * @throws {ParseError} The paragraph is not one inline link.
 */
export function linkParagraph(
	reader: BlockReader,
	node: Node,
	message: string,
): [string, ReturnType<MarkdownIt["parse"]>] {
	const tokens = LINK_MD.parse(reader.rawLines(node).join("\n"), {});
	const children = tokens.find((t) => t.type === "inline")?.children ?? [];
	const links = children.filter((t) => t.type === "link_open");
	const link = links[0];
	if (
		links.length !== 1 ||
		link === undefined ||
		children[0]?.type !== "link_open" ||
		children[children.length - 1]?.type !== "link_close" ||
		link.markup === "autolink"
	) {
		throw new ParseError(message, [], lineOf(node));
	}
	return [link.attrGet("href") ?? "", children.slice(1, -1)];
}

/** Why `origin`, the destination of a link of `owner`, is not allowed. */
export function originMessage(origin: string, owner: string): string {
	let reason: string;
	if (SCHEME_RE.test(origin)) reason = "it has a scheme";
	else if (origin.startsWith("/")) reason = "it starts with `/`";
	else if (origin.includes("?")) reason = "it has a query";
	else if (origin.includes("#"))
		reason = "it has a fragment, which is reserved";
	else reason = "its file name has no extension, which is the format";
	return `the origin ${repr(origin)} of ${owner} must be a relative path: ${reason}`;
}

/**
 * The `attachments` of an `## [attachments]` section: one for each fenced
 * block and each paragraph with one link, in order.
 *
 * @param heading The heading of the section.
 * @param blocks The blocks of the section, after its heading.
 * @throws {ParseError} The section has no block or a block that it does not
 *   allow, or an attachment is malformed.
 */
export function parseAttachments(
	reader: BlockReader,
	heading: Node,
	blocks: readonly Node[],
): AttachmentDict[] {
	if (blocks.length === 0) {
		throw new ParseError(
			"the ## [attachments] section has no content block",
			[],
			lineOf(heading),
		);
	}
	return blocks.map((block) => {
		if (block.type === "fence") return fencedAttachment(block);
		if (block.type === "paragraph") return linkedAttachment(reader, block);
		throw new ParseError(
			"the ## [attachments] section holds fenced code blocks and " +
				`paragraphs with only a link, not a ${BLOCK_NAMES[block.type] ?? block.type}`,
			[],
			lineOf(block),
		);
	});
}

/** Record where the `## [attachments]` section and each attachment are. */
export function markAttachments(
	cursor: BlockCursor,
	heading: Node,
	blocks: readonly Node[],
): void {
	cursor.mark([ATTACHMENTS], heading, blocks.at(-1));
	for (const [index, block] of blocks.entries()) {
		cursor.mark([ATTACHMENTS, index], block);
	}
}

/** The attachment of a fence whose info string is `format name`. */
function fencedAttachment(node: Node): AttachmentDict {
	// The words end at a space or a tab only: a Unicode space is a character
	// of the word, which the name rule then rejects.
	const words = strip(md.utils.unescapeAll(node.info ?? ""), " \t")
		.split(/[ \t]+/u)
		.filter((word) => word !== "");
	if (words.length !== 2) {
		throw new ParseError(
			"the info string of a fenced attachment has exactly two words, the " +
				`format and the name, as in \`\`\`csv dados.csv; found ${words.length}`,
			[],
			lineOf(node),
		);
	}
	const [format, name] = words as [string, string];
	const problem = nameProblem(name);
	if (problem !== null) {
		throw new ParseError(
			`the name ${repr(name)} of a fenced attachment ${problem}`,
			[],
			lineOf(node),
		);
	}
	return { name, format, text: node.content ?? "" };
}

/** The attachment of a paragraph whose only content is an inline link. */
function linkedAttachment(reader: BlockReader, node: Node): AttachmentDict {
	const [origin, textTokens] = linkParagraph(
		reader,
		node,
		"a paragraph of the ## [attachments] section is an attachment only when " +
			"its whole content is one inline link, as in `[dados](dados/tabela.csv)`; " +
			"a fenced block holds the text of the other attachments",
	);
	if (!ORIGIN_RE.test(origin)) {
		throw new ParseError(
			originMessage(origin, "an attachment"),
			[],
			lineOf(node),
		);
	}
	const name = origin.slice(origin.lastIndexOf("/") + 1);
	const problem = nameProblem(name);
	if (problem !== null) {
		throw new ParseError(
			"the name of a linked attachment is the last segment of its origin " +
				`${repr(origin)}, and the name ${repr(name)} ${problem}`,
			[],
			lineOf(node),
		);
	}
	const attachment: AttachmentDict = {
		name,
		format: origin.slice(origin.lastIndexOf(".") + 1),
		origin,
	};
	const label = strip(plainText(textTokens), " \t\n");
	if (hasVisibleCharacter(label) && label !== name) attachment.label = label;
	return attachment;
}

/** Why `name` is not the name of an attachment (question-base.md, "Name"). */
function nameProblem(name: string): string | null {
	if (name === "." || name === "..") return "cannot be `.` or `..`";
	if (name.includes("/") || name.includes("\\")) {
		return "cannot have `/` or `\\`";
	}
	if (NAME_FORBIDDEN_RE.test(name)) return "cannot have a space or a backtick";
	return null;
}

/**
 * The text of inline tokens with no markup: the characters of the text and of
 * the code spans. A line break is a line ending.
 */
function plainText(tokens: ReturnType<MarkdownIt["parse"]>): string {
	const parts: string[] = [];
	for (const token of tokens) {
		if (token.type === "text" || token.type === "code_inline") {
			parts.push(token.content);
		} else if (token.type === "softbreak" || token.type === "hardbreak") {
			parts.push("\n");
		} else if (token.type === "image" && token.children) {
			parts.push(plainText(token.children));
		}
	}
	return parts.join("");
}
