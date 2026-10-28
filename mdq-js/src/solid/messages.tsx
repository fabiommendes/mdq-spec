/**
 * The text every component shows, in one dictionary.
 *
 * A component reads it from `<MdqProvider>` when there is one, and merges its
 * own `messages` prop over that. The prop exists because an Astro island is
 * its own Solid tree: a provider around the page does not reach it. There is
 * no global setter on purpose. During SSR a module-level locale is shared by
 * every request the server handles at once.
 */

import {
	createContext,
	createMemo,
	type JSX,
	type ParentProps,
	useContext,
} from "solid-js";

/** Every string the components show. */
export interface Messages {
	/** The score badge of a graded question. `value` is already formatted. */
	score: (value: string) => string;
	/** Read by a screen reader next to a choice the answer key marks right. */
	correct: string;
	/** Read by a screen reader next to a picked choice the key marks wrong. */
	incorrect: string;
	/** Read by a screen reader next to the picked choice of a frozen question. */
	yourAnswer: string;
	/** The note of a frozen question the student left empty. */
	noAnswer: string;
	/** The label of the true end of a true/false toggle. */
	trueLabel: string;
	/** The label of the false end of a true/false toggle. */
	falseLabel: string;
	/** Read by a screen reader to explain the three states of a true/false toggle. */
	trueFalseHint: string;
}

export const en: Messages = {
	score: (value) => `Score ${value}`,
	correct: "Correct",
	incorrect: "Incorrect",
	yourAnswer: "Your answer",
	noAnswer: "No answer submitted.",
	trueLabel: "True",
	falseLabel: "False",
	trueFalseHint:
		"For each statement: checked means true, unchecked means false, mixed means no answer.",
};

export const ptBR: Messages = {
	score: (value) => `Nota ${value}`,
	correct: "Correta",
	incorrect: "Incorreta",
	yourAnswer: "Sua resposta",
	noAnswer: "Nenhuma resposta enviada.",
	trueLabel: "Verdadeiro",
	falseLabel: "Falso",
	trueFalseHint:
		"Em cada afirmação: marcado significa verdadeiro, desmarcado significa falso, intermediário significa sem resposta.",
};

// An accessor, so a provider whose `messages` change updates its subtree.
const MessagesContext = createContext<() => Messages>(() => en);

export interface MdqProviderProps extends ParentProps {
	/** Merged over English, so a partial dictionary is enough. */
	messages?: Partial<Messages>;
}

/** Sets the messages of every component inside it. Optional. */
export function MdqProvider(props: MdqProviderProps): JSX.Element {
	const outer = useContext(MessagesContext);
	const messages = createMemo(() => ({ ...outer(), ...props.messages }));
	return (
		<MessagesContext.Provider value={messages}>
			{props.children}
		</MessagesContext.Provider>
	);
}

/**
 * The messages a component uses: the provider's, or English, with the
 * component's own `messages` prop merged over them.
 */
export function useMessages(
	override: () => Partial<Messages> | undefined,
): () => Messages {
	const context = useContext(MessagesContext);
	return createMemo(() => ({ ...context(), ...override() }));
}
