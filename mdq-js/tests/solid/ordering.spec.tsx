// @vitest-environment jsdom

import type { PublicOrderingQuestion } from "@mdq/index.js";
import type { OrderingResponse } from "@mdq/responses.js";
import { Ordering, ptBR } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

/** Code, fixed levels. "y = 1" is a distractor. */
const fixed: PublicOrderingQuestion = {
	type: "ordering",
	stem: "Sort the lines to print `0 1 2`.",
	epilogue: "Mind the loop.",
	content: "code",
	highlight: "python",
	indentation: "fixed",
	unmatched: "incorrect",
	pool: [
		[0, "x = 0"],
		[1, "print(i)"],
		[0, "for i in range(3):"],
		[0, "y = 1"],
	],
};

/** Text, the student sets the levels. "Lobo-guará" is a distractor. */
const outline: PublicOrderingQuestion = {
	type: "ordering",
	stem: "Order the stages of succession.",
	content: "text",
	indentation: "lenient",
	unmatched: "incorrect",
	pool: [
		[0, "Lichens"],
		[0, "Mosses"],
		[0, "*Shrubs*"],
		[0, "Lobo-guará"],
	],
};

const strictCode: PublicOrderingQuestion = {
	...fixed,
	indentation: "strict",
	pool: fixed.pool.map(([, text]) => [0, text]),
};

function lines(list = "used"): string[] {
	return [...document.querySelectorAll(`[data-list="${list}"] > li`)].map(
		(item) =>
			item.querySelector(".mdq-ordering-code, .mdq-ordering-text")
				?.textContent ?? item.textContent,
	);
}

