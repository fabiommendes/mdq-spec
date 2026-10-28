import {
	createSignal,
	createUniqueId,
	type JSX,
	Match,
	type ParentProps,
	Show,
	Switch,
} from "solid-js";
import type { PublicEssayQuestion } from "../index.js";
import type { TextResponse } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Messages, useMessages } from "./messages.jsx";
import { Pending } from "./Pending.jsx";
import { Score } from "./Score.jsx";
import { isPending, type QuestionMode, type ReviewResult } from "./types.js";

export interface EssayProps {
	question: PublicEssayQuestion;
	/** The text the student wrote. Omit it to let the component keep the state. */
	value?: TextResponse | null;
	onChange?: (text: TextResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. */
	hideScore?: boolean;
	/**
	 * An essay is graded by an instructor, so the result is pending until then.
	 * `correct` holds the answer key, when there is one and the student may see
	 * it: the spec lets a host show it after the submission, pending or not.
	 */
	result?: ReviewResult<TextResponse>;
	messages?: Partial<Messages>;
}

/**
 * An essay question: `.mdq-question[data-type="essay"]`.
 *
 * In `answer` mode it is a `.mdq-textarea[data-content]`. Outside it, the
 * text is shown as content in a `.mdq-panel`, not in a disabled textarea,
 * which hides what does not fit behind a scrollbar nobody can use. How the
 * text is shown follows `content`: Markdown for `text` (the default, whose
 * format the spec leaves to the host), preserved whitespace for `plain`, a
 * code block for `code`.
 *
 * A pending result shows the `Pending` badge. A graded one shows its score
 * and feedback. The answer key is a second panel in `review` mode.
 */
export function Essay(props: EssayProps): JSX.Element {
	const messages = useMessages(() => props.messages);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const feedbackId = `${id}-feedback`;

	const content = () => props.question.content ?? "text";

	const [typed, setTyped] = createSignal(props.value ?? "");
	const text = () =>
		props.value !== undefined ? (props.value ?? "") : typed();

	const review = () => (mode() === "review" ? props.result : undefined);
	/** The review result, unless it is pending. */
	const settled = () => {
		const result = review();
		return result === undefined || isPending(result) ? undefined : result;
	};
	const hasFeedback = () => (settled()?.feedback.length ?? 0) > 0;
	// An absent key is withheld, and a blank one is no model answer at all.
	const keyText = () => review()?.correct?.find((key) => key.trim() !== "");

	return (
		<div
			class="mdq-question"
			data-type="essay"
			data-mode={mode()}
			data-content={content()}
		>
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
				when={mode() === "answer"}
				fallback={
					<Panel label={messages().yourAnswer}>
						<AnswerText
							content={content()}
							text={text()}
							empty={messages().noAnswer}
						/>
					</Panel>
				}
			>
				<div class="mdq-editor">
					<Show when={content() === "code" && props.question.highlight}>
						{(language) => <span class="mdq-language">{language()}</span>}
					</Show>
					<textarea
						class="mdq-textarea"
						data-content={content()}
						value={text()}
						spellcheck={content() !== "code"}
						placeholder={
							content() === "code"
								? messages().writeCodePlaceholder
								: messages().writeAnswerPlaceholder
						}
						onInput={(event) => {
							const box = event.currentTarget;
							setTyped(box.value);
							props.onChange?.(box.value);
							// A parent that does not apply the edit gets its text back.
							box.value = text();
						}}
						aria-labelledby={stemId}
						aria-describedby={hasFeedback() ? feedbackId : undefined}
					/>
					<Show when={content() === "text"}>
						<p class="mdq-note">{messages().markdownSupported}</p>
					</Show>
				</div>
			</Show>

			<Show when={props.question.epilogue}>
				<div class="mdq-epilogue">
					<Markdown text={props.question.epilogue} />
				</div>
			</Show>

			<Show when={keyText()}>
				{(key) => (
					<Panel label={messages().modelAnswer} tone="key">
						<AnswerText content={content()} text={key()} empty="" />
					</Panel>
				)}
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

/**
 * A titled block around one body of prose: `.mdq-panel`. The answer of the
 * student gets one as well as the key, so a reader cannot take the model
 * answer for their own.
 */
function Panel(
	props: ParentProps<{ label: string; tone?: "key" }>,
): JSX.Element {
	const titleId = createUniqueId();
	return (
		<section class="mdq-panel" data-tone={props.tone} aria-labelledby={titleId}>
			<h4 id={titleId} class="mdq-panel-title">
				{props.label}
			</h4>
			{props.children}
		</section>
	);
}

/** A written answer, the way its `content` says it is meant to be read. */
function AnswerText(props: {
	content: string;
	text: string;
	empty: string;
}): JSX.Element {
	return (
		<Switch fallback={<p class="mdq-empty">{props.empty}</p>}>
			<Match when={props.text.trim() && props.content === "code"}>
				<pre class="mdq-code">
					<code>{props.text}</code>
				</pre>
			</Match>
			<Match when={props.text.trim() && props.content === "plain"}>
				<pre class="mdq-plain">{props.text}</pre>
			</Match>
			<Match when={props.text.trim()}>
				<Markdown text={props.text} />
			</Match>
		</Switch>
	);
}
