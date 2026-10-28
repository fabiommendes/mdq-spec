import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	Show,
} from "solid-js";
import type { PublicShortAnswerQuestion } from "../index.js";
import { prevalidateText } from "../models/text.js";
import type { TextResponse } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Mark } from "./Mark.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Locale, type Messages, useMessages } from "./messages.jsx";
import { Pending } from "./Pending.jsx";
import { Score } from "./Score.jsx";
import { TextInput } from "./TextInput.jsx";
import { isPending, type QuestionMode, type ReviewResult } from "./types.js";

export interface ShortAnswerProps {
	question: PublicShortAnswerQuestion;
	/** The text the student wrote. Omit it to let the component keep the state. */
	value?: TextResponse | null;
	onChange?: (text: TextResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. The mark stays. */
	hideScore?: boolean;
	/**
	 * `correct` is the list from `correctResponses()`: the literal patterns of
	 * `accept`. It leaves out the regexes, so it never proves a response wrong;
	 * the verdict comes from the score.
	 */
	result?: ReviewResult<TextResponse>;
	messages?: Partial<Messages>;
	locale?: Locale;
}

/**
 * A short-answer question: `.mdq-question[data-type="short-answer"]`.
 *
 * In `answer` mode the text is checked against `preAccept` and `preReject`
 * with `prevalidateText` as the student types. A failing text gets
 * `aria-invalid` and a `.mdq-warning` with the pattern feedback; it is advice,
 * the host decides whether to hold back a submission. A blank text is not
 * checked.
 *
 * In `review` mode the verdict is `data-key` on `.mdq-input-row`, from the
 * score (1 is correct). A pending result shows the `Pending` badge and no verdict.
 */
export function ShortAnswer(props: ShortAnswerProps): JSX.Element {
	const messages = useMessages(props);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const feedbackId = `${id}-feedback`;
	const warningId = `${id}-warning`;

	const [typed, setTyped] = createSignal(props.value ?? "");
	const text = () =>
		props.value !== undefined ? (props.value ?? "") : typed();

	const review = () => (mode() === "review" ? props.result : undefined);
	const verdict = (): "correct" | "incorrect" | undefined => {
		const result = review();
		if (result === undefined || isPending(result)) return undefined;
		return result.score >= 1 ? "correct" : "incorrect";
	};
	/** The review result, unless it is pending. */
	const settled = () => {
		const result = review();
		return result === undefined || isPending(result) ? undefined : result;
	};
	const hasFeedback = () => (settled()?.feedback.length ?? 0) > 0;

	const invalid = createMemo(() =>
		mode() === "answer" && text().trim() !== ""
			? prevalidateText(
					props.question,
					text(),
					props.question.diacritics ?? "fold",
				)
			: undefined,
	);
	const warning = () => {
		const checked = invalid();
		return checked !== undefined && !checked.valid ? checked : undefined;
	};

	const describedBy = () =>
		warning() ? warningId : hasFeedback() ? feedbackId : undefined;

	return (
		<div class="mdq-question" data-type="short-answer" data-mode={mode()}>
			<Show when={!props.hideScore && review()}>
				<div class="mdq-header">
					<Show when={settled()} fallback={<Pending messages={messages()} />}>
						{(result) => <Score score={result().score} messages={messages()} />}
					</Show>
				</div>
			</Show>

			<div id={stemId} class="mdq-stem">
				<Markdown text={props.question.stem} />
			</div>

			<Show
				when={mode() !== "readonly"}
				fallback={
					<Show
						when={text().trim() !== ""}
						fallback={<p class="mdq-empty">{messages().noAnswer}</p>}
					>
						<p class="mdq-answer">
							<span class="mdq-answer-label">{messages().yourAnswerLabel}</span>{" "}
							<span class="mdq-answer-text">{text()}</span>
						</p>
					</Show>
				}
			>
				<div class="mdq-input-row" data-key={verdict()}>
					<TextInput
						value={text()}
						onChange={(next) => {
							setTyped(next);
							props.onChange?.(next);
						}}
						disabled={mode() !== "answer"}
						placeholder={messages().yourAnswer}
						aria-labelledby={stemId}
						aria-describedby={describedBy()}
						aria-invalid={warning() !== undefined}
					/>
					<Show when={verdict()}>
						{(kind) => <Mark kind={kind()} messages={messages()} />}
					</Show>
				</div>

				<Show when={warning()}>
					{(failed) => (
						<p id={warningId} class="mdq-warning">
							{failed().feedback ?? messages().shortAnswerMismatch}
						</p>
					)}
				</Show>

				<Show
					when={props.question.unmatched === "manual" && mode() === "answer"}
				>
					<p class="mdq-note">{messages().gradedByHand}</p>
				</Show>
			</Show>

			<Show when={props.question.epilogue}>
				<div class="mdq-epilogue">
					<Markdown text={props.question.epilogue} />
				</div>
			</Show>

			<Show when={review()?.correct?.length}>
				<div class="mdq-accepted">
					<h4 class="mdq-accepted-title">
						{messages().acceptedAnswers(review()?.correct?.length ?? 0)}
					</h4>
					<ul class="mdq-accepted-list">
						<For each={review()?.correct}>
							{(answer) => <li class="mdq-accepted-item">{answer}</li>}
						</For>
					</ul>
				</div>
			</Show>

			<Show when={settled()}>
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
