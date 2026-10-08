/**
 * Exam documents: the H1 title, the instructions, and the `===`/`---` blocks
 * that become the entries of `questions`.
 *
 * A port of `mdq-py/mdq/_parser/_exam.py`. The parser never resolves an
 * `include` or `include-all` block: it keeps it as the entry the block's
 * frontmatter writes. `resolveExam` in `src/banks.ts` replaces them.
 */

import { load } from "js-yaml";
import { MissingFieldError, ParseError } from "../errors.js";
import type { Exam } from "../schema/exam.js";
import { validateExam } from "../validate.js";
import { BRACKET_ITEM_RE, SLUG_PREFIX_RE } from "./choices.js";
import {
	loadFrontmatterYaml,
	normalizeTags,
	splitFrontmatter,
} from "./frontmatter.js";
import { md } from "./markdown.js";
import {
	matchesTag,
	parseQuestionDocument,
	type RawDocument,
} from "./question.js";
import { rstrip, strip } from "./text.js";
import { splitLines } from "./tree.js";

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

/** `# Title` or `# [slug] Title`; `rest` is the text after the marker. */
const H1_RE = /^#[ \t]+(?<rest>[^\n]*?)[ \t]*$/u;

/**
 * Simple frontmatter fields copied into the exam document as they are. The
 * frontmatter wins over the H1 for `id` and `title`.
 */
const EXAM_PASSTHROUGH_KEYS = [
	"id",
	"title",
	"uuid",
	"course",
	"description",
	"author",
	"locale",
	"meta",
	"penalty",
	"grading",
] as const;

/**
 * Whether the source is an exam rather than a single question.
 *
 * An exam is recognized by its H1 title, which a question document can
 * never carry -- a question's own title is an H2. A line inside a code block
 * is literal text and never counts.
 */
export function isExam(source: string): boolean {
	const [, body] = splitFrontmatter(source);
	const lines = splitLines(body);
	const codeLines = codeLineIndices(lines);
	return lines.some((line, i) => !codeLines.has(i) && H1_RE.test(line));
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
 * `include` and `include-all` blocks stay as `{include: id}` and
 * `{"include-all": query, max?}` entries, with every key of the block's
 * frontmatter. An inline question block is parsed with
 * `parseQuestionDocument` and takes `locale` and `author` from the exam.
 * A block with no declared `id` gets none. Lines inside a fenced or indented
 * code block are never structure (title, `===`, `---`, body tag).
 *
 * @throws {MissingFieldError} If no line outside a code block is an H1
 *   (`field` is `"title"`).
 * @throws {ParseError} If `start` or `duration` in the frontmatter is not
 *   valid (`exam start: ...`, `exam duration: ...`), if a question's
 *   epilogue uses `---` as a thematic break, or if a question block is not
 *   valid MDQ.
 */
export function parseExamDocument(source: string): RawDocument {
	const [frontmatterText, body] = splitFrontmatter(source);
	const front =
		frontmatterText === null ? {} : loadFrontmatterYaml(frontmatterText);

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
	for (const key of EXAM_PASSTHROUGH_KEYS) {
		// Values keep their YAML type; a null `id` counts as absent.
		if (Object.hasOwn(front, key) && !(key === "id" && front[key] === null)) {
			doc[key] = front[key];
		}
	}
	if (Object.hasOwn(front, "tags")) {
		doc.tags = normalizeTags(front.tags);
	}

	const [instructions, blocks] = splitExamBlocks(lines.slice(titleIndex + 1));
	if (instructions !== undefined) {
		doc.instructions = instructions;
	}

	doc.questions = blocks.map((block) => parseExamBlock(block, doc));
	return doc;
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

/**
 * Split the text below the title into the instructions and the question
 * blocks. A port of `_split_exam_blocks`.
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
): [string | undefined, string[][]] {
	const starts: number[] = [];
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
			(matchesTag(stripped) !== undefined || BRACKET_ITEM_RE.test(stripped))
		) {
			bodySeen = true;
		}

		if (line === SEPARATOR && blankBefore) {
			starts.push(index);
			boundary = index + 1;
			boundaryIsSeparator = true;
			bodySeen = false;
			index++;
			continue;
		}

		if (line === "---" && blankBefore) {
			const adjacent = lines
				.slice(boundary, index)
				.every((gap) => strip(gap, " \t") === "");
			const isOwnFrontmatter = boundaryIsSeparator && adjacent;
			const isNewStart =
				!isOwnFrontmatter && (starts.length === 0 || adjacent || bodySeen);
			if (isOwnFrontmatter || isNewStart) {
				// Position allows a fence. Its text must also load as a YAML
				// mapping (or nothing) before the parser commits to it.
				let closing: number | undefined;
				for (let j = index + 1; j < lines.length; j++) {
					if (
						!codeLines.has(j) &&
						rstrip(lines[j] ?? "", " \t") === "---" &&
						looksLikeFrontmatter(lines.slice(index + 1, j))
					) {
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
					`line ${index + 1}: a question's epilogue cannot use '---' as a thematic break inside an exam; use '***' or '___'`,
				);
			}
		}

		index++;
	}

	const first = starts[0];
	if (first === undefined) {
		return [cleanBlock(lines.join("\n")), []];
	}
	const instructions = cleanBlock(lines.slice(0, first).join("\n"));
	const bounds = [...starts, lines.length];
	const blocks = starts.map((start, i) =>
		lines.slice(start, bounds[i + 1] ?? lines.length),
	);
	return [instructions, blocks];
}

/**
 * Whether the lines between a candidate `---` pair load as a YAML mapping,
 * or as nothing (an empty frontmatter block). Any YAML error means no.
 */
function looksLikeFrontmatter(lines: readonly string[]): boolean {
	let loaded: unknown;
	try {
		loaded = load(lines.join("\n"));
	} catch {
		return false;
	}
	return (
		loaded === undefined ||
		loaded === null ||
		(typeof loaded === "object" && !Array.isArray(loaded))
	);
}

/** The stripped text, or `undefined` when it is empty. */
function cleanBlock(text: string): string | undefined {
	const stripped = strip(text, " \t\n");
	return stripped === "" ? undefined : stripped;
}

/**
 * Turn one block into an entry of `questions`. A block whose frontmatter has
 * `include-all` (checked first) or `include` is that mapping with the value
 * as a string. Any other block is a question that takes the exam's
 * `locale` and `author` when it has none.
 */
function parseExamBlock(
	block: readonly string[],
	exam: RawDocument,
): RawDocument {
	// Drop a leading `===`; what follows is ordinary question source.
	let lines = block;
	if (lines.length > 0 && rstrip(lines[0] ?? "", " \t") === SEPARATOR) {
		lines = lines.slice(1);
	}
	const source = stripNewlines(lines.join("\n"));
	const [frontmatterText] = splitFrontmatter(`${source}\n`);
	const front = frontmatterText ? loadFrontmatterYaml(frontmatterText) : {};

	// An include entry keeps its values unconverted; the schema checks them.
	if (Object.hasOwn(front, "include-all") || Object.hasOwn(front, "include")) {
		return { ...front };
	}

	const question = parseQuestionDocument(source);
	for (const field of INHERITED_FIELDS) {
		if (!Object.hasOwn(question, field) && Object.hasOwn(exam, field)) {
			question[field] = exam[field];
		}
	}
	return question;
}

/** Python's `strip("\n")`: remove only leading and trailing newlines. */
function stripNewlines(text: string): string {
	return text.replace(/^\n+|\n+$/gu, "");
}
