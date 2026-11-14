import {
	batch,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	Index,
	type JSX,
	onCleanup,
	type ParentProps,
	Show,
} from "solid-js";
import type { PublicOrderingQuestion } from "../index.js";
import type { OrderingResponse } from "../responses.js";
import type { OrderingLine } from "../schema/questions.js";
import { Feedback } from "./Feedback.jsx";
import { Markdown } from "./Markdown.jsx";
import { type Locale, type Messages, useMessages } from "./messages.jsx";
import { dropIndex, relocate, type Slot } from "./ordering-drag.js";
import { Pending } from "./Pending.jsx";
import { plainInline } from "./render-markdown.js";
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
	/** Rendered right after the stem, before the response controls. */
	afterStem?: JSX.Element;
	/**
	 * A response that matches no declared answer is pending under
	 * `unmatched: manual`, so the result may be pending. `correct` is the list
	 * from `correctResponses()`: the answer key, then each accepted ordering.
	 */
	result?: ReviewResult<OrderingResponse>;
	messages?: Partial<Messages>;
	locale?: Locale;
}

type Action = "grip" | "indent" | "outdent" | "remove" | "add";

/// Pixels the pointer must travel before a press becomes a drag.
const DRAG_THRESHOLD = 4;
/// Distance from the top or bottom of the window where a drag scrolls the page.
const SCROLL_EDGE = 48;
/// Pixels per frame the page scrolls at the very edge of the window.
const SCROLL_SPEED = 24;

/// A drag in progress: the line, the slot it would take, and its offset.
interface Drag {
	from: Slot;
	target: Slot | null;
	offset: number;
}

/// The pointer state between `pointerdown` and the end of the gesture.
interface Session {
	pointerId: number;
	element: HTMLElement;
	from: Slot;
	startX: number;
	startY: number;
	startScroll: number;
	x: number;
	y: number;
	active: boolean;
	frame: number | undefined;
}

