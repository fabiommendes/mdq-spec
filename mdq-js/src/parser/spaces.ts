/**
 * The `non-ascii-whitespace` lint (docs/references/grammar.md, "Unicode
 * spaces").
 *
 * The grammar reads a Unicode space as text, but Markdown parsers, editors
 * and string functions can read it as whitespace or as a line break, so the
 * result of the document can change from one implementation to another. This
 * check reads the source text, not the parsed document: it needs the lines,
 * the code blocks and the code spans, which the parsed document no longer
 * has.
 *
 * A port of `mdq-py/mdq/_parser/_spaces.py`.
 */

import { type Diagnostic, diagnostic, type Severity } from "../diagnostics.js";
import { md, splitLines, stripBom } from "../markdown.js";
import { codeLineIndices, isExam, looksLikeFrontmatter } from "./exam.js";
import { splitFrontmatter } from "./frontmatter.js";
import { strip } from "./text.js";

const CODE = "non-ascii-whitespace";
/** The code of a Unicode space in prose: one severity per code. */
const PROSE_CODE = "non-ascii-whitespace-in-prose";

/**
 * The characters the lint reports: `UNICODE_SPACE` outside ASCII, and U+FEFF,
 * which is invisible and which JavaScript `\s` matches.
 */
const REPORTED =
	"\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff";
const REPORTED_RE = new RegExp(`[${REPORTED}]`, "gu");
/**
 * Many editors show these as line breaks, so they are a `warning` at any
 * position.
 */
const LINE_SEPARATORS: ReadonlySet<string> = new Set(["\x85", " ", " "]);

/** A space, a tab or a reported character. */
const SPACE = `[ \\t${REPORTED}]`;
/**
 * The markers at the start of a line: list items, headings, blockquotes and
 * the `!` of a comment line, each after optional spaces and tabs.
 */
const PREFIX_RE = /^(?:[ \t]*(?:[*+-]|[0-9]{1,9}[.)]|#{1,6}|>|!))*/u;
const SPACES_RE = new RegExp(`${SPACE}*`, "yu");
const TRAILING_RE = new RegExp(`${SPACE}*$`, "u");
/** A bracketed tag followed by `:`, as in `[numeric]:`. */
const TAG_LINE_RE = new RegExp(`\\[[^\\]\\r\\n]*\\]${SPACE}*:`, "yu");
/**
 * The bracketed tags at the start of a choice item or a stem, as in `[*]
 * [ipe]`, with the spaces around them.
 */
const BRACKETS_RE = new RegExp(`(?:\\[[^\\]\\r\\n]*\\]${SPACE}*)+`, "yu");
/**
 * The tag before a pattern list: `[short-answer]`, with or without `/accept`
 * or `/reject`, and the same tags of a fill-in blank.
 */
const PATTERN_LIST_TAG_RE =
	/^\[(?:short-answer|\^[^\]/]+\/short-answer)(?:\/(?:accept|reject))?\]/u;
