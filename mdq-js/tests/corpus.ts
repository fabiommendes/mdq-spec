/**
 * Locations of the example documents the test suite runs against.
 *
 * The examples live at the root of the checkout, in `examples/`, and are
 * shared verbatim with the Python implementation -- they are the
 * language-agnostic suite `docs/sync/README.md` calls for, so a behavior both
 * implementations claim is checked against the same files on both sides.
 *
 * DEVELOPMENT ONLY: these paths resolve relative to the repo root, so they
 * mean nothing in an installed `mdq`. Import this from the test suite, never
 * from library code. Mirrors `mdq/testing.py`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";

export const JS_PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
export const MDQ_ROOT = join(JS_PROJECT_ROOT, "..");
export const EXAMPLES_ROOT = join(MDQ_ROOT, "examples");
export const VALID_DIR = join(EXAMPLES_ROOT, "valid");
export const INVALID_DIR = join(EXAMPLES_ROOT, "invalid");
export const WARNINGS_DIR = join(EXAMPLES_ROOT, "warnings");
export const VALID_EXAMS_DIR = join(VALID_DIR, "exam");

const DOCUMENT_SUFFIXES = [".yaml", ".yml", ".json"];

/**
 * Surface-syntax questions. A question and an exam share this extension and
 * are told apart by their content, not by their name.
 */
export const SOURCE_SUFFIX = ".mdq.md";

function walk(root: string): string[] {
	let found: string[] = [];
	for (const entry of readdirSync(root)) {
		const path = join(root, entry);
		if (statSync(path).isDirectory()) {
			found = found.concat(walk(path));
		} else {
			found.push(path);
		}
	}
	return found.sort();
}

/** Every parsed document (`.yaml`/`.json`) under `root`. */
export function collectFiles(root: string): string[] {
	return walk(root).filter((path) =>
		DOCUMENT_SUFFIXES.some((suffix) => path.toLowerCase().endsWith(suffix)),
	);
}

/** Every surface-syntax source (`.mdq.md`) under `root`. */
export function collectSources(root: string): string[] {
	return walk(root).filter((path) => path.endsWith(SOURCE_SUFFIX));
}

/** A short, stable test name for an example path. */
export function relativeId(path: string): string {
	return relative(EXAMPLES_ROOT, path).split(sep).slice(1).join(".");
}

/** The `.yaml` a source document is expected to parse into. */
export function parsedSibling(source: string): string {
	return `${source.slice(0, -SOURCE_SUFFIX.length)}.yaml`;
}

/** Load a parsed document from disk. */
export function loadDocument(path: string): unknown {
	return load(readFileSync(path, "utf-8"));
}

export const VALID_PARSED = collectFiles(VALID_DIR);
export const INVALID_PARSED = collectFiles(INVALID_DIR);
export const WARNING_PARSED = collectFiles(WARNINGS_DIR);
export const VALID_SOURCES = collectSources(VALID_DIR);
export const VALID_EXAMS = VALID_PARSED.filter((path) =>
	path.startsWith(VALID_EXAMS_DIR + sep),
);
export const VALID_QUESTIONS = VALID_PARSED.filter(
	(path) => !path.startsWith(VALID_EXAMS_DIR + sep),
);
