/**
 * Lint rules shared by several question families: the common document fields
 * (`id`, `uuid`, `tags`, `locale`), text checks and the `highlight` rules. A
 * port of `mdq-py/mdq/models/_lint.py`.
 *
 * The rules of one family live next to its rules (`choice.ts`, `numeric.ts`,
 * `ordering.ts`, `text.ts`, `fill-in.ts`, `exam.ts`). `lint-codes.ts` holds
 * the registry of codes they all report through, and `lint` itself is in
 * `exam.ts`, which knows every family.
 *
 * These are the SHOULD/MAY-level rules the specification leaves to
 * implementations: `warning` when the document is probably wrong, `info` for
 * advisory rules. Every function takes values the schema and the model rules
 * already accepted. `invalid-frontmatter-field` and `redundant-id` are not
 * here: only the Markdown parser can see them.
 */

import MarkdownIt from "markdown-it";
import type { Diagnostic, PathStep } from "../diagnostics.js";
import { md, SLUG_BODY_RE } from "../markdown.js";
import { findStrayChoiceMarkers } from "../parser/blocks.js";
import { repr, strip } from "../parser/text.js";
import PYGMENTS_ALIASES from "../pygments-aliases.json" with { type: "json" };
import { lintDiagnostic } from "./lint-codes.js";

/**
 * Renders markdown to compare two ordering lines, or two choices, the way a
 * student sees them, and finds the setext headings and thematic breaks. The
 * options of `md`, but with link reference definitions on, as in mdq-py's
 * `MarkdownIt("gfm-like")`.
 */
const RENDER_MD = new MarkdownIt("default", md.options);

/**
 * Two-letter codes that look like a language but are not valid ISO 639-1;
 * they are almost always a country code written where a language belongs.
 */
const LOOKALIKE_LANGUAGE_SUBTAGS: Readonly<Record<string, string>> = {
	cn: "zh",
	sp: "es",
	jp: "ja",
	gr: "el",
	kr: "ko",
	cz: "cs",
	dk: "da",
	ua: "uk",
};

const UUID_VERSIONS = new Set("12345678");
const UUID_VARIANTS = new Set("89abAB");

const URL_SAFE_ID_RE = new RegExp(`^${SLUG_BODY_RE}$`, "u");

/**
 * The aliases of the Pygments lexers (Pygments 2.21.0, `pygments.lexers.
 * _mapping.LEXERS`), the reference list of `unknown-highlight-language`.
 * Regenerate it with `sorted({a for v in LEXERS.values() for a in v[2]})`.
 */
const HIGHLIGHT_LANGUAGES: ReadonlySet<string> = new Set(
	PYGMENTS_ALIASES as string[],
);

/** The language subtag of a locale, lower case; empty without a locale. */
export function languageSubtag(locale: string | undefined): string {
	if (locale === undefined) return "";
	return (locale.split("-")[0] ?? "").toLowerCase();
}

//
// Common rules
//

/** base.md:252: `id` SHOULD be url-safe (`[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*`). */
export function checkIdIsUrlSafe(id: string | undefined): Diagnostic[] {
	if (id === undefined || URL_SAFE_ID_RE.test(id)) return [];
	return [
		lintDiagnostic(
			"unsafe-id",
			["id"],
			`${repr(id)} is not url-safe; expected only letters, digits, '-' and '_', per the pattern [a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*`,
		),
	];
}

/** base.md:255: `id` and `title` SHOULD both be defined. */
export function checkIdAndTitleDefined(
	id: string | undefined,
	title: string | undefined,
): Diagnostic[] {
	const found: Diagnostic[] = [];
	if (id === undefined) {
		found.push(lintDiagnostic("missing-id", ["id"], "'id' is not defined"));
	}
	if (title === undefined) {
		found.push(
			lintDiagnostic("missing-title", ["title"], "'title' is not defined"),
		);
	}
	return found;
}

/** generic.md: the version and variant nibbles of a `uuid` are meaningful. */
export function checkUuidVersionAndVariant(
	uuid: string | undefined,
): Diagnostic[] {
	if (uuid === undefined) return [];
	const found: Diagnostic[] = [];
	// The model rules checked the shape: `xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`.
	const version = uuid[14] ?? "";
	if (!UUID_VERSIONS.has(version)) {
		found.push(
			lintDiagnostic(
				"uuid-unknown-version",
				["uuid"],
				`UUID version nibble is ${repr(version)}; expected one of 1-8 (got the 13th character of ${repr(uuid)})`,
			),
		);
	}
	const variant = uuid[19] ?? "";
	if (!UUID_VARIANTS.has(variant)) {
		found.push(
			lintDiagnostic(
				"uuid-unknown-variant",
				["uuid"],
				`UUID variant nibble is ${repr(variant)}; expected one of 8, 9, a, b (got the 17th character of ${repr(uuid)})`,
			),
		);
	}
	return found;
}

/**
 * generic.md accepts `tags` as a list or as a single comma-delimited string;
 * a comma left inside a list entry means the string form was never split.
 */
