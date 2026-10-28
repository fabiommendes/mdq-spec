import {
	createMemo,
	createSignal,
	createUniqueId,
	For,
	Index,
	type JSX,
	type ParentProps,
	Show,
} from "solid-js";
import type { PublicOrderingQuestion } from "../index.js";
import type { OrderingResponse } from "../responses.js";
import type { OrderingLine } from "../schema/questions.js";
import { Feedback } from "./Feedback.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Locale, type Messages, useMessages } from "./messages.jsx";
import { Pending } from "./Pending.jsx";
import { Score } from "./Score.jsx";
import { isPending, type QuestionMode, type ReviewResult } from "./types.js";

export interface OrderingProps {
	question: PublicOrderingQuestion;
	/**
	 * The lines of the answer, in order. Omit it to let the component keep the
	 * state, which starts as the whole pool in the order `question.pool` has:
	 * the host shuffles it. `null` is a skipped question: an empty answer.
	 */
	value?: OrderingResponse | null;
	/**
	 * Gets the whole answer on every change. The component sends nothing until
	 * the student acts, so a host that wants the starting order as the response
	 * reads `question.pool` itself.
	 */
	onChange?: (lines: OrderingResponse) => void;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. */
	hideScore?: boolean;
	/**
	 * A response that matches no declared answer is pending under
	 * `unmatched: manual`, so the result may be pending. `correct` is the list
	 * from `correctResponses()`: the answer key, then each accepted ordering.
	 */
	result?: ReviewResult<OrderingResponse>;
	messages?: Partial<Messages>;
	locale?: Locale;
}

/** The deepest level the controls give a line of code. The spec sets no limit. */
const MAX_CODE_LEVEL = 8;

type Action = "up" | "down" | "indent" | "outdent" | "remove" | "add";

/**
 * An ordering question: `.mdq-question[data-type="ordering"]`.
 *
 * In `answer` mode the student builds the response in a list (`.mdq-ordering-list`
 * with `data-list="used"`), starting from the whole pool. A line the student
 * leaves out goes to a second list (`data-list="unused"`), which is how a
 * distractor is dropped: the spec lets a response omit lines. Every line has
 * buttons, so reordering never needs a pointer: move up, move down, leave out
 * or use, and under `lenient` and `strict` indent and outdent. A polite live
 * region announces each change, and the focus follows the line that moved.
 *
 * Under `fixed` the lines keep the levels of the pool. Under `lenient` and
 * `strict` the student sets them, and for `content: text` the component keeps
 * the answer a valid outline (the first line at level 0, no line more than one
 * level below the one before it), which the spec demands of the response.
 *
 * `readonly` and `review` show the lines without controls. A review shows the
 * accepted orderings next to the response, and no per-line verdict: the spec
 * grades a whole ordering, never a line.
 */
