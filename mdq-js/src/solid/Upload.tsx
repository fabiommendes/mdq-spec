import {
	createSignal,
	createUniqueId,
	For,
	type JSX,
	onCleanup,
	type ParentProps,
	Show,
} from "solid-js";
import type { PublicUploadQuestion } from "../index.js";
import { matchesExtensions, maxSizeBytes } from "../models/upload.js";
import type { UploadFile } from "../responses.js";
import { Feedback } from "./Feedback.jsx";
import { Markdown } from "./Markdown.jsx";
import { type LocalizedProps, useMessages } from "./messages.jsx";
import { Pending } from "./Pending.jsx";
import { Score } from "./Score.jsx";
import { isPending, type QuestionMode, type ReviewResult } from "./types.js";

/** What the host answers to a request: a value, a request to retry, or a refusal. */
export type HostResult<T> =
	| { ok: true; value: T }
	/** The host is overloaded (HTTP 429): try again later. */
	| { ok: false; busy: true; retryAfterMs?: number }
	/** The host refused the request: show `message`. */
	| { ok: false; busy?: false; message: string };

export interface UploadProps extends LocalizedProps {
	question: PublicUploadQuestion;
	/** The files of the response. Omit it to let the component keep the state. */
	value?: readonly UploadFile[] | null;
	/** Called with the list the component now shows (`null` when empty). A notice, not a save request. */
	onChange?: (files: readonly UploadFile[] | null) => void;
	/** Stores one file. Resolves to the new whole list of the response. */
	upload?: (file: File) => Promise<HostResult<readonly UploadFile[]>>;
	/** Removes the file with this name. Resolves to the new whole list (empty or `null` for no file). */
	remove?: (name: string) => Promise<HostResult<readonly UploadFile[]>>;
	/** The download URL of a file, or `null` for no link. */
	fileUrl?: (file: UploadFile) => string | null;
	/** The name the host stores for a file name (its sanitisation). Identity by default. */
	normalizeName?: (name: string) => string;
	/** `answer` by default. */
	mode?: QuestionMode;
	/** Leaves out the score badge in `review` mode. */
	hideScore?: boolean;
	/** Rendered right after the stem, before the response controls. */
	afterStem?: JSX.Element;
	/**
	 * An upload is graded by an instructor, so the result is pending until then.
	 * `correct` is unused: it is always empty for upload. The answer key comes in `answerKey`.
	 */
	result?: ReviewResult<readonly UploadFile[]>;
	/** The answer key (Markdown) to show in review as guidance, when the host may show it. */
	answerKey?: string | null;
}

/// The waits between tries when the host is busy, in ms, and how many tries a request gets.
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000];
const MAX_BACKOFF_MS = 30000;
const MIN_BACKOFF_MS = 1000;
const MAX_TRIES = 6;

/**
 * The source of the jitter of the waits, 0 to 1. Replaced by tests only.
 *
 * @internal
 */
export const jitter: { random: () => number } = { random: Math.random };

/// The wait before a retry: the host's hint clamped, or the exponential step, plus 0 to 50% of jitter.
function backoffMs(hint: number | undefined, tries: number): number {
	const base =
		hint !== undefined && Number.isFinite(hint) && hint > 0
			? Math.min(Math.max(hint, MIN_BACKOFF_MS), MAX_BACKOFF_MS)
			: Math.min(BACKOFF_MS[tries - 1] ?? MAX_BACKOFF_MS, MAX_BACKOFF_MS);
	return base * (1 + 0.5 * jitter.random());
}

type RowState = "queued" | "sending" | "waiting" | "error";

/// A file on its way to the host, or one that failed to get there.
interface Row {
	id: number;
	name: string;
	state: RowState;
	text: string;
}

type Task =
	| { kind: "upload"; file: File; name: string; row: number }
	| { kind: "remove"; name: string };

type Outcome =
	| { kind: "ok"; files: readonly UploadFile[] }
	| { kind: "refused"; message: string }
	| { kind: "failed" };

const wait = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

