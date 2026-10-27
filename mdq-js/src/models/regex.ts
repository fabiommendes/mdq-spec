/**
 * Regexes in MDQ documents use a closed subset of JavaScript regex syntax,
 * with some differences in the flags. They run in code point mode (the `u`
 * flag), and `.` and the shorthand classes are fixed explicit classes, see
 * `docs/references/patterns.md`.
 *
 * This module checks a body against the allow-list of that document,
 * translates it to the source of a JavaScript `RegExp`, and provides
 * `RegexPattern` to match the responses. A port of
 * `mdq-py/mdq/models/_regex.py`.
 */

import tables from "../inexact-tables.json";
import { repr, UNICODE_SPACE } from "../parser/text.js";

/** An MDQ regex pattern is malformed or uses unsupported syntax. */
export class InvalidRegexError extends Error {
	override name = "InvalidRegexError";
}

//
// Flags
//
export const MEANINGFUL_FLAGS: ReadonlySet<string> = new Set([
	"i",
	"n",
	"f",
	"b",
]);
export const IGNORED_FLAGS: ReadonlySet<string> = new Set([
	"m",
	"g",
	"s",
	"u",
	"v",
	"y",
	"d",
]);
export const VALID_FLAGS: ReadonlySet<string> = new Set([
	...MEANINGFUL_FLAGS,
	...IGNORED_FLAGS,
]);
export const FLAG_ORDER = "bfin";

/** Reject unknown or repeated flag characters. */
export function validateFlagChars(flags: string): void {
	const seen = new Set<string>();
	for (const ch of flags) {
		if (!VALID_FLAGS.has(ch)) {
			throw new InvalidRegexError(`unknown regex flag: ${repr(ch)}`);
		}
		if (seen.has(ch)) {
			throw new InvalidRegexError(`repeated regex flag: ${repr(ch)}`);
		}
		seen.add(ch);
	}
}

/** Reduce a flag string to its meaningful (non-ignored) characters. */
export function effectiveFlags(flags: string): ReadonlySet<string> {
	return new Set([...flags].filter((ch) => MEANINGFUL_FLAGS.has(ch)));
}

/** The flags in their canonical order, as a string. */
function flagString(flags: ReadonlySet<string>): string {
	return [...FLAG_ORDER].filter((flag) => flags.has(flag)).join("");
}

//
// Splitting and normalization
//
const SPACE_ENDS_RE = new RegExp(
	`^[${UNICODE_SPACE}]+|[${UNICODE_SPACE}]+$`,
	"gu",
);

/** Remove the spaces and tabs from both ends of `text`. */
function stripBlanks(text: string): string {
	return text.replace(/^[ \t]+|[ \t]+$/gu, "");
}

/**
 * Split a pattern into its regex body and raw flag string.
 *
 * Spaces and tabs are removed from both ends first. The last `/` closes the
 * regex, so an unescaped `/` in the body is valid.
 *
 * @throws {InvalidRegexError} If the delimiters or flag characters are
 * malformed.
 */
export function parseRegex(pattern: string): [body: string, flags: string] {
	const text = stripBlanks(pattern);
	let body = text;
	let rawFlags = "";
	if (text.startsWith("/")) {
		const closing = text.lastIndexOf("/");
		if (closing === 0) {
			throw new InvalidRegexError(
				`unterminated regex literal: ${repr(pattern)}`,
			);
		}
		body = text.slice(1, closing);
		rawFlags = text.slice(closing + 1);
	}
	validateFlagChars(rawFlags);
	return [body, rawFlags];
}

/** The code points of the general category `Mn`, from the pinned table. */
const NONSPACING: ReadonlySet<number> = new Set(
	(tables.nonspacing as [number, number][]).flatMap(([first, last]) =>
		Array.from({ length: last - first + 1 }, (_, i) => first + i),
	),
);

/**
 * NFD-decompose `text`, remove the code points of the `nonspacing` table
 * (the marks of the general category `Mn`), and recompose with NFC.
 */
