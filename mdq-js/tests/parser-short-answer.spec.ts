/**
 * Tests for the `[short-answer]` body, its `[short-answer/accept]` and
 * `[short-answer/reject]` pattern blocks, and the frontmatter pattern lists
 * (`accept`, `reject`, `preAccept`, `preReject`) -- `docs/handoffs/05-parser-
 * short-answer.md`, batch 1 criterion 2 and batch 2 criterion 3, plus
 * `docs/handoffs/06-numeric-grammar.md` criterion 3 (the `openEnded`
 * fallback now runs after the trailing pattern blocks, ported from
 * mdq-py/tests/test_parser.py's `test_bare_short_answer_*`).
 *
 * Criterion 1 (every `examples/valid/short-answer/*.mdq.md` and
 * `exam/bank/amazonia-01` parses to its `.yaml`) is already covered, red, by
 * the corpus loop in `tests/parser.spec.ts`; this file does not duplicate it.
 *
 * Every expected value here comes from running the reference directly, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._parser._question import parse_question
 *   print(parse_question('What is the capital of Brazil?\n\n[short-answer]: Brasilia\n'))
 *   "
 *
 * Reference: `mdq-py/mdq/_parser/_question.py` -- `parse_short_answer_body`,
 * `parse_trailing_pattern_blocks`, `parse_short_answer_pattern_blocks`,
 * `_pattern_entry`, `SHORT_ANSWER_RE`; `mdq-py/mdq/_parser/_frontmatter.py`
 * -- `_copy_pattern_lists`; `mdq-py/mdq/errors.py` -- `ConflictingAnswerKey`.
 */

import {
	ConflictingAnswerKeyError,
	ParseError,
	parseQuestionDocument,
} from "@mdq";
import { describe, expect, it } from "vitest";

//
// Criterion 2: frontmatter pattern lists (`accept`, `reject`, `preAccept`,
// `preReject`) are copied onto the document the way `_copy_pattern_lists`
// does -- combinations the corpus does not exercise.
//

describe("short-answer: frontmatter pattern lists", () => {
	it("a frontmatter `reject` list combines with a body `[short-answer/accept]` block", () => {
		// Different keys, not a conflict: `_copy_pattern_lists` only skips a
		// key already present on the document, and the body block only
		// ever writes the `accept` key here.
		const source =
			"---\nreject:\n  - Errado\n---\n\nCapital?\n\n" +
			"[short-answer/accept]:\n* Brasilia\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["Brasilia"],
			reject: ["Errado"],
		});
	});

	it("frontmatter-only `preAccept`/`preReject` combine with body accept/reject blocks", () => {
		// preAccept/preReject have no body-block spelling at all (short-
		// answer.md#pattern-lists), so they always arrive through
		// `_copy_pattern_lists`, alongside `accept`/`reject` set by the
		// body's own blocks.
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

	it("a frontmatter `accept` list survives alongside a bare block's inline content", () => {
		// The bare-block path copies pattern lists before it decides what
		// to do with `rest`, and unconditionally sets `oneOf` when `rest`
		// is non-empty -- nothing in `parse_short_answer_body` checks
		// whether `accept` is already present. Pinned to the reference as
		// found; see the report for the related case the orchestrator
		// should know about.
		const source =
			"---\naccept:\n  - Brasilia\n---\n\nCapital?\n\n" +
			"[short-answer]: Brasilia (alt)\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Capital?",
			type: "short-answer",
			accept: ["Brasilia"],
			oneOf: ["Brasilia (alt)"],
		});
	});
});

//
// Criterion 3: every ParseError/ConflictingAnswerKey path in
// parse_short_answer_body, parse_trailing_pattern_blocks and
// parse_short_answer_pattern_blocks.
//

