/**
 * `load`: the one path from Markdown or data to a validated document and its
 * diagnostics. A port of `mdq-py/mdq/_loading.py`.
 *
 * It never throws for a problem *in* the document: a parse failure, a schema
 * error, a model rule that fails, all come back as `Diagnostic`s on the
 * returned `Loaded`. It throws only for a problem with the call itself (an
 * unknown `format`). An exam's include blocks stay unresolved; the host
 * resolves them with `resolveExam`.
 *
 * Differences from Python, by design: a `string` is always the text of the
 * document (there is no `Path` or file object, `docs/sync/modules.md`).
 */

import * as z from "zod";
import {
	type Diagnostic,
	diagnostic,
	type PathStep,
	RANK,
	type Severity,
} from "./diagnostics.js";
import {
	InvalidDocumentError,
	MdqError,
	ParseError,
	UnresolvedInclude,
} from "./errors.js";
import { includeKeyHint } from "./include-keys.js";
import { baseFieldRules, uuidDiagnostics } from "./models/base.js";
import { markerDiagnostic } from "./models/choice.js";
import { lint, scheduleDiagnostic, withIds } from "./models/exam.js";
import {
	nonFiniteDiagnostic,
	numericAnswerDiagnostic,
} from "./models/numeric.js";
import {
	isExam,
	loadYaml,
	parseExamDocument,
	parseQuestionDocument,
	YamlLoadError,
} from "./parser/index.js";
import { findUnicodeSpaces } from "./parser/spaces.js";
import { repr } from "./parser/text.js";
import { canonicalDuration, canonicalStart } from "./schedule.js";
import { GradingType } from "./schema/common.js";
import type { Exam } from "./schema/exam.js";
import {
	ExamEntry,
	ExamGradingType,
	Exam as ExamSchema,
} from "./schema/exam.js";
import type { Question } from "./schema/questions.js";
import { Question as QuestionSchema } from "./schema/questions.js";
import {
	type MdqDocument,
	modelDiagnostics,
	uniqueDiagnostics,
} from "./validate.js";

/** The text formats `load` reads; a mapping needs none. */
export type Format = "mdq" | "yaml" | "json";

/** The kind of document `load` expects. Another kind is `wrong-kind`. */
export type Kind = "question" | "exam";

/** Options of `load`. */
export interface LoadOptions {
	/** Overrides the format a string would otherwise have (`mdq`). */
	readonly format?: Format;
	/** Narrows the document to a question or an exam. */
	readonly kind?: Kind;
	/**
	 * `keep` (the default) returns the document as written; `fill` returns
	 * `withIds(document)`. Lint always inspects the document as written.
	 */
	readonly ids?: "keep" | "fill";
}

/**
 * What `load` found: the document, if one was built, and every diagnostic.
 * `document` is `undefined` if and only if some diagnostic is an `error`.
 */
export interface Loaded<D extends MdqDocument = MdqDocument> {
	readonly document: D | undefined;
	readonly diagnostics: readonly Diagnostic[];
}

/** A mapping or the text of a document. */
export type Source = string | Readonly<Record<string, unknown>>;

type Data = Record<string, unknown>;