export function normalizeText(text: string): string {
	let kept = "";
	for (const char of text.normalize("NFD")) {
		if (!NONSPACING.has(char.codePointAt(0) ?? 0)) kept += char;
	}
	return kept.normalize("NFC");
}

const CODE_POINT_ESCAPE_RE =
	/^\\(?:u([0-9A-Fa-f]{4})|x([0-9A-Fa-f]{2})|u\{([0-9A-Fa-f]{1,6})\})/u;

/**
 * The code points denoted by the `\uXXXX`, `\xXX` and `\u{...}` escapes of
 * `body`, in order. A backslash escaped by another one is not an escape.
 */
export function escapedCodePoints(body: string): number[] {
	const found: number[] = [];
	let index = 0;
	while (index < body.length) {
		if (body[index] !== "\\") {
			index += 1;
			continue;
		}
		const match = CODE_POINT_ESCAPE_RE.exec(body.slice(index));
		if (match === null) {
			index += 2;
			continue;
		}
		const digits = match[1] ?? match[2] ?? match[3] ?? "";
		found.push(Number.parseInt(digits, 16));
		index += match[0].length;
	}
	return found;
}

//
// Body syntax: an allow-list
//
// `Translator` reads the body with the grammar of the table in
// docs/references/patterns.md ("Regex") and writes the source of the
// equivalent `RegExp` (flag `u`) in the same pass. Whatever the table does
// not list raises `InvalidRegexError`, so JavaScript-only syntax never
// reaches `RegExp`.
//
// Python and JavaScript disagree on `.`, `\d`, `\w`, `\s` and `\b`, so those
// are written as explicit classes. Under `i` a shorthand class folds like any
// other class (`ui`), so `\w` matches U+017F and U+212A.
//
const WORD = "A-Za-z0-9_";
const SHORTHAND: Readonly<Record<string, string>> = {
	d: "[0-9]",
	D: "[^0-9]",
	w: `[${WORD}]`,
	W: `[^${WORD}]`,
	s: `[${UNICODE_SPACE}]`,
	S: `[^${UNICODE_SPACE}]`,
};
const BOUNDARY: Readonly<Record<string, string>> = {
	b: `(?:(?<![${WORD}])(?=[${WORD}])|(?<=[${WORD}])(?![${WORD}]))`,
	B: `(?:(?<![${WORD}])(?![${WORD}])|(?<=[${WORD}])(?=[${WORD}]))`,
};
/** `.` is any code point except the four line terminators of JavaScript. */
const DOT = "[^\\n\\r\\u2028\\u2029]";
const SYNTAX_CHARACTERS: ReadonlySet<string> = new Set("^$\\.*+?()[]{}|");
/** The escapes of a character that is not a syntax character. */
const CONTROL_ESCAPES: Readonly<Record<string, number>> = {
	t: 0x09,
	n: 0x0a,
	v: 0x0b,
	f: 0x0c,
	r: 0x0d,
};
const QUANTIFIER_RE = /^\{([0-9]+)(?:(,)([0-9]*))?\}/u;
const HEX2_RE = /^[0-9A-Fa-f]{2}$/u;
const HEX4_RE = /^[0-9A-Fa-f]{4}$/u;
const BRACED_ESCAPE_RE = /^\\u\{([0-9A-Fa-f]{1,6})\}/u;

/** A `RegExp` escape for one code point, valid in and out of a class. */
function codePointSource(value: number): string {
	return `\\u{${value.toString(16)}}`;
}

/** Whether `letter` is a key of `table`, an own key and never `""`. */
function has(table: Readonly<Record<string, unknown>>, letter: string) {
	return letter !== "" && Object.hasOwn(table, letter);
}

/** Read an MDQ regex body, check it and translate it to `RegExp` source. */
class Translator {
	/** The code points of the body, so an index counts code points. */
	private readonly chars: string[];
	private index = 0;

	constructor(private readonly body: string) {
		this.chars = Array.from(body);
	}

	translate(): string {
		try {
			return this.disjunction(true);
		} catch (error) {
			if (error instanceof RangeError) {
				throw this.error("groups are nested too deeply");
			}
			throw error;
		}
	}