describe("short-answer: error paths", () => {
	it("raises ParseError for a repeated [short-answer/accept] block", () => {
		const source =
			"Capital?\n\n[short-answer/accept]:\n* Brasilia\n\n" +
			"[short-answer/accept]:\n* Brasilia\n";
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
		expect(() => parseQuestionDocument(source)).toThrow(
			"repeated [short-answer/accept] block",
		);
	});

	it("raises ParseError for a repeated [short-answer/reject] block", () => {
		const source =
			"Capital?\n\n[short-answer/reject]:\n* Errado\n\n" +
			"[short-answer/reject]:\n* Errado\n";
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
		expect(() => parseQuestionDocument(source)).toThrow(
			"repeated [short-answer/reject] block",
		);
	});

	it("raises ParseError for a second bare [short-answer] block", () => {
		const source =
			"Capital?\n\n[short-answer]: Brasilia\n\n[short-answer]: Brasilia\n";
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
		expect(() => parseQuestionDocument(source)).toThrow(
			"a question defines at most one [short-answer] block",
		);
	});

	it("raises ParseError when a [short-answer/accept] block is not followed by a list", () => {
		const source =
			"Capital?\n\n[short-answer/accept]:\n\nSome epilogue paragraph.\n";
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
		expect(() => parseQuestionDocument(source)).toThrow(
			"[short-answer/accept] must be followed by a list",
		);
	});

	it("raises ParseError when a bare [short-answer] block follows a [short-answer/accept] block", () => {
		// SHORT_ANSWER_RE's variant group is only ever "accept", "reject"
		// or absent -- a bare tag following an accept/reject block is the
		// "unknown variant" this loop rejects, worded from the accept/
		// reject side that already opened the run.
		const source =
			"Capital?\n\n[short-answer/accept]:\n* Brasilia\n\n" +
			"[short-answer]: Brasilia\n";
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
		expect(() => parseQuestionDocument(source)).toThrow(
			"a [short-answer] block cannot follow [short-answer/accept]",
		);
	});

	it("raises ParseError when [short-answer/accept] carries inline text instead of a list", () => {
		const source = "Capital?\n\n[short-answer/accept]: Brasilia\n";
		expect(() => parseQuestionDocument(source)).toThrow(ParseError);
		expect(() => parseQuestionDocument(source)).toThrow(
			"[short-answer/accept] takes a list, not inline text",
		);
	});

	it("raises ConflictingAnswerKeyError when `accept` is declared in both frontmatter and a body block", () => {
		const source =
			"---\naccept:\n  - Brasilia\n---\n\nCapital?\n\n" +
			"[short-answer/accept]:\n* Brasilia\n";
		try {
			parseQuestionDocument(source);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(ConflictingAnswerKeyError);
			expect(error).toBeInstanceOf(ParseError);
			expect((error as ConflictingAnswerKeyError).code).toBe(
				"conflicting-accept",
			);
			expect((error as Error).message).toBe(
				"'accept' is declared both in the frontmatter and as a [short-answer/accept] body block",
			);
		}
	});

	it("raises ConflictingAnswerKeyError with code 'conflicting-accept' even for a `reject` conflict", () => {
		// `ConflictingAnswerKey.code` is hardcoded, not derived from which
		// key conflicted -- pinned here so the port does not "fix" it into
		// a per-variant code.
		const source =
			"---\nreject:\n  - Errado\n---\n\nCapital?\n\n" +
			"[short-answer/reject]:\n* Errado\n";
		try {
			parseQuestionDocument(source);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(ConflictingAnswerKeyError);
			expect((error as ConflictingAnswerKeyError).code).toBe(
				"conflicting-accept",
			);
			expect((error as Error).message).toBe(
				"'reject' is declared both in the frontmatter and as a [short-answer/reject] body block",
			);
		}
	});
});

//
// A few non-error edge cases the corpus does not cover.
//

describe("short-answer: non-error edge cases the corpus does not cover", () => {
	it("folds an unconsumed [short-answer/accept] block into the epilogue when a prose paragraph precedes it", () => {
		// parse_trailing_pattern_blocks only inspects the node right after
		// the bare block; a prose paragraph in between means the tag
		// further down is never recognized as a pattern block at all, and
		// the whole remainder -- prose and tag alike -- becomes epilogue
		// text.
		const source =
			"Capital?\n\n[short-answer]: Brasilia\n\n" +
			"Some prose in between.\n\n[short-answer/accept]:\n* Brasilia\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Capital?",
			type: "short-answer",
			oneOf: ["Brasilia"],
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

//
// docs/handoffs/06-numeric-grammar.md criterion 3: the `openEnded` fallback
// sets `openEnded: true` only if none of `oneOf`, `regex`, `accept`,
// `reject`, `openEnded` is present, from the body, the trailing blocks or the
// frontmatter -- ported one-for-one from mdq-py/tests/test_parser.py's
// `test_bare_short_answer_with_patterns_is_not_open_ended` (4 sources) and
// `test_bare_short_answer_without_patterns_is_open_ended`.
//

describe("short-answer: the openEnded fallback (ported test_bare_short_answer_* cases)", () => {
	it.each([
		[
			"a frontmatter `accept` list",
			"---\naccept: [Brasília]\n---\n\nQual é a capital do Brasil?\n\n[short-answer]:\n",
			{
				stem: "Qual é a capital do Brasil?",
				type: "short-answer",
				accept: ["Brasília"],
			},
		],
		[
			"a frontmatter `reject` list",
			"---\nreject: [Rio de Janeiro]\n---\n\nQual é a capital do Brasil?\n\n[short-answer]:\n",
			{
				stem: "Qual é a capital do Brasil?",
				type: "short-answer",
				reject: ["Rio de Janeiro"],
			},
		],
		[
			"a frontmatter `regex`",
			"---\nregex: Bras[ií]lia\n---\n\nQual é a capital do Brasil?\n\n[short-answer]:\n",
			{
				stem: "Qual é a capital do Brasil?",
				type: "short-answer",
				regex: "Bras[ií]lia",
			},
		],
		[
			"a trailing [short-answer/accept] block",
			"Qual é a capital do Brasil?\n\n[short-answer]:\n\n[short-answer/accept]:\n* Brasília\n",
			{
				stem: "Qual é a capital do Brasil?",
				type: "short-answer",
				accept: ["Brasília"],
			},
		],
	])("a bare [short-answer] block with %s is not open-ended (no openEnded key)", (_label, source, expected) => {
		expect(parseQuestionDocument(source)).toEqual(expected);
	});

	it("a bare [short-answer] block with no pattern at all is open-ended", () => {
		const source = "Descreva o bioma Cerrado.\n\n[short-answer]:\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "Descreva o bioma Cerrado.",
			type: "short-answer",
			openEnded: true,
		});
	});
});
