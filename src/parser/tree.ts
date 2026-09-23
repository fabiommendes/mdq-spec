/**
 * A tree adapter over markdown-it's flat token stream.
 *
 * `mdq-py/mdq/parser.py` walks `markdown_it.tree.SyntaxTreeNode`, a block
 * tree markdown-it-py builds for you. The JS `markdown-it` exposes only the
 * flat `Token[]` its block parser produces, with `nesting`/`level` marking
 * where a container opens and closes. This module folds that flat stream
 * back into the small tree shape the rest of the parser needs -- just
 * enough to mirror what `SyntaxTreeNode` gives the Python side: a node's
 * type, its source line range, and its children.
 *
 * Kept dumb on purpose: no MDQ-specific knowledge lives here, only the
 * generic open/close folding every markdown-it token stream shares.
 */

import type Token from "markdown-it/lib/token.mjs";

/**
 * One block (or inline) node in the folded tree.
 *
 * Mirrors the handful of `SyntaxTreeNode` properties the parser actually
 * reads: `type` (with `_open`/`_close` suffixes stripped), `tag` (e.g.
 * `h1`/`h2` for a heading), `map` (the `[startLine, endLine)` source range),
 * `children`, and `content`/`info` for the self-closing tokens (`fence`,
 * `inline`, `code_block`, `hr`) that carry their own text instead of
 * children.
 */
export interface Node {
	readonly type: string;
	readonly tag: string | undefined;
	readonly map: readonly [number, number] | null;
	readonly children: readonly Node[];
	readonly content: string | undefined;
	readonly info: string | undefined;
}

/**
 * Fold a flat markdown-it token stream into its top-level block nodes.
 *
 * Equivalent to `list(SyntaxTreeNode(tokens).children)` on the Python side:
 * an implicit root wraps `tokens`, and this returns that root's direct
 * children, each with its own subtree folded the same way.
 */
export function buildTree(tokens: readonly Token[]): Node[] {
	const root: MutableNode = {
		type: "root",
		tag: undefined,
		map: null,
		children: [],
		content: undefined,
		info: undefined,
	};
	const stack: MutableNode[] = [root];

	for (const token of tokens) {
		const parent = stack[stack.length - 1];
		if (parent === undefined) {
			// Unreachable: `root` is never popped, so the stack is never empty.
			throw new Error("tree builder stack underflow");
		}

		if (token.nesting === 1) {
			const node: MutableNode = {
				type: stripSuffix(token.type, "_open"),
				tag: token.tag || undefined,
				map: token.map,
				children: [],
				content: undefined,
				info: token.info || undefined,
			};
			parent.children.push(node);
			stack.push(node);
		} else if (token.nesting === -1) {
			if (stack.length > 1) {
				stack.pop();
			}
		} else {
			const node: MutableNode = {
				type: token.type,
				tag: token.tag || undefined,
				map: token.map,
				children: [],
				content: token.content || undefined,
				info: token.info || undefined,
			};
			parent.children.push(node);
		}
	}

	return root.children;
}

type MutableNode = {
	type: string;
	tag: string | undefined;
	map: readonly [number, number] | null;
	children: MutableNode[];
	content: string | undefined;
	info: string | undefined;
};

function stripSuffix(text: string, suffix: string): string {
	return text.endsWith(suffix) ? text.slice(0, -suffix.length) : text;
}

/**
 * Split `text` into lines the way Python's `str.splitlines()` does: on
 * `\n`, `\r\n` or lone `\r`, with no trailing empty entry for a
 * terminator-ending string and no entry at all for an empty string.
 */
export function splitLines(text: string): string[] {
	if (text === "") {
		return [];
	}
	const lines = text.split(/\r\n|\r|\n/);
	if (
		lines.length > 0 &&
		lines[lines.length - 1] === "" &&
		/[\r\n]$/.test(text)
	) {
		lines.pop();
	}
	return lines;
}
