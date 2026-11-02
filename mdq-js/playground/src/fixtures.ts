/**
 * The questions the playground lists: every valid question of the shared
 * corpus (`examples/valid/<type>/*.mdq.md`) and the local ones in
 * `fixtures/`, which hold cases the corpus does not need, such as a long stem
 * to test the layout.
 */

export interface Fixture {
	/** `<group>/<name>`, also the route. */
	readonly id: string;
	readonly group: string;
	readonly name: string;
	readonly source: string;
}

const corpus = import.meta.glob<string>("../../../examples/valid/*/*.mdq.md", {
	query: "?raw",
	import: "default",
	eager: true,
});

const local = import.meta.glob<string>("../fixtures/*.mdq.md", {
	query: "?raw",
	import: "default",
	eager: true,
});

function fixture(path: string, source: string, group?: string): Fixture {
	const parts = path.split("/");
	const name = (parts.at(-1) ?? path).replace(/\.mdq\.md$/, "");
	const owner = group ?? parts.at(-2) ?? "";
	return { id: `${owner}/${name}`, group: owner, name, source };
}

export const fixtures: readonly Fixture[] = [
	...Object.entries(local).map(([path, source]) =>
		fixture(path, source, "local"),
	),
	...Object.entries(corpus)
		// An exam is not a question; the workbench shows one question.
		.filter(([path]) => !path.includes("/exam/"))
		.map(([path, source]) => fixture(path, source)),
];

export function findFixture(id: string): Fixture | undefined {
	return fixtures.find((item) => item.id === id);
}

export function groups(): Map<string, Fixture[]> {
	const result = new Map<string, Fixture[]>();
	for (const item of fixtures) {
		const list = result.get(item.group) ?? [];
		list.push(item);
		result.set(item.group, list);
	}
	return result;
}
