/**
 * Splitting MDQ source into its optional YAML frontmatter and the body that
 * follows, and reading the frontmatter's own two special pieces: the leading
 * `#`-comment block and the YAML mapping itself.
 *
 * A port of the frontmatter helpers in `mdq-py/mdq/parser.py`
 * (`_split_frontmatter`, `_extract_comment`, `_load_frontmatter_yaml`).
 */

import { load } from "js-yaml";
import { splitLines } from "./tree.js";

/**
 * Split `source` into its raw frontmatter body and the document text that
 * follows it.
 *
 * Returns `[null, source]` unchanged when `source` carries no frontmatter
 * block at all -- including when a leading `---` is never closed, which is
 * treated as ordinary document text rather than silently swallowed.
 */
export function splitFrontmatter(source: string): [string | null, string] {
	if (!source.startsWith("---")) {
		return [null, source];
	}

	const lines = source === "" ? [] : source.split(/(?<=\n)/);
	const first = lines[0];
	if (first === undefined || stripEol(first) !== "---") {
		return [null, source];
	}

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (line !== undefined && stripEol(line) === "---") {
			const frontmatter = lines.slice(1, i).join("");
			const rest = lines.slice(i + 1).join("");
			return [frontmatter, rest];
		}
	}

	return [null, source];
}

function stripEol(line: string): string {
	return line.replace(/\r?\n$/, "");
}

/**
 * Pull out the leading `#`-comment block from a frontmatter body, per the
 * `comment_string` rule in `docs/question-types/generic.md`. A blank line
 * (with no leading `#`) breaks it; blank lines before the first `#` line are
 * skipped.
 *
 * Returns `undefined` when the frontmatter opens with no comment at all.
 */
export function extractComment(frontmatterText: string): string | undefined {
	const lines = splitLines(frontmatterText);

	let i = 0;
	while (i < lines.length && (lines[i] ?? "").trim() === "") {
		i++;
	}

	const commentLines: string[] = [];
	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined || !line.startsWith("#")) {
			break;
		}
		let content = line.slice(1);
		if (content.startsWith(" ")) {
			content = content.slice(1);
		}
		commentLines.push(content);
		i++;
	}

	return commentLines.length > 0 ? commentLines.join(" ") : undefined;
}

/**
 * Parse a frontmatter body as YAML, returning an empty mapping for
 * anything that does not parse to a mapping (an empty document, a scalar,
 * a list, ...).
 */
export function loadFrontmatterYaml(text: string): Record<string, unknown> {
	const data: unknown = load(text);
	return isPlainRecord(data) ? data : {};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `generic.md`: `tags` is a list, or a single comma-delimited string that is
 * split into one. Elements of an already-list value pass through
 * unchanged, exactly as `mdq-py`'s `_normalize_tags` does -- coercing them
 * is the schema's job, not the parser's.
 */
export function normalizeTags(tags: unknown): unknown[] {
	if (typeof tags === "string") {
		return tags
			.split(",")
			.map((part) => part.trim())
			.filter((part) => part !== "");
	}
	return Array.isArray(tags) ? tags : [];
}
