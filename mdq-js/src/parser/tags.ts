/**
 * The tags of a question body: the regexes that read them, the typed values
 * `readBodyTag` returns, and the checks of the reserved tag labels
 * (question-base.md, "Body tags").
 *
 * A port of `mdq-py/mdq/_parser/_tags.py`.
 */

import { ParseError } from "../errors.js";
import { SLUG_BODY_RE, UNICODE_SPACE } from "../markdown.js";
import { repr, strip } from "./text.js";

//
// Constants
//
// Body-start detection.
const ESSAY_TAG_RE = /^\[essay\]$/u;
export const SHORT_ANSWER_RE =
	/^\[short-answer(?:\/(?<variant>accept|reject))?\][ \t]*:[ \t]*(?<rest>[^\n]*)$/u;
/**
 * The start of a line that opens with the bare tag of a short answer and goes
 * on with something that is not a colon, a link or a reference.
 */
const SHORT_ANSWER_TAG_START_RE =
	/^(?<tag>\[short-answer(?:\/(?:accept|reject))?\])(?![ \t]*:)(?![([])(?<after>[^\n]*)$/u;
/**
 * The tag of a short answer with no pattern, written without a colon
 * (question-base.md, "Body tags").
 */
const SHORT_ANSWER_BARE_RE =
	/^\[short-answer(?:\/(?<variant>accept|reject))?\]$/u;
/**
 * The `UNIT` terminal of docs/references/grammar.md: any character except a
 * `UNICODE_SPACE` and the brackets `(`, `)`, `[`, `]`. It admits `µm`, `°C`,
 * `km/h`, `Ω`.
 */
const UNIT_RE = `[^()\\[\\]${UNICODE_SPACE}]+`;
const NUMERIC_TAG_RE = new RegExp(
	`^\\[numeric(?:\\((?<unit>${UNIT_RE})\\))?\\][ \\t]*:[ \\t]*(?<rest>[^\\n]*)$`,
	"u",
);
// A blank definition tag. Deliberately permissive in `kind`: an unrecognized
// suffix must reach BLANK_KIND_RE and raise a real error, not fail to match
// and get swallowed by the epilogue.
export const BLANK_RE = new RegExp(
	`^\\[\\^(?<id>${SLUG_BODY_RE})(?:\\/(?<kind>[^\\]]+))?\\][ \\t]*:[ \\t]*(?<rest>[^\\n]*)$`,
	"u",
);
/** The text after the colon of a short-answer tag line. */
export const TAG_REST_RE = /^[ \t]*\[[^\n]*?\][ \t]*:[ \t]*(?<rest>[^\n]*)$/u;
/** The tag of a short answer blank with no pattern, written without a colon. */
const BLANK_BARE_RE = new RegExp(
	`^\\[\\^(?<id>${SLUG_BODY_RE})\\/short-answer(?:\\/(?<variant>accept|reject))?\\]$`,
	"u",
);
// Validates that suffix. Units attach to `numeric` and to nothing else, and
// the accept/reject sublists to `short-answer` and nothing else -- both
// restrictions are enforced by this alternation's shape rather than by a
// follow-up check (fill-in.md#blank-definitions).
const BLANK_KIND_RE = new RegExp(
	`^(?:(?<numeric>numeric)(?:\\((?<unit>${UNIT_RE})\\))?|(?<short>short-answer)(?:\\/(?<variant>accept|reject))?)$`,
	"u",
);
const ORDERING_TAG_RE = /^\[ordering\](?:[ \t]*:[ \t]*(?<rest>[^\n]*))?$/u;
/**
 * The names of the question types. A tag label that starts with one of them,
 * or that is a fill-in label `^id/...`, is reserved (question-base.md, "Body
 * tags").
 */
const TYPE_NAMES = [
	"essay",
	"numeric",
	"short-answer",
	"ordering",
	"true-false",
	"multiple-choice",
	"multiple-selection",
	"fill-in",
];
/**
 * `name` with each `i` as `[iİı]`. Python's `re.IGNORECASE` matches U+0130 and
 * U+0131 with `i`; the `iu` flag of JavaScript does not, since neither has a
 * simple case folding.
 */
function dotlessI(name: string): string {
	return name.replaceAll("i", "[iİı]");
}
/**
 * A reserved tag label: a type name followed by the end of the label, `/` or
 * `(`, or a fill-in label `^id/kind`. Case does not matter here, so that a
 * tag in the wrong case is found.
 */
const RESERVED_LABEL_RE = new RegExp(
	`^(?:\\^(?<id>[^/]*)\\/(?<kind>[^\\n]*)|(?:${TYPE_NAMES.map(dotlessI).join("|")})(?:[/(][^\\n]*)?)$`,
	"iu",
);
/** A line in link reference definition form: a bracketed label and a colon. */
const TAG_COLON_LINE_RE = /^[ \t]*\[(?<label>[^[\]\r\n]+)\][ \t]*:/u;
/** A paragraph that holds only a bracketed label: a tag without a colon. */
const TAG_BARE_RE = /^[ \t]*\[(?<label>[^[\]\r\n]+)\][ \t]*$/u;
/**
 * The label of a tag in lower case, with its form. Both forms are valid for a
 * short answer tag; the others have one form.
 */
const KNOWN_LABEL_RE = new RegExp(
	`^(?:(?<essay>essay)|(?<ordering>ordering)|(?<numeric>numeric(?:\\(${UNIT_RE}\\))?)|(?<short>short-answer(?:\\/(?:accept|reject))?))$`,
	"u",
);
const KNOWN_BLANK_KIND_RE = new RegExp(
	`^(?:(?<numeric>numeric(?:\\(${UNIT_RE}\\))?)|(?<short>short-answer(?:\\/(?:accept|reject))?))$`,
	"u",
);
/** The frontmatter fields that look like a tag suffix. */
const FRONTMATTER_ONLY_SUFFIXES: Readonly<Record<string, string>> = {
	preaccept: "preAccept",
	prereject: "preReject",
};

/** Whether a short-answer tag is `accept` (the default) or `reject`. */
export type Role = "accept" | "reject";

/** `[essay]`. */
export interface EssayTag {
	readonly kind: "essay";
}

/** `[ordering]`; `rest` is the text after the colon, `null` with no colon. */
export interface OrderingTag {
	readonly kind: "ordering";
	readonly rest: string | null;
}

/** `[short-answer]`, `[short-answer/accept]` or `[short-answer/reject]`. */
export interface ShortAnswerTag {
	readonly kind: "short-answer";
	readonly role: Role;
	/** The text after the colon, or `null` for a tag without a colon. */
	readonly rest: string | null;
}

/** `[numeric]:` or `[numeric(unit)]:`. */
export interface NumericTag {
	readonly kind: "numeric";
	readonly unit: string | null;
	readonly rest: string;
}

/** `[^id]:`, the tag of a choice blank. */
export interface ChoiceBlankTag {
	readonly kind: "choice-blank";
	readonly id: string;
	readonly rest: string;
}

/** `[^id/numeric]:` or `[^id/numeric(unit)]:`. */
export interface NumericBlankTag {
	readonly kind: "numeric-blank";
	readonly id: string;
	readonly unit: string | null;
	readonly rest: string;
}

/** `[^id/short-answer]` with an optional `/accept` or `/reject`. */
export interface ShortAnswerBlankTag {
	readonly kind: "short-answer-blank";
	readonly id: string;
	readonly role: Role;
	readonly rest: string | null;
}

/** A blank tag with a kind that no blank has; `text` is the tag line. */
export interface UnrecognizedBlankTag {
	readonly kind: "unrecognized-blank";
	readonly text: string;
}

export type BlankTag =
	| ChoiceBlankTag
	| NumericBlankTag
	| ShortAnswerBlankTag
	| UnrecognizedBlankTag;
export type BodyTag =
	| EssayTag
	| OrderingTag
	| ShortAnswerTag
	| NumericTag
	| BlankTag;

function role(variant: string | undefined): Role {
	return variant === "reject" ? "reject" : "accept";
}

/** Read a short-answer tag line. `null` if `text` is no such tag. */
export function readShortAnswerTag(text: string): ShortAnswerTag | null {
	const m = SHORT_ANSWER_RE.exec(text);
	if (m?.groups) {
		return {
			kind: "short-answer",
			role: role(m.groups.variant),
			rest: m.groups.rest ?? "",
		};
	}
	const bare = SHORT_ANSWER_BARE_RE.exec(text);
	if (bare?.groups) {
		return {
			kind: "short-answer",
			role: role(bare.groups.variant),
			rest: null,
		};
	}
	return null;
}

/** Read a blank definition tag line. `null` if `text` is no such tag. */
export function readBlankTag(text: string): BlankTag | null {
	const m = BLANK_RE.exec(text);
	if (!m?.groups) {
		// An open short answer blank, written without a colon.
		const bare = BLANK_BARE_RE.exec(text);
		if (!bare?.groups) return null;
		return {
			kind: "short-answer-blank",
			id: bare.groups.id ?? "",
			role: role(bare.groups.variant),
			rest: null,
		};
	}
	const id = m.groups.id ?? "";
	const rest = (m.groups.rest ?? "").replace(/^[ \t]+|[ \t]+$/gu, "");
	const kind = m.groups.kind;
	if (kind === undefined) return { kind: "choice-blank", id, rest };
	const km = BLANK_KIND_RE.exec(kind);
	if (!km?.groups) return { kind: "unrecognized-blank", text };
	if (km.groups.numeric) {
		return {
			kind: "numeric-blank",
			id,
			unit: km.groups.unit ?? null,
			rest,
		};
	}
	return {
		kind: "short-answer-blank",
		id,
		role: role(km.groups.variant),
		rest,
	};
}

/** Read the body or blank tag `text` is, or `null` if it is no tag. */
export function readBodyTag(text: string): BodyTag | null {
	if (ESSAY_TAG_RE.test(text)) return { kind: "essay" };
	const ordering = ORDERING_TAG_RE.exec(text);
	if (ordering?.groups) {
		return { kind: "ordering", rest: ordering.groups.rest ?? null };
	}
	const shortAnswer = readShortAnswerTag(text);
	if (shortAnswer !== null) return shortAnswer;
	const numeric = NUMERIC_TAG_RE.exec(text);
	if (numeric?.groups) {
		return {
			kind: "numeric",
			unit: numeric.groups.unit ?? null,
			rest: numeric.groups.rest ?? "",
		};
	}
	return readBlankTag(text);
}

/**
 * The label in lower case. The unit of `numeric(unit)` keeps its case: `Pa`
 * and `pa` are different units.
 */
function lowerLabel(label: string): string {
	if (label.toLowerCase().startsWith("numeric(")) {
		return `numeric${label.slice("numeric".length)}`;
	}
	return label.toLowerCase();
}

/**
 * The `[label, hasColon]` pairs of the tag-like lines of a paragraph: each
 * line in link reference definition form, and the whole paragraph when it
 * holds only a bracketed label.
 *
 * @param text The text of the paragraph, as `BlockReader.rawText` gives it.
 * @param lines The raw source lines of the paragraph.
 */
export function tagLines(
	text: string,
	lines: readonly string[],
): [string, boolean][] {
	const found: [string, boolean][] = [];
	const bare = TAG_BARE_RE.exec(text);
	if (bare?.groups) found.push([bare.groups.label ?? "", false]);
	for (const line of lines) {
		const colon = TAG_COLON_LINE_RE.exec(line);
		if (colon?.groups) found.push([colon.groups.label ?? "", true]);
	}
	return found;
}

/**
 * Throw a `ParseError` if a paragraph starts with the bare tag
 * `[short-answer]` (or its `/accept` or `/reject` form) and holds more text,
 * on the same line or on a lazy line: the bare tag is a paragraph of its own
 * (short-answer.md, "Block with no pattern").
 *
 * @param lines The raw source lines of the paragraph.
 */
export function checkBareTagAlone(lines: readonly string[]): void {
	const m =
		lines.length > 0 ? SHORT_ANSWER_TAG_START_RE.exec(lines[0] ?? "") : null;
	if (!m?.groups) return;
	const after = (m.groups.after ?? "").replace(/^[ \t]+|[ \t]+$/gu, "");
	if (after || lines.length > 1) {
		const tag = m.groups.tag;
		throw new ParseError(
			`text follows the tag ${tag} in its paragraph: write \`${tag}:\` ` +
				"before a pattern, or leave the tag alone in its paragraph",
		);
	}
}

/** Whether `label` is reserved: it starts with a type name or is `^id/...`. */
export function isReservedLabel(label: string): boolean {
	return RESERVED_LABEL_RE.test(label);
}

/**
 * Whether `line` starts with a tag that `LAZY_START` excludes (grammar.md,
 * "Feedback and comment lines"): a reserved label or a blank label `^id`,
 * between brackets, and a colon. A line with four or more columns of
 * indentation is continuation text, so it is no tag line.
 */
export function isTagLine(line: string): boolean {
	const spaces = line.length - line.replace(/^ +/u, "").length;
	if (spaces >= 4 || line.startsWith("\t")) return false;
	const m = TAG_COLON_LINE_RE.exec(line);
	if (m?.groups === undefined) return false;
	const label = m.groups.label ?? "";
	return label.startsWith("^") || isReservedLabel(label);
}

/** The `ParseError` message for a tag `line` right after the content. */
export function tagAfterContentMessage(line: string): string {
	return `the line ${repr(strip(line, " \t"))} is a tag, so it cannot continue the content before it; add a blank line before the tag`;
}

/**
 * Throw a `ParseError` if one of the content lines that follow the tag line
 * is a tag line itself (grammar.md, "Feedback and comment lines").
 *
 * @param lines The lines of the tag paragraph after its first line.
 */
export function checkNoTagInContent(lines: readonly string[]): void {
	for (const line of lines) {
		if (isTagLine(line)) throw new ParseError(tagAfterContentMessage(line));
	}
}

/**
 * Throw a `ParseError` if `label`, the text between the brackets of a
 * tag-like line, is reserved but is not a valid tag (question-base.md, "Body
 * tags"). Do nothing for a label that is not reserved, such as the label of
 * an ordinary link reference definition.
 *
 * @param label The text between the brackets.
 * @param colon Whether a colon follows the closing bracket.
 * @throws {ParseError} The label has the wrong case, has an unknown suffix,
 *   is a frontmatter field, or has the wrong form for its tag.
 */
export function checkTagLabel(label: string, colon: boolean): void {
	const reserved = RESERVED_LABEL_RE.exec(label);
	if (reserved === null) return;
	const written = `\`[${label}]${colon ? ":" : ""}\``;
	const blankId = reserved.groups?.id;
	let fixed: string;
	let known: RegExpExecArray | null;
	if (blankId !== undefined) {
		if (!new RegExp(`^${SLUG_BODY_RE}$`, "u").test(blankId)) {
			throw new ParseError(
				`${written} has an invalid blank id: it is a lower case slug, as in \`[^capital/short-answer]:\``,
			);
		}
		const kind = lowerLabel(reserved.groups?.kind ?? "");
		known = KNOWN_BLANK_KIND_RE.exec(kind);
		fixed = `^${blankId}/${kind}`;
	} else {
		fixed = lowerLabel(label);
		known = KNOWN_LABEL_RE.exec(fixed);
	}
	const needsColon = Boolean(known?.groups?.numeric);
	if (known === null) {
		const suffix = (label.split("/").pop() ?? "").toLowerCase();
		const field = FRONTMATTER_ONLY_SUFFIXES[suffix];
		if (field !== undefined) {
			throw new ParseError(
				`unknown tag ${written}: \`${field}\` is a field of the frontmatter only, not a tag`,
			);
		}
		throw new ParseError(
			`unknown tag ${written}: a tag name that starts with a type name is reserved, see the tags of the question types`,
		);
	}
	const shown = `[${fixed}]${colon ? ":" : ""}`;
	if (fixed !== label) {
		throw new ParseError(`tags are lower case: write \`${shown}\``);
	}
	if (blankId === undefined && known.groups?.essay && colon) {
		throw new ParseError(
			"the tag of an essay has no content: write `[essay]` without a colon",
		);
	}
	if (needsColon && !colon) {
		throw new ParseError(
			`the tag \`${shown}\` needs a colon and its content: \`${shown}:\``,
		);
	}
}
