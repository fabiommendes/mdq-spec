/**
 * `docs/handoffs/03-parser-essay.md`, batch 2, criterion 4: the
 * `markdown-it` instance the parser builds its block tree from must enable
 * the same core/block/inline rules and the same options as Python's
 * `MarkdownIt("gfm-like")` (`mdq-py/mdq/_markdown.py`). Essay bodies are
 * the first ones to hold constructs CommonMark itself has opinions about
 * (fenced code, images, links, thematic breaks), so a dialect mismatch
 * here would show up as a silent divergence in essay parsing rather than a
 * clean error.
 *
 * The expected lists below are the reference's own rulers, read directly
 * with markdown-it-py's `Ruler.get_active_rules()`. Regenerate with:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._markdown import md
 *   print('core:', md.core.ruler.get_active_rules())
 *   print('block:', md.block.ruler.get_active_rules())
 *   print('inline:', md.inline.ruler.get_active_rules())
 *   print('inline2:', md.inline.ruler2.get_active_rules())
 *   print('options:', dict(md.options))
 *   "
 *
 * `reference` is already excluded from `block` above -- `_markdown.py`
 * disables it the same way `src/parser/markdown.ts` does, for the same
 * reason (MDQ's own tags read as CommonMark link reference definitions
 * otherwise).
 */

import { md } from "@mdq/parser/markdown";
import { describe, expect, it } from "vitest";

/**
 * markdown-it (JS) keeps each rule's name and enabled flag in the ruler's
 * `__rules__` array -- there is no public accessor for the name list, only
 * `getRules()`, which returns the rule functions themselves. The trailing
 * underscores are the package's own naming, not an interface this test
 * invents.
 */
interface InternalRuler {
	__rules__: ReadonlyArray<{
		readonly name: string;
		readonly enabled: boolean;
	}>;
}

function activeRuleNames(ruler: unknown): string[] {
	return (ruler as InternalRuler).__rules__
		.filter((rule) => rule.enabled)
		.map((rule) => rule.name);
}

// mdq-py/mdq/_markdown.py: MarkdownIt("gfm-like"), reference disabled.
const PYTHON_CORE_RULES = [
	"normalize",
	"block",
	"inline",
	"linkify",
	"text_join",
];
const PYTHON_BLOCK_RULES = [
	"table",
	"code",
	"fence",
	"blockquote",
	"hr",
	"list",
	"html_block",
	"heading",
	"lheading",
	"paragraph",
];
const PYTHON_INLINE_RULES = [
	"text",
	"linkify",
	"newline",
	"escape",
	"backticks",
	"strikethrough",
	"emphasis",
	"link",
	"image",
	"autolink",
	"html_inline",
	"entity",
];
const PYTHON_INLINE2_RULES = [
	"balance_pairs",
	"strikethrough",
	"emphasis",
	"fragments_join",
];

const PYTHON_OPTIONS = {
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

describe("markdown-it dialect matches mdq-py's gfm-like preset", () => {
	it("enables the same core rules", () => {
		expect(activeRuleNames(md.core.ruler)).toEqual(PYTHON_CORE_RULES);
	});

	it("enables the same block rules", () => {
		expect(activeRuleNames(md.block.ruler)).toEqual(PYTHON_BLOCK_RULES);
	});

	it("enables the same inline rules", () => {
		expect(activeRuleNames(md.inline.ruler)).toEqual(PYTHON_INLINE_RULES);
	});

	it("enables the same inline post-processing (ruler2) rules", () => {
		expect(activeRuleNames(md.inline.ruler2)).toEqual(PYTHON_INLINE2_RULES);
	});

	it("uses the same options", () => {
		expect(md.options).toEqual(PYTHON_OPTIONS);
	});
});
