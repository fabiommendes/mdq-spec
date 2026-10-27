/**
 * Exam documents: the H1 title, the instructions, and the `===`/`---` blocks
 * that become the entries of `questions`.
 *
 * A port of `mdq-py/mdq/_parser/_exam.py`. The parser never resolves an
 * `include` or `includeAll` block: it keeps it as the entry the block's
 * frontmatter writes. `resolveExam` in `src/banks.ts` replaces them.
 */

import { load } from "js-yaml";
import {
	type Diagnostic,
	diagnostic,
	type PathStep,
	prefixPath,
} from "../diagnostics.js";
import { MissingFieldError, ParseError } from "../errors.js";
import { includeKeyHint, misspelledIncludeKey } from "../include-keys.js";
import { md, splitLines } from "../markdown.js";
import { canonicalDuration, canonicalStart } from "../schedule.js";
import type { Exam } from "../schema/exam.js";
import { validateExam } from "../validate.js";
import { SLUG_PREFIX_RE } from "./choices.js";
import {
	commonFrontmatter,
	extractComment,
	invalidFrontmatterFields,
	loadFrontmatterYaml,
	splitFrontmatter,
} from "./frontmatter.js";
import {
	BRACKET_ITEM_RE,
	parseQuestionDocument,
	type RawDocument,
} from "./question.js";
import { readBodyTag } from "./tags.js";
import { rstrip, strip } from "./text.js";

/**
 * The line that starts a question block. It needs a blank line (or the start
 * of the text) before it: without one, CommonMark reads it as a setext
 * underline.
 */
export const SEPARATOR = "===";

/**
 * Fields a question takes from the exam when it does not declare them.
 * `tags`, `course` and `description` are not inherited.
 */
export const INHERITED_FIELDS = ["locale", "author"] as const;

/**
 * A line of only `=`, spaces and tabs with at least three `=` that is not a
 * separator reads as text. `parseExamDocument` warns about it
 * (`malformed-separator`).
 */
const NEAR_SEPARATOR_RE = /^[ \t]*=[ \t]*=[ \t]*=[ \t=]*$/u;

/**
 * A setext underline of CommonMark: `setext-heading` reports it, so it is not
 * a `malformed-separator` right after a text line.
 */
const SETEXT_UNDERLINE_RE = /^ {0,3}=+[ \t]*$/u;

/**
 * The fields of a question where `Exam.lint` reports `setext-heading`: their
 * text keeps the setext underline. `parseExamDocument` reports the other
 * fields.
 */
const LINTED_SETEXT_FIELDS: readonly string[] = ["stem", "epilogue"];

/** `# Title` or `# [slug] Title`; `rest` is the text after the marker. */
const H1_RE = /^#(?:[ \t]+(?<rest>[^\n]*?))?[ \t]*$/u;

/**
 * Frontmatter fields only an exam has, copied verbatim into the exam
 * document. The fields a question has too come from `commonFrontmatter`;
 * `start` and `duration` need their own parsing.
 */
const EXAM_PASSTHROUGH_KEYS = [
	"course",
	"description",
	"penalty",
	"grading",
	"shuffle",
] as const;

/**
 * Whether the source is an exam rather than a single question.
 *
 * An exam is recognized by its H1 title, which starts the document or
 * follows the frontmatter (exam.md, "The title"). An H1 anywhere else does
 * not make an exam: it is one of the block elements a question's preamble
 * rejects (base.md, "Forbidden elements").
 */
export function isExam(source: string): boolean {
	const [, body] = splitFrontmatter(source);
	for (const line of splitLines(body)) {
		if (strip(line, " \t")) return H1_RE.test(line);
	}
	return false;
}

/**
 * The indices of the lines inside a fenced or indented code block. Code
 * lines are never MDQ structure (title, separator, fence, body tag). A port
 * of `_code_line_indices` (`mdq-py/mdq/_parser/_exam.py`).
 */
export function codeLineIndices(lines: readonly string[]): Set<number> {
	const covered = new Set<number>();
	for (const token of md.parse(lines.join("\n"), {})) {
		if ((token.type === "fence" || token.type === "code_block") && token.map) {
			for (let i = token.map[0]; i < token.map[1]; i++) covered.add(i);
		}
	}
	return covered;
}

