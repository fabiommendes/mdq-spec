import { asParsedMarkdown, type MarkdownIt } from "./markdown";
import { MultipleChoice, MultipleSelection, Essay, Numeric, TrueFalse } from "./types.zod";

export type Parsed<T> = Result<T, ParseError>;


export type ParsingOptions = {
    id?: string
    path?: string
}

export function parseEssayQuestion(md: MarkdownIt | string, options?: ParsingOptions): Parsed<Essay> {
    const markdown = asParsedMarkdown(md);
    throw new Error("Not implemented yet");
}

export function parseNumericQuestion(md: MarkdownIt | string, options?: ParsingOptions): Parsed<Numeric> {
    const markdown = asParsedMarkdown(md);
    throw new Error("Not implemented yet");
}

export function parseMultipleChoiceQuestion(md: MarkdownIt | string, options?: ParsingOptions): Parsed<MultipleChoice> {
    const markdown = asParsedMarkdown(md);
    throw new Error("Not implemented yet");
}

export function parseMultipleSelectionQuestion(md: MarkdownIt | string, options?: ParsingOptions): Parsed<MultipleSelection> {
    const markdown = asParsedMarkdown(md);
    throw new Error("Not implemented yet");
}

export function parseTrueFalseQuestion(md: MarkdownIt | string, options?: ParsingOptions): Parsed<TrueFalse> {
    const markdown = asParsedMarkdown(md);
    throw new Error("Not implemented yet");
}



