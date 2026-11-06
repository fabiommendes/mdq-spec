/**
 * Where the parser found each part of a question or exam document.
 *
 * The parser fills a `SourceMap` while it builds the raw document: the
 * frontmatter fields get the exact spans of their YAML nodes (`yamlLocator`)
 * and the parts of the Markdown body get the lines of the blocks they came
 * from. `toLocator` turns the map into the `Locator` that `withSpan` uses to
 * give a position to every diagnostic. See `positions.ts`.
 *
 * Markdown-it knows the lines of a block, not the columns inside it, so a
 * body span covers whole lines.
 *
 * mdq-py has no counterpart: its diagnostics carry no source position.
 */

import type { PathStep } from "../diagnostics.js";
import { type Locator, type Span, yamlLocator } from "../positions.js";

/** The state that a `SourceMap` and its views share. */
interface Store {
	readonly spans: Map<string, Span>;
	readonly locators: Locator[];
}

/**
 * The spans of a document, by path.
 *
 * A map made with `new SourceMap()` is the root. `view` makes a map for a
 * part of the file, such as a question block of an exam: it writes into the
 * same store, with its own path prefix and line offset.
 */
export class SourceMap {
	private constructor(
		private readonly store: Store,
		private readonly prefix: readonly PathStep[],
		private readonly lineOffset: number,
	) {}

	/** An empty map for a whole file. */
	static create(): SourceMap {
		return new SourceMap({ spans: new Map(), locators: [] }, [], 0);
	}

	/**
	 * A map for a part of this one.
	 *
	 * @param prefix The path of the part, put before every path it records.
	 * @param lineOffset The 0-based line of the part's first line, relative to
	 *   the first line of this map.
	 */
	view(prefix: readonly PathStep[], lineOffset: number): SourceMap {
		return new SourceMap(
			this.store,
			[...this.prefix, ...prefix],
			this.lineOffset + lineOffset,
		);
	}

	/** The line of the file for `line`, a 1-based line of this map. */
	fileLine(line: number): number {
		return line + this.lineOffset;
	}

	/**
	 * Record the frontmatter fields, with their exact spans.
	 *
	 * @param text The YAML text between the `---` lines.
	 * @param firstLine The 0-based line of its first line, relative to the
	 *   first line of this map.
	 */
	addFrontmatter(text: string, firstLine: number): void {
		const locate = yamlLocator(text, this.lineOffset + firstLine);
		const { prefix } = this;
		this.store.locators.push((path) =>
			startsWith(path, prefix) ? locate(path.slice(prefix.length)) : undefined,
		);
	}

	/**
	 * Record the whole lines `start` to `end` of `path`, 0-based and end
	 * exclusive, like the `map` of a markdown-it block. A path recorded twice
	 * covers both ranges.
	 */
	markLines(path: readonly PathStep[], start: number, end: number): void {
		const key = JSON.stringify([...this.prefix, ...path]);
		const first = start + this.lineOffset + 1;
		const last = Math.max(end, start + 1) + this.lineOffset;
		const known = this.store.spans.get(key);
		this.store.spans.set(key, {
			line: Math.min(first, known?.line ?? first),
			endLine: Math.max(last, known?.endLine ?? last),
		});
	}

	/**
	 * The locator of the map: the frontmatter fields first, then the recorded
	 * lines. A field of the frontmatter wins because a key written there
	 * replaces what the body says.
	 */
	toLocator(): Locator {
		return (path) => {
			for (const locate of this.store.locators) {
				const span = locate(path);
				if (span !== undefined) return span;
			}
			return this.store.spans.get(JSON.stringify(path));
		};
	}
}

function startsWith(
	path: readonly PathStep[],
	prefix: readonly PathStep[],
): boolean {
	return prefix.every((step, i) => path[i] === step);
}
