import {
	createEffect,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import type { PublicChoice } from "../index.js";
import { Markdown } from "./Markdown.jsx";

export interface ChoiceSelectProps {
	choices: readonly PublicChoice[];
	/** The picked choice id, or `null` for none. Omit it to let the box keep the state. */
	value?: string | null;
	/** Gets the picked id, or `null` when the student picks the placeholder row. */
	onChange?: (id: string | null) => void;
	disabled?: boolean;
	/** What an unpicked box shows, and the text of the row that clears it. */
	placeholder: string;
	"aria-label"?: string;
	"aria-describedby"?: string;
}

/**
 * A one-of-many picker whose choices are inline Markdown: `.mdq-select`.
 *
 * A native `<select>` cannot show Markdown: an `<option>` holds text only, so
 * `` `O(n)` `` would show its backticks. This is the select-only combobox of
 * the ARIA authoring practices. The button keeps focus and points at the
 * highlighted option with `aria-activedescendant`; the list is a
 * `.mdq-select-list[role="listbox"]` of `.mdq-select-option`s, with
 * `data-active` on the highlighted one and `data-selected` on the picked one.
 * The root has `data-open` while the list is shown.
 *
 * Keys: arrows open it and move, Home and End jump, Enter and Space open it or
 * pick, Escape closes. It closes on an outside click and when focus leaves.
 * There is no type-ahead.
 */
export function ChoiceSelect(props: ChoiceSelectProps): JSX.Element {
	const [open, setOpen] = createSignal(false);
	// -1 is the placeholder row, so this is an index into `choices` shifted by one.
	const [active, setActive] = createSignal(-1);
	const [internal, setInternal] = createSignal(props.value ?? null);
	const value = () => (props.value !== undefined ? props.value : internal());

	const id = createUniqueId();
	const listId = `${id}-list`;
	const optionId = (index: number) => `${id}-option-${index + 1}`;

	let root: HTMLSpanElement | undefined;
	let button: HTMLButtonElement | undefined;

	const pickedIndex = () =>
		props.choices.findIndex((choice) => choice.id === value());
	const picked = () => props.choices[pickedIndex()];

	function show(): void {
		if (props.disabled) return;
		setActive(pickedIndex());
		setOpen(true);
	}

	function hide(focus = true): void {
		setOpen(false);
		if (focus) button?.focus();
	}

	function pick(next: string | null): void {
		setInternal(next);
		props.onChange?.(next);
		hide();
	}

	// Registered only while open, so a page of these has no listener each.
	createEffect(() => {
		if (!open()) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!root?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		onCleanup(() => document.removeEventListener("pointerdown", onPointerDown));
	});

	function onKeyDown(event: KeyboardEvent): void {
		const last = props.choices.length - 1;
		switch (event.key) {
			case "Escape":
				if (open()) {
					event.preventDefault();
					hide();
				}
				return;
			case "ArrowDown":
			case "ArrowUp": {
				event.preventDefault();
				if (!open()) {
					show();
					return;
				}
				const step = event.key === "ArrowDown" ? 1 : -1;
				setActive((current) => Math.min(last, Math.max(-1, current + step)));
				return;
			}
			case "Home":
				if (open()) {
					event.preventDefault();
					setActive(-1);
				}
				return;
			case "End":
				if (open()) {
					event.preventDefault();
					setActive(last);
				}
				return;
			case "Enter":
			case " ":
				event.preventDefault();
				if (!open()) show();
				else pick(props.choices[active()]?.id ?? null);
				return;
			default:
		}
	}

	return (
		<span ref={root} class="mdq-select" data-open={open() ? "" : undefined}>
			<button
				ref={button}
				type="button"
				class="mdq-select-button"
				role="combobox"
				aria-haspopup="listbox"
				aria-expanded={open()}
				aria-controls={open() ? listId : undefined}
				aria-activedescendant={open() ? optionId(active()) : undefined}
				aria-label={props["aria-label"]}
				aria-describedby={props["aria-describedby"]}
				disabled={props.disabled}
				onClick={() => (open() ? hide() : show())}
				onKeyDown={onKeyDown}
				// Focus leaving by Tab closes the list. A click on an option keeps
				// focus here, because the option cancels `pointerdown`.
				onBlur={() => setOpen(false)}
			>
				<Show
					when={picked()}
					fallback={
						<span class="mdq-select-placeholder">{props.placeholder}</span>
					}
				>
					{(choice) => <Markdown inline text={choice().text} />}
				</Show>
			</button>

			<Show when={open()}>
				{/* Focus never moves to an option, so options need no tabindex. */}
				<div
					id={listId}
					class="mdq-select-list"
					role="listbox"
					aria-label={props["aria-label"]}
				>
					<Option
						id={optionId(-1)}
						selected={value() === null}
						active={active() === -1}
						onPick={() => pick(null)}
						onHover={() => setActive(-1)}
					>
						<span class="mdq-select-placeholder">{props.placeholder}</span>
					</Option>
					<For each={props.choices}>
						{(choice, index) => (
							<Option
								id={optionId(index())}
								selected={choice.id === value()}
								active={active() === index()}
								onPick={() => pick(choice.id)}
								onHover={() => setActive(index())}
							>
								<Markdown inline text={choice.text} />
							</Option>
						)}
					</For>
				</div>
			</Show>
		</span>
	);
}

interface OptionProps {
	id: string;
	selected: boolean;
	active: boolean;
	onPick: () => void;
	onHover: () => void;
	children: JSX.Element;
}

function Option(props: OptionProps): JSX.Element {
	return (
		// biome-ignore lint/a11y/useFocusableInteractive: focus stays on the combobox, which names the active option with aria-activedescendant
		<div
			id={props.id}
			class="mdq-select-option"
			role="option"
			aria-selected={props.selected}
			data-active={props.active ? "" : undefined}
			data-selected={props.selected ? "" : undefined}
			// `pointerdown`, not `click`: the outside-click listener runs on
			// `pointerdown`, and a click that lands after the list closed never
			// arrives. Cancelling it also keeps focus on the combobox.
			onPointerDown={(event) => {
				event.preventDefault();
				props.onPick();
			}}
			onPointerEnter={props.onHover}
		>
			{props.children}
		</div>
	);
}
