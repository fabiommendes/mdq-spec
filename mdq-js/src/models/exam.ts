/**
 * The inheritance of an exam: the `grading` and `shuffle` a question takes
 * from its exam. A port of the matching methods of
 * `mdq-py/mdq/models/_exam.py`.
 *
 * NOT PORTED (phase P6 of `dev/plan/mdq-js-paridade.md`): stubs that throw.
 */

import type { Exam } from "../schema/exam.js";
import type { Question } from "../schema/index.js";

/** The `grading` a question has once the exam default is applied. */
export function gradingFor(_exam: Exam, _question: Question): string {
	throw new Error("not ported (P6)");
}

/** The `shuffle` a question has once the exam default is applied. */
export function shuffleFor(_exam: Exam, _question: Question): boolean {
	throw new Error("not ported (P6)");
}

/** A copy of `question` with the `grading` and `shuffle` of the exam applied. */
export function resolveQuestion(_exam: Exam, _question: Question): Question {
	throw new Error("not ported (P6)");
}
