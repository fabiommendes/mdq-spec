import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	Show,
} from "solid-js";
import type { PublicMultipleChoiceQuestion } from "../index.js";
import type { MultipleChoiceResponse } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Mark } from "./Mark.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Locale, type Messages, useMessages } from "./messages.jsx";
import { Score } from "./Score.jsx";
import type { QuestionMode, QuestionResult } from "./types.js";

export interface MultipleChoiceProps {
	question: PublicMultipleChoiceQuestion;
	/** The picked choice id. Omit it to let the component keep the state. */
	value?: MultipleChoiceResponse | null;
	onChange?: (choiceId: MultipleChoiceResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. The marks stay. */
	hideScore?: boolean;
	result?: QuestionResult<MultipleChoiceResponse>;
	messages?: Partial<Messages>;
	locale?: Locale;
}

/**
 * A multiple-choice question: `.mdq-question[data-type="multiple-choice"]`.
 *
 * Each choice is a `.mdq-choice` label with `data-selected` when it is
 * picked and, in `review` mode with a key, `data-key="correct"` or
 * `data-key="incorrect"`. The choices are shown in the order of the question;
 * shuffling them is the host's job.
 *
 * Without `value` the component keeps the picked choice itself. With `value`
 * it shows only what `value` says: a click the parent does not apply is undone
 * in the DOM too.
 */
export function MultipleChoice(props: MultipleChoiceProps): JSX.Element {
	const messages = useMessages(props);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const feedbackId = `${id}-feedback`;

	const [internal, setInternal] = createSignal(props.value ?? null);
	const selected = () => (props.value !== undefined ? props.value : internal());

	const review = () => (mode() === "review" ? props.result : undefined);
	const correct = createMemo(() => {
		const key = review()?.correct;
		return key === undefined ? undefined : new Set(key);
	});
	const hasFeedback = () => (review()?.feedback.length ?? 0) > 0;

	function keyOf(choiceId: string): "correct" | "incorrect" | undefined {
		const key = correct();
		if (key === undefined) return undefined;
		if (key.has(choiceId)) return "correct";
		return selected() === choiceId ? "incorrect" : undefined;
	}

	let fieldset: HTMLFieldSetElement | undefined;

	function pick(choiceId: string): void {
		if (mode() !== "answer") return;
		setInternal(choiceId);
		props.onChange?.(choiceId);
		// The browser has already moved the check. Put it back where the
		// state is, for a parent that did not take the new value.
		fieldset?.querySelectorAll("input").forEach((input) => {
			input.checked = input.value === selected();
		});
	}

	return (
		<div class="mdq-question" data-type="multiple-choice" data-mode={mode()}>
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

			<fieldset ref={fieldset} class="mdq-choices" aria-labelledby={stemId}>
				<For each={props.question.choices}>
					{(choice) => (
						<label
							class="mdq-choice"
							data-selected={selected() === choice.id ? "" : undefined}
							data-key={keyOf(choice.id)}
						>
							<input
								type="radio"
								class="mdq-choice-input"
								name={id}
								value={choice.id}
								checked={selected() === choice.id}
								disabled={mode() !== "answer"}
								onChange={() => pick(choice.id)}
								aria-describedby={hasFeedback() ? feedbackId : undefined}
							/>
							<Markdown class="mdq-choice-text" inline text={choice.text} />
							<Show when={mode() === "readonly" && selected() === choice.id}>
								<Mark kind="selected" messages={messages()} />
							</Show>
							<Show when={keyOf(choice.id)}>
								{(kind) => <Mark kind={kind()} messages={messages()} />}
							</Show>
						</label>
					)}
				</For>
			</fieldset>

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