	private error(reason: string): InvalidRegexError {
		return new InvalidRegexError(
			`${reason} at position ${this.index}: ${repr(this.body)}`,
		);
	}

	private peek(offset = 0): string {
		return this.chars[this.index + offset] ?? "";
	}

	/** The code points from `from` (relative to the index) as a string. */
	private rest(from = 0): string {
		return this.chars.slice(this.index + from).join("");
	}

	private disjunction(top = false): string {
		const alternatives = [this.alternative()];
		while (this.peek() === "|") {
			this.index += 1;
			alternatives.push(this.alternative());
		}
		if (top && this.index < this.chars.length) {
			throw this.error("unmatched ')'");
		}
		return alternatives.join("|");
	}

	private alternative(): string {
		let text = "";
		while (this.index < this.chars.length && !"|)".includes(this.peek())) {
			text += this.term();
		}
		return text;
	}

	private term(): string {
		const char = this.peek();
		if (char === "^" || char === "$") {
			this.index += 1;
			return char;
		}
		if (char === "\\" && (this.peek(1) === "b" || this.peek(1) === "B")) {
			this.index += 2;
			return BOUNDARY[this.chars[this.index - 1] ?? ""] ?? "";
		}
		if (
			char === "(" &&
			this.peek(1) === "?" &&
			(this.peek(2) === "=" || this.peek(2) === "!")
		) {
			const opener = this.chars.slice(this.index, this.index + 3).join("");
			this.index += 3;
			return opener + this.closeGroup();
		}
		return this.atom() + this.quantifier();
	}

	private atom(): string {
		const char = this.peek();
		if (char === ".") {
			this.index += 1;
			return DOT;
		}
		if (char === "(") return this.group();
		if (char === "[") return this.characterClass();
		if (char === "\\") return this.escape();
		if ("*+?".includes(char)) throw this.error("nothing to repeat");
		if ("{}]".includes(char)) {
			throw this.error(`${repr(char)} must be escaped here`);
		}
		this.index += 1;
		return codePointSource(char.codePointAt(0) ?? 0);
	}

	private group(): string {
		this.index += 1;
		if (this.peek() === "?") {
			if (this.peek(1) !== ":") throw this.error("unsupported group construct");
			this.index += 2;
			return `(?:${this.closeGroup()}`;
		}
		return `(${this.closeGroup()}`;
	}

	private closeGroup(): string {
		const inner = this.disjunction();
		if (this.peek() !== ")") throw this.error("missing ')'");
		this.index += 1;
		return `${inner})`;
	}

	private quantifier(): string {
		const char = this.peek();
		let text: string;
		if (char === "*" || char === "+" || char === "?") {
			this.index += 1;
			text = char;
		} else if (char === "{") {
			const found = QUANTIFIER_RE.exec(this.rest());
			if (found === null) {
				throw this.error("'{' must be escaped or start a quantifier");
			}
			const [whole, low = "", comma, high] = found;
			if (comma && high && BigInt(low) > BigInt(high)) {
				throw this.error("quantifier range is out of order");
			}
			this.index += whole.length;
			text = whole;
		} else {
			return "";
		}
		if (this.peek() === "?") {
			this.index += 1;
			text += "?";
		}
		return text;
	}

	/** An escape outside a class, other than `\b` and `\B`. */
	private escape(): string {
		const letter = this.peek(1);
		if (has(SHORTHAND, letter)) {
			this.index += 2;
			return SHORTHAND[letter] ?? "";
		}
		return codePointSource(this.escapedCodePoint(false));
	}

