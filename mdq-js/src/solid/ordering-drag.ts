import type { OrderingLine } from "../schema/questions.js";

/** Where a line sits: a list and an index in it. */
export interface Slot {
	list: "used" | "unused";
	index: number;
}

/**
 * The insertion index among `centers` (the lines without the dragged one) for
 * a pointer at `y`.
 *
 * It is the number of centers above the pointer. A pointer exactly on a center
 * lands before that line.
 */
export function dropIndex(centers: readonly number[], y: number): number {
	let count = 0;
	for (const center of centers) {
		if (center < y) count++;
	}
	return count;
}

/**
 * The new `used` list after moving the line at `from` to `to`, or `null` when
 * nothing changes.
 *
 * `to.index` counts the lines of the target list without the dragged one, and
 * is clamped to the end of the list. An unused line comes back with the level
 * it has in the pool. The order of `unused` is the order of the pool, so a
 * move inside it changes nothing.
 */
export function relocate(
	used: readonly OrderingLine[],
	unused: readonly OrderingLine[],
	from: Slot,
	to: Slot,
): OrderingLine[] | null {
	const source = from.list === "used" ? used : unused;
	const line = source[from.index];
	if (line === undefined || from.index < 0) return null;
	if (from.list === "unused" && to.list === "unused") return null;

	const lines = [...used];
	if (from.list === "used") lines.splice(from.index, 1);
	if (to.list === "unused") return lines;

	const index = Math.max(0, Math.min(to.index, lines.length));
	if (from.list === "used" && index === from.index) return null;
	lines.splice(index, 0, [line[0], line[1]]);
	return lines;
}
