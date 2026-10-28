// @vitest-environment jsdom

import type { PublicFillInQuestion } from "@mdq/index.js";
import type { FillInResponse } from "@mdq/responses.js";
import { FillIn, placedBlanks, ptBR, splitStem } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicFillInQuestion = {
	type: "fill-in",
	id: "brasilia",
	stem: "The capital of Brazil is [^capital]. It has about [^size] m of altitude and the river is the [^river].\n\nUse `[^capital]` as code.",
	epilogue: "Since 1960.",
	blanks: [
		{
			id: "capital",
			type: "multiple-choice",
			choices: [
				{ id: "lisboa", text: "Lisbon" },
				{ id: "brasilia", text: "`Brasília`" },
			],
		},
		{ id: "size", type: "numeric", domain: "integer", unit: "m" },
		{
			id: "river",
			type: "short-answer",
			preReject: [{ pattern: "Amazon", feedback: "Too far north." }],
		},
	],
};

function input(index: number): HTMLInputElement {
	return screen.getAllByRole("textbox")[index] as HTMLInputElement;
}

function combobox(): HTMLElement {
	return screen.getByRole("combobox");
}

describe("the stem", () => {
	const ids = new Set(["a", "b"]);

	it("places blanks in the plain text of a paragraph", () => {
		const blocks = splitStem("One [^a] two [^b].", ids);
		expect(placedBlanks(blocks)).toEqual(["a", "b"]);
	});

	it.each([
		["a code span", "Write `[^a]` here."],
		["a fence", "```\n[^a]\n```"],
		["emphasis", "**start [^a] end**"],
		["a heading", "# Title [^a]"],
		["a list item", "* item [^a]"],
		["a reference link", "[^a][b]"],
		["an undefined id", "Text [^c]."],
	])("leaves %s as written", (_name, stem) => {
		const blocks = splitStem(stem, ids);
		expect(placedBlanks(blocks)).toEqual([]);
		expect(JSON.stringify(blocks)).toContain("[^");
	});

	it("reads a bracketed slug with a target as a link", () => {
		const blocks = splitStem("[^a](https://example.com)", ids);
		expect(placedBlanks(blocks)).toEqual([]);
		expect(JSON.stringify(blocks)).toContain("href");
	});

	it("places a repeated id once", () => {
		expect(placedBlanks(splitStem("[^a] and [^a]", ids))).toEqual(["a"]);
	});
});

describe("answer mode", () => {
	it("draws a control for each blank, in the sentence, and names it", () => {
		render(() => <FillIn question={question} />);
		expect(screen.getByRole("combobox", { name: "Blank 1 of 3" })).toBeTruthy();
		expect(
			screen.getByRole("textbox", { name: "Blank 2 of 3 m" }),
		).toBeTruthy();
		expect(screen.getByRole("textbox", { name: "Blank 3 of 3" })).toBeTruthy();
		const sentence = document.querySelector(".mdq-sentence");
		expect(sentence?.textContent).toContain("The capital of Brazil is");
		expect(sentence?.querySelectorAll(".mdq-blank")).toHaveLength(3);
	});

	it("keeps a blank reference inside code as code", () => {
		render(() => <FillIn question={question} />);
		expect(document.querySelector("code")?.textContent).toBe("[^capital]");
	});

	it("reports the whole response and drops a blank that is emptied", () => {
		const seen: FillInResponse[] = [];
		render(() => <FillIn question={question} onChange={(r) => seen.push(r)} />);
		fireEvent.input(input(1), { target: { value: "Tocantins" } });
		fireEvent.input(input(0), { target: { value: "1172" } });
		fireEvent.input(input(1), { target: { value: "" } });
		expect(seen).toEqual([
			{ river: "Tocantins" },
			{ river: "Tocantins", size: "1172" },
			{ size: "1172" },
		]);
	});

	it("treats a numeric text that is not valid as an empty blank", () => {
		const seen: FillInResponse[] = [];
		render(() => (
			<FillIn
				question={question}
				value={{ size: "5" }}
				onChange={(r) => seen.push(r)}
			/>
		));
		fireEvent.input(input(0), { target: { value: "5.5" } });
		expect(seen).toEqual([{}]);
	});

	it("follows value", () => {
		const [value, setValue] = createSignal<FillInResponse | null>({
			river: "Paranã",
		});
		render(() => (
			<FillIn question={question} value={value()} onChange={setValue} />
		));
		expect(input(1).value).toBe("Paranã");
		fireEvent.input(input(1), { target: { value: "Paranã." } });
		expect(value()).toEqual({ river: "Paranã." });
	});

	it("warns about a short answer blank that fails the pre-validation", () => {
		render(() => <FillIn question={question} />);
		fireEvent.input(input(1), { target: { value: "amazon" } });
		expect(document.querySelector(".mdq-warning")?.textContent).toBe(
			"Blank 3 of 3: Too far north.",
		);
	});
});

