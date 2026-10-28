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
	/** The badge of a response that waits for an instructor. */
	pending: string;
	/** The note under a question an instructor grades by hand. */
	gradedByHand: string;
	/** The warning for a submission that fails the pre-validation, when its pattern has no feedback. */
	shortAnswerMismatch: string;
	/** The label before the text a student wrote, in a frozen question. */
	yourAnswerLabel: string;
	/** The title of the list of accepted answers. */
	acceptedAnswers: (count: number) => string;
	/** The warning for a numeric box whose text is not a valid response. */
	numericInvalid: string;
	/** The key of a numeric question, in review. `value` has its unit. */
	expectedValue: (value: string) => string;
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
	pending: "Awaiting grading",
	gradedByHand: "An instructor grades this question by hand.",
	shortAnswerMismatch:
		"This does not look like the kind of answer this question expects.",
	yourAnswerLabel: "Your answer:",
	acceptedAnswers: (count) =>
		count === 1 ? "Accepted answer" : "Accepted answers",
	numericInvalid: "Enter a valid number. Use a point as the decimal separator.",
	expectedValue: (value) => `Expected ${value}`,
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
	pending: "Aguardando correção",
	gradedByHand: "Esta questão é corrigida manualmente.",
	shortAnswerMismatch:
		"Isto não parece o tipo de resposta que esta questão espera.",
	yourAnswerLabel: "Sua resposta:",
	acceptedAnswers: (count) =>
		count === 1 ? "Resposta aceita" : "Respostas aceitas",
	numericInvalid: "Digite um número válido. Use ponto como separador decimal.",
	expectedValue: (value) => `Esperado ${value}`,
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
