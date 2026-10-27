/**
 * `lint`: the `warning` and `info` diagnostics of a document. A port of the
 * common rules of `mdq-py/mdq/models/_lint.py` and of the `lint()` of each
 * question family.
 *
 * NOT PORTED (phase P5 of `dev/plan/mdq-js-paridade.md`): a stub that throws.
 */

import type { Diagnostic } from "../diagnostics.js";
import type { MdqDocument } from "../validate.js";

/** Every lint diagnostic of a question or an exam. */
export function lint(_document: MdqDocument): Diagnostic[] {
	throw new Error("not ported (P5)");
}
