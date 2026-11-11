/**
 * The rubric item syntax (docs/references/rubric.md) and the annotations of a
 * test source (docs/question-types/code.md, "Annotations").
 *
 * `parseItemLine` reads the first line of a rubric item, in a list of
 * `## [rubric]` or after the `mdq:` marker of an annotation. `scanAnnotations`
 * reads the lines of a test source: its items, their regions and the problems
 * the lines have. Both are pure functions of text, so the parser (a Markdown
 * rubric list) and the models (the `text` of a test source and the `text` of a
 * rubric item, in every form of the document) share one reading.
 *
 * A port of `mdq-py/mdq/_parser/_rubric.py`.
 */

import { hasVisibleCharacter, splitLines } from "../markdown.js";
import { joinParagraphLines } from "./choices.js";
import { lstrip, strip } from "./text.js";

/** The `RUBRIC_VALUE` terminal of docs/references/rubric.md. */
const VALUE_RE =
	/^\[(?<number>[+-]?(?:[1-9][0-9]*|0)(?:[.][0-9]+)?)\](?![([])/u;
/** A modifier: a lower case name between braces. */
const MODIFIER_RE = /^\{(?<name>[a-z]+(?:-[a-z]+)*)\}/u;
/** A bracket that starts an inline, full or collapsed link. */
const LINK_START_RE = /^\[[^[\]\r\n]*\][([]/u;
/** The `ANNOTATION_START` terminal of docs/question-types/code.md. */
const ANNOTATION_START_RE = /^[ \t!-/:-@[-`{-~]*mdq:/u;

/** The modifiers of an annotation. */
export const ANNOTATION_MODIFIERS: ReadonlySet<string> = new Set([
	"public",
	"example",
]);
/** The modifiers of an item of `## [rubric]`. */
export const LIST_MODIFIERS: ReadonlySet<string> = new Set(["manual"]);

/** The codes a problem of an annotation can have. */
export type ProblemCode = "invalid-rubric-item" | "blank-text";

/** A rubric item that breaks the syntax of docs/references/rubric.md. */
export class RubricSyntaxError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RubricSyntaxError";
	}
}

/**
 * The first line of a rubric item.
 *
 * `value` is the number between brackets, `null` when the item has none.
 * `modifiers` are the names between braces, in order, repeats included.
 * `criterion` is the text after the value and the modifiers. It can be
 * blank: the caller reports `blank-text`.
 */
export interface RubricLine {
	readonly value: number | null;
	readonly modifiers: readonly string[];
	readonly criterion: string;
}

/** The value of the number of a `RUBRIC_VALUE`; `-0` is 0. */
function toNumber(text: string): number {
	const number = Number(text);
	return number === 0 ? 0 : number;
}

/**
 * Throw a `RubricSyntaxError` if `text`, a non-blank criterion, starts with a
 * character that the criterion grammar excludes: `{`, `>`, a `!` not
 * followed by `[`, or a `[` that does not start a link.
 */
export function checkCriterionStart(text: string): void {
	if (text.startsWith("{")) {
		throw new RubricSyntaxError(
			"a `{` that does not open a modifier: a criterion that starts " +
				"with a brace writes `\\{`",
		);
	}
	if (
		text.startsWith(">") ||
		(text.startsWith("!") && !text.startsWith("!["))
	) {
		throw new RubricSyntaxError(
			`a criterion does not start with '${text[0]}', which marks feedback ` +
				`or a comment: write \`\\${text[0]}\``,
		);
	}
	if (text.startsWith("[") && !LINK_START_RE.test(text)) {
		throw new RubricSyntaxError(
			"a criterion that starts with `[` must start a link: a malformed " +
				"value such as `[ 3 ]`, `[3,5]` or `[50%]`, or a `[slug]`, is an " +
				"error (write `\\[` for a literal bracket)",
		);
	}
}

/**
 * Read the first line of a rubric item: an optional value, optional
 * modifiers and the criterion (docs/references/rubric.md, "Item").
 *
 * @param line The line after the list marker, or after the `mdq:` marker.
 * @throws {RubricSyntaxError} A `{` that does not open a modifier, or a
 *   criterion that starts with a character the grammar excludes.
 */
export function parseItemLine(line: string): RubricLine {
	let rest = strip(line, " \t");
	let value: number | null = null;
	const found = VALUE_RE.exec(rest);
	if (found?.groups) {
		value = toNumber(found.groups.number as string);
		rest = lstrip(rest.slice(found[0].length), " \t");
	}
	const modifiers: string[] = [];
	while (rest.startsWith("{")) {
		const modifier = MODIFIER_RE.exec(rest);
		if (modifier?.groups) {
			modifiers.push(modifier.groups.name as string);
			rest = lstrip(rest.slice(modifier[0].length), " \t");
		} else {
			checkCriterionStart(rest); // throws: a brace that opens nothing
		}
	}
	if (rest) checkCriterionStart(rest);
	return { value, modifiers, criterion: rest };
}

/** Whether `line` is empty or has only spaces and tabs. */
export function isBlankLine(line: string): boolean {
	return !strip(line, " \t");
}

/** One violation of the rules of an annotation, on a line of the source. */
export interface AnnotationProblem {
	readonly code: ProblemCode;
	readonly message: string;
	/** The line of the source, counted from 1. */
	readonly line: number;
}

/**
 * One rubric item that an annotation declares, with its region.
 *
 * `line` is the line of the item line and `end` the last line of the region
 * of the item, both counted from 1. `value` is `null` when the item has none
 * (it is 1). `public` is `{public}` or `{example}`; `example` is `{example}`.
 * `text` is the criterion. `annotationLines` is how many lines the item
 * line, its feedback and its comment use.
 */
export interface Annotation {
	readonly line: number;
	readonly end: number;
	readonly value: number | null;
	readonly public: boolean;
	readonly example: boolean;
	readonly text: string;
	readonly feedback: string | null;
	readonly comment: string | null;
	readonly annotationLines: number;
}

/**
 * What `scanAnnotations` found in the text of a test source.
 *
 * `lines` are the lines of the text, without their endings. `items` are the
 * valid items, in order; with `problems`, the regions are not reliable.
 * `problems` are the violations of the rules, in order. `annotated` is
 * whether the source has at least one item line, valid or not.
 */
export interface Annotations {
	readonly lines: string[];
	items: Annotation[];
	readonly problems: AnnotationProblem[];
	annotated: boolean;
}

/**
 * The text of the region of `item` and its first line, for display
 * (docs/question-types/code.md, "Public regions"). `null` when the region has
 * no non-blank line after the lines of the annotation.
 */
export function publicText(
	annotations: Annotations,
	item: Annotation,
): [text: string, firstLine: number] | null {
	let body = annotations.lines.slice(
		item.line - 1 + item.annotationLines,
		item.end,
	);
	let first = item.line + item.annotationLines;
	while (body.length > 0 && isBlankLine(body[0] as string)) {
		body = body.slice(1);
		first += 1;
	}
	while (body.length > 0 && isBlankLine(body[body.length - 1] as string)) {
		body = body.slice(0, -1);
	}
	if (body.length === 0) return null;
	return [body.join("\n"), first];
}

/** The kind and content of a feedback or comment line, else `null`. */
function splitObservation(rest: string): [">" | "!", string] | null {
	if (rest.startsWith(">")) return [">", strip(rest.slice(1), " \t")];
	if (rest.startsWith("!") && !rest.startsWith("![")) {
		return ["!", strip(rest.slice(1), " \t")];
	}
	return null;
}

/** An item line and the observation lines read after it so far. */
interface Draft {
	line: number;
	parsed: RubricLine | null;
	lines: number;
	feedback: string[] | null;
	comment: string[] | null;
	/** The line where the feedback block and the comment block start. */
	feedbackLine: number;
	commentLine: number;
	/** The kind of the observation block that is open, if any. */
	openKind: string | null;
	/** The kinds of the blocks that ended. */
	closed: Set<string>;
}

const BLOCK_NAMES: Readonly<Record<string, string>> = {
	">": "feedback",
	"!": "comment",
};

/**
 * Read the annotations of the `text` of a test source
 * (docs/question-types/code.md, "Annotations" and "Regions").
 *
 * The scan never throws: a violation is an `AnnotationProblem`. A line that
 * has no annotation marker is ordinary text.
 */
export function scanAnnotations(text: string): Annotations {
	const lines = splitLines(text);
	const result: Annotations = {
		lines,
		items: [],
		problems: [],
		annotated: false,
	};
	const drafts: Draft[] = [];
	// The item that the next observation line can still extend.
	let current: Draft | null = null;
	for (const [index, line] of lines.entries()) {
		const number = index + 1;
		const marker = ANNOTATION_START_RE.exec(line);
		if (marker === null) {
			current = null;
			continue;
		}
		const rest = strip(line.slice(marker[0].length), " \t");
		const observation = splitObservation(rest);
		if (observation === null) {
			result.annotated = true;
			current = {
				line: number,
				parsed: null,
				lines: 1,
				feedback: null,
				comment: null,
				feedbackLine: 0,
				commentLine: 0,
				openKind: null,
				closed: new Set(),
			};
			drafts.push(current);
			current.parsed = readItem(rest, number, result);
			continue;
		}
		const [kind, content] = observation;
		if (current === null) {
			result.problems.push({
				code: "invalid-rubric-item",
				message:
					"a feedback or comment line must follow an item line or " +
					"another line of the same annotation",
				line: number,
			});
			continue;
		}
		current.lines += 1;
		if (kind !== current.openKind) {
			if (current.closed.has(kind)) {
				result.problems.push({
					code: "invalid-rubric-item",
					message: `an annotation has at most one ${BLOCK_NAMES[kind]} block`,
					line: number,
				});
				continue;
			}
			if (current.openKind !== null) current.closed.add(current.openKind);
			current.openKind = kind;
			if (kind === ">") {
				current.feedback = [];
				current.feedbackLine = number;
			} else {
				current.comment = [];
				current.commentLine = number;
			}
		}
		(kind === ">" ? current.feedback : current.comment)?.push(content);
	}

	for (const draft of drafts) {
		if (draft.parsed !== null) checkBlocks(draft, result);
	}
	result.items = regions(drafts, lines.length);
	return result;
}

/** Parse the item line `rest`, or record why it fails and return `null`. */
function readItem(
	rest: string,
	number: number,
	result: Annotations,
): RubricLine | null {
	let parsed: RubricLine;
	try {
		parsed = parseItemLine(rest);
	} catch (error) {
		if (!(error instanceof RubricSyntaxError)) throw error;
		result.problems.push({
			code: "invalid-rubric-item",
			message: error.message,
			line: number,
		});
		return null;
	}
	const names = parsed.modifiers;
	const bad = names.find((n) => !ANNOTATION_MODIFIERS.has(n));
	if (bad !== undefined) {
		const hint =
			bad === "manual"
				? "`{manual}` is the binding of an item of `## [rubric]`"
				: "an annotation accepts `{public}` and `{example}`";
		result.problems.push({
			code: "invalid-rubric-item",
			message: `the modifier {${bad}}: ${hint}`,
			line: number,
		});
		return null;
	}
	if (new Set(names).size !== names.length) {
		result.problems.push({
			code: "invalid-rubric-item",
			message: "a modifier repeats in one item",
			line: number,
		});
		return null;
	}
	if (!hasVisibleCharacter(parsed.criterion)) {
		result.problems.push({
			code: "blank-text",
			message: "the criterion of the annotation has no visible character",
			line: number,
		});
		return null;
	}
	return parsed;
}

/** Record a feedback or comment of `draft` that has no visible character. */
function checkBlocks(draft: Draft, result: Annotations): void {
	const blocks: [string, string[] | null, number][] = [
		["feedback", draft.feedback, draft.feedbackLine],
		["comment", draft.comment, draft.commentLine],
	];
	for (const [name, block, line] of blocks) {
		if (block !== null && !hasVisibleCharacter(joinParagraphLines(block))) {
			result.problems.push({
				code: "blank-text",
				message: `the ${name} of the annotation has no visible character`,
				line,
			});
		}
	}
}

/** The valid items with the last line of their regions. */
function regions(drafts: readonly Draft[], total: number): Annotation[] {
	const found: Annotation[] = [];
	for (const [index, draft] of drafts.entries()) {
		const parsed = draft.parsed;
		if (parsed === null) continue;
		const next = drafts[index + 1];
		const names = parsed.modifiers;
		found.push({
			line: draft.line,
			end: next === undefined ? total : next.line - 1,
			value: parsed.value,
			public: names.includes("public") || names.includes("example"),
			example: names.includes("example"),
			text: parsed.criterion,
			feedback:
				draft.feedback === null ? null : joinParagraphLines(draft.feedback),
			comment:
				draft.comment === null ? null : joinParagraphLines(draft.comment),
			annotationLines: draft.lines,
		});
	}
	return found;
}