function levels(list = "used"): (string | null)[] {
	return [...document.querySelectorAll(`[data-list="${list}"] > li`)].map(
		(item) => item.getAttribute("data-level"),
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

async function settle(): Promise<void> {
	await Promise.resolve();
}

describe("answer mode", () => {
	it("starts with the whole pool in the order received", () => {
		render(() => <Ordering question={fixed} />);
		expect(lines()).toEqual([
			"x = 0",
			"print(i)",
			"for i in range(3):",
			"y = 1",
		]);
		expect(levels()).toEqual(["0", "1", "0", "0"]);
		expect(document.querySelector('[data-list="unused"]')).toBeNull();
	});

	it("names the lists and shows the stem and epilogue", () => {
		render(() => <Ordering question={fixed} />);
		expect(screen.getByRole("region", { name: "Your answer" })).toBeTruthy();
		expect(
			screen
				.getByRole("list", { name: "Your answer" })
				.getAttribute("data-list"),
		).toBe("used");
		expect(document.querySelector(".mdq-stem code")?.textContent).toBe("0 1 2");
		expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
			"Mind the loop",
		);
	});

	it("shows code in monospace markup with its language", () => {
		render(() => <Ordering question={fixed} />);
		expect(document.querySelector(".mdq-language")?.textContent).toBe("python");
		expect(
			document
				.querySelector(".mdq-ordering-code")
				?.getAttribute("data-language"),
		).toBe("python");
	});

	it("shows text lines as inline Markdown", () => {
		render(() => <Ordering question={outline} />);
		expect(document.querySelector(".mdq-language")).toBeNull();
		expect(document.querySelector(".mdq-ordering-text em")?.textContent).toBe(
			"Shrubs",
		);
	});

	it("gives every control a name with the text of its line", () => {
		render(() => <Ordering question={fixed} />);
		for (const text of ["x = 0", "print(i)", "y = 1"]) {
			expect(button(`Move up: ${text}`)).toBeTruthy();
			expect(button(`Move down: ${text}`)).toBeTruthy();
			expect(button(`Leave out: ${text}`)).toBeTruthy();
		}
	});

	it("tells a screen reader the level of an indented line", () => {
		render(() => <Ordering question={fixed} />);
		expect(
			document.querySelectorAll('[data-list="used"] > li')[1]?.textContent,
		).toContain("Indentation level 1.");
	});
});

describe("reordering", () => {
	it("moves a line down and up and reports the whole answer", () => {
		const seen: OrderingResponse[] = [];
		render(() => (
			<Ordering question={fixed} onChange={(lines) => seen.push(lines)} />
		));
		fireEvent.click(button("Move down: x = 0"));
		expect(lines()).toEqual([
			"print(i)",
			"x = 0",
			"for i in range(3):",
			"y = 1",
		]);
		fireEvent.click(button("Move up: for i in range(3):"));
		expect(seen.at(-1)).toEqual([
			[1, "print(i)"],
			[0, "for i in range(3):"],
			[0, "x = 0"],
			[0, "y = 1"],
		]);
	});

	it("does nothing at the ends, and keeps the control focusable", () => {
		const seen: OrderingResponse[] = [];
		render(() => (
			<Ordering question={fixed} onChange={(lines) => seen.push(lines)} />
		));
		const up = button("Move up: x = 0");
		expect(up.getAttribute("aria-disabled")).toBe("true");
		expect((up as HTMLButtonElement).disabled).toBe(false);
		fireEvent.click(up);
		fireEvent.click(button("Move down: y = 1"));
		expect(seen).toEqual([]);
	});

	it("keeps the focus on the line that moved, and announces it politely", async () => {
		render(() => <Ordering question={fixed} />);
		const live = screen.getByRole("status");
		expect(live.getAttribute("aria-live")).toBe("polite");
		button("Move down: x = 0").focus();
		fireEvent.click(button("Move down: x = 0"));
		await settle();
		expect(document.activeElement).toBe(button("Move down: x = 0"));
		expect(
			document.activeElement?.closest("li")?.getAttribute("data-index"),
		).toBe("1");
		expect(live.textContent).toBe("x = 0 moved to position 2 of 4.");
	});

	it("leaves a line out and takes it back at the end, with the pool level", async () => {
		const seen: OrderingResponse[] = [];
		render(() => (
			<Ordering question={fixed} onChange={(lines) => seen.push(lines)} />
		));
		fireEvent.click(button("Leave out: print(i)"));
		await settle();
		expect(lines()).toEqual(["x = 0", "for i in range(3):", "y = 1"]);
		expect(lines("unused")).toEqual(["print(i)"]);
		expect(screen.getByRole("region", { name: "Not used" })).toBeTruthy();
		expect(document.activeElement).toBe(button("Use: print(i)"));
		expect(screen.getByRole("status").textContent).toBe(
			"print(i) left out of the answer.",
		);
		fireEvent.click(button("Use: print(i)"));
		await settle();
		expect(lines()).toEqual([
			"x = 0",
			"for i in range(3):",
			"y = 1",
			"print(i)",
		]);
		expect(levels().at(-1)).toBe("1");
		expect(seen.at(-1)).toHaveLength(4);
		expect(document.querySelector('[data-list="unused"]')).toBeNull();
		expect(document.activeElement).toBe(button("Leave out: print(i)"));
	});

	it("says when the answer holds no line", () => {
		render(() => <Ordering question={fixed} value={[]} />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No lines in your answer yet.",
		);
		expect(lines("unused")).toHaveLength(4);
	});

	it("treats a duplicate pool line as a separate copy", () => {
		const twice: PublicOrderingQuestion = {
			...fixed,
			pool: [
				[0, "a"],
				[0, "a"],
				[0, "b"],
			],
		};
		render(() => <Ordering question={twice} />);
		fireEvent.click(button("Leave out: b"));
		fireEvent.click(
			screen.getAllByRole("button", { name: "Leave out: a" })[0] as HTMLElement,
		);
		expect(lines()).toEqual(["a"]);
		expect(lines("unused")).toEqual(["a", "b"]);
	});

	it("names a blank line", () => {
		const blank: PublicOrderingQuestion = {
			...fixed,
			pool: [
				[0, "a"],
				[0, ""],
			],
		};
		render(() => <Ordering question={blank} />);
		expect(button("Move up: (blank line)")).toBeTruthy();
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"(blank line)",
		);
	});
});

