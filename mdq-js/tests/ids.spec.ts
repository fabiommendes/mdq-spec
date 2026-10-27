/**
 * `examples/valid/**\/*.ids.yaml`: the ids a document gets from `withIds`.
 *
 * Each file sits next to a `.mdq.md` and/or a `.yaml` of the same name, and
 * both must give the ids it lists (`docs/exam.md`, "Question ids";
 * `docs/question-types/multiple-choice.md`, "Choice ids"). Keys:
 *
 * - `id`: the id of the question.
 * - `choices`: the ids of the choices, in order.
 * - `blanks`: fill-in only, a blank id to the ids of its choices.
 * - `questions`: exam only, the ids of its questions, in order.
 *
 * A key that is absent is not checked. Mirrors
 * `mdq-py/tests/test_ids_corpus.py`.
 */

import { existsSync } from "node:fs";
import { load, type MdqDocument, withIds } from "@mdq";
import { describe, expect, it } from "vitest";
import {
	collectIdsFiles,
	formatOf,
	IDS_SUFFIX,
	loadDocument,
	readText,
	relativeId,
	SOURCE_SUFFIX,
	VALID_DIR,
} from "./corpus.js";
import { corpusIt, IDS } from "./not-ported.js";
import { errorsOf } from "./vectors.js";

const IDS_FILES = collectIdsFiles(VALID_DIR);

interface Identified {
	readonly id?: string;
}
interface Ids {
	id?: string;
	choices?: (string | undefined)[];
	blanks?: Record<string, (string | undefined)[]>;
	questions?: (string | undefined)[];
}

/** The documents next to an `.ids.yaml`: the source and the parsed form. */
function documents(idsFile: string): string[] {
	const stem = idsFile.slice(0, -IDS_SUFFIX.length);
	return [`${stem}${SOURCE_SUFFIX}`, `${stem}.yaml`].filter(existsSync);
}

/** The ids of a document, in the shape of an `.ids.yaml`. */
function idsOf(document: MdqDocument): Ids {
	if ("questions" in document) {
		return {
			questions: (document.questions as Identified[]).map((q) => q.id),
		};
	}
	const found: Ids = { id: document.id };
	const choices = (document as { choices?: Identified[] }).choices;
	if (choices !== undefined) {
		found.choices = choices.map((choice) => choice.id);
	}
	const blanks: Record<string, (string | undefined)[]> = {};
	for (const blank of (
		document as { blanks?: { id: string; choices?: Identified[] }[] }
	).blanks ?? []) {
		if (blank.choices !== undefined) {
			blanks[blank.id] = blank.choices.map((choice) => choice.id);
		}
	}
	if (Object.keys(blanks).length > 0) {
		found.blanks = blanks;
	}
	return found;
}

describe("withIds gives the listed ids", () => {
	it("there are ids files", () => {
		expect(IDS_FILES.length).toBeGreaterThan(0);
	});

	for (const idsFile of IDS_FILES) {
		corpusIt(IDS, relativeId(idsFile), () => {
			const expected = loadDocument(idsFile) as Ids;
			const paths = documents(idsFile);
			expect(
				paths.length,
				`${idsFile} has no document next to it`,
			).toBeGreaterThan(0);
			for (const path of paths) {
				const loaded = load(readText(path), { format: formatOf(path) });
				expect(errorsOf(loaded.diagnostics), path).toEqual([]);
				expect(loaded.document, path).toBeDefined();
				const actual = idsOf(withIds(loaded.document as MdqDocument)) as Record<
					string,
					unknown
				>;
				const picked = Object.fromEntries(
					Object.keys(expected).map((key) => [key, actual[key]]),
				);
				expect(picked, path).toEqual(expected);
			}
		});
	}
});
