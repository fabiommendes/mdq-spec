/**
 * Splitting MDQ source into its optional YAML frontmatter and the body that
 * follows, and reading the frontmatter's own two special pieces: the leading
 * `#`-comment block and the YAML mapping itself.
 *
 * A port of the frontmatter helpers in `mdq-py/mdq/_parser/_frontmatter.py`
 * (`_split_frontmatter`, `_extract_comment`, `_load_frontmatter_yaml`).
 */

import { DEFAULT_SCHEMA, load, Type } from "js-yaml";
import { strip } from "./text.js";
import { splitLines } from "./tree.js";

//
// YAML 1.1 scalar resolution, equal to PyYAML's `SafeLoader`.
//
// js-yaml's `DEFAULT_SCHEMA` is close to PyYAML's `SafeLoader` -- both
// resolve YAML 1.1 forms (`yes`/`no`/`on`/`off` booleans, `0777` octal,
// `Null`/`~`, ...) rather than the stricter YAML 1.2 core schema -- except
// for three differences: js-yaml's `bool` type only recognizes
// `true`/`false`, its `int`/`float` types resolve YAML 1.1 sexagesimal
// (`1:30`) the same way PyYAML's plain `SafeLoader` does (which
// `_FrontmatterLoader` in `mdq-py/mdq/_parser/_frontmatter.py` turns off for MDQ, so
// an `HH:MM` duration needs no quoting), and its `float` type accepts an
// unsigned exponent (`1e3`) where PyYAML requires a sign. `timestamp` and
// `merge` already match, so only `bool`/`int`/`float`/`null` are replaced.
//
// Each of the four replacement regexes below matches a disjoint set of
// strings from the other three (an `int` never contains `.`, a `float`
// always does or is `.inf`/`.nan`, `bool` and `null` never start with a
// digit or sign, ...), so unlike PyYAML's own first-character bucketing,
// the order these are registered in does not affect which one a given
// scalar resolves to.
//

/** PyYAML's default `bool` pattern: YAML 1.1's six spellings, any case. */
const BOOL_RE =
	/^(?:yes|Yes|YES|no|No|NO|true|True|TRUE|false|False|FALSE|on|On|ON|off|Off|OFF)$/;

const TRUE_WORDS = new Set(["yes", "true", "on"]);

const boolType = new Type("tag:yaml.org,2002:bool", {
	kind: "scalar",
	resolve: (data: unknown) => typeof data === "string" && BOOL_RE.test(data),
	construct: (data: string) => TRUE_WORDS.has(data.toLowerCase()),
});

/**
 * `_INT_RE` (`mdq-py/mdq/_parser/_frontmatter.py`): PyYAML's `int` pattern minus the
 * sexagesimal alternative.
 */
const INT_RE =
	/^(?:[-+]?0b[01_]+|[-+]?0[0-7_]+|[-+]?(?:0|[1-9][0-9_]*)|[-+]?0x[0-9a-fA-F_]+)$/;

const intType = new Type("tag:yaml.org,2002:int", {
	kind: "scalar",
	resolve: (data: unknown) => typeof data === "string" && INT_RE.test(data),
	construct: (data: string) => {
		let value = data.replace(/_/g, "");
		let sign = 1;
		if (value.startsWith("+") || value.startsWith("-")) {
			sign = value.startsWith("-") ? -1 : 1;
			value = value.slice(1);
		}
		if (value === "0") {
			return 0;
		}
		if (value.startsWith("0")) {
			if (value[1] === "b") {
				return sign * Number.parseInt(value.slice(2), 2);
			}
			if (value[1] === "x") {
				return sign * Number.parseInt(value.slice(2), 16);
			}
			// A leading zero with no `0b`/`0x` marker is YAML 1.1 octal
			// (`0777`), not the `0o` form YAML 1.2 uses.
			return sign * Number.parseInt(value, 8);
		}
		return sign * Number.parseInt(value, 10);
	},
});

/**
 * `_FLOAT_RE` (`mdq-py/mdq/_parser/_frontmatter.py`): PyYAML's `float` pattern minus
 * the sexagesimal alternative -- and, same as PyYAML, an exponent needs an
 * explicit sign (`1e3` stays a string; `1e+3` is a float).
 */
