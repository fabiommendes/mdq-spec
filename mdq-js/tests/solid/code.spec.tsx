// @vitest-environment jsdom

import type { PublicCodeQuestion } from "@mdq/index.js";
import { Code, ptBR } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";
import { createSignal } from "solid-js";

const question: PublicCodeQuestion = {
	type: "code",
	id: "cerrado",
	stem: "Write `area(r)` for a *circle*.",
	epilogue: "Use math.pi.",
	language: "python",
	template: "```python\ndef area(r):\n    pass\n```\n",
	publicTests: [
		{
			format: "python",
			text: "assert area(0) == 0",
			firstLine: 3,
			example: true,
		},
		{
			format: "python",
			text: "assert area(1) > 3",
			firstLine: 9,
			example: false,
		},
		{
			format: "python",
			text: "assert area(2) > 12",
			firstLine: 12,
			example: true,
		},
	],
};

function box(): HTMLTextAreaElement {
	return screen.getByRole("textbox") as HTMLTextAreaElement;
}

function type(text: string): void {
	fireEvent.input(box(), { target: { value: text } });
}

describe("answer mode", () => {
	it("names the box by the stem and treats it as code", () => {
		render(() => <Code question={question} />);
		expect(
			screen.getByRole("textbox", { name: "Write area(r) for a circle." }),
		).toBeTruthy();
		expect(box().getAttribute("data-content")).toBe("code");
		expect(box().getAttribute("spellcheck")).toBe("false");
		expect(document.querySelector(".mdq-language")?.textContent).toBe("python");
		expect(document.querySelector(".mdq-note")).toBeNull();
	});

	it("starts with the code of the template", () => {
		render(() => <Code question={question} />);
		expect(box().value).toBe("def area(r):\n    pass\n");
	});

	it("starts empty without a template", () => {
		render(() => <Code question={{ type: "code", stem: "x" }} />);
		expect(box().value).toBe("");
		expect(document.querySelector(".mdq-language")).toBeNull();
	});

	it("starts with the value, not the template", () => {
		render(() => <Code question={question} value="return 1" />);
		expect(box().value).toBe("return 1");
	});

	it("keeps the text without value and reports each edit", () => {
		const seen: string[] = [];
		render(() => <Code question={question} onChange={(t) => seen.push(t)} />);
		type("def area(r): return r");
		expect(seen).toEqual(["def area(r): return r"]);
		expect(box().value).toBe("def area(r): return r");
	});

	it("follows value, and undoes an edit the parent does not apply", () => {
		const [value, setValue] = createSignal<string | null>(null);
		const { unmount } = render(() => (
			<Code question={question} value={value()} onChange={setValue} />
		));
		expect(box().value).toBe("def area(r):\n    pass\n");
		type("ab");
		expect(value()).toBe("ab");
		expect(box().value).toBe("ab");
		unmount();
		render(() => <Code question={question} value="fixed" />);
		type("x");
		expect(box().value).toBe("fixed");
	});

	it("keeps a cleared box empty instead of bringing the template back", () => {
		const [value, setValue] = createSignal<string | null>(null);
		render(() => (
			<Code question={question} value={value()} onChange={setValue} />
		));
		type("");
		expect(box().value).toBe("");
	});

	it("shows the example regions after the stem, in order", () => {
		render(() => <Code question={question} />);
		const blocks = [...document.querySelectorAll("pre.mdq-code")];
		expect(blocks.map((b) => b.textContent)).toEqual([
			"assert area(0) == 0",
			"assert area(2) > 12",
		]);
		const stem = document.querySelector(".mdq-stem");
		expect(
			stem?.compareDocumentPosition(blocks[0] as Element) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("shows no example block without public tests", () => {
		render(() => <Code question={{ ...question, publicTests: undefined }} />);
		expect(document.querySelector("pre.mdq-code")).toBeNull();
	});

	it("does not render the private fields", () => {
		const leaky = {
			...question,
			tests: [{ format: "python", text: "SECRET_TEST" }],
			rubric: [{ value: 1, text: "SECRET_RUBRIC" }],
			answerKey: "SECRET_KEY",
		} as unknown as PublicCodeQuestion;
		const { container } = render(() => <Code question={leaky} />);
		expect(container.textContent).not.toContain("SECRET");
		expect(box().value).not.toContain("SECRET");
	});

	it("points at no feedback when none is rendered", () => {
		render(() => (
			<Code question={question} result={{ score: 1, feedback: ["Ok."] }} />
		));
		expect(box().hasAttribute("aria-describedby")).toBe(false);
	});

	it("renders the epilogue", () => {
		render(() => <Code question={question} />);
		expect(document.querySelector(".mdq-epilogue")?.textContent).toContain(
			"math.pi",
		);
	});
});

describe("readonly mode", () => {
	it("shows the code as a block in a titled panel, not the template", () => {
		render(() => <Code question={question} value="print(1)" mode="readonly" />);
		expect(screen.queryByRole("textbox")).toBeNull();
		expect(
			screen
				.getByRole("region", { name: "Your answer" })
				.querySelector(".mdq-code code")?.textContent,
		).toBe("print(1)");
	});

	it("says when nothing was written", () => {
		render(() => <Code question={question} value="  " mode="readonly" />);
		expect(document.querySelector(".mdq-empty")?.textContent).toBe(
			"No answer submitted.",
		);
		const none = render(() => (
			<Code question={question} value={null} mode="readonly" />
		));
		expect(none.container.querySelector(".mdq-empty")).toBeTruthy();
	});

	it("does not run HTML in the code", () => {
		render(() => (
			<Code question={question} value={"<img src=x>"} mode="readonly" />
		));
		expect(document.querySelector("img")).toBeNull();
	});
});

describe("review mode", () => {
	it("shows the pending badge, no feedback and the reference solution", () => {
		render(() => (
			<Code
				question={question}
				value="def area(r): return 3"
				mode="review"
				result={{ pending: true, correct: ["def area(r): return pi * r**2"] }}
			/>
		));
		const badge = document.querySelector(".mdq-score");
		expect(badge?.getAttribute("data-sign")).toBe("pending");
		expect(badge?.textContent).toBe("Awaiting grading");
		expect(document.querySelector(".mdq-feedback")).toBeNull();
		expect(
			screen.getByRole("region", { name: "Model answer" }).textContent,
		).toContain("pi * r**2");
		expect(screen.getByRole("region", { name: "Your answer" })).toBeTruthy();
	});

	it("shows the score of an instructor, and links the feedback", () => {
		render(() => (
			<Code
				question={question}
				value="x"
				mode="review"
				result={{ score: 0.5, feedback: ["Use math.pi."] }}
			/>
		));
		expect(document.querySelector(".mdq-score")?.textContent).toBe(
			"Score 0.50",
		);
		expect(document.querySelector(".mdq-feedback")).toBeTruthy();
	});

	it("shows no reference solution while the key is withheld or blank", () => {
		const { unmount } = render(() => (
			<Code
				question={question}
				value="x"
				mode="review"
				result={{ pending: true }}
			/>
		));
		expect(screen.queryByRole("region", { name: "Model answer" })).toBeNull();
		unmount();
		render(() => (
			<Code
				question={question}
				value="x"
				mode="review"
				result={{ pending: true, correct: [" "] }}
			/>
		));
		expect(screen.queryByRole("region", { name: "Model answer" })).toBeNull();
	});

	it("hides the score and pending badge with hideScore", () => {
		render(() => (
			<Code
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
			<Code
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
