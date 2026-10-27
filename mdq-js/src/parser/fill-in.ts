/**
 * The body of a fill-in question: the `[^id]:` blank definitions, and the
 * frontmatter maps that go onto the blanks they key.
 *
 * A port of `mdq-py/mdq/_parser/_fill_in.py`.
 */

import { ParseError, UndefinedBlankError } from "../errors.js";
import { startsAfter } from "../markdown.js";
import { type BlockCursor, parseItemList } from "./blocks.js";
import { buildChoices } from "./choices.js";
import { numericFields, parseNumericExpression } from "./numeric.js";
import { parseAnswerBlock } from "./short-answer.js";
import {
	BLANK_RE,
	type BlankTag,
	checkNoTagInContent,
	readBlankTag,
} from "./tags.js";
import { repr } from "./text.js";
import type { Node } from "./tree.js";

/** One blank of a fill-in question, with the schema's own field names. */
type Blank = Record<string, unknown> & { id: string; type: string };

type Front = Readonly<Record<string, unknown>>;
type NumericMaps = Record<"domain" | "decimalPlaces", Record<string, unknown>>;

const NUMERIC_MAP_KEYS = ["domain", "decimalPlaces"] as const;

/** Whether `value` is a YAML mapping. */
function isMapping(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the fill-in fields from a run of `[^id...]:` definitions.
 *
 * A slug may be defined more than once -- a short answer blank spreads its
 * accept block and its reject block over separate definitions -- so
 * definitions accumulate into one blank per slug, keyed by the order the slug
 * is first seen.
 *
 * @throws {ParseError} An unrecognized or misplaced tag suffix, a slug whose
 *   definitions disagree about the blank's kind, a repeated definition of the
 *   same form.
 */
export function parseFillInBody(
	cursor: BlockCursor,
	front: Front,
	firstTag: BlankTag,
	firstNode: Node,
): Record<string, unknown> {
	const doc: Record<string, unknown> = {};
	if (Object.hasOwn(front, "shuffle")) doc.shuffle = front.shuffle;
	for (const key of ["diacritics", "unmatched"]) {
		if (Object.hasOwn(front, key)) doc[key] = front[key];
	}

	const numericMaps = numericBlankMaps(front);
	const blanks = new Map<string, Blank>();
	/** The `blank id/role` short-answer definitions seen. */
	const defined = new Set<string>();
	let tag = firstTag;
	let tagNode = firstNode;
	for (;;) {
		switch (tag.kind) {
			case "unrecognized-blank":
				throw new ParseError(
					`unrecognized blank definition: ${repr(tag.text)}`,
				);
			case "choice-blank": {
				const { id, rest } = tag;
				const next = cursor.peek();
				if (!rest && next !== null && next.type === "bullet_list") {
					if (!startsAfter(tagNode, next)) {
						throw new ParseError(
							`the choice list of [^${id}] must start on the line right ` +
								"after its tag, with no blank line in between",
						);
					}
					cursor.read();
					cursor.checkNoAdjacentList(next);
					const rawChoices = parseItemList(cursor.reader, next);
					// The choices of a multiple-choice blank are scored choices.
					const choices = buildChoices("multiple-choice", rawChoices, [
						"blanks",
						blankIndex(blanks, id),
					]);
					addBlank(blanks, { id, type: "multiple-choice", choices });
				} else if (!rest) {
					throw new ParseError(
						`the choice blank [^${id}]: has no choice list: the list ` +
							"starts on the line right after the tag",
					);
				} else {
					throw new ParseError(
						`the tag line of the choice blank [^${id}] must be empty and ` +
							"the choice list must follow it; text after the colon is not " +
							`a choice. For a text answer, write [^${id}/short-answer]: ${rest}`,
					);
				}
				break;
			}
			case "numeric-blank": {
				const { id, unit, rest } = tag;
				checkNoTagInContent(cursor.reader.rawLines(tagNode).slice(1));
				const parsed = parseNumericExpression(rest);
				// A numeric blank is graded exactly like a numeric question
				// (fill-in.md), so the domain is inferred from the written
				// representation there too.
				const blank: Blank = { id, type: "numeric", answer: parsed.answer };
				if (unit) blank.unit = unit;
				// fill-in.md, "Frontmatter": the `domain` and `decimalPlaces` maps
				// win over the inferred values, as they do in a numeric question
				// (numeric.md, "Number type/domain").
				const declared: Record<string, unknown> = {};
				for (const key of NUMERIC_MAP_KEYS) {
					const map = numericMaps[key];
					if (map[id] !== undefined && map[id] !== null)
						declared[key] = map[id];
				}
				Object.assign(blank, numericFields(parsed, declared));
				if (parsed.tolerance !== undefined) blank.tolerance = parsed.tolerance;
				addBlank(blanks, blank);
				break;
			}
			case "short-answer-blank": {
				const { id, role, rest } = tag;
				const key = JSON.stringify([id, role]);
				if (defined.has(key)) {
					throw new ParseError(
						`repeated [^${id}/short-answer] ${role} definition`,
					);
				}
				defined.add(key);
				const patterns = parseAnswerBlock(cursor, tagNode, rest, {
					reject: role === "reject",
					tag: `^${id}/short-answer`,
					path: ["blanks", blankIndex(blanks, id), role],
				});
				const blank: Blank = { id, type: "short-answer" };
				if (patterns.length > 0) blank[role] = patterns;
				addBlank(blanks, blank);
				break;
			}
		}

		const node = cursor.peek();
		cursor.reader.checkNoSetextTag(node, BLANK_RE);
		if (node === null || node.type !== "paragraph") break;
		const nextTag = readBlankTag(cursor.reader.rawText(node));
		if (nextTag === null) break;
		tag = nextTag;
		tagNode = cursor.read();
	}

	distributeBlankPatternLists(front, blanks);
	distributeNumericBlankMaps(numericMaps, blanks);
	doc.blanks = [...blanks.values()];
	return doc;
}

/**
 * The frontmatter `domain` and `decimalPlaces` maps of a fill-in question
 * (fill-in.md, "Frontmatter"), each from a blank id to the value of the field
 * of the same name. A missing map is empty. The values are not checked here:
 * the schema checks them on the blank.
 *
 * @throws {ParseError} A map is not a mapping.
 */
export function numericBlankMaps(front: Front): NumericMaps {
	const maps: NumericMaps = { domain: {}, decimalPlaces: {} };
	for (const key of NUMERIC_MAP_KEYS) {
		const mapping = Object.hasOwn(front, key) ? front[key] : {};
		if (!isMapping(mapping)) {
			throw new ParseError(
				`frontmatter ${repr(key)} of a fill-in question must map blank ids to values`,
				[key],
			);
		}
		maps[key] = mapping;
	}
	return maps;
}

/**
 * Check the keys of the `domain` and `decimalPlaces` maps against the blanks.
 * A numeric blank took its values when it was built; a key that is the id of
 * another kind of blank puts the value on that blank, where the schema
 * rejects it. A `null` entry means the field is absent for that blank.
 *
 * @throws {UndefinedBlankError} A key is not the id of a blank in `blanks`.
 */
export function distributeNumericBlankMaps(
	maps: NumericMaps,
	blanks: ReadonlyMap<string, Blank>,
): void {
	for (const key of NUMERIC_MAP_KEYS) {
		for (const [blankId, value] of Object.entries(maps[key])) {
			const blank = blanks.get(blankId);
			if (blank === undefined) throw new UndefinedBlankError(blankId, key);
			if (value !== null && blank.type !== "numeric") blank[key] = value;
		}
	}
}

/**
 * Move the frontmatter `preAccept`/`preReject`/`incorrectFeedback` maps onto
 * the blanks they key (fill-in.md, "Frontmatter"). Each map goes from a blank
 * id to a pattern list (a string for `incorrectFeedback`); the value becomes
 * the field of the same name of that blank, whatever its kind (a `null` entry
 * means the field is absent for that blank) -- the schema
 * rejects `preAccept` and `preReject` on a choice or numeric blank, and
 * `incorrectFeedback` on a choice blank.
 *
 * @throws {UndefinedBlankError} A key is not the id of a blank in `blanks`.
 * @throws {ParseError} A map is not a mapping of lists (of strings for
 *   `incorrectFeedback`).
 */
export function distributeBlankPatternLists(
	front: Front,
	blanks: ReadonlyMap<string, Blank>,
): void {
	for (const key of ["preAccept", "preReject", "incorrectFeedback"]) {
		if (!Object.hasOwn(front, key)) continue;
		const mapping = front[key];
		const isText = key === "incorrectFeedback";
		if (!isMapping(mapping)) {
			throw new ParseError(
				`frontmatter ${repr(key)} of a fill-in question must map blank ids to ${isText ? "strings" : "pattern lists"}`,
				[key],
			);
		}
		for (const [blankId, value] of Object.entries(mapping)) {
			if (value === null) {
				// A `null` entry means the field is absent for the blank.
				if (!blanks.has(blankId)) throw new UndefinedBlankError(blankId, key);
				continue;
			}
			if (isText && typeof value !== "string") {
				throw new ParseError(
					`frontmatter ${repr(key)} entry ${repr(blankId)} must be a string`,
					[key, blankId],
				);
			}
			if (!isText && !Array.isArray(value)) {
				throw new ParseError(
					`frontmatter ${repr(key)} entry ${repr(blankId)} must be a list of patterns`,
					[key, blankId],
				);
			}
			const blank = blanks.get(blankId);
			if (blank === undefined) throw new UndefinedBlankError(blankId, key);
			blank[key] = value;
		}
	}
}

/**
 * Merge one definition into the blank its slug names.
 *
 * @throws {ParseError} The slug is already defined with a different kind, or
 *   it is a repeated choice or numeric definition.
 */
function addBlank(blanks: Map<string, Blank>, added: Blank): void {
	const existing = blanks.get(added.id);
	if (existing === undefined) {
		blanks.set(added.id, added);
		return;
	}
	if (existing.type !== added.type) {
		throw new ParseError(
			`blank ${repr(added.id)} is defined both as ${existing.type} and as ${added.type}`,
		);
	}
	if (existing.type !== "short-answer") {
		throw new ParseError(`repeated definition of blank ${repr(added.id)}`);
	}
	for (const [key, value] of Object.entries(added)) {
		// The caller rejects a repeated `accept` or `reject` definition of a
		// short-answer blank before it gets here.
		if (key !== "id" && key !== "type") existing[key] = value;
	}
}

/** The index `blankId` has, or will have, in the `blanks` list. */
function blankIndex(
	blanks: ReadonlyMap<string, Blank>,
	blankId: string,
): number {
	const index = [...blanks.keys()].indexOf(blankId);
	return index >= 0 ? index : blanks.size;
}