/** A code span: a run of backticks, up to the next run of the same length. */
const CODE_SPAN_RE = /(?<!`)(`+)(?!`)(.+?)(?<!`)\1(?!`)/gsu;

/** Unicode names of the reported characters (JavaScript has no name table). */
const NAMES: Readonly<Record<number, string>> = {
	133: "NEXT LINE",
	160: "NO-BREAK SPACE",
	5760: "OGHAM SPACE MARK",
	8192: "EN QUAD",
	8193: "EM QUAD",
	8194: "EN SPACE",
	8195: "EM SPACE",
	8196: "THREE-PER-EM SPACE",
	8197: "FOUR-PER-EM SPACE",
	8198: "SIX-PER-EM SPACE",
	8199: "FIGURE SPACE",
	8200: "PUNCTUATION SPACE",
	8201: "THIN SPACE",
	8202: "HAIR SPACE",
	8232: "LINE SEPARATOR",
	8233: "PARAGRAPH SEPARATOR",
	8239: "NARROW NO-BREAK SPACE",
	8287: "MEDIUM MATHEMATICAL SPACE",
	12288: "IDEOGRAPHIC SPACE",
	65279: "ZERO WIDTH NO-BREAK SPACE",
};

/**
 * Report each Unicode space in an MDQ source document.
 *
 * Code blocks, code spans, YAML frontmatter and a byte order mark at the
 * start of `text` are skipped. The severity is `warning` for a line separator
 * (U+0085, U+2028, U+2029) and for a character in a syntax position, and
 * `info` for a character inside prose.
 *
 * @param text MDQ source of a question or an exam.
 * @returns One diagnostic per character, in source order:
 *   `non-ascii-whitespace` for a `warning`, `non-ascii-whitespace-in-prose`
 *   for an `info`. `line` is the 1-based line in `text`.
 */
export function findUnicodeSpaces(input: string): Diagnostic[] {
	const text = stripBom(input);
	const [frontmatter, body] = splitFrontmatter(text);
	let offset = 0;
	if (frontmatter !== null) {
		offset = splitLines(text, true).length - splitLines(body, true).length;
	}

	const lines = splitLines(body);
	const skipped = codeLineIndices(lines);
	if (isExam(body)) {
		for (const index of questionFrontmatterLines(lines, skipped)) {
			skipped.add(index);
		}
	}
	const patternLines = patternLineIndices(body);
	const masked = maskCodeSpans(lines, skipped);

	const diagnostics: Diagnostic[] = [];
	for (const [index, line] of masked.entries()) {
		if (skipped.has(index)) continue;
		for (const match of line.matchAll(REPORTED_RE)) {
			let severity: Severity = "info";
			if (
				LINE_SEPARATORS.has(match[0]) ||
				patternLines.has(index) ||
				inSyntaxPosition(line, match.index)
			) {
				severity = "warning";
			}
			diagnostics.push(describe(match[0], severity, offset + index + 1));
		}
	}
	return diagnostics;
}

/** Whether the character at `column` of `line` is in a syntax position. */
function inSyntaxPosition(line: string, column: number): boolean {
	const start = PREFIX_RE.exec(line)?.[0].length ?? 0;
	SPACES_RE.lastIndex = start;
	const content = start + (SPACES_RE.exec(line)?.[0].length ?? 0);
	if (column < content) return true;
	if (column >= (TRAILING_RE.exec(line)?.index ?? line.length)) return true;
	TAG_LINE_RE.lastIndex = content;
	if (TAG_LINE_RE.test(line)) return true;
	BRACKETS_RE.lastIndex = content;
	const brackets = BRACKETS_RE.exec(line);
	return brackets !== null && column < content + brackets[0].length;
}

/** The first line of each item of a short-answer or fill-in pattern list. */
function patternLineIndices(body: string): Set<number> {
	const indices = new Set<number>();
	let afterTag = false;
	let inPatternList = false;
	for (const token of md.parse(body, {})) {
		if (inPatternList) {
			if (token.type === "bullet_list_close" && token.level === 0) {
				inPatternList = false;
			} else if (
				token.type === "list_item_open" &&
				token.level === 1 &&
				token.map
			) {
				indices.add(token.map[0]);
			}
			continue;
		}
		if (token.type === "inline" && token.level === 1) {
			afterTag = PATTERN_LIST_TAG_RE.test(token.content);
		} else if (token.type === "bullet_list_open" && token.level === 0) {
			inPatternList = afterTag;
			afterTag = false;
		} else if (
			token.nesting === 1 &&
			token.level === 0 &&
			token.type !== "paragraph_open"
		) {
			afterTag = false;
		}
	}
	return indices;
}

/**
 * The lines of each question frontmatter inside an exam: a `---` line, the
 * YAML after it, and the next `---` line.
 *
 * Uses the same test as the exam parser: the text between the two lines must
 * load as a YAML mapping.
 */
function questionFrontmatterLines(
	lines: readonly string[],
	codeLines: ReadonlySet<number>,
): Set<number> {
	const covered = new Set<number>();
	const fences = lines.flatMap((line, i) =>
		!codeLines.has(i) && line.replace(/[ \t]+$/u, "") === "---" ? [i] : [],
	);
	let position = 0;
	while (position + 1 < fences.length) {
		const start = fences[position] ?? 0;
		const end = fences[position + 1] ?? 0;
		if (looksLikeFrontmatter(lines.slice(start + 1, end))) {
			for (let i = start; i <= end; i++) covered.add(i);
			position += 2;
		} else {
			position += 1;
		}
	}
	return covered;
}

/**
 * Replace the characters of each code span with `x`.
 *
 * A code span can continue on the next line, but not past a blank line or a
 * code block, so each run of other lines is searched as one text.
 */
function maskCodeSpans(
	lines: readonly string[],
	codeLines: ReadonlySet<number>,
): string[] {
	const masked = [...lines];
	let run: number[] = [];
	for (let index = 0; index <= lines.length; index++) {
		const inRun =
			index < lines.length &&
			!codeLines.has(index) &&
			strip(lines[index] ?? "", " \t") !== "";
		if (inRun) {
			run.push(index);
			continue;
		}
		if (run.length > 0) {
			const joined = run
				.map((i) => lines[i] ?? "")
				.join("\n")
				.replace(CODE_SPAN_RE, (span) => span.replace(/[^\n]/gu, "x"));
			for (const [k, line] of joined.split("\n").entries()) {
				const target = run[k];
				if (target !== undefined) masked[target] = line;
			}
			run = [];
		}
	}
	return masked;
}

function describe(char: string, severity: Severity, line: number): Diagnostic {
	const codePoint = char.codePointAt(0) ?? 0;
	const name = NAMES[codePoint] ?? "";
	const label =
		`U+${codePoint.toString(16).toUpperCase().padStart(4, "0")} ${name}`.trimEnd();
	let detail: string;
	if (LINE_SEPARATORS.has(char)) {
		detail = "editors may show it as a line break";
	} else if (severity === "warning") {
		detail = "it is in MDQ syntax, and other tools may read it as whitespace";
	} else {
		detail = "other tools may read it as whitespace";
	}
	return diagnostic(
		severity,
		severity === "warning" ? CODE : PROSE_CODE,
		`${label} is text in MDQ, but ${detail}`,
		[],
		line,
	);
}
