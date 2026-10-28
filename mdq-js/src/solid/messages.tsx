/**
 * The text every component shows, in one dictionary.
 *
 * A component reads it from `<MdqProvider>` when there is one, and merges its
 * own `messages` prop over that. The prop exists because an Astro island is
 * its own Solid tree: a provider around the page does not reach it. There is
 * no global setter on purpose. During SSR a module-level locale is shared by
 * every request the server handles at once.
 *
 * `locale` picks a whole dictionary by name. It exists for the same islands:
 * Astro serializes the props of an island, and a dictionary holds functions,
 * which do not survive that.
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
	/** The title of the model answer of an essay, in review. */
	modelAnswer: string;
	/** The placeholder of the box of an essay whose content is code. */
	writeCodePlaceholder: string;
	/** The placeholder of the box of an essay whose content is text. */
	writeAnswerPlaceholder: string;
	/** The note under the box of an essay whose content is text. */
	markdownSupported: string;
	/** The name of a blank of a fill-in. `n` counts from 1 in the order of the stem. */
	blankLabel: (n: number, total: number) => string;
	/** What a choice blank shows while nothing is picked. */
	selectPlaceholder: string;
	/** The title of the answer key of a fill-in, in review. */
	expected: string;
	/** Under a blank of the answer key that has nothing to show. */
	noBlankKey: string;
	/** Shown in place of a question whose type the components do not render. */
	notSupported: (type: string) => string;
	/** The title of the lines an ordering answer leaves out. */
	orderingUnused: string;
	/** The note of an ordering answer that holds no line yet. */
	orderingEmpty: string;
	/** The title of the accepted orderings, in review. */
	orderingCorrect: (count: number) => string;
	/** Stands for a blank line, which has no text. */
	orderingBlankLine: string;
	/** Read by a screen reader before a line that is indented. */
	orderingLevel: (level: number) => string;
	/** The name of the button that moves a line up. `text` is the line. */
	orderingMoveUp: (text: string) => string;
	/** The name of the button that moves a line down. */
	orderingMoveDown: (text: string) => string;
	/** The name of the button that indents a line. */
	orderingIndent: (text: string) => string;
	/** The name of the button that outdents a line. */
	orderingOutdent: (text: string) => string;
	/** The name of the button that leaves a line out of the answer. */
	orderingRemove: (text: string) => string;
	/** The name of the button that puts a left out line in the answer. */
	orderingAdd: (text: string) => string;
	/** Announced after a line moves. `position` counts from 1. */
	orderingMoved: (text: string, position: number, total: number) => string;
	/** Announced after a line changes its indentation level. */
	orderingLevelSet: (text: string, level: number) => string;
	/** Announced after a line leaves the answer. */
	orderingRemoved: (text: string) => string;
	/** Announced after a line joins the answer, at the end. */
	orderingAdded: (text: string, position: number, total: number) => string;
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
	modelAnswer: "Model answer",
	writeCodePlaceholder: "Write your code here…",
	writeAnswerPlaceholder: "Write your answer here…",
	markdownSupported: "Markdown is supported.",
	blankLabel: (n, total) => `Blank ${n} of ${total}`,
	selectPlaceholder: "Select…",
	expected: "Expected",
	noBlankKey: "Nothing to show for this blank",
	notSupported: (type) => `Questions of type "${type}" cannot be shown yet.`,
	orderingUnused: "Not used",
	orderingEmpty: "No lines in your answer yet.",
	orderingCorrect: (count) =>
		count === 1 ? "Correct order" : "Correct orders",
	orderingBlankLine: "(blank line)",
	orderingLevel: (level) => `Indentation level ${level}.`,
	orderingMoveUp: (text) => `Move up: ${text}`,
	orderingMoveDown: (text) => `Move down: ${text}`,
	orderingIndent: (text) => `Indent: ${text}`,
	orderingOutdent: (text) => `Outdent: ${text}`,
	orderingRemove: (text) => `Leave out: ${text}`,
	orderingAdd: (text) => `Use: ${text}`,
	orderingMoved: (text, position, total) =>
		`${text} moved to position ${position} of ${total}.`,
	orderingLevelSet: (text, level) =>
		`${text} is at indentation level ${level}.`,
	orderingRemoved: (text) => `${text} left out of the answer.`,
	orderingAdded: (text, position, total) =>
		`${text} added at position ${position} of ${total}.`,
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
	modelAnswer: "Resposta modelo",
	writeCodePlaceholder: "Escreva seu código aqui…",
	writeAnswerPlaceholder: "Escreva sua resposta aqui…",
	markdownSupported: "Há suporte a Markdown.",
	blankLabel: (n, total) => `Lacuna ${n} de ${total}`,
	selectPlaceholder: "Selecione…",
	expected: "Esperado",
	noBlankKey: "Não exibido para esta lacuna",
	notSupported: (type) =>
		`Questões do tipo "${type}" ainda não podem ser exibidas.`,
	orderingUnused: "Não usadas",
	orderingEmpty: "Nenhuma linha na sua resposta ainda.",
	orderingCorrect: (count) =>
		count === 1 ? "Ordem correta" : "Ordens corretas",
	orderingBlankLine: "(linha em branco)",
	orderingLevel: (level) => `Nível de indentação ${level}.`,
	orderingMoveUp: (text) => `Mover para cima: ${text}`,
	orderingMoveDown: (text) => `Mover para baixo: ${text}`,
	orderingIndent: (text) => `Indentar: ${text}`,
	orderingOutdent: (text) => `Recuar: ${text}`,
	orderingRemove: (text) => `Deixar de fora: ${text}`,
	orderingAdd: (text) => `Usar: ${text}`,
	orderingMoved: (text, position, total) =>
		`${text} movida para a posição ${position} de ${total}.`,
	orderingLevelSet: (text, level) =>
		`${text} está no nível de indentação ${level}.`,
	orderingRemoved: (text) => `${text} deixada de fora da resposta.`,
	orderingAdded: (text, position, total) =>
		`${text} adicionada na posição ${position} de ${total}.`,
};

/** The dictionaries this package ships. */
export type Locale = "en" | "pt-BR";

export const locales: Readonly<Record<Locale, Messages>> = {
	en,
	"pt-BR": ptBR,
};

/** The props a component takes to choose its text. */
export interface LocalizedProps {
	/** Merged over the base dictionary, so a partial one is enough. */
	messages?: Partial<Messages>;
	/** The base dictionary, in place of the provider's or English. */
	locale?: Locale;
}

// An accessor, so a provider whose `messages` change updates its subtree.
const MessagesContext = createContext<() => Messages>(() => en);

export interface MdqProviderProps extends ParentProps, LocalizedProps {}

/** Sets the messages of every component inside it. Optional. */
export function MdqProvider(props: MdqProviderProps): JSX.Element {
	const outer = useContext(MessagesContext);
	const messages = useMessagesOver(outer, props);
	return (
		<MessagesContext.Provider value={messages}>
			{props.children}
		</MessagesContext.Provider>
	);
}

/**
 * The messages a component uses: the dictionary of its `locale` prop, or else
 * the provider's, or else English, with its `messages` prop merged over it.
 */
export function useMessages(props: LocalizedProps): () => Messages {
	return useMessagesOver(useContext(MessagesContext), props);
}

function useMessagesOver(
	base: () => Messages,
	props: LocalizedProps,
): () => Messages {
	return createMemo(() => ({
		...(props.locale === undefined ? base() : locales[props.locale]),
		...props.messages,
	}));
}