describe("choice blank", () => {
	it("opens, picks with the keyboard and shows the choice as Markdown", () => {
		const seen: FillInResponse[] = [];
		render(() => <FillIn question={question} onChange={(r) => seen.push(r)} />);
		const box = combobox();
		expect(box.getAttribute("aria-expanded")).toBe("false");
		fireEvent.keyDown(box, { key: "ArrowDown" });
		expect(box.getAttribute("aria-expanded")).toBe("true");
		const options = screen.getAllByRole("option");
		expect(options).toHaveLength(3);
		expect(options[2]?.querySelector("code")?.textContent).toBe("Brasília");
		fireEvent.keyDown(box, { key: "End" });
		expect(box.getAttribute("aria-activedescendant")).toBe(options[2]?.id);
		fireEvent.keyDown(box, { key: "Enter" });
		expect(seen).toEqual([{ capital: "brasilia" }]);
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(box.querySelector("code")?.textContent).toBe("Brasília");
	});

	it("closes on Escape and on blur, and clears with the placeholder", () => {
		const seen: FillInResponse[] = [];
		render(() => (
			<FillIn
				question={question}
				value={{ capital: "lisboa" }}
				onChange={(r) => seen.push(r)}
			/>
		));
		fireEvent.keyDown(combobox(), { key: "ArrowDown" });
		fireEvent.keyDown(combobox(), { key: "Escape" });
		expect(screen.queryByRole("listbox")).toBeNull();
		fireEvent.click(combobox());
		fireEvent.blur(combobox());
		expect(screen.queryByRole("listbox")).toBeNull();
		fireEvent.click(combobox());
		fireEvent.pointerDown(screen.getAllByRole("option")[0] as HTMLElement);
		expect(seen).toEqual([{}]);
	});
});

describe("readonly mode", () => {
	it("disables every control", () => {
		render(() => (
			<FillIn
				question={question}
				value={{ capital: "lisboa", size: "1", river: "x" }}
				mode="readonly"
			/>
		));
		expect((combobox() as HTMLButtonElement).disabled).toBe(true);
		expect(input(0).disabled).toBe(true);
		expect(input(1).disabled).toBe(true);
		expect(document.querySelector(".mdq-empty")).toBeNull();
	});

	it("says when nothing was answered", () => {
		render(() => <FillIn question={question} mode="readonly" />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
	});
});

describe("review mode", () => {
	it("shows the score and the feedback, and links it", () => {
		render(() => (
			<FillIn
				question={question}
				value={{ capital: "lisboa" }}
				mode="review"
				result={{ score: 0.5, feedback: ["Not Lisbon."] }}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 0.50",
		);
		const feedback = document.querySelector(".mdq-feedback");
		expect(feedback?.textContent).toContain("Not Lisbon.");
		expect(combobox().getAttribute("aria-describedby")).toBe(feedback?.id);
		expect(document.querySelector("[data-key]")).toBeNull();
	});

	it("shows the pending badge and no feedback", () => {
		render(() => (
			<FillIn
				question={question}
				value={{ river: "x" }}
				mode="review"
				result={{ pending: true }}
			/>
		));
		expect(
			document.querySelector(".mdq-score")?.getAttribute("data-sign"),
		).toBe("pending");
		expect(document.querySelector(".mdq-feedback")).toBeNull();
	});

	it("hides the score and uses the messages prop", () => {
		render(() => (
			<FillIn
				question={question}
				mode="review"
				result={{ score: 1, feedback: [] }}
				hideScore
				messages={ptBR}
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(
			screen.getByRole("combobox", { name: "Lacuna 1 de 3" }),
		).toBeTruthy();
	});
});

it("renders the epilogue", () => {
	render(() => <FillIn question={question} />);
	expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
		"1960",
	);
});
