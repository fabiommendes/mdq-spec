/** How a question view is driven: interactive, frozen for display, or graded. */
export type QuestionMode = "answer" | "readonly" | "review";

/** The sign of a score, which picks how a badge or a feedback box looks. */
export type ScoreSign = "positive" | "negative" | "zero";

export function scoreSign(score: number): ScoreSign {
	if (score > 0) return "positive";
	if (score < 0) return "negative";
	return "zero";
}
