// r2: adr-0016
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
	/** Read by a screen reader next to an answer that scores above 0 and below 1. */
	partial: string;
	/** Read by a screen reader next to a picked choice the key marks wrong. */
	incorrect: string;
	/** Read by a screen reader next to the picked choice of a frozen question. */
	yourAnswer: string;
	/** The note of a frozen question the student left empty. */
	noAnswer: string;
	/** The label of the true end of a true or false toggle. */
	trueLabel: string;
	/** The label of the false end of a true or false toggle. */
	falseLabel: string;
	/** Read by a screen reader to explain the three states of a true or false toggle. */
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
	/** Shown in an ordering question before the student gives a response. */
	orderingNotAnswered: string;
	/** The button that takes the order on screen as the response. */
	orderingKeep: string;
	/** Announced when the student keeps the order on screen. */
	orderingKept: string;
	/** The title of the accepted orderings, in review. */
	orderingCorrect: (count: number) => string;
	/** Stands for a blank line, which has no text. */
	orderingBlankLine: string;
	/** Read by a screen reader before a line that is indented. */
	orderingLevel: (level: number) => string;
	/** The name of the handle that drags a line. `text` is the line. */
	orderingGrip: (text: string) => string;
	/** Describes how to use the handle of a line. */
	orderingGripHint: string;
	/** The note of the left out lines while a line is dragged. */
	orderingDropUnused: string;
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
	/** The label of the file chooser of an upload question. */
	uploadChoose: string;
	/** The line that states what an upload accepts. `size` is as written or formatted; each of `size` and `extensions` is null when unlimited. */
	uploadLimits: (
		count: number,
		size: string | null,
		extensions: readonly string[] | null,
	) => string;
	/** The reason a file is refused for being larger than the limit. `max` is formatted. */
	uploadTooLarge: (name: string, max: string) => string;
	/** The reason a file is refused for its extension. */
	uploadWrongExtension: (name: string, extensions: readonly string[]) => string;
	/** The reason a file is refused because the response would hold more files than allowed. */
	uploadTooMany: (max: number) => string;
	/** The status of a file that waits for the ones before it to be sent. */
	uploadQueued: (name: string) => string;
	/** Announced after a file is stored. */
	uploadDone: (name: string) => string;
	/** The status of a file that is being sent. */
	uploadSending: (name: string) => string;
	/** The status of a file whose host is busy, before it tries again. */
	uploadWaiting: (name: string, seconds: number) => string;
	/** The status of a file that could not be sent or removed. */
	uploadFailed: (name: string) => string;
	/** The name of the button that removes a file. */
	uploadRemove: (name: string) => string;
	/** Announced after a file is removed. */
	uploadRemoved: (name: string) => string;
	/** The note of an upload that holds no file yet. */
	uploadNoFiles: string;
	/** A size in bytes, as people read it: B, KB, MB or GB, powers of 1024. */
	fileSize: (bytes: number) => string;
}

const SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

/// Formats bytes in powers of 1024, with one decimal above B, in the given decimal separator.
function formatSize(bytes: number, separator: string): string {
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
		value /= 1024;
		unit += 1;
	}
	const digits = unit === 0 ? String(value) : value.toFixed(1);
	return `${digits.replace(".", separator)} ${SIZE_UNITS[unit]}`;
}

