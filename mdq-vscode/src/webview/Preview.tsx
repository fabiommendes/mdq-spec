import {
	load,
	type MdqDocument,
	type PublicQuestion,
	publicForm,
	type Question,
} from "@mdq-format/core";
import {
	type HostResult,
	type Locale,
	type QuestionMode,
	QuestionView,
} from "@mdq-format/core/solid";
import {
	type Component,
	createMemo,
	createSignal,
	type JSX,
	Match,
	Show,
	Switch,
} from "solid-js";
import { type FakeFile, withFile, withoutFile } from "./fake-upload.js";
import { review } from "./grade.js";
import type { ShowMessage } from "./protocol.js";

/** The modes the toolbar offers: the student's view and the answer key. */
export type PreviewMode = "answer" | "review";

export interface PreviewProps {
	/** The last document the extension sent, if any. */
	shown: ShowMessage | undefined;
	mode: PreviewMode;
	onMode: (mode: PreviewMode) => void;
}

/**
 * The preview of one MDQ question in the student's mode (`answer`) or in
 * the answer key (`review`). A response given in `answer` is graded in
 * `review`; editing the document clears it.
 */
export function Preview(props: PreviewProps): JSX.Element {
	const loaded = createMemo(() => {
		const shown = props.shown;
		if (shown === undefined) return undefined;
		return load(shown.text, { format: shown.format, ids: "fill" });
	});

	return (
		<div class="mdq-preview">
			<header class="mdq-preview-toolbar">
				<span class="mdq-preview-name">{props.shown?.name}</span>
				<fieldset class="mdq-preview-modes">
					<legend class="mdq-sr-only">Mode</legend>
					<ModeButton value="answer" label="Student" {...props} />
					<ModeButton value="review" label="Answer key" {...props} />
				</fieldset>
			</header>
			<Show
				when={loaded()}
				fallback={<p class="mdq-preview-note">Open an MDQ document.</p>}
			>
				{(result) => (
					<Show
						when={result().document}
						keyed
						fallback={
							<p class="mdq-preview-note">
								The document has errors. See the Problems panel.
							</p>
						}
					>
						{(document) => (
							<DocumentView
								document={document}
								mode={props.mode}
								locale={props.shown?.locale ?? "en"}
							/>
						)}
					</Show>
				)}
			</Show>
		</div>
	);
}

function ModeButton(
	props: PreviewProps & { value: PreviewMode; label: string },
): JSX.Element {
	return (
		<button
			type="button"
			aria-pressed={props.mode === props.value}
			data-mode={props.value}
			onClick={() => props.onMode(props.value)}
		>
			{props.label}
		</button>
	);
}

function DocumentView(props: {
	document: MdqDocument;
	mode: PreviewMode;
	locale: Locale;
}): JSX.Element {
	return (
		<Show
			when={!("questions" in props.document)}
			fallback={
				<p class="mdq-preview-note">The preview of exams is not ready yet.</p>
			}
		>
			<QuestionPreview
				question={props.document as Question}
				mode={props.mode}
				locale={props.locale}
			/>
		</Show>
	);
}

/**
 * `QuestionView` with loose props. The preview handles every type with one
 * code path, so it gives up the per-type prop types.
 */
const View = QuestionView as unknown as Component<{
	question: PublicQuestion;
	mode: QuestionMode;
	locale: Locale;
	value?: unknown;
	onChange?: (value: unknown) => void;
	result?: object;
	answerKey?: string;
	upload?: (file: File) => Promise<HostResult<readonly FakeFile[]>>;
	remove?: (name: string) => Promise<HostResult<readonly FakeFile[]>>;
}>;

function QuestionPreview(props: {
	question: Question;
	mode: PreviewMode;
	locale: Locale;
}): JSX.Element {
	const [response, setResponse] = createSignal<unknown>();
	const pub = createMemo(() => publicForm(props.question));
	const graded = createMemo(() => review(props.question, response()));

	const files = () => response() as readonly FakeFile[] | null | undefined;
	const keep = (list: FakeFile[]): Promise<HostResult<readonly FakeFile[]>> => {
		// No file is a skip, `null`, never `[]`.
		setResponse(() => (list.length === 0 ? null : list));
		return Promise.resolve({ ok: true, value: list });
	};
	const host = () =>
		props.question.type === "upload"
			? {
					upload: (file: File) => keep(withFile(files(), file)),
					remove: (name: string) => keep(withoutFile(files(), name)),
				}
			: {};

	return (
		<Switch>
			<Match when={props.mode === "answer"}>
				<View
					question={pub()}
					mode="answer"
					locale={props.locale}
					value={response()}
					onChange={(value) => setResponse(() => value)}
					{...host()}
				/>
			</Match>
			<Match when={props.mode === "review"}>
				<Show
					when={!("error" in graded())}
					fallback={
						<p class="mdq-preview-note">
							{(graded() as { error: string }).error}
						</p>
					}
				>
					<View
						question={pub()}
						mode="review"
						locale={props.locale}
						value={(graded() as { response: unknown }).response}
						result={(graded() as { result: object }).result}
						answerKey={(graded() as { answerKey?: string }).answerKey}
					/>
				</Show>
			</Match>
		</Switch>
	);
}
