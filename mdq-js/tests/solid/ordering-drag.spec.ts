import type { OrderingLine } from "@mdq/schema/questions.js";
import { dropIndex, relocate } from "@mdq/solid/ordering-drag.js";

const used: OrderingLine[] = [
	[0, "a"],
	[1, "b"],
	[0, "c"],
];
const unused: OrderingLine[] = [
	[0, "x"],
	[2, "y"],
];

describe("dropIndex", () => {
	const centers = [10, 30, 50];

	it("counts the centers above the pointer", () => {
		expect(dropIndex(centers, 0)).toBe(0);
		expect(dropIndex(centers, 11)).toBe(1);
		expect(dropIndex(centers, 40)).toBe(2);
		expect(dropIndex(centers, 51)).toBe(3);
		expect(dropIndex(centers, 1000)).toBe(3);
	});

	it("puts a pointer exactly on a center before that line", () => {
		expect(dropIndex(centers, 30)).toBe(1);
	});

	it("gives 0 for an empty list", () => {
		expect(dropIndex([], 123)).toBe(0);
	});
});

describe("relocate", () => {
	it("moves a line inside the answer", () => {
		expect(
			relocate(
				used,
				unused,
				{ list: "used", index: 0 },
				{ list: "used", index: 2 },
			),
		).toEqual([
			[1, "b"],
			[0, "c"],
			[0, "a"],
		]);
		expect(
			relocate(
				used,
				unused,
				{ list: "used", index: 2 },
				{ list: "used", index: 0 },
			),
		).toEqual([
			[0, "c"],
			[0, "a"],
			[1, "b"],
		]);
	});

	it("counts the target index without the dragged line", () => {
		// Between "b" and "c" once "a" is out of the way.
		expect(
			relocate(
				used,
				unused,
				{ list: "used", index: 0 },
				{ list: "used", index: 1 },
			),
		).toEqual([
			[1, "b"],
			[0, "a"],
			[0, "c"],
		]);
	});

	it("returns null when the line lands where it was", () => {
		for (const index of [0, 1, 2]) {
			expect(
				relocate(
					used,
					unused,
					{ list: "used", index },
					{ list: "used", index },
				),
			).toBeNull();
		}
	});

	it("leaves a line out when it goes to the unused list", () => {
		expect(
			relocate(
				used,
				unused,
				{ list: "used", index: 1 },
				{ list: "unused", index: 0 },
			),
		).toEqual([
			[0, "a"],
			[0, "c"],
		]);
	});

	it("inserts an unused line at the target, with its pool level", () => {
		expect(
			relocate(
				used,
				unused,
				{ list: "unused", index: 1 },
				{ list: "used", index: 1 },
			),
		).toEqual([
			[0, "a"],
			[2, "y"],
			[1, "b"],
			[0, "c"],
		]);
		expect(
			relocate(
				used,
				unused,
				{ list: "unused", index: 0 },
				{ list: "used", index: 3 },
			),
		).toEqual([...used, [0, "x"]]);
	});

	it("does nothing inside the unused list", () => {
		expect(
			relocate(
				used,
				unused,
				{ list: "unused", index: 0 },
				{ list: "unused", index: 1 },
			),
		).toBeNull();
	});

	it("does not change its inputs", () => {
		const before = structuredClone(used);
		relocate(
			used,
			unused,
			{ list: "used", index: 0 },
			{ list: "used", index: 2 },
		);
		relocate(
			used,
			unused,
			{ list: "unused", index: 0 },
			{ list: "used", index: 0 },
		);
		expect(used).toEqual(before);
	});

	it("returns null for an index out of range", () => {
		expect(
			relocate(
				used,
				unused,
				{ list: "used", index: 5 },
				{ list: "used", index: 0 },
			),
		).toBeNull();
		expect(
			relocate(
				used,
				unused,
				{ list: "unused", index: 9 },
				{ list: "used", index: 0 },
			),
		).toBeNull();
	});

	it("clamps a target past the end to the end", () => {
		expect(
			relocate(
				used,
				unused,
				{ list: "used", index: 0 },
				{ list: "used", index: 99 },
			),
		).toEqual([
			[1, "b"],
			[0, "c"],
			[0, "a"],
		]);
	});
});
