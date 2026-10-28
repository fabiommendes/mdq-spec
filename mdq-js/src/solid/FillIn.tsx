import {
	batch,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	Match,
	Show,
	Switch,
} from "solid-js";
import type { PublicBlank, PublicFillInQuestion } from "../index.js";
import { prevalidateText } from "../models/text.js";
import type { FillInResponse, NumericResponse } from "../responses.js";
import { ChoiceSelect } from "./ChoiceSelect.jsx";
import { Feedback } from "./Feedback.jsx";
import { placedBlanks, type StemPart, splitStem } from "./fill-in-stem.js";
import { Markdown } from "./Markdown.jsx";
import { type Messages, useMessages } from "./messages.jsx";
import { NumericInput } from "./NumericInput.jsx";
import { Pending } from "./Pending.jsx";
import { Score } from "./Score.jsx";
import { TextInput } from "./TextInput.jsx";
import type { QuestionMode } from "./types.js";

/**
 * The result of a settled fill-in response: its score and the feedback of
 * every blank in one list, in the order of the definitions.
 *
 * There is no per-blank verdict and no answer key yet. Both wait for the
 * per-blank score of the spec.
 */
export interface FillInResult {
	readonly score: number;
	readonly feedback: readonly string[];
}

/** The result of a fill-in response with a pending blank: no score, no feedback. */
export interface PendingFillInResult {
	readonly pending: true;
}

