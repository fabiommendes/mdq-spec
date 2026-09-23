/**
 * Parsing MDQ Markdown into the document shape the schemas validate.
 *
 * Step 1-2 of the pipeline in `docs/sync/schemas.md`: Markdown source in,
 * JSON-like plain object out. Validation is a separate step, so a caller can
 * see what the parser made of a document even when it does not validate.
 *
 * The parser is pure -- a string in, a new object out, no I/O and no shared
 * state -- which is what lets the whole suite be table-driven.
 *
 * A port of `MDQParser.parse_question` in `mdq-py/mdq/parser.py` and the
 * functions it calls. This cycle covers the shared question skeleton
 * (frontmatter, preamble/stem/epilogue) and the three `bullet_list` body
 * types (`multiple-choice`, `multiple-selection`, `true-false`); the five
 * tag-based body types and exams are later cycles.
 */

import MarkdownIt from "markdown-it";
import { MissingFieldError, ParseError } from "../errors.js";
import type { Question } from "../schema/questions.js";
import { validateQuestion } from "../validate.js";
import {
	BRACKET_ITEM_RE,
	buildChoices,
	inferChoiceType,
	parseItem,
	SLUG_PREFIX_RE,
	splitListItems,
} from "./choices.js";
import {
	extractComment,
	loadFrontmatterYaml,
	normalizeTags,
	splitFrontmatter,
} from "./frontmatter.js";
import { buildTree, type Node, splitLines } from "./tree.js";

/**
 * A parsed document before validation: the plain object the parser builds,
 * with the schema's own JSON field names.
 */
export type RawDocument = Record<string, unknown>;

/**
 * `# Title` or `# [slug] Title` -- the marker that tells an exam apart from
 * a question document, which can never carry an H1.
 */
const H1_RE = /^#[ \t]+.*?[ \t]*$/;

//
// Body-tag detection.
//
// These five tags are the shapes a paragraph-led body can take, per
// `mdq-py/mdq/parser.py`. Only the shared skeleton and the three
// `bullet_list` body types (multiple-choice/multiple-selection/true-false)
// are implemented this cycle. Recognizing the other five still matters for
// `findBodyStart`: it is what tells a tag-led body apart from ordinary
// preamble/epilogue prose, exactly as the Python reference's
// `_matches_tag` does, even though parsing what follows one is a later
// cycle's work.
const ESSAY_TAG_RE = /^\[essay\]$/;
const ORDERING_TAG_RE = /^\[ordering\]$/;
const SHORT_ANSWER_TAG_RE =
	/^\[\s*short-answer\s*(?:\/\s*(?:accept|reject)\s*)?\]\s*:/;
const NUMERIC_TAG_RE = /^\[numeric(?:\([\w.-]+\))?\]:/;
const BLANK_TAG_RE = /^\[\^[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*(?:\/[^\]]+)?\]:/;

/** Which known body tag `text` looks like, if any. */
function matchesTag(text: string): string | undefined {
	if (ESSAY_TAG_RE.test(text)) return "essay";
	if (ORDERING_TAG_RE.test(text)) return "ordering";
	if (SHORT_ANSWER_TAG_RE.test(text)) return "short-answer";
	if (NUMERIC_TAG_RE.test(text)) return "numeric";
	if (BLANK_TAG_RE.test(text)) return "fill-in";
	return undefined;
}

/**
 * One shared `markdown-it` instance, configured to match `mdq-py`'s
 * `MarkdownIt("gfm-like")`: GFM tables and strikethrough on top of
 * CommonMark, HTML passthrough and autolinking enabled.
 *
 * The `reference` rule is disabled because MDQ's own tags
 * (`[short-answer]: ...`, `[numeric]: ...`, `[^blank]: ...`) are
 * syntactically indistinguishable from CommonMark link reference
 * definitions, which are otherwise consumed silently with no token emitted
 * at all. Disabling it lets these lines survive as ordinary paragraphs for
 * the parser to pattern-match.
 */
const md: MarkdownIt = new MarkdownIt("default", {
	html: true,
	linkify: true,
	xhtmlOut: true,
});
md.block.ruler.disable("reference");

/** The stem/preamble/inline-slug a question's intro blocks split into. */
interface Intro {
	readonly stem: string;
	readonly preamble: string | undefined;
	readonly inlineSlug: string | undefined;
}

/**
 * A recursive-descent parser for one MDQ question document.
 *
 * Holds a cursor (`children`/`lines`/`pos`) over the question's markdown-it
 * block tree, the parsed frontmatter, and the output document being built
 * up (`state`). A port of `mdq-py`'s `MDQParser`, scoped to what this cycle
 * implements.
 */
