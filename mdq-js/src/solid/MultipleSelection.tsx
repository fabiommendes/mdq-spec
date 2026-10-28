import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	Show,
} from "solid-js";
import type { PublicMultipleSelectionQuestion } from "../index.js";
import type { MultipleSelectionResponse } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Mark } from "./Mark.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Locale, type Messages, useMessages } from "./messages.jsx";
import { Score } from "./Score.jsx";
import type { QuestionMode, QuestionResult } from "./types.js";

export interface MultipleSelectionProps {
	question: PublicMultipleSelectionQuestion;
	/** The ticked choice ids. Omit it to let the component keep the state. */
	value?: MultipleSelectionResponse | null;
	/** Gets the ticked ids on every change, in the order of the choices. */
	onChange?: (choiceIds: MultipleSelectionResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. The marks stay. */
	hideScore?: boolean;
	result?: QuestionResult<MultipleSelectionResponse>;
	messages?: Partial<Messages>;
	locale?: Locale;
}

/**
 * A multiple-selection question: `.mdq-question[data-type="multiple-selection"]`.
 *
 * Like `MultipleChoice`, but each choice is a checkbox. In `review` mode with
 * a key, a choice is judged by its ticked state, not only by being ticked: it
 * has `data-key="correct"` when the state matches a correct response, and
 * `data-key="incorrect"` when it does not. A correct choice left unticked is
 * therefore incorrect, and a wrong choice rightly left alone is correct.
 *
 * Without `value` the component keeps the ticks itself. With `value` it shows
 * only what `value` says.
 */
export function MultipleSelection(props: MultipleSelectionProps): JSX.Element {
	const messages = useMessages(props);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const feedbackId = `${id}-feedback`;

	const [internal, setInternal] = createSignal<MultipleSelectionResponse>(
		props.value ?? [],
	);
	const ticked = createMemo(
		() => new Set(props.value !== undefined ? (props.value ?? []) : internal()),
	);

	const review = () => (mode() === "review" ? props.result : undefined);
	const key = createMemo(() => review()?.correct?.map((ids) => new Set(ids)));
	const hasFeedback = () => (review()?.feedback.length ?? 0) > 0;

	function keyOf(choiceId: string): "correct" | "incorrect" | undefined {
		const responses = key();
		if (responses === undefined) return undefined;
		const isTicked = ticked().has(choiceId);
		return responses.some((ids) => ids.has(choiceId) === isTicked)
			? "correct"
			: "incorrect";
	}

	let fieldset: HTMLFieldSetElement | undefined;

	function toggle(choiceId: string): void {
		if (mode() !== "answer") return;
		const next = new Set(ticked());
		if (!next.delete(choiceId)) next.add(choiceId);
		const ids = props.question.choices
			.map((choice) => choice.id)
			.filter((choiceId) => next.has(choiceId));
		setInternal(ids);
		props.onChange?.(ids);
		// The browser has already flipped the box. Put it back where the
		// state is, for a parent that did not take the new value.
		fieldset?.querySelectorAll("input").forEach((input) => {
			input.checked = ticked().has(input.value);
		});
	}

	return (
		<div class="mdq-question" data-type="multiple-selection" data-mode={mode()}>
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
							data-selected={ticked().has(choice.id) ? "" : undefined}
							data-key={keyOf(choice.id)}
						>
							<input
								type="checkbox"
								class="mdq-choice-input"
								value={choice.id}
								checked={ticked().has(choice.id)}
								disabled={mode() !== "answer"}
								onChange={() => toggle(choice.id)}
								aria-describedby={hasFeedback() ? feedbackId : undefined}
							/>
							<Markdown class="mdq-choice-text" inline text={choice.text} />
							<Show when={mode() === "readonly" && ticked().has(choice.id)}>
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
