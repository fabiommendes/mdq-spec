// @vitest-environment jsdom

import type { PublicEssayQuestion } from "@mdq/index.js";
import { Essay, ptBR } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicEssayQuestion = {
	type: "essay",
	id: "pantanal",
	stem: "Describe the *Pantanal*.",
	epilogue: "Mention the floods.",
};

const code: PublicEssayQuestion = {
	type: "essay",
	stem: "Write a function.",
	content: "code",
	highlight: "python",
};

function box(): HTMLTextAreaElement {
	return screen.getByRole("textbox") as HTMLTextAreaElement;
}

function type(text: string): void {
	fireEvent.input(box(), { target: { value: text } });
}

describe("answer mode", () => {
	it("names the box by the stem", () => {
		render(() => <Essay question={question} />);
		expect(
			screen.getByRole("textbox", { name: "Describe the Pantanal." }),
		).toBeTruthy();
		expect(box().getAttribute("data-content")).toBe("text");
		expect(document.querySelector(".mdq-note")?.textContent).toBe(
			"Markdown is supported.",
		);
	});

	it("keeps the text without value and reports each edit", () => {
		const seen: string[] = [];
		render(() => <Essay question={question} onChange={(t) => seen.push(t)} />);
		type("A wetland.");
		expect(seen).toEqual(["A wetland."]);
		expect(box().value).toBe("A wetland.");
	});

	it("follows value, and undoes an edit the parent does not apply", () => {
		const [value, setValue] = createSignal<string | null>("a");
		const { unmount } = render(() => (
			<Essay question={question} value={value()} onChange={setValue} />
		));
		type("ab");
		expect(value()).toBe("ab");
		expect(box().value).toBe("ab");
		unmount();
		render(() => <Essay question={question} value="fixed" />);
		type("x");
		expect(box().value).toBe("fixed");
	});

	it("shows the language of code and no Markdown note", () => {
		render(() => <Essay question={code} />);
		expect(document.querySelector(".mdq-language")?.textContent).toBe("python");
		expect(document.querySelector(".mdq-note")).toBeNull();
		expect(box().getAttribute("data-content")).toBe("code");
		expect(box().getAttribute("spellcheck")).toBe("false");
	});

	it("points at no feedback when none is rendered", () => {
		render(() => (
			<Essay question={question} result={{ score: 1, feedback: ["Ok."] }} />
		));
		expect(box().hasAttribute("aria-describedby")).toBe(false);
	});

	it("renders the epilogue", () => {
		render(() => <Essay question={question} />);
		expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
			"floods",
		);
	});
});

describe("readonly mode", () => {
	it("shows the text as Markdown in a titled panel", () => {
		render(() => (
			<Essay question={question} value="A **big** wetland." mode="readonly" />
		));
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(
			screen
				.getByRole("region", { name: "Your answer" })
				.querySelector("strong")?.textContent,
		).toBe("big");
	});

	it("keeps whitespace of plain content and shows code as code", () => {
		const { unmount } = render(() => (
			<Essay
				question={{ ...question, content: "plain" }}
				value={"a\n  b"}
				mode="readonly"
			/>
		));
		expect(document.querySelector(".mdq-plain")?.textContent).toBe("a\n  b");
		unmount();
		render(() => <Essay question={code} value="print(1)" mode="readonly" />);
		expect(document.querySelector(".mdq-code code")?.textContent).toBe(
			"print(1)",
		);
	});

	it("does not run HTML in the text", () => {
		render(() => (
			<Essay question={question} value={"<img src=x>"} mode="readonly" />
		));
		expect(document.querySelector("img")).toBeNull();
	});

	it("says when nothing was written", () => {
		render(() => <Essay question={question} value="  " mode="readonly" />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
	});
});

describe("review mode", () => {
	it("shows the pending badge, no feedback and the answer key", () => {
		render(() => (
			<Essay
				question={question}
				value="A wetland."
				mode="review"
				result={{ pending: true, correct: ["It floods every year."] }}
			/>
		));
		const badge = document.querySelector(".mdq-score");
		expect(badge?.getAttribute("data-sign")).toBe("pending");
		expect(badge?.textContent).toBe("Awaiting grading");
		expect(document.querySelector(".mdq-feedback")).toBeNull();
		expect(
			screen.getByRole("region", { name: "Model answer" }).textContent,
		).toContain("floods every year");
		expect(screen.getByRole("region", { name: "Your answer" })).toBeTruthy();
	});

	it("shows the score of an instructor, and links the feedback", () => {
		render(() => (
			<Essay
				question={question}
				value="A wetland."
				mode="review"
				result={{ score: 0.75, feedback: ["Good, but cite the floods."] }}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 0.75",
		);
		expect(document.querySelector(".mdq-feedback")).toBeTruthy();
	});

	it("shows no model answer while the key is withheld or blank", () => {
		const { unmount } = render(() => (
			<Essay
				question={question}
				value="x"
				mode="review"
				result={{ pending: true }}
			/>
		));
		expect(screen.queryByRole("region", { name: "Model answer" })).toBeNull();
		unmount();
		render(() => (
			<Essay
				question={question}
				value="x"
				mode="review"
				result={{ pending: true, correct: ["  "] }}
			/>
		));
		expect(screen.queryByRole("region", { name: "Model answer" })).toBeNull();
	});

	it("hides the score and pending badge with hideScore", () => {
		render(() => (
			<Essay
				question={question}
				value="x"
				mode="review"
				result={{ pending: true }}
				hideScore
			/>
		));
		expect(document.querySelector(".mdq-score")).toBeNull();
	});

	it("uses the messages prop", () => {
		render(() => (
			<Essay
				question={question}
				value="x"
				mode="review"
				result={{ pending: true, correct: ["y"] }}
				messages={ptBR}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Aguardando correção",
		);
		expect(
			screen.getByRole("region", { name: "Resposta modelo" }),
		).toBeTruthy();
	});
});
