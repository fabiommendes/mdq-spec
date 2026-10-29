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
import type { QuestionScore } from "../models/score.js";
import { prevalidateText } from "../models/text.js";
import type { FillInResponse, NumericResponse } from "../responses.js";
import { ChoiceSelect } from "./ChoiceSelect.jsx";
import { Feedback } from "./Feedback.jsx";
import { placedBlanks, type StemPart, splitStem } from "./fill-in-stem.js";
import { Mark, type MarkKind, type Verdict, verdictOf } from "./Mark.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Locale, type Messages, useMessages } from "./messages.jsx";
import { NumericInput } from "./NumericInput.jsx";
import { Pending } from "./Pending.jsx";
import { Score } from "./Score.jsx";
import { TextInput } from "./TextInput.jsx";
import type { QuestionMode } from "./types.js";

/**
 * What the student may see of the answer key of a fill-in: the responses that
 * score 1 for each blank, as `correctResponses(question)` gives. For a choice
 * blank they are choice ids, for a numeric blank numbers, for a short answer
 * blank its literal answers (possibly none).
 */
export type FillInKey = Readonly<Record<string, readonly (string | number)[]>>;

/**
 * The result of a settled fill-in response: the score and the flat feedback
 * of the question, `blanks` from `scoreBlanks(question, response)` and
 * `correct` from `correctResponses(question)`.
 *
 * Without `blanks` the blanks carry no mark and the feedback is one list.
 * Absent `correct` means the key is withheld.
 */
export interface FillInResult extends QuestionScore {
	readonly correct?: FillInKey;
}

/**
 * The result of a fill-in response with a pending blank: no score and no
 * flat feedback. `blanks` still shows the settled blanks (from
 * `scoreBlanks`): a `null` entry is a pending blank.
 */
