/**
 * Letters and the normalized value of a choice marker.
 *
 * A port of `mdq-py/mdq/_letters.py`. The spec defines both
 * (docs/references/choices.md, "Choice marker", and
 * docs/question-types/true-false.md, "Body"). The Unicode tables are the ones
 * of the JavaScript runtime, so a rare code point can differ from Python.
 */

import { strip } from "./parser/text.js";

/**
 * `LETTER` of docs/references/grammar.md, "Regex dialect": General_Category
 * Lu, Ll, Lt and Lo. Lm (modifier letters) is not a letter.
 */
const LETTER_RE = /^[\p{Lu}\p{Ll}\p{Lt}\p{Lo}]$/u;

/** Whether `text` is exactly one code point whose category is in `LETTER`. */
export function isLetter(text: string): boolean {
	return LETTER_RE.test(text);
}

/** The NFKC form of `text`. */
export function nfkc(text: string): string {
	return text.normalize("NFKC");
}

/**
 * `value` without the `ws` at its ends, where a character is `ws` when it is
 * a space, a tab or its NFKC form is a space (U+00A0, U+2003, ...). The
 * choice marker is the one place where a non-ASCII space acts as `ws`
 * (docs/references/grammar.md, "Start and end of a block").
 */
export function stripMarkerSpace(value: string): string {
	const chars = Array.from(value);
	const isSpace = (char: string | undefined): boolean => {
		const form = nfkc(char ?? "");
		return form === " " || form === "\t";
	};
	let start = 0;
	let end = chars.length;
	while (start < end && isSpace(chars[start])) start++;
	while (end > start && isSpace(chars[end - 1])) end--;
	return chars.slice(start, end).join("");
}

/**
 * The value of a choice marker as the parser reads it: NFKC, then ASCII
 * lowercase (`A` to `Z` only), without the `ws` at its ends. `Ｆ` (U+FF26)
 * becomes `f` and U+00A0 becomes the empty string. Never `toLowerCase`.
 */
export function normalizeValue(value: string): string {
	return strip(
		nfkc(value).replace(/[A-Z]/gu, (char) => char.toLowerCase()),
		" \t",
	);
}

/**
 * The space-separated `letters` in upper and lower case. The normalized value
 * only lowercases ASCII, so a cased non-ASCII letter (`Đ`, `В`, `Н`) appears
 * in both cases.
 */
function bothCases(letters: string): ReadonlySet<string> {
	const forms = new Set<string>();
	for (const letter of letters.split(" ").filter((l) => l !== "")) {
		forms.add(letter);
		forms.add(letter.toLowerCase());
	}
	return forms;
}

/**
 * TRUE and FALSE letters of true-false.md, "Body", matched against the
 * normalized value. Every other letter (but `x`) is a WARNING letter.
 */
export const TRUE_LETTERS = bothCases(
	"T V B D Đ 对 對 真 是 В 참 ص स স ब ఒ ச ถ સ",
);
export const FALSE_LETTERS = bothCases(
	"F M E Y 错 錯 偽 非 Н 거 خ غ ग ম च త த ผ ખ",
);

/** One row of the locale table of true-false.md, "Locale". */
export interface LocaleRow {
	/** Letters accepted for true. May hold WARNING letters. */
	readonly true: ReadonlySet<string>;
	/** Letters accepted for false. */
	readonly false: ReadonlySet<string>;
	/**
	 * Letters that mean false in the language but true globally. A WARNING
	 * letter, or a TRUE letter through a romanization (`B` under `bn`).
	 */
	readonly falseFriends: ReadonlySet<string>;
}

function row(
	trueLetters: string,
	falseLetters: string,
	falseFriends = "",
): LocaleRow {
	return {
		true: bothCases(trueLetters),
		false: bothCases(falseLetters),
		falseFriends: bothCases(falseFriends),
	};
}

/** The locale table of true-false.md, keyed by language subtag. */
export const LOCALE_ROWS: Readonly<Record<string, LocaleRow>> = {
	en: row("T", "F", "W"),
	zh: row("T 对 對 是", "F 错 錯 非", "C 否"),
	yue: row("T 對", "F 錯", "C"),
	hi: row("T स", "F ग", "G"),
	es: row("T V", "F"),
	ar: row("T ص", "F خ", "K"),
	fr: row("T V", "F"),
	bn: row("T স", "F ম", "B"),
	pt: row("T V C", "F E"),
	id: row("T B", "F", "S"),
	ms: row("T B", "F", "S"),
	ur: row("T ص", "F غ", "G J"),
	ru: row("T В", "F Н", "N"),
	de: row("T W R", "F"),
	ja: row("T 真 O", "F 偽", "B"),
	mr: row("T ब", "F च", "C"),
	vi: row("T D Đ", "F", "S"),
	te: row("T ఒ", "F త"),
	sw: row("T", "F", "S"),
	tr: row("T D", "F Y"),
	tl: row("T", "F M"),
	fil: row("T", "F M"),
	ta: row("T ச", "F த"),
	fa: row("T ص", "F غ", "G N"),
	ko: row("T 참 O", "F 거", "G"),
	th: row("T ถ", "F ผ", "P"),
	gu: row("T સ", "F ખ", "K"),
	it: row("T V", "F"),
};