class QuestionParser {
	private pos = 0;
	private readonly state: RawDocument = {};
	private readonly frontmatter: Record<string, unknown>;
	private readonly comment: string | undefined;
	private readonly children: readonly Node[];
	private readonly lines: readonly string[];

	constructor(source: string) {
		const [frontmatterText, bodyText] = splitFrontmatter(source);
		if (frontmatterText !== null) {
			this.frontmatter = loadFrontmatterYaml(frontmatterText);
			this.comment = extractComment(frontmatterText);
		} else {
			this.frontmatter = {};
			this.comment = undefined;
		}

		this.children = buildTree(md.parse(bodyText, {}));
		this.lines = splitLines(bodyText);
	}

	//
	// Cursor primitives
	//
	private seek(): Node | undefined {
		return this.children[this.pos];
	}

	private read(): Node {
		const node = this.seek();
		if (node === undefined) {
			throw new ParseError("unexpected end of document");
		}
		this.pos += 1;
		return node;
	}

	//
	// Line/text reconstruction
	//
	private rawLines(node: Node): string[] {
		if (node.map === null) {
			return [];
		}
		const [start, end] = node.map;
		return this.lines.slice(start, end);
	}

	/** Reconstruct a block's text like the original source. */
	private rawText(node: Node): string {
		const inline = node.children[0];
		if (inline !== undefined && inline.type === "inline") {
			return (inline.content ?? "").replace(/\n/g, " ");
		}
		const lines = this.rawLines(node);
		while (lines.length > 0 && (lines[lines.length - 1] ?? "").trim() === "") {
			lines.pop();
		}
		return lines.join("\n");
	}

	private joinBlocks(nodes: readonly Node[]): string | undefined {
		if (nodes.length === 0) {
			return undefined;
		}
		return nodes.map((node) => this.rawText(node)).join("\n\n");
	}

	//
	// Frontmatter
	//
	private applyCommonFrontmatter(): void {
		const front = this.frontmatter;
		const doc = this.state;
		if (front.id !== undefined && front.id !== null) {
			doc.id = String(front.id);
		}
		if (Object.hasOwn(front, "uuid")) doc.uuid = front.uuid;
		if (Object.hasOwn(front, "title")) doc.title = front.title;
		if (Object.hasOwn(front, "author")) doc.author = front.author;
		if (Object.hasOwn(front, "locale")) doc.locale = front.locale;
		if (
			Object.hasOwn(front, "tags") &&
			front.tags !== undefined &&
			front.tags !== null
		) {
			doc.tags = normalizeTags(front.tags);
		}
		if (Object.hasOwn(front, "meta")) doc.meta = front.meta;
	}

	private applyTypeSpecificFrontmatter(questionType: string): void {
		if (
			(questionType === "multiple-choice" ||
				questionType === "multiple-selection") &&
			Object.hasOwn(this.frontmatter, "shuffle") &&
			!Object.hasOwn(this.state, "shuffle")
		) {
			this.state.shuffle = this.frontmatter.shuffle;
		}
	}

