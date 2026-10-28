import type { JSX } from "solid-js";
import type { Messages } from "./messages.jsx";

export interface PendingProps {
	messages: Messages;
}

/**
 * The badge of a response that waits for an instructor:
 * `.mdq-score[data-sign="pending"]`. A pending response is not a zero.
 */
export function Pending(props: PendingProps): JSX.Element {
	return (
		<span class="mdq-score" data-sign="pending">
			{props.messages.pending}
		</span>
	);
}
