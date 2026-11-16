import {
	createContext,
	createMemo,
	type JSX,
	type ParentProps,
	Show,
	useContext,
} from "solid-js";
import {
	type CodeBlockRenderer,
	renderMarkdown,
	renderMarkdownInline,
} from "./render-markdown.js";

const CodeBlockContext = createContext<CodeBlockRenderer | undefined>();

export interface CodeBlockProviderProps extends ParentProps {
	/** Renders each fenced code block of the Markdown inside the provider. */
	render: CodeBlockRenderer;
}

/**
 * Sets how every `Markdown` inside it renders fenced code blocks, such as with
 * HTML that a syntax highlighter made on the server. Optional.
 *
 * An Astro island is its own Solid tree, so the provider goes inside it.
 */
export function CodeBlockProvider(props: CodeBlockProviderProps): JSX.Element {
	return (
		<CodeBlockContext.Provider value={props.render}>
			{props.children}
		</CodeBlockContext.Provider>
	);
}

/** The code block renderer of the nearest `CodeBlockProvider`, if any. */
export function useCodeBlockRenderer(): CodeBlockRenderer | undefined {
	return useContext(CodeBlockContext);
}

export interface MarkdownProps {
	/** Nothing is rendered when it is empty or absent. */
	text: string | undefined;
	/** A `<span>` with no wrapping `<p>`, for choice text. */
	inline?: boolean;
	class?: string;
}

/** Markdown rendered as HTML, block (`.mdq-markdown`) or inline. */
export function Markdown(props: MarkdownProps): JSX.Element {
	const renderCodeBlock = useCodeBlockRenderer();
	const html = createMemo(() => {
		const text = props.text;
		if (!text) return undefined;
		return props.inline
			? renderMarkdownInline(text)
			: renderMarkdown(text, { renderCodeBlock });
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
