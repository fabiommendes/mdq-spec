/**
 * Hint for a key that misspells an exam include key (`include`,
 * `includeAll`), shared by the dict/YAML/JSON loader and the Markdown parser.
 *
 * A port of `mdq-py/mdq/_include_keys.py`.
 */

/** The include keys, written the way the spec spells them. */
const INCLUDE_KEYS = ["include", "includeAll"] as const;

function normalizedKey(key: string): string {
	return key.replaceAll("-", "").replaceAll("_", "").toLowerCase();
}

/**
 * `[key, includeKey]` for the first key of `entry` that misspells an include
 * key, or `undefined` if none does.
 *
 * A key matches when it equals an include key once case, `-` and `_` are
 * ignored. A key spelled exactly right is not a misspelling.
 */
export function misspelledIncludeKey(
	entry: unknown,
): readonly [string, string] | undefined {
	if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
		return undefined;
	}
	for (const key of Object.keys(entry)) {
		if ((INCLUDE_KEYS as readonly string[]).includes(key)) continue;
		for (const includeKey of INCLUDE_KEYS) {
			if (normalizedKey(key) === includeKey.toLowerCase()) {
				return [key, includeKey];
			}
		}
	}
	return undefined;
}

/**
 * ` (did you mean `includeAll` instead of `include-all`?)` for the first key
 * of `entry` that misspells an include key, or `""` if none does.
 */
export function includeKeyHint(entry: unknown): string {
	const found = misspelledIncludeKey(entry);
	if (found === undefined) return "";
	const [key, includeKey] = found;
	return ` (did you mean \`${includeKey}\` instead of \`${key}\`?)`;
}
