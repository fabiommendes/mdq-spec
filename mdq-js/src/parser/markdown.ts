/**
 * The one `markdown-it` instance every MDQ document is parsed with.
 *
 * Mirrors `mdq-py/mdq/_markdown.py`: `md = MarkdownIt("gfm-like")`.
 * markdown-it-py's `gfm-like` preset (`markdown_it.presets.gfm_like.make`)
 * is CommonMark plus GFM tables, strikethrough and linkify -- which, on
 * this library's own rule catalog (there is no rule beyond this set to add
 * for either language), enables every block and every inline rule
 * (`rules` and `rules2`) markdown-it ships. The JS `"default"` preset
 * already enables that same full catalog with no restriction of its own
 * (unlike Python's `"default"`/`"commonmark"`, which deliberately hold
 * `table`/`strikethrough` back), so no per-rule `.enable()` call is needed
 * to reach it -- only the two rules Python's preset leaves out.
 *
 * `replacements`/`smartquotes` (`typographer`'s core rules) are inert
 * either way since `typographer` is `false`, but Python's preset never
 * enables them in the first place, so they are disabled here too, to
 * match which rules are *active*, not just which are no-ops.
 *
 * `reference` is disabled for a different reason -- MDQ's own tags
 * (`[short-answer]: ...`, `[numeric]: ...`, `[^blank]: ...`) are
 * syntactically indistinguishable from CommonMark link reference
 * definitions, which are otherwise consumed silently with no token emitted
 * at all. Disabling it lets these lines survive as ordinary paragraphs for
 * the parser to pattern-match. `mdq-py/mdq/_markdown.py` disables it for
 * the same reason.
 */

import MarkdownIt, { type Options } from "markdown-it";

/**
 * `markdown_it.presets.gfm_like.make()["options"]`, read off a running
 * instance (`uv run python -c "from markdown_it import MarkdownIt as M;
 * print(M('gfm-like').options)"`). `maxNesting` is missing from
 * markdown-it JS's own `Options` type even though the option itself exists
 * and is honored the same as in markdown-it-py -- hence the intersection
 * type, so the object literal below can carry it without an excess-property
 * error while still reaching the constructor as a plain object.
 */
const options: Options & { maxNesting: number } = {
	maxNesting: 20,
	html: true,
	linkify: true,
	typographer: false,
	quotes: "“”‘’",
	xhtmlOut: true,
	breaks: false,
	langPrefix: "language-",
	highlight: null,
};

export const md: MarkdownIt = new MarkdownIt("default", options);
md.block.ruler.disable("reference");
md.core.ruler.disable(["replacements", "smartquotes"]);
