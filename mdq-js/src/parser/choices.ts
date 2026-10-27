/**
 * Choice-list parsing, shared by multiple-choice, multiple-selection,
 * true-false and fill-in choice blanks -- every question shape whose body is
 * a bracket-led list (`* [x] ...`).
 *
 * A port of `mdq-py/mdq/_parser/_choices.py`. Also home to `SLUG_PREFIX_RE`:
 * a choice id is written with the exact same syntax as a question/exam slug.
 */

import { ForeignChoiceMarkerError, ParseError } from "../errors.js";
import {
	FALSE_LETTERS,
	isLetter,
	normalizeValue,
	stripMarkerSpace,
} from "../letters.js";
import { SLUG_BODY_RE } from "../markdown.js";
import { repr, strip } from "./text.js";

/** The question types whose body is a choice list. */
export type ChoiceType =
	| "multiple-choice"
	| "multiple-selection"
	| "true-false";

/** A choice of any `ChoiceType`: the fields depend on the type. */
export type ChoiceDict = Record<string, unknown>;

/** A pattern entry of `accept` or `reject`: bare, or with its observations. */
export type PatternEntry =
	| string
	| { pattern: string; feedback?: string; comment?: string };

// The grammar's `ws` is only spaces and tabs (docs/references/grammar.md):
// every `[ \t]` below is `ws`, and every `strip(text, " \t")` in this package
// trims `ws`. Any other Unicode space is text.

// Slugs and choice ids. A bracket followed by `(` or `[` opens a markdown
// link (`[text](url)`, `[text][ref]`), so it is never a slug or a choice id
// (base.md, "Slug"; multiple-choice.md, "Body").
const NOT_A_LINK = "(?![(\\[])";
export const SLUG_PREFIX_RE = new RegExp(
	`^\\[(?<slug>${SLUG_BODY_RE})\\]${NOT_A_LINK}[ \\t]*`,
	"u",
);
export const CHOICE_ID_PREFIX_RE = new RegExp(
	`^\\[(?<id>${SLUG_BODY_RE})\\]${NOT_A_LINK}[ \\t]*`,
	"u",
);

/**
 * The `CHOICE_MARK` terminal of docs/references/choices.md: a bracket with no
 * `]` or line ending inside, not followed by `(` or `[` (which would start a
 * markdown link).
 */
