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
