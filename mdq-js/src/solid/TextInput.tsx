import { createSignal, type JSX } from "solid-js";

export interface TextInputProps {
	value?: string | null;
	onChange?: (text: string) => void;
	disabled?: boolean;
	id?: string;
	placeholder?: string;
	"aria-labelledby"?: string;
	"aria-label"?: string;
	"aria-describedby"?: string;
	"aria-invalid"?: boolean;
}

/**
 * One line of text: `input.mdq-input`.
 *
 * Without `value` it keeps the text itself. With `value` it shows only what
 * `value` says: a keystroke the parent does not apply is undone in the DOM.
 * Internal to the package, shared by the short answer and the fill-in.
 */
export function TextInput(props: TextInputProps): JSX.Element {
	const [internal, setInternal] = createSignal(props.value ?? "");
	const text = () =>
		props.value !== undefined ? (props.value ?? "") : internal();

	return (
		<input
			id={props.id}
			type="text"
			class="mdq-input"
			placeholder={props.placeholder}
			disabled={props.disabled}
			value={text()}
			onInput={(event) => {
				const input = event.currentTarget;
				setInternal(input.value);
				props.onChange?.(input.value);
				input.value = text();
			}}
			aria-labelledby={props["aria-labelledby"]}
			aria-label={props["aria-label"]}
			aria-describedby={props["aria-describedby"]}
			aria-invalid={props["aria-invalid"] ? "true" : undefined}
		/>
	);
}
