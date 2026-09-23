/**
 * Turning arbitrary text into url-friendly, unique slugs.
 *
 * A port of `mdq/slugify.py`. The strategies are registered by name and
 * dispatched through {@link slugify}, so a caller picks one without knowing
 * which strategies exist.
 */

import unidecode from "unidecode";

/**
 * Slugify one string on its own, with no regard for uniqueness.
 *
 * The equivalent of `python-slugify`'s `slugify()` for the options this
 * module uses. Both implementations transliterate through the same
 * Text::Unidecode table, so they produce the same slug for the same text --
 * which is what keeps an auto-generated question id stable across them.
 *
 * @param text - The text to slugify.
 * @param maxLength - Truncate the result to at most this many characters,
 *   cutting at a word boundary where one fits. Unlimited when omitted.
 */
export function singleSlugify(text: string, maxLength?: number): string {
	const slug = unidecode(text)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (maxLength === undefined || slug.length <= maxLength) {
		return slug;
	}
	return truncateAtWordBoundary(slug, maxLength);
}

/**
 * Cut `slug` down to `maxLength`, dropping whole words where possible.
 *
 * A slug whose very first word is already too long has no boundary to cut
 * at, so it is truncated mid-word rather than reduced to nothing.
 */
function truncateAtWordBoundary(slug: string, maxLength: number): string {
	const kept: string[] = [];
	let length = 0;

	for (const word of slug.split("-")) {
		const next = length === 0 ? word.length : length + 1 + word.length;
		if (next > maxLength) {
			break;
		}
		kept.push(word);
		length = next;
	}

	return kept.length > 0 ? kept.join("-") : slug.slice(0, maxLength);
}

/**
 * A slugifier strategy: given a set of strings, return a mapping from each
 * string to its slug.
 *
 * `forbid` names slugs the strategy must not produce, e.g. ids already taken
 * elsewhere in the document.
 */
export type UniqueSlugifier = (
	items: Iterable<string>,
	options?: { forbid?: Iterable<string> },
) => Map<string, string>;

/** The registered strategies, by name. */
export const SLUGIFIERS: Record<string, UniqueSlugifier> = {};

function slugifier(name: string, fn: UniqueSlugifier): UniqueSlugifier {
	SLUGIFIERS[name] = fn;
	return fn;
}

/**
 * Slugify a set of strings using the named strategy.
 *
 * @throws If `items` holds duplicates, or names an unknown strategy.
 */
export function slugify(
	items: Iterable<string>,
	strategy = "loose",
): Map<string, string> {
	const list = [...items];
	const unique = new Set(list);

	if (unique.size !== list.length) {
		throw new Error("Input strings are not unique");
	}
	const fn = SLUGIFIERS[strategy];
	if (fn === undefined) {
		throw new Error(`Unknown slugifier strategy: ${strategy}`);
	}
	return fn(unique);
}

/**
 * Check that `value` is a valid slug, returning it unchanged.
 *
 * @param coerce - Convert the value into a valid slug instead of rejecting it.
 * @throws If the value is not a valid slug and `coerce` is false.
 */
export function validateSlug(value: string, coerce = false): string {
	if (coerce) {
		return singleSlugify(value);
	}
	if (!value) {
		throw new Error("Slug cannot be empty");
	}
	if (value.startsWith("-") || value.endsWith("-")) {
		throw new Error("Slug cannot start or end with a hyphen");
	}
	if (!/^[a-z0-9-]+$/.test(value)) {
		throw new Error(
			"Slug can only contain lowercase letters, numbers, and hyphens",
		);
	}
	return value;
}

//
// The strategies
//

const SHORT_SLUG_MAX_LENGTH = 24;
const EMPTY_SLUG_PLACEHOLDER = "item";

/**
 * Return `item`'s slug candidates, shortest/easiest first, deduplicated and
 * never empty.
 *
 * The short candidate (the item's first few words, cut at a word boundary)
 * comes first since it usually reads better and is often unique on its own.
 * The full candidate comes next, since two items sharing their first words
 * can still differ later on. Text with nothing sluggable in it at all
 * (empty, whitespace, or symbols only) falls back to a fixed placeholder, so
 * a numeric suffix always has something to attach to.
 */
function slugCandidates(item: string): string[] {
	const short = singleSlugify(item, SHORT_SLUG_MAX_LENGTH);
	const full = singleSlugify(item);
	const candidates = [...new Set([short, full].filter(Boolean))];
	return candidates.length > 0 ? candidates : [EMPTY_SLUG_PLACEHOLDER];
}

/**
 * The default strategy: try increasingly desperate heuristics until one
 * produces a free slug.
 *
 * 1. A short slug made of the item's first few words.
 * 2. The full slug of the item's entire text.
 * 3. The full slug with an incrementing numeric suffix (`-2`, `-3`, ...),
 *    which always succeeds since it is tried arbitrarily many times.
 *
 * Unlike {@link simple}, this never throws on a collision: it always returns
 * a slug for every item, avoiding both duplicates among its own results and
 * anything in `forbid`.
 *
 * Items are processed in sorted order, so the result depends only on the
 * *content* of `items`, never on the order they arrived in.
 */
export const loose = slugifier("loose", (items, options = {}) => {
	const used = new Set(options.forbid ?? []);
	const result = new Map<string, string>();

	for (const item of [...new Set(items)].sort(compareCodePoints)) {
		const candidates = slugCandidates(item);
		const base = candidates[candidates.length - 1] as string;

		let slug = candidates.find((candidate) => !used.has(candidate));
		if (slug === undefined) {
			let counter = 2;
			slug = `${base}-${counter}`;
			while (used.has(slug)) {
				counter += 1;
				slug = `${base}-${counter}`;
			}
		}

		used.add(slug);
		result.set(item, slug);
	}

	return result;
});

/**
 * Slugify each item independently and throw if that collides.
 *
 * Useful where a collision means the document is wrong and should be
 * reported, rather than quietly disambiguated.
 *
 * @throws If two items slugify alike, or an item slugifies to a forbidden slug.
 */
export const simple = slugifier("simple", (items, options = {}) => {
	const forbid = new Set(options.forbid ?? []);
	const result = new Map<string, string>();

	for (const item of new Set(items)) {
		result.set(item, singleSlugify(item));
	}

	const values = new Set(result.values());
	if (values.size !== result.size) {
		throw new Error("Slugifier produced collisions");
	}
	const invalid = [...values].filter((value) => forbid.has(value));
	if (invalid.length > 0) {
		throw new Error(
			`Slugifier produced forbidden slugs: ${invalid.join(", ")}`,
		);
	}

	return result;
});

/**
 * Order strings by code point, the way Python's `sorted()` does.
 *
 * `Array.prototype.sort` defaults to UTF-16 code *unit* order, which puts
 * astral characters before some of the BMP; comparing code points keeps
 * `loose` producing the same order as the Python implementation.
 */
function compareCodePoints(a: string, b: string): number {
	const left = [...a];
	const right = [...b];

	for (let index = 0; index < Math.min(left.length, right.length); index++) {
		const x = (left[index] as string).codePointAt(0) as number;
		const y = (right[index] as string).codePointAt(0) as number;
		if (x !== y) {
			return x - y;
		}
	}
	return left.length - right.length;
}
