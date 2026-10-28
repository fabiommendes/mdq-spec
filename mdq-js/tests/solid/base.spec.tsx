// @vitest-environment jsdom
/**
 * The base components of `mdq/solid`. A question view is tested in its own
 * file; these hold what every view shares.
 */

import {
	en,
	Feedback,
	formatScore,
	type LocalizedProps,
	Mark,
	Markdown,
	MdqProvider,
	plainInline,
	ptBR,
	Score,
	useMessages,
} from "@mdq/solid/index.js";
import { render, screen } from "@solidjs/testing-library";
import type { JSX } from "solid-js";

function Probe(props: LocalizedProps): JSX.Element {
	const messages = useMessages(props);
	return <Mark kind="correct" messages={messages()} />;
}

describe("messages", () => {
	it("defaults to English without a provider", () => {
		render(() => <Probe />);
		expect(screen.getByText("Correct")).toBeTruthy();
	});

	it("takes a partial dictionary from the provider", () => {
		render(() => (
			<MdqProvider messages={{ correct: "Certa" }}>
				<Probe />
			</MdqProvider>
		));
		expect(screen.getByText("Certa")).toBeTruthy();
	});

	it("merges the component prop over the provider", () => {
		render(() => (
			<MdqProvider messages={ptBR}>
				<Probe messages={{ correct: "OK" }} />
			</MdqProvider>
		));
		expect(screen.getByText("OK")).toBeTruthy();
	});

	it("picks a dictionary by locale, over the provider", () => {
		render(() => (
			<MdqProvider messages={{ correct: "Certa" }}>
				<Probe locale="pt-BR" />
			</MdqProvider>
		));
		expect(screen.getByText("Correta")).toBeTruthy();
	});

	it("takes a locale on the provider", () => {
		render(() => (
			<MdqProvider locale="pt-BR">
				<Probe messages={{ yourAnswer: "x" }} />
			</MdqProvider>
		));
		expect(screen.getByText("Correta")).toBeTruthy();
	});

	it("has every key in Portuguese", () => {
		expect(Object.keys(ptBR).sort()).toEqual(Object.keys(en).sort());
	});
});

describe("Markdown", () => {
	it("renders nothing for empty text", () => {
		const { container } = render(() => <Markdown text="" />);
		expect(container.innerHTML).toBe("");
	});

	it("escapes raw HTML", () => {
		const { container } = render(() => (
			<Markdown text={'<img src=x onerror="alert(1)">'} />
		));
		expect(container.querySelector("img")).toBeNull();
	});

	it("renders inline text with no paragraph", () => {
		const { container } = render(() => <Markdown inline text="`O(n)`" />);
		expect(container.querySelector("p")).toBeNull();
		expect(container.querySelector("code")?.textContent).toBe("O(n)");
	});
});

describe("Score", () => {
	it.each([
		[0.5, "0.50", "positive"],
		[0, "0.00", "zero"],
		[-0.25, "−0.25", "negative"],
	])("formats %s", (score, text, sign) => {
		const { container } = render(() => <Score score={score} messages={en} />);
		const badge = container.querySelector(".mdq-score");
		expect(badge?.textContent).toBe(`Score ${text}`);
		expect(badge?.getAttribute("data-sign")).toBe(sign);
		expect(formatScore(score)).toBe(text);
	});
});

describe("Feedback", () => {
	it("renders nothing without feedback", () => {
		const { container } = render(() => (
			<Feedback id="f" feedback={[]} score={1} />
		));
		expect(container.innerHTML).toBe("");
	});

	it("renders one item per message", () => {
		const { container } = render(() => (
			<Feedback id="f" feedback={["a", "*b*"]} score={-1} />
		));
		const box = container.querySelector(".mdq-feedback");
		expect(box?.getAttribute("data-sign")).toBe("negative");
		expect(box?.querySelectorAll(".mdq-feedback-item")).toHaveLength(2);
		expect(box?.querySelector("em")?.textContent).toBe("b");
	});
});

describe("Mark", () => {
	it("hides the icon and keeps the text for a screen reader", () => {
		const { container } = render(() => <Mark kind="selected" messages={en} />);
		expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
		expect(container.querySelector(".mdq-sr-only")?.textContent).toBe(
			"Your answer",
		);
	});
});

describe("plainInline", () => {
	it.each([
		["*Shrubs* and **trees**", "Shrubs and trees"],
		["`O(n)` time", "O(n) time"],
		["![Ipê amarelo](ipe.png)", "Ipê amarelo"],
		["[Pantanal](https://example.org)", "Pantanal"],
	])("reads %s as %s", (markdown, text) => {
		expect(plainInline(markdown)).toBe(text);
	});
});
