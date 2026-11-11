/**
 * The body of a code question: the `[code]` tag and its `## [template]`,
 * `## [tests]`, `## [rubric]` and `## [answer-key]` sections
 * (docs/question-types/code.md).
 *
 * The parser reads the blocks only. It does not read the text of a test
 * source, so the annotations of a fenced block are scanned later, by the
 * model.
 *
 * A port of `mdq-py/mdq/_parser/_code.py`.
 */

import MarkdownIt from "markdown-it";
import { ParseError } from "../errors.js";
import type { BlockCursor, BlockReader } from "./blocks.js";
import { lineOf } from "./blocks.js";
import { splitItem } from "./choices.js";
import { fenceLanguage } from "./ordering.js";
import {
	LIST_MODIFIERS,
	parseItemLine,
	type RubricLine,
	RubricSyntaxError,
} from "./rubric.js";
import { repr } from "./text.js";
import type { Node } from "./tree.js";

/** The heading text of a section of a code question. */
const SECTION_RE: RegExp = /^\[(?<name>template|tests|rubric|answer-key)\]$/u;
/**
 * The `ORIGIN` terminal of docs/question-types/code.md, after the reading of
 * the destination of the link.
 */
const ORIGIN_RE: RegExp =
	/^(?![A-Za-z][A-Za-z0-9+.-]*:)(?!\/)[^?#]*[.][^./?#]+$/u;
const SCHEME_RE: RegExp = /^[A-Za-z][A-Za-z0-9+.-]*:/u;

/**
 * Reads a paragraph as CommonMark does, keeping the destination of a link as
 * the author wrote it. `normalizeLink` would percent-encode it, and the origin
 * is an opaque key: MDQ does not decode or encode it. Link reference
 * definitions are off, so `[t][ref]` is text.
 */
const LINK_MD: MarkdownIt = new MarkdownIt("commonmark");
LINK_MD.normalizeLink = (url: string): string => url;
LINK_MD.block.ruler.disable("reference");

/** A test source of the parsed data: `text` or `origin`, never both. */
export interface TestSourceDict {
	format: string;
	text?: string;
	origin?: string;
}

/** A manual item of `## [rubric]` in the parsed data. */
export interface RubricItemDict {
	binding: "manual";
	text: string;
	value?: number;
	feedback?: string;
	comment?: string;
}

/**
 * An item of `## [rubric]` that breaks the rubric item syntax. Carries the
 * `invalid-rubric-item` code and the `path` of the item, so `load` reports it
 * like the model does for the same fault in a YAML or JSON document.
 */
export class InvalidRubricItemError extends ParseError {
	override readonly code = "invalid-rubric-item";

	constructor(message: string, index: number, node: Node | null = null) {
		super(message, ["rubric", index], lineOf(node));
	}
}

/** Whether `node` is the heading of a section (of the section `name`). */
function isSection(reader: BlockReader, node: Node, name?: string): boolean {
	if (node.type !== "heading" || node.tag !== "h2") return false;
	const found = SECTION_RE.exec(reader.rawText(node));
	return found !== null && (name === undefined || found.groups?.name === name);
}

/**
 * Read the sections that follow the `[code]` tag.
 *
 * The epilogue is between the tag and the first section, and the sections are
 * contiguous after it. `## [answer-key]` is the last one and holds every block
 * up to the end of the question.
 *
 * @param cursor The cursor, right after the `[code]` paragraph.
 * @returns The fields `template`, `tests`, `rubric` and `answerKey` that the
 *   sections define, and the nodes of the epilogue.
 * @throws {ParseError} A section is declared twice, a section has no block or
 *   a block that it does not allow, or a test source is malformed.
 */
export function parseCodeBody(
	cursor: BlockCursor,
): [Record<string, unknown>, Node[]] {
	const reader = cursor.reader;
	const children = reader.children;
	let first = children.length;
	for (let i = cursor.pos; i < children.length; i++) {
		if (isSection(reader, children[i] as Node)) {
			first = i;
			break;
		}
	}
	const epilogue = children.slice(cursor.pos, first);
	cursor.pos = first;

	const fields: Record<string, unknown> = {};
	const seen = new Set<string>();
	for (let node = cursor.peek(); node !== null; node = cursor.peek()) {
		const name = SECTION_RE.exec(reader.rawText(node))?.groups?.name as string;
		const heading = cursor.read();
		if (name === "answer-key") {
			const rest = children.slice(cursor.pos);
			cursor.pos = children.length;
			if (rest.some((later) => isSection(reader, later, "answer-key"))) {
				throw new ParseError(
					"a question defines at most one [answer-key] section",
				);
			}
			const text = reader.joinBlocks(rest);
			if (text) {
				fields.answerKey = text;
				cursor.mark(["answerKey"], rest[0] as Node, rest.at(-1));
			}
			break;
		}
		if (seen.has(name)) {
			throw new ParseError(
				`a question defines at most one [${name}] section`,
				[],
				lineOf(heading),
			);
		}
		seen.add(name);
		const blocks: Node[] = [];
		for (
			let block = cursor.peek();
			block !== null && !isSection(reader, block);
			block = cursor.peek()
		) {
			blocks.push(cursor.read());
		}
		if (blocks.length === 0) {
			throw new ParseError(
				`the ## [${name}] section has no content block`,
				[],
				lineOf(heading),
			);
		}
		cursor.mark([name], heading, blocks.at(-1));
		switch (name) {
			case "template":
				fields.template = template(reader, blocks);
				break;
			case "tests":
				fields.tests = tests(reader, blocks);
				for (const [index, block] of blocks.entries()) {
					cursor.mark(["tests", index], block);
				}
				break;
			default:
				fields.rubric = rubric(reader, blocks);
				cursor.markItems(["rubric"], blocks[0] as Node);
		}
	}
	return [fields, epilogue];
}

/**
 * The block that breaks a section of exactly one block of the type
 * `expected`: the first block of another type, else the extra block.
 */
function offender(blocks: readonly Node[], expected: string): Node {
	return (blocks.find((b) => b.type !== expected) ??
		blocks[1] ??
		blocks[0]) as Node;
}

/** The `template`: the Markdown source of the one fenced block. */
function template(reader: BlockReader, blocks: readonly Node[]): string {
	const only = blocks[0] as Node;
	if (blocks.length !== 1 || only.type !== "fence") {
		throw new ParseError(
			"the ## [template] section holds exactly one fenced code block",
			[],
			lineOf(offender(blocks, "fence")),
		);
	}
	return reader.blockText(only);
}

/** The `tests`: a fenced block or a paragraph with one link, in order. */
function tests(reader: BlockReader, blocks: readonly Node[]): TestSourceDict[] {
	const sources: TestSourceDict[] = [];
	for (const block of blocks) {
		if (block.type === "fence") {
			const format = fenceLanguage(block.info ?? "");
			if (format === null) {
				throw new ParseError(
					"a fenced test source starts its info string with the test " +
						"format, as in ```pytest",
					[],
					lineOf(block),
				);
			}
			sources.push({ format, text: block.content ?? "" });
		} else if (block.type === "paragraph") {
			sources.push(linkedSource(reader, block));
		} else {
			throw new ParseError(
				"the ## [tests] section holds fenced code blocks and paragraphs " +
					"with only a link",
				[],
				lineOf(block),
			);
		}
	}
	return sources;
}

/** The test source of a paragraph whose only content is an inline link. */
function linkedSource(reader: BlockReader, node: Node): TestSourceDict {
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
		throw new ParseError(
			"a paragraph of the ## [tests] section is a test source only when " +
				"its whole content is one inline link, as in `[tests](test_x.py)`; " +
				"a fenced block holds the other tests",
			[],
			lineOf(node),
		);
	}
	const origin = link.attrGet("href") ?? "";
	if (!ORIGIN_RE.test(origin)) {
		throw new ParseError(originMessage(origin), [], lineOf(node));
	}
	return { format: origin.slice(origin.lastIndexOf(".") + 1), origin };
}

