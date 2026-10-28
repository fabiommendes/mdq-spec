// @vitest-environment jsdom

import type { PublicMultipleSelectionQuestion } from "@mdq/index.js";
import { MultipleSelection, ptBR } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicMultipleSelectionQuestion = {
	type: "multiple-selection",
	id: "capitais",
	stem: "Which cities were *capitals* of Brazil?",
	epilogue: "Think about 1763 and 1960.",
	choices: [
		{ id: "lisboa", text: "Lisbon" },
		{ id: "brasilia", text: "Brasília" },
		{ id: "sao-paulo", text: "`São Paulo`" },
		{ id: "rio", text: "Rio de Janeiro" },
	],
};

function boxes(): HTMLInputElement[] {
	return screen.getAllByRole("checkbox") as HTMLInputElement[];
}

function choice(id: string): HTMLElement {
	const input = boxes().find((box) => box.value === id);
	const label = input?.closest(".mdq-choice");
	if (!(label instanceof HTMLElement)) throw new Error(`no choice ${id}`);
	return label;
}

describe("answer mode", () => {
	it("labels the group with the stem", () => {
		render(() => <MultipleSelection question={question} />);
		expect(
			screen.getByRole("group", {
				name: "Which cities were capitals of Brazil?",
			}),
		).toBeTruthy();
		expect(choice("sao-paulo").querySelector("code")?.textContent).toBe(
			"São Paulo",
		);
	});

	it("keeps the ticks and reports them in the order of the choices", () => {
		const seen: (readonly string[])[] = [];
		render(() => (
			<MultipleSelection
				question={question}
				onChange={(ids) => seen.push(ids)}
			/>
		));
		fireEvent.click(boxes()[3] as HTMLInputElement);
		fireEvent.click(boxes()[1] as HTMLInputElement);
		fireEvent.click(boxes()[3] as HTMLInputElement);
		expect(seen).toEqual([["rio"], ["brasilia", "rio"], ["brasilia"]]);
		expect(boxes().map((box) => box.checked)).toEqual([
			false,
			true,
			false,
			false,
		]);
	});

	it("follows value when the parent applies the change", () => {
		const [value, setValue] = createSignal<readonly string[] | null>(["rio"]);
		render(() => (
			<MultipleSelection
				question={question}
				value={value()}
				onChange={setValue}
			/>
		));
		fireEvent.click(boxes()[0] as HTMLInputElement);
		expect(value()).toEqual(["lisboa", "rio"]);
		expect(boxes().map((box) => box.checked)).toEqual([
			true,
			false,
			false,
			true,
		]);
	});

	it("undoes a click the parent does not apply", () => {
		render(() => <MultipleSelection question={question} value={["rio"]} />);
		fireEvent.click(boxes()[0] as HTMLInputElement);
		expect(boxes()[0]?.checked).toBe(false);
		expect(boxes()[3]?.checked).toBe(true);
		expect(choice("lisboa").hasAttribute("data-selected")).toBe(false);
	});

	it("points at no feedback when none is rendered", () => {
		render(() => (
			<MultipleSelection
				question={question}
				result={{ score: 1, feedback: ["Right."], correct: [["rio"]] }}
			/>
		));
		for (const box of boxes()) {
			expect(box.hasAttribute("aria-describedby")).toBe(false);
		}
	});
});

describe("readonly mode", () => {
	it("disables the boxes and marks each ticked choice", () => {
		render(() => (
			<MultipleSelection
				question={question}
				value={["brasilia", "rio"]}
				mode="readonly"
			/>
		));
		expect(boxes().every((box) => box.disabled)).toBe(true);
		expect(document.querySelectorAll(".mdq-mark")).toHaveLength(2);
		expect(choice("rio").textContent).toContain("Your answer");
	});

	it("ignores clicks", () => {
		const seen: (readonly string[])[] = [];
		render(() => (
			<MultipleSelection
				question={question}
				mode="readonly"
				onChange={(ids) => seen.push(ids)}
			/>
		));
		fireEvent.click(boxes()[0] as HTMLInputElement);
		expect(seen).toEqual([]);
	});
});

describe("review mode", () => {
	const result = {
		score: 0.5,
		feedback: ["Rio was a capital until 1960."],
		correct: [["brasilia", "rio"]],
	};

	it("judges each choice by its ticked state", () => {
		render(() => (
			<MultipleSelection
				question={question}
				value={["brasilia", "sao-paulo"]}
				mode="review"
				result={result}
			/>
		));
		expect(choice("brasilia").getAttribute("data-key")).toBe("correct");
		expect(choice("rio").getAttribute("data-key")).toBe("incorrect");
		expect(choice("sao-paulo").getAttribute("data-key")).toBe("incorrect");
		expect(choice("lisboa").getAttribute("data-key")).toBe("correct");
		expect(choice("rio").textContent).toContain("Incorrect");
		expect(choice("lisboa").textContent).toContain("Correct");
	});

	it("shows the score and links the feedback", () => {
		render(() => (
			<MultipleSelection
				question={question}
				value={["brasilia"]}
				mode="review"
				result={result}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 0.50",
		);
		const feedback = document.querySelector(".mdq-feedback");
		for (const box of boxes()) {
			expect(box.getAttribute("aria-describedby")).toBe(feedback?.id);
		}
	});

	it("hides the score but keeps the marks", () => {
		render(() => (
			<MultipleSelection
				question={question}
				value={["brasilia"]}
				mode="review"
				result={result}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(choice("brasilia").getAttribute("data-key")).toBe("correct");
	});

	it("marks nothing while the key is withheld", () => {
		render(() => (
			<MultipleSelection
				question={question}
				value={["rio"]}
				mode="review"
				result={{ score: 0, feedback: [] }}
			/>
		));
		expect(document.querySelectorAll("[data-key]")).toHaveLength(0);
	});

	it("marks every choice wrong under an empty key", () => {
		render(() => (
			<MultipleSelection
				question={question}
				value={[]}
				mode="review"
				result={{ score: 0, feedback: [], correct: [] }}
			/>
		));
		expect(document.querySelectorAll('[data-key="incorrect"]')).toHaveLength(4);
	});

	it("uses the messages prop", () => {
		render(() => (
			<MultipleSelection
				question={question}
				value={["brasilia"]}
				mode="review"
				result={result}
				messages={ptBR}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe("Nota 0.50");
		expect(choice("brasilia").textContent).toContain("Correta");
	});
});

it("renders the epilogue", () => {
	render(() => <MultipleSelection question={question} />);
	expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
		"1960",
	);
});