describe("indentation", () => {
	it("gives no indent controls under fixed", () => {
		render(() => <Ordering question={fixed} />);
		expect(screen.queryByRole("button", { name: /^Indent/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /^Outdent/ })).toBeNull();
	});

	it("shows every line at level 0 under lenient and strict", () => {
		render(() => <Ordering question={strictCode} />);
		expect(levels()).toEqual(["0", "0", "0", "0"]);
		expect(button("Indent: print(i)")).toBeTruthy();
		expect(button("Outdent: print(i)")).toBeTruthy();
	});

	it("indents and outdents a line of code", async () => {
		const seen: OrderingResponse[] = [];
		render(() => (
			<Ordering question={strictCode} onChange={(lines) => seen.push(lines)} />
		));
		fireEvent.click(button("Indent: x = 0"));
		await settle();
		fireEvent.click(button("Indent: x = 0"));
		expect(seen.at(-1)?.[0]).toEqual([2, "x = 0"]);
		expect(screen.getByRole("status").textContent).toBe(
			"x = 0 is at indentation level 2.",
		);
		fireEvent.click(button("Outdent: x = 0"));
		expect(seen.at(-1)?.[0]).toEqual([1, "x = 0"]);
		expect(button("Outdent: print(i)").getAttribute("aria-disabled")).toBe(
			"true",
		);
	});

	it("keeps a text answer a valid outline", () => {
		const seen: OrderingResponse[] = [];
		render(() => (
			<Ordering question={outline} onChange={(lines) => seen.push(lines)} />
		));
		// The first line cannot be indented.
		expect(button("Indent: Lichens").getAttribute("aria-disabled")).toBe(
			"true",
		);
		fireEvent.click(button("Indent: Lichens"));
		expect(seen).toEqual([]);
		// One level below the line before.
		fireEvent.click(button("Indent: Mosses"));
		expect(levels()).toEqual(["0", "1", "0", "0"]);
		fireEvent.click(button("Indent: Mosses"));
		expect(levels()).toEqual(["0", "1", "0", "0"]);
		expect(button("Indent: Mosses").getAttribute("aria-disabled")).toBe("true");
		// Not while the next line is deeper.
		fireEvent.click(button("Indent: Shrubs"));
		fireEvent.click(button("Indent: Shrubs"));
		expect(levels()).toEqual(["0", "1", "2", "0"]);
		expect(button("Outdent: Mosses").getAttribute("aria-disabled")).toBe(
			"true",
		);
		fireEvent.click(button("Outdent: Shrubs"));
		fireEvent.click(button("Outdent: Mosses"));
		expect(levels()).toEqual(["0", "0", "1", "0"]);
		expect(seen.at(-1)).toEqual([
			[0, "Lichens"],
			[0, "Mosses"],
			[1, "*Shrubs*"],
			[0, "Lobo-guará"],
		]);
	});

	it("refits the levels of a text answer after a move", () => {
		render(() => <Ordering question={outline} />);
		fireEvent.click(button("Indent: Mosses"));
		fireEvent.click(button("Move up: Mosses"));
		expect(lines().slice(0, 2)).toEqual(["Mosses", "Lichens"]);
		expect(levels()).toEqual(["0", "0", "0", "0"]);
	});

	it("resets the level of a line that leaves the answer", () => {
		render(() => <Ordering question={outline} />);
		fireEvent.click(button("Indent: Mosses"));
		fireEvent.click(button("Leave out: Mosses"));
		fireEvent.click(button("Use: Mosses"));
		expect(levels().at(-1)).toBe("0");
	});
});