export interface FillInProps {
	question: PublicFillInQuestion;
	/**
	 * What the student put in each blank, by blank id. A blank that is missing
	 * or `null` is empty. Omit it to let the component keep the state.
	 */
	value?: FillInResponse | null;
	/**
	 * Gets the whole response on every change. A blank the student empties
	 * loses its key, and so does a numeric blank whose text is not a valid
	 * number: it is an empty blank, which scores 0.
	 */
	onChange?: (response: FillInResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. The marks stay. */
	hideScore?: boolean;
	result?: FillInResult | PendingFillInResult;
	messages?: Partial<Messages>;
}

/**
 * A fill-in question: `.mdq-question[data-type="fill-in"]`.
 *
 * The stem is Markdown, and a paragraph with blanks becomes a
 * `.mdq-sentence` where each blank is a `.mdq-blank[data-type]` control in
 * the flow of the text: a `ChoiceSelect`, a `NumericInput` or a text input.
 * A `[^slug]` that is not in the plain text of a paragraph, or that the
 * question does not define, stays as written. See `splitStem`.
 *
 * `review` mode shows the score (or the pending badge) and the feedback, with
 * no mark on the blanks yet. The choices are shown in document order; shuffling is the host's job.
 */
export function FillIn(props: FillInProps): JSX.Element {
	const messages = useMessages(() => props.messages);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const feedbackId = `${id}-feedback`;

	const [internal, setInternal] = createSignal<FillInResponse>(
		props.value ?? {},
	);
	const answers = (): FillInResponse =>
		props.value !== undefined ? (props.value ?? {}) : internal();

	const blanks = createMemo(
		() => new Map(props.question.blanks.map((blank) => [blank.id, blank])),
	);
	const stem = createMemo(() =>
		splitStem(props.question.stem, new Set(blanks().keys())),
	);
	const order = createMemo(() => placedBlanks(stem()));
	const label = (blankId: string) =>
		messages().blankLabel(order().indexOf(blankId) + 1, order().length);

	function edit(blankId: string, next: string | null): void {
		if (mode() !== "answer") return;
		const merged: Record<string, FillInResponse[string]> = { ...answers() };
		if (next === null) delete merged[blankId];
		else merged[blankId] = next;
		batch(() => {
			setInternal(merged);
			props.onChange?.(merged);
		});
	}

	const review = () => (mode() === "review" ? props.result : undefined);
	const settled = (): FillInResult | undefined => {
		const result = review();
		return result === undefined || "pending" in result ? undefined : result;
	};
	const hasFeedback = () => (settled()?.feedback.length ?? 0) > 0;
	const describedBy = () => (hasFeedback() ? feedbackId : undefined);

	/** Prevalidation of a short answer blank, as the student types. */
	function warning(blank: PublicBlank): string | undefined {
		const text = answers()[blank.id];
		if (blank.type !== "short-answer" || typeof text !== "string") {
			return undefined;
		}
		if (mode() !== "answer" || text.trim() === "") return undefined;
		const checked = prevalidateText(blank, text, props.question.diacritics);
		return checked.valid
			? undefined
			: (checked.feedback ?? messages().shortAnswerMismatch);
	}
	const warnings = () =>
		order().flatMap((blankId) => {
			const blank = blanks().get(blankId);
			const text = blank && warning(blank);
			return text ? [{ id: blankId, text }] : [];
		});

	const empty = () =>
		Object.values(answers()).every((answer) => answer == null);

	return (
		<div class="mdq-question" data-type="fill-in" data-mode={mode()}>
			<Show when={!props.hideScore && review()}>
				<div class="mdq-header">
					<Show when={settled()} fallback={<Pending messages={messages()} />}>
						{(result) => <Score score={result().score} messages={messages()} />}
					</Show>
				</div>
			</Show>

			<div class="mdq-stem">
				<For each={stem()}>
					{(block) => (
						<Show
							when={block.kind === "sentence" && block}
							fallback={
								<div
									class="mdq-markdown"
									innerHTML={block.kind === "html" ? block.html : ""}
								/>
							}
						>
							{(sentence) => (
								<p class="mdq-sentence">
									<For each={sentence().parts}>
										{(part: StemPart) => (
											<Show
												when={part.kind === "blank" && blanks().get(part.id)}
												fallback={
													<span
														innerHTML={part.kind === "html" ? part.html : ""}
													/>
												}
											>
												{(blank) => (
													<span class="mdq-blank" data-type={blank().type}>
														<Control
															blank={blank()}
															label={label(blank().id)}
															value={answers()[blank().id]}
															onChange={(next) => edit(blank().id, next)}
															disabled={mode() !== "answer"}
															describedBy={describedBy()}
															messages={messages()}
														/>
													</span>
												)}
											</Show>
										)}
									</For>
								</p>
							)}
						</Show>
					)}
				</For>
			</div>

			<For each={warnings()}>
				{(entry) => (
					<p class="mdq-warning">
						{label(entry.id)}: {entry.text}
					</p>
				)}
			</For>

			<Show when={mode() === "readonly" && empty()}>
				<p class="mdq-empty">{messages().noAnswer}</p>
			</Show>

			<Show when={props.question.epilogue}>
				<div class="mdq-epilogue">
					<Markdown text={props.question.epilogue} />
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

interface ControlProps {
	blank: PublicBlank;
	label: string;
	value: FillInResponse[string] | undefined;
	onChange: (next: string | null) => void;
	disabled: boolean;
	describedBy: string | undefined;
	messages: Messages;
}

/** The one control a blank is answered with, sized to sit in a sentence. */
function Control(props: ControlProps): JSX.Element {
	return (
		<Switch>
			<Match when={props.blank.type === "multiple-choice" && props.blank}>
				{(blank) => (
					<ChoiceSelect
						choices={
							(blank() as Extract<PublicBlank, { choices: unknown }>).choices
						}
						value={typeof props.value === "string" ? props.value : null}
						onChange={props.onChange}
						disabled={props.disabled}
						placeholder={props.messages.selectPlaceholder}
						aria-label={props.label}
						aria-describedby={props.describedBy}
					/>
				)}
			</Match>
			<Match when={props.blank.type === "numeric" && props.blank}>
				{(blank) => (
					<NumericInput
						domain={
							(blank() as Extract<PublicBlank, { domain: unknown }>).domain
						}
						unit={(blank() as { unit?: string }).unit}
						value={(props.value ?? null) as NumericResponse | null}
						onChange={props.onChange}
						disabled={props.disabled}
						placeholder="?"
						aria-label={props.label}
						aria-describedby={props.describedBy}
						messages={props.messages}
					/>
				)}
			</Match>
			<Match when={props.blank.type === "short-answer"}>
				<TextInput
					value={typeof props.value === "string" ? props.value : ""}
					onChange={(text) => props.onChange(text === "" ? null : text)}
					disabled={props.disabled}
					placeholder="?"
					aria-label={props.label}
					aria-describedby={props.describedBy}
				/>
			</Match>
		</Switch>
	);
}
