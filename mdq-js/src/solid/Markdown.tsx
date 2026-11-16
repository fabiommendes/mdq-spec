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

export interface CodeBlockProps {
	code: string;
	/** The language the renderer highlights `code` in; empty for none. */
	lang?: string;
	/** Extra attributes of the plain `<pre>`, such as `data-example`. */
	attributes?: Record<string, string>;
}

/**
 * A block of code (`.mdq-code`) drawn by the nearest `CodeBlockProvider`,
 * like the fenced blocks of `Markdown`, or as a plain `<pre><code>`.
 */
export function CodeBlock(props: CodeBlockProps): JSX.Element {
	const renderCodeBlock = useCodeBlockRenderer();
	const html = createMemo(() =>
		renderCodeBlock?.(props.code, props.lang ?? ""),
	);
	return (
		<Show
			when={html()}
			fallback={
				<pre class="mdq-code" {...props.attributes}>
					<code>{props.code}</code>
				</pre>
			}
		>
			{(rendered) => (
				<div class="mdq-code" {...props.attributes} innerHTML={rendered()} />
			)}
		</Show>
	);
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
