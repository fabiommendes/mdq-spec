/**
 * Frontmatter parsing shared by every question type and by exams.
 *
 * Splitting the leading `---`-fenced YAML block from the body
 * (`splitFrontmatter`), loading it (`loadFrontmatterYaml`), and flagging the
 * keys a frontmatter may not hold (`invalidFrontmatterFields`) are generic
 * enough that `MDQParser` and the exam parser both need them as-is. The
 * allowed keys come from the frontmatter schemas of the bundle
 * (`$defs/frontmatter-<type>`), which the spec builds from the frontmatter
 * tables.
 *
 * A port of `mdq-py/mdq/_parser/_frontmatter.py`.
 */

import { FAILSAFE_SCHEMA, load, Type, YAMLException } from "js-yaml";
import { type Diagnostic, diagnostic, type PathStep } from "../diagnostics.js";
import { YamlSyntaxError } from "../errors.js";
import { splitLines, stripBom } from "../markdown.js";
import bundleJson from "../mdq.schema.json";
import { repr, strip } from "./text.js";

/**
 * The question types that choose a grading strategy and may be shuffled,
 * read by `MDQParser.applyTypeSpecificFrontmatter`.
 */
export const GRADED_QUESTION_TYPES: readonly string[] = [
	"multiple-choice",
	"multiple-selection",
	"true-false",
	"fill-in",
];

/**
 * Split source text into `[raw frontmatter body, remaining document text]`.
 *
 * Returns `[null, text]` if there is no frontmatter block at all. A byte order
 * mark at the start of `text` is removed in both cases.
 */
export function splitFrontmatter(input: string): [string | null, string] {
	const text = stripBom(input);
	if (!text.startsWith("---")) return [null, text];

	const lines = splitLines(text, true);
	if (stripEol(lines[0] ?? "") !== "---") return [null, text];

	for (let i = 1; i < lines.length; i++) {
		if (stripEol(lines[i] ?? "") === "---") {
			return [lines.slice(1, i).join(""), lines.slice(i + 1).join("")];
		}
	}

	// Unterminated frontmatter marker: treat the whole thing as a document
	// with no frontmatter, rather than silently swallowing the file.
	return [null, text];
}

function stripEol(line: string): string {
	return line.replace(/[\r\n]+$/u, "");
}

/**
 * Pull out the leading `#`-comment block, per the `comment_string` rule in
 * docs/question-types/generic.md. A blank line breaks it. The joined string
 * is stripped; an empty result is not stored (`null`).
 */
export function extractComment(frontmatterText: string): string | null {
	const lines = splitLines(frontmatterText);
	let i = 0;
	// base.md, "Frontmatter": a blank line holds only spaces and tabs.
	while (i < lines.length && strip(lines[i] ?? "", " \t") === "") i++;

	const commentLines: string[] = [];
	while (i < lines.length && (lines[i] ?? "").startsWith("#")) {
		let content = (lines[i] ?? "").slice(1);
		if (content.startsWith(" ")) content = content.slice(1);
		commentLines.push(content);
		i++;
	}
	return strip(commentLines.join(" ")) || null;
}

//
// YAML 1.2 Core schema scalars (base.md, "Frontmatter"), in place of the
// YAML 1.1 ones js-yaml's `DEFAULT_SCHEMA` and PyYAML resolve: no
// `yes`/`no`/`on`/`off` booleans, no timestamps, no base-60 `1:30`, no
// `0b`/`_` numbers, no leading-zero octal (`010` is 10), no merge key. The
// patterns are the ones `_CORE_RESOLVERS` in
// `mdq-py/mdq/_parser/_frontmatter.py` registers, so both loaders read the
// same text as the same value.
//