const FLOAT_RE =
	/^(?:[-+]?(?:[0-9][0-9_]*)\.[0-9_]*(?:[eE][-+][0-9]+)?|\.[0-9][0-9_]*(?:[eE][-+][0-9]+)?|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/;

const floatType = new Type("tag:yaml.org,2002:float", {
	kind: "scalar",
	resolve: (data: unknown) => typeof data === "string" && FLOAT_RE.test(data),
	construct: (data: string) => {
		const value = data.replace(/_/g, "").toLowerCase();
		const sign = value.startsWith("-") ? -1 : 1;
		const rest =
			value.startsWith("+") || value.startsWith("-") ? value.slice(1) : value;
		if (rest === ".inf") {
			return sign * Number.POSITIVE_INFINITY;
		}
		if (rest === ".nan") {
			return Number.NaN;
		}
		return sign * Number.parseFloat(rest);
	},
});

/** PyYAML's default `null` pattern: `~`, `null`/`Null`/`NULL`, or empty. */
const NULL_RE = /^(?:~|null|Null|NULL|)$/;

const nullType = new Type("tag:yaml.org,2002:null", {
	kind: "scalar",
	resolve: (data: unknown) => typeof data === "string" && NULL_RE.test(data),
	construct: () => null,
});

/**
 * `DEFAULT_SCHEMA` with `bool`/`int`/`float`/`null` swapped for the
 * PyYAML-equal versions above. `Schema#extend` replaces a type in place
 * when its tag already appears in the base schema, so this does not
 * reorder or duplicate anything -- `timestamp` and `merge` pass through
 * unchanged.
 */
const FRONTMATTER_SCHEMA = DEFAULT_SCHEMA.extend({
	implicit: [boolType, intType, floatType, nullType],
});

/** The byte order mark. Removed at the start of a file, text anywhere else. */
const BOM = "\ufeff";

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

	const lines = source === "" ? [] : source.split(/(?<=\n)/);
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
	return line.replace(/\r?\n$/, "");
}

/**
 * Pull out the leading `#`-comment block from a frontmatter body, per the
 * `comment_string` rule in `docs/question-types/generic.md`. A blank line
 * (with no leading `#`) breaks it; blank lines before the first `#` line are
 * skipped.
 *
 * Returns `undefined` when the frontmatter opens with no comment at all.
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

	return commentLines.length > 0 ? commentLines.join(" ") : undefined;
}

/**
 * Parse a frontmatter body as YAML, returning an empty mapping for
 * anything that does not parse to a mapping (an empty document, a scalar,
 * a list, ...).
 */
export function loadFrontmatterYaml(text: string): Record<string, unknown> {
	const data: unknown = load(text, { schema: FRONTMATTER_SCHEMA });
	return isPlainRecord(data) ? data : {};
}

/**
 * `loadFrontmatterYaml` for the frontmatter of an exam: a YAML timestamp
 * becomes a `YamlTimestamp` that holds the `isoformat()` of the `date` or
 * `datetime` PyYAML builds (`construct_yaml_timestamp`), not a JavaScript
 * `Date`. A `Date` loses the UTC offset and the difference between a date
 * and a date-time, which the exam `start` keeps. Every other scalar resolves
 * as in `loadFrontmatterYaml`.
 */
export function loadExamFrontmatterYaml(text: string): Record<string, unknown> {
	void text;
	throw new Error("not implemented");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `generic.md`: `tags` is a list, or a single comma-delimited string that is
 * split into one. Elements of an already-list value pass through
 * unchanged, exactly as `mdq-py`'s `_normalize_tags` does -- coercing them
 * is the schema's job, not the parser's.
 */
export function normalizeTags(tags: unknown): unknown[] {
	if (typeof tags === "string") {
		return tags
			.split(",")
			.map((part) => strip(part))
			.filter((part) => part !== "");
	}
	return Array.isArray(tags) ? tags : [];
}

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
 * Copy the frontmatter's pattern lists onto the parsed document, for
 * whichever of them `doc` does not already carry. A port of
 * `_copy_pattern_lists`, shared by a short-answer question's body and its
 * fill-in blanks.
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
