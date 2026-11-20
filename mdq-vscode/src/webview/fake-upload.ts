/**
 * The fake host of an upload question in the preview: it keeps the list of
 * files in memory and never sends anything anywhere.
 */

/** One file of an upload response. */
export interface FakeFile {
	readonly name: string;
	readonly path: string;
	readonly size: number;
}

/** The list with `file` replacing the item of the same name, or appended. */
export function withFile(
	list: readonly FakeFile[] | null | undefined,
	file: { name: string; size: number },
): FakeFile[] {
	const item = { name: file.name, path: file.name, size: file.size };
	const current = list ?? [];
	return current.some((f) => f.name === file.name)
		? current.map((f) => (f.name === file.name ? item : f))
		: [...current, item];
}

/** The list without the item named `name`. */
export function withoutFile(
	list: readonly FakeFile[] | null | undefined,
	name: string,
): FakeFile[] {
	return (list ?? []).filter((f) => f.name !== name);
}
