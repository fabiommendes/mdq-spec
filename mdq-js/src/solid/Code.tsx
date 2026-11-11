import {
	createRenderEffect,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	type ParentProps,
	Show,
} from "solid-js";
import type { PublicCodeQuestion } from "../index.js";
import { firstFencedCode } from "../parser/index.js";
import type { TextResponse } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Locale, type Messages, useMessages } from "./messages.jsx";
import { Pending } from "./Pending.jsx";
import { Score } from "./Score.jsx";
import { isPending, type QuestionMode, type ReviewResult } from "./types.js";

export interface CodeProps {
	question: PublicCodeQuestion;
	/**
	 * The code the student wrote. Omit it to let the component keep the state.
	 * `null` (no response yet) shows the code of `template`.
	 */
	value?: TextResponse | null;
	onChange?: (text: TextResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. */
	hideScore?: boolean;
	/**
	 * MDQ never runs code, so the result is pending until a runner report or an
	 * instructor grades it. `correct` holds the reference solution, when there
	 * is one and the student may see it.
	 */
	result?: ReviewResult<TextResponse>;
	messages?: Partial<Messages>;
	locale?: Locale;
}

/**
 * A code question: `.mdq-question[data-type="code"]`.
 *
 * In `answer` mode it shows the stem, the public example regions of the tests
 * (`.mdq-code[data-example]`), and a `.mdq-textarea[data-content="code"]`
 * that starts with the code of `template`. Outside it, the code is shown in a
 * `.mdq-code` block in a `.mdq-panel`. The component does not run anything.
 *
 * A pending result shows the `Pending` badge. A graded one shows its score
 * and feedback. The reference solution is a second panel in `review` mode.
 */
export function Code(props: CodeProps): JSX.Element {
	const messages = useMessages(props);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const feedbackId = `${id}-feedback`;

	const template = () =>
		props.question.template === undefined
			? ""
			: (firstFencedCode(props.question.template) ?? "");
	const examples = () =>
		(props.question.publicTests ?? []).filter((test) => test.example);

	const [typed, setTyped] = createSignal(props.value ?? template());
	/** What the student wrote, empty when nothing. */
	const written = () =>
		props.value !== undefined ? (props.value ?? "") : typed();
	/** What the text area holds. */
	const text = () =>
		props.value !== undefined ? (props.value ?? template()) : typed();

	const review = () => (mode() === "review" ? props.result : undefined);
	/** The review result, unless it is pending. */
	const settled = () => {
		const result = review();
		return result === undefined || isPending(result) ? undefined : result;
	};
	const hasFeedback = () => (settled()?.feedback.length ?? 0) > 0;
	// An absent key is withheld, and a blank one is no solution at all.
	const keyText = () => review()?.correct?.find((key) => key.trim() !== "");

	return (
		<div
			class="mdq-question"
			data-type="code"
			data-mode={mode()}
			data-content="code"
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

			<For each={examples()}>
				{(test) => (
					<pre class="mdq-code" data-example data-format={test.format}>
						<code>{test.text}</code>
					</pre>
				)}
			</For>

			<Show
				when={mode() === "answer"}
				fallback={
					<Panel label={messages().yourAnswer}>
						<CodeText text={written()} empty={messages().noAnswer} />
					</Panel>
				}
			>
				<div class="mdq-editor">
					<Show when={props.question.language}>
						{(language) => <span class="mdq-language">{language()}</span>}
					</Show>
					{/* A textarea ignores a `value` attribute, so the server markup carries the text as content. The effect on `ref` sets the live `value`, which hydration does not. */}
					<textarea
						class="mdq-textarea"
						data-content="code"
						ref={(box) => createRenderEffect(() => (box.value = text()))}
						spellcheck={false}
						placeholder={messages().writeCodePlaceholder}
						onInput={(event) => {
							const box = event.currentTarget;
							setTyped(box.value);
							props.onChange?.(box.value);
							// A parent that does not apply the edit gets its text back.
							box.value = text();
						}}
						aria-labelledby={stemId}
						aria-describedby={hasFeedback() ? feedbackId : undefined}
					>
						{text()}
					</textarea>
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
						<CodeText text={key()} empty="" />
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

/** A titled block: `.mdq-panel`. The key is told apart from the student code. */
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

/** Code as a block, or the note for an empty text. */
function CodeText(props: { text: string; empty: string }): JSX.Element {
	return (
		<Show
			when={props.text.trim()}
			fallback={<p class="mdq-empty">{props.empty}</p>}
		>
			<pre class="mdq-code">
				<code>{props.text}</code>
			</pre>
		</Show>
	);
}
