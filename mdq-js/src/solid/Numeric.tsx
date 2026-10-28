import { createUniqueId, type JSX, Show } from "solid-js";
import type { PublicNumericQuestion } from "../index.js";
import type { NumericResponse } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Mark } from "./Mark.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Messages, useMessages } from "./messages.jsx";
import { NumericInput } from "./NumericInput.jsx";
import { Score } from "./Score.jsx";
import type { QuestionMode, QuestionResult } from "./types.js";

export interface NumericProps {
	question: PublicNumericQuestion;
	/** The entered number. Omit it to let the component keep the state. */
	value?: NumericResponse | null;
	/**
	 * Gets the entered text as a response string (`"3.1415"`, `"1/3"`), or
	 * `null` for an empty box or a text that is not a valid number. The unit
	 * is the declared one and is not part of the response.
	 */
	onChange?: (value: string | null) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. The mark stays. */
	hideScore?: boolean;
	/** `correct` holds the `answer`; the verdict comes from the score. */
	result?: QuestionResult<NumericResponse>;
	messages?: Partial<Messages>;
}

function withUnit(text: string, unit: string | undefined): string {
	return unit ? `${text} ${unit}` : text;
}

function textOf(value: NumericResponse): string {
	return typeof value === "object" ? textOf(value.value) : String(value);
}

/**
 * A numeric question: `.mdq-question[data-type="numeric"]`.
 *
 * One `NumericInput` in a `.mdq-input-row`. In `review` mode the row has
 * `data-key` from the score (1 is correct), because the tolerance is private
 * and the key alone cannot tell. `result.correct` is shown as the expected
 * value.
 */
export function Numeric(props: NumericProps): JSX.Element {
	const messages = useMessages(() => props.messages);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const feedbackId = `${id}-feedback`;

	const review = () => (mode() === "review" ? props.result : undefined);
	const verdict = (): "correct" | "incorrect" | undefined => {
		const result = review();
		if (result === undefined) return undefined;
		return result.score >= 1 ? "correct" : "incorrect";
	};
	const hasFeedback = () => (review()?.feedback.length ?? 0) > 0;
	const unit = () => props.question.unit;

	return (
		<div class="mdq-question" data-type="numeric" data-mode={mode()}>
			<Show when={!props.hideScore && review()}>
				{(result) => (
					<div class="mdq-header">
						<Score score={result().score} messages={messages()} />
					</div>
				)}
			</Show>

			<div id={stemId} class="mdq-stem">
				<Markdown text={props.question.stem} />
			</div>

			<Show
				when={mode() !== "readonly"}
				fallback={
					<Show
						when={props.value != null}
						fallback={<p class="mdq-empty">{messages().noAnswer}</p>}
					>
						<p class="mdq-answer">
							<span class="mdq-answer-label">{messages().yourAnswerLabel}</span>{" "}
							<span class="mdq-answer-text">
								{withUnit(textOf(props.value as NumericResponse), unit())}
							</span>
						</p>
					</Show>
				}
			>
				<div class="mdq-input-row" data-key={verdict()}>
					<NumericInput
						domain={props.question.domain}
						unit={unit()}
						value={props.value}
						onChange={(next) => props.onChange?.(next)}
						disabled={mode() !== "answer"}
						placeholder={messages().yourAnswer}
						aria-labelledby={stemId}
						aria-describedby={hasFeedback() ? feedbackId : undefined}
						messages={messages()}
					/>
					<Show when={verdict()}>
						{(kind) => <Mark kind={kind()} messages={messages()} />}
					</Show>
					<Show when={review()?.correct?.[0]}>
						{(answer) => (
							<span class="mdq-expected">
								{messages().expectedValue(withUnit(textOf(answer()), unit()))}
							</span>
						)}
					</Show>
				</div>
			</Show>

			<Show when={props.question.epilogue}>
				<div class="mdq-epilogue">
					<Markdown text={props.question.epilogue} />
				</div>
			</Show>

			<Show when={review()}>
				{(result) => (
					<Feedback
						id={feedbackId}
						feedback={result().feedback}
						score={result().score}
					/>
				)}
			</Show>
		</div>
	);
}
