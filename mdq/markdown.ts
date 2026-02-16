export type MarkdownIt = any; // Placeholder for the actual MarkdownIt type

export function parseMarkdown(md: string): MarkdownIt {
    // Placeholder implementation for parsing markdown string into MarkdownIt instance
    // In a real implementation, this would use the actual MarkdownIt library to parse the markdown
    return {} as MarkdownIt;
}

export function asParsedMarkdown(md: MarkdownIt | string): MarkdownIt {
    if (typeof md === "string") {
        return parseMarkdown(md);
    }
    return md;
}

