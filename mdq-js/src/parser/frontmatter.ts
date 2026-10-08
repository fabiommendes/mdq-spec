/**
 * Splitting MDQ source into its optional YAML frontmatter and the body that
 * follows, and reading the frontmatter's own two special pieces: the leading
 * `#`-comment block and the YAML mapping itself.
 *
 * A port of the frontmatter helpers in `mdq-py/mdq/_parser/_frontmatter.py`
 * (`_split_frontmatter`, `_extract_comment`, `_load_frontmatter_yaml`,
 * `load_yaml`, the known-keys tables and `_unknown_frontmatter_warnings`).
 */

import { FAILSAFE_SCHEMA, load, Type, YAMLException } from "js-yaml";
import { type Diagnostic, diagnostic, type PathStep } from "../diagnostics.js";
import { YamlSyntaxError } from "../errors.js";
import { repr, strip } from "./text.js";
import { splitLines } from "./tree.js";

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

/** The byte order mark. Removed at the start of a file, text anywhere else. */
const BOM = "﻿";

/**
 * One line and its line ending, as Python's `split_lines(keepends=True)`:
 * only `\r\n`, `\r` and `\n` end a line.
 */
const LINE_RE = /[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/gu;

/**
 * Split `source` into its raw frontmatter body and the document text that
 * follows it.
 *
 * A byte order mark at the start of `input` is removed in every case.
 *
 * Returns `[null, source]` unchanged when `source` carries no frontmatter
 * block at all -- including when a leading `---` is never closed, which is
 * treated as ordinary document text rather than silently swallowed.
 */
export function splitFrontmatter(input: string): [string | null, string] {
	const source = input.startsWith(BOM) ? input.slice(BOM.length) : input;
	if (!source.startsWith("---")) {
		return [null, source];
	}

	const lines = source.match(LINE_RE) ?? [];
	const first = lines[0];
	if (first === undefined || stripEol(first) !== "---") {
		return [null, source];
	}

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (line !== undefined && stripEol(line) === "---") {
			const frontmatter = lines.slice(1, i).join("");
			const rest = lines.slice(i + 1).join("");
			return [frontmatter, rest];
		}
	}

	return [null, source];
}

function stripEol(line: string): string {
	return line.replace(/(?:\r\n|\r|\n)$/u, "");
}

/**
 * Pull out the leading `#`-comment block from a frontmatter body, per the
 * `comment_string` rule in `docs/question-types/generic.md`. A blank line
 * (with no leading `#`) breaks it; blank lines before the first `#` line are
 * skipped.
 *
 * Returns `undefined` when the frontmatter opens with no comment at all, or
 * with a comment string of no character (a lone `#`). A comment string of
 * only whitespace is returned as it is.
 */
export function extractComment(frontmatterText: string): string | undefined {
	const lines = splitLines(frontmatterText);

	let i = 0;
	while (i < lines.length && strip(lines[i] ?? "", " \t") === "") {
		i++;
	}

	const commentLines: string[] = [];
	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined || !line.startsWith("#")) {
			break;
		}
		let content = line.slice(1);
		if (content.startsWith(" ")) {
			content = content.slice(1);
		}
		commentLines.push(content);
		i++;
	}

	return commentLines.join(" ") || undefined;
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
	if (!isPlainRecord(data)) {
		return {};
	}
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(data)) {
		if (value !== null || keepNull.includes(key)) {
			result[key] = value;
		}
	}
	return result;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `generic.md`: `tags` is a list, or a single comma-delimited string that is
 * split into one. Any other value is returned as it is, for the schema to
 * report, exactly as `mdq-py`'s `_normalize_tags` does.
 */
export function normalizeTags(tags: unknown): unknown {
	if (typeof tags === "string") {
		return tags
			.split(",")
			.map((part) => strip(part))
			.filter((part) => part !== "");
	}
	return Array.isArray(tags) ? [...tags] : tags;
}

/**
 * One `unknown-frontmatter-key` diagnostic per key of `front` that is not
 * in `known`, in frontmatter order. The parser is the only component that
 * knows which keys it consumes, so it reports the ones it does not.
 */
export function unknownFrontmatterWarnings(
	front: Readonly<Record<string, unknown>>,
	known: ReadonlySet<string>,
	pathPrefix: readonly PathStep[] = [],
): Diagnostic[] {
	return Object.keys(front)
		.filter((key) => !known.has(key))
		.map((key) =>
			diagnostic(
				"warning",
				"unknown-frontmatter-key",
				`${repr(key)} is not a recognized frontmatter field and is ignored`,
				[...pathPrefix, key],
			),
		);
}

/**
 * Frontmatter keys every question type accepts, read by
 * `applyCommonFrontmatter` -- except `type`, which picks the parsing path.
 */
export const COMMON_QUESTION_KEYS: ReadonlySet<string> = new Set([
	"type",
	"id",
	"uuid",
	"title",
	"author",
	"locale",
	"tags",
	"meta",
	"weight",
]);

/**
 * Frontmatter keys holding pattern lists, copied through verbatim. A port
 * of `PATTERN_LIST_KEYS` in `mdq-py/mdq/_parser/_frontmatter.py`.
 */
export const PATTERN_LIST_KEYS = [
	"accept",
	"reject",
	"preAccept",
	"preReject",
] as const;

/**
 * Per-type frontmatter keys, beyond `COMMON_QUESTION_KEYS`. A port of
 * `TYPE_QUESTION_KEYS`. Fill-in `preAccept`/`preReject` are maps from blank
 * id to pattern list, moved onto the blanks by the parser.
 */
export const TYPE_QUESTION_KEYS: Readonly<Record<string, ReadonlySet<string>>> =
	{
		"multiple-choice": new Set(["shuffle", "grading"]),
		"multiple-selection": new Set(["shuffle", "grading"]),
		"true-false": new Set(["shuffle", "grading"]),
		"fill-in": new Set([
			"shuffle",
			"grading",
			"diacritics",
			"unmatched",
			"preAccept",
			"preReject",
		]),
		essay: new Set(["input", "highlight"]),
		ordering: new Set([
			"content",
			"highlight",
			"indentation",
			"unmatched",
			"normalizations",
		]),
		"short-answer": new Set([
			"diacritics",
			"unmatched",
			"incorrectFeedback",
			...PATTERN_LIST_KEYS,
		]),
		numeric: new Set(["domain", "decimalPlaces", "unit"]),
	};

/** `unknown-frontmatter-key` warnings for one question's frontmatter. */
export function questionFrontmatterWarnings(
	front: Readonly<Record<string, unknown>>,
	questionType: string,
): Diagnostic[] {
	const known = new Set([
		...COMMON_QUESTION_KEYS,
		...(TYPE_QUESTION_KEYS[questionType] ?? []),
	]);
	return unknownFrontmatterWarnings(front, known);
}

/**
 * Copy the frontmatter's pattern lists onto the parsed document, for
 * whichever of them `doc` does not already carry. A port of
 * `_copy_pattern_lists`.
 */
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