describe("controlled and uncontrolled", () => {
	it("keeps its own state without value", () => {
		render(() => <Ordering question={fixed} />);
		fireEvent.click(button("Move down: x = 0"));
		fireEvent.click(button("Move down: x = 0"));
		expect(lines().slice(0, 3)).toEqual([
			"print(i)",
			"for i in range(3):",
			"x = 0",
		]);
	});

	it("starts from the initial value when uncontrolled", () => {
		render(() => <Ordering question={fixed} value={[[0, "x = 0"]]} />);
		expect(lines()).toEqual(["x = 0"]);
	});

	it("follows value when the parent applies the change", () => {
		const [value, setValue] = createSignal<OrderingResponse | null>([
			[0, "x = 0"],
			[0, "for i in range(3):"],
		]);
		render(() => (
			<Ordering question={fixed} value={value()} onChange={setValue} />
		));
		fireEvent.click(button("Move down: x = 0"));
		expect(value()).toEqual([
			[0, "for i in range(3):"],
			[0, "x = 0"],
		]);
		expect(lines()).toEqual(["for i in range(3):", "x = 0"]);
		// No response yet: the student sees the pool, as before the first move.
		setValue(null);
		expect(lines()).toEqual(fixed.pool.map(([, text]) => text));
	});

	it("shows only what value says when the parent ignores the change", () => {
		const seen: OrderingResponse[] = [];
		render(() => (
			<Ordering
				question={fixed}
				value={[
					[0, "x = 0"],
					[0, "y = 1"],
				]}
				onChange={(next) => seen.push(next)}
			/>
		));
		fireEvent.click(button("Move down: x = 0"));
		expect(seen).toHaveLength(1);
		expect(lines()).toEqual(["x = 0", "y = 1"]);
	});

	it("is read by value in readonly mode, not by the pool", () => {
		render(() => <Ordering question={fixed} value={null} mode="readonly" />);
		expect(lines("response")).toEqual([]);
	});
});

describe("readonly mode", () => {
	it("shows the response with no controls", () => {
		render(() => (
			<Ordering
				question={fixed}
				mode="readonly"
				value={[
					[0, "for i in range(3):"],
					[1, "print(i)"],
				]}
			/>
		));
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByRole("status")).toBeNull();
		expect(lines("response")).toEqual(["for i in range(3):", "print(i)"]);
		expect(levels("response")).toEqual(["0", "1"]);
		expect(screen.getByRole("region", { name: "Your answer" })).toBeTruthy();
	});

	it("says when nothing was submitted", () => {
		render(() => <Ordering question={fixed} mode="readonly" value={[]} />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
	});
});