	//
	// Body-start detection
	//
	private isBracketList(node: Node): boolean {
		if (node.type !== "bullet_list" || node.children.length === 0) {
			return false;
		}
		for (const item of node.children) {
			const firstLine = item.map !== null ? (this.rawLines(item)[0] ?? "") : "";
			if (!BRACKET_ITEM_RE.test(firstLine)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Return the index of the first body node in `this.children`.
	 *
	 * @throws {MissingFieldError} If no body node is found.
	 */
	private findBodyStart(): number {
		for (let i = 0; i < this.children.length; i++) {
			const child = this.children[i];
			if (child === undefined) {
				continue;
			}
			if (child.type === "paragraph") {
				if (matchesTag(this.rawText(child)) !== undefined) {
					return i;
				}
			} else if (this.isBracketList(child)) {
				return i;
			}
		}
		throw new MissingFieldError("body");
	}

	//
	// Intro / stem / preamble
	//
	private splitIntro(introBlocks: readonly Node[]): Intro {
		const stemNode = introBlocks[introBlocks.length - 1];
		const firstNode = introBlocks[0];
		if (stemNode === undefined || firstNode === undefined) {
			throw new MissingFieldError("stem");
		}
		const preambleBlocks = introBlocks.slice(0, -1);

		const firstText = this.rawText(firstNode);
		const slugMatch =
			firstNode.type === "paragraph" ? SLUG_PREFIX_RE.exec(firstText) : null;

		let inlineSlug: string | undefined;
		let stemText: string;
		if (slugMatch?.groups?.slug !== undefined) {
			inlineSlug = slugMatch.groups.slug;
			const strippedFirstText = firstText.slice(slugMatch[0].length);
			stemText =
				firstNode === stemNode ? strippedFirstText : this.rawText(stemNode);
		} else {
			stemText = this.rawText(stemNode);
		}

		let preambleText: string | undefined;
		if (preambleBlocks.length > 0) {
			if (slugMatch !== null && preambleBlocks[0] === firstNode) {
				const rest = preambleBlocks.slice(1).map((node) => this.rawText(node));
				preambleText = [firstText.slice(slugMatch[0].length), ...rest].join(
					"\n\n",
				);
			} else {
				preambleText = this.joinBlocks(preambleBlocks);
			}
		}

		return { stem: stemText, preamble: preambleText, inlineSlug };
	}

	//
	// Main driver
	//
	parseQuestion(): RawDocument {
		if (this.comment) {
			this.state.comment = this.comment;
		}
		this.applyCommonFrontmatter();

		if (this.children.length === 0) {
			throw new MissingFieldError("stem");
		}

		const bodyStart = this.findBodyStart();
		if (bodyStart === 0) {
			throw new MissingFieldError("stem");
		}

		const introBlocks: Node[] = [];
		for (let i = 0; i < bodyStart; i++) {
			introBlocks.push(this.read());
		}
		const { stem, preamble, inlineSlug } = this.splitIntro(introBlocks);

		if (this.state.id === undefined && inlineSlug) {
			this.state.id = inlineSlug;
		}
		if (preamble) {
			this.state.preamble = preamble;
		}
		this.state.stem = stem;

		const frontmatterType =
			typeof this.frontmatter.type === "string"
				? this.frontmatter.type
				: undefined;
		let questionType: string;

		const node = this.seek();
		if (node === undefined) {
			throw new ParseError("unexpected end of document");
		}

		if (node.type === "bullet_list") {
			const bodyNode = this.read();
			const rawChoices = splitListItems(this.rawLines(bodyNode)).map((item) =>
				parseItem(item),
			);
			const values = rawChoices.map((choice) => choice.value);
			// `inferChoiceType` never fails to infer one of the three types
			// (a bracket-led list is always one of them, per generic.md), so
			// there is no "could not infer the type" error path to raise here
			// -- mirroring `_infer_choice_type` in the Python reference.
			questionType = frontmatterType ?? inferChoiceType(values);
			this.state.choices = buildChoices(questionType, rawChoices);
		} else {
			const bodyNode = this.seek();
			if (bodyNode === undefined || bodyNode.type !== "paragraph") {
				throw new ParseError("unrecognized question body");
			}
			const tag = matchesTag(this.rawText(bodyNode));
			// `findBodyStart` only ever selects this node because it matched
			// one of the five tags, so `tag` is always defined here; the
			// five tag-based body types themselves are a later cycle's work.
			throw new ParseError(
				`the "${tag}" body type is not implemented by this parser yet`,
			);
		}

		this.state.type = questionType;

		const epilogueBlocks = this.children.slice(this.pos);
		if (epilogueBlocks.length > 0) {
			const epilogueText = this.joinBlocks(epilogueBlocks);
			if (epilogueText) {
				this.state.epilogue = epilogueText;
			}
		}

		this.applyTypeSpecificFrontmatter(questionType);

		return this.state;
	}
}

/**
 * Parse a question document into its unvalidated JSON shape.
 *
 * This is the half of the pipeline the shared `examples/valid/*.mdq.md` ->
 * `*.yaml` pairs specify, so it returns what those `.yaml` files hold rather
 * than a validated document.
 *
 * @throws {ParseError} If the source is not a well-formed MDQ question.
 */
export function parseQuestionDocument(source: string): RawDocument {
	return new QuestionParser(source).parseQuestion();
}

/**
 * Parse and validate a question document.
 *
 * @throws {ParseError} If the source is not a well-formed MDQ question.
 * @throws {MdqError} If the parsed document does not satisfy its schema.
 */
export function parseQuestion(source: string): Question {
	const document = parseQuestionDocument(source);
	const result = validateQuestion(document);
	if (!result.success) {
		throw new ParseError(
			`the parsed document does not satisfy its schema: ${result.error.message}`,
		);
	}
	return result.data;
}

/**
 * Whether the source is an exam rather than a single question.
 *
 * An exam is recognized by its H1 title, which a question document can
 * never carry -- a question's own title is an H2.
 */
export function isExam(source: string): boolean {
	const [, body] = splitFrontmatter(source);
	return splitLines(body).some((line) => H1_RE.test(line));
}