export function Ordering(props: OrderingProps): JSX.Element {
	const messages = useMessages(props);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const stemId = `${id}-stem`;
	const feedbackId = `${id}-feedback`;
	const usedTitleId = `${id}-used`;
	const unusedTitleId = `${id}-unused`;

	const content = () => props.question.content;
	const indentation = () => props.question.indentation ?? "fixed";
	const editsLevels = () => indentation() !== "fixed";

	const [internal, setInternal] = createSignal<OrderingResponse>(
		props.value ?? props.question.pool,
	);
	const used = createMemo<OrderingResponse>(() =>
		props.value !== undefined ? (props.value ?? []) : internal(),
	);

	/** How the spec identifies a pool line: see "Line identity". */
	const identity = (line: OrderingLine): string =>
		indentation() === "fixed" ? `${line[0]}\u0000${line[1]}` : line[1];

	/** The pool lines the answer does not hold, in the order of the pool. */
	const unused = createMemo<OrderingLine[]>(() => {
		const counts = new Map<string, number>();
		for (const line of used()) {
			counts.set(identity(line), (counts.get(identity(line)) ?? 0) + 1);
		}
		const left: OrderingLine[] = [];
		for (const line of props.question.pool) {
			const key = identity(line);
			const count = counts.get(key) ?? 0;
			if (count > 0) counts.set(key, count - 1);
			else left.push(line);
		}
		return left;
	});

	const review = () => (mode() === "review" ? props.result : undefined);
	/** The review result, unless it is pending. */
	const settled = () => {
		const result = review();
		return result === undefined || isPending(result) ? undefined : result;
	};
	const hasFeedback = () => (settled()?.feedback.length ?? 0) > 0;

	const [announcement, setAnnouncement] = createSignal("");
	let root: HTMLDivElement | undefined;

	const name = (text: string) =>
		text === "" ? messages().orderingBlankLine : text;

	/** Blank lines have level 0; a text outline stays valid when the student sets levels. */
	function fitLevels(lines: OrderingLine[]): OrderingLine[] {
		const outline = content() === "text" && editsLevels();
		let previous = -1;
		return lines.map(([level, text], index) => {
			let fitted = text === "" ? 0 : level;
			if (outline) fitted = Math.min(fitted, index === 0 ? 0 : previous + 1);
			previous = fitted;
			return fitted === level ? [level, text] : [fitted, text];
		});
	}

	function commit(lines: OrderingLine[]): void {
		const next = editsLevels() ? fitLevels(lines) : lines;
		setInternal(next);
		props.onChange?.(next);
	}

	/**
	 * Puts the focus on a control once the list has re-rendered. Rows are keyed
	 * by position, so the control the student used now belongs to another line.
	 */
	function focusControl(
		list: "used" | "unused",
		index: number,
		action: Action,
	): void {
		queueMicrotask(() => {
			root
				?.querySelector<HTMLElement>(
					`[data-list="${list}"] > [data-index="${index}"] [data-action="${action}"]`,
				)
				?.focus();
		});
	}

	function move(index: number, delta: -1 | 1): void {
		const target = index + delta;
		const lines = [...used()];
		const line = lines[index];
		if (mode() !== "answer" || line === undefined || target < 0) return;
		if (target >= lines.length) return;
		lines.splice(index, 1);
		lines.splice(target, 0, line);
		commit(lines);
		const placed = used()[target];
		if (placed !== undefined && placed[1] === line[1]) {
			focusControl("used", target, delta < 0 ? "up" : "down");
		}
		announceMove(line, placed, target);
	}

	function announceMove(
		before: OrderingLine,
		placed: OrderingLine | undefined,
		target: number,
	): void {
		let text = messages().orderingMoved(
			name(before[1]),
			target + 1,
			used().length,
		);
		if (placed !== undefined && placed[0] !== before[0]) {
			text += ` ${messages().orderingLevelSet(name(before[1]), placed[0])}`;
		}
		setAnnouncement(text);
	}

	function shift(index: number, delta: -1 | 1): void {
		const line = used()[index];
		if (mode() !== "answer" || line === undefined) return;
		const allowed =
			delta > 0 ? canIndent(used(), index) : canOutdent(used(), index);
		if (!allowed) return;
		const lines = [...used()];
		lines[index] = [line[0] + delta, line[1]];
		commit(lines);
		setAnnouncement(
			messages().orderingLevelSet(name(line[1]), line[0] + delta),
		);
	}

	function canIndent(lines: OrderingResponse, index: number): boolean {
		const line = lines[index];
		if (!editsLevels() || line === undefined || line[1] === "") return false;
		if (content() === "text") {
			const before = lines[index - 1];
			return before !== undefined && line[0] <= before[0];
		}
		return line[0] < MAX_CODE_LEVEL;
	}

	function canOutdent(lines: OrderingResponse, index: number): boolean {
		const line = lines[index];
		if (!editsLevels() || line === undefined || line[0] === 0) return false;
		// The next line may not end up two levels below this one.
		const after = lines[index + 1];
		return content() !== "text" || after === undefined || after[0] <= line[0];
	}

	function leaveOut(index: number): void {
		const line = used()[index];
		if (mode() !== "answer" || line === undefined) return;
		const lines = [...used()];
		lines.splice(index, 1);
		commit(lines);
		const position = unused().findIndex(
			(left) => identity(left) === identity(line),
		);
		if (position >= 0) focusControl("unused", position, "add");
		setAnnouncement(messages().orderingRemoved(name(line[1])));
	}

	function include(index: number): void {
		const line = unused()[index];
		if (mode() !== "answer" || line === undefined) return;
		const lines: OrderingLine[] = [...used(), [line[0], line[1]]];
		commit(lines);
		focusControl("used", lines.length - 1, "remove");
		setAnnouncement(
			messages().orderingAdded(name(line[1]), lines.length, lines.length),
		);
	}

	const lineProps = () => ({
		content: content(),
		language: props.question.highlight,
		blank: messages().orderingBlankLine,
		level: messages().orderingLevel,
	});

	return (
		<div
			ref={root}
			class="mdq-question"
			data-type="ordering"
			data-mode={mode()}
			data-content={content()}
			data-indentation={indentation()}
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

			<Show when={content() === "code" && props.question.highlight}>
				{(language) => <span class="mdq-language">{language()}</span>}
			</Show>

			<Show
				when={mode() === "answer"}
				fallback={
					<Panel label={messages().yourAnswer}>
						<Show
							when={used().length > 0}
							fallback={<p class="mdq-empty">{messages().noAnswer}</p>}
						>
							<ol
								class="mdq-ordering-list"
								data-list="response"
								aria-describedby={hasFeedback() ? feedbackId : undefined}
							>
								<For each={used()}>
									{(line) => (
										<li class="mdq-ordering-line" data-level={line[0]}>
											<LineBody line={line} {...lineProps()} />
										</li>
									)}
								</For>
							</ol>
						</Show>
					</Panel>
				}
			>
				<section class="mdq-panel" aria-labelledby={usedTitleId}>
					<h4 id={usedTitleId} class="mdq-panel-title">
						{messages().yourAnswer}
					</h4>
					<Show when={used().length === 0}>
						<p class="mdq-empty">{messages().orderingEmpty}</p>
					</Show>
					<ol
						class="mdq-ordering-list"
						data-list="used"
						aria-labelledby={usedTitleId}
					>
						<Index each={used()}>
							{(line, index) => (
								<li
									class="mdq-ordering-line"
									data-index={index}
									data-level={line()[0]}
								>
									<LineBody line={line()} {...lineProps()} />
									<span class="mdq-ordering-controls">
										<Control
											action="up"
											label={messages().orderingMoveUp(name(line()[1]))}
											disabled={index === 0}
											onAct={() => move(index, -1)}
										/>
										<Control
											action="down"
											label={messages().orderingMoveDown(name(line()[1]))}
											disabled={index === used().length - 1}
											onAct={() => move(index, 1)}
										/>
										<Show when={editsLevels()}>
											<Control
												action="outdent"
												label={messages().orderingOutdent(name(line()[1]))}
												disabled={!canOutdent(used(), index)}
												onAct={() => shift(index, -1)}
											/>
											<Control
												action="indent"
												label={messages().orderingIndent(name(line()[1]))}
												disabled={!canIndent(used(), index)}
												onAct={() => shift(index, 1)}
											/>
										</Show>
										<Control
											action="remove"
											label={messages().orderingRemove(name(line()[1]))}
											onAct={() => leaveOut(index)}
										/>
									</span>
								</li>
							)}
						</Index>
					</ol>
				</section>

				<Show when={unused().length > 0}>
					<section
						class="mdq-panel"
						data-tone="unused"
						aria-labelledby={unusedTitleId}
					>
						<h4 id={unusedTitleId} class="mdq-panel-title">
							{messages().orderingUnused}
						</h4>
						<ol
							class="mdq-ordering-list"
							data-list="unused"
							aria-labelledby={unusedTitleId}
						>
							<Index each={unused()}>
								{(line, index) => (
									<li class="mdq-ordering-line" data-index={index}>
										<LineBody line={[0, line()[1]]} {...lineProps()} />
										<span class="mdq-ordering-controls">
											<Control
												action="add"
												label={messages().orderingAdd(name(line()[1]))}
												onAct={() => include(index)}
											/>
										</span>
									</li>
								)}
							</Index>
						</ol>
					</section>
				</Show>

				<output class="mdq-sr-only" aria-live="polite" aria-atomic="true">
					{announcement()}
				</output>

				<Show when={props.question.unmatched === "manual"}>
					<p class="mdq-note">{messages().gradedByHand}</p>
				</Show>
			</Show>

			<Show when={props.question.epilogue}>
				<div class="mdq-epilogue">
					<Markdown text={props.question.epilogue} />
				</div>
			</Show>

			<Show when={review()?.correct?.length}>
				<Panel
					label={messages().orderingCorrect(review()?.correct?.length ?? 0)}
					tone="key"
				>
					<For each={review()?.correct}>
						{(answer) => (
							<ol class="mdq-ordering-list" data-list="key">
								<For each={answer}>
									{(line) => (
										<li class="mdq-ordering-line" data-level={line[0]}>
											<LineBody line={line} {...lineProps()} />
										</li>
									)}
								</For>
							</ol>
						)}
					</For>
				</Panel>
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

/** A titled block: `.mdq-panel`, a named region. */
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

/**
 * The text of a line, indented by its level: `.mdq-ordering-body`. Code keeps
 * its whitespace; text is inline Markdown, the source the spec compares.
 */
function LineBody(props: {
	line: OrderingLine;
	content: string;
	language: string | undefined;
	blank: string;
	level: (level: number) => string;
}): JSX.Element {
	return (
		<span class="mdq-ordering-body" style={{ "--mdq-level": props.line[0] }}>
			<Show when={props.line[0] > 0}>
				<span class="mdq-sr-only">{props.level(props.line[0])}</span>
			</Show>
			<Show
				when={props.line[1] !== ""}
				fallback={<span class="mdq-empty">{props.blank}</span>}
			>
				<Show
					when={props.content === "code"}
					fallback={
						<Markdown class="mdq-ordering-text" inline text={props.line[1]} />
					}
				>
					<code class="mdq-ordering-code" data-language={props.language}>
						{props.line[1]}
					</code>
				</Show>
			</Show>
		</span>
	);
}

/**
 * A button of a line. A control that cannot act uses `aria-disabled`, not
 * `disabled`: the button that just moved a line to the top is still the
 * focused one, and a disabled button would drop the focus.
 */
function Control(props: {
	action: Action;
	label: string;
	disabled?: boolean;
	onAct: () => void;
}): JSX.Element {
	return (
		<button
			type="button"
			class="mdq-ordering-button"
			data-action={props.action}
			aria-label={props.label}
			aria-disabled={props.disabled ? "true" : undefined}
			onClick={() => {
				if (!props.disabled) props.onAct();
			}}
		>
			<span aria-hidden="true">{GLYPHS[props.action]}</span>
		</button>
	);
}

const GLYPHS: Record<Action, string> = {
	up: "↑",
	down: "↓",
	indent: "⇥",
	outdent: "⇤",
	remove: "×",
	add: "+",
};