export function checkTags(tags: readonly string[]): Diagnostic[] {
	const found: Diagnostic[] = [];
	for (const [index, tag] of tags.entries()) {
		if (!tag.includes(",")) continue;
		found.push(
			lintDiagnostic(
				"unsplit-tag-list",
				["tags", index],
				`tag ${repr(tag)} contains a comma; a comma-delimited string is only split when \`tags\` is written as a single string, not as a list`,
			),
		);
	}
	return found;
}

/**
 * exam.md, "Questions": a `---` or `===` line right after text is a setext
 * heading underline in CommonMark, not a block boundary, so a frontmatter or
 * include block glued to a paragraph is swallowed into the text before it.
 * One warning per field, at the first heading.
 */
export function checkSetextHeading(
	text: string | undefined,
	path: readonly PathStep[],
): Diagnostic[] {
	if (!text) return [];
	for (const token of RENDER_MD.parse(text, {})) {
		if (
			token.type === "heading_open" &&
			token.level === 0 &&
			(token.markup === "-" || token.markup === "=")
		) {
			const underline = token.markup.repeat(3);
			const role =
				token.markup === "-" ? "opens a block" : "separates questions";
			return [
				lintDiagnostic(
					"setext-heading",
					path,
					`a ${repr(underline)} line right after text is a setext heading, not a block boundary; put a blank line before the ${repr(underline)} that ${role}`,
				),
			];
		}
	}
	return [];
}

/**
 * exam.md, "Questions": a thematic break written with `-` (`---`, `- - -`,
 * ...) changes meaning inside an exam, where a `---` line opens a block. One
 * warning per field. A `---` right after text is a setext underline, which
 * `checkSetextHeading` reports instead.
 */
export function checkUnsafeThematicBreak(
	text: string | undefined,
	path: readonly PathStep[],
): Diagnostic[] {
	if (!text) return [];
	for (const token of RENDER_MD.parse(text, {})) {
		if (token.type === "hr" && token.markup.startsWith("-")) {
			return [
				lintDiagnostic(
					"unsafe-thematic-break",
					path,
					"'---' is a thematic break here, but inside an exam a '---' line opens a block; write '***' or '___'",
				),
			];
		}
	}
	return [];
}

/**
 * question-base.md, "Forbidden elements": one warning per item of an
 * unordered list in which only some items start with a choice marker, when
 * the marker of the item is a choice value or is empty.
 */
export function checkStrayChoiceMarkers(
	text: string | undefined,
	path: readonly PathStep[],
): Diagnostic[] {
	if (!text) return [];
	return findStrayChoiceMarkers(text).map((marker) =>
		lintDiagnostic(
			"stray-choice-marker",
			path,
			`a list item starts with the choice marker ${repr(marker)}, but other items of its list do not, so the list is not a choice list`,
		),
	);
}

/** A well-formed tag can still be wrong: this catches country codes written where a language belongs. */
export function checkLocaleLanguageSubtag(
	locale: string | undefined,
): Diagnostic[] {
	const subtag = languageSubtag(locale);
	const suggestion = Object.hasOwn(LOOKALIKE_LANGUAGE_SUBTAGS, subtag)
		? LOOKALIKE_LANGUAGE_SUBTAGS[subtag]
		: undefined;
	if (suggestion === undefined) return [];
	return [
		lintDiagnostic(
			"locale-lookalike-language",
			["locale"],
			`${repr(subtag)} is not a valid ISO 639-1 language code; did you mean ${repr(suggestion)}?`,
		),
	];
}

//
// Rules of the question types
//

/**
 * essay.md, ordering.md: `highlight` SHOULD be a language a highlighter
 * recognizes: an alias of a Pygments lexer, compared in lower case.
 */
export function checkHighlightLanguage(
	highlight: string | undefined,
): Diagnostic[] {
	if (highlight === undefined) return [];
	if (HIGHLIGHT_LANGUAGES.has(highlight.toLowerCase())) return [];
	return [
		lintDiagnostic(
			"unknown-highlight-language",
			["highlight"],
			`${repr(highlight)} is not a recognized Pygments lexer alias, so a highlighter would not know this language`,
		),
	];
}

/**
 * essay.md, ordering.md: `content: code` with no `highlight` is an info
 * (`code-content-without-highlight`); with one, the language is checked
 * (`unknown-highlight-language`). A `highlight` with any other content is a
 * `schema-error`.
 */
export function checkCodeHighlight(
	content: string | undefined,
	highlight: string | undefined,
): Diagnostic[] {
	if (content !== "code") return [];
	if (highlight === undefined) {
		return [
			lintDiagnostic(
				"code-content-without-highlight",
				["highlight"],
				"content is 'code' but no 'highlight' language is given, so a highlighter cannot color the code",
			),
		];
	}
	return checkHighlightLanguage(highlight);
}

/** How `text` renders, for comparing lines and choices as a reader would. */
export function renderVisualKey(text: string): string {
	return strip(RENDER_MD.renderInline(text, {}));
}
