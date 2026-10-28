/**
 * The stem of a fill-in question, split for rendering.
 *
 * `docs/question-types/fill-in.md` ("Where blanks may appear") says a parser
 * reads the inline markup of a paragraph first and only then looks for blanks:
 * a `[^slug]` is a blank in the plain text of an ordinary paragraph, and
 * literal text anywhere else (code, links, emphasis, lists, headings). So the
 * stem is parsed as Markdown, and only the plain text of a top-level paragraph
 * is searched. Splitting the source on a regex first, as the codehood view did,
 * turns a `[^slug]` in a code span into a control.
 */

import {
	type MarkdownToken,
	parseMarkdown,
	renderInlineTokens,
	renderTokens,
} from "./render-markdown.js";

/** One piece of a paragraph that holds blanks. */
export type StemPart =
	| { kind: "html"; html: string }
	| { kind: "blank"; id: string };

/** One top-level block of the stem. */
export type StemBlock =
	| { kind: "html"; html: string }
	| { kind: "sentence"; parts: StemPart[] };

// The `BLANK` terminal of the spec: a slug in `[^` and `]`, not followed by
// `(` or `[`, which would make it a link.
const BLANK = /\[\^([a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*)\](?![([])/g;

function withContent(token: MarkdownToken, content: string): MarkdownToken {
	return Object.assign(Object.create(Object.getPrototypeOf(token)), token, {
		content,
	});
}

/**
 * Split one inline token list at the blanks in its plain text. A blank in a
 * list of `known` ids and not seen before becomes a `blank` part; every other
 * `[^slug]` stays in the text, as the spec asks.
 */
function splitInline(
	children: MarkdownToken[],
	known: ReadonlySet<string>,
	seen: Set<string>,
): StemPart[] | undefined {
	const parts: StemPart[] = [];
	let run: MarkdownToken[] = [];
	let found = false;
	let depth = 0;

	const flush = () => {
		if (run.length > 0) {
			parts.push({ kind: "html", html: renderInlineTokens(run) });
			run = [];
		}
	};

	children.forEach((child, index) => {
		if (child.type !== "text" || depth > 0) {
			depth += child.nesting;
			run.push(child);
			return;
		}
		let cursor = 0;
		for (const match of child.content.matchAll(BLANK)) {
			const id = match[1] as string;
			const end = match.index + match[0].length;
			// `[^id][text](url)`: the bracket after the blank starts a link
			// that the text token does not hold.
			const next = children[index + 1];
			const linkFollows =
				end === child.content.length &&
				next?.type === "link_open" &&
				next.markup === "";
			if (!known.has(id) || seen.has(id) || linkFollows) continue;
			seen.add(id);
			found = true;
			if (match.index > cursor) {
				run.push(withContent(child, child.content.slice(cursor, match.index)));
			}
			flush();
			parts.push({ kind: "blank", id });
			cursor = end;
		}
		if (cursor < child.content.length) {
			run.push(withContent(child, child.content.slice(cursor)));
		}
	});
	flush();
	return found ? parts : undefined;
}

/**
 * The blocks of `stem`, with the blanks of `blankIds` located. A paragraph
 * with a blank is a `sentence`, so the controls can flow with its text;
 * every other block is HTML.
 */
export function splitStem(
	stem: string,
	blankIds: ReadonlySet<string>,
): StemBlock[] {
	const tokens = parseMarkdown(stem);
	const blocks: StemBlock[] = [];
	const seen = new Set<string>();

	for (let start = 0; start < tokens.length; ) {
		let end = start;
		if ((tokens[start] as MarkdownToken).nesting === 1) {
			while (
				!(
					(tokens[end] as MarkdownToken).level === 0 &&
					(tokens[end] as MarkdownToken).nesting === -1
				)
			) {
				end++;
			}
		}
		const block = tokens.slice(start, end + 1);
		start = end + 1;

		const inline = block[1];
		const parts =
			block[0]?.type === "paragraph_open" && inline?.children
				? splitInline(inline.children, blankIds, seen)
				: undefined;
		blocks.push(
			parts
				? { kind: "sentence", parts }
				: { kind: "html", html: renderTokens(block) },
		);
	}
	return blocks;
}

/** The ids of the blanks that `stem` places, in the order it places them. */
export function placedBlanks(blocks: readonly StemBlock[]): string[] {
	return blocks.flatMap((block) =>
		block.kind === "sentence"
			? block.parts.flatMap((part) => (part.kind === "blank" ? [part.id] : []))
			: [],
	);
}
