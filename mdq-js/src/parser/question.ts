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
 * A port of `MDQParser.parse_question` in `mdq-py/mdq/_parser/_question.py` and the
 * functions it calls. This covers the shared question skeleton
 * (frontmatter, preamble/stem/epilogue), the three `bullet_list` body types
 * (`multiple-choice`, `multiple-selection`, `true-false`), the `essay` body,
 * including its `## [answer-key]` epilogue section, and the `numeric` body
 * (`src/parser/numeric.ts`), the `short-answer` body, the `ordering` body
 * (`src/parser/ordering.ts`) and the `fill-in` body. Exams are in
 * `src/parser/exam.ts`.
 */

import { type Diagnostic, diagnostic } from "../diagnostics.js";
import {
	ConflictingAnswerKeyError,
	MissingFieldError,
	ParseError,
	UndefinedBlankError,
} from "../errors.js";
import type { Question } from "../schema/questions.js";
import { validateQuestion } from "../validate.js";
import {
	BRACKET_ITEM_RE,
	buildChoices,
	inferChoiceType,
	type PatternEntry,
	parseItem,
	parsePlainItem,
	patternEntry,
	SLUG_BODY_RE,
	SLUG_PREFIX_RE,
	splitListItems,
} from "./choices.js";
import {
	copyPatternLists,
	extractComment,
	loadFrontmatterYaml,
	normalizeTags,
	questionFrontmatterWarnings,
	splitFrontmatter,
} from "./frontmatter.js";
import { md } from "./markdown.js";
import { parseNumericExpression } from "./numeric.js";
import {
	isCommentBlock,
	joinPrefixedLines,
	ORDERING_SECTION_RE,
	orderingAlternative,
	orderingCodeLines,
	orderingLeveled,
	orderingUlLines,
	orderingUnit,
	type RawAlternative,
	type RawLine,
} from "./ordering.js";
import { repr, strip, UNICODE_SPACE } from "./text.js";
import { buildTree, type Node, splitLines } from "./tree.js";

/**
 * A parsed document before validation: the plain object the parser builds,
 * with the schema's own JSON field names.
 */
export type RawDocument = Record<string, unknown>;

/**
 * Question types whose frontmatter can carry `shuffle`/`grading`, per
 * `GRADED_QUESTION_TYPES` in `mdq-py/mdq/_parser/_frontmatter.py`.
 */
const GRADED_QUESTION_TYPES = new Set([
	"multiple-choice",
	"multiple-selection",
	"true-false",
	"fill-in",
]);

//
// Body-tag detection.
//
// These five tags are the shapes a paragraph-led body can take, per
// `mdq-py/mdq/_parser/`. All five have a body parser.
// `matchesTag` is also what `findBodyStart` uses to tell a tag-led body
// apart from ordinary preamble/epilogue prose, exactly as the Python
// reference's `_matches_tag` does.
const ESSAY_TAG_RE = /^\[essay\]$/;
const ORDERING_TAG_RE = /^\[ordering\]$/;
/**
 * `[short-answer]:`, `[short-answer/accept]:` or `[short-answer/reject]:`,
 * capturing the variant (when there is one) and the rest of the line. A
 * port of `SHORT_ANSWER_RE`.
 */
const SHORT_ANSWER_RE =
	/^\[short-answer(?:\/(?<variant>accept|reject))?\][ \t]*:[ \t]*(?<rest>[^\n]*)$/u;
/**
 * `[numeric]:` or `[numeric(unit)]:`, capturing the unit and the rest of
 * the line. A port of `NUMERIC_TAG_RE`. The unit class is the `UNIT`
 * terminal (`UNIT_CLASS`): any run of characters that are not a
 * `UNICODE_SPACE`, a parenthesis or a bracket (`µm`, `°C`, `m/s`, `km/h`).
 */
const UNIT_CLASS = `[^()\\[\\]${UNICODE_SPACE}]+`;
const NUMERIC_TAG_RE = new RegExp(
	`^\\[numeric(?:\\((?<unit>${UNIT_CLASS})\\))?\\][ \\t]*:[ \\t]*(?<rest>[^\\n]*)$`,
	"u",
);
/**
 * A blank definition tag `[^id]:` or `[^id/kind]:`, capturing the id, the
 * kind suffix and the rest of the line. Permissive in `kind` so that an
 * unrecognized suffix reaches `BLANK_KIND_RE` and raises. A port of
 * `BLANK_RE`. `[^\n]` stands for `.`.
 */