	/**
	 * Read the escape at the index that denotes one code point, and move
	 * past it.
	 */
	private escapedCodePoint(inClass: boolean): number {
		const letter = this.peek(1);
		if (
			letter !== "" &&
			(SYNTAX_CHARACTERS.has(letter) ||
				letter === "/" ||
				(inClass && letter === "-"))
		) {
			this.index += 2;
			return letter.codePointAt(0) ?? 0;
		}
		if (has(CONTROL_ESCAPES, letter)) {
			this.index += 2;
			return CONTROL_ESCAPES[letter] ?? 0;
		}
		if (inClass && letter === "b") {
			this.index += 2;
			return 0x08;
		}
		if (
			letter === "x" &&
			HEX2_RE.test(this.chars.slice(this.index + 2, this.index + 4).join(""))
		) {
			this.index += 4;
			return Number.parseInt(
				this.chars.slice(this.index - 2, this.index).join(""),
				16,
			);
		}
		if (letter === "u") {
			if (this.peek(2) === "{") {
				const found = BRACED_ESCAPE_RE.exec(this.rest());
				if (found === null || Number.parseInt(found[1] ?? "", 16) > 0x10ffff) {
					throw this.error("invalid \\u{...} escape");
				}
				const value = Number.parseInt(found[1] ?? "", 16);
				if (value >= 0xd800 && value <= 0xdfff) {
					throw this.error("surrogate escape is not a code point");
				}
				this.index += found[0].length;
				return value;
			}
			const digits = this.chars.slice(this.index + 2, this.index + 6).join("");
			if (HEX4_RE.test(digits)) {
				const value = Number.parseInt(digits, 16);
				if (value >= 0xd800 && value <= 0xdfff) {
					throw this.error(
						"surrogate escape, write the code point as \\u{...}",
					);
				}
				this.index += 6;
				return value;
			}
		}
		throw this.error(
			`unsupported escape ${repr(this.chars.slice(this.index, this.index + 2).join(""))}`,
		);
	}

	/** Read the class that opens at the index and translate it. */
	private characterClass(): string {
		this.index += 1;
		const negated = this.peek() === "^";
		if (negated) this.index += 1;
		if (this.peek() === "]") throw this.error("empty character class");
		const plain: string[] = [];
		const shorthands: string[] = [];
		while (this.peek() !== "]") {
			if (this.index >= this.chars.length) throw this.error("missing ']'");
			const low = this.classAtom();
			if (this.peek() === "-" && this.peek(1) !== "]" && this.peek(1) !== "") {
				this.index += 1;
				const high = this.classAtom();
				if (typeof low === "string" || typeof high === "string") {
					throw this.error("shorthand class in a range");
				}
				if (low > high) throw this.error("class range is out of order");
				plain.push(`${codePointSource(low)}-${codePointSource(high)}`);
			} else if (typeof low === "string") {
				shorthands.push(SHORTHAND[low] ?? "");
			} else {
				plain.push(codePointSource(low));
			}
		}
		this.index += 1;

		const plainText = plain.join("");
		if (shorthands.length === 0) {
			return `[${negated ? "^" : ""}${plainText}]`;
		}
		const options = plainText ? [`[${plainText}]`] : [];
		const union = [...options, ...shorthands].join("|");
		if (negated) return `(?:(?!${union})[^])`;
		return `(?:${union})`;
	}

	/**
	 * Read one atom of a class: a code point, or the letter of a shorthand
	 * class (`d`, `D`, `w`, `W`, `s` or `S`).
	 */
	private classAtom(): number | string {
		const char = this.peek();
		if (char === "\\") {
			const letter = this.peek(1);
			if (has(SHORTHAND, letter)) {
				this.index += 2;
				return letter;
			}
			return this.escapedCodePoint(true);
		}
		if (char === "&" && this.peek(1) === "&") {
			throw this.error("character class intersection is not supported");
		}
		if (this.index >= this.chars.length) throw this.error("missing ']'");
		this.index += 1;
		return char.codePointAt(0) ?? 0;
	}
}

/**
 * Check `body` against the allow-list of `docs/references/patterns.md` and
 * translate it to `RegExp` source (flag `u`) with the MDQ semantics.
 *
 * @throws {InvalidRegexError} If `body` uses a construct that the table of
 * the spec does not list.
 */
export function translateBody(body: string): string {
	return new Translator(body).translate();
}

/**
 * Reject every construct that the table of `docs/references/patterns.md`
 * does not list.
 *
 * @throws {InvalidRegexError} If `body` uses an unsupported construct.
 */
