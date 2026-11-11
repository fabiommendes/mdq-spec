import { createSignal } from "solid-js";
import { hydrate } from "solid-js/web";
import { inject } from "vitest";
import { type CaseName, cases, views } from "./hydration.cases.js";

type Field = HTMLInputElement | HTMLTextAreaElement;

/**
 * Hydrates the server HTML of a case.
 *
 * Returns the field the server HTML had, the signal that drives the answer
 * and the dispose function of the hydrated tree.
 */
function hydrateCase(name: CaseName, selector: string) {
	const html = inject("serverHtml")[name];
	if (html === undefined) throw new Error(`no server HTML for "${name}"`);
	const root = document.createElement("div");
	root.innerHTML = html;
	document.body.append(root);
	const served = root.querySelector<Field>(selector);
	if (!served)
		throw new Error(`no ${selector} in the server HTML of "${name}"`);

	const { view, answer } = cases[name];
	const [current, setCurrent] = createSignal<string>(answer);
	hydrate(() => views[view](current), root);
	const hydrated = root.querySelector<Field>(selector);
	return { served, hydrated, setAnswer: setCurrent };
}

beforeEach(() => {
	globalThis._$HY = { events: [], completed: new WeakSet(), r: {} };
});

afterEach(() => {
	document.body.innerHTML = "";
});

describe("essay", () => {
	it("shows the saved text in the textarea after hydration", () => {
		const { served, hydrated } = hydrateCase("essay", "textarea");
		expect(hydrated).toBe(served);
		expect(hydrated?.value).toBe("saved essay");
	});

	it("keeps a leading line break after hydration", () => {
		const { served, hydrated } = hydrateCase(
			"essay-leading-newline",
			"textarea",
		);
		expect(hydrated).toBe(served);
		expect(hydrated?.value).toBe("\nsecond line");
	});

	it("follows the answer when it changes after hydration", () => {
		const { served, hydrated, setAnswer } = hydrateCase("essay", "textarea");
		expect(hydrated).toBe(served);
		setAnswer("rewritten");
		expect(hydrated?.value).toBe("rewritten");
	});

	it("hydrates an empty answer to an empty value", () => {
		const { served, hydrated } = hydrateCase("essay-empty", "textarea");
		expect(hydrated).toBe(served);
		expect(hydrated?.value).toBe("");
	});
});

describe("inputs", () => {
	it("shows a saved short answer in its input after hydration", () => {
		const { served, hydrated } = hydrateCase("short-answer", "input");
		expect(hydrated).toBe(served);
		expect(hydrated?.value).toBe("saved short answer");
	});

	it("shows a saved numeric answer in its input after hydration", () => {
		const { served, hydrated } = hydrateCase("numeric", "input");
		expect(hydrated).toBe(served);
		expect(hydrated?.value).toBe("3.14");
	});
});
