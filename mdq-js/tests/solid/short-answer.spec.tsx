// @vitest-environment jsdom

import type { PublicShortAnswerQuestion } from "@mdq/index.js";
import { ptBR, ShortAnswer } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicShortAnswerQuestion = {
	type: "short-answer",
	id: "capital",
	stem: "What is the *capital* of Brazil?",
	epilogue: "Since 1960.",
};

const validated: PublicShortAnswerQuestion = {
	...question,
	preAccept: [{ pattern: "/^\\w+$/", feedback: "Write one word." }],
	preReject: [{ pattern: "Rio", feedback: "Rio is not it." }, "Sao Paulo"],
};

function input(): HTMLInputElement {
	return screen.getByRole("textbox") as HTMLInputElement;
}

function type(text: string): void {
	fireEvent.input(input(), { target: { value: text } });
}

describe("answer mode", () => {
	it("names the input by the stem", () => {
		render(() => <ShortAnswer question={question} />);
		expect(
			screen.getByRole("textbox", { name: "What is the capital of Brazil?" }),
		).toBeTruthy();
	});

	it("keeps the text without value and reports each edit", () => {
		const seen: string[] = [];
		render(() => (
			<ShortAnswer question={question} onChange={(text) => seen.push(text)} />
		));
		type("Brasília");
		expect(seen).toEqual(["Brasília"]);
		expect(input().value).toBe("Brasília");
	});

	it("follows value when the parent applies the change", () => {
		const [value, setValue] = createSignal<string | null>("a");
		render(() => (
			<ShortAnswer question={question} value={value()} onChange={setValue} />
		));
		type("ab");
		expect(value()).toBe("ab");
		expect(input().value).toBe("ab");
	});

	it("undoes an edit the parent does not apply", () => {
		render(() => <ShortAnswer question={question} value="Brasília" />);
		type("x");
		expect(input().value).toBe("Brasília");
	});

	it("shows no warning without patterns", () => {
		render(() => <ShortAnswer question={question} />);
		type("anything");
		expect(document.querySelector(".mdq-warning")).toBeNull();
		expect(input().hasAttribute("aria-invalid")).toBe(false);
	});

	it("warns with the feedback of a preReject pattern", () => {
		render(() => <ShortAnswer question={validated} />);
		type("rio");
		const warning = document.querySelector(".mdq-warning");
		expect(warning?.textContent).toBe("Rio is not it.");
		expect(input().getAttribute("aria-invalid")).toBe("true");
		expect(input().getAttribute("aria-describedby")).toBe(warning?.id);
	});

	it("warns with the format hint when no preAccept pattern matches", () => {
		render(() => <ShortAnswer question={validated} />);
		type("two words");
		expect(document.querySelector(".mdq-warning")?.textContent).toBe(
			"Write one word.",
		);
	});

	it("falls back to a message when the pattern has no feedback", () => {
		render(() => <ShortAnswer question={validated} messages={ptBR} />);
		type("Sao Paulo");
		expect(document.querySelector(".mdq-warning")?.textContent).toBe(
			ptBR.shortAnswerMismatch,
		);
	});

	it("clears the warning for a valid text and ignores a blank one", () => {
		render(() => <ShortAnswer question={validated} />);
		type("Brasilia");
		expect(document.querySelector(".mdq-warning")).toBeNull();
		expect(input().hasAttribute("aria-describedby")).toBe(false);
		type("   ");
		expect(document.querySelector(".mdq-warning")).toBeNull();
	});

	it("notes a question graded by hand", () => {
		render(() => (
			<ShortAnswer question={{ ...question, unmatched: "manual" }} />
		));
		expect(document.querySelector(".mdq-note")?.textContent).toContain(
			"by hand",
		);
	});
});

describe("readonly mode", () => {
	it("shows the text, not an input", () => {
		render(() => (
			<ShortAnswer question={question} value="Brasília" mode="readonly" />
		));
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(document.querySelector(".mdq-answer-text")?.textContent).toBe(
			"Brasília",
		);
	});

	it("says when nothing was written", () => {
		render(() => (
			<ShortAnswer question={question} value="  " mode="readonly" />
		));
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
	});
});

describe("review mode", () => {
	it("marks a correct response and lists the accepted answers", () => {
		render(() => (
			<ShortAnswer
				question={question}
				value="brasilia"
				mode="review"
				result={{ score: 1, feedback: ["Good call!"], correct: ["Brasília"] }}
			/>
		));
		expect(input().disabled).toBe(true);
		expect(
			document.querySelector(".mdq-input-row")?.getAttribute("data-key"),
		).toBe("correct");
		expect(document.querySelector(".mdq-mark")?.textContent).toBe("Correct");
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 1.00",
		);
		expect(document.querySelector(".mdq-accepted-title")?.textContent).toBe(
			"Accepted answer",
		);
		const feedback = document.querySelector(".mdq-feedback");
		expect(input().getAttribute("aria-describedby")).toBe(feedback?.id);
	});

	it("marks a wrong response", () => {
		render(() => (
			<ShortAnswer
				question={question}
				value="Rio"
				mode="review"
				result={{ score: 0, feedback: [], correct: ["Brasília", "Brasilia"] }}
			/>
		));
		expect(
			document.querySelector(".mdq-input-row")?.getAttribute("data-key"),
		).toBe("incorrect");
		expect(document.querySelector(".mdq-accepted-title")?.textContent).toBe(
			"Accepted answers",
		);
		expect(input().hasAttribute("aria-describedby")).toBe(false);
	});

	it("shows a pending badge and no verdict for a pending result", () => {
		render(() => (
			<ShortAnswer
				question={question}
				value="Planalto Central"
				mode="review"
				result={{ pending: true }}
			/>
		));
		expect(
			document.querySelector(".mdq-score")?.getAttribute("data-sign"),
		).toBe("pending");
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Awaiting grading",
		);
		expect(document.querySelector("[data-key]")).toBeNull();
		expect(document.querySelector(".mdq-mark")).toBeNull();
		expect(document.querySelector(".mdq-feedback")).toBeNull();
	});

	it("hides the score but keeps the mark", () => {
		render(() => (
			<ShortAnswer
				question={question}
				value="Rio"
				mode="review"
				result={{ score: 0, feedback: [] }}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
		expect(document.querySelector(".mdq-mark")?.textContent).toBe("Incorrect");
	});

	it("shows no accepted answers while the key is withheld", () => {
		render(() => (
			<ShortAnswer
				question={question}
				value="Rio"
				mode="review"
				result={{ score: 0, feedback: [] }}
			/>
		));
		expect(document.querySelector(".mdq-accepted")).toBeNull();
	});

	it("uses the messages prop", () => {
		render(() => (
			<ShortAnswer
				question={question}
				value="Rio"
				mode="review"
				result={{ pending: true }}
				messages={ptBR}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Aguardando correção",
		);
	});
});

it("renders the epilogue", () => {
	render(() => <ShortAnswer question={question} />);
	expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
		"1960",
	);
});