/**
 * Parse an exam document into its unvalidated JSON shape, the shape of the
 * `examples/valid/exam/*.yaml` files.
 *
 * `include` and `includeAll` blocks stay as `{include: id}` and
 * `{"includeAll": query, max?}` entries, with every key of the block's
 * frontmatter. An inline question block is parsed with
 * `parseQuestionDocument` and takes `locale` and `author` from the exam.
 * A block with no declared `id` gets none. Lines inside a fenced or indented
 * code block are never structure (title, `===`, `---`, body tag). A `start`
 * or `duration` that does not parse is kept as written, for the model to
 * report (`malformed-start`, `invalid-duration`).
 *
 * @param warnings When given, an `invalid-frontmatter-field` error
 *   `Diagnostic` is appended for every frontmatter key that is not a field
 *   of the frontmatter table -- at the exam's own top level (`[key]`) and
 *   inside each question block (`["questions", i, key]`) -- with the
 *   warnings about the source layout (`malformed-separator`,
 *   `setext-heading`, `separator-before-include`, and those of each
 *   question). Parsing never fails because of them.
 * @throws {MissingFieldError} If no line outside a code block is an H1
 *   (`field` is `"title"`).
 * @throws {ParseError} If a question's epilogue uses `---` as a thematic
 *   break, or if a question block is not valid MDQ.
 */
export function parseExamDocument(
	source: string,
	warnings?: Diagnostic[],
): RawDocument {
	const [frontmatterText, body] = splitFrontmatter(source);
	const front =
		frontmatterText === null ? {} : loadFrontmatterYaml(frontmatterText);
	warnings?.push(...invalidFrontmatterFields(front, "exam"));

	const doc: RawDocument = { type: "exam" };

	const lines = splitLines(body);
	const codeLines = codeLineIndices(lines);
	let heading: string | undefined;
	let titleIndex = 0;
	for (; titleIndex < lines.length; titleIndex++) {
		if (codeLines.has(titleIndex)) continue;
		const match = H1_RE.exec(lines[titleIndex] ?? "");
		if (match) {
			heading = match.groups?.rest ?? "";
			break;
		}
	}
	if (heading === undefined) {
		throw new MissingFieldError("title");
	}

	const slugMatch = SLUG_PREFIX_RE.exec(heading);
	if (slugMatch) {
		doc.id = slugMatch.groups?.slug;
		heading = strip(heading.slice(slugMatch[0].length), " \t");
	}
	if (heading) {
		doc.title = heading;
	}

	// The frontmatter wins over the H1 for `id` and `title`.
	const comment =
		frontmatterText === null ? null : extractComment(frontmatterText);
	Object.assign(doc, commonFrontmatter(front, comment));
	for (const key of EXAM_PASSTHROUGH_KEYS) {
		if (Object.hasOwn(front, key)) doc[key] = front[key];
	}
	if (Object.hasOwn(front, "start")) {
		doc.start = canonicalOrAsWritten(canonicalStart, front.start);
	}
	if (Object.hasOwn(front, "duration")) {
		doc.duration = canonicalOrAsWritten(canonicalDuration, front.duration);
	}

	const [instructions, blocks, glued, malformed] = splitExamBlocks(
		lines.slice(titleIndex + 1),
	);
	if (instructions !== undefined) {
		doc.instructions = instructions;
	}
	if (warnings !== undefined) {
		for (const [path, lineNumber] of malformed) {
			warnings.push(
				diagnostic(
					"warning",
					"malformed-separator",
					`line ${titleIndex + 1 + lineNumber}: a line of '=' that is ` +
						"not exactly '===' at column 0 is text, not a separator",
					path,
				),
			);
		}
		for (const [blockIndex, field] of glued) {
			if (
				LINTED_SETEXT_FIELDS.includes(String(field[0])) &&
				field.length === 1
			) {
				// The text keeps the underline, so `Exam.lint` reports it.
				continue;
			}
			warnings.push(
				diagnostic(
					"warning",
					"setext-heading",
					"a '---' line right after text is a setext heading, not a " +
						"block boundary; put a blank line before the '---' that " +
						"opens a block",
					["questions", blockIndex, ...field],
				),
			);
		}
	}

	doc.questions = blocks.map((block, index) =>
		parseExamBlock(block, doc, index, warnings),
	);
	return doc;
}

