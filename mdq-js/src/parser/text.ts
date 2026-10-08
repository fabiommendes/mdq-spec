/**
 * String helpers that behave like the Python built-ins that mdq-py uses. No
 * Python module holds this code: it replaces `str` methods whose JavaScript
 * counterparts give different results.
 */

/**
 * Python's `str.isspace` characters, as a class body. JS `\s` differs: it
 * matches U+FEFF and not U+001C to U+001F or U+0085.
 */
export const SPACE =
	"\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
const STRIP_RE = new RegExp(`^[${SPACE}]+|[${SPACE}]+$`, "gu");
const RSTRIP_RE = new RegExp(`[${SPACE}]+$`, "u");

// The grammar's `ws` is `[ \t]` (docs/references/grammar.md). Patterns write
// it out; `strip(text, " \t")` trims it.

/**
 * The body of the `UNICODE_SPACE` class of docs/references/grammar.md: the 25
 * code points of the Unicode `White_Space` property. Write it inside a
 * character class, never use `\s`.
 */
export const UNICODE_SPACE =
	"\\t\\n\\v\\f\\r \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";

/** Escape `chars` to sit inside a character class. */
function classBody(chars: string): string {
	return chars.replace(/[\\\]^-]/gu, "\\$&");
}

/**
 * Python's `str.strip()`, or `str.strip(chars)` when `chars` is given: remove
 * the leading and trailing characters in `chars`. Without `chars` it removes
 * `SPACE`. Use it instead of `String.prototype.trim`, which removes U+FEFF
 * and keeps U+001C to U+001F and U+0085.
 */
export function strip(text: string, chars?: string): string {
	if (chars === undefined) return text.replace(STRIP_RE, "");
	const body = classBody(chars);
	return text.replace(new RegExp(`^[${body}]+|[${body}]+$`, "gu"), "");
}

/**
 * Python's `str.rstrip()`, or `str.rstrip(chars)`: remove the trailing
 * characters in `chars`, or of `SPACE` without it. Use it instead of
 * `String.prototype.trimEnd`, for the same reason as `strip`.
 */
export function rstrip(text: string, chars?: string): string {
	if (chars === undefined) return text.replace(RSTRIP_RE, "");
	return text.replace(new RegExp(`[${classBody(chars)}]+$`, "u"), "");
}

/** Characters `str.isprintable` accepts, except the space (handled apart). */
const PRINTABLE_RE = /^[^\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$/u;

/**
 * Python's `repr()` of a string, for error messages that quote user text as
 * mdq-py does: single quotes unless the text holds a `'` and no `"`,
 * backslash escapes for `\\`, the quote, `\n`, `\r`, `\t`, and `\xNN`,
 * `\uNNNN` or `\UNNNNNNNN` for characters that are not printable
 * (`str.isprintable`).
 */
export function repr(text: string): string {
	const quote = text.includes("'") && !text.includes('"') ? '"' : "'";
	let out = quote;
	for (const char of text) {
		const code = char.codePointAt(0) ?? 0;
		if (char === "\\" || char === quote) {
			out += `\\${char}`;
		} else if (char === "\n") {
			out += "\\n";
		} else if (char === "\r") {
			out += "\\r";
		} else if (char === "\t") {
			out += "\\t";
		} else if (char === " " || PRINTABLE_RE.test(char)) {
			out += char;
		} else if (code < 0x100) {
			out += `\\x${code.toString(16).padStart(2, "0")}`;
		} else if (code < 0x10000) {
			out += `\\u${code.toString(16).padStart(4, "0")}`;
		} else {
			out += `\\U${code.toString(16).padStart(8, "0")}`;
		}
	}
	return out + quote;
}
