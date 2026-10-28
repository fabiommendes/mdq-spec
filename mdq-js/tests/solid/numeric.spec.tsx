// @vitest-environment jsdom

import type { PublicNumericQuestion } from "@mdq/index.js";
import type { NumericResponse } from "@mdq/responses.js";
import { en, Numeric, NumericInput, ptBR } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicNumericQuestion = {
	type: "numeric",
	id: "gravidade",
	stem: "What is the *gravity* at the surface of Earth?",
	epilogue: "Use the standard value.",
	unit: "m/s²",
	domain: "decimal",
	decimalPlaces: 2,
};

const fraction: PublicNumericQuestion = {
	type: "numeric",
	stem: "One third.",
	domain: "fraction",
};

const whole: PublicNumericQuestion = {
	type: "numeric",
	stem: "How many states?",
	domain: "integer",
};

function input(): HTMLInputElement {
	return screen.getByRole("textbox") as HTMLInputElement;
}

function type(text: string): void {
	fireEvent.input(input(), { target: { value: text } });
}

describe("answer mode", () => {
	it("names the input by the stem and the unit", () => {
		render(() => <Numeric question={question} />);
		expect(
			screen.getByRole("textbox", {
				name: "What is the gravity at the surface of Earth? m/s²",
			}),
		).toBeTruthy();
		expect(document.querySelector(".mdq-unit")?.textContent).toBe("m/s²");
	});

	it("reports the text as a response string", () => {
		const seen: (string | null)[] = [];
		render(() => (
			<Numeric question={question} onChange={(v) => seen.push(v)} />
		));
		type("9.80");
		type(" 9.81 ");
		type("");
		expect(seen).toEqual(["9.80", "9.81", null]);
	});

	it("sends null for a text that is not a valid response", () => {
		const seen: (string | null)[] = [];
		render(() => (
			<Numeric question={question} onChange={(v) => seen.push(v)} />
		));
		type("9,8");
		type("1/3");
		type("about ten");
		type("3.");
		expect(seen).toEqual([null, null, null, null]);
	});

	it("takes a fraction only in the fraction domain", () => {
		const seen: (string | null)[] = [];
		render(() => (
			<Numeric question={fraction} onChange={(v) => seen.push(v)} />
		));
		type("1/3");
		type("0.5");
		expect(seen).toEqual(["1/3", "0.5"]);
	});

	it("refuses a decimal in the integer domain", () => {
		const seen: (string | null)[] = [];
		render(() => <Numeric question={whole} onChange={(v) => seen.push(v)} />);
		type("27");
		type("26.5");
		expect(seen).toEqual(["27", null]);
	});

	it("warns about an invalid text only after the box is left", () => {
		render(() => <Numeric question={question} />);
		type("9,8");
		expect(document.querySelector(".mdq-warning")).toBeNull();
		fireEvent.blur(input());
		const warning = document.querySelector(".mdq-warning");
		expect(warning?.textContent).toBe(en.numericInvalid);
		expect(input().getAttribute("aria-invalid")).toBe("true");
		expect(input().getAttribute("aria-describedby")).toBe(warning?.id);
		type("9.8");
		expect(document.querySelector(".mdq-warning")).toBeNull();
		expect(input().hasAttribute("aria-invalid")).toBe(false);
	});

	it("follows value, and keeps the text of an equal number", () => {
		const [value, setValue] = createSignal<NumericResponse | null>(null);
		render(() => (
			<Numeric
				question={question}
				value={value()}
				onChange={(v) => setValue(v === null ? null : Number(v))}
			/>
		));
		type("9.80");
		expect(input().value).toBe("9.80");
		setValue(3);
		expect(input().value).toBe("3");
		setValue({ value: "2.5", unit: "m/s²" });
		expect(input().value).toBe("2.5");
	});

	it("undoes an edit the parent does not apply", async () => {
		render(() => <Numeric question={question} value="9.8" />);
		type("1");
		await Promise.resolve();
		expect(input().value).toBe("9.8");
	});

	it("points at no feedback when none is rendered", () => {
		render(() => (
			<Numeric
				question={question}
				result={{ score: 0, feedback: ["No."], correct: ["9.8"] }}
			/>
		));
		expect(input().hasAttribute("aria-describedby")).toBe(false);
	});
});

describe("readonly mode", () => {
	it("shows the number with its unit, not an input", () => {
		render(() => <Numeric question={question} value={9.8} mode="readonly" />);
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(document.querySelector(".mdq-answer-text")?.textContent).toBe(
			"9.8 m/s²",
		);
	});

	it("says when nothing was entered", () => {
		render(() => <Numeric question={question} value={null} mode="readonly" />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
	});
});

describe("review mode", () => {
	it("marks a correct response and shows the expected value", () => {
		render(() => (
			<Numeric
				question={question}
				value="9.81"
				mode="review"
				result={{ score: 1, feedback: [], correct: ["9.8"] }}
			/>
		));
		expect(input().disabled).toBe(true);
		expect(
			document.querySelector(".mdq-input-row")?.getAttribute("data-key"),
		).toBe("correct");
		expect(document.querySelector(".mdq-mark")?.textContent).toBe("Correct");
		expect(document.querySelector(".mdq-expected")?.textContent).toBe(
			"Expected 9.8 m/s²",
		);
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 1.00",
		);
	});

	it("marks a wrong response and links the feedback", () => {
		render(() => (
			<Numeric
				question={question}
				value="10"
				mode="review"
				result={{ score: 0, feedback: ["Check the units."] }}
			/>
		));
		expect(
			document.querySelector(".mdq-input-row")?.getAttribute("data-key"),
		).toBe("incorrect");
		expect(document.querySelector(".mdq-expected")).toBeNull();
		expect(input().getAttribute("aria-describedby")).toBe(
			document.querySelector(".mdq-feedback")?.id,
		);
	});

	it("hides the score but keeps the mark", () => {
		render(() => (
			<Numeric
				question={question}
				value="10"
				mode="review"
				result={{ score: 0, feedback: [] }}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(document.querySelector(".mdq-mark")).toBeTruthy();
	});

	it("uses the messages prop", () => {
		render(() => (
			<Numeric
				question={question}
				value="10"
				mode="review"
				result={{ score: 0, feedback: [], correct: [9.8] }}
				messages={ptBR}
			/>
		));
		expect(document.querySelector(".mdq-expected")?.textContent).toBe(
			"Esperado 9.8 m/s²",
		);
	});
});

describe("NumericInput", () => {
	it("works alone, with no unit", () => {
		const seen: (string | null)[] = [];
		render(() => (
			<NumericInput
				domain="integer"
				messages={en}
				aria-labelledby="x"
				onChange={(v) => seen.push(v)}
			/>
		));
		type("7");
		expect(seen).toEqual(["7"]);
		expect(document.querySelector(".mdq-unit")).toBeNull();
	});
});

it("renders the epilogue", () => {
	render(() => <Numeric question={question} />);
	expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
		"standard",
	);
});