const CHOICE_MARK_RE = /^\[(?<value>[^\]\r\n]*)\](?![([])/u;
/** A bracket that starts a markdown link, `[text](url)` or `[text][ref]`. */
export const LINK_START_RE = /^\[[^\]\r\n]*\][([]/u;
/**
 * The `percent` rule of multiple-choice.md: an `INTEGER` or a `DECIMAL` (no
 * leading zeros) with an optional sign.
 */
export const PERCENT_RE = /^[+-]?(?:[1-9][0-9]*|0)(?:\.[0-9]+)?%$/u;
/**
 * The `LAZY_START` terminal of docs/references/grammar.md, for a line without
 * its line ending: the first character of a line that continues the block
 * before it. It is not a `>` or `!` marker, and it does not start a block
 * that interrupts a paragraph.
 */
const LAZY_START_RE =
	/^(?!>|!(?!\[)|[*+-][ \t]|0{0,8}1[.)][ \t]|#{1,6}(?:[ \t]|$)|`{3}|~{3}|(?:\*[ \t]*){3,}$|(?:-[ \t]*){3,}$|(?:_[ \t]*){3,}$)[^ \t\r\n]/u;
/**
 * Columns of indentation that make a line code or a continuation line,
 * relative to the content of the list item that holds it.
 */
export const CODE_INDENT = 4;

/** One list item read by the parser, before the fields of the type apply. */
export interface RawChoice {
	value: string;
	explicitId: string | null;
	text: string;
	feedback: string | null;
	comment: string | null;
	/** The number of source lines of `text`. */
	textLines: number;
}

export interface ParsedMarker {
	readonly marker: string;
	readonly id: string | null;
	readonly rest: string;
}

/**
 * The columns of whitespace at the start of `line`, with a tab expanded to
 * the next multiple of four columns, as in CommonMark.
 */
export function indentation(line: string): number {
	let column = 0;
	for (const char of line) {
		if (char === " ") column += 1;
		else if (char === "\t") column += 4 - (column % 4);
		else break;
	}
	return column;
}

/** `line` without the spaces and tabs at its start. */
function lstripWs(line: string): string {
	return line.replace(/^[ \t]+/u, "");
}

/**
 * Remove `columns` columns of indentation from the start of `line`.
 *
 * Tabs in the indentation expand to spaces first, so a tab that spans the cut
 * keeps the columns after it. A line with less indentation loses all of it,
 * as a lazy continuation line does in CommonMark.
 */
export function dedent(line: string, columns: number): string {
	return " ".repeat(Math.max(indentation(line) - columns, 0)) + lstripWs(line);
}

/**
 * The choice marker at the start of the first content line of a list item
 * (choices.md, "Choice marker"), or `null` when the line does not start with
 * one. Up to three columns of indentation can come before it; with more, the
 * content is an indented code block (grammar.md, "Content of a list item").
 */
export function matchChoiceMarker(line: string): RegExpExecArray | null {
	if (indentation(line) >= CODE_INDENT) return null;
	return CHOICE_MARK_RE.exec(lstripWs(line));
}

/**
 * Extract a choice item's (value, explicit id, remaining text) from the first
 * content line of the item, e.g. `[x] [my-id] Some text`.
 *
 * @throws {ParseError} If `line` does not start with a choice marker, or the
 *   brackets are empty (`[]`).
 */
export function parseMarker(line: string): ParsedMarker {
	const m = matchChoiceMarker(line);
	if (m === null) throw new ParseError(`malformed choice item: ${repr(line)}`);
	const raw = m.groups?.value ?? "";
	if (raw === "") {
		throw new ParseError(
			`empty choice marker \`[]\` (use \`[ ]\` for blank): ${repr(line)}`,
		);
	}
	const value = stripMarkerSpace(raw);
	let rest = lstripWs(lstripWs(line).slice(m[0].length));

	let id: string | null = null;
	const idMatch = CHOICE_ID_PREFIX_RE.exec(rest);
	if (idMatch) {
		id = idMatch.groups?.id ?? null;
		rest = rest.slice(idMatch[0].length);
	}
	return { marker: value, id, rest };
}

/**
 * Whether the text of a choice marker is the value of some choice type or is
 * empty (question-base.md, "Forbidden elements"): blank, `x`/`X`, `*`, a
 * percentage, a single letter, or `[]`. The value is normalized first
 * (`normalizeValue`), so `[＊]` is `*`.
 */
export function isChoiceValue(value: string): boolean {
	const normalized = normalizeValue(value);
	return (
		normalized === "" ||
		normalized === "*" ||
		PERCENT_RE.test(normalized) ||
		isLetter(normalized)
	);
}

//
// Feedback and comment lines (grammar.md, "Feedback and comment lines")
//
/**
 * The kind of a line after the text of an element: a `>` feedback line, a `!`
 * comment line, a lazy continuation line, a blank line, or a line that starts
 * a block which interrupts a paragraph.
 */
export type LineKind = ">" | "!" | "lazy" | "blank" | "block";

/**
 * Return the kind of `line` and its content: the text after the marker and
 * its `ws` for a feedback or comment line, the text without its indentation
 * for a lazy line.
 *
 * `line` is relative to the content of its element: a line with four or more
 * columns of indentation is a continuation line, whatever it starts with
 * (grammar.md, "Content of a list item").
 */
export function classifyLine(line: string): [LineKind, string] {
	const stripped = strip(line, " \t");
	if (!stripped) return ["blank", ""];
	if (indentation(line) >= CODE_INDENT) return ["lazy", stripped];
	if (stripped.startsWith(">")) return [">", strip(stripped.slice(1), " \t")];
	if (stripped.startsWith("!") && !stripped.startsWith("![")) {
		return ["!", strip(stripped.slice(1), " \t")];
	}
	if (LAZY_START_RE.test(stripped)) return ["lazy", stripped];
	return ["block", stripped];
}

/**
 * Join the lines of a text, feedback or comment as markdown joins the lines
 * of a paragraph: with one space. An empty string in `lines` is an empty
 * marker line, which separates two paragraphs with a blank line.
 */
export function joinParagraphLines(lines: readonly string[]): string {
	const paragraphs: string[][] = [[]];
	for (const line of lines) {
		if (line) {
			paragraphs[paragraphs.length - 1]?.push(line);
		} else if ((paragraphs[paragraphs.length - 1]?.length ?? 0) > 0) {
			paragraphs.push([]);
		}
	}
	return paragraphs
		.filter((p) => p.length > 0)
		.map((p) => p.join(" "))
		.join("\n\n");
}

/**
 * Split the content of an element into its text, feedback and comment.
 *
 * @param first The text on the first line, after the marker, value and id.
 * @param lines The other content lines of the element, relative to its
 *   content column.
 * @param joinText Joins the lines of the text. A pattern joins them as
 *   `joinPatternLines` does.
 * @returns A `RawChoice` with an empty value and no id, which the caller
 *   fills in.
 * @throws {ParseError} The lines after the text are not a feedback block and
 *   a comment block (`parseObservations`).
 */
export function splitItem(
	first: string,
	lines: readonly string[],
	joinText: (lines: readonly string[]) => string = joinParagraphLines,
): RawChoice {
	const text = [strip(first, " \t")];
	let index = 0;
	while (index < lines.length) {
		const [kind, content] = classifyLine(lines[index] ?? "");
		if (kind !== "lazy") break;
		text.push(content);
		index++;
	}
	const [feedback, comment] = parseObservations(lines.slice(index));
	return {
		value: "",
		explicitId: null,
		text: joinText(text),
		feedback,
		comment,
		textLines: text.length,
	};
}

/**
 * Read the feedback (`>`) and comment (`!`) blocks of an element, in either
 * order, and return the value of each, or `null` when absent.
 *
 * A marker line of the other kind, or a blank line, ends a block. A lazy line
 * continues the open block. An empty marker line separates two paragraphs of
 * the value.
 *
 * @throws {ParseError} A second block of the same kind (also after a blank
 *   line or a block of the other kind), a lazy line with no open block, or a
 *   line that starts another markdown block.
 */
export function parseObservations(
	lines: readonly string[],
): [string | null, string | null] {
	const blocks = new Map<string, string[]>();
	let current: string | null = null;
	for (const line of lines) {
		const [kind, content] = classifyLine(line);
		if (kind === "blank") {
			current = null;
		} else if (kind === ">" || kind === "!") {
			if (kind !== current) {
				if (blocks.has(kind)) {
					const name = kind === ">" ? "feedback" : "comment";
					throw new ParseError(
						`an element has at most one ${name} block: ${repr(line)}`,
					);
				}
				blocks.set(kind, []);
				current = kind;
			}
			blocks.get(kind)?.push(content);
		} else if (kind === "lazy" && current !== null) {
			blocks.get(current)?.push(content);
		} else {
			throw new ParseError(
				"only a feedback block and a comment block can follow the text " +
					`of an element: ${repr(line)}`,
			);
		}
	}
	const feedback = blocks.get(">");
	const comment = blocks.get("!");
	return [
		feedback === undefined ? null : joinParagraphLines(feedback),
		comment === undefined ? null : joinParagraphLines(comment),
	];
}

/**
 * The index of the first value that is not in the `value` rule of
 * `questionType` (base.md, "Type inference"), or `null` when every value
 * belongs to it. `values` are the bracket values stripped of spaces and tabs,
 * as `RawChoice.value` holds them. The rules apply to the normalized value
 * (`normalizeValue`): multiple-choice takes `""`, `*` or a percentage;
 * multiple-selection `""` or `x`; true-false one letter (`LETTER`) that is
 * not `x`.
 */
export function foreignChoiceIndex(
	questionType: ChoiceType,
	values: readonly string[],
): number | null {
	for (const [index, value] of values.entries()) {
		const normalized = normalizeValue(value);
		let ok: boolean;
		if (questionType === "multiple-choice") {
			ok =
				normalized === "" || normalized === "*" || PERCENT_RE.test(normalized);
		} else if (questionType === "multiple-selection") {
			ok = normalized === "" || normalized === "x";
		} else {
			ok = isLetter(normalized) && normalized !== "x";
		}
		if (!ok) return index;
	}
	return null;
}

/**
 * Infer multiple-choice / multiple-selection / true-false from the bracket
 * values used in a choice list, per generic.md's rule that a bracket-led list
 * is never valid stem -- it is always a choice body of one of these three
 * kinds.
 *
 * A list whose markers are all blank is multiple-selection: nothing is marked
 * correct, which multiple-selection allows outright (zero correct choices is
 * a legal answer key) but multiple-choice does not.
 */
export function inferChoiceType(values: readonly string[]): ChoiceType {
	const normalized = values.map(normalizeValue);
	for (const n of normalized) {
		if (n === "*" || PERCENT_RE.test(n)) return "multiple-choice";
	}
	if (normalized.includes("x")) return "multiple-selection";
	for (const n of normalized) {
		if (isLetter(n)) return "true-false";
	}
	return "multiple-selection";
}

/** The `ChoiceType` that `questionType` declares, or `null` for any other value. */
export function asChoiceType(questionType: unknown): ChoiceType | null {
	switch (questionType) {
		case "multiple-choice":
		case "multiple-selection":
		case "true-false":
			return questionType;
		default:
			return null;
	}
}

/**
 * Build the `choices` of a choice list body or of a fill-in choice blank.
 *
 * @param questionType The type that decides the fields of each choice. `null`
 *   when the frontmatter forces a type that has no choices: the choices keep
 *   their text, id, feedback and comment, and the schema rejects the
 *   document.
 * @param rawChoices The parsed list items.
 * @param path The path of the object that holds the choices, for the error.
 * @throws {ForeignChoiceMarkerError} A marker is not in the `value` rule of
 *   `questionType`.
 */
export function buildChoices(
	questionType: ChoiceType | null,
	rawChoices: readonly RawChoice[],
	path: readonly (string | number)[] = [],
): ChoiceDict[] {
	if (questionType !== null) {
		const foreign = foreignChoiceIndex(
			questionType,
			rawChoices.map((c) => c.value),
		);
		if (foreign !== null) {
			throw new ForeignChoiceMarkerError(
				rawChoices[foreign]?.value ?? "",
				questionType,
				[...path, "choices", foreign],
			);
		}
	}
	return rawChoices.map((choice) => buildChoice(questionType, choice));
}

/** One choice of a list item, with the fields of `questionType`. */
function buildChoice(
	questionType: ChoiceType | null,
	choice: RawChoice,
): ChoiceDict {
	const entry: ChoiceDict = { text: choice.text };
	if (choice.explicitId !== null) entry.id = choice.explicitId;
	if (questionType === "multiple-choice") {
		// `[ ]` omits the score; `[0%]` is an explicit zero
		// (multiple-choice.md, "Choices").
		const score = scoreFromValue(choice.value);
		if (score !== undefined) entry.score = score;
	} else if (questionType === "multiple-selection") {
		// `correct` is required: a blank `[ ]` is an explicit false.
		entry.correct = normalizeValue(choice.value) === "x";
	} else if (questionType === "true-false") {
		// TRUE and WARNING letters both mean true; only FALSE letters mean
		// false (docs/question-types/true-false.md).
		entry.correct = !FALSE_LETTERS.has(normalizeValue(choice.value));
		if (choice.value) entry.marker = choice.value;
	}
	if (choice.feedback !== null) entry.feedback = choice.feedback;
	if (choice.comment !== null) entry.comment = choice.comment;
	return entry;
}

/**
 * The `score` of a choice `value` (multiple-choice.md, "Choices"): `*` is 1,
 * a percentage is its fraction, and a blank omits the score -- the grading
 * strategy decides what it is worth. Any other value is read as a blank too.
 */
export function scoreFromValue(value: string): number | undefined {
	const normalized = normalizeValue(value);
	if (normalized === "*") return 1;
	if (PERCENT_RE.test(normalized)) return Number(normalized.slice(0, -1)) / 100;
	return undefined;
}

/** One accept/reject entry, bare when it has no feedback or comment. */
export function patternEntry(item: RawChoice): PatternEntry {
	const pattern = strip(item.text, " \t");
	if (!pattern)
		throw new ParseError("a short-answer pattern line cannot be empty");
	if (item.feedback === null && item.comment === null) return pattern;
	const entry: { pattern: string; feedback?: string; comment?: string } = {
		pattern,
	};
	if (item.feedback !== null) entry.feedback = item.feedback;
	if (item.comment !== null) entry.comment = item.comment;
	return entry;
}