/**
 * An ordering question: `.mdq-question[data-type="ordering"]`.
 *
 * In `answer` mode the student builds the response in a list (`.mdq-ordering-list`
 * with `data-list="used"`), starting from the whole pool. A line the student
 * leaves out goes to a second list (`data-list="unused"`), which is how a
 * distractor is dropped: the spec lets a response omit lines. A line moves by
 * dragging its handle (`.mdq-ordering-grip`); a mouse or pen drags from the
 * whole line, a finger from the handle only, so the page still scrolls over the
 * text. Reordering never needs a pointer: the arrow keys on the handle move a
 * line up and down and, under `lenient` and `strict`, change its level, and
 * buttons leave a line out, use it, and indent or outdent it. A polite live
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
	const gripHintId = `${id}-grip-hint`;

	const content = () => props.question.content;
	const indentation = () => props.question.indentation ?? "fixed";
	const editsLevels = () => indentation() !== "fixed";

	const [internal, setInternal] = createSignal<OrderingResponse>(
		props.value ?? props.question.pool,
	);
	const [touched, setTouched] = createSignal(false);
	/**
	 * Whether there is a response. Before the first one, the answer shows the
	 * pool: a student who agrees with it confirms it with "Keep this order",
	 * and a host whose student submits without a response can ask whether to
	 * skip the question.
	 */
	const answered = () =>
		props.value !== undefined ? props.value !== null : touched();
	const used = createMemo<OrderingResponse>(() => {
		if (props.value === undefined) return internal();
		if (props.value !== null) return props.value;
		return mode() === "answer" ? props.question.pool : [];
	});

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
	const [drag, setDrag] = createSignal<Drag | null>(null);
	let session: Session | undefined;

	// A text line is Markdown; its markup is not read out in a control name.
	const name = (text: string) => {
		if (text === "") return messages().orderingBlankLine;
		return content() === "text" ? plainInline(text) : text;
	};

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
		setTouched(true);
		setInternal(next);
		props.onChange?.(next);
	}

	/** Takes the order on screen, untouched, as the response. */
	function keep(): void {
		commit([...used()]);
		setAnnouncement(messages().orderingKept);
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
			focusControl("used", target, "grip");
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
		if (line[0] >= (props.question.maxLevel ?? Number.POSITIVE_INFINITY)) {
			return false;
		}
		if (content() === "text") {
			const before = lines[index - 1];
			return before !== undefined && line[0] <= before[0];
		}
		return true;
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
		announceLeftOut(line, "add");
	}

	/** Announces a line that left the answer and focuses `action` of its row in the unused list. */
	function announceLeftOut(line: OrderingLine, action: Action = "grip"): void {
		const position = unused().findIndex(
			(left) => identity(left) === identity(line),
		);
		if (position >= 0) focusControl("unused", position, action);
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

	/** Moves a line with the arrow keys of its handle. */
	function onGripKey(event: KeyboardEvent, index: number): void {
		if (event.key === "ArrowUp") move(index, -1);
		else if (event.key === "ArrowDown") move(index, 1);
		else if (event.key === "ArrowLeft" && editsLevels()) shift(index, -1);
		else if (event.key === "ArrowRight" && editsLevels()) shift(index, 1);
		else return;
		event.preventDefault();
	}

	/** The slot under the pointer, or `null` when it is over neither list. */
	function locate(x: number, y: number, from: Slot): Slot | null {
		for (const list of ["used", "unused"] as const) {
			const element = root?.querySelector<HTMLElement>(`[data-list="${list}"]`);
			const box = element?.closest(".mdq-panel")?.getBoundingClientRect();
			if (element === null || element === undefined || box === undefined) {
				continue;
			}
			if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
				continue;
			}
			const centers: number[] = [];
			for (const row of Array.from(element.children)) {
				const index = (row as HTMLElement).dataset.index;
				if (index === undefined) continue;
				if (from.list === list && Number(index) === from.index) continue;
				const rect = row.getBoundingClientRect();
				centers.push(rect.top + rect.height / 2);
			}
			return { list, index: dropIndex(centers, y) };
		}
		return null;
	}

	/** Follows the pointer: moves the dragged line and finds the drop slot. */
	function update(): void {
		if (session === undefined || !session.active) return;
		const { x, y, from } = session;
		const offset = y - session.startY + (window.scrollY - session.startScroll);
		const target = locate(x, y, from) ?? drag()?.target ?? null;
		setDrag({ from, target, offset });
	}

	/** Scrolls the page while the pointer rests near an edge of the window. */
	function autoscroll(): void {
		if (session === undefined) return;
		const { y } = session;
		const up = Math.min(1, (SCROLL_EDGE - y) / SCROLL_EDGE);
		const down = Math.min(
			1,
			(y - (window.innerHeight - SCROLL_EDGE)) / SCROLL_EDGE,
		);
		const speed = up > 0 ? -up : Math.max(0, down);
		if (speed !== 0) {
			const before = window.scrollY;
			const top = Math.sign(speed) * Math.ceil(Math.abs(speed) * SCROLL_SPEED);
			window.scrollBy({ top, behavior: "instant" });
			if (window.scrollY !== before) update();
		}
		session.frame = requestAnimationFrame(autoscroll);
	}

	function onPointerMove(event: PointerEvent): void {
		if (session === undefined || event.pointerId !== session.pointerId) return;
		session.x = event.clientX;
		session.y = event.clientY;
		if (!session.active) {
			const travelled = Math.hypot(
				session.x - session.startX,
				session.y - session.startY,
			);
			if (travelled < DRAG_THRESHOLD) return;
			session.active = true;
			session.element.setPointerCapture?.(session.pointerId);
			setDrag({ from: session.from, target: null, offset: 0 });
			session.frame = requestAnimationFrame(autoscroll);
		}
		update();
	}

	function onPointerUp(event: PointerEvent): void {
		if (event.pointerId === session?.pointerId) finishDrag(true);
	}

	function onPointerCancel(event: PointerEvent): void {
		if (event.pointerId === session?.pointerId) finishDrag(false);
	}

	/** A touch holds an implicit capture that `setPointerCapture` moves, so only the line's own loss counts. */
	function onCaptureLost(event: PointerEvent): void {
		if (event.target === session?.element) onPointerCancel(event);
	}

	function onDragKey(event: KeyboardEvent): void {
		if (event.key !== "Escape") return;
		event.preventDefault();
		finishDrag(false);
	}

	function onPointerDown(
		event: PointerEvent & { currentTarget: HTMLElement },
		list: Slot["list"],
		index: number,
	): void {
		if (mode() !== "answer" || session !== undefined || !event.isPrimary) {
			return;
		}
		if (event.pointerType === "mouse" && event.button !== 0) return;
		const target = event.target as Element;
		if (target.closest(".mdq-ordering-button")) return;
		const touch = event.pointerType === "touch";
		if (touch && !target.closest(".mdq-ordering-grip")) return;
		session = {
			pointerId: event.pointerId,
			element: event.currentTarget,
			from: { list, index },
			startX: event.clientX,
			startY: event.clientY,
			startScroll: window.scrollY,
			x: event.clientX,
			y: event.clientY,
			active: false,
			frame: undefined,
		};
		if (!touch) event.preventDefault();
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerup", onPointerUp);
		window.addEventListener("pointercancel", onPointerCancel);
		window.addEventListener("lostpointercapture", onCaptureLost);
		window.addEventListener("keydown", onDragKey, true);
	}

	/** Ends the gesture; `drop` applies the move, otherwise nothing changes. */
	function finishDrag(drop: boolean): void {
		const ended = session;
		if (ended === undefined) return;
		session = undefined;
		window.removeEventListener("pointermove", onPointerMove);
		window.removeEventListener("pointerup", onPointerUp);
		window.removeEventListener("pointercancel", onPointerCancel);
		window.removeEventListener("lostpointercapture", onCaptureLost);
		window.removeEventListener("keydown", onDragKey, true);
		if (ended.frame !== undefined) cancelAnimationFrame(ended.frame);
		if (ended.element.hasPointerCapture?.(ended.pointerId)) {
			ended.element.releasePointerCapture(ended.pointerId);
		}
		const target = drag()?.target;
		batch(() => {
			setDrag(null);
			if (drop && ended.active && target) dropLine(ended.from, target);
		});
	}

	/** Applies a drop and announces it. */
	function dropLine(from: Slot, to: Slot): void {
		const line = (from.list === "used" ? used() : unused())[from.index];
		const next = relocate(used(), unused(), from, to);
		if (line === undefined || next === null) return;
		const total = used().length;
		commit(next);
		if (to.list === "unused") {
			announceLeftOut(line);
			return;
		}
		const last = from.list === "used" ? total - 1 : total;
		const at = Math.min(to.index, last);
		const placed = used()[at];
		if (placed !== undefined && placed[1] === line[1]) {
			focusControl("used", at, "grip");
		}
		if (from.list === "used") announceMove(line, placed, at);
		else {
			setAnnouncement(
				messages().orderingAdded(name(line[1]), at + 1, used().length),
			);
		}
	}

	onCleanup(() => finishDrag(false));

	/** Whether the drop marker goes before the row `index` of `list`. */
	function markerBefore(list: Slot["list"], index: number): boolean {
		const current = drag();
		const target = current?.target;
		if (current === null || !target || target.list !== list) return false;
		if (current.from.list === "unused" && list === "unused") return false;
		if (current.from.list === list && current.from.index === index) {
			return false;
		}
		const skipped = current.from.list === list && index > current.from.index;
		return (skipped ? index - 1 : index) === target.index;
	}

	/** Whether the drop marker goes after the last row of `list`. */
	function markerLast(list: Slot["list"], rows: number): boolean {
		const current = drag();
		const target = current?.target;
		if (current === null || !target || target.list !== list) return false;
		if (current.from.list === "unused" && list === "unused") return false;
		return target.index >= (current.from.list === list ? rows - 1 : rows);
	}

	/** The props of a row that can be dragged. */
	const rowProps = (list: Slot["list"], index: number) => {
		const current = drag();
		const dragged = current?.from.list === list && current.from.index === index;
		return {
			"data-dragging": dragged ? "" : undefined,
			style: dragged
				? { transform: `translateY(${current?.offset ?? 0}px)` }
				: undefined,
			onPointerDown: (event: PointerEvent & { currentTarget: HTMLElement }) =>
				onPointerDown(event, list, index),
			onDragStart: (event: DragEvent) => event.preventDefault(),
		};
	};

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
			data-dragging={drag() !== null ? "" : undefined}
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
			{props.afterStem}

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
								<>
									<Show when={markerBefore("used", index)}>
										<DropMarker />
									</Show>
									<li
										class="mdq-ordering-line"
										data-index={index}
										data-level={line()[0]}
										{...rowProps("used", index)}
									>
										<Grip
											label={messages().orderingGrip(name(line()[1]))}
											hintId={gripHintId}
											onKeyDown={(event) => onGripKey(event, index)}
										/>
										<LineBody line={line()} {...lineProps()} />
										<span class="mdq-ordering-controls">
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
								</>
							)}
						</Index>
						<Show when={markerLast("used", used().length)}>
							<DropMarker />
						</Show>
					</ol>
					<Show when={!answered()}>
						<p class="mdq-ordering-keep">
							<span>{messages().orderingNotAnswered}</span>
							<button
								type="button"
								class="mdq-ordering-keep-button"
								onClick={keep}
							>
								{messages().orderingKeep}
							</button>
						</p>
					</Show>
				</section>

				<Show when={unused().length > 0 || drag() !== null}>
					<section
						class="mdq-panel"
						data-tone="unused"
						aria-labelledby={unusedTitleId}
					>
						<h4 id={unusedTitleId} class="mdq-panel-title">
							{messages().orderingUnused}
						</h4>
						<Show when={unused().length === 0}>
							<p class="mdq-empty">{messages().orderingDropUnused}</p>
						</Show>
						<ol
							class="mdq-ordering-list"
							data-list="unused"
							aria-labelledby={unusedTitleId}
						>
							<Index each={unused()}>
								{(line, index) => (
									<li
										class="mdq-ordering-line"
										data-index={index}
										{...rowProps("unused", index)}
									>
										<Grip
											label={messages().orderingGrip(name(line()[1]))}
											hintId={gripHintId}
										/>
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
							<Show when={markerLast("unused", unused().length)}>
								<DropMarker />
							</Show>
						</ol>
					</section>
				</Show>

				<span id={gripHintId} class="mdq-sr-only">
					{messages().orderingGripHint}
				</span>

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

/** The marker of the place where a dragged line would land. */
function DropMarker(): JSX.Element {
	return (
		<li class="mdq-ordering-drop" role="presentation" aria-hidden="true" />
	);
}

/**
 * The handle of a line: it starts a drag, and its arrow keys move the line.
 * The drag itself is handled by the line.
 */
function Grip(props: {
	label: string;
	hintId: string;
	onKeyDown?: (event: KeyboardEvent) => void;
}): JSX.Element {
	return (
		<button
			type="button"
			class="mdq-ordering-grip"
			data-action="grip"
			aria-label={props.label}
			aria-describedby={props.hintId}
			onKeyDown={props.onKeyDown}
		>
			<span aria-hidden="true">⠿</span>
		</button>
	);
}

/**
 * A button of a line. A control that cannot act uses `aria-disabled`, not
 * `disabled`: the button that just moved a line to the top is still the
 * focused one, and a disabled button would drop the focus.
 */
function Control(props: {
	action: Exclude<Action, "grip">;
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

const GLYPHS: Record<Exclude<Action, "grip">, string> = {
	indent: "⇥",
	outdent: "⇤",
	remove: "×",
	add: "+",
};
