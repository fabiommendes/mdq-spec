/**
 * Structural agreement between the Zod schemas and the bundled JSON Schema.
 *
 * `tests/schema.spec.ts` already checks that both sides accept and reject
 * the same example documents. That catches a drift once someone writes an
 * example that exposes it, but it stays silent about a drift no example
 * happens to exercise -- e.g. a property the JSON Schema declares that no
 * Zod schema accepts, or an enum a JSON Schema lists that Zod does not.
 *
 * This file compares the two schema sources directly, definition by
 * definition: property keys, required keys, and literal (`enum`/`const`)
 * values must agree. It does not compare patterns, descriptions, defaults,
 * or overall structure -- only the three facts above, per
 * docs/sync/schemas.md's "authoritative source of truth" for both `schema/*`
 * and `src/schema/*.ts`.
 *
 * `z.toJSONSchema()` (Zod 4) converts a Zod schema to JSON Schema so both
 * sides can be compared as plain objects. `ShortAnswerQuestion` carries a
 * `.refine()`, which `toJSONSchema` cannot represent; it is converted with
 * `{ unrepresentable: "any" }`, which only affects the unrepresentable
 * refinement, not the object shape this file inspects.
 *
 * The bundled JSON Schema (`src/mdq.schema.json`) composes a question type
 * from `question-base.yaml` plus its own fields via `allOf` + `$ref`, closed
 * with `unevaluatedProperties: false`; the matching Zod schema does the same
 * by spreading `questionBaseShape` into a `strictObject` (see
 * `src/schema/common.ts`). `effectiveObjectShape` below flattens the `allOf`
 * the way `unevaluatedProperties: false` does, so both sides describe the
 * same effective object before they are compared. A handful of sub-schemas
 * (a choice, a blank, an ordering alternative, ...) are plain objects with no
 * `allOf` and are compared directly.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDocument } from "@mdq";
import {
	BooleanChoice,
	ChoiceBlank,
	DiacriticsType,
	EssayInput,
	EssayQuestion,
	Exam,
	FillInQuestion,
	GradedQuestionType,
	GradingType,
	Include,
	IncludeAll,
	Indentation,
	MultipleChoiceQuestion,
	MultipleSelectionQuestion,
	Normalization,
	NumericBlank,
	NumericDomain,
	NumericQuestion,
	OrderingAlternative,
	OrderingContent,
	OrderingQuestion,
	Pattern,
	PenaltyPolicy,
	QuestionGrading,
	QuestionType,
	questionBaseShape,
	ScoredChoice,
	ShortAnswerBlank,
	ShortAnswerQuestion,
	Statement,
	Tolerance,
	TrueFalseQuestion,
	Unmatched,
} from "@mdq/schema/index.js";
import { describe, expect, it } from "vitest";
import * as z from "zod";
import { EXAMPLES_ROOT, loadDocument } from "./corpus.js";

// ---------------------------------------------------------------------------
// The bundle and a minimal, purpose-built `$ref` resolver.
//
// The bundle nests each `schema/*.yaml` file, `$id` and all, under its own
// `$defs` entry (see `scripts/schema_bundle.py`). A relative `$ref` such as
// `"./question-base.yaml"` is therefore resolved the ordinary JSON Schema
// way: against the `$id` of the document it appears in, landing on the
// sibling copy embedded in the same bundle. This resolver implements only
// the two forms the bundle actually uses -- a same-document JSON Pointer
// (`"#/$defs/Foo"`) and a sibling-document reference, optionally with a
// pointer fragment (`"./short-answer.yaml#/$defs/diacritics"`) -- not the
// whole `$ref` specification.
// ---------------------------------------------------------------------------

// biome-ignore lint/suspicious/noExplicitAny: JSON Schema nodes are untyped data, not the library's API.
type JsonNode = Record<string, any>;

const BUNDLE_PATH = fileURLToPath(
	new URL("../src/mdq.schema.json", import.meta.url),
);
const BUNDLE: JsonNode = JSON.parse(readFileSync(BUNDLE_PATH, "utf-8"));
const DEFS: Record<string, JsonNode> = BUNDLE.$defs;

/** Look up a top-level `$defs` entry, failing loudly if the bundle no longer has it. */
function def(key: string): JsonNode {
	const node = DEFS[key];
	if (!node) throw new Error(`bundle has no $defs/${key}`);
	return node;
}

