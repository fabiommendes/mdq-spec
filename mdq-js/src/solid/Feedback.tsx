import { For, type JSX, Show } from "solid-js";
import { Markdown } from "./Markdown.jsx";
import { scoreSign } from "./types.js";

export interface FeedbackProps {
	id: string;
	/** In document order. Nothing is rendered when it is empty. */
	feedback: readonly string[];
	/** Picks how the box looks: `data-sign`. */
	score: number;
}

/**
 * The feedback a graded response triggers: `.mdq-feedback[data-sign]`, one
 * `.mdq-feedback-item` per message.
 *
 * It is not a live region. It appears together with the rest of a graded
 * question, so there is no change to announce; the codehood version used
 * `role="alert"` and interrupted a screen reader on every page load.
 */
export function Feedback(props: FeedbackProps): JSX.Element {
	return (
		<Show when={props.feedback.length > 0}>
			<div
				id={props.id}
				class="mdq-feedback"
				data-sign={scoreSign(props.score)}
			>
				<For each={props.feedback}>
					{(text) => <Markdown class="mdq-feedback-item" text={text} />}
				</For>
			</div>
		</Show>
	);
}
