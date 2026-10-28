// @vitest-environment jsdom

import type { PublicMultipleChoiceQuestion } from "@mdq/index.js";
import { MultipleChoice, ptBR } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicMultipleChoiceQuestion = {
	type: "multiple-choice",
	id: "capital-do-brasil",
	stem: "Which city is the *capital* of Brazil?",
	epilogue: "Think about 1960.",
	choices: [
		{ id: "brasilia", text: "Brasília" },
		{ id: "rio", text: "Rio de Janeiro" },
		{ id: "salvador", text: "`Salvador`" },
	],
};

function radios(): HTMLInputElement[] {
	return screen.getAllByRole("radio") as HTMLInputElement[];
}

function choice(id: string): HTMLElement {
	const input = radios().find((radio) => radio.value === id);
	const label = input?.closest(".mdq-choice");
	if (!(label instanceof HTMLElement)) throw new Error(`no choice ${id}`);
	return label;
}

describe("answer mode", () => {
	it("labels the radio group with the stem", () => {
		render(() => <MultipleChoice question={question} />);
		expect(screen.getByRole("group").textContent).toContain("Brasília");
		expect(
			screen.getByRole("group", {
				name: "Which city is the capital of Brazil?",
			}),
		).toBeTruthy();
	});

	it("renders choice text as inline Markdown", () => {
		render(() => <MultipleChoice question={question} />);
		expect(choice("salvador").querySelector("code")?.textContent).toBe(
			"Salvador",
		);
	});

	it("keeps the state without value and reports each pick", () => {
		const picked: string[] = [];
		render(() => (
			<MultipleChoice question={question} onChange={(id) => picked.push(id)} />
		));
		fireEvent.click(radios()[1] as HTMLInputElement);
		expect(picked).toEqual(["rio"]);
		expect(choice("rio").hasAttribute("data-selected")).toBe(true);
		expect((radios()[1] as HTMLInputElement).checked).toBe(true);
	});

	it("follows value when the parent applies the change", () => {
		const [value, setValue] = createSignal<string | null>("brasilia");
		render(() => (
			<MultipleChoice question={question} value={value()} onChange={setValue} />
		));
		fireEvent.click(radios()[2] as HTMLInputElement);
		expect(value()).toBe("salvador");
		expect((radios()[2] as HTMLInputElement).checked).toBe(true);
		expect((radios()[0] as HTMLInputElement).checked).toBe(false);
	});

	it("undoes a click the parent does not apply", () => {
		render(() => <MultipleChoice question={question} value="brasilia" />);
		fireEvent.click(radios()[1] as HTMLInputElement);
		expect((radios()[0] as HTMLInputElement).checked).toBe(true);
		expect((radios()[1] as HTMLInputElement).checked).toBe(false);
		expect(choice("rio").hasAttribute("data-selected")).toBe(false);
	});

	it("points at no feedback when none is rendered", () => {
		render(() => (
			<MultipleChoice
				question={question}
				result={{ score: 1, feedback: ["Right."], correct: ["brasilia"] }}
			/>
		));
		for (const radio of radios()) {
			expect(radio.hasAttribute("aria-describedby")).toBe(false);
		}
		expect(document.querySelector(".mdq-feedback")).toBeNull();
		expect(document.querySelector(".mdq-score")).toBeNull();
	});
});

describe("readonly mode", () => {
	it("disables the radios and marks the picked choice", () => {
		render(() => (
			<MultipleChoice question={question} value="rio" mode="readonly" />
		));
		expect(radios().every((radio) => radio.disabled)).toBe(true);
		const marks = document.querySelectorAll(".mdq-mark");
		expect(marks).toHaveLength(1);
		expect(choice("rio").querySelector(".mdq-mark")?.textContent).toBe(
			"Your answer",
		);
	});

	it("ignores clicks", () => {
		const picked: string[] = [];
		render(() => (
			<MultipleChoice
				question={question}
				mode="readonly"
				onChange={(id) => picked.push(id)}
			/>
		));
		fireEvent.click(radios()[0] as HTMLInputElement);
		expect(picked).toEqual([]);
	});
});

describe("review mode", () => {
	const wrong = {
		score: 0,
		feedback: ["Rio was the capital until 1960."],
		correct: ["brasilia"],
	};

	it("marks the correct choice and the wrong pick", () => {
		render(() => (
			<MultipleChoice
				question={question}
				value="rio"
				mode="review"
				result={wrong}
			/>
		));
		expect(choice("brasilia").getAttribute("data-key")).toBe("correct");
		expect(choice("rio").getAttribute("data-key")).toBe("incorrect");
		expect(choice("salvador").hasAttribute("data-key")).toBe(false);
		expect(choice("brasilia").textContent).toContain("Correct");
		expect(choice("rio").textContent).toContain("Incorrect");
	});

	it("shows the score and links the feedback", () => {
		render(() => (
			<MultipleChoice
				question={question}
				value="rio"
				mode="review"
				result={wrong}
			/>
		));
		const score = document.querySelector(".mdq-score");
		expect(score?.textContent).toBe("Score 0.00");
		const feedback = document.querySelector(".mdq-feedback");
		expect(feedback?.textContent).toContain("1960");
		for (const radio of radios()) {
			expect(radio.getAttribute("aria-describedby")).toBe(feedback?.id);
		}
	});

	it("hides the score but keeps the marks", () => {
		render(() => (
			<MultipleChoice
				question={question}
				value="rio"
				mode="review"
				result={wrong}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(choice("brasilia").getAttribute("data-key")).toBe("correct");
	});

	it("marks nothing while the key is withheld", () => {
		render(() => (
			<MultipleChoice
				question={question}
				value="rio"
				mode="review"
				result={{ score: 0, feedback: [] }}
			/>
		));
		expect(document.querySelectorAll("[data-key]")).toHaveLength(0);
		expect(choice("rio").hasAttribute("data-selected")).toBe(true);
	});

	it("marks the pick wrong under an empty key", () => {
		render(() => (
			<MultipleChoice
				question={question}
				value="rio"
				mode="review"
				result={{ score: 0, feedback: [], correct: [] }}
			/>
		));
		expect(choice("rio").getAttribute("data-key")).toBe("incorrect");
	});

	it("uses the messages prop", () => {
		render(() => (
			<MultipleChoice
				question={question}
				value="rio"
				mode="review"
				result={wrong}
				messages={ptBR}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe("Nota 0.00");
		expect(choice("brasilia").textContent).toContain("Correta");
	});
});

it("renders the epilogue", () => {
	render(() => <MultipleChoice question={question} />);
	expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
		"1960",
	);
});