/** Every top-level `$defs` entry keeps its own `$id`; index them by it. */
const ID_INDEX = new Map<string, JsonNode>(
	Object.values(DEFS)
		.filter((node): node is JsonNode => typeof node.$id === "string")
		.map((node) => [node.$id as string, node]),
);

function jsonPointerGet(root: JsonNode, pointer: string): JsonNode {
	const parts = pointer
		.replace(/^\//, "")
		.split("/")
		.filter((part) => part.length > 0)
		.map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
	let node: JsonNode = root;
	for (const part of parts) {
		node = node[part];
	}
	return node;
}

/** Resolve one `$ref`, returning the target node and the base id further refs inside it resolve against. */
function resolveRef(
	ref: string,
	baseId: string,
): { node: JsonNode; baseId: string } {
	if (ref.startsWith("#")) {
		const document = ID_INDEX.get(baseId);
		if (!document) throw new Error(`no document registered for "${baseId}"`);
		return { node: jsonPointerGet(document, ref.slice(1)), baseId };
	}
	const [path = "", fragment] = ref.split("#");
	const targetId = new URL(path, baseId).href;
	const document = ID_INDEX.get(targetId);
	if (!document) {
		throw new Error(`no document registered for "${targetId}" (ref "${ref}")`);
	}
	const node = fragment ? jsonPointerGet(document, fragment) : document;
	return { node, baseId: targetId };
}

interface Shape {
	properties: Set<string>;
	required: Set<string>;
}

/**
 * Flatten a JSON Schema object node -- following a bare `$ref` and merging
 * every `allOf` branch -- into the property/required keys it effectively
 * declares. Mirrors what `unevaluatedProperties: false` means for the
 * object: everything any branch contributes is a real property of the
 * result.
 */
function effectiveObjectShape(node: JsonNode, baseId: string): Shape {
	if (typeof node.$ref === "string") {
		const resolved = resolveRef(node.$ref, baseId);
		return effectiveObjectShape(resolved.node, resolved.baseId);
	}
	const properties = new Set<string>(Object.keys(node.properties ?? {}));
	const required = new Set<string>(node.required ?? []);
	if (Array.isArray(node.allOf)) {
		for (const branch of node.allOf) {
			const sub = effectiveObjectShape(branch, baseId);
			for (const key of sub.properties) properties.add(key);
			for (const key of sub.required) required.add(key);
		}
	}
	return { properties, required };
}

/** A plain object node with no `allOf`/`$ref` of its own -- read directly. */
function flatObjectShape(node: JsonNode): Shape {
	return {
		properties: new Set(Object.keys(node.properties ?? {})),
		required: new Set(node.required ?? []),
	};
}

function zodObjectShape(
	schema: z.ZodType,
	options?: { unrepresentable?: "any" },
): Shape {
	// biome-ignore lint/suspicious/noExplicitAny: the converted document is arbitrary JSON Schema.
	const json = z.toJSONSchema(schema, options) as any;
	return {
		properties: new Set(Object.keys(json.properties ?? {})),
		required: new Set(json.required ?? []),
	};
}

function setDiff(a: Set<string>, b: Set<string>): string[] {
	return [...a].filter((value) => !b.has(value)).sort();
}

/** Assert two shapes declare the same properties and the same required keys. */
function assertShapesAgree(name: string, jsonSide: Shape, zodSide: Shape) {
	const missingProperties = setDiff(jsonSide.properties, zodSide.properties);
	const extraProperties = setDiff(zodSide.properties, jsonSide.properties);
	expect(
		missingProperties.length === 0 && extraProperties.length === 0,
		`${name}: property keys differ -- missing from Zod: [${missingProperties.join(", ")}], extra in Zod: [${extraProperties.join(", ")}]`,
	).toBe(true);

	const missingRequired = setDiff(jsonSide.required, zodSide.required);
	const extraRequired = setDiff(zodSide.required, jsonSide.required);
	expect(
		missingRequired.length === 0 && extraRequired.length === 0,
		`${name}: required keys differ -- missing from Zod: [${missingRequired.join(", ")}], extra in Zod: [${extraRequired.join(", ")}]`,
	).toBe(true);
}

/** Assert two sets of literal values (an `enum`, or a set of `const`s) agree. */
function assertLiteralsAgree(
	name: string,
	jsonValues: readonly unknown[],
	zodValues: readonly unknown[],
) {
	const jsonSet = new Set(jsonValues);
	const zodSet = new Set(zodValues);
	const missing = [...jsonSet].filter((value) => !zodSet.has(value));
	const extra = [...zodSet].filter((value) => !jsonSet.has(value));
	expect(
		missing.length === 0 && extra.length === 0,
		`${name}: literal values differ -- missing from Zod: [${missing.join(", ")}], extra in Zod: [${extra.join(", ")}]`,
	).toBe(true);
}

describe("zod-json-schema agreement", () => {
	it("the bundle and its $id index are where this file expects them", () => {
		expect(Object.keys(DEFS).length).toBeGreaterThan(0);
		expect(ID_INDEX.size).toBe(Object.keys(DEFS).length);
	});

	describe("question types and the exam compose question-base like the JSON Schema does", () => {
		const pairs: Array<
			[string, z.ZodType, { unrepresentable?: "any" } | undefined]
		> = [
			["multiple-choice", MultipleChoiceQuestion, undefined],
			["multiple-selection", MultipleSelectionQuestion, undefined],
			["true-false", TrueFalseQuestion, undefined],
			["numeric", NumericQuestion, undefined],
			["short-answer", ShortAnswerQuestion, { unrepresentable: "any" }],
			["essay", EssayQuestion, undefined],
			["fill-in", FillInQuestion, undefined],
			["ordering", OrderingQuestion, undefined],
			["exam", Exam, undefined],
		];

		it.each(pairs)("%s", (defKey, zodSchema, options) => {
			const node = def(defKey);
			const jsonSide = effectiveObjectShape(node, node.$id);
			const zodSide = zodObjectShape(zodSchema, options);
			assertShapesAgree(defKey, jsonSide, zodSide);
		});
	});

	describe("shared sub-schemas", () => {
		const pairs: Array<[string, JsonNode, z.ZodType]> = [
			[
				"question-base (questionBaseShape)",
				def("question-base"),
				z.object(questionBaseShape),
			],
			[
				"multiple-choice#/$defs/Choice (ScoredChoice)",
				def("multiple-choice").$defs.Choice,
				ScoredChoice,
			],
			[
				"multiple-selection#/$defs/Choice (BooleanChoice)",
				def("multiple-selection").$defs.Choice,
				BooleanChoice,
			],
			[
				"true-false#/$defs/Choice (Statement)",
				def("true-false").$defs.Choice,
				Statement,
			],
			[
				"numeric#/$defs/Tolerance (Tolerance)",
				def("numeric").$defs.Tolerance,
				Tolerance,
			],
			[
				"short-answer#/$defs/pattern object form (Pattern)",
				def("short-answer").$defs.pattern.oneOf[1],
				Pattern,
			],
			[
				"fill-in#/$defs/ChoiceBlank (ChoiceBlank)",
				def("fill-in").$defs.ChoiceBlank,
				ChoiceBlank,
			],
			[
				"fill-in#/$defs/ShortAnswerBlank (ShortAnswerBlank)",
				def("fill-in").$defs.ShortAnswerBlank,
				ShortAnswerBlank,
			],
			[
				"fill-in#/$defs/NumericBlank (NumericBlank)",
				def("fill-in").$defs.NumericBlank,
				NumericBlank,
			],
			[
				"ordering#/$defs/Alternative (OrderingAlternative)",
				def("ordering").$defs.Alternative,
				OrderingAlternative,
			],
			["exam#/$defs/Include (Include)", def("exam").$defs.Include, Include],
			[
				"exam#/$defs/IncludeAll (IncludeAll)",
				def("exam").$defs.IncludeAll,
				IncludeAll,
			],
		];

		it.each(pairs)("%s", (name, node, zodSchema) => {
			assertShapesAgree(name, flatObjectShape(node), zodObjectShape(zodSchema));
		});
	});

	describe("enum and const literals agree", () => {
		const pairs: Array<[string, readonly unknown[], readonly unknown[]]> = [
			[
				"multiple-choice.grading (QuestionGrading)",
				def("multiple-choice").allOf[1].properties.grading.enum,
				QuestionGrading.options,
			],
			[
				"multiple-selection.grading (QuestionGrading)",
				def("multiple-selection").allOf[1].properties.grading.enum,
				QuestionGrading.options,
			],
			[
				"true-false.grading (QuestionGrading)",
				def("true-false").allOf[1].properties.grading.enum,
				QuestionGrading.options,
			],
			[
				"fill-in.grading (QuestionGrading)",
				def("fill-in").allOf[1].properties.grading.enum,
				QuestionGrading.options,
			],
			[
				"exam#/$defs/GradingStrategy (GradingType)",
				def("exam").$defs.GradingStrategy.enum,
				GradingType.options,
			],
			[
				"numeric.domain (NumericDomain)",
				def("numeric").allOf[1].properties.domain.enum,
				NumericDomain.options,
			],
			[
				"essay.input (EssayInput)",
				def("essay").allOf[1].properties.input.enum,
				EssayInput.options,
			],
			[
				"ordering.content (OrderingContent)",
				def("ordering").allOf[1].properties.content.enum,
				OrderingContent.options,
			],
			[
				"ordering.indentation (Indentation)",
				def("ordering").allOf[1].properties.indentation.enum,
				Indentation.options,
			],
			[
				"ordering.unmatched (Unmatched)",
				def("ordering").allOf[1].properties.unmatched.enum,
				Unmatched.options,
			],
			[
				"ordering#/$defs/Normalization (Normalization)",
				def("ordering").$defs.Normalization.enum,
				Normalization.options,
			],
			[
				"exam.penalty (PenaltyPolicy)",
				def("exam").properties.penalty.enum,
				PenaltyPolicy.options,
			],
			[
				"short-answer#/$defs/diacritics (DiacriticsType)",
				def("short-answer").$defs.diacritics.enum,
				DiacriticsType.options,
			],
			[
				"short-answer#/$defs/unmatched (Unmatched)",
				def("short-answer").$defs.unmatched.enum,
				Unmatched.options,
			],
		];

		it.each(pairs)("%s", (name, jsonValues, zodValues) => {
			assertLiteralsAgree(name, jsonValues, zodValues);
		});

		it("question type discriminator consts agree (QuestionType)", () => {
			const questionTypeKeys = [
				"multiple-choice",
				"multiple-selection",
				"true-false",
				"numeric",
				"short-answer",
				"essay",
				"fill-in",
				"ordering",
			];
			const jsonConsts = questionTypeKeys.map(
				(key) => def(key).allOf[1].properties.type.const,
			);
			assertLiteralsAgree("QuestionType", jsonConsts, QuestionType.options);
		});

		it("exam.grading per-type override keys agree with GradedQuestionType", () => {
			const jsonKeys = Object.keys(
				def("exam").properties.grading.oneOf[1].properties,
			);
			assertLiteralsAgree(
				"GradedQuestionType",
				jsonKeys,
				GradedQuestionType.options,
			);
		});
	});

	// -------------------------------------------------------------------------
	// Exhaustiveness: every named `$defs` entry in the bundle -- at any nesting
	// level, not just the 10 top-level ones -- must be accounted for above,
	// either paired against a Zod schema or explicitly skipped with a reason.
	// A `$defs` entry the JSON Schema adds later and nobody pairs or skips
	// fails this test on sight, instead of silently going unchecked.
	// -------------------------------------------------------------------------
	describe("exhaustiveness", () => {
		interface NamedDef {
			/** `<top-level def>` or `<top-level def>#/$defs/<name>`, however deep. */
			path: string;
			node: JsonNode;
		}

		/** Every entry reachable by following `$defs` keys, at any depth. */
		function collectNamedDefs(
			node: JsonNode,
			prefix: string,
			acc: NamedDef[],
		): void {
			const nested = node?.$defs;
			if (!nested || typeof nested !== "object") return;
			for (const [key, child] of Object.entries(nested as JsonNode)) {
				const path = `${prefix}#/$defs/${key}`;
				acc.push({ path, node: child });
				collectNamedDefs(child, path, acc);
			}
		}

		function allNamedDefs(): NamedDef[] {
			const acc: NamedDef[] = [];
			for (const [key, node] of Object.entries(DEFS)) {
				acc.push({ path: key, node });
				collectNamedDefs(node, key, acc);
			}
			return acc;
		}

		/** `type: object`, or an `allOf` composing one -- every top-level question/exam schema. */
		function isObjectTyped(node: JsonNode): boolean {
			return node.type === "object" || Array.isArray(node.allOf);
		}

		/** A named `enum` (a `const` never stands alone as its own `$defs` entry here). */
		function isEnumTyped(node: JsonNode): boolean {
			return Array.isArray(node.enum);
		}

		/** Object-typed `$defs` entries paired against a Zod schema above. */
		const OBJECT_DEFS_TESTED = new Set([
			"multiple-choice",
			"multiple-selection",
			"true-false",
			"numeric",
			"short-answer",
			"essay",
			"fill-in",
			"ordering",
			"exam",
			"question-base",
			"multiple-choice#/$defs/Choice",
			"multiple-selection#/$defs/Choice",
			"true-false#/$defs/Choice",
			"numeric#/$defs/Tolerance",
			"fill-in#/$defs/ChoiceBlank",
			"fill-in#/$defs/ShortAnswerBlank",
			"fill-in#/$defs/NumericBlank",
			"ordering#/$defs/Alternative",
			"exam#/$defs/Include",
			"exam#/$defs/IncludeAll",
		]);

		/** Object-typed `$defs` entries deliberately left untested, with why. */
		const OBJECT_DEFS_SKIPPED: Record<string, string> = {};

		/** Enum-typed `$defs` entries checked against a Zod enum's `.options` above. */
		const ENUM_DEFS_TESTED = new Set([
			"short-answer#/$defs/diacritics",
			"short-answer#/$defs/unmatched",
			"exam#/$defs/GradingStrategy",
			"ordering#/$defs/Normalization",
		]);

		/** Enum-typed `$defs` entries deliberately left untested, with why. */
		const ENUM_DEFS_SKIPPED: Record<string, string> = {};

		function assertExhaustive(
			kind: string,
			found: string[],
			accountedFor: Set<string>,
		): void {
			const unaccounted = found
				.filter((path) => !accountedFor.has(path))
				.sort();
			expect(
				unaccounted,
				`${kind}: found in the bundle but neither paired nor skipped above: [${unaccounted.join(", ")}]`,
			).toEqual([]);

			const stale = [...accountedFor]
				.filter((path) => !found.includes(path))
				.sort();
			expect(
				stale,
				`${kind}: paired or skipped above but no longer in the bundle: [${stale.join(", ")}]`,
			).toEqual([]);
		}

		it("every object-typed $defs entry is paired or explicitly skipped", () => {
			const found = allNamedDefs()
				.filter((entry) => isObjectTyped(entry.node))
				.map((entry) => entry.path);
			assertExhaustive(
				"object-typed $defs",
				found,
				new Set([...OBJECT_DEFS_TESTED, ...Object.keys(OBJECT_DEFS_SKIPPED)]),
			);
		});

		it("every enum/const $defs entry is paired or explicitly skipped", () => {
			const found = allNamedDefs()
				.filter((entry) => isEnumTyped(entry.node))
				.map((entry) => entry.path);
			assertExhaustive(
				"enum/const $defs",
				found,
				new Set([...ENUM_DEFS_TESTED, ...Object.keys(ENUM_DEFS_SKIPPED)]),
			);
		});
	});

	// -------------------------------------------------------------------------
	// `uniqueItems: true` is a JSON Schema constraint Zod has no direct
	// equivalent for; nothing here converts it, so these are expected to fail
	// until the Zod schemas grow a `.refine()` (or similar) enforcing it.
	// -------------------------------------------------------------------------
	describe("uniqueItems rejects a document with a duplicated item", () => {
		/** Every `uniqueItems: true` array in the bundle, found by walking it -- not hand-listed. */
		function findUniqueItemsPaths(
			node: unknown,
			path: string,
			acc: string[],
		): void {
			if (!node || typeof node !== "object") return;
			const record = node as JsonNode;
			if (record.uniqueItems === true) acc.push(path);
			for (const [key, value] of Object.entries(record)) {
				if (!value || typeof value !== "object") continue;
				if (Array.isArray(value)) {
					value.forEach((item, index) => {
						findUniqueItemsPaths(item, `${path}/${key}[${index}]`, acc);
					});
				} else {
					findUniqueItemsPaths(value, `${path}/${key}`, acc);
				}
			}
		}

		const UNIQUE_ITEMS_PATHS_FOUND: string[] = (() => {
			const acc: string[] = [];
			findUniqueItemsPaths(BUNDLE, "", acc);
			return acc;
		})();

		/** Paths covered by a focused rejection test below. */
		const UNIQUE_ITEMS_PATHS_TESTED = new Set([
			"/$defs/question-base/properties/tags",
			"/$defs/exam/properties/tags",
			"/$defs/ordering/allOf[1]/properties/normalizations",
		]);

		/** `uniqueItems` paths deliberately left untested, with why. */
		const UNIQUE_ITEMS_PATHS_SKIPPED: Record<string, string> = {};

		it("every uniqueItems array in the bundle has a focused test or is explicitly skipped", () => {
			const unaccounted = UNIQUE_ITEMS_PATHS_FOUND.filter(
				(path) =>
					!UNIQUE_ITEMS_PATHS_TESTED.has(path) &&
					!(path in UNIQUE_ITEMS_PATHS_SKIPPED),
			).sort();
			expect(
				unaccounted,
				`uniqueItems paths: found in the bundle but neither tested nor skipped above: [${unaccounted.join(", ")}]`,
			).toEqual([]);

			const stale = [...UNIQUE_ITEMS_PATHS_TESTED]
				.filter((path) => !UNIQUE_ITEMS_PATHS_FOUND.includes(path))
				.sort();
			expect(
				stale,
				`uniqueItems paths: listed as tested above but no longer in the bundle: [${stale.join(", ")}]`,
			).toEqual([]);
		});

		/** A fresh copy of a valid corpus document, loaded straight from disk. */
		function loadValidExample(...segments: string[]): Record<string, unknown> {
			return loadDocument(join(EXAMPLES_ROOT, "valid", ...segments)) as Record<
				string,
				unknown
			>;
		}

		/** `[...items, items[0]]`, failing loudly instead of duplicating `undefined`. */
		function withFirstDuplicated<T>(items: T[]): T[] {
			const [first] = items;
			if (first === undefined) {
				throw new Error("fixture array is empty, nothing to duplicate");
			}
			return [...items, first];
		}

		it("/$defs/question-base/properties/tags -- duplicating a question's tag is rejected", () => {
			const document = loadValidExample("essay", "tags.yaml") as {
				tags: string[];
			};
			document.tags = withFirstDuplicated(document.tags);

			const result = validateDocument(document);

			expect(
				result.success,
				"a question with a duplicate tag was accepted, but tags must be unique",
			).toBe(false);
		});

		it("/$defs/exam/properties/tags -- duplicating an exam's tag is rejected", () => {
			const document = loadValidExample("exam", "midterm.yaml");
			document.tags = ["duplicate", "duplicate"];

			const result = validateDocument(document);

			expect(
				result.success,
				"an exam with a duplicate tag was accepted, but tags must be unique",
			).toBe(false);
		});

		it("/$defs/ordering/allOf[1]/properties/normalizations -- duplicating a normalization is rejected", () => {
			const document = loadValidExample("ordering", "skip-blanks.yaml") as {
				normalizations: string[];
			};
			document.normalizations = withFirstDuplicated(document.normalizations);

			const result = validateDocument(document);

			expect(
				result.success,
				"an ordering question with a duplicate normalization was accepted, but normalizations must be unique",
			).toBe(false);
		});
	});
});
