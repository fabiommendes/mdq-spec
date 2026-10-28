/**
 * Markdown to HTML for display, with an instance of its own.
 *
 * The parser's instance (`../markdown.ts`) mirrors mdq-py's options for
 * reading documents. This one is for showing text to a student, and it keeps
 * `html: false` explicit: question text is written by an instructor and
 * rendered into the consumer's origin, so raw HTML in it would run with every
 * reader's session.
 */

import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

/** Render a Markdown string as a block of HTML. */
export function renderMarkdown(text: string): string {
	return md.render(text);
}

/** Render a Markdown string as one inline fragment, with no wrapping `<p>`. */
export function renderMarkdownInline(text: string): string {
	return md.renderInline(text);
}

/** A Markdown token, as `parseMarkdown` returns it. */
export type MarkdownToken = ReturnType<MarkdownIt["parse"]>[number];

/** Parse a Markdown string into its tokens, for a component that renders parts of it itself. */
export function parseMarkdown(text: string): MarkdownToken[] {
	return md.parse(text, {});
}

/** Render block tokens as HTML. */
export function renderTokens(tokens: MarkdownToken[]): string {
	return md.renderer.render(tokens, md.options, {});
}

/** Render inline tokens as HTML. */
export function renderInlineTokens(tokens: MarkdownToken[]): string {
	return md.renderer.renderInline(tokens, md.options, {});
}

/**
 * The text of an inline Markdown string without its markup, for an
 * accessible name: `*Shrubs*` gives `Shrubs`, `` `x` `` gives `x`. An image
 * gives its alt text.
 */
export function plainInline(text: string): string {
	const env = {};
	const [inline] = md.parseInline(text, env);
	return collectText(inline?.children ?? []);
}

function collectText(tokens: MarkdownToken[]): string {
	let text = "";
	for (const token of tokens) {
		if (token.type === "text" || token.type === "code_inline") {
			text += token.content;
		} else if (token.type === "softbreak" || token.type === "hardbreak") {
			text += " ";
		} else if (token.type === "image") {
			text += collectText(token.children ?? []);
		}
	}
	return text;
}
