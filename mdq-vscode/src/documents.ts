/**
 * Which files are MDQ documents, and in which format `load` reads them.
 *
 * A file is recognized by its double extension: `*.mdq.md`, `*.mdq.yaml`,
 * `*.mdq.yml` and `*.mdq.json`. A plain `.md` file with an MDQ frontmatter is
 * not recognized yet (RFC "Extensão VS Code para MDQ", milestone 2).
 */

/** The format `load` reads a document in. */
export type Format = "mdq" | "yaml" | "json";

const SUFFIXES: readonly (readonly [string, Format])[] = [
	[".mdq.md", "mdq"],
	[".mdq.yaml", "yaml"],
	[".mdq.yml", "yaml"],
	[".mdq.json", "json"],
];

/** The format of the file at `path`, or `undefined` if it is not MDQ. */
export function mdqFormat(path: string): Format | undefined {
	const name = path.toLowerCase();
	return SUFFIXES.find(([suffix]) => name.endsWith(suffix))?.[1];
}
