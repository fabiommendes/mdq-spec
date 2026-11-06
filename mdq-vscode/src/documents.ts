/**
 * Which files are MDQ documents, and in which format `load` reads them.
 *
 * A file is recognized by its extension: `*.mdq`, `*.mdq.md`, `*.mdq.yaml`,
 * `*.mdq.yml` and `*.mdq.json`. A document in the `mdq` language is MDQ
 * Markdown whatever its name: the user picks the language with "Change
 * Language Mode", or for a set of files with `files.associations`.
 */

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

/** What `mdqFormat` reads of a document: a subset of `TextDocument`. */
export interface DocumentInfo {
	readonly fileName: string;
	readonly languageId: string;
}

/** The format of `document`, or `undefined` if it is not MDQ. */
export function mdqFormat(document: DocumentInfo): Format | undefined {
	if (document.languageId === MDQ_LANGUAGE) return "mdq";
	const name = document.fileName.toLowerCase();
	return SUFFIXES.find(([suffix]) => name.endsWith(suffix))?.[1];
}
