import {
	batch,
	createEffect,
	createSignal,
	createUniqueId,
	type JSX,
	Show,
} from "solid-js";
import { ResponseError } from "../errors.js";
import { scoreNumeric } from "../models/numeric.js";
import type { NumericResponse } from "../responses.js";
import type { NumericDomain } from "../schema/index.js";
import type { Messages } from "./messages.jsx";

export interface NumericInputProps {
	/** `fraction` takes `a/b`, `integer` takes whole numbers only. */
	domain: NumericDomain;
	/** Suffix inside the box, e.g. `g` or `m/s`. */
	unit?: string | undefined;
	/** The text to show. Omit it to let the box keep its own text. */
	value?: NumericResponse | null;
	/**
	 * Gets the text as a response string, trimmed, when it is a valid response
	 * for the `domain`; `null` when the box is empty or holds something else.
	 * A malformed text is never sent: grading would refuse it.
	 */
	onChange?: (value: string | null) => void;
	disabled?: boolean;
	id?: string;
	placeholder?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	messages: Messages;
}

/** Whether `text` is a numeric response the `domain` can represent. */
export function isNumericText(text: string, domain: NumericDomain): boolean {
	try {
		// Grading owns the rules for a valid response; the key is a stand-in.
		scoreNumeric({ answer: 0, domain }, text);
		return true;
	} catch (error) {
		if (error instanceof ResponseError) return false;
		throw error;
	}
}

/** The response string for the text in a box: trimmed, or `null` if not valid. */
function submitted(text: string, domain: NumericDomain): string | null {
	const trimmed = text.trim();
	return isNumericText(trimmed, domain) ? trimmed : null;
}

function responseText(value: NumericResponse | null): string | null {
	if (value === null) return null;
	if (typeof value === "object") return responseText(value.value);
	return String(value);
}

/** Same response: the same text, or the same finite number (`3.50` and `3.5`). */
function sameResponse(a: string | null, b: string | null): boolean {
	if (a === b) return true;
	if (a === null || b === null) return false;
	return Number.isFinite(Number(a)) && Number(a) === Number(b);
}

/**
 * One numeric answer box: `.mdq-numeric` with the box
 * (`.mdq-numeric-box`), its unit (`.mdq-unit`) and, once the student leaves a
 * box that holds an invalid text, a `.mdq-warning`. The box has
 * `data-invalid` and its input `aria-invalid` then.
 *
 * It is a text input, not `type="number"`: that one cannot hold `1/3`, and
 * hides the text that is not a number yet (`3.`, `-`). The unit is part of the
 * accessible name. It knows nothing about stems or scores, so the standalone
 * question and every numeric blank of a fill-in use the same box.
 */
export function NumericInput(props: NumericInputProps): JSX.Element {
	const unitId = createUniqueId();
	const warningId = `${unitId}-warning`;
	const [text, setText] = createSignal(responseText(props.value ?? null) ?? "");
	const [left, setLeft] = createSignal(false);

	// Follows `value` once the two disagree as responses, so a half-typed
	// "3.50" is not rewritten to "3.5" under the caret.
	createEffect(() => {
		if (props.value === undefined) return;
		const incoming = responseText(props.value);
		if (!sameResponse(submitted(text(), props.domain), incoming)) {
			setText(incoming ?? "");
		}
	});

	const invalid = () =>
		left() && text().trim() !== "" && submitted(text(), props.domain) === null;
	const fraction = () => props.domain === "fraction";

	return (
		<span class="mdq-numeric">
			<label
				class="mdq-numeric-box"
				for={props.id}
				data-invalid={invalid() ? "" : undefined}
			>
				<input
					id={props.id}
					type="text"
					inputmode={fraction() ? "text" : "decimal"}
					class="mdq-numeric-input"
					placeholder={fraction() ? "a/b" : props.placeholder}
					disabled={props.disabled}
					value={text()}
					onInput={(event) => {
						const input = event.currentTarget;
						// One batch, so the effect sees the text and the parent's
						// new value together.
						batch(() => {
							setText(input.value);
							props.onChange?.(submitted(input.value, props.domain));
						});
						// The effect above puts back the text of a parent that does
						// not apply the edit. The DOM follows it once the update has
						// run, which is after this handler.
						queueMicrotask(() => {
							input.value = text();
						});
					}}
					onBlur={() => setLeft(true)}
					aria-labelledby={
						props.unit
							? `${props["aria-labelledby"] ?? ""} ${unitId}`.trim()
							: props["aria-labelledby"]
					}
					aria-describedby={
						[props["aria-describedby"], invalid() ? warningId : undefined]
							.filter(Boolean)
							.join(" ") || undefined
					}
					aria-invalid={invalid() ? "true" : undefined}
				/>
				<Show when={props.unit}>
					{(unit) => (
						<span id={unitId} class="mdq-unit">
							{unit()}
						</span>
					)}
				</Show>
			</label>
			<Show when={invalid()}>
				<span id={warningId} class="mdq-warning">
					{props.messages.numericInvalid}
				</span>
			</Show>
		</span>
	);
}
