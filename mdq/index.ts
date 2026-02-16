import { parseEssayQuestion, parseMultipleChoiceQuestion, parseMultipleSelectionQuestion, parseNumericQuestion, parseTrueFalseQuestion, type Parsed, type ParsingOptions as QuestionParsingOptions } from "./parser";
import { type MarkdownIt } from "./markdown";
import { asParsedMarkdown } from "./markdown";
import type { Question, QuestionType } from "./types.zod";
export type ParsingOptions = QuestionParsingOptions & { type?: QuestionType };


/**
 * Parse
 */
export function parseQuestion(md: MarkdownIt | string, options?: ParsingOptions): Parsed<Question> {
    const markdown = asParsedMarkdown(md);
    const type = options?.type ?? inferQuestionType(markdown);

    switch (type) {
        case "essay":
            return parseEssayQuestion(markdown, options);
        case "numeric":
            return parseNumericQuestion(markdown, options);
        case "multiple-choice":
            return parseMultipleChoiceQuestion(markdown, options);
        case "multiple-selection":
            return parseMultipleSelectionQuestion(markdown, options);
        case "true-false":
            return parseTrueFalseQuestion(markdown, options);
        default:
            return {
                ok: false,
                error: {
                    message: `Unsupported question type: ${type}`,
                },
            };
    }
}


export function inferQuestionType(md: MarkdownIt | string): QuestionType {
    md = asParsedMarkdown(md);
    // Placeholder implementation for inferring question type from markdown structure
    // In a real implementation, this would analyze the markdown tokens to determine the question type
    return "multiple-choice"; // Defaulting to multiple-choice for now
}