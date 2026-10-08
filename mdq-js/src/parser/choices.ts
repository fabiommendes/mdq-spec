/**
 * Bracket-list body parsing: choice markers, type inference, choice ids and
 * scores, for `multiple-choice`, `multiple-selection` and `true-false`.
 *
 * A port of the choice-list section of `mdq-py/mdq/_parser/_choices.py` --
 * `parse_marker`, `_split_list_items`, `RawChoice`/`collect_item`,
 * `_slugify_choice_text`, `_infer_choice_type`, `_score_from_value` and
 * `parse_choice_body`.
 */

import { ForeignChoiceMarkerError, ParseError } from "../errors.js";
import { repr, strip } from "./text.js";

// The grammar's `ws` is only spaces and tabs (docs/references/grammar.md):
// every `[ \t]` below is `ws`, and every `strip(..., " \t")` trims `ws`. Any
// other Unicode space is text.

/** A slug's body, shared by choice ids and the inline `[slug]` prefix. */
export const SLUG_BODY_RE = "[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*";

/**
 * A bracket followed by `(` or `[` opens a markdown link (`[text](url)`,
 * `[text][ref]`), so it is never a slug or a choice id (base.md, "Slug";
 * multiple-choice.md, "Body").
 */
const NOT_A_LINK = "(?![(\\[])";

/** `[slug]` at the very start of a line, e.g. the inline id/title prefix. */
export const SLUG_PREFIX_RE = new RegExp(
	`^\\[(?<slug>${SLUG_BODY_RE})\\]${NOT_A_LINK}[ \\t]*`,
	"u",
);

/** An explicit choice id written right after a choice's marker. */
export const CHOICE_ID_PREFIX_RE = new RegExp(
	`^\\[(?<id>${SLUG_BODY_RE})\\]${NOT_A_LINK}[ \\t]*`,
	"u",
);

/** A bullet item whose text starts with `[`, the shape a choice marker takes. */
export const BRACKET_ITEM_RE = /^[*+-][ \t]*\[/u;

/** A choice item's marker: `* [value] rest`. */
export const ITEM_MARKER_RE =
	/^[*+-][ \t]+\[(?<value>[^\]]*)\][ \t]?(?<rest>[^\n]*)$/u;

/** A partial-credit marker, e.g. `50%` or `-25%`. */
export const PERCENT_RE = /^[+-]?\d+(?:\.\d+)?%$/u;

/**
 * A list item with no `[value]` marker, e.g. a pattern line. A bare marker
 * (`*` alone on its line) is an item with no text, so an empty pattern line
 * is reported as such instead of being read as a continuation of the item
 * before it.
 */
export const PLAIN_ITEM_RE = /^[*+-](?:[ \t]+(?<rest>[^\n]*)|[ \t]*)$/u;

/** The first line of a list item: a marker followed by `ws` or the line end. */
export const LIST_ITEM_START_RE = /^[*+-](?:[ \t]|[ \t]*$)/u;

/**
 * True/false letters that mean false -- `docs/question-types/true-false.md`.
 * Every other non-empty single letter (`T`, `V`, provisional spellings, ...)
 * means true. CJK characters have no case, so they're listed once rather
 * than lowercased.
 */
const FALSE_LETTERS = new Set(["f", "错", "偽"]);

/** One choice item, before it is turned into its final schema shape. */
export interface RawChoice {
	readonly value: string;
	readonly explicitId: string | undefined;
	readonly text: string;
	readonly feedback: string | undefined;
	readonly comment: string | undefined;
}

/** A choice item's `(value, explicit id, remaining text)`, from its marker. */
export interface ParsedMarker {
	readonly value: string;
	readonly id: string | undefined;
	readonly rest: string;
}

/**
 * Extract a choice item's `(value, explicit id, remaining text)` from its
 * first raw line, e.g. `* [x] [my-id] Some text`.
 *
 * @throws {ParseError} If `line` does not start with a `* [value]` marker.
 */
export function parseMarker(line: string): ParsedMarker {
	const match = ITEM_MARKER_RE.exec(line);
	if (!match?.groups) {
		throw new ParseError(`malformed choice item: ${repr(line)}`);
	}
	if (!match.groups.value) {
		throw new ParseError(
			`empty choice marker \`[]\` (use \`[ ]\` for blank): ${repr(line)}`,
		);
	}

	const value = strip(match.groups.value, " \t");
	let rest = match.groups.rest ?? "";

	let id: string | undefined;
	const idMatch = CHOICE_ID_PREFIX_RE.exec(rest);
	if (idMatch?.groups?.id !== undefined) {
		id = idMatch.groups.id;
		rest = rest.slice(idMatch[0].length);
	}

	return { value, id, rest };
}

