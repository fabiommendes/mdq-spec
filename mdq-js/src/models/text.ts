/**
 * Short answer and essay questions. A port of `models/_text.py`.
 *
 * NOT PORTED (phase P7 of `dev/plan/mdq-js-paridade.md`): a stub that throws.
 */

import type { ShortAnswerQuestion, Unmatched } from "../schema/index.js";

/** The `unmatched` of a short answer question once the default is applied. */
export function effectiveUnmatched(_question: ShortAnswerQuestion): Unmatched {
	throw new Error("not ported (P7)");
}
