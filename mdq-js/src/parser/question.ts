/**
 * A basic Markdown parser for one MDQ question document.
 *
 * Turns MDQ Markdown source (frontmatter + stem + body + epilogue, as
 * described in `docs/question-types/generic.md`) into the same plain object
 * shape that `validateDocument` expects, i.e. the shape documented by
 * `schema/*.yaml`.
 *
 * A port of `mdq-py/mdq/_parser/_question.py`. We use markdown-it to get
 * *block*-level structure (paragraphs, headings, bullet lists), but MDQ layers
 * its own mini-grammars on top of plain block content (choice markers,
 * feedback `>` and comment `!` lines inside a single list item, the
 * `[numeric(unit)]:` tag, ...). So once we know a block's *line range*
 * (`node.map`), we re-read those raw source lines ourselves for anything with
 * MDQ-specific syntax. Plain prose blocks (stem, epilogue, choice text) are
 * reconstructed from their raw lines, soft-wrapped lines joined with a single
 * space.
 *
 * `parseQuestionDocument` is a thin wrapper around `MDQParser`, a
 * recursive-descent parser that walks a cursor over one question's block
 * children. Exam-level concerns (splitting a document into question blocks,
 * inheritance, the `===` grammar) live in `exam.ts`, which calls back into
 * `parseQuestionDocument` for each block.
 */

import { type Diagnostic, diagnostic } from "../diagnostics.js";
import { MissingFieldError, ParseError } from "../errors.js";
import { SLUG_BODY_RE } from "../markdown.js";
import type { Question } from "../schema/questions.js";
import { validateQuestion } from "../validate.js";
import {
	BlockCursor,
	BlockReader,
	parseItemList,
	setextMessage,
} from "./blocks.js";
import {
	asChoiceType,
	buildChoices,
	type ChoiceType,
	inferChoiceType,
	matchChoiceMarker,
	type RawChoice,
	SLUG_PREFIX_RE,
} from "./choices.js";
import { parseFillInBody } from "./fill-in.js";
import {
	commonFrontmatter,
	extractComment,
	GRADED_QUESTION_TYPES,
	invalidFrontmatterFields,
	loadFrontmatterYaml,
	splitFrontmatter,
} from "./frontmatter.js";
import {
	type NumericExpression,
	numericFields,
	parseNumericExpression,
} from "./numeric.js";
import { checkOrderingTag, parseOrderingBody } from "./ordering.js";
import { parseShortAnswerBody } from "./short-answer.js";
import {
	checkBareTagAlone,
	checkNoTagInContent,
	checkTagLabel,
	isReservedLabel,
	type NumericTag,
	readBodyTag,
	tagLines,
} from "./tags.js";
import { repr, strip } from "./text.js";
import type { Node } from "./tree.js";

/**
 * A parsed document before validation: the plain object the parser builds,
 * with the schema's own JSON field names.
 */
export type RawDocument = Record<string, unknown>;

//
// Constants
//

/**
 * A raw line that looks like the first line of a choice: a list marker and a
 * choice marker (choices.md, "Choice marker").
 */
