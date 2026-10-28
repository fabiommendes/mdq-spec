import { type JSX, Match, Switch } from "solid-js";
import type { PublicQuestion } from "../index.js";
import { Essay, type EssayProps } from "./Essay.jsx";
import { FillIn, type FillInProps } from "./FillIn.jsx";
import { MultipleChoice, type MultipleChoiceProps } from "./MultipleChoice.jsx";
import {
	MultipleSelection,
	type MultipleSelectionProps,
} from "./MultipleSelection.jsx";
import { type Messages, useMessages } from "./messages.jsx";
import { Numeric, type NumericProps } from "./Numeric.jsx";
import { ShortAnswer, type ShortAnswerProps } from "./ShortAnswer.jsx";
import { TrueFalse, type TrueFalseProps } from "./TrueFalse.jsx";

/**
 * The props of `QuestionView`: the props of the component for the type of
 * `question`. A union, not one flat bag, because `value`, `onChange` and
 * `result` differ from type to type.
 */
export type QuestionViewProps =
	| MultipleChoiceProps
	| MultipleSelectionProps
	| TrueFalseProps
	| NumericProps
	| ShortAnswerProps
	| EssayProps
	| FillInProps
	| UnsupportedProps;

/** An ordering question, or a type this version does not know. */
export interface UnsupportedProps {
	question: Exclude<
		PublicQuestion,
		{
			type:
				| "multiple-choice"
				| "multiple-selection"
				| "true-false"
				| "numeric"
				| "short-answer"
				| "essay"
				| "fill-in";
		}
	>;
	messages?: Partial<Messages>;
}

/**
 * Renders a question with the component of its `type`.
 *
 * An ordering question has no component yet, and neither has a type this
 * version does not know (a payload from a newer server): both get a
 * `.mdq-question[data-type]` holding a `.mdq-unsupported` note, rather than a
 * blank space.
 */
export function QuestionView(props: QuestionViewProps): JSX.Element {
	const messages = useMessages(() => props.messages);
	// TypeScript cannot narrow a union by a nested discriminant, so each arm
	// asserts the shape its own `when` has proved. The spread stays reactive.
	const type = () => props.question.type as string;

	return (
		<Switch
			fallback={
				<div class="mdq-question" data-type={type()}>
					<p class="mdq-unsupported">{messages().notSupported(type())}</p>
				</div>
			}
		>
			<Match when={type() === "multiple-choice"}>
				<MultipleChoice {...(props as MultipleChoiceProps)} />
			</Match>
			<Match when={type() === "multiple-selection"}>
				<MultipleSelection {...(props as MultipleSelectionProps)} />
			</Match>
			<Match when={type() === "true-false"}>
				<TrueFalse {...(props as TrueFalseProps)} />
			</Match>
			<Match when={type() === "numeric"}>
				<Numeric {...(props as NumericProps)} />
			</Match>
			<Match when={type() === "short-answer"}>
				<ShortAnswer {...(props as ShortAnswerProps)} />
			</Match>
			<Match when={type() === "essay"}>
				<Essay {...(props as EssayProps)} />
			</Match>
			<Match when={type() === "fill-in"}>
				<FillIn {...(props as FillInProps)} />
			</Match>
		</Switch>
	);
}
