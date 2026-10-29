import type { JSX } from "solid-js";
import type { Messages } from "./messages.jsx";

/** What a mark next to a choice says. */
export type MarkKind = "correct" | "partial" | "incorrect" | "selected";

/** The mark of a graded response: 1 or more is correct, 0 or less incorrect. */
export type Verdict = "correct" | "partial" | "incorrect";

/** The verdict of a score in [-1, 1]. */
export function verdictOf(score: number): Verdict {
	if (score >= 1) return "correct";
	return score > 0 ? "partial" : "incorrect";
}

const CHECK =
	"M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0Z";
const CROSS =
	"M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z";

const DASH = "M4 10a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z";

const PATHS: Record<MarkKind, string> = {
	correct: CHECK,
	partial: DASH,
	incorrect: CROSS,
	selected: CHECK,
};

const LABELS: Record<
	MarkKind,
	"correct" | "partial" | "incorrect" | "yourAnswer"
> = {
	correct: "correct",
	partial: "partial",
	incorrect: "incorrect",
	selected: "yourAnswer",
};

export interface MarkProps {
	kind: MarkKind;
	messages: Messages;
}

/**
 * An icon next to a choice, with its meaning as text for a screen reader.
 *
 * The icon is hidden from assistive technology and the text is visually
 * hidden. A `<title>` inside an `aria-hidden` SVG is never read, so an icon
 * alone would tell a screen reader user nothing.
 */
export function Mark(props: MarkProps): JSX.Element {
	return (
		<span class="mdq-mark" data-mark={props.kind}>
			<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
				<path fill-rule="evenodd" clip-rule="evenodd" d={PATHS[props.kind]} />
			</svg>
			<span class="mdq-sr-only">{props.messages[LABELS[props.kind]]}</span>
		</span>
	);
}
