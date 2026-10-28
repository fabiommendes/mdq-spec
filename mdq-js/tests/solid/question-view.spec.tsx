// @vitest-environment jsdom

import type { PublicOrderingQuestion, PublicQuestion } from "@mdq/index.js";
import { QuestionView } from "@mdq/solid/index.js";
import { fireEvent, render, screen } from "@solidjs/testing-library";

const questions: PublicQuestion[] = [
	{
		type: "multiple-choice",
		stem: "mc",
		choices: [
			{ id: "a", text: "A" },
			{ id: "b", text: "B" },
		],
	},
	{
		type: "multiple-selection",
		stem: "ms",
		choices: [
			{ id: "a", text: "A" },
			{ id: "b", text: "B" },
		],
	},
	{
		type: "true-false",
		stem: "tf",
		choices: [
			{ id: "a", text: "A" },
			{ id: "b", text: "B" },
		],
	},
	{ type: "numeric", stem: "num", domain: "integer" },
	{ type: "short-answer", stem: "sa" },
	{ type: "essay", stem: "es" },
	{
		type: "fill-in",
		stem: "fi [^x]",
		blanks: [{ id: "x", type: "short-answer" }],
	},
	{
		type: "ordering",
		stem: "or",
		content: "text",
		unmatched: "incorrect",
		pool: [
			[0, "A"],
			[0, "B"],
		],
	},
];

describe("QuestionView", () => {
	it.each(
		questions,
	)("renders a $type question with its component", (question) => {
		const { container } = render(() => <QuestionView question={question} />);
		const root = container.querySelector(".mdq-question");
		expect(root?.getAttribute("data-type")).toBe(question.type);
		expect(root?.getAttribute("data-mode")).toBe("answer");
	});

	it("passes the props through", () => {
		const seen: string[] = [];
		render(() => (
			<QuestionView
				question={questions[0] as PublicQuestion & { type: "multiple-choice" }}
				onChange={(id) => seen.push(id)}
			/>
		));
		fireEvent.click(screen.getAllByRole("radio")[1] as HTMLElement);
		expect(seen).toEqual(["b"]);
	});

	it("shows a note for a type it does not know", () => {
		const { container } = render(() => (
			<QuestionView
				question={
					{ type: "hotspot", stem: "x" } as unknown as PublicOrderingQuestion
				}
			/>
		));
		expect(container.querySelector(".mdq-unsupported")?.textContent).toBe(
			'Questions of type "hotspot" cannot be shown yet.',
		);
	});
});
