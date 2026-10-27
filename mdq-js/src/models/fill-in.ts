/**
 * Fill-in questions and their blanks. A port of `models/_fill_in.py`.
 *
 * The validation is here (phase P4b). The rest is NOT PORTED (phase P7 of
 * `dev/plan/mdq-js-paridade.md`): stubs that throw.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { findBlankMarkers } from "../markdown.js";
import { repr } from "../parser/text.js";
import type { Blank, FillInQuestion, Unmatched } from "../schema/index.js";
import {
	type Automation,
	checkUniqueChoices,
	choiceFreeTexts,
	type FamilyRules,
	modelError,
} from "./base.js";
import { numericKeyFields, numericKeyModels } from "./numeric.js";
import { patternKeyFields } from "./text.js";

/**
 * The rules of a blank at `path`. The checks of the model of a blank are
 * part of the fields of the question: a blank that fails one fails its
 * question before the question's own checks run.
 */
function blankDiagnostics(
	blank: Blank,
	path: readonly PathStep[],
): Diagnostic[] {
	switch (blank.type) {
		case "multiple-choice": {
			const found = choiceFreeTexts(blank.choices, path);
			if (found.length > 0) return found;
			return optional(checkUniqueChoices(blank.choices, path));
		}
		case "short-answer":
			return patternKeyFields(blank, path);
		case "numeric": {
			const found = numericKeyFields(blank, path);
			if (found.length > 0) return found;
			return numericKeyModels.flatMap((check) => optional(check(blank, path)));
		}
	}
}

function optional(found: Diagnostic | undefined): Diagnostic[] {
	return found === undefined ? [] : [found];
}

/** fill-in.md: two blanks sharing an id make the stem's `[^id]` marker ambiguous. */
function checkBlanksHaveUniqueIds(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const seen = new Map<string, number>();
	for (const [index, blank] of question.blanks.entries()) {
		const first = seen.get(blank.id);
		if (first !== undefined) {
			return modelError(
				"duplicate-blank-id",
				`blank id ${repr(blank.id)} is already used by blanks[${first}]; the stem's [^${blank.id}] marker is ambiguous`,
				[...path, "blanks", index, "id"],
			);
		}
		seen.set(blank.id, index);
	}
	return undefined;
}

/**
 * fill-in.md, "Additional Rules": every `[^id]` marker of the stem refers to a
 * declared blank (`undefined-blank`), and every declared blank is referenced
 * by one (`unreferenced-blank`).
 */
function checkBlankMarkers(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const referenced = findBlankMarkers(question.stem).map(([name]) => name);
	const declared = new Set(question.blanks.map((blank) => blank.id));
	for (const name of new Set(referenced)) {
		if (declared.has(name)) continue;
		const variants = [...declared]
			.filter((id) => id.toLowerCase() === name.toLowerCase())
			.sort();
		const hint =
			variants.length > 0
				? `; blank ids are case-sensitive, did you mean [^${variants[0]}]?`
				: "";
		return modelError(
			"undefined-blank",
			`the stem references [^${name}] but no blank with that id is defined${hint}`,
			[...path, "stem"],
		);
	}
	const seen = new Set(referenced);
	for (const [index, blank] of question.blanks.entries()) {
		if (!seen.has(blank.id)) {
			return modelError(
				"unreferenced-blank",
				`blank ${repr(blank.id)} is never referenced by a [^${blank.id}] marker in the stem`,
				[...path, "blanks", index, "id"],
			);
		}
	}
	return undefined;
}

/**
 * fill-in.md, "Where blanks may appear": a `[^id]` marker appears only in a
 * plain text run of a paragraph (`misplaced-blank`).
 */
function checkBlankMarkersArePlain(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const misplaced = findBlankMarkers(question.stem).find(([, bad]) => bad);
	if (misplaced === undefined) return undefined;
	return modelError(
		"misplaced-blank",
		`[^${misplaced[0]}] must appear in a plain text run of the stem, not inside a heading, list, table, quote, emphasis, or a link`,
		[...path, "stem"],
	);
}

/** fill-in.md, "Blank definitions": each blank id appears at most once in the stem. */
function checkBlankReferencesAreUnique(
	question: FillInQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	const seen = new Set<string>();
	for (const [name] of findBlankMarkers(question.stem)) {
		if (seen.has(name)) {
			return modelError(
				"duplicate-blank-reference",
				`the stem references [^${name}] more than once; each blank id may appear only once in the stem`,
				[...path, "stem"],
			);
		}
		seen.add(name);
	}
	return undefined;
}

export const fillInRules: FamilyRules<FillInQuestion> = {
	fields: (question, path) =>
		question.blanks.flatMap((blank, index) =>
			blankDiagnostics(blank, [...path, "blanks", index]),
		),
	models: [
		checkBlanksHaveUniqueIds,
		checkBlankMarkers,
		checkBlankMarkersArePlain,
		checkBlankReferencesAreUnique,
	],
};

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