export function validateRegexBody(body: string): void {
	translateBody(body);
}

/**
 * Translate `body` to `RegExp` source and compile it, with `u`, `flags` and
 * the extra `prefix` and `suffix` around the source.
 *
 * @throws {InvalidRegexError} If `body` is outside the allow-list, or the
 * engine cannot compile it.
 */
export function compileRegex(
	body: string,
	flags: string,
	original: string,
	[prefix, suffix] = ["", ""],
): RegExp {
	const source = translateBody(body);
	try {
		return new RegExp(`${prefix}${source}${suffix}`, `u${flags}`);
	} catch {
		throw new InvalidRegexError(`invalid regex body: ${repr(original)}`);
	}
}

/**
 * Return the canonical `/body/flags` form of `pattern`.
 *
 * @throws {InvalidRegexError} If the pattern is malformed or uses
 * unsupported syntax.
 */
export function normalizeRegex(pattern: string): string {
	const [body, rawFlags] = parseRegex(pattern);
	validateRegexBody(body);
	compileRegex(body, "", body);
	return `/${body}/${flagString(effectiveFlags(rawFlags))}`;
}

/** A compiled regex pattern from an MDQ document. */
export class RegexPattern {
	/** The original pattern string, exactly as passed in. */
	readonly pattern: string;
	/** The regex body, with delimiters and flags stripped. */
	readonly regex: string;
	/** Effective flags: meaningful flags only, ignored ones dropped. */
	readonly flags: ReadonlySet<string>;
	/** The regex that matches a prefix, anywhere and the whole subject. */
	private readonly compiled: { start: RegExp; include: RegExp; full: RegExp };

	/**
	 * @throws {InvalidRegexError} If the pattern is malformed or uses
	 * unsupported syntax.
	 */
	constructor(pattern: string, options: { flags?: string } = {}) {
		const extra = options.flags ?? "";
		this.pattern = pattern;
		const [body, rawFlags] = parseRegex(pattern);
		validateFlagChars(extra);
		const effective = new Set([
			...effectiveFlags(rawFlags),
			...effectiveFlags(extra),
		]);
		validateRegexBody(body);

		// The 'n' flag normalizes the body's literal text, not its escape
		// sequences: normalizeText only sees the characters written in the
		// source, so a literal "á" is normalized but "á" is not.
		const compileBody = effective.has("n") ? normalizeText(body) : body;
		const jsFlags = effective.has("i") ? "i" : "";
		this.compiled = {
			start: compileRegex(compileBody, jsFlags, body, ["^(?:", ")"]),
			include: compileRegex(compileBody, jsFlags, body),
			full: compileRegex(compileBody, jsFlags, body, ["^(?:", ")$"]),
		};
		this.regex = body;
		this.flags = effective;
	}

	/** Match `response` using the strategy selected by the `f`/`b` flags. */
	match(response: string): boolean {
		if (this.flags.has("f")) return this.includeMatch(response);
		if (this.flags.has("b")) return this.startMatch(response);
		return this.fullMatch(response);
	}

	/** Whether the regex matches a prefix of `response`. */
	startMatch(response: string): boolean {
		return this.compiled.start.test(this.subject(response));
	}

	/** Whether the regex matches anywhere in `response`. */
	includeMatch(response: string): boolean {
		return this.compiled.include.test(this.subject(response));
	}

	/** Whether the regex matches the entirety of `response`. */
	fullMatch(response: string): boolean {
		return this.compiled.full.test(this.subject(response));
	}

	/**
	 * Prepare a response for matching (patterns.md, "Regex subject"): NFC,
	 * then remove the `UNICODE_SPACE` code points from both ends, then apply
	 * the `n` flag's normalization, if set.
	 */
	private subject(response: string): string {
		const subject = response.normalize("NFC").replace(SPACE_ENDS_RE, "");
		return this.flags.has("n") ? normalizeText(subject) : subject;
	}

	toString(): string {
		return `RegexPattern(${repr(this.pattern)}, flags=${repr(flagString(this.flags))})`;
	}
}
