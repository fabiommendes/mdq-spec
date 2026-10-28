// @vitest-environment jsdom

import type { PublicTrueFalseQuestion } from "@mdq/index.js";
import type { TrueFalseResponse } from "@mdq/responses.js";
import { ptBR, TrueFalse } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicTrueFalseQuestion = {
	type: "true-false",
	id: "ciencia",
	stem: "Judge the *statements*.",
	epilogue: "Think about the evidence.",
	choices: [
		{ id: "plana", text: "Earth is flat." },
		{ id: "idade", text: "The Earth is `4.5` billion years old." },
		{ id: "luz", text: "Light travels instantly." },
	],
};

const key: TrueFalseResponse = { plana: false, idade: true, luz: false };

function toggles(): HTMLButtonElement[] {
	return screen.getAllByRole("checkbox") as HTMLButtonElement[];
}

function row(index: number): HTMLElement {
	const found = toggles()[index]?.closest(".mdq-statement");
	if (!(found instanceof HTMLElement)) throw new Error(`no row ${index}`);
	return found;
}

describe("answer mode", () => {
	it("names the group by the stem and each toggle by its statement", () => {
		render(() => <TrueFalse question={question} />);
		expect(
			screen.getByRole("group", { name: "Judge the statements." }),
		).toBeTruthy();
		expect(
			screen.getByRole("checkbox", { name: "Earth is flat." }),
		).toBeTruthy();
		expect(row(1).querySelector("code")?.textContent).toBe("4.5");
	});

	it("starts unmarked and cycles true, false, unmarked", () => {
		const seen: TrueFalseResponse[] = [];
		render(() => (
			<TrueFalse question={question} onChange={(r) => seen.push(r)} />
		));
		const toggle = toggles()[0] as HTMLButtonElement;
		expect(toggle.getAttribute("aria-checked")).toBe("mixed");
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("true");
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("false");
		fireEvent.click(toggle);
		expect(toggle.getAttribute("aria-checked")).toBe("mixed");
		expect(seen).toEqual([{ plana: true }, { plana: false }, {}]);
	});

	it("keeps the other judgements", () => {
		const seen: TrueFalseResponse[] = [];
		render(() => (
			<TrueFalse
				question={question}
				value={{ idade: true }}
				onChange={(r) => seen.push(r)}
			/>
		));
		fireEvent.click(toggles()[0] as HTMLButtonElement);
		expect(seen).toEqual([{ idade: true, plana: true }]);
	});

	it("follows value, and ignores a click the parent does not apply", () => {
		const [value, setValue] = createSignal<TrueFalseResponse | null>(null);
		render(() => (
			<TrueFalse question={question} value={value()} onChange={setValue} />
		));
		fireEvent.click(toggles()[2] as HTMLButtonElement);
		expect(value()).toEqual({ luz: true });
		expect(toggles()[2]?.getAttribute("aria-checked")).toBe("true");
		setValue(null);
		expect(toggles()[2]?.getAttribute("aria-checked")).toBe("mixed");
	});

	it("treats a null judgement as an abstention", () => {
		render(() => <TrueFalse question={question} value={{ plana: null }} />);
		expect(toggles()[0]?.getAttribute("aria-checked")).toBe("mixed");
	});

	it("describes the toggles only by rendered elements", () => {
		render(() => (
			<TrueFalse
				question={question}
				result={{ score: 1, feedback: ["Right."], correct: [key] }}
			/>
		));
		for (const toggle of toggles()) {
			const ids = (toggle.getAttribute("aria-describedby") ?? "").split(" ");
			expect(ids).toHaveLength(1);
			expect(document.getElementById(ids[0] as string)).toBeTruthy();
		}
		expect(document.querySelector(".mdq-feedback")).toBeNull();
	});
});

describe("readonly mode", () => {
	it("disables the toggles and ignores clicks", () => {
		const seen: TrueFalseResponse[] = [];
		render(() => (
			<TrueFalse
				question={question}
				value={{ plana: false }}
				mode="readonly"
				onChange={(r) => seen.push(r)}
			/>
		));
		expect(toggles().every((toggle) => toggle.disabled)).toBe(true);
		fireEvent.click(toggles()[0] as HTMLButtonElement);
		expect(seen).toEqual([]);
		expect(toggles()[0]?.getAttribute("aria-checked")).toBe("false");
		expect(document.querySelector(".mdq-empty")).toBeNull();
	});

	it("says when nothing was answered", () => {
		render(() => <TrueFalse question={question} mode="readonly" />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
	});
});

describe("review mode", () => {
	const result = {
		score: 0.5,
		feedback: ["The Earth is round."],
		correct: [key],
	};
	const value = { plana: true, idade: true };

	it("marks right and wrong judgements and leaves an abstention alone", () => {
		render(() => (
			<TrueFalse
				question={question}
				value={value}
				mode="review"
				result={result}
			/>
		));
		expect(row(0).getAttribute("data-key")).toBe("incorrect");
		expect(row(1).getAttribute("data-key")).toBe("correct");
		expect(row(2).hasAttribute("data-key")).toBe(false);
		expect(row(0).textContent).toContain("Incorrect");
		expect(row(1).textContent).toContain("Correct");
	});

	it("shows the score and links the feedback", () => {
		render(() => (
			<TrueFalse
				question={question}
				value={value}
				mode="review"
				result={result}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 0.50",
		);
		const feedback = document.querySelector(".mdq-feedback");
		for (const toggle of toggles()) {
			expect(toggle.getAttribute("aria-describedby")).toContain(
				feedback?.id as string,
			);
		}
	});

	it("hides the score but keeps the marks", () => {
		render(() => (
			<TrueFalse
				question={question}
				value={value}
				mode="review"
				result={result}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(row(1).getAttribute("data-key")).toBe("correct");
	});

	it("marks nothing while the key is withheld", () => {
		render(() => (
			<TrueFalse
				question={question}
				value={value}
				mode="review"
				result={{ score: 0, feedback: [] }}
			/>
		));
		expect(document.querySelectorAll("[data-key]")).toHaveLength(0);
	});

	it("marks every judgement wrong under an empty key", () => {
		render(() => (
			<TrueFalse
				question={question}
				value={value}
				mode="review"
				result={{ score: 0, feedback: [], correct: [] }}
			/>
		));
		expect(row(0).getAttribute("data-key")).toBe("incorrect");
		expect(row(1).getAttribute("data-key")).toBe("incorrect");
	});

	it("uses the messages prop", () => {
		render(() => (
			<TrueFalse
				question={question}
				value={value}
				mode="review"
				result={result}
				messages={ptBR}
			/>
		));
		expect(row(1).textContent).toContain("Verdadeiro");
		expect(row(1).textContent).toContain("Correta");
	});
});

it("renders the epilogue", () => {
	render(() => <TrueFalse question={question} />);
	expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
		"evidence",
	);
});