const BLANK_RE = new RegExp(
	`^\\[\\^(?<id>${SLUG_BODY_RE})(?:/(?<kind>[^\\]]+))?\\][ \\t]*:[ \\t]*(?<rest>[^\\n]*)$`,
	"u",
);
/**
 * Validates a blank's kind suffix: a unit attaches to `numeric` only and the
 * accept/reject variants to `short-answer` only. A port of `BLANK_KIND_RE`
 * and `UNIT_RE`.
 */
const BLANK_KIND_RE = new RegExp(
	`^(?:(?<numeric>numeric)(?:\\((?<unit>${UNIT_CLASS})\\))?|(?<short>short-answer)(?:/(?<variant>accept|reject))?)$`,
	"u",
);

/** The markers around the text of an ATX heading. */
const ATX_OPENING_RE = /^[ \t]*#{1,6}/u;
const ATX_CLOSING_RE = /(?:[ \t]+#+)?[ \t]*$/u;

/**
 * Put back the Unicode spaces that markdown-it trimmed from `content`.
 *
 * markdown-it trims a paragraph or a heading with `String.prototype.trim`,
 * which also removes U+FEFF, U+00A0 and the other Unicode spaces.
 * docs/references/grammar.md trims only spaces, tabs and line endings, so
 * these characters are text and stay in the block. A port of
 * `_restore_trimmed`.
 *
 * @param content The trimmed text that markdown-it gives for the block.
 * @param source The source text of the same block.
 * @returns `content`, with the Unicode spaces at the start and at the end of
 *   `source` put back.
 */
function restoreTrimmed(content: string, source: string): string {
	const inner = strip(source, " \t\r\n");
	if (inner.trim() === "") return inner;
	const lead = inner.slice(0, inner.length - inner.trimStart().length);
	const trail = inner.slice(inner.trimEnd().length);
	return lead + content + trail;
}

/** An essay's optional `## [answer-key]` epilogue section, per `essay.md`. */
const ANSWER_KEY_RE = /^\[answer-key\]$/;

/** Python truthiness of a frontmatter value (empty containers are falsy). */
function isPythonTruthy(value: unknown): boolean {
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "object" && value !== null) {
		return Object.keys(value).length > 0;
	}
	return Boolean(value);
}

/** Which known body tag `text` looks like, if any. */
export function matchesTag(text: string): string | undefined {
	if (ESSAY_TAG_RE.test(text)) return "essay";
	if (ORDERING_TAG_RE.test(text)) return "ordering";
	if (SHORT_ANSWER_RE.test(text)) return "short-answer";
	if (NUMERIC_TAG_RE.test(text)) return "numeric";
	if (BLANK_RE.test(text)) return "blank";
	return undefined;
}

/**
 * Merge one definition into the blank its slug names, a port of
 * `_add_blank`.
 *
 * @throws {ParseError} If the slug is already defined with a different
 * kind, or this form of definition is already present.
 */
function addBlank(
	blanks: Map<string, Record<string, unknown>>,
	blank: Record<string, unknown>,
): void {
	const blankId = String(blank.id);
	const existing = blanks.get(blankId);
	if (existing === undefined) {
		blanks.set(blankId, blank);
		return;
	}
	if (existing.type !== blank.type) {
		throw new ParseError(
			`blank ${repr(blankId)} is defined both as ${existing.type} and as ${blank.type}`,
		);
	}
	if (existing.type !== "short-answer") {
		throw new ParseError(`repeated definition of blank ${repr(blankId)}`);
	}
	for (const [key, value] of Object.entries(blank)) {
		if (key === "id" || key === "type") continue;
		if (Object.hasOwn(existing, key)) {
			throw new ParseError(
				`repeated ${repr(key)} definition for blank ${repr(blankId)}`,
			);
		}
		existing[key] = value;
	}
}

/**
 * Move the frontmatter `preAccept`/`preReject` maps onto the blanks they
 * key (fill-in.md, "Frontmatter"), a port of
 * `distribute_blank_pattern_lists`. Each map goes from a blank id to a
 * pattern list; the list becomes the field of the same name of that blank,
 * whatever its kind -- the schema rejects it on a choice or numeric blank.
 *
 * @throws {UndefinedBlankError} A key is not the id of a blank in `blanks`.
 * @throws {ParseError} A map is not a mapping of lists.
 */
