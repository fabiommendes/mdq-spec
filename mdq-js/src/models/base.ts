/**
 * Functions every question family shares. A port of `models/_base.py`.
 *
 * NOT PORTED: stubs that throw. `normalize`, `withIds` and `automation` are
 * phase P7 of `dev/plan/mdq-js-paridade.md`; `effectiveGrading` and
 * `effectiveShuffle` are P6.
 */

import type { Question } from "../schema/index.js";
import type { MdqDocument } from "../validate.js";

/** How much of the grading the library does without an instructor. */
export type Automation = "automatic" | "semi-automatic" | "manual";

/**
 * The canonical form of a document: the one a render, then a parse, keeps
 * unchanged.
 */
export function normalize<T extends MdqDocument>(_document: T): T {
	throw new Error("not ported (P7)");
}

/** A copy of the document with every derivable id filled in. */
export function withIds<T extends MdqDocument>(_document: T): T {
	throw new Error("not ported (P7)");
}

/** The automation of a question (`docs/question-types/base.md`). */
export function automation(_question: Question): Automation {
	throw new Error("not ported (P7)");
}

/** The `grading` of a question outside any exam, with the default applied. */
export function effectiveGrading(_question: Question): string {
	throw new Error("not ported (P6)");
}

/** The `shuffle` of a question outside any exam, with the default applied. */
export function effectiveShuffle(_question: Question): boolean {
	throw new Error("not ported (P6)");
}