export const en: Messages = {
	score: (value) => `Score ${value}`,
	correct: "Correct",
	partial: "Partially correct",
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
	orderingNotAnswered:
		"You have not answered yet. Reorder the lines, or keep this order.",
	orderingKeep: "Keep this order",
	orderingKept: "Order kept as your answer.",
	orderingCorrect: (count) =>
		count === 1 ? "Correct order" : "Correct orders",
	orderingBlankLine: "(blank line)",
	orderingLevel: (level) => `Indentation level ${level}.`,
	orderingGrip: (text) => `Move: ${text}`,
	orderingGripHint: "Drag, or use the arrow keys, to move the line.",
	orderingDropUnused: "Drop a line here to leave it out.",
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
	uploadChoose: "Choose files",
	uploadLimits: (count, size, extensions) =>
		`${[
			count === 1 ? "Up to 1 file" : `Up to ${count} files`,
			...(size === null ? [] : [`${size} each`]),
			...(extensions === null ? [] : [`accepted: ${extensions.join(", ")}`]),
		].join("; ")}.`,
	uploadTooLarge: (name, max) => `${name} is larger than ${max}.`,
	uploadWrongExtension: (name, extensions) =>
		`${name} is not an accepted type (${extensions.join(", ")}).`,
	uploadTooMany: (max) =>
		max === 1
			? "Only 1 file is allowed. Remove it first, or send a file with the same name to replace it."
			: `Only ${max} files are allowed. Remove one first, or send a file with the same name to replace it.`,
	uploadQueued: (name) => `Queued: ${name}`,
	uploadDone: (name) => `${name} uploaded.`,
	uploadSending: (name) => `Sending ${name}…`,
	uploadWaiting: (name, seconds) =>
		`The server is busy. Sending ${name} again in ${seconds} s…`,
	uploadFailed: (name) => `Could not send ${name}. Try again.`,
	uploadRemove: (name) => `Remove ${name}`,
	uploadRemoved: (name) => `${name} removed.`,
	uploadNoFiles: "No files sent yet.",
	fileSize: (bytes) => formatSize(bytes, "."),
};

export const ptBR: Messages = {
	score: (value) => `Nota ${value}`,
	correct: "Correta",
	partial: "Parcialmente correta",
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
	orderingNotAnswered:
		"Você ainda não respondeu. Reordene as linhas ou mantenha esta ordem.",
	orderingKeep: "Manter esta ordem",
	orderingKept: "Ordem mantida como sua resposta.",
	orderingCorrect: (count) =>
		count === 1 ? "Ordem correta" : "Ordens corretas",
	orderingBlankLine: "(linha em branco)",
	orderingLevel: (level) => `Nível de indentação ${level}.`,
	orderingGrip: (text) => `Mover: ${text}`,
	orderingGripHint: "Arraste, ou use as setas do teclado, para mover a linha.",
	orderingDropUnused: "Solte uma linha aqui para deixá-la de fora.",
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
	uploadChoose: "Escolher arquivos",
	uploadLimits: (count, size, extensions) =>
		`${[
			count === 1 ? "No máximo 1 arquivo" : `No máximo ${count} arquivos`,
			...(size === null ? [] : [`${size} cada`]),
			...(extensions === null ? [] : [`aceitos: ${extensions.join(", ")}`]),
		].join("; ")}.`,
	uploadTooLarge: (name, max) => `${name} é maior que ${max}.`,
	uploadWrongExtension: (name, extensions) =>
		`${name} não é de um tipo aceito (${extensions.join(", ")}).`,
	uploadTooMany: (max) =>
		max === 1
			? "Só é permitido 1 arquivo. Remova-o antes, ou envie um arquivo com o mesmo nome para substituí-lo."
			: `Só são permitidos ${max} arquivos. Remova um antes, ou envie um arquivo com o mesmo nome para substituí-lo.`,
	uploadQueued: (name) => `Na fila: ${name}`,
	uploadDone: (name) => `${name} enviado.`,
	uploadSending: (name) => `Enviando ${name}…`,
	uploadWaiting: (name, seconds) =>
		`O servidor está ocupado. Enviando ${name} de novo em ${seconds} s…`,
	uploadFailed: (name) => `Não foi possível enviar ${name}. Tente de novo.`,
	uploadRemove: (name) => `Remover ${name}`,
	uploadRemoved: (name) => `${name} removido.`,
	uploadNoFiles: "Nenhum arquivo enviado ainda.",
	fileSize: (bytes) => formatSize(bytes, ","),
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