/**
 * The canonical form of a schedule field, or the value as written when it
 * does not parse: the model reports it (`malformed-start`,
 * `invalid-duration`).
 */
function canonicalOrAsWritten(
	canonical: (value: unknown) => string,
	value: unknown,
): unknown {
	try {
		return canonical(value);
	} catch (error) {
		if (error instanceof RangeError) return value;
		throw error;
	}
}

/**
 * Parse and validate an exam document.
 *
 * @throws {ParseError} Everything `parseExamDocument` throws, and
 *   `the parsed document does not satisfy its schema: ...` if the result
 *   does not satisfy `schema/exam.yaml`.
 */
export function parseExam(source: string): Exam {
	const document = parseExamDocument(source);
	const result = validateExam(document);
	if (!result.success) {
		throw new ParseError(
			`the parsed document does not satisfy its schema: ${result.error.message}`,
		);
	}
	return result.data;
}

/** A `[section]` line of a question: `[extra]`, with or without `##`. */
const SECTION_LINE_RE =
	/^ {0,3}(?:##[ \t]+)?\[(?<name>answer-key|extra|accept|reject)\][ \t]*(?:#+[ \t]*)?$/u;

/**
 * The path, inside its question, of the field that holds the `---` line at
 * `lines[index]`, glued to the text line before it.
 *
 * When that text line is a type-specific section heading (`[extra]`,
 * `[accept]`, `[reject]` or `[answer-key]`), the path points at the section;
 * otherwise it is `stem` before the body tag and `epilogue` after it.
 */
function gluedField(
	lines: readonly string[],
	index: number,
	bodySeen: boolean,
	starts: readonly number[],
	codeLines: ReadonlySet<number>,
): PathStep[] {
	if (!bodySeen) return ["stem"];
	const name = SECTION_LINE_RE.exec(rstrip(lines[index - 1] ?? "", " \t"))
		?.groups?.name;
	if (name === undefined) return ["epilogue"];
	if (name === "answer-key") return ["answerKey"];
	if (name === "extra") return ["extra"];
	const first = starts[starts.length - 1] ?? 0;
	let position = 0;
	for (let i = first; i < index - 1; i++) {
		if (codeLines.has(i)) continue;
		const earlier = SECTION_LINE_RE.exec(rstrip(lines[i] ?? "", " \t"));
		if (earlier?.groups?.name === name) position++;
	}
	return [name, position];
}

/**
 * Split the text below the title into the instructions, the question blocks,
 * the glued fences and the malformed separators. A port of
 * `_split_exam_blocks`.
 *
 * The fourth item lists the lines that look like a `===` separator and are
 * not one, as the path of the text they sit in (`["instructions"]` or
 * `["questions", i]`) and the 1-based line number below the title.
 * `parseExamDocument` reports them as `malformed-separator` warnings.
 *
 * The third item maps a block index to the path (inside the question) of the
 * field in which a `---` line sits right after a text line: `stem`,
 * `epilogue`, or the type-specific section the line underlines
 * (`answerKey`, `extra`, `accept`/`reject` and the section index). Such a
 * line is a setext heading underline in CommonMark, not a fence (exam.md,
 * "Questions"), so the block it meant to open was swallowed.
 * `parseExamDocument` reports it as a `setext-heading` warning, except in
 * `stem` and `epilogue`, which `Exam.lint` reports.
 *
 * A block starts at a `===` separator, always, or at a bare `---` fence. A
 * bare `---` opens a new block only when its position allows it:
 *
 * - it is the first fence found; or
 * - only blank lines separate it from the close of the previous bare
 *   fence; or
 * - the current block already showed a body tag or a bracket item since its
 *   own frontmatter closed.
 *
 * A fence right after a `===`, with only blank lines before it, is that
 * block's own frontmatter and not a new start. Before any body tag, a bare
 * `---` is inside the stem, and the parser never reads it as a fence.
 *
 * @throws {ParseError} If a `---` after a question's body opens no block.
 */
function splitExamBlocks(
	lines: readonly string[],
): [
	string | undefined,
	string[][],
	Map<number, PathStep[]>,
	[PathStep[], number][],
] {
	const starts: number[] = [];
	const glued: [number, PathStep[]][] = [];
	const near: number[] = [];
	const codeLines = codeLineIndices(lines);
	let index = 0;
	// Position right after the last accepted block boundary.
	let boundary = 0;
	// Whether that boundary was a `===`.
	let boundaryIsSeparator = false;
	// Whether the current block showed a body tag or bracket item since its
	// own frontmatter closed.
	let bodySeen = false;
	while (index < lines.length) {
		if (codeLines.has(index)) {
			index++;
			continue;
		}
		const line = rstrip(lines[index] ?? "", " \t");
		const stripped = strip(line, " \t");
		const blankBefore =
			index === 0 || strip(lines[index - 1] ?? "", " \t") === "";

		if (
			!bodySeen &&
			(readBodyTag(stripped) !== null || BRACKET_ITEM_RE.test(stripped))
		) {
			bodySeen = true;
		}

		if (
			line !== SEPARATOR &&
			NEAR_SEPARATOR_RE.test(line) &&
			(blankBefore || !SETEXT_UNDERLINE_RE.test(line))
		) {
			near.push(index);
		}

		if (line === SEPARATOR && blankBefore) {
			starts.push(index);
			boundary = index + 1;
			boundaryIsSeparator = true;
			bodySeen = false;
			index++;
			continue;
		}

		if (
			line === "---" &&
			!blankBefore &&
			strip(lines[index - 1] ?? "", " \t") !== ""
		) {
			glued.push([
				index,
				gluedField(lines, index, bodySeen, starts, codeLines),
			]);
		}

		if (line === "---" && blankBefore) {
			const adjacent = lines
				.slice(boundary, index)
				.every((gap) => strip(gap, " \t") === "");
			const isOwnFrontmatter = boundaryIsSeparator && adjacent;
			const isNewStart =
				!isOwnFrontmatter && (starts.length === 0 || adjacent || bodySeen);
			if (isOwnFrontmatter || isNewStart) {
				// Position allows a fence: the next `---` outside a code block
				// closes it, whatever the text between them (a block with
				// broken YAML is still a block; the loader reports it).
				let closing: number | undefined;
				for (let j = index + 1; j < lines.length; j++) {
					if (!codeLines.has(j) && rstrip(lines[j] ?? "", " \t") === "---") {
						closing = j;
						break;
					}
				}
				if (closing !== undefined) {
					if (isNewStart) starts.push(index);
					boundary = closing + 1;
					boundaryIsSeparator = false;
					bodySeen = false;
					index = closing + 1;
					continue;
				}
			}
			if (bodySeen) {
				throw new ParseError(
					`line ${index + 1}: a question's epilogue or section cannot use '---' as a thematic break inside an exam; use '***' or '___'`,
				);
			}
		}

		index++;
	}

	const first = starts[0];
	if (first === undefined) {
		return [
			cleanBlock(lines.join("\n")),
			[],
			new Map(),
			near.map((i): [PathStep[], number] => [["instructions"], i + 1]),
		];
	}
	const instructions = cleanBlock(lines.slice(0, first).join("\n"));
	const bounds = [...starts, lines.length];
	const blockOf = (lineIndex: number): number | undefined => {
		for (let b = 0; b < starts.length; b++) {
			if ((bounds[b] ?? 0) <= lineIndex && lineIndex < (bounds[b + 1] ?? 0)) {
				return b;
			}
		}
		return undefined;
	};
	const blocks = starts.map((start, i) =>
		lines.slice(start, bounds[i + 1] ?? lines.length),
	);
	const gluedByBlock = new Map<number, PathStep[]>();
	for (const [lineIndex, field] of glued) {
		const block = blockOf(lineIndex);
		if (block !== undefined && !gluedByBlock.has(block)) {
			gluedByBlock.set(block, field);
		}
	}
	const malformed = near.map((lineIndex): [PathStep[], number] => {
		const block = blockOf(lineIndex);
		return [
			block === undefined ? ["instructions"] : ["questions", block],
			lineIndex + 1,
		];
	});
	return [instructions, blocks, gluedByBlock, malformed];
}

/** The stripped text, or `undefined` when it is empty. */
function cleanBlock(text: string): string | undefined {
	const stripped = strip(text, " \t\n");
	return stripped === "" ? undefined : stripped;
}

/**
 * Turn one block into an entry of `questions`. A block whose frontmatter has
 * `includeAll` (checked first) or `include` is that mapping with the value
 * as written. Any other block is a question that takes the exam's `locale`
 * and `author` when it has none. `index` is the block's 0-based position,
 * which prefixes the path of its warnings as `["questions", index, ...]`.
 */
function parseExamBlock(
	block: readonly string[],
	exam: RawDocument,
	index: number,
	warnings?: Diagnostic[],
): RawDocument {
	// Drop a leading `===`; what follows is ordinary question source.
	let lines = block;
	const hasSeparator =
		lines.length > 0 && rstrip(lines[0] ?? "", " \t") === SEPARATOR;
	if (hasSeparator) {
		lines = lines.slice(1);
	}
	const source = stripNewlines(lines.join("\n"));
	const [frontmatterText] = splitFrontmatter(`${source}\n`);
	const front = frontmatterText ? loadFrontmatterYaml(frontmatterText) : {};

	const isInclude =
		Object.hasOwn(front, "includeAll") || Object.hasOwn(front, "include");
	if (hasSeparator && isInclude) {
		warnings?.push(
			diagnostic(
				"warning",
				"separator-before-include",
				"an include block needs no '===' separator before it",
				["questions", index],
			),
		);
	}

	// An include entry keeps every key of its frontmatter, unconverted: an
	// extra field is a model error (`unknown-include-field`), and the schema
	// checks the value.
	if (isInclude) {
		return { ...front };
	}

	// A key that only misspells `include`/`includeAll` leaves the block an
	// inline question; the diagnostic it produces gets the same hint as the
	// YAML/JSON path.
	const hint = includeKeyHint(front);
	const blockWarnings: Diagnostic[] | undefined =
		warnings === undefined ? undefined : [];
	let question: RawDocument;
	try {
		question = parseQuestionDocument(source, blockWarnings);
	} catch (error) {
		if (error instanceof MissingFieldError && hint) {
			throw new MissingFieldError(error.field, error.message + hint);
		}
		throw error;
	}
	if (warnings !== undefined && blockWarnings !== undefined) {
		const misspelled = misspelledIncludeKey(front);
		for (const w of blockWarnings) {
			const hinted =
				misspelled !== undefined &&
				w.code === "invalid-frontmatter-field" &&
				w.path.length === 1 &&
				w.path[0] === misspelled[0]
					? { ...w, message: w.message + hint }
					: w;
			warnings.push(prefixPath(hinted, ["questions", index]));
		}
	}
	inherit(question, exam);
	return question;
}

/** A question takes the exam's locale and author when it names none. */
export function inherit(question: RawDocument, exam: RawDocument): void {
	for (const field of INHERITED_FIELDS) {
		if (!Object.hasOwn(question, field) && Object.hasOwn(exam, field)) {
			question[field] = exam[field];
		}
	}
}

/** Python's `strip("\n")`: remove only leading and trailing newlines. */
function stripNewlines(text: string): string {
	return text.replace(/^\n+|\n+$/gu, "");
}

/**
 * Report whether the lines between a candidate `---` pair parse as a YAML
 * mapping, or nothing at all (an empty frontmatter block). A port of
 * `_looks_like_frontmatter`.
 *
 * A cheap secondary guard only: it keeps a positionally eligible candidate
 * from being treated as frontmatter when its enclosed text plainly is not
 * YAML. Like PyYAML's loader, `json: true` keeps the last of two equal keys,
 * so a block that repeats a key still counts as frontmatter here; loading it
 * with `loadFrontmatterYaml` then reports the repeated key.
 */
export function looksLikeFrontmatter(lines: readonly string[]): boolean {
	try {
		const loaded = load(lines.join("\n"), { json: true });
		return (
			loaded === null ||
			loaded === undefined ||
			(typeof loaded === "object" && !Array.isArray(loaded))
		);
	} catch {
		return false;
	}
}
