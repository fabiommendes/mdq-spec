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

import {
	ConflictingAnswerKeyError,
	MissingFieldError,
	ParseError,
} from "../errors.js";
import type { Question } from "../schema/questions.js";
import { validateQuestion } from "../validate.js";
import {
	assignChoiceIds,
	BRACKET_ITEM_RE,
	buildChoices,
	inferChoiceType,
	parseItem,
	parsePlainItem,
	patternEntry,
	SLUG_BODY_RE,
	SLUG_PREFIX_RE,
	scoreFromValue,
	splitListItems,
	stripListMarker,
} from "./choices.js";
import {
	copyPatternLists,
	extractComment,
	loadFrontmatterYaml,
	normalizeTags,
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
	`^\\[numeric(?:\\((?<unit>${UNIT_CLASS})\\))?\\]:[ \\t]*(?<rest>[^\\n]*)$`,
	"u",
);
/**
 * A blank definition tag `[^id]:` or `[^id/kind]:`, capturing the id, the
 * kind suffix and the rest of the line. Permissive in `kind` so that an
 * unrecognized suffix reaches `BLANK_KIND_RE` and raises. A port of
 * `BLANK_RE`. `[^\n]` stands for `.`.
 */
const BLANK_RE = new RegExp(
	`^\\[\\^(?<id>${SLUG_BODY_RE})(?:/(?<kind>[^\\]]+))?\\]:[ \\t]*(?<rest>[^\\n]*)$`,
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
	private rawText(node: Node): string {
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
	 * @throws {ParseError} If a section carries more than one feedback or
	 * comment block, or the two interleave.
	 */
	private parseOrderingObservations(): {
		feedback: string | undefined;
		comment: string | undefined;
	} {
		let feedback: string | undefined;
		let comment: string | undefined;
		for (let i = 0; i < 2; i++) {
			const node = this.seek();
			if (
				node !== undefined &&
				node.type === "blockquote" &&
				feedback === undefined
			) {
				feedback = joinPrefixedLines(this.rawLines(node), ">");
				this.read();
			} else if (
				node !== undefined &&
				node.type === "paragraph" &&
				comment === undefined &&
				isCommentBlock(this.rawLines(node))
			) {
				comment = joinPrefixedLines(this.rawLines(node), "!");
				this.read();
			} else {
				break;
			}
		}

		const node = this.seek();
		if (
			node !== undefined &&
			(node.type === "blockquote" ||
				(node.type === "paragraph" && isCommentBlock(this.rawLines(node))))
		) {
			throw new ParseError(
				"an accept/reject section carries at most one feedback and one " +
					"comment block, and they must not interleave",
			);
		}
		return { feedback, comment };
	}

	/**
	 * Fill `oneOf`/`regex`/`accept`/`reject`/`openEnded`/`diacritics` from a
	 * `[short-answer]:` body (or delegate to {@link parseShortAnswerPatternBlocks}
	 * for a `[short-answer/accept]:`/`[short-answer/reject]:` one), a port of
	 * `parse_short_answer_body`. `tagText` is the body paragraph's raw text,
	 * already known to match `SHORT_ANSWER_RE`.
	 *
	 * @throws {ParseError} If a second `[short-answer]` block follows, or a
	 * trailing pattern block's list is missing or malformed.
	 * @throws {ConflictingAnswerKeyError} If `accept` or `reject` is declared
	 * both in the frontmatter and as a body block.
	 */
	private parseShortAnswerBody(tagText: string): void {
		const match = SHORT_ANSWER_RE.exec(tagText);
		if (!match?.groups) {
			throw new ParseError(
				`malformed short-answer body: ${JSON.stringify(tagText)}`,
			);
		}
		const variant = match.groups.variant;
		const front = this.frontmatter;
		const doc = this.state;

		if (Object.hasOwn(front, "diacritics")) {
			doc.diacritics = front.diacritics;
		}

		if (variant === "accept" || variant === "reject") {
			this.parseShortAnswerPatternBlocks(tagText);
			return;
		}

		const rest = strip(match.groups.rest ?? "", " \t");

		let value: string | undefined;
		let values: string[] | undefined;
		if (rest) {
			value = rest;
		} else {
			const node = this.seek();
			if (node !== undefined && node.type === "bullet_list") {
				this.read();
				values = splitListItems(this.rawLines(node)).map((item) =>
					item.map((line) => stripListMarker(line)).join(" "),
				);
			}
		}

		if (Object.hasOwn(front, "openEnded")) {
			doc.openEnded = front.openEnded;
		}
		copyPatternLists(front, doc);

		let regex = Object.hasOwn(front, "regex")
			? (front.regex as string)
			: undefined;
		if (
			regex === undefined &&
			value !== undefined &&
			value.startsWith("/") &&
			value.endsWith("/") &&
			value.length >= 2
		) {
			regex = value.slice(1, -1);
			value = undefined;
		}

		if (regex !== undefined) {
			doc.regex = regex;
		} else if (values !== undefined) {
			doc.oneOf = values;
		} else if (value !== undefined) {
			doc.oneOf = [value];
		}

		this.parseTrailingPatternBlocks();

		// A bare block is open-ended only when nothing grades it: no
		// pattern in the body, in a trailing block or in the frontmatter
		// (short-answer.md, "Fully manual"). preAccept/preReject only
		// validate the form of a response, so they do not count.
		if (
			!Object.hasOwn(doc, "oneOf") &&
			!Object.hasOwn(doc, "regex") &&
			!Object.hasOwn(doc, "accept") &&
			!Object.hasOwn(doc, "reject") &&
			!Object.hasOwn(doc, "openEnded")
		) {
			doc.openEnded = true;
		}
	}

	/**
	 * Consume `[short-answer/accept]:`/`[short-answer/reject]:` blocks
	 * following a simple `[short-answer]:` block, a port of
	 * `parse_trailing_pattern_blocks`.
	 *
	 * @throws {ParseError} If the following block is another bare
	 * `[short-answer]:` block, which the simple block already is.
	 */
	private parseTrailingPatternBlocks(): void {
		const node = this.seek();
		if (node === undefined || node.type !== "paragraph") {
			return;
		}
		const text = this.rawText(node);
		const match = SHORT_ANSWER_RE.exec(text);
		if (!match?.groups) {
			return;
		}
		const variant = match.groups.variant;
		if (variant !== "accept" && variant !== "reject") {
			throw new ParseError(
				"a question defines at most one [short-answer] block",
			);
		}
		this.read();
		this.parseShortAnswerPatternBlocks(text);
	}

	/**
	 * Fill `accept`/`reject` from a run of `[short-answer/<variant>]:`
	 * blocks, a port of `parse_short_answer_pattern_blocks`.
	 *
	 * @throws {ParseError} If a variant is declared twice, a bare
	 * `[short-answer]:` block follows one of these, or a block is not
	 * followed by the bullet list holding its patterns.
	 * @throws {ConflictingAnswerKeyError} If a variant is declared both in
	 * the frontmatter and as a body block.
	 */
	private parseShortAnswerPatternBlocks(tagText: string): void {
		let text = tagText;
		for (;;) {
			const match = SHORT_ANSWER_RE.exec(text);
			if (!match?.groups) {
				break;
			}
			const variant = match.groups.variant;
			if (variant !== "accept" && variant !== "reject") {
				throw new ParseError(
					`a [short-answer] block cannot follow [short-answer/${variant ?? "accept"}]`,
				);
			}
			if (Object.hasOwn(this.state, variant)) {
				throw new ParseError(`repeated [short-answer/${variant}] block`);
			}
			if (Object.hasOwn(this.frontmatter, variant)) {
				throw new ConflictingAnswerKeyError(
					`'${variant}' is declared both in the frontmatter and as a [short-answer/${variant}] body block`,
				);
			}
			if (strip(match.groups.rest ?? "", " \t")) {
				throw new ParseError(
					`[short-answer/${variant}] takes a list, not inline text`,
				);
			}

			const node = this.seek();
			if (node === undefined || node.type !== "bullet_list") {
				throw new ParseError(
					`[short-answer/${variant}] must be followed by a list`,
				);
			}
			this.read();
			this.state[variant] = splitListItems(this.rawLines(node)).map((item) =>
				patternEntry(parsePlainItem(item)),
			);

			const next = this.seek();
			if (next === undefined || next.type !== "paragraph") {
				break;
			}
			const nextText = this.rawText(next);
			if (!SHORT_ANSWER_RE.test(nextText)) {
				break;
			}
			this.read();
			text = nextText;
		}

		copyPatternLists(this.frontmatter, this.state);
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
		} else if (parsed.domain !== undefined) {
			doc.domain = parsed.domain;
		}
		if (Object.hasOwn(front, "decimalPlaces")) {
			doc.decimalPlaces = front.decimalPlaces;
		} else if (parsed.decimalPlaces !== undefined) {
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
	 * `parse_fill_in_body`. A slug may be defined more than once, so
	 * definitions accumulate into one blank per slug, in the order the slug
	 * is first seen. `tagText` is the first definition's raw text.
	 *
	 * @throws {ParseError} If a tag suffix is unrecognized or misplaced, a
	 * slug's definitions disagree about the blank's kind, or a definition
	 * of the same form is repeated.
	 */
	private parseFillInBody(tagText: string): void {
		const front = this.frontmatter;
		if (Object.hasOwn(front, "shuffle")) {
			this.state.shuffle = front.shuffle;
		}
		if (Object.hasOwn(front, "diacritics")) {
			this.state.diacritics = front.diacritics;
		}

		const blanks = new Map<string, Record<string, unknown>>();
		let text = tagText;
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
				this.read();
				const rawChoices = splitListItems(this.rawLines(nextNode)).map((item) =>
					parseItem(item),
				);
				const ids = assignChoiceIds(rawChoices);
				const choices = rawChoices.map((choice, index) => {
					const entry: Record<string, unknown> = { text: choice.text };
					const id = ids[index];
					if (id !== undefined) entry.id = id;
					const score = scoreFromValue(choice.value);
					if (score) entry.score = score;
					if (choice.feedback) entry.feedback = choice.feedback;
					if (choice.comment) entry.comment = choice.comment;
					return entry;
				});
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
				if (parsed.domain !== undefined) blank.domain = parsed.domain;
				if (parsed.decimalPlaces !== undefined) {
					blank.decimalPlaces = parsed.decimalPlaces;
				}
				if (parsed.tolerance !== undefined) blank.tolerance = parsed.tolerance;
				addBlank(blanks, blank);
			} else if (blankType === "short-answer" && variant !== undefined) {
				if (rest) {
					throw new ParseError(
						`[^${blankId}/short-answer/${variant}] takes a list, not inline text`,
					);
				}
				const node = this.seek();
				if (node === undefined || node.type !== "bullet_list") {
					throw new ParseError(
						`[^${blankId}/short-answer/${variant}] must be followed by a list`,
					);
				}
				this.read();
				const patterns = splitListItems(this.rawLines(node)).map((item) =>
					patternEntry(parsePlainItem(item)),
				);
				addBlank(blanks, {
					id: blankId,
					type: "short-answer",
					[variant]: patterns,
				});
			} else if (blankType === "short-answer") {
				// `/re/` with no trailing flags is the one form with a field of
				// its own; everything else (a plain literal, a backtick-enclosed
				// exact answer, a flagged regex) goes to `oneOf` verbatim.
				if (rest.startsWith("/") && rest.endsWith("/") && rest.length >= 2) {
					addBlank(blanks, {
						id: blankId,
						type: "short-answer",
						regex: rest.slice(1, -1),
					});
				} else {
					addBlank(blanks, {
						id: blankId,
						type: "short-answer",
						oneOf: [rest],
					});
				}
			} else {
				throw new ParseError(`unrecognized blank definition: ${repr(text)}`);
			}

			const node = this.seek();
			if (node === undefined || node.type !== "paragraph") {
				break;
			}
			text = this.rawText(node);
			if (!BLANK_RE.test(text)) {
				break;
			}
			this.read();
		}

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
				this.parseShortAnswerBody(bodyText);
			} else if (tag === "numeric") {
				questionType = frontmatterType ?? "numeric";
				this.parseNumericBody(bodyText);
			} else if (tag === "ordering") {
				questionType = frontmatterType ?? "ordering";
				this.parseOrderingBody();
			} else if (tag === "blank") {
				questionType = frontmatterType ?? "fill-in";
				this.parseFillInBody(bodyText);
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