function distributeBlankPatternLists(
	front: Readonly<Record<string, unknown>>,
	blanks: Map<string, Record<string, unknown>>,
): void {
	for (const key of ["preAccept", "preReject"]) {
		if (!Object.hasOwn(front, key)) continue;
		const mapping = front[key];
		if (
			typeof mapping !== "object" ||
			mapping === null ||
			Array.isArray(mapping)
		) {
			throw new ParseError(
				`frontmatter ${repr(key)} of a fill-in question must map blank ids to pattern lists`,
			);
		}
		for (const [blankId, patterns] of Object.entries(mapping)) {
			if (!Array.isArray(patterns)) {
				throw new ParseError(
					`frontmatter ${repr(key)} entry ${repr(blankId)} must be a list of patterns`,
				);
			}
			const blank = blanks.get(blankId);
			if (blank === undefined) {
				throw new UndefinedBlankError(blankId, key);
			}
			blank[key] = patterns;
		}
	}
}

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
export class QuestionParser {
	private pos = 0;
	private readonly state: RawDocument = {};
	readonly frontmatter: Record<string, unknown>;
	private readonly comment: string | undefined;
	readonly children: readonly Node[];
	private readonly lines: readonly string[];
	/** Warnings the parser found in the source layout. */
	readonly diagnostics: Diagnostic[] = [];

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

	/**
	 * The source text of a paragraph or an ATX heading, before markdown-it
	 * trims it. Only the text of the block itself: the `#` markers and the
	 * closing sequence of a heading are removed. `undefined` for other blocks.
	 */
	private inlineSource(node: Node): string | undefined {
		const lines = this.rawLines(node);
		const first = lines[0];
		if (first === undefined) return undefined;
		if (node.type === "paragraph") return lines.join("\n");
		if (node.type === "heading" && node.markup.startsWith("#")) {
			return first.replace(ATX_OPENING_RE, "").replace(ATX_CLOSING_RE, "");
		}
		return undefined;
	}

	/**
	 * Reconstruct a block's text like the original source. Trailing lines of
	 * only spaces and tabs are dropped: CommonMark treats only those as blank,
	 * so a code line of other Unicode whitespace (NBSP) is kept.
	 */
	rawText(node: Node): string {
		const inline = node.children[0];
		if (inline !== undefined && inline.type === "inline") {
			let content = inline.content ?? "";
			const source = this.inlineSource(node);
			if (source !== undefined) content = restoreTrimmed(content, source);
			return content.replace(/\n/g, " ");
		}
		const lines = this.rawLines(node);
		while (
			lines.length > 0 &&
			/^[ \t]*$/u.test(lines[lines.length - 1] ?? "")
		) {
			lines.pop();
		}
		return lines.join("\n");
	}

	/**
	 * A block's text as it reads in a `preamble`, `stem`, `epilogue` or
	 * `answerKey` field: `rawText`, plus the `#` markers of an ATX heading,
	 * which stay part of the field so a heading is still a heading when the
	 * field is parsed again.
	 */
	blockText(node: Node): string {
		const text = this.rawText(node);
		if (node.type === "heading" && node.markup.startsWith("#")) {
			return `${node.markup} ${text}`;
		}
		return text;
	}

	private joinBlocks(nodes: readonly Node[]): string | undefined {
		if (nodes.length === 0) {
			return undefined;
		}
		return nodes.map((node) => this.blockText(node)).join("\n\n");
	}

