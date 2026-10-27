/**
 * Tests for the `[short-answer]` body, its `[short-answer/accept]` and
 * `[short-answer/reject]` blocks, and the frontmatter pattern lists
 * (`accept`, `reject`, `preAccept`, `preReject`) -- `docs/handoffs/05-parser-
 * short-answer.md`, updated to the audit (dev/audit/plan.md, S1 and G10):
 * every block writes `accept`/`reject`, in any order and at most once each,
 * and there is no `oneOf`, `regex` or `openEnded`.
 *
 * Criterion 1 (every `examples/valid/short-answer/*.mdq.md` and
 * `exam/bank/amazonia-01` parses to its `.yaml`) is covered by the corpus
 * loop in `tests/parser.spec.ts`; this file does not duplicate it.
 *
 * Every expected value here comes from running the reference directly, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._parser._question import parse_question
 *   print(parse_question('What is the capital of Brazil?\n\n[short-answer]: Brasilia\n'))
 *   "
 *
 * Reference: `mdq-py/mdq/_parser/_question.py` -- `parse_short_answer_body`,
 * `parse_answer_block`, `_pattern_entry`, `SHORT_ANSWER_RE`;
 * `mdq-py/mdq/_parser/_frontmatter.py` -- `_copy_pattern_lists`.
 */

import { ParseError, parseQuestionDocument } from "@mdq";
import { describe, expect, it } from "vitest";

describe("short-answer: the tag spellings", () => {
	it("an inline pattern on the tag line is the one accept entry", () => {
		expect(
			parseQuestionDocument("Capital?\n\n[short-answer]: Brasilia\n"),
		).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["Brasilia"],
		});
	});

	it("a regex on the tag line keeps its delimiters", () => {
		expect(
			parseQuestionDocument("Capital?\n\n[short-answer]: /Bras[ií]lia/i\n"),
		).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["/Bras[ií]lia/i"],
		});
	});

	it("[short-answer/accept] is an alias of [short-answer]", () => {
		expect(
			parseQuestionDocument("Capital?\n\n[short-answer/accept]: Brasilia\n"),
		).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["Brasilia"],
		});
	});

	it("a list right after the tag gives the patterns in order", () => {
		expect(
			parseQuestionDocument(
				"Capital?\n\n[short-answer]:\n* Brasilia\n* `Brasília`\n* /bras/i\n",
			),
		).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["Brasilia", "`Brasília`", "/bras/i"],
		});
	});

	it("reject then accept, in either order", () => {
		expect(
			parseQuestionDocument(
				"Capital?\n\n[short-answer/reject]:\n* Rio\n\n[short-answer]:\n* Brasilia\n",
			),
		).toEqual({
			stem: "Capital?",
			type: "short-answer",
			reject: ["Rio"],
			accept: ["Brasilia"],
		});
	});

	it("diacritics, unmatched and incorrectFeedback are copied from the frontmatter", () => {
		expect(
			parseQuestionDocument(
				"---\ndiacritics: keep\nunmatched: manual\nincorrectFeedback: Not quite.\n---\n\nCapital?\n\n[short-answer]: Brasília\n",
			),
		).toEqual({
			stem: "Capital?",
			type: "short-answer",
			diacritics: "keep",
			unmatched: "manual",
			incorrectFeedback: "Not quite.",
			accept: ["Brasília"],
		});
	});
});

//
// Frontmatter pattern lists (`accept`, `reject`, `preAccept`, `preReject`)
// are copied onto the document the way `_copy_pattern_lists` does.
//

describe("short-answer: frontmatter pattern lists", () => {
	it("frontmatter-only `preAccept`/`preReject` combine with body accept/reject blocks", () => {
		const source =
			"---\npreAccept:\n  - /\\d+/\npreReject:\n  - pattern: /0/\n" +
			"    feedback: zero is invalid\n---\n\nNumber?\n\n" +
			"[short-answer/accept]:\n* 42\n\n[short-answer/reject]:\n* 41\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Number?",
			type: "short-answer",
			accept: ["42"],
			reject: ["41"],
			preAccept: ["/\\d+/"],
			preReject: [{ pattern: "/0/", feedback: "zero is invalid" }],
		});
	});
});

//
// Every ParseError path of `parse_short_answer_body`
// and `parse_answer_block`.
//

describe("short-answer: error paths", () => {
	it.each([
		[
			"two [short-answer/accept] blocks",
			"Capital?\n\n[short-answer/accept]:\n* Brasilia\n\n[short-answer/accept]:\n* Brasilia\n",
			"repeated [short-answer] accept block",
		],
		[
			"two [short-answer/reject] blocks",
			"Capital?\n\n[short-answer/reject]:\n* Errado\n\n[short-answer/reject]:\n* Errado\n",
			"repeated [short-answer] reject block",
		],
		[
			"two bare [short-answer] blocks",
			"Capital?\n\n[short-answer]: Brasilia\n\n[short-answer]: Brasilia\n",
			"repeated [short-answer] accept block",
		],
		[
			"a bare block after an accept block (the two spellings are one block)",
			"Capital?\n\n[short-answer/accept]:\n* Brasilia\n\n[short-answer]: Brasilia\n",
			"repeated [short-answer] accept block",
		],
		[
			"a pattern on the tag line and a list right after it",
			"Capital?\n\n[short-answer]: Brasilia\n* Rio\n",
			"a [short-answer] tag with a pattern on its line cannot be followed by a list",
		],
		[
			"an empty item in a pattern list",
			"Capital?\n\n[short-answer]:\n* Brasilia\n*\n",
			"a short-answer pattern line cannot be empty",
		],
	])("raises ParseError for %s", (_label, source, message) => {
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
		expect(() => parseQuestionDocument(source)).toThrow(message);
	});
});

//
// A few non-error edge cases the corpus does not cover.
//

describe("short-answer: non-error edge cases the corpus does not cover", () => {
	it("folds an unconsumed [short-answer/accept] block into the epilogue when a prose paragraph precedes it", () => {
		// The run of blocks stops at the first paragraph that is not a tag;
		// the tag further down is epilogue text.
		const source =
			"Capital?\n\n[short-answer]: Brasilia\n\n" +
			"Some prose in between.\n\n[short-answer/accept]:\n* Brasilia\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["Brasilia"],
			epilogue:
				"Some prose in between.\n\n[short-answer/accept]:\n\n* Brasilia",
		});
	});

	it("joins a pattern item's multi-line feedback and comment with single spaces", () => {
		const source =
			"Capital?\n\n[short-answer/accept]:\n* Brasilia\n\n" +
			"[short-answer/reject]:\n* Errado\n" +
			"  > This is wrong\n  > because it spans two lines.\n" +
			"  ! comment also\n  ! spans two lines.\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["Brasilia"],
			reject: [
				{
					pattern: "Errado",
					feedback: "This is wrong because it spans two lines.",
					comment: "comment also spans two lines.",
				},
			],
		});
	});

	it("accepts a backticked (exact) pattern alongside a plain pattern in the same accept list", () => {
		const source =
			"Function name?\n\n[short-answer/accept]:\n* `math.isnan`\n* isnan\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Function name?",
			type: "short-answer",
			accept: ["`math.isnan`", "isnan"],
		});
	});
});
