/**
 * The body of a code question: the `[code]` tag and its `## [template]`,
 * `## [tests]`, `## [rubric]`, `## [attachments]` and `## [answer-key]` sections
 * (docs/question-types/code.md).
 *
 * The parser reads the blocks only. It does not read the text of a test
 * source, so the annotations of a fenced block are scanned later, by the
 * model.
 *
 * A port of `mdq-py/mdq/_parser/_code.py`.
 */

import { ParseError } from "../errors.js";
import {
	ATTACHMENTS,
	linkParagraph,
	markAttachments,
	ORIGIN_RE,
	originMessage,
	parseAttachments,
	splitSections,
} from "./attachments.js";
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
import type { Node } from "./tree.js";

/** The sections of a code question. */
const SECTIONS: ReadonlySet<string> = new Set([
	"template",
	"tests",
	"rubric",
	ATTACHMENTS,
	"answer-key",
]);

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

/**
 * Read the sections that follow the `[code]` tag.
 *
 * The epilogue is between the tag and the first section, and the sections are
 * contiguous after it, in any order. Each one, `## [answer-key]` included,
 * ends at the heading of the next section.
 *
 * @param cursor The cursor, right after the `[code]` paragraph.
 * @returns The fields `template`, `tests`, `rubric`, `attachments` and
 *   `answerKey` that the sections define, and the nodes of the epilogue.
 * @throws {ParseError} A section is declared twice, a section has no block or
 *   a block that it does not allow, or a test source is malformed.
 */
export function parseCodeBody(
	cursor: BlockCursor,
): [Record<string, unknown>, Node[]] {
	const reader = cursor.reader;
	const [epilogue, sections] = splitSections(cursor, SECTIONS);
	const fields: Record<string, unknown> = {};
	for (const { name, heading, blocks } of sections) {
		if (name === "answer-key") {
			const text = reader.joinBlocks(blocks);
			if (text) {
				fields.answerKey = text;
				cursor.mark(["answerKey"], blocks[0] as Node, blocks.at(-1));
			}
			continue;
		}
		if (blocks.length === 0) {
			throw new ParseError(
				`the ## [${name}] section has no content block`,
				[],
				lineOf(heading),
			);
		}
		if (name === ATTACHMENTS) {
			fields.attachments = parseAttachments(reader, heading, blocks);
			markAttachments(cursor, heading, blocks);
			continue;
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
	const [origin] = linkParagraph(
		reader,
		node,
		"a paragraph of the ## [tests] section is a test source only when " +
			"its whole content is one inline link, as in `[tests](test_x.py)`; " +
			"a fenced block holds the other tests",
	);
	if (!ORIGIN_RE.test(origin)) {
		throw new ParseError(
			originMessage(origin, "a test source"),
			[],
			lineOf(node),
		);
	}
	return { format: origin.slice(origin.lastIndexOf(".") + 1), origin };
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
