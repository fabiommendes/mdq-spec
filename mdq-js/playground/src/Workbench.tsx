import {
	correctResponses,
	type Diagnostic,
	load,
	NotAutoGradable,
	type PublicQuestion,
	publicForm,
	type Question,
	scoreResponse,
} from "@mdq/index.js";
import { type QuestionMode, QuestionView } from "@mdq/solid/index.js";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	on,
	Show,
} from "solid-js";

/**
 * Shows one question in the three modes of a view, from an editable source.
 * The response given in `answer` feeds `review`.
 */
export function Workbench(props: { source: string }): JSX.Element {
	const [source, setSource] = createSignal(props.source);
	const [response, setResponse] = createSignal<unknown>();
	createEffect(
		on(
			() => props.source,
			(next) => {
				setSource(next);
				setResponse(undefined);
			},
		),
	);

	// A server stores the document with its ids filled, so do the same.
	const loaded = createMemo(() =>
		load(source(), { kind: "question", ids: "fill" }),
	);
	const question = createMemo(() => loaded().document);

	return (
		<div class="workbench">
			<section class="pane source">
				<h2>Source</h2>
				<textarea
					data-testid="source"
					spellcheck={false}
					value={source()}
					onInput={(event) => {
						setSource(event.currentTarget.value);
						setResponse(undefined);
					}}
				/>
				<Diagnostics items={loaded().diagnostics} />
			</section>
			<Show when={question()} keyed>
				{(doc) => {
					const pub = publicForm(doc);
					return (
						<>
							<Mode name="answer">
								<View
									question={pub}
									mode="answer"
									onChange={(value) => setResponse(() => value)}
								/>
							</Mode>
							<Mode name="readonly">
								<View question={pub} mode="readonly" value={response()} />
							</Mode>
							<Mode name="review">
								<Review question={doc} public={pub} response={response()} />
							</Mode>
						</>
					);
				}}
			</Show>
		</div>
	);
}

function Mode(props: { name: string; children: JSX.Element }): JSX.Element {
	return (
		<section class="pane" data-testid={`mode-${props.name}`}>
			<h2>{props.name}</h2>
			{props.children}
		</section>
	);
}

/**
 * `QuestionView` with loose props. The playground handles every type with one
 * code path, so it gives up the per-type prop types.
 */
const View = QuestionView as unknown as Component<{
	question: PublicQuestion;
	mode: QuestionMode;
	value?: unknown;
	onChange?: (value: unknown) => void;
	result?: object;
}>;

function Review(props: {
	question: Question;
	public: PublicQuestion;
	response: unknown;
}): JSX.Element {
	const graded = createMemo(() => grade(props.question, props.response));
	return (
		<Show
			when={!("error" in graded())}
			fallback={<p class="note">{(graded() as { error: string }).error}</p>}
		>
			<View
				question={props.public}
				mode="review"
				value={props.response}
				result={graded()}
			/>
		</Show>
	);
}

/** The result `review` takes, or why there is none. */
function grade(question: Question, response: unknown): object {
	if (response === undefined) return { error: "Answer first to see a review." };
	const correct = correctResponses(question);
	try {
		return { ...scoreResponse(question, response), correct };
	} catch (error) {
		if (error instanceof NotAutoGradable) return { pending: true, correct };
		return { error: String(error) };
	}
}

function Diagnostics(props: { items: readonly Diagnostic[] }): JSX.Element {
	return (
		<Show when={props.items.length > 0}>
			<ul class="diagnostics" data-testid="diagnostics">
				<For each={props.items}>
					{(item) => (
						<li data-severity={item.severity}>
							<code>{item.code}</code>
							{item.line === undefined ? "" : ` (line ${item.line})`}:{" "}
							{item.message}
						</li>
					)}
				</For>
			</ul>
		</Show>
	);
}
