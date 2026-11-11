import type {
	PublicEssayQuestion,
	PublicNumericQuestion,
	PublicShortAnswerQuestion,
} from "@mdq/index.js";
import { Essay, Numeric, ShortAnswer } from "@mdq/solid/index.js";
import type { JSX } from "solid-js";

/// The question views the hydration spec renders on the server and hydrates in
/// the browser. Each one takes the answer as a getter, so the spec can later
/// change it.

const essay: PublicEssayQuestion = { type: "essay", stem: "Describe it." };

const short: PublicShortAnswerQuestion = {
	type: "short-answer",
	stem: "Name it.",
};

const numeric: PublicNumericQuestion = {
	type: "numeric",
	stem: "How many?",
	domain: "decimal",
};

export const views = {
	essay: (answer: () => string) => <Essay question={essay} value={answer()} />,
	"short-answer": (answer: () => string) => (
		<ShortAnswer question={short} value={answer()} />
	),
	numeric: (answer: () => string) => (
		<Numeric question={numeric} value={answer()} />
	),
} satisfies Record<string, (answer: () => string) => JSX.Element>;

export type ViewName = keyof typeof views;

/// The answers each view is rendered with on the server, by case name.
export const cases = {
	essay: { view: "essay", answer: "saved essay" },
	"essay-leading-newline": { view: "essay", answer: "\nsecond line" },
	"essay-empty": { view: "essay", answer: "" },
	"short-answer": { view: "short-answer", answer: "saved short answer" },
	numeric: { view: "numeric", answer: "3.14" },
} as const satisfies Record<string, { view: ViewName; answer: string }>;

export type CaseName = keyof typeof cases;