	//
	// Frontmatter
	//
	private applyCommonFrontmatter(): void {
		const front = this.frontmatter;
		const doc = this.state;
		// `id` keeps its YAML type; the schema rejects a non-string. A null `id`
		// counts as absent.
		if (front.id !== undefined && front.id !== null) {
			doc.id = front.id;
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
		if (Object.hasOwn(front, "weight")) doc.weight = front.weight;
	}

	private applyTypeSpecificFrontmatter(questionType: string): void {
		if (!GRADED_QUESTION_TYPES.has(questionType)) {
			return;
		}
		for (const key of ["shuffle", "grading"] as const) {
			if (
				Object.hasOwn(this.frontmatter, key) &&
				!Object.hasOwn(this.state, key)
			) {
				this.state[key] = this.frontmatter[key];
			}
		}
	}

	//
	// Body-start detection
	//
	isBracketList(node: Node): boolean {
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
				firstNode === stemNode ? strippedFirstText : this.blockText(stemNode);
		} else {
			stemText = this.blockText(stemNode);
		}

		let preambleText: string | undefined;
		if (preambleBlocks.length > 0) {
			if (slugMatch !== null && preambleBlocks[0] === firstNode) {
				const rest = preambleBlocks
					.slice(1)
					.map((node) => this.blockText(node));
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
	// Per-type body fillers
	//
	/**
	 * Fill `input`/`highlight` from the frontmatter, for an `[essay]` body.
	 *
	 * No Python module of its own -- `parse_essay_body` lives directly in
	 * `mdq-py/mdq/_parser/_question.py`'s `MDQParser`, so this stays here too.
	 */
	private parseEssayBody(): void {
		const front = this.frontmatter;
		if (Object.hasOwn(front, "input")) {
			this.state.input = front.input;
		}
		if (Object.hasOwn(front, "highlight")) {
			this.state.highlight = front.highlight;
		}
	}

	/**
	 * Fill `content`, `highlight`, `lines`, `extra`, `accept` and `reject`
	 * from an `[ordering]` block and its `## [extra]`/`## [accept]`/
	 * `## [reject]` sections, a port of `parse_ordering_body`. Every block is
	 * read raw first: the indentation unit is inferred once across the whole
	 * question, and only then are the blocks converted to `[level, text]`
	 * pairs. A declared `content`/`highlight`/`indentation`/`unmatched`/
	 * `normalizations` wins over what the body implies.
	 *
	 * @throws {ParseError} If the block after `[ordering]` (or a section) is
	 * neither a fence nor a list, a section's content kind differs from
	 * `[ordering]`'s, two `## [extra]` sections are declared, or a section's
	 * observations carry more than one feedback/comment block.
	 */
	private parseOrderingBody(): void {
		const main = this.parseOrderingContent();
		let extraRaw: RawLine[] | undefined;
		const acceptRaw: RawAlternative[] = [];
		const rejectRaw: RawAlternative[] = [];

		for (;;) {
			const node = this.seek();
			if (node === undefined || node.type !== "heading" || node.tag !== "h2") {
				break;
			}
			const name = ORDERING_SECTION_RE.exec(this.rawText(node))?.groups?.name;
			if (name === undefined) {
				break;
			}
			this.read();
			if (name === "extra") {
				if (extraRaw !== undefined) {
					throw new ParseError(
						"a question defines at most one [extra] section",
					);
				}
				const extra = this.parseOrderingContent();
				extraRaw = extra.raw;
				if (extra.kind !== main.kind) {
					throw new ParseError(
						"[extra] must use the same content type as [ordering]",
					);
				}
			} else {
				const { feedback, comment } = this.parseOrderingObservations();
				const section = this.parseOrderingContent();
				if (section.kind !== main.kind) {
					throw new ParseError(
						`[${name}] must use the same content type as [ordering]`,
					);
				}
				const target = name === "accept" ? acceptRaw : rejectRaw;
				target.push({ lines: section.raw, feedback, comment });
			}
		}

		for (const node of this.children.slice(this.pos)) {
			if (
				node.type === "heading" &&
				node.tag === "h2" &&
				ORDERING_SECTION_RE.test(this.rawText(node))
			) {
				throw new ParseError(
					"the epilogue comes after the [extra], [accept] and [reject] " +
						"sections; a block between the content and a section is not allowed",
				);
			}
		}

		const unit = orderingUnit([
			...main.raw.map(([indent]) => indent),
			...(extraRaw ?? []).map(([indent]) => indent),
			...[...acceptRaw, ...rejectRaw].flatMap((alt) =>
				alt.lines.map(([indent]) => indent),
			),
		]);

		const front = this.frontmatter;
		const doc = this.state;
		doc.content = Object.hasOwn(front, "content") ? front.content : main.kind;
		const highlight = Object.hasOwn(front, "highlight")
			? front.highlight
			: main.highlight;
		if (isPythonTruthy(highlight)) {
			doc.highlight = highlight;
		}
		if (Object.hasOwn(front, "indentation")) {
			doc.indentation = front.indentation;
		}
		if (Object.hasOwn(front, "unmatched")) {
			doc.unmatched = front.unmatched;
		}
		if (front.normalizations !== undefined && front.normalizations !== null) {
			doc.normalizations = normalizeTags(front.normalizations);
		}

		doc.lines = orderingLeveled(main.raw, unit);
		if (extraRaw !== undefined) {
			doc.extra = orderingLeveled(extraRaw, unit);
		}
		if (acceptRaw.length > 0) {
			doc.accept = acceptRaw.map((alt) => orderingAlternative(alt, unit));
		}
		if (rejectRaw.length > 0) {
			doc.reject = rejectRaw.map((alt) => orderingAlternative(alt, unit));
		}
	}

	/**
	 * Read the fence or `ul` list holding one content block's raw
	 * `(indent, text)` lines, with the content kind and highlight language it
	 * implies, a port of `parse_ordering_content`.
	 *
	 * @throws {ParseError} If the current node is neither a fence nor a list.
	 */
	private parseOrderingContent(): {
		kind: "code" | "text";
		highlight: string | undefined;
		raw: RawLine[];
	} {
		const node = this.seek();
		if (
			node === undefined ||
			(node.type !== "fence" && node.type !== "bullet_list")
		) {
			throw new ParseError(
				"an [ordering] block must be followed by a code block or a list",
			);
		}
		this.read();
		if (node.type === "fence") {
			return {
				kind: "code",
				highlight: strip(node.info ?? "") || undefined,
				raw: orderingCodeLines(node.content ?? ""),
			};
		}
		return {
			kind: "text",
			highlight: undefined,
			raw: orderingUlLines(this.rawLines(node)),
		};
	}

	/**
	 * Consume an accept/reject section's optional feedback (`>`) and comment
	 * (`!`) blocks, in either order, a port of `parse_ordering_observations`.
	 *
	 * The blocks are read from the raw lines, not from the markdown nodes:
	 * with no blank line between them, CommonMark folds a `!` line into the
	 * blockquote before it as a lazy continuation, which the grammar does not
	 * do. A line keeps the block its prefix starts; a line with neither
	 * prefix continues the current block.
	 *
	 * @throws {ParseError} If a section carries more than one feedback or
	 * comment block, or the two interleave.
	 */
	private parseOrderingObservations(): {
		feedback: string | undefined;
		comment: string | undefined;
	} {
		const lines: string[] = [];
		for (;;) {
			const node = this.seek();
			if (node === undefined) break;
			const raw = this.rawLines(node);
			if (
				node.type === "blockquote" ||
				(node.type === "paragraph" && isCommentBlock(raw.slice(0, 1)))
			) {
				lines.push(...raw, "");
				this.read();
			} else {
				break;
			}
		}

		// `[prefix, lines]` per block. A block starts at a line whose prefix
		// differs from the open block's, or at any prefixed line after a
		// blank line, which closes the open block.
		const blocks: [string, string[]][] = [];
		let openBlock = false;
		for (const line of lines) {
			const stripped = strip(line, " \t");
			if (!stripped) {
				openBlock = false;
				continue;
			}
			const first = stripped[0] ?? "";
			const prefix = first === ">" || first === "!" ? first : "";
			const last = blocks[blocks.length - 1];
			if (openBlock && last !== undefined && (!prefix || last[0] === prefix)) {
				last[1].push(line);
			} else {
				blocks.push([prefix, [line]]);
				openBlock = true;
			}
		}

		const kinds = blocks.map(([kind]) => kind);
		if (new Set(kinds).size !== kinds.length || kinds.includes("")) {
			throw new ParseError(
				"an accept/reject section carries at most one feedback and one " +
					"comment block, and they must not interleave",
			);
		}
		let feedback: string | undefined;
		let comment: string | undefined;
		for (const [kind, blockLines] of blocks) {
			const text = joinPrefixedLines(blockLines, kind);
			if (kind === ">") feedback = text;
			else comment = text;
		}
		return { feedback, comment };
	}

	/**
	 * Fill the short-answer fields from a run of `[short-answer...]` blocks,
	 * a port of `parse_short_answer_body`. `tagText` is the body paragraph's
	 * raw text, already known to match `SHORT_ANSWER_RE`, and `tagNode` the
	 * paragraph itself.
	 *
	 * `[short-answer]` (alias `[short-answer/accept]`) gives `accept` and
	 * `[short-answer/reject]` gives `reject`, in any order and at most once
	 * each. An answer list detached from its tag by a blank line is left to
	 * the epilogue (warning `detached-answer-list`).
	 *
	 * @throws {ParseError} A block is repeated (the two accept spellings
	 * count as one block), or a block has a pattern and a list.
	 * @throws {ConflictingAnswerKeyError} `accept`/`reject` is declared both
	 * in the frontmatter and in the body.
	 */
	private parseShortAnswerBody(tagText: string, tagNode: Node): void {
		const front = this.frontmatter;
		const doc = this.state;
		for (const key of ["diacritics", "unmatched", "incorrectFeedback"]) {
			if (Object.hasOwn(front, key)) doc[key] = front[key];
		}

		let text = tagText;
		let node = tagNode;
		const seen = new Set<string>();
		for (;;) {
			const match = SHORT_ANSWER_RE.exec(text);
			if (!match?.groups) break;
			const variant = match.groups.variant === "reject" ? "reject" : "accept";
			if (Object.hasOwn(doc, variant) || seen.has(variant)) {
				throw new ParseError(`repeated [short-answer] ${variant} block`);
			}
			seen.add(variant);
			const patterns = this.parseAnswerBlock(
				node,
				match.groups.rest ?? "",
				variant === "reject",
			);
			if (patterns.length > 0) {
				if (Object.hasOwn(front, variant)) {
					throw new ConflictingAnswerKeyError(
						`'${variant}' is declared both in the frontmatter and in a [short-answer] body block`,
					);
				}
				doc[variant] = patterns;
			}

			const next = this.seek();
			if (next === undefined || next.type !== "paragraph") break;
			text = this.rawText(next);
			if (!SHORT_ANSWER_RE.test(text)) break;
			node = this.read();
		}

		copyPatternLists(front, doc);
	}

	/**
	 * Read the patterns of one short-answer tag: the text on its line, or the
	 * list on the lines right after it. Empty when it has none. A port of
	 * `parse_answer_block`.
	 *
	 * @throws {ParseError} The tag has text and an attached list, or a reject
	 * tag has no pattern but is followed by a detached list.
	 */
	private parseAnswerBlock(
		tagNode: Node,
		restText: string,
		reject: boolean,
	): PatternEntry[] {
		const rest = strip(restText, " \t");
		const node = this.seek();
		if (node === undefined || node.type !== "bullet_list") {
			if (reject && !rest) {
				throw new ParseError("a [short-answer/reject] block has no pattern");
			}
			return rest ? [rest] : [];
		}
		if (
			node.map !== null &&
			tagNode.map !== null &&
			node.map[0] === tagNode.map[1]
		) {
			if (rest) {
				throw new ParseError(
					"a [short-answer] tag with a pattern on its line cannot be " +
						"followed by a list",
				);
			}
			this.read();
			return splitListItems(this.rawLines(node)).map((item) =>
				patternEntry(parsePlainItem(item)),
			);
		}
		if (reject && !rest) {
			throw new ParseError("a [short-answer/reject] block has no pattern");
		}
		this.diagnostics.push(
			diagnostic(
				"warning",
				"detached-answer-list",
				"a blank line separates the list from its [short-answer] " +
					"tag, so the list is part of the epilogue",
				["epilogue"],
			),
		);
		return rest ? [rest] : [];
	}

	/**
	 * Fill `answer`/`unit`/`domain`/`decimalPlaces`/`tolerance` from a
	 * `[numeric]:`/`[numeric(unit)]:` body, a port of `parse_numeric_body`.
	 * `tagText` is the body paragraph's raw text, already known to match
	 * `NUMERIC_TAG_RE`.
	 *
	 * @throws {ParseError} If the expression after the tag does not follow
	 * the numeric grammar (see `parseNumericExpression`).
	 */
	private parseNumericBody(tagText: string): void {
		const match = NUMERIC_TAG_RE.exec(tagText);
		if (!match?.groups) {
			throw new ParseError(
				`malformed numeric body: ${JSON.stringify(tagText)}`,
			);
		}
		const unit = match.groups.unit;
		const parsed = parseNumericExpression(match.groups.rest ?? "");
		const front = this.frontmatter;
		const doc = this.state;

		doc.answer = parsed.answer;
		if (unit && !Object.hasOwn(front, "unit")) {
			doc.unit = unit;
		}
		if (Object.hasOwn(front, "domain")) {
			doc.domain = front.domain;
		} else {
			doc.domain = parsed.domain;
		}
		// numeric.md, "Decimal places": inferred from the body when the
		// domain, declared or inferred, is decimal and the frontmatter gives
		// none.
		if (Object.hasOwn(front, "decimalPlaces")) {
			doc.decimalPlaces = front.decimalPlaces;
		} else if (doc.domain === "decimal") {
			doc.decimalPlaces = parsed.decimalPlaces;
		}
		if (Object.hasOwn(front, "unit")) {
			doc.unit = front.unit;
		}
		if (parsed.tolerance !== undefined) {
			doc.tolerance = parsed.tolerance;
		}
	}

	/**
	 * Fill `blanks` from a run of `[^id...]:` definitions, a port of
	 * `parse_fill_in_body`. A slug may be defined more than once -- a short
	 * answer blank spreads its accept block and its reject block over
	 * separate definitions -- so definitions accumulate into one blank per
	 * slug, in the order the slug is first seen. `tagText` is the first
	 * definition's raw text and `tagNode` its paragraph.
	 *
	 * @throws {ParseError} If a tag suffix is unrecognized or misplaced, a
	 * slug's definitions disagree about the blank's kind, or a definition
	 * of the same form is repeated.
	 */
	private parseFillInBody(tagText: string, tagNode: Node): void {
		const front = this.frontmatter;
		if (Object.hasOwn(front, "shuffle")) {
			this.state.shuffle = front.shuffle;
		}
		for (const key of ["diacritics", "unmatched"]) {
			if (Object.hasOwn(front, key)) this.state[key] = front[key];
		}

		const blanks = new Map<string, Record<string, unknown>>();
		// The (blank id, `accept`/`reject`) short-answer definitions seen.
		const defined = new Set<string>();
		let text = tagText;
		let node = tagNode;
		for (;;) {
			const match = BLANK_RE.exec(text);
			if (!match?.groups) {
				break;
			}
			const blankId = match.groups.id ?? "";
			const kind = match.groups.kind;
			const rest = strip(match.groups.rest ?? "", " \t");

			let blankType: "numeric" | "short-answer" | undefined;
			let unit: string | undefined;
			let variant: string | undefined;
			if (kind !== undefined) {
				const kindMatch = BLANK_KIND_RE.exec(kind);
				if (!kindMatch?.groups) {
					throw new ParseError(`unrecognized blank definition: ${repr(text)}`);
				}
				blankType = kindMatch.groups.numeric ? "numeric" : "short-answer";
				unit = kindMatch.groups.unit;
				variant = kindMatch.groups.variant;
			}

			const nextNode = this.seek();
			if (
				blankType === undefined &&
				!rest &&
				nextNode !== undefined &&
				nextNode.type === "bullet_list"
			) {
				if (
					nextNode.map !== null &&
					node.map !== null &&
					nextNode.map[0] !== node.map[1]
				) {
					throw new ParseError(
						`the choice list of [^${blankId}] must start on the line right after its tag, with no blank line in between`,
					);
				}
				this.read();
				const rawChoices = splitListItems(this.rawLines(nextNode)).map((item) =>
					parseItem(item),
				);
				const existing = blanks.has(blankId)
					? [...blanks.keys()].indexOf(blankId)
					: blanks.size;
				const choices = buildChoices("multiple-choice", rawChoices, [
					"blanks",
					existing,
					"choices",
				]);
				addBlank(blanks, {
					id: blankId,
					type: "multiple-choice",
					choices,
				});
			} else if (blankType === "numeric") {
				const parsed = parseNumericExpression(rest);
				// A numeric blank is graded like a numeric question, so the
				// domain is inferred from the written representation too.
				const blank: Record<string, unknown> = {
					id: blankId,
					type: "numeric",
					answer: parsed.answer,
				};
				if (unit) blank.unit = unit;
				blank.domain = parsed.domain;
				if (parsed.domain === "decimal") {
					blank.decimalPlaces = parsed.decimalPlaces;
				}
				if (parsed.tolerance !== undefined) blank.tolerance = parsed.tolerance;
				addBlank(blanks, blank);
			} else if (blankType === "short-answer") {
				const role = variant === "reject" ? "reject" : "accept";
				const key = `${blankId}\0${role}`;
				if (defined.has(key)) {
					throw new ParseError(
						`repeated [^${blankId}/short-answer] ${role} definition`,
					);
				}
				defined.add(key);
				const patterns = this.parseAnswerBlock(node, rest, role === "reject");
				const blank: Record<string, unknown> = {
					id: blankId,
					type: "short-answer",
				};
				if (patterns.length > 0) blank[role] = patterns;
				addBlank(blanks, blank);
			} else {
				throw new ParseError(`unrecognized blank definition: ${repr(text)}`);
			}

			const next = this.seek();
			if (next === undefined || next.type !== "paragraph") {
				break;
			}
			text = this.rawText(next);
			if (!BLANK_RE.test(text)) {
				break;
			}
			node = this.read();
		}

		distributeBlankPatternLists(front, blanks);
		this.state.blanks = [...blanks.values()];
	}

	/**
	 * Look for an optional `## [answer-key]` section among the remaining
	 * nodes, a port of `MDQParser.parse_answer_key`. Written generically --
	 * it does not assume an essay body -- since any body type whose epilogue
	 * ends at a specific `H2` heading can reuse it, though only `essay`
	 * calls it today.
	 *
	 * @returns The nodes that should still be treated as epilogue: every
	 * node before the heading, if one was found, or every remaining node
	 * otherwise. Does not advance the cursor.
	 */
	private parseAnswerKey(): Node[] {
		const remaining = this.children.slice(this.pos);
		for (let i = 0; i < remaining.length; i++) {
			const node = remaining[i];
			if (node === undefined) {
				continue;
			}
			if (node.type === "heading" && node.tag === "h2") {
				const text = this.rawText(node);
				if (ANSWER_KEY_RE.test(text)) {
					const answerBlocks = remaining.slice(i + 1);
					for (const later of answerBlocks) {
						if (
							later.type === "heading" &&
							later.tag === "h2" &&
							ANSWER_KEY_RE.test(this.rawText(later))
						) {
							throw new ParseError(
								"a question defines at most one [answer-key] section",
							);
						}
					}
					const answerText = this.joinBlocks(answerBlocks);
					if (answerText) {
						this.state.answerKey = answerText;
					}
					return remaining.slice(0, i);
				}
			}
		}
		return remaining;
	}

	//
	// Main driver
	//
	parseQuestion(): RawDocument {
		if (this.comment !== undefined) {
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

		// Unconverted: `type: true` is not a question type, and the schema
		// reports it (base.md, "Frontmatter"). A null `type` is absent.
		const frontmatterType =
			this.frontmatter.type === undefined || this.frontmatter.type === null
				? undefined
				: (this.frontmatter.type as string);
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
			const peeked = this.seek();
			if (peeked === undefined || peeked.type !== "paragraph") {
				throw new ParseError("unrecognized question body");
			}
			const bodyNode = this.read();
			const bodyText = this.rawText(bodyNode);
			const tag = matchesTag(bodyText);
			if (tag === "essay") {
				questionType = frontmatterType ?? "essay";
				this.parseEssayBody();
			} else if (tag === "short-answer") {
				questionType = frontmatterType ?? "short-answer";
				this.parseShortAnswerBody(bodyText, bodyNode);
			} else if (tag === "numeric") {
				questionType = frontmatterType ?? "numeric";
				this.parseNumericBody(bodyText);
			} else if (tag === "ordering") {
				questionType = frontmatterType ?? "ordering";
				this.parseOrderingBody();
			} else if (tag === "blank") {
				questionType = frontmatterType ?? "fill-in";
				this.parseFillInBody(bodyText, bodyNode);
			} else {
				// `findBodyStart` only ever selects this node because it
				// matched one of the five tags, so this is unreachable.
				throw new ParseError("unrecognized question body");
			}
		}

		this.state.type = questionType;

		const epilogueBlocks =
			questionType === "essay"
				? this.parseAnswerKey()
				: this.children.slice(this.pos);
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
 * @param warnings When given, an `unknown-frontmatter-key` diagnostic is
 *   appended for every frontmatter key the parser does not consume, given
 *   the question's own type, and the layout warnings the parser finds
 *   (`detached-answer-list`). Parsing never fails because of them.
 * @throws {ParseError} If the source is not a well-formed MDQ question.
 */
export function parseQuestionDocument(
	source: string,
	warnings?: Diagnostic[],
): RawDocument {
	const parser = new QuestionParser(source);
	const doc = parser.parseQuestion();
	if (warnings !== undefined) {
		warnings.push(
			...questionFrontmatterWarnings(parser.frontmatter, String(doc.type)),
			...parser.diagnostics,
		);
	}
	return doc;
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