/**
 * An upload question: `.mdq-question[data-type="upload"]`.
 *
 * In `answer` mode it checks each chosen file against the limits of the
 * question, then sends the files to the host one at a time, retrying while the
 * host says it is busy. Outside it, the files are listed with their sizes and
 * links. The answer key is a panel in `review` mode.
 *
 * When the component is unmounted, the call in flight is not cancelled: if it
 * resolves ok, `onChange` still hears the list the host returned (the host
 * already stored it). The tasks still queued are dropped.
 */
export function Upload(props: UploadProps): JSX.Element {
	const messages = useMessages(props);
	const mode = () => props.mode ?? "answer";
	const id = createUniqueId();
	const inputId = `${id}-input`;
	const limitsId = `${id}-limits`;
	const feedbackId = `${id}-feedback`;

	const maxFiles = () => props.question.maxFiles ?? 1;
	const normalize = (name: string) => props.normalizeName?.(name) ?? name;

	const [kept, setKept] = createSignal<readonly UploadFile[]>(
		props.value ?? [],
	);
	const files = (): readonly UploadFile[] =>
		props.value !== undefined ? (props.value ?? []) : kept();
	const [rows, setRows] = createSignal<readonly Row[]>([]);
	const [removing, setRemoving] = createSignal<readonly string[]>([]);
	const [announcement, setAnnouncement] = createSignal("");

	const review = () => (mode() === "review" ? props.result : undefined);
	const settled = () => {
		const result = review();
		return result === undefined || isPending(result) ? undefined : result;
	};
	const hasFeedback = () => (settled()?.feedback.length ?? 0) > 0;
	const keyText = () => {
		const key = props.answerKey;
		return key !== undefined && key !== null && key.trim() !== ""
			? key
			: undefined;
	};

	const sizeLimit = () => {
		const size = props.question.maxSize;
		if (size === undefined || size === null) return null;
		return typeof size === "string" ? size : messages().fileSize(size);
	};

	let nextRow = 0;
	let disposed = false;
	let running = false;
	/** Every task not yet finished, the one running first. */
	const queue: Task[] = [];
	onCleanup(() => {
		disposed = true;
	});

	const patchRow = (row: number, patch: Partial<Row>) =>
		setRows((all) => all.map((r) => (r.id === row ? { ...r, ...patch } : r)));
	const dropRow = (row: number) =>
		setRows((all) => all.filter((r) => r.id !== row));
	const addError = (name: string, text: string) => {
		setRows((all) => [...all, { id: nextRow++, name, state: "error", text }]);
		setAnnouncement(text);
	};

	function adopt(list: readonly UploadFile[] | null | undefined): void {
		const next = list ?? [];
		setKept(next);
		notify(next);
	}

	/// Tells the host callback; a throwing callback must not break the queue.
	function notify(next: readonly UploadFile[]): void {
		try {
			props.onChange?.(next.length === 0 ? null : next);
		} catch {
			// The callback is the host's business.
		}
	}

	/// The limit of one file in bytes; an invalid size is no limit, the host checks again.
	function limitBytes(): number | null {
		try {
			return maxSizeBytes(props.question);
		} catch {
			return null;
		}
	}

	/** Calls the host, retrying while it is busy. `onWait` hears each wait. */
	async function attempt(
		call: () => Promise<HostResult<readonly UploadFile[]>>,
		onWait: (seconds: number) => void,
		onRetry: () => void,
	): Promise<Outcome> {
		for (let tries = 1; tries <= MAX_TRIES; tries++) {
			let result: HostResult<readonly UploadFile[]>;
			try {
				result = await call();
			} catch {
				return { kind: "failed" };
			}
			if (result.ok) return { kind: "ok", files: result.value };
			if (!result.busy) return { kind: "refused", message: result.message };
			if (tries === MAX_TRIES) return { kind: "failed" };
			let left = backoffMs(result.retryAfterMs, tries);
			while (left > 0 && !disposed) {
				onWait(Math.ceil(left / 1000));
				const step = Math.min(1000, left);
				await wait(step);
				left -= step;
			}
			if (disposed) return { kind: "failed" };
			onRetry();
		}
		return { kind: "failed" };
	}

	async function perform(task: Task): Promise<void> {
		if (task.kind === "upload") {
			const { file, name, row } = task;
			const sending = () => {
				const text = messages().uploadSending(name);
				patchRow(row, { state: "sending", text });
				setAnnouncement(text);
			};
			sending();
			const outcome = await attempt(
				() => (props.upload as NonNullable<UploadProps["upload"]>)(file),
				(seconds) => {
					const text = messages().uploadWaiting(name, seconds);
					patchRow(row, { state: "waiting", text });
					setAnnouncement(text);
				},
				sending,
			);
			if (disposed) {
				if (outcome.kind === "ok") notify(outcome.files);
				return;
			}
			if (outcome.kind === "ok") {
				dropRow(row);
				adopt(outcome.files);
				setAnnouncement(messages().uploadDone(name));
				return;
			}
			const text =
				outcome.kind === "refused"
					? outcome.message
					: messages().uploadFailed(name);
			patchRow(row, { state: "error", text });
			setAnnouncement(text);
			return;
		}
		const { name } = task;
		const outcome = await attempt(
			() => (props.remove as NonNullable<UploadProps["remove"]>)(name),
			(seconds) => setAnnouncement(messages().uploadWaiting(name, seconds)),
			() => setAnnouncement(""),
		);
		if (disposed) {
			if (outcome.kind === "ok") notify(outcome.files);
			return;
		}
		if (outcome.kind === "ok") {
			adopt(outcome.files);
			setAnnouncement(messages().uploadRemoved(name));
		} else {
			addError(
				name,
				outcome.kind === "refused"
					? outcome.message
					: messages().uploadFailed(name),
			);
		}
	}

	async function drain(): Promise<void> {
		if (running) return;
		running = true;
		try {
			while (queue.length > 0 && !disposed) {
				const task = queue[0] as Task;
				try {
					await perform(task);
				} catch {
					if (task.kind === "upload" && !disposed) {
						const text = messages().uploadFailed(task.name);
						patchRow(task.row, { state: "error", text });
						setAnnouncement(text);
					}
				} finally {
					queue.shift();
					if (task.kind === "remove") {
						setRemoving((all) => all.filter((n) => n !== task.name));
					}
				}
			}
		} finally {
			running = false;
		}
	}

	/** The names the response will hold once the queue is done. */
	function plannedNames(): Set<string> {
		const names = new Set(files().map((f) => f.name));
		for (const task of queue) {
			if (task.kind === "upload") names.add(task.name);
			else names.delete(task.name);
		}
		return names;
	}

	function choose(chosen: readonly File[]): void {
		setRows((all) => all.filter((row) => row.state !== "error"));
		const planned = plannedNames();
		const limit = limitBytes();
		for (const file of chosen) {
			const name = normalize(file.name);
			const refusal =
				limit !== null && file.size > limit
					? messages().uploadTooLarge(
							file.name,
							props.question.maxSize !== undefined &&
								typeof props.question.maxSize === "string"
								? props.question.maxSize
								: messages().fileSize(limit),
						)
					: !matchesExtensions(props.question, name)
						? messages().uploadWrongExtension(
								file.name,
								props.question.extensions ?? [],
							)
						: !planned.has(name) && planned.size >= maxFiles()
							? messages().uploadTooMany(maxFiles())
							: undefined;
			if (refusal !== undefined) {
				addError(file.name, refusal);
				continue;
			}
			planned.add(name);
			const row = nextRow++;
			setRows((all) => [
				...all,
				{
					id: row,
					name: file.name,
					state: "queued",
					text: messages().uploadQueued(file.name),
				},
			]);
			queue.push({ kind: "upload", file, name, row });
		}
		void drain();
	}

	function requestRemoval(name: string): void {
		if (removing().includes(name)) return;
		setRemoving((all) => [...all, name]);
		queue.push({ kind: "remove", name });
		void drain();
	}

	return (
		<div class="mdq-question" data-type="upload" data-mode={mode()}>
			<Show when={!props.hideScore && review()}>
				<div class="mdq-header">
					<Show when={settled()} fallback={<Pending messages={messages()} />}>
						{(result) => <Score score={result().score} messages={messages()} />}
					</Show>
				</div>
			</Show>

			<div class="mdq-stem">
				<Markdown text={props.question.stem} />
			</div>
			{props.afterStem}

			<Show
				when={mode() === "answer"}
				fallback={
					<Panel label={messages().yourAnswer}>
						<Show
							when={files().length > 0}
							fallback={<p class="mdq-empty">{messages().noAnswer}</p>}
						>
							<FileList
								files={files()}
								removing={[]}
								fileUrl={props.fileUrl}
								formatSize={messages().fileSize}
							/>
						</Show>
					</Panel>
				}
			>
				<div class="mdq-upload">
					<label class="mdq-upload-label" for={inputId}>
						{messages().uploadChoose}
					</label>
					<input
						id={inputId}
						class="mdq-upload-input"
						type="file"
						multiple={maxFiles() > 1}
						accept={props.question.extensions?.join(",")}
						disabled={props.upload === undefined}
						aria-describedby={
							hasFeedback() ? `${limitsId} ${feedbackId}` : limitsId
						}
						onChange={(event) => {
							const input = event.currentTarget;
							const chosen = Array.from(input.files ?? []);
							input.value = "";
							choose(chosen);
						}}
					/>
					<p id={limitsId} class="mdq-upload-limits">
						{messages().uploadLimits(
							maxFiles(),
							sizeLimit(),
							props.question.extensions ?? null,
						)}
					</p>
					<Show
						when={files().length > 0 || rows().length > 0}
						fallback={<p class="mdq-note">{messages().uploadNoFiles}</p>}
					>
						<FileList
							files={files()}
							rows={rows()}
							removing={removing()}
							fileUrl={props.fileUrl}
							formatSize={messages().fileSize}
							onRemove={props.remove === undefined ? undefined : requestRemoval}
							removeLabel={messages().uploadRemove}
						/>
					</Show>
					<div class="mdq-upload-status" aria-live="polite">
						{announcement()}
					</div>
				</div>
			</Show>

			<Show when={props.question.epilogue}>
				<div class="mdq-epilogue">
					<Markdown text={props.question.epilogue} />
				</div>
			</Show>

			<Show when={mode() === "review" && keyText()}>
				{(key) => (
					<Panel label={messages().modelAnswer} tone="key">
						<Markdown text={key()} />
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

/// A titled block, as in the essay: `.mdq-panel`.
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

/// The stored files, then the ones on their way or that failed: `.mdq-upload-files`.
function FileList(props: {
	files: readonly UploadFile[];
	rows?: readonly Row[];
	removing: readonly string[];
	fileUrl?: (file: UploadFile) => string | null;
	formatSize: (bytes: number) => string;
	onRemove?: (name: string) => void;
	removeLabel?: (name: string) => string;
}): JSX.Element {
	return (
		<ul class="mdq-upload-files">
			<For each={props.files}>
				{(file) => {
					const url = () => props.fileUrl?.(file) ?? null;
					return (
						<li
							class="mdq-upload-file"
							data-state={
								props.removing.includes(file.name) ? "removing" : "stored"
							}
						>
							<Show
								when={url()}
								fallback={<span class="mdq-upload-name">{file.name}</span>}
							>
								{(href) => (
									<a class="mdq-upload-name" href={href()}>
										{file.name}
									</a>
								)}
							</Show>
							<span class="mdq-upload-size">{props.formatSize(file.size)}</span>
							<Show when={props.onRemove}>
								{(remove) => (
									<button
										type="button"
										class="mdq-upload-remove"
										aria-label={props.removeLabel?.(file.name)}
										disabled={props.removing.includes(file.name)}
										onClick={() => remove()(file.name)}
									>
										<span aria-hidden="true">×</span>
									</button>
								)}
							</Show>
						</li>
					);
				}}
			</For>
			<For each={props.rows ?? []}>
				{(row) => (
					<li class="mdq-upload-file" data-state={row.state}>
						<span class="mdq-upload-name">{row.name}</span>
						<Show when={row.text}>
							<span class="mdq-upload-note">{row.text}</span>
						</Show>
					</li>
				)}
			</For>
		</ul>
	);
}