/**
 * Strip a plain (non-bracket) list item line's `*`/`+`/`-` marker, e.g. for
 * a short-answer body's `oneOf` list, whose items carry no `[value]`
 * marker. A port of `_strip_list_marker`.
 */
export function stripListMarker(line: string): string {
	const match = PLAIN_ITEM_RE.exec(line);
	return match?.groups?.rest !== undefined
		? strip(match.groups.rest, " \t")
		: strip(line, " \t");
}

/** Split a list's raw source lines into per-item line groups. */
export function splitListItems(lines: readonly string[]): string[][] {
	const items: string[][] = [];
	let current: string[] = [];
	for (const line of lines) {
		if (LIST_ITEM_START_RE.test(line)) {
			current = [line];
			items.push(current);
		} else {
			current.push(line);
		}
	}
	return items;
}

const INTERLEAVED =
	"a pattern item carries at most one feedback and one comment block, and " +
	"they must not interleave";

/**
 * Split an item's continuation lines into its text, `>` feedback and `!`
 * comment, and assemble the `RawChoice`.
 *
 * @throws {ParseError} `strictObservations` is set and the feedback and
 *   comment lines interleave.
 */
export function collectItem(
	itemLines: readonly string[],
	value: string,
	explicitId: string | undefined,
	rest: string,
	strictObservations = false,
): RawChoice {
	const textLines: string[] = strip(rest, " \t") ? [rest] : [];
	const feedbackLines: string[] = [];
	const commentLines: string[] = [];
	let mode: "text" | "feedback" | "comment" = "text";

	for (const line of itemLines.slice(1)) {
		const stripped = strip(line, " \t");
		if (stripped.startsWith(">")) {
			if (strictObservations && mode === "comment" && feedbackLines.length) {
				throw new ParseError(INTERLEAVED);
			}
			mode = "feedback";
			feedbackLines.push(strip(stripped.slice(1), " \t"));
		} else if (stripped.startsWith("!")) {
			if (strictObservations && mode === "feedback" && commentLines.length) {
				throw new ParseError(INTERLEAVED);
			}
			mode = "comment";
			commentLines.push(strip(stripped.slice(1), " \t"));
		} else if (mode === "text") {
			textLines.push(stripped);
		} else if (mode === "feedback") {
			feedbackLines.push(stripped);
		} else {
			commentLines.push(stripped);
		}
	}

	return {
		value,
		explicitId,
		text: textLines.filter((line) => line).join(" "),
		feedback: feedbackLines.some((line) => line)
			? feedbackLines.filter((line) => line).join(" ")
			: undefined,
		comment: commentLines.some((line) => line)
			? commentLines.filter((line) => line).join(" ")
			: undefined,
	};
}

/** Parse a bracket-marked list item, e.g. `* [x] Amazon rainforest`. */
export function parseItem(itemLines: readonly string[]): RawChoice {
	const first = itemLines[0];
	if (first === undefined) {
		throw new ParseError("empty list item");
	}
	const { value, id, rest } = parseMarker(first);
	return collectItem(itemLines, value, id, rest);
}

/**
 * Parse a list item carrying no `[value]` marker, e.g. a short-answer
 * pattern line.
 *
 * @throws {ParseError} If `itemLines` does not start with a list marker.
 */
export function parsePlainItem(itemLines: readonly string[]): RawChoice {
	const first = itemLines[0];
	const match = first === undefined ? null : PLAIN_ITEM_RE.exec(first);
	if (!match?.groups) {
		throw new ParseError(`malformed list item: ${repr(first ?? "")}`);
	}
	return collectItem(itemLines, "", undefined, match.groups.rest ?? "", true);
}

/** One accept/reject pattern entry: a bare string, or the `{pattern, feedback?, comment?}` object form. */
export type PatternEntry = string | Record<string, unknown>;

/**
 * Build one accept/reject entry from a parsed pattern item, bare when it
 * carries no feedback or comment. A port of `_pattern_entry`, shared by a
 * short-answer question's `[short-answer/accept|reject]` blocks and a
 * fill-in short-answer blank's.
 *
 * @throws {ParseError} If the item's pattern text is empty.
 */
export function patternEntry(item: RawChoice): PatternEntry {
	const pattern = strip(item.text, " \t");
	if (!pattern) {
		throw new ParseError("a short-answer pattern line cannot be empty");
	}
	if (!item.feedback && !item.comment) {
		return pattern;
	}
	const entry: Record<string, unknown> = { pattern };
	if (item.feedback) {
		entry.feedback = item.feedback;
	}
	if (item.comment) {
		entry.comment = item.comment;
	}
	return entry;
}

/**
 * Return each choice's id, exactly as the author wrote it -- `undefined` for
 * a choice with no explicit id.
 *
 * A choice without an id used to get one derived from its text here; that
 * derivation now lives in the model layer's `withIds` (F5), called by
 * whoever needs an addressable document (dev/specs/to-do/derived-ids.md).
 */
