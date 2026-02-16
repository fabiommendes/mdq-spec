import * as z from "zod";

// =============================================================================
// Base types for questions
// =============================================================================

/** 
 * Rich media that can be included in questions  
 */
export const MediaItem = z.object({
    id: z.string(),
    type: z.enum(['image', 'video', 'audio', 'code', 'document', 'archive']),
    url: z.string(),
    caption: z.string().optional(),
});
export type MediaItem = z.infer<typeof MediaItem>;
export type MediaType = MediaItem["type"];

/**
 * Base question type with common fields
 */
export const BaseQuestion = z.object({
    id: z.string(),
    title: z.string(),
    stem: z.string(),
    type: z.string(),
    preamble: z.string()
        .optional(),
    epilogue: z.string()
        .optional(),
    comments: z.string()
        .optional(),
    media: z.array(MediaItem).optional(),
    format: z.enum(['md', 'text'])
        .default("md")
        .optional(),
    shuffle: z.boolean()
        .optional(),
});
export type BaseQuestion = z.infer<typeof BaseQuestion>;
export type TextFormat = BaseQuestion["format"];


// =============================================================================
// Question types
// =============================================================================
export const ProgrammingLanguage = z.enum(['bash', 'c', 'clojure', 'cpp', 'css', 'dart', 'elixir', 'erlang', 'go', 'haskell', 'html', 'java', 'javascript', 'kotlin', 'lark', 'lua', 'php', 'python', 'r', 'ruby', 'rust', 'scala', 'sql', 'swift', 'typescript']);
export type ProgrammingLanguage = z.infer<typeof ProgrammingLanguage>;


/**
 * Essay question type.
 * 
 * Essay questions require a free-form text response. It can be a programming 
 * question that receives code input, or a traditional essay question that 
 * receives text input.
 */
export const Essay = BaseQuestion.extend({
    type: z.literal('essay'),
    input: z.union([
        z.enum(['richtext', 'text', 'code']),
        ProgrammingLanguage,
    ])
        .default("richtext")
        .optional()
});
export type Essay = z.infer<typeof Essay>;


/**
 * Numeric question type.
 * 
 * Numeric questions require a numeric response, which can be an integer or a 
 * floating-point number. It is possible to specify a tolerance for the answer, 
 * which allows for a range of acceptable answers.
 */
export const Numeric = BaseQuestion.extend({
    type: z.literal('numeric'),
    answer: z.number().optional(),
    tolerance: z.number().optional(),
});
export type Numeric = z.infer<typeof Numeric>;


/**
 * Multiple choice question type.
 * 
 * Multiple choice questions present a list of choices, where usually only one 
 * choice is correct.
 */
export const MultipleChoice = BaseQuestion.extend({
    type: z.literal('multiple-choice'),
    choices: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            feedback: z.string().optional(),
            value: z.number().optional(),
        })),
});
export type MultipleChoice = z.infer<typeof MultipleChoice>;

/**
 * Multiple selection question type.
 * 
 * Multiple selection questions present a list of choices, where more than one 
 * choice can be correct.
 */
export const MultipleSelection = BaseQuestion.extend({
    type: z.literal('multiple-selection'),
    choices: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            feedback: z.string().optional(),
            isCorrect: z.boolean().optional(),
        })),
});
export type MultipleSelection = z.infer<typeof MultipleSelection>;


/**
 * True/False question type.
 * 
 * True/False questions present a statement, and the respondent must determine
 * whether the statement is true or false.
 */
export const TrueFalse = BaseQuestion.extend({
    type: z.literal('true-false'),
    choices: z.array(
        z.object({
            id: z.string(),
            text: z.string(),
            feedback: z.string().optional(),
            answer: z.boolean().optional(),
        })),
});
export type TrueFalse = z.infer<typeof TrueFalse>;


// =============================================================================
// Other utility types
// =============================================================================
export type Question = Essay | MultipleChoice | MultipleSelection | TrueFalse | Numeric;
export type QuestionType = Question["type"];