describe("review mode", () => {
	const response: OrderingResponse = [
		[0, "x = 0"],
		[0, "for i in range(3):"],
		[1, "print(i)"],
	];

	it("shows the score, the feedback and every accepted order", () => {
		render(() => (
			<Ordering
				question={fixed}
				mode="review"
				value={response}
				result={{
					score: 1,
					feedback: ["Well done."],
					correct: [
						response,
						[
							[0, "for i in range(3):"],
							[1, "print(i)"],
						],
					],
				}}
			/>
		));
		expect(screen.queryByRole("button")).toBeNull();
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 1.00",
		);
		expect(document.querySelector(".mdq-feedback")?.textContent).toContain(
			"Well done.",
		);
		expect(screen.getByRole("region", { name: "Correct orders" })).toBeTruthy();
		expect(document.querySelectorAll('[data-list="key"]')).toHaveLength(2);
		expect(lines("response")).toEqual([
			"x = 0",
			"for i in range(3):",
			"print(i)",
		]);
		expect(document.querySelector("[data-key]")).toBeNull();
	});

	it("titles a single key in the singular", () => {
		render(() => (
			<Ordering
				question={fixed}
				mode="review"
				value={response}
				result={{ score: 0, feedback: [], correct: [response] }}
			/>
		));
		expect(screen.getByRole("region", { name: "Correct order" })).toBeTruthy();
	});

	it("shows a pending badge, no feedback and the key", () => {
		render(() => (
			<Ordering
				question={{ ...fixed, unmatched: "manual" }}
				mode="review"
				value={response}
				result={{ pending: true, correct: [response] }}
			/>
		));
		const badge = document.querySelector(".mdq-score");
		expect(badge?.getAttribute("data-sign")).toBe("pending");
		expect(document.querySelector(".mdq-feedback")).toBeNull();
		expect(document.querySelector('[data-list="key"]')).toBeTruthy();
	});

	it("shows no key while it is withheld, and no badge with hideScore", () => {
		render(() => (
			<Ordering
				question={fixed}
				mode="review"
				value={response}
				result={{ score: 0, feedback: [] }}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(document.querySelector('[data-list="key"]')).toBeNull();
	});

	it("ignores the result outside review", () => {
		render(() => (
			<Ordering
				question={fixed}
				mode="readonly"
				value={response}
				result={{ score: 1, feedback: ["x"], correct: [response] }}
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(document.querySelector('[data-list="key"]')).toBeNull();
	});
});

describe("manual grading note", () => {
	it("tells the student that an instructor grades the question", () => {
		render(() => <Ordering question={{ ...fixed, unmatched: "manual" }} />);
		expect(document.querySelector(".mdq-note")?.textContent).toBe(
			"An instructor grades this question by hand.",
		);
	});
});

describe("messages", () => {
	it("translates the controls and the announcements", () => {
		render(() => <Ordering question={outline} messages={ptBR} />);
		fireEvent.click(button("Mover para baixo: Lichens"));
		expect(screen.getByRole("status").textContent).toBe(
			"Lichens movida para a posição 2 de 4.",
		);
		expect(button("Deixar de fora: Mosses")).toBeTruthy();
		expect(button("Indentar: Lichens")).toBeTruthy();
		expect(button("Recuar: Lichens")).toBeTruthy();
	});
});

describe("keep this order", () => {
	it("takes the untouched order as the response", () => {
		const seen: OrderingResponse[] = [];
		render(() => (
			<Ordering question={fixed} onChange={(lines) => seen.push(lines)} />
		));
		fireEvent.click(screen.getByRole("button", { name: "Keep this order" }));
		expect(seen).toEqual([fixed.pool]);
		expect(
			screen.queryByRole("button", { name: "Keep this order" }),
		).toBeNull();
		expect(document.querySelector("output")?.textContent).toBe(
			"Order kept as your answer.",
		);
	});

	it("goes away after the first move", () => {
		render(() => <Ordering question={fixed} />);
		fireEvent.click(button("Move down: x = 0"));
		expect(
			screen.queryByRole("button", { name: "Keep this order" }),
		).toBeNull();
	});

	it("shows while a controlled value is null, and only in answer mode", () => {
		const [value, setValue] = createSignal<OrderingResponse | null>(null);
		render(() => (
			<Ordering question={fixed} value={value()} onChange={setValue} />
		));
		fireEvent.click(screen.getByRole("button", { name: "Keep this order" }));
		expect(value()).toEqual(fixed.pool);
	});

	it("is absent in readonly mode", () => {
		render(() => <Ordering question={fixed} value={null} mode="readonly" />);
		expect(
			screen.queryByRole("button", { name: "Keep this order" }),
		).toBeNull();
	});
});

describe("maxLevel", () => {
	it("stops indenting at maxLevel", () => {
		render(() => (
			<Ordering
				question={{
					...fixed,
					indentation: "strict",
					maxLevel: 1,
					pool: fixed.pool.map(([, text]) => [0, text] as const),
				}}
			/>
		));
		const name = `Indent: ${fixed.pool[1]?.[1]}`;
		fireEvent.click(button(name));
		expect(button(name).getAttribute("aria-disabled")).toBe("true");
	});
});