const NULL_RE = /^(?:~|null|Null|NULL|)$/u;
const BOOL_RE = /^(?:true|True|TRUE|false|False|FALSE)$/u;
const INT_RE = /^(?:[-+]?[0-9]+|0o[0-7]+|0x[0-9a-fA-F]+)$/u;
const FLOAT_RE =
	/^(?:[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/u;

const nullType = new Type("tag:yaml.org,2002:null", {
	kind: "scalar",
	resolve: (data: unknown) => data === null || NULL_RE.test(String(data)),
	construct: () => null,
});

const boolType = new Type("tag:yaml.org,2002:bool", {
	kind: "scalar",
	resolve: (data: unknown) => typeof data === "string" && BOOL_RE.test(data),
	construct: (data: string) => data.toLowerCase() === "true",
});

/** YAML 1.2 Core integers: decimal, `0o` octal, `0x` hex. */
const intType = new Type("tag:yaml.org,2002:int", {
	kind: "scalar",
	resolve: (data: unknown) => typeof data === "string" && INT_RE.test(data),
	construct: (data: string) => {
		if (data.startsWith("0o")) return Number.parseInt(data.slice(2), 8);
		if (data.startsWith("0x")) return Number.parseInt(data.slice(2), 16);
		return Number.parseInt(data, 10);
	},
});

const floatType = new Type("tag:yaml.org,2002:float", {
	kind: "scalar",
	resolve: (data: unknown) => typeof data === "string" && FLOAT_RE.test(data),
	construct: (data: string) => {
		const lower = data.toLowerCase();
		const sign = lower.startsWith("-") ? -1 : 1;
		const rest =
			lower.startsWith("+") || lower.startsWith("-") ? lower.slice(1) : lower;
		if (rest === ".inf") return sign * Number.POSITIVE_INFINITY;
		if (rest === ".nan") return Number.NaN;
		return sign * Number.parseFloat(rest);
	},
});

/**
 * The YAML 1.2 Core schema: `FAILSAFE_SCHEMA` (strings, sequences and
 * mappings) plus the four scalar types above. js-yaml's own `CORE_SCHEMA`
 * keeps YAML 1.1 forms (`0b1`, `1_000`), so it is not used.
 */
export const CORE_SCHEMA = FAILSAFE_SCHEMA.extend({
	implicit: [nullType, boolType, intType, floatType],
});

/**
 * Load MDQ YAML: a Markdown frontmatter or a YAML document. A key written
 * twice in one mapping is an error (base.md, "Frontmatter"), which js-yaml
 * reports on its own.
 *
 * @throws {YAMLException} `text` is not valid YAML, or repeats a key.
 */
export function loadYaml(text: string): unknown {
	return load(text, { schema: CORE_SCHEMA });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Load the frontmatter mapping. A key with a `null` value is the same as an
 * absent key (base.md, "Frontmatter"), so it is dropped, except the keys in
 * `keepNull`. Anything that is not a mapping gives an empty one.
 *
 * @throws {YamlSyntaxError} The frontmatter is not valid YAML, or repeats a
 *   key.
 */
export function loadFrontmatterYaml(
	text: string,
	keepNull: readonly string[] = [],
): Record<string, unknown> {
	let data: unknown;
	try {
		data = loadYaml(text);
	} catch (error) {
		if (error instanceof YAMLException) {
			throw new YamlSyntaxError(`invalid YAML frontmatter: ${error.message}`);
		}
		throw error;
	}
	if (!isPlainRecord(data)) return {};
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== null || keepNull.includes(key)) result[key] = value;
	}
	return result;
}

interface SchemaNode {
	readonly properties?: Readonly<Record<string, unknown>>;
	readonly allOf?: readonly unknown[];
}

/** The bundled schema (`src/mdq.schema.json`). */
const DEFS = (bundleJson as { $defs: Record<string, SchemaNode> }).$defs;

const frontmatterFieldsCache = new Map<string, ReadonlySet<string>>();

/**
 * The keys a frontmatter may hold, from the frontmatter schema of the bundle
 * (`$defs/frontmatter-<type>`, built from the frontmatter tables).
 */
function frontmatterFields(documentType: string): ReadonlySet<string> {
	let fields = frontmatterFieldsCache.get(documentType);
	if (fields === undefined) {
		fields = new Set(
			Object.keys(DEFS[`frontmatter-${documentType}`]?.properties ?? {}),
		);
		frontmatterFieldsCache.set(documentType, fields);
	}
	return fields;
}

/**
 * Every field of the document type in the bundle, wherever its schema
 * declares it. The fields that are not in the frontmatter schema are the ones
 * the body sets.
 */
function schemaFields(documentType: string): ReadonlySet<string> {
	const fields = new Set<string>();
	for (const stem of [documentType, "question-base"]) {
		const schema = DEFS[stem];
		if (schema === undefined) continue;
		for (const key of Object.keys(schema.properties ?? {})) fields.add(key);
		for (const member of schema.allOf ?? []) {
			if (isPlainRecord(member)) {
				const properties = (member as SchemaNode).properties;
				for (const key of Object.keys(properties ?? {})) fields.add(key);
			}
		}
	}
	return fields;
}

/**
 * How the body sets each field a frontmatter cannot hold, as a hint for the
 * `invalid-frontmatter-field` message. A `type/field` entry takes precedence
 * over the entry of the `field` alone.
 */
const BODY_SYNTAX: Readonly<Record<string, string>> = {
	stem: "the stem is the text before the body",
	epilogue: "the epilogue is the text after the body",
	comment: "the comment is the leading `#` lines of the frontmatter",
	choices: "write the choices as the items of a list, such as `* [*] Brasília`",
	answer: "write `[numeric(unit)]: value +- tolerance`",
	tolerance: "write `[numeric(unit)]: value +- tolerance`",
	unit: "write `[numeric(unit)]: value`",
	"short-answer/accept": "write a `[short-answer]:` block",
	"short-answer/reject": "write a `[short-answer/reject]:` block",
	"ordering/accept": "write a `## [accept]` section",
	"ordering/reject": "write a `## [reject]` section",
	"ordering/content": "a code block implies `code`, a list implies `text`",
	"ordering/highlight":
		"the language of the `[ordering]:` fence is the highlight",
	lines: "write the lines under the `[ordering]:` tag",
	extra: "write a `## [extra]` section",
	blanks: "write `[^id]` markers in the stem and `[^id]:` definitions",
	answerKey: "write a `## [answer-key]` section",
	instructions: "write the text between the title and the first question",
	questions: "write the questions as blocks separated by `===`",
};

/**
 * One `invalid-frontmatter-field` error `Diagnostic` per key of `front` that
 * is not in the frontmatter schema of `documentType`, in frontmatter order
 * (base.md, "Frontmatter"). A `documentType` with no schema, such as `quiz`,
 * has no diagnostic here.
 *
 * The message says when the key is a field the body sets, and how.
 */
export function invalidFrontmatterFields(
	front: Readonly<Record<string, unknown>>,
	documentType: string,
	pathPrefix: readonly PathStep[] = [],
): Diagnostic[] {
	if (!Object.hasOwn(DEFS, `frontmatter-${documentType}`)) {
		return []; // not a document type: the schema reports the `type`
	}
	const allowed = frontmatterFields(documentType);
	const bodyFields = new Set(
		[...schemaFields(documentType)].filter((key) => !allowed.has(key)),
	);
	const diagnostics: Diagnostic[] = [];
	for (const key of Object.keys(front)) {
		if (allowed.has(key)) continue;
		let message: string;
		if (bodyFields.has(key)) {
			const hint = BODY_SYNTAX[`${documentType}/${key}`] ?? BODY_SYNTAX[key];
			message = `${repr(key)} is a field the body sets, not a frontmatter field`;
			message += hint ? `: ${hint}` : "";
		} else {
			message = `${repr(key)} is not a frontmatter field of a ${documentType}`;
		}
		diagnostics.push(
			diagnostic("error", "invalid-frontmatter-field", message, [
				...pathPrefix,
				key,
			]),
		);
	}
	return diagnostics;
}

/**
 * Frontmatter keys holding pattern lists, copied through verbatim. The
 * `accept` and `reject` lists are set by body blocks only.
 */
export const PATTERN_LIST_KEYS = ["preAccept", "preReject"] as const;

/** Copy the frontmatter's pattern lists onto the parsed document. */
export function copyPatternLists(
	front: Readonly<Record<string, unknown>>,
	doc: Record<string, unknown>,
): void {
	for (const key of PATTERN_LIST_KEYS) {
		if (Object.hasOwn(front, key) && !Object.hasOwn(doc, key)) {
			doc[key] = front[key];
		}
	}
}

/**
 * The document fields that exams and questions take from the frontmatter and
 * from its leading comment (base.md, "Frontmatter").
 *
 * Values pass through unconverted: `id: 2024` is not a string, and the model
 * reports it. A null `id` or `tags` is absent.
 */
export function commonFrontmatter(
	front: Readonly<Record<string, unknown>>,
	comment: string | null,
): Record<string, unknown> {
	const fields: Record<string, unknown> = {};
	if (comment !== null) fields.comment = comment;
	if (front.id !== undefined && front.id !== null) fields.id = front.id;
	for (const key of ["uuid", "title", "author", "locale"]) {
		if (Object.hasOwn(front, key)) fields[key] = front[key];
	}
	if (front.tags !== undefined && front.tags !== null) {
		fields.tags = normalizeTags(front.tags);
	}
	if (Object.hasOwn(front, "meta")) fields.meta = front.meta;
	return fields;
}

/**
 * generic.md: `tags` is a list, or a single comma-delimited string that is
 * split into one. Exams and questions share the rule. An empty part after a
 * final comma is dropped; any other empty part is kept, for the model to
 * report as `blank-text`. Any other value is returned as it is, for the model
 * to report.
 */
export function normalizeTags(tags: unknown): unknown {
	if (typeof tags === "string") {
		const parts = tags.split(",").map((part) => strip(part));
		if (parts.length > 1 && parts[parts.length - 1] === "") parts.pop();
		return parts;
	}
	return Array.isArray(tags) ? [...tags] : tags;
}
