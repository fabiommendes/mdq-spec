import type { JSX } from "solid-js";
import type { Messages } from "./messages.jsx";
import { scoreSign } from "./types.js";

export interface ScoreProps {
	/** In [-1, 1]. */
	score: number;
	messages: Messages;
}

/** The badge of a graded question: `.mdq-score[data-sign]`. */
export function Score(props: ScoreProps): JSX.Element {
	return (
		<span class="mdq-score" data-sign={scoreSign(props.score)}>
			{props.messages.score(formatScore(props.score))}
		</span>
	);
}

/** Two decimals, and a real minus sign (U+2212) for a penalty. */
export function formatScore(score: number): string {
	const magnitude = Math.abs(score).toFixed(2);
	return score < 0 ? `−${magnitude}` : magnitude;
}
