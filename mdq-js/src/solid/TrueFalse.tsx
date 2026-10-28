import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	Show,
} from "solid-js";
import type { PublicTrueFalseQuestion } from "../index.js";
import type { TrueFalseResponse } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Mark } from "./Mark.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Messages, useMessages } from "./messages.jsx";
import { Score } from "./Score.jsx";
import type { QuestionMode, QuestionResult } from "./types.js";

export interface TrueFalseProps {
	question: PublicTrueFalseQuestion;
	/**
	 * The judgement of each statement id. A statement that is absent or `null`
	 * is an abstention. Omit it to let the component keep the state.
	 */
	value?: TrueFalseResponse | null;
	/** Gets a new mapping on every change. An abstained statement has no key. */
	onChange?: (response: TrueFalseResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. The marks stay. */
	hideScore?: boolean;
	result?: QuestionResult<TrueFalseResponse>;
	messages?: Partial<Messages>;
}

type Judgement = boolean | undefined;

/**
 * A true/false question: `.mdq-question[data-type="true-false"]`.
 *
 * Each statement is a `.mdq-statement` row with one three-state toggle,
 * `.mdq-toggle[data-state="true" | "false" | "unmarked"]`, because a
 * statement can be abstained as well as judged. A click cycles unmarked,
 * true, false, unmarked. Cycling back to unmarked removes the key from the
 * response: an absent key is how an abstention is written.
 *
 * The toggle is a `<button role="checkbox">`: a native checkbox has two
 * states, and its `indeterminate` state cannot be reached from the keyboard.
 * In `review` mode with a key, a row has `data-key="correct"` or
 * `data-key="incorrect"`, and an abstained row has none. The row is correct
 * when its judgement is the one of any correct response.
 */
export function TrueFalse(props: TrueFalseProps): JSX.Element {
	const messages = useMessages(() => props.messages);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const hintId = `${id}-hint`;
	const feedbackId = `${id}-feedback`;

	const [internal, setInternal] = createSignal<TrueFalseResponse>(
		props.value ?? {},
	);
	const judgements = (): TrueFalseResponse =>
		props.value !== undefined ? (props.value ?? {}) : internal();
	const judged = (statementId: string): Judgement =>
		judgements()[statementId] ?? undefined;

	const review = () => (mode() === "review" ? props.result : undefined);
	const key = createMemo(() => review()?.correct);
	const hasFeedback = () => (review()?.feedback.length ?? 0) > 0;

	function keyOf(statementId: string): "correct" | "incorrect" | undefined {
		const responses = key();
		const mark = judged(statementId);
		if (responses === undefined || mark === undefined) return undefined;
		return responses.some((response) => response[statementId] === mark)
			? "correct"
			: "incorrect";
	}

	function judge(statementId: string, mark: Judgement): void {
		if (mode() !== "answer") return;
		const next: Record<string, boolean | null> = { ...judgements() };
		if (mark === undefined) delete next[statementId];
		else next[statementId] = mark;
		setInternal(next);
		props.onChange?.(next);
	}

	/** Unmarked, then true, then false, then unmarked again. */
	function cycle(statementId: string): void {
		const current = judged(statementId);
		judge(
			statementId,
			current === undefined ? true : current ? false : undefined,
		);
	}

	const state = (mark: Judgement) =>
		mark === undefined ? "unmarked" : mark ? "true" : "false";

	const describedBy = () =>
		hasFeedback() ? `${hintId} ${feedbackId}` : hintId;

	const answered = () =>
		Object.values(judgements()).some((mark) => mark !== null);

	return (
		<div class="mdq-question" data-type="true-false" data-mode={mode()}>
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

			<fieldset class="mdq-choices" aria-labelledby={stemId}>
				<span id={hintId} class="mdq-sr-only">
					{messages().trueFalseHint}
				</span>
				<For each={props.question.choices}>
					{(statement, index) => {
						const textId = `${id}-statement-${index()}`;
						return (
							<div
								class="mdq-statement"
								data-key={keyOf(statement.id)}
								data-state={state(judged(statement.id))}
							>
								<span id={textId} class="mdq-statement-text">
									<Markdown inline text={statement.text} />
								</span>
								<span
									class="mdq-toggle-label"
									data-active={judged(statement.id) === false ? "" : undefined}
									aria-hidden="true"
								>
									{messages().falseLabel}
								</span>
								{/* biome-ignore lint/a11y/useSemanticElements: a native checkbox has two states, and `indeterminate` cannot be reached from the keyboard */}
								<button
									type="button"
									role="checkbox"
									class="mdq-toggle"
									data-state={state(judged(statement.id))}
									aria-checked={
										judged(statement.id) === undefined
											? "mixed"
											: judged(statement.id)
												? "true"
												: "false"
									}
									aria-labelledby={textId}
									aria-describedby={describedBy()}
									disabled={mode() !== "answer"}
									onClick={() => cycle(statement.id)}
								/>
								<span
									class="mdq-toggle-label"
									data-active={judged(statement.id) === true ? "" : undefined}
									aria-hidden="true"
								>
									{messages().trueLabel}
								</span>
								<Show when={keyOf(statement.id)}>
									{(kind) => <Mark kind={kind()} messages={messages()} />}
								</Show>
							</div>
						);
					}}
				</For>
			</fieldset>

			<Show when={mode() === "readonly" && !answered()}>
				<p class="mdq-empty">{messages().noAnswer}</p>
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