export const BRACKET_ITEM_RE = /^[*+-][ \t]+\[[^\]\r\n]*\](?![([])/u;
const ANSWER_KEY_RE = /^\[answer-key\]$/u;

//
// Public API
//

/**
 * Parse MDQ Markdown source into a question document object, matching the
 * shape validated by `validateDocument`.
 *
 * @param source MDQ source text for a single question, with or without YAML
 *   frontmatter.
 * @param warnings When given, the parser appends its diagnostics: an
 *   `invalid-frontmatter-field` error for every frontmatter key that is not
 *   in the frontmatter table of the question's type, and the warnings about
 *   the source layout. Parsing never fails because of them; the caller checks
 *   the severity.
 * @returns The parsed question document.
 * @throws {MissingFieldError} If the question has no stem.
 * @throws {ParseError} If the body does not match any known question shape.
 */
export function parseQuestionDocument(
	source: string,
	warnings?: Diagnostic[],
): RawDocument {
	const parser = new MDQParser(source);
	const doc = parser.parseQuestion();
	warnings?.push(
		...invalidFrontmatterFields(parser.frontmatter, String(doc.type)),
		...parser.diagnostics,
	);
	return doc;
}

/**
 * Parse and validate a question document.
 *
 * @throws {ParseError} If the source is not a well-formed MDQ question.
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

/** The `redundant-id` warning: `id` in the frontmatter and as a slug. */
function redundantId(frontId: unknown, slug: string): Diagnostic {
	const detail =
		frontId === slug
			? "with the same value"
			: `with the value ${repr(slug)}; the frontmatter value ${typeof frontId === "string" ? repr(frontId) : String(frontId)} wins`;
	return diagnostic(
		"warning",
		"redundant-id",
		`\`id\` is set in the frontmatter and as a slug ${detail}`,
		["id"],
	);
}

//
// Implementation
//

/**
 * A recursive-descent parser for one MDQ question document.
 *
 * Holds a cursor over the question's markdown-it block tree, the parsed
 * frontmatter (`frontmatter`/`comment`), and the output document being built
 * up (`state`). Grammar-rule methods read from the cursor and write into
 * `state` as they go, which avoids threading
 * `(children, lines, index, front, doc)` through a long chain of free
 * functions.
 */
export class MDQParser {
	/** The output document being assembled. */
	readonly state: RawDocument = {};
	/** The question's parsed YAML frontmatter. */
	readonly frontmatter: Readonly<Record<string, unknown>>;
	/** The leading `#`-comment block from the frontmatter, if any. */
	readonly comment: string | null;
	/** The block reader over the body, after the frontmatter. */
	readonly reader: BlockReader;
	/** The cursor over `reader`; it shares `diagnostics`. */
	readonly cursor: BlockCursor;
	/** Warnings the parser found in the source layout. */
	readonly diagnostics: Diagnostic[] = [];

	constructor(readonly src: string) {
		const [frontmatterText, bodyText] = splitFrontmatter(src);
		if (frontmatterText !== null) {
			this.frontmatter = loadFrontmatterYaml(frontmatterText);
			this.comment = extractComment(frontmatterText);
		} else {
			this.frontmatter = {};
			this.comment = null;
		}
		this.reader = new BlockReader(bodyText);
		this.cursor = new BlockCursor(this.reader, this.diagnostics);
	}

	//
	// Body-start / tag detection
	//

	/**
	 * Whether `node` is a choice list: an unordered list whose every item
	 * starts with a choice marker (choices.md, "Choice marker").
	 */
	isChoiceList(node: Node): boolean {
		if (node.type !== "bullet_list" || node.children.length === 0) {
			return false;
		}
		return node.children.every(
			(item) =>
				matchChoiceMarker(this.reader.itemLines(item)[0] ?? "") !== null,
		);
	}

	/**
	 * Return the index of the first body node in `reader.children`.
	 *
	 * Scans from the start of the document for the first paragraph matching a
	 * known body tag, or the first bracket-led bullet list. A document that
	 * declares `type: fill-in` and has none is a stem with no blank: the
	 * result is then the number of nodes.
	 *
	 * @throws {MissingFieldError} If no body node is found. The message says
	 *   so when a tag line became a setext heading (CommonMark: a `---` or
	 *   `===` line right under a paragraph makes it a heading).
	 */
	findBodyStart(): number {
		let setextTag: string | null = null;
		for (const [i, child] of this.reader.children.entries()) {
			if (
				setextTag === null &&
				child.type === "heading" &&
				(child.markup === "-" || child.markup === "=")
			) {
				const firstLine = this.reader.rawLines(child)[0];
				if (firstLine !== undefined && readBodyTag(strip(firstLine)) !== null) {
					setextTag = strip(firstLine);
				}
			}
			if (child.type === "paragraph") {
				if (readBodyTag(this.reader.rawText(child)) !== null) return i;
			} else if (this.isChoiceList(child)) {
				return i;
			}
		}
		if (setextTag !== null) {
			throw new MissingFieldError("body", setextMessage(setextTag));
		}
		if (this.frontmatter.type === "fill-in") {
			// A fill-in stem with no blank has no body at all: every block is
			// the stem and `blanks` stays empty (fill-in.md).
			return this.reader.children.length;
		}
		throw new MissingFieldError("body");
	}

	//
	// Stem
	//

	/**
	 * Split the blocks preceding the body into `[stem, slug]`.
	 *
	 * The stem is every block before the body, joined. An inline `[slug]`
	 * prefix, if present, only ever appears on the *first* block and is
	 * removed from the stem.
	 */
	splitIntro(introBlocks: readonly Node[]): [string, string | null] {
		const firstNode = introBlocks[0] as Node;
		const firstText = this.reader.rawText(firstNode);
		const slugMatch =
			firstNode.type === "paragraph" ? SLUG_PREFIX_RE.exec(firstText) : null;
		if (slugMatch === null) {
			return [
				introBlocks.map((n) => this.reader.blockText(n)).join("\n\n"),
				null,
			];
		}
		const stem = [
			firstText.slice(slugMatch[0].length),
			...introBlocks.slice(1).map((n) => this.reader.blockText(n)),
		].join("\n\n");
		return [stem, slugMatch.groups?.slug ?? null];
	}

	//
	// Per-type body fillers
	//

	parseChoiceBody(
		questionType: ChoiceType | null,
		rawChoices: readonly RawChoice[],
	): void {
		this.state.choices = buildChoices(questionType, rawChoices);
	}

	parseEssayBody(): void {
		const front = this.frontmatter;
		if (Object.hasOwn(front, "content")) this.state.content = front.content;
		if (Object.hasOwn(front, "highlight")) {
			this.state.highlight = front.highlight;
		}
	}

	parseNumericBody(tag: NumericTag, tagNode: Node): void {
		checkNoTagInContent(this.reader.rawLines(tagNode).slice(1));
		const parsed: NumericExpression = parseNumericExpression(tag.rest);
		const front = this.frontmatter;
		const doc = this.state;

		doc.answer = parsed.answer;
		if (tag.unit) doc.unit = tag.unit;
		Object.assign(doc, numericFields(parsed, front));
		if (parsed.tolerance !== undefined) doc.tolerance = parsed.tolerance;
		if (Object.hasOwn(front, "incorrectFeedback")) {
			doc.incorrectFeedback = front.incorrectFeedback;
		}
	}

	/**
	 * Throw a `ParseError` for a reserved tag that is not a valid tag, in any
	 * paragraph of the question: a tag in the wrong case, a tag with an
	 * unknown suffix, a tag of the frontmatter such as `preAccept`
	 * (question-base.md, "Body tags"). A label that does not start with a type
	 * name is an ordinary link reference definition.
	 */
	checkTagLines(): void {
		for (const node of this.reader.children) {
			if (node.type !== "paragraph") continue;
			const text = this.reader.rawText(node);
			const lines = this.reader.rawLines(node);
			for (const [label, colon] of tagLines(text, lines)) {
				checkTagLabel(label, colon);
			}
			checkBareTagAlone(lines);
		}
	}

	/**
	 * Report a tag in the epilogue.
	 *
	 * The blocks of the body are one run, so the first other block starts the
	 * epilogue, and a tag after it defines nothing. Each such tag is an error
	 * `detached-tag`. Code blocks are not paragraphs, so a tag inside fenced
	 * code does not count. The error stops the load before the model checks,
	 * so the stem reference of a blank gives no `undefined-blank`.
	 *
	 * @param blocks The blocks of the epilogue.
	 * @param fillIn Whether the question is a fill-in question, where `[^id]:`
	 *   is the tag of a choice blank.
	 */
	reportDetachedTags(blocks: readonly Node[], fillIn: boolean): void {
		const choiceBlankRe = new RegExp(`^\\^${SLUG_BODY_RE}$`, "u");
		for (const node of blocks) {
			if (node.type !== "paragraph") continue;
			for (const [label, colon] of tagLines(
				this.reader.rawText(node),
				this.reader.rawLines(node),
			)) {
				const choiceBlank = fillIn && colon && choiceBlankRe.test(label);
				if (!(isReservedLabel(label) || choiceBlank)) continue;
				this.diagnostics.push(
					diagnostic(
						"error",
						"detached-tag",
						`the tag \`[${label}]${colon ? ":" : ""}\` comes after the epilogue started, so it is part of the epilogue; move the tag up, before the epilogue`,
						["epilogue"],
					),
				);
			}
		}
	}

	/**
	 * Look for the optional `## [answer-key]` section among the remaining
	 * nodes. Only ever called for essay questions -- other types have no
	 * answer-key syntax and the epilogue swallows everything after their body
	 * verbatim.
	 *
	 * @returns The nodes that should still be treated as epilogue (i.e.
	 *   everything before the heading, if one was found, or all remaining
	 *   nodes otherwise). Does not advance `cursor.pos`.
	 */
	parseAnswerKey(): readonly Node[] {
		const remaining = this.reader.children.slice(this.cursor.pos);
		for (const [i, node] of remaining.entries()) {
			if (node.type === "heading" && node.tag === "h2") {
				if (ANSWER_KEY_RE.test(this.reader.rawText(node))) {
					const answerBlocks = remaining.slice(i + 1);
					for (const later of answerBlocks) {
						if (
							later.type === "heading" &&
							later.tag === "h2" &&
							ANSWER_KEY_RE.test(this.reader.rawText(later))
						) {
							throw new ParseError(
								"a question defines at most one [answer-key] section",
							);
						}
					}
					const answerText = this.reader.joinBlocks(answerBlocks);
					if (answerText) this.state.answerKey = answerText;
					return remaining.slice(0, i);
				}
			}
		}
		return remaining;
	}

	applyTypeSpecificFrontmatter(questionType: unknown): void {
		if (GRADED_QUESTION_TYPES.includes(questionType as string)) {
			for (const key of ["shuffle", "grading"]) {
				if (
					Object.hasOwn(this.frontmatter, key) &&
					!Object.hasOwn(this.state, key)
				) {
					this.state[key] = this.frontmatter[key];
				}
			}
		}
	}

	//
	// Main driver
	//

	/**
	 * Parse the question document this instance was constructed with.
	 *
	 * @returns The document.
	 * @throws {MissingFieldError} If the question has no stem.
	 * @throws {ParseError} If the body does not match any known question
	 *   shape.
	 */
	parseQuestion(): RawDocument {
		Object.assign(
			this.state,
			commonFrontmatter(this.frontmatter, this.comment),
		);
		if (Object.hasOwn(this.frontmatter, "weight")) {
			this.state.weight = this.frontmatter.weight;
		}

		if (this.reader.children.length === 0) throw new MissingFieldError("stem");

		this.checkTagLines();
		const bodyStart = this.findBodyStart();
		if (bodyStart === 0) throw new MissingFieldError("stem");

		const introBlocks: Node[] = [];
		for (let i = 0; i < bodyStart; i++) introBlocks.push(this.cursor.read());
		const [stemText, inlineSlug] = this.splitIntro(introBlocks);

		if (inlineSlug !== null && Object.hasOwn(this.state, "id")) {
			this.diagnostics.push(redundantId(this.state.id, inlineSlug));
		} else if (inlineSlug !== null) {
			this.state.id = inlineSlug;
		}
		this.state.stem = stemText;

		let questionType: unknown = this.frontmatter.type;
		// An ordering body ends its own epilogue at the first section.
		let orderingEpilogue: readonly Node[] | null = null;
		const node = this.cursor.peek();

		if (node === null) {
			// `findBodyStart` found no body: a fill-in stem with no blank. The
			// schema reports the empty `blanks` list.
			questionType = "fill-in";
			this.state.blanks = [];
		} else if (node.type === "bullet_list") {
			// Ambiguous between multiple-choice / multiple-selection /
			// true-false: infer from the bracket values unless declared.
			const bodyNode = this.cursor.expect(
				"bullet_list",
				"malformed choice list",
			);
			const rawChoices = parseItemList(this.reader, bodyNode);
			questionType =
				questionType || inferChoiceType(rawChoices.map((c) => c.value));
			this.parseChoiceBody(asChoiceType(questionType), rawChoices);
		} else {
			const bodyNode = this.cursor.expect(
				"paragraph",
				"unrecognized question body",
			);
			const tag = readBodyTag(this.reader.rawText(bodyNode));
			switch (tag?.kind) {
				case "essay":
					questionType = questionType || "essay";
					this.parseEssayBody();
					break;
				case "numeric":
					questionType = questionType || "numeric";
					this.parseNumericBody(tag, bodyNode);
					break;
				case "ordering":
					questionType = questionType || "ordering";
					checkOrderingTag(tag);
					{
						const [fields, epilogueNodes] = parseOrderingBody(
							this.cursor,
							this.frontmatter,
							bodyNode,
						);
						Object.assign(this.state, fields);
						orderingEpilogue = epilogueNodes;
					}
					break;
				case "short-answer":
					questionType = questionType || "short-answer";
					Object.assign(
						this.state,
						parseShortAnswerBody(this.cursor, this.frontmatter, tag, bodyNode),
					);
					break;
				case "choice-blank":
				case "numeric-blank":
				case "short-answer-blank":
				case "unrecognized-blank":
					questionType = questionType || "fill-in";
					Object.assign(
						this.state,
						parseFillInBody(this.cursor, this.frontmatter, tag, bodyNode),
					);
					break;
				case undefined:
					// `findBodyStart` already filtered this.
					throw new ParseError("Question ended before inferring its type");
			}
		}

		this.state.type = questionType;

		const epilogueBlocks: readonly Node[] =
			questionType === "essay"
				? this.parseAnswerKey()
				: (orderingEpilogue ?? this.reader.children.slice(this.cursor.pos));
		this.reportDetachedTags(epilogueBlocks, questionType === "fill-in");
		if (epilogueBlocks.length > 0) {
			const epilogueText = this.reader.joinBlocks(epilogueBlocks);
			if (epilogueText) this.state.epilogue = epilogueText;
		}

		this.applyTypeSpecificFrontmatter(questionType);

		// A `type` forced by the frontmatter can contradict the body, so the
		// document is checked by the schema, not by construction.
		return this.state;
	}
}