/** Why `origin`, the destination of a test link, is not allowed. */
function originMessage(origin: string): string {
	let reason: string;
	if (SCHEME_RE.test(origin)) reason = "it has a scheme";
	else if (origin.startsWith("/")) reason = "it starts with `/`";
	else if (origin.includes("?")) reason = "it has a query";
	else if (origin.includes("#"))
		reason = "it has a fragment, which is reserved";
	else reason = "its file name has no extension, which is the test format";
	return `the origin ${repr(origin)} of a test source must be a relative path: ${reason}`;
}

/** The `rubric`: the manual items of the one unordered list. */
function rubric(
	reader: BlockReader,
	blocks: readonly Node[],
): RubricItemDict[] {
	const node = blocks[0] as Node;
	if (blocks.length !== 1 || node.type !== "bullet_list") {
		throw new ParseError(
			"the ## [rubric] section holds exactly one unordered list",
			[],
			lineOf(offender(blocks, "bullet_list")),
		);
	}
	for (const item of node.children) {
		reader.checkNoSetextItem(item);
		const head = item.children[0];
		if (head !== undefined && head.type !== "paragraph") {
			throw new ParseError(
				"an item of `## [rubric]` starts with a paragraph: the criterion " +
					`is not a ${head.type.replaceAll("_", " ")}`,
				[],
				lineOf(item),
			);
		}
	}
	return node.children.map((item, index) =>
		rubricItem(reader.itemLines(item), index, item),
	);
}

/** One item of the list, with the binding `{manual}`. */
function rubricItem(
	lines: readonly string[],
	index: number,
	node: Node,
): RubricItemDict {
	let parsed: RubricLine;
	try {
		parsed = parseItemLine(lines[0] ?? "");
	} catch (error) {
		if (!(error instanceof RubricSyntaxError)) throw error;
		throw new InvalidRubricItemError(error.message, index, node);
	}
	const names = parsed.modifiers;
	const unknown = names.find((n) => !LIST_MODIFIERS.has(n));
	if (unknown !== undefined) {
		const hint =
			unknown === "public" || unknown === "example"
				? "`public` and `example` are modifiers of an annotation of a test source"
				: "the only modifier of an item of `## [rubric]` is `{manual}`";
		throw new InvalidRubricItemError(
			`the modifier {${unknown}}: ${hint}`,
			index,
			node,
		);
	}
	if (names.length > 1) {
		throw new InvalidRubricItemError(
			"a modifier repeats in one item",
			index,
			node,
		);
	}
	if (names.length === 0) {
		throw new InvalidRubricItemError(
			"an item of `## [rubric]` needs the binding `{manual}`",
			index,
			node,
		);
	}
	const raw = splitItem(parsed.criterion, lines.slice(1));
	const item: RubricItemDict = {
		binding: "manual",
		text: parsed.criterion ? raw.text : "",
	};
	if (parsed.value !== null) item.value = parsed.value;
	if (raw.feedback !== null) item.feedback = raw.feedback;
	if (raw.comment !== null) item.comment = raw.comment;
	return item;
}
