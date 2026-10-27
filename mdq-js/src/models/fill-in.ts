/**
 * Fill-in questions and their blanks. A port of `models/_fill_in.py`.
 *
 * NOT PORTED (phase P7 of `dev/plan/mdq-js-paridade.md`): stubs that throw.
 */

import type { Blank, Unmatched } from "../schema/index.js";
import type { Automation } from "./base.js";

/**
 * The `unmatched` of a short answer blank, given the `unmatched` of its
 * question.
 */
export function blankEffectiveUnmatched(
	_blank: Blank,
	_unmatched: Unmatched | undefined,
): Unmatched {
	throw new Error("not ported (P7)");
}

/** The automation of a blank, given the `unmatched` of its question. */
export function blankAutomation(
	_blank: Blank,
	_unmatched: Unmatched | undefined,
): Automation {
	throw new Error("not ported (P7)");
}