export function assignChoiceIds(
	choices: readonly RawChoice[],
): (string | undefined)[] {
	return choices.map((choice) => choice.explicitId);
}

/**
 * Infer `multiple-choice` / `multiple-selection` / `true-false` from the
 * bracket values used in a choice list, per `generic.md`'s rule that a
 * bracket-led list is always a choice body of one of these three kinds.
 *
 * A list whose markers are all blank is `multiple-selection`: nothing is
 * marked correct, which `multiple-selection` allows outright (zero correct
 * choices is a legal answer key) but `multiple-choice` does not.
 */
export function inferChoiceType(
	values: readonly string[],
): "multiple-choice" | "multiple-selection" | "true-false" {
	for (const value of values) {
		if (value === "*" || PERCENT_RE.test(value)) {
			return "multiple-choice";
		}
	}
	for (const value of values) {
		if (value.toLowerCase() === "x") {
			return "multiple-selection";
		}
	}
	for (const value of values) {
		if (
			value &&
			value.toLowerCase() !== "x" &&
			value.length === 1 &&
			/^\p{L}$/u.test(value)
		) {
			return "true-false";
		}
	}
	return "multiple-selection";
}

/**
 * The index of the first value that is not in the `value` rule of
 * `questionType` (base.md, "Type inference"), or `undefined` when every
 * value belongs to it. `values` are the bracket values stripped of spaces
 * and tabs, as `RawChoice.value` holds them: multiple-choice takes `""`, `*`
 * or a percentage; multiple-selection `""`, `x` or `X`; true-false one
 * letter (`\p{L}`) other than `x`/`X`.
 */
export function foreignChoiceIndex(
	questionType: string,
	values: readonly string[],
): number | undefined {
	for (const [index, value] of values.entries()) {
		let ok: boolean;
		if (questionType === "multiple-choice") {
			ok = value === "" || value === "*" || PERCENT_RE.test(value);
		} else if (questionType === "multiple-selection") {
			ok = value === "" || value === "x" || value === "X";
		} else if (questionType === "true-false") {
			ok = /^\p{L}$/u.test(value) && value.toLowerCase() !== "x";
		} else {
			continue;
		}
		if (!ok) return index;
	}
	return undefined;
}

/**
 * The `score` of a choice `value` (multiple-choice.md, "Choices"): `*` is
 * 1, a percentage is its fraction, and a blank omits the score -- the
 * grading strategy decides what it is worth. Any other value is read as a
 * blank too.
 */
export function scoreFromValue(value: string): number | undefined {
	if (value === "*") {
		return 1;
	}
	if (PERCENT_RE.test(value)) {
		return Number.parseFloat(value.slice(0, -1)) / 100;
	}
	return undefined;
}

/**
 * Build the final `choices` entries for a bracket-list body, per
 * `docs/question-types/{multiple-choice,multiple-selection,true-false}.md`.
 * A port of `parse_choice_body`. `pathPrefix` locates the list for a
 * `ForeignChoiceMarkerError`: `["choices"]` for a question, `["blanks", b,
 * "choices"]` for a fill-in choice blank.
 *
 * @throws {ForeignChoiceMarkerError} A value is not in the `value` rule of
 *   `questionType`.
 */
export function buildChoices(
	questionType: string,
	rawChoices: readonly RawChoice[],
	pathPrefix: readonly (string | number)[] = ["choices"],
): Record<string, unknown>[] {
	const foreign = foreignChoiceIndex(
		questionType,
		rawChoices.map((choice) => choice.value),
	);
	if (foreign !== undefined) {
		throw new ForeignChoiceMarkerError(
			rawChoices[foreign]?.value ?? "",
			questionType,
			[...pathPrefix, foreign],
		);
	}
	const ids = assignChoiceIds(rawChoices);
	return rawChoices.map((choice, index) => {
		const entry: Record<string, unknown> = { text: choice.text };
		const id = ids[index];
		if (id !== undefined) {
			entry.id = id;
		}

		if (questionType === "multiple-choice") {
			// `[ ]` omits the score; `[0%]` is an explicit zero
			// (multiple-choice.md, "Choices").
			const score = scoreFromValue(choice.value);
			if (score !== undefined) entry.score = score;
		} else if (questionType === "multiple-selection") {
			// `correct` is required: a blank `[ ]` is an explicit false.
			entry.correct = choice.value.toLowerCase() === "x";
		} else if (questionType === "true-false") {
			const letter = choice.value;
			entry.correct = !FALSE_LETTERS.has(letter.toLowerCase());
			if (letter) {
				entry.marker = letter;
			}
		}

		if (choice.feedback) {
			entry.feedback = choice.feedback;
		}
		if (choice.comment) {
			entry.comment = choice.comment;
		}
		return entry;
	});
}
