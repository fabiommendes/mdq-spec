/**
 * Which files are MDQ documents, and in which format `load` reads them.
 *
 * A document is MDQ when one of these holds, in this order:
 *
 * 1. Its language is `mdq`. The user picks it with "Change Language Mode", or
 *    for a set of files with `files.associations`.
 * 2. Its name ends in `.mdq`, `.mdq.md`, `.mdq.yaml`, `.mdq.yml` or
 *    `.mdq.json`.
 * 3. It is a Markdown document and the setting `mdq.files` holds a glob that
 *    matches it. The document stays Markdown for the editor.
 * 4. It is a Markdown document whose frontmatter declares an MDQ `type`: a
 *    question type or `exam`. Only the frontmatter is read, not the body, so
 *    a question that takes its type from the body is not found this way.
 */

import { QUESTION_TYPES } from "@mdq-format/core";

/** The format `load` reads a document in. */
export type Format = "mdq" | "yaml" | "json";

/** The language the extension contributes, for MDQ Markdown. */
export const MDQ_LANGUAGE = "mdq";

const SUFFIXES: readonly (readonly [string, Format])[] = [
	[".mdq", "mdq"],
	[".mdq.md", "mdq"],
	[".mdq.yaml", "yaml"],
	[".mdq.yml", "yaml"],
	[".mdq.json", "json"],
];

/** The values of `type` that make a Markdown document MDQ. */
const MDQ_TYPES: ReadonlySet<string> = new Set([...QUESTION_TYPES, "exam"]);

/** Stop looking for the end of a frontmatter after this many lines. */
const MAX_FRONTMATTER_LINES = 200;

/** What `mdqFormat` reads of a document: a subset of `TextDocument`. */
export interface DocumentInfo {
	readonly fileName: string;
	readonly languageId: string;
	getText(): string;
}

/**
 * The format of `document`, or `undefined` if it is not MDQ.
 *
 * @param inFiles Whether a glob of `mdq.files` matches the document.
 */
export function mdqFormat(
	document: DocumentInfo,
	inFiles = false,
): Format | undefined {
	if (document.languageId === MDQ_LANGUAGE) return "mdq";
	const name = document.fileName.toLowerCase();
	const bySuffix = SUFFIXES.find(([suffix]) => name.endsWith(suffix))?.[1];
	if (bySuffix !== undefined) return bySuffix;
	if (document.languageId !== "markdown") return undefined;
	if (inFiles) return "mdq";
	const type = frontmatterType(document.getText());
	return type !== undefined && MDQ_TYPES.has(type) ? "mdq" : undefined;
}

const TYPE_LINE = /^type:[ \t]*(["']?)([A-Za-z-]+)\1[ \t]*(#.*)?$/;

/**
 * The value of the top-level `type` key of the frontmatter of `text`, read
 * line by line without a YAML parser. `undefined` when the text has no
 * frontmatter or the frontmatter has no such line.
 */
export function frontmatterType(text: string): string | undefined {
	const lines = text.replace(/^﻿/, "").split(/\r?\n/, MAX_FRONTMATTER_LINES);
	if (lines[0]?.trimEnd() !== "---") return undefined;
	for (const line of lines.slice(1)) {
		if (line.trimEnd() === "---") return undefined;
		const match = TYPE_LINE.exec(line);
		if (match !== null) return match[2];
	}
	return undefined;
}
