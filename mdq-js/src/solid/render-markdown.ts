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

/**
 * Renders a fenced code block as HTML, or returns `undefined` to keep the
 * default `<pre><code>`. `lang` is the first word of the info string, empty
 * when there is none. The result goes into the page as is, so it must be
 * trusted HTML, such as a syntax highlighter's output.
 */
export type CodeBlockRenderer = (
	code: string,
	lang: string,
) => string | undefined;

/** Options of one render. */
export interface MarkdownRenderOptions {
	/** Replaces the HTML of fenced code blocks. */
	renderCodeBlock?: CodeBlockRenderer;
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: true });

const defaultFence = md.renderer.rules.fence;
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
	const token = tokens[idx];
	const render = (env as MarkdownRenderOptions | undefined)?.renderCodeBlock;
	if (token && render) {
		const lang = md.utils.unescapeAll(token.info).trim().split(/\s+/)[0] ?? "";
		const html = render(token.content, lang);
		if (html !== undefined) return html;
	}
	return defaultFence
		? defaultFence(tokens, idx, options, env, self)
		: self.renderToken(tokens, idx, options);
};

/** Render a Markdown string as a block of HTML. */
export function renderMarkdown(
	text: string,
	options: MarkdownRenderOptions = {},
): string {
	return md.render(text, { ...options });
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
export function renderTokens(
	tokens: MarkdownToken[],
	options: MarkdownRenderOptions = {},
): string {
	return md.renderer.render(tokens, md.options, { ...options });
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