function isRecord(value: unknown): value is Data {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Load a question or exam document from MDQ Markdown text, from YAML or JSON
 * text, or from an already parsed mapping. A problem in the document is a
 * diagnostic, never a thrown error.
 *
 * @param options.kind Narrows the result and checks the document is the kind
 *   claimed: a mismatch is one `wrong-kind` error, found before any
 *   validation.
 * @throws {RangeError} `options.format` is not `mdq`, `yaml` or `json`.
 */
export function load(
	source: Source,
	options: LoadOptions & { readonly kind: "question" },
): Loaded<Question>;
export function load(
	source: Source,
	options: LoadOptions & { readonly kind: "exam" },
): Loaded<Exam>;
export function load(source: Source, options?: LoadOptions): Loaded;
export function load(source: Source, options: LoadOptions = {}): Loaded {
	const loaded = loadSource(source, options);
	return options.ids === "fill" ? fillIds(loaded) : loaded;
}

/** `withIds` of the document; an unresolved `includeAll` is an error. */
function fillIds(loaded: Loaded): Loaded {
	if (loaded.document === undefined) return loaded;
	try {
		return { ...loaded, document: withIds(loaded.document) };
	} catch (error) {
		if (!(error instanceof UnresolvedInclude)) throw error;
		return failed([
			...loaded.diagnostics,
			diagnostic("error", "unresolved-include-all", error.message),
		]);
	}
}

function loadSource(source: Source, options: LoadOptions): Loaded {
	const kind = options.kind;
	if (typeof source !== "string") return loadData(source, kind);
	const format = options.format ?? "mdq";
	switch (format) {
		case "mdq":
			return loadMdqText(source, kind);
		case "yaml": {
			let data: unknown;
			try {
				data = loadYaml(source);
			} catch (error) {
				if (error instanceof YamlLoadError) {
					return failed([syntaxError("yaml-syntax-error", error.message)]);
				}
				throw error;
			}
			return loadData(data, kind);
		}
		case "json": {
			let data: unknown;
			try {
				data = JSON.parse(source);
				const repeated = repeatedJsonKey(source);
				if (repeated !== undefined) {
					throw new SyntaxError(
						`duplicate key ${repr(repeated)} in a JSON object`,
					);
				}
			} catch (error) {
				if (error instanceof SyntaxError) {
					return failed([syntaxError("json-syntax-error", error.message)]);
				}
				throw error;
			}
			return loadData(data, kind);
		}
		default:
			throw new RangeError(
				`unknown format ${repr(String(format))}; expected one of 'mdq', 'yaml', 'json'`,
			);
	}
}

/**
 * Shortcut for `assertValid(load(...), raiseOn)`.
 *
 * @throws {InvalidDocumentError} The document is invalid at `raiseOn`.
 */
export function parse(
	source: Source,
	options: LoadOptions & {
		readonly kind: "question";
		readonly raiseOn?: Severity;
	},
): Question;
export function parse(
	source: Source,
	options: LoadOptions & { readonly kind: "exam"; readonly raiseOn?: Severity },
): Exam;
export function parse(
	source: Source,
	options?: LoadOptions & { readonly raiseOn?: Severity },
): MdqDocument;
export function parse(
	source: Source,
	options: LoadOptions & { readonly raiseOn?: Severity } = {},
): MdqDocument {
	const { raiseOn, ...loadOptions } = options;
	return assertValid(load(source, loadOptions), raiseOn);
}

/**
 * Return the document, or throw.
 *
 * @param raiseOn The lowest severity that makes it throw (`error` >
 *   `warning` > `info`).
 * @throws {InvalidDocumentError} There is no document, or some diagnostic is
 *   at or above `raiseOn`.
 */
export function assertValid<D extends MdqDocument>(
	loaded: Loaded<D>,
	raiseOn: Severity = "error",
): D {
	const threshold = RANK[raiseOn];
	if (
		loaded.document === undefined ||
		loaded.diagnostics.some((d) => RANK[d.severity] >= threshold)
	) {
		throw new InvalidDocumentError(loaded.diagnostics);
	}
	return loaded.document;
}

//
// Source -> data
//

function failed(diagnostics: readonly Diagnostic[]): Loaded {
	return { document: undefined, diagnostics };
}

function syntaxError(code: string, message: string): Diagnostic {
	return diagnostic("error", code, message);
}

/**
 * The first key that a JSON object of `text` repeats, if any. `text` is valid
 * JSON: `JSON.parse` keeps the last value of a repeated key, so a scan finds
 * the repeat.
 */
function repeatedJsonKey(text: string): string | undefined {
	const stack: { keys: Set<string> | null; expectKey: boolean }[] = [];
	let i = 0;
	while (i < text.length) {
		const char = text[i];
		if (char === '"') {
			let end = i + 1;
			while (text[end] !== '"') end += text[end] === "\\" ? 2 : 1;
			const top = stack.at(-1);
			if (top?.keys && top.expectKey) {
				const key = JSON.parse(text.slice(i, end + 1)) as string;
				if (top.keys.has(key)) return key;
				top.keys.add(key);
				top.expectKey = false;
			}
			i = end + 1;
			continue;
		}
		if (char === "{") stack.push({ keys: new Set(), expectKey: true });
		else if (char === "[") stack.push({ keys: null, expectKey: false });
		else if (char === "}" || char === "]") stack.pop();
		else if (char === ",") {
			const top = stack.at(-1);
			if (top?.keys) top.expectKey = true;
		}
		i += 1;
	}
	return undefined;
}

function kindMismatch(
	kind: Kind | undefined,
	isExamDocument: boolean,
): Diagnostic | undefined {
	if (kind === "question" && isExamDocument) {
		return diagnostic(
			"error",
			"wrong-kind",
			"expected a question document, but this is an exam",
		);
	}
	if (kind === "exam" && !isExamDocument) {
		return diagnostic(
			"error",
			"wrong-kind",
			"expected an exam document, but this is a question",
		);
	}
	return undefined;
}

function parseErrorDiagnostic(error: MdqError): Diagnostic {
	const code = error instanceof ParseError ? error.code : "parse-error";
	const path = error instanceof ParseError ? error.path : [];
	const line = error instanceof ParseError ? error.line : undefined;
	return diagnostic("error", code, error.message, path, line);
}

function loadMdqText(text: string, kind: Kind | undefined): Loaded {
	const isExamDocument = isExam(text);
	const mismatch = kindMismatch(kind, isExamDocument);
	if (mismatch !== undefined) return failed([mismatch]);

	// Reported even when parsing fails: a Unicode space before a tag is a
	// common reason for the failure.
	const collected: Diagnostic[] = findUnicodeSpaces(text);
	let data: Data;
	try {
		data = {
			...(isExamDocument
				? parseExamDocument(text, collected)
				: parseQuestionDocument(text, collected)),
		};
	} catch (error) {
		if (error instanceof MdqError) {
			return failed([...collected, parseErrorDiagnostic(error)]);
		}
		throw error;
	}

	// A key the frontmatter may not hold is an error of the parser: the
	// document it built is not the one the source describes.
	if (collected.some((d) => d.severity === "error")) return failed(collected);
	return validated(data, collected, isExamDocument);
}

function loadData(data: unknown, kind: Kind | undefined): Loaded {
	if (!isRecord(data)) {
		return failed([
			diagnostic(
				"error",
				"invalid-document",
				"document must be a mapping at the top level",
			),
		]);
	}
	const isExamDocument =
		data.type === "exam" || (!("type" in data) && "questions" in data);
	const mismatch = kindMismatch(kind, isExamDocument);
	if (mismatch !== undefined) return failed([mismatch]);
	return validated({ ...data }, [], isExamDocument);
}

//
// Data -> document
//

/**
 * base.md, "Frontmatter": a `null` in an optional field is the same as an
 * absent field, also nested in a choice or a blank. The values of `meta` keep
 * their nulls, and so does the `grading` map of an exam, whose values are not
 * optional fields: a `null` there is a wrong strategy.
 */
function dropNulls(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(dropNulls);
	if (!isRecord(value)) return value;
	const kept: Data = {};
	for (const [key, item] of Object.entries(value)) {
		if (item === null) continue;
		// `defineProperty` keeps `__proto__` an own key.
		Object.defineProperty(kept, key, {
			value: key === "meta" || key === "grading" ? item : dropNulls(item),
			enumerable: true,
			writable: true,
			configurable: true,
		});
	}
	return kept;
}

/**
 * exam.md, "Duration and Start Time": `start` and `duration` take their
 * canonical form, whatever surface form they were written in (`1:30`,
 * `2026-03-10 14:00`). A value that is no start or duration is reported and
 * left out, so the schema does not report it again.
 */
function canonicalSchedule(exam: Data, diagnostics: Diagnostic[]): void {
	for (const field of ["start", "duration"] as const) {
		if (!(field in exam)) continue;
		const problem = scheduleDiagnostic(field, exam[field]);
		if (problem !== undefined) {
			diagnostics.push(problem);
			delete exam[field];
		} else {
			exam[field] =
				field === "start"
					? canonicalStart(exam[field])
					: canonicalDuration(exam[field]);
		}
	}
}

function validated(
	raw: Data,
	collected: readonly Diagnostic[],
	isExamDocument: boolean,
): Loaded {
	const diagnostics = [...collected];
	const data = dropNulls(raw) as Data;
	if (isExamDocument) canonicalSchedule(data, diagnostics);

	const result = isExamDocument
		? ExamSchema.safeParse(data)
		: QuestionSchema.safeParse(data);
	if (!result.success) {
		const schemaDiagnostics = uniqueDiagnostics(
			isExamDocument
				? examDiagnostics(data)
				: result.error.issues.flatMap((issue) =>
						issueDiagnostics(issue as ZodIssue, data, [], false),
					),
		);
		diagnostics.push(...schemaDiagnostics);
		// Pydantic runs the field validators of the fields that have the right
		// type in the same pass as the type errors, so a question reports both.
		if (!isExamDocument) {
			diagnostics.push(...fieldRulesBeside(data, schemaDiagnostics));
		}
		return failed(diagnostics);
	}
	if (diagnostics.some((d) => d.severity === "error"))
		return failed(diagnostics);

	const document = result.data as MdqDocument;
	diagnostics.push(...modelDiagnostics(document));
	if (diagnostics.some((d) => d.severity === "error")) {
		return failed(diagnostics);
	}
	diagnostics.push(...lint(document));
	return { document, diagnostics };
}

/**
 * The common field rules of a question that failed the schema, without the
 * ones on a path a schema diagnostic already covers.
 */
function fieldRulesBeside(
	data: Data,
	schemaDiagnostics: readonly Diagnostic[],
): Diagnostic[] {
	const covered = (path: readonly PathStep[]) =>
		schemaDiagnostics.some(
			(d) =>
				d.path.length <= path.length &&
				d.path.every((step, index) => step === path[index]),
		);
	return baseFieldRules(data).filter((d) => !covered(d.path));
}

//
// Zod issues -> diagnostics
//

interface ZodIssue {
	readonly code: string;
	readonly path: readonly PropertyKey[];
	readonly message: string;
	readonly keys?: readonly string[];
	readonly errors?: readonly (readonly ZodIssue[])[];
	readonly note?: string;
}

/** The names of the question types, in the order of `Question`. */
const QUESTION_TAGS = [
	"multiple-choice",
	"multiple-selection",
	"true-false",
	"numeric",
	"short-answer",
	"essay",
	"fill-in",
	"ordering",
];

function valueAt(data: unknown, path: readonly PathStep[]): unknown {
	let node = data;
	for (const step of path) {
		if (typeof node !== "object" || node === null) return undefined;
		node = (node as Record<PathStep, unknown>)[step];
	}
	return node;
}

/** The member of `Exam.questions`' union that a value belongs to, by index. */
function entryMember(value: unknown): number {
	if (isRecord(value) && !("type" in value)) {
		if ("includeAll" in value) return 1;
		if ("include" in value) return 0;
	}
	return 2;
}

/** `Exam` with the two union-typed fields left for `examDiagnostics`. */
const ExamShell = ExamSchema.extend({
	grading: z.unknown().optional(),
	questions: z.array(z.unknown()),
});

/**
 * The schema diagnostics of an exam that failed `Exam`.
 *
 * Zod reports a failed union differently from one version to the next (4.5
 * merges the `unrecognized_keys` issues of the members, for one). So the two
 * unions of an exam, `grading` and each entry of `questions`, are not read
 * from the issues of `Exam`: each member is validated on its own, and the
 * union is rebuilt from those results.
 */
function examDiagnostics(data: Data): Diagnostic[] {
	const found: Diagnostic[] = [];
	const shell = ExamShell.safeParse(data);
	if (!shell.success) {
		for (const issue of shell.error.issues) {
			found.push(...issueDiagnostics(issue as ZodIssue, data, [], true));
		}
	}
	if (data.grading !== undefined) {
		const results = ExamGradingType.options.map((member) =>
			member.safeParse(data.grading),
		);
		if (!results.some((result) => result.success)) {
			const errors = results.map((r) =>
				r.success ? [] : (r.error.issues as ZodIssue[]),
			);
			found.push(...unionDiagnostics(errors, data, ["grading"], true));
		}
	}
	if (Array.isArray(data.questions)) {
		data.questions.forEach((entry, index) => {
			const member = entryMember(entry);
			const result = ExamEntry.options[member]?.safeParse(entry);
			if (result === undefined || result.success) return;
			found.push(
				...memberDiagnostics(
					result.error.issues as ZodIssue[],
					data,
					["questions", index],
					member,
				),
			);
		});
	}
	return found;
}

/**
 * One diagnostic per Zod issue, in the vocabulary of `docs/lint-codes.md`:
 * `schema-error` for an issue with no code of its own. The path has no union
 * tag, and a union that Pydantic discriminates (a question by `type`, an
 * exam entry by its keys) reports only the member the value belongs to. A
 * plain union reports the issues of every member.
 *
 * @param prefix Where `issue.path` starts, for the issues nested in a union.
 */
function issueDiagnostics(
	issue: ZodIssue,
	data: unknown,
	prefix: readonly PathStep[],
	isExamDocument: boolean,
): Diagnostic[] {
	const path = [...prefix, ...issue.path.map((step) => step as PathStep)];

	if (issue.code === "invalid_union") {
		if (issue.note === "No matching discriminator") {
			const at = path.slice(0, -1);
			return [tagDiagnostic(valueAt(data, at), at, isExamDocument)];
		}
		const errors = issue.errors ?? [];
		return unionDiagnostics(errors, data, path, isExamDocument);
	}

	if (issue.code === "unrecognized_keys") {
		return (issue.keys ?? []).map((key) =>
			diagnostic(
				"error",
				"schema-error",
				`Extra inputs are not permitted: ${repr(key)}`,
				[...path, key],
			),
		);
	}
	const named = namedSchemaIssue(issue, path, data);
	if (named !== undefined) return [named];
	if (
		isExamDocument &&
		issue.code === "invalid_value" &&
		path[0] === "grading" &&
		path.length === 2 &&
		(GradingType.options as readonly unknown[]).includes(valueAt(data, path))
	) {
		// exam.md, "Grading": a strategy its question type does not accept
		// is an error of the whole mapping.
		return [diagnostic("error", "schema-error", issue.message, ["grading"])];
	}
	return [diagnostic("error", "schema-error", issue.message, path)];
}

/**
 * Rules of the model that the schema also states as a `pattern` (or as a
 * type): Zod rejects the value first, and the rule's own code is reported
 * instead of `schema-error` (`malformed-uuid`, `malformed-numeric-answer`,
 * `malformed-true-false-marker`).
 */
function namedSchemaIssue(
	issue: ZodIssue,
	path: readonly PathStep[],
	data: unknown,
): Diagnostic | undefined {
	if (issue.code === "invalid_format" && path.at(-1) === "uuid") {
		return uuidDiagnostics(valueAt(data, path), path)[0];
	}
	const field = path.at(-1);
	const value = valueAt(data, path);
	if (field === "answer" || field === "absolute" || field === "relative") {
		if (typeof value === "number" && !Number.isFinite(value)) {
			return nonFiniteDiagnostic(value, path);
		}
		if (field === "answer" && typeof value === "string") {
			return numericAnswerDiagnostic(value, path);
		}
	}
	if (field === "marker" && typeof value === "string") {
		return markerDiagnostic(value, path);
	}
	return undefined;
}

/**
 * The issues of a plain union, one set per member. Pydantic expands a
 * string shorthand (a pattern, a choice) into a mapping first, so a member
 * that only says "wrong type" is left out when another member accepted the
 * type and found a problem in it.
 */
function unionDiagnostics(
	errors: readonly (readonly ZodIssue[])[],
	data: unknown,
	path: readonly PathStep[],
	isExamDocument: boolean,
): Diagnostic[] {
	const isTypeOnly = (member: readonly ZodIssue[]) =>
		member.every(
			(inner) => inner.code === "invalid_type" && inner.path.length === 0,
		);
	const members = errors.some((member) => !isTypeOnly(member))
		? errors.filter((member) => !isTypeOnly(member))
		: errors;
	return members.flatMap((member) =>
		member.flatMap((inner) =>
			issueDiagnostics(inner, data, path, isExamDocument),
		),
	);
}

/**
 * The issues of the member of an exam entry. An `include` or `includeAll`
 * block holds no other field (`unknown-include-field`), which Pydantic checks
 * only once the block's own fields are valid.
 */
function memberDiagnostics(
	issues: readonly ZodIssue[],
	data: unknown,
	entryPath: readonly PathStep[],
	member: number,
): Diagnostic[] {
	if (member === 2) {
		return issues.flatMap((inner) =>
			issueDiagnostics(inner, data, entryPath, true),
		);
	}
	const extra = issues.filter((issue) => issue.code === "unrecognized_keys");
	const others = issues.filter((issue) => issue.code !== "unrecognized_keys");
	if (others.length > 0) {
		return others.flatMap((inner) =>
			issueDiagnostics(inner, data, entryPath, true),
		);
	}
	const key = extra[0]?.keys?.[0];
	return key === undefined
		? []
		: [
				diagnostic(
					"error",
					"unknown-include-field",
					`${repr(key)} is not a field an include block accepts`,
					[...entryPath, key],
				),
			];
}

/** The diagnostic for a question (or exam entry) with no usable `type`. */
function tagDiagnostic(
	value: unknown,
	path: readonly PathStep[],
	isExamDocument: boolean,
): Diagnostic {
	const tag = isRecord(value) ? value.type : undefined;
	if (tag === undefined) {
		const entry =
			isExamDocument && path.length === 2 && path[0] === "questions";
		const message = entry
			? `an entry of \`questions\` needs a \`type\`, or an \`include\` or \`includeAll\` key${includeKeyHint(value)}`
			: "a question needs a `type`";
		return diagnostic("error", "schema-error", message, path);
	}
	const expected = QUESTION_TAGS.map(repr).join(", ");
	return diagnostic(
		"error",
		"schema-error",
		`Input tag ${typeof tag === "string" ? repr(tag) : String(tag)} found using 'type' does not match any of the expected tags: ${expected}`,
		path,
	);
}