export interface PendingFillInResult {
	readonly pending: true;
	readonly blanks?: QuestionScore["blanks"];
	readonly correct?: FillInKey;
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
	locale?: Locale;
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
 * `review` mode shows the score (or the pending badge). With `result.blanks`
 * each blank gets `data-key` on its `.mdq-blank`: `correct` (score 1),
 * `partial` (between 0 and 1) or `incorrect` (answered, 0 or less) with a
 * `Mark`, or `pending` with the
 * pending badge. An empty blank has no mark: it is neither right nor wrong.
 * The feedback of each blank is listed under the stem as
 * `.mdq-blank-feedback[data-blank]`, headed by the label of the blank;
 * without `blanks` it is the flat feedback of the question. With
 * `result.correct` the expected answers are listed in `.mdq-key`, one
 * `.mdq-key-item[data-blank]` per blank. The choices are shown in document
 * order; shuffling is the host's job.
 */
export function FillIn(props: FillInProps): JSX.Element {
	const messages = useMessages(props);
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
	const blankScores = () => review()?.blanks;
	const blankFeedbackId = (blankId: string) => `${feedbackId}-${blankId}`;
	const hasBlankFeedback = (blankId: string) =>
		(blankScores()?.[blankId]?.feedback.length ?? 0) > 0;
	const describedBy = (blankId: string) => {
		if (blankScores() !== undefined) {
			return hasBlankFeedback(blankId) ? blankFeedbackId(blankId) : undefined;
		}
		return (settled()?.feedback.length ?? 0) > 0 ? feedbackId : undefined;
	};

	/** The mark of a blank in review, from its score. */
	const verdict = (blankId: string): Verdict | "pending" | undefined => {
		const entry = blankScores()?.[blankId];
		if (entry === undefined) return undefined;
		if (entry === null) return "pending";
		if (answers()[blankId] == null) return undefined;
		return verdictOf(entry.score);
	};
	const feedbackBlanks = () =>
		order().filter((blankId) => hasBlankFeedback(blankId));
	const keyBlanks = () => {
		const key = review()?.correct;
		return key === undefined ? [] : order().filter((id) => id in key);
	};

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
													<span
														class="mdq-blank"
														data-type={blank().type}
														data-key={verdict(blank().id)}
													>
														<Control
															blank={blank()}
															label={label(blank().id)}
															value={answers()[blank().id]}
															onChange={(next) => edit(blank().id, next)}
															disabled={mode() !== "answer"}
															describedBy={describedBy(blank().id)}
															messages={messages()}
														/>
														<Show when={verdict(blank().id)}>
															{(kind) => (
																<Show
																	when={markOf(kind())}
																	fallback={<Pending messages={messages()} />}
																>
																	{(mark) => (
																		<Mark kind={mark()} messages={messages()} />
																	)}
																</Show>
															)}
														</Show>
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

			<Show when={keyBlanks().length > 0}>
				<div class="mdq-key">
					<h4 class="mdq-key-title">{messages().expected}</h4>
					<ul class="mdq-key-list">
						<For each={keyBlanks()}>
							{(blankId) => (
								<li class="mdq-key-item" data-blank={blankId}>
									<span class="mdq-key-label">{label(blankId)}</span>{" "}
									<KeyAnswers
										blank={blanks().get(blankId)}
										answers={review()?.correct?.[blankId] ?? []}
										messages={messages()}
									/>
								</li>
							)}
						</For>
					</ul>
				</div>
			</Show>

			<Show
				when={blankScores() !== undefined}
				fallback={
					<Show when={settled()}>
						{(result) => (
							<Feedback
								id={feedbackId}
								feedback={result().feedback}
								score={result().score}
							/>
						)}
					</Show>
				}
			>
				<For each={feedbackBlanks()}>
					{(blankId) => (
						<div class="mdq-blank-feedback" data-blank={blankId}>
							<p class="mdq-blank-feedback-label">{label(blankId)}</p>
							<Feedback
								id={blankFeedbackId(blankId)}
								feedback={blankScores()?.[blankId]?.feedback ?? []}
								score={blankScores()?.[blankId]?.score ?? 0}
							/>
						</div>
					)}
				</For>
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
	// A conditional written inside a JSX prop compiles to a memo that is
	// created on every read. The controls read `value` in their event
	// handlers, outside any owner, so the conditions live in plain functions.
	const text = () => (typeof props.value === "string" ? props.value : "");
	const choiceId = () => (typeof props.value === "string" ? props.value : null);
	return (
		<Switch>
			<Match when={props.blank.type === "multiple-choice" && props.blank}>
				{(blank) => (
					<ChoiceSelect
						choices={
							(blank() as Extract<PublicBlank, { choices: unknown }>).choices
						}
						value={choiceId()}
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
					value={text()}
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

/** The mark of a verdict: a pending blank has a badge instead. */
function markOf(verdict: Verdict | "pending"): MarkKind | undefined {
	return verdict === "pending" ? undefined : verdict;
}

interface KeyAnswersProps {
	blank: PublicBlank | undefined;
	answers: readonly (string | number)[];
	messages: Messages;
}

/** The expected answers of one blank, in the answer key of a review. */
function KeyAnswers(props: KeyAnswersProps): JSX.Element {
	const text = (answer: string | number): string => {
		const blank = props.blank;
		if (blank?.type === "numeric" && blank.unit) {
			return `${answer} ${blank.unit}`;
		}
		return String(answer);
	};
	/** A choice id shows the text of the choice, as inline Markdown. */
	const choiceText = (answer: string | number): string | undefined => {
		const blank = props.blank;
		if (blank?.type !== "multiple-choice") return undefined;
		return blank.choices.find((choice) => choice.id === answer)?.text;
	};
	return (
		<Show
			when={props.answers.length > 0}
			fallback={<span class="mdq-key-none">{props.messages.noBlankKey}</span>}
		>
			<span class="mdq-key-answers">
				<For each={props.answers}>
					{(answer) => (
						<span class="mdq-key-answer">
							<Show when={choiceText(answer)} fallback={text(answer)}>
								{(choice) => <Markdown inline text={choice()} />}
							</Show>
						</span>
					)}
				</For>
			</span>
		</Show>
	);
}
