/**
 * Focused tests for the `[essay]` body and `## [answer-key]` section --
 * `docs/handoffs/03-parser-essay.md`, batch 1, criterion 3: an
 * `[answer-key]` block (or an `[essay]` tag) that the reference rejects
 * raises the same error kind in TypeScript. The corpus
 * (`examples/valid/essay/*.mdq.md`, criteria 1-2) already pins every
 * successful shape; this file adds the error paths and the handful of
 * deterministic non-error edge cases the corpus does not carry an example
 * for.
 *
 * `parse_essay_body` and `parse_answer_key` themselves raise nothing --
 * every error below comes from the shared skeleton
 * (`find_body_start`/`MDQParser.parse_question`) reacting to an `[essay]`
 * paragraph that does not match `ESSAY_TAG_RE`. Checked against the
 * reference directly, e.g.:
 *
 *   cd mdq-py && uv run python3 -c "
 *   from mdq._parser._question import parse_question
 *   print(parse_question('[essay]\n'))
 *   "
 *
 * which raises `MissingField('stem')` for every case below (there is no
 * essay/answer-key-specific error class to port).
 *
 * Reference: `mdq-py/mdq/_parser/_question.py` -- `ESSAY_TAG_RE`,
 * `ANSWER_KEY_RE`, `find_body_start`, `_matches_tag`, `parse_essay_body`,
 * `parse_answer_key`.
 */

import { MissingFieldError, parseQuestionDocument } from "@mdq";
import { describe, expect, it } from "vitest";

describe("essay: error paths", () => {
	it("throws MissingFieldError('stem') when '[essay]' is the document's first block", () => {
		// ESSAY_TAG_RE matches "[essay]" exactly, so find_body_start picks
		// it as the body at index 0 -- there is no block left to be the
		// stem.
		try {
			parseQuestionDocument("[essay]\n");
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingFieldError);
			expect((error as MissingFieldError).field).toBe("stem");
		}
	});

	it("throws MissingFieldError('body') when '[essay]' carries trailing text", () => {
		// ESSAY_TAG_RE is `^\[essay\]$`: a tag sharing its line with other
		// text does not match, so find_body_start never recognizes this
		// paragraph as a body. With no other candidate, the whole document
		// reports a missing body rather than a malformed essay tag.
		try {
			parseQuestionDocument("What is DNA?\n\n[essay] please be thorough\n");
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingFieldError);
			expect((error as MissingFieldError).field).toBe("body");
		}
	});

	it("throws MissingFieldError('body') for '[Essay]' (wrong case)", () => {
		// ESSAY_TAG_RE is case-sensitive; a capitalized tag is just prose,
		// same failure mode as trailing text on the line.
		try {
			parseQuestionDocument("What is DNA?\n\n[Essay]\n");
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(MissingFieldError);
			expect((error as MissingFieldError).field).toBe("body");
		}
	});
});

describe("essay: non-error edge cases the corpus does not cover", () => {
	it("captures text before '## [answer-key]' as epilogue and text after it as answerKey", () => {
		const source =
			"What is DNA?\n\n[essay]\n\nSome epilogue before key.\n\n" +
			"## [answer-key]\n\nKey text.\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "What is DNA?",
			type: "essay",
			epilogue: "Some epilogue before key.",
			answerKey: "Key text.",
		});
	});

	it("absorbs everything after the first '## [answer-key]' heading into answerKey, including a second heading", () => {
		// parse_answer_key stops at the *first* h2 matching ANSWER_KEY_RE
		// and takes every remaining node as the key's content -- a second
		// heading that happens to repeat the tag is not special-cased, it
		// is just more prose inside the key.
		const source =
			"What is DNA?\n\n[essay]\n\n## [answer-key]\n\nFirst key.\n\n" +
			"## [answer-key]\n\nSecond key repeated as text.\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "What is DNA?",
			type: "essay",
			answerKey: "First key.\n\n[answer-key]\n\nSecond key repeated as text.",
		});
	});

	it("produces no answerKey field for an '## [answer-key]' section with no content", () => {
		const source = "What is DNA?\n\n[essay]\n\n## [answer-key]\n";
		expect(parseQuestionDocument(source)).toEqual({
			stem: "What is DNA?",
			type: "essay",
		});
	});
});
