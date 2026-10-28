import { createMemo, type JSX, Show } from "solid-js";
import { renderMarkdown, renderMarkdownInline } from "./render-markdown.js";

export interface MarkdownProps {
	/** Nothing is rendered when it is empty or absent. */
	text: string | undefined;
	/** A `<span>` with no wrapping `<p>`, for choice text. */
	inline?: boolean;
	class?: string;
}

/** Markdown rendered as HTML, block (`.mdq-markdown`) or inline. */
export function Markdown(props: MarkdownProps): JSX.Element {
	const html = createMemo(() => {
		const text = props.text;
		if (!text) return undefined;
		return props.inline ? renderMarkdownInline(text) : renderMarkdown(text);
	});
	const classes = () => ["mdq-markdown", props.class].filter(Boolean).join(" ");

	return (
		<Show when={html()}>
			{(rendered) =>
				props.inline ? (
					<span class={classes()} data-inline="" innerHTML={rendered()} />
				) : (
					<div class={classes()} innerHTML={rendered()} />
				)
			}
		</Show>
	);
}
