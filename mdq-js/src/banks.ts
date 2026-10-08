/**
 * Question banks: where the `include` and `include-all` blocks of an exam
 * find their questions, and `resolveExam`, which replaces those blocks.
 *
 * A port of `mdq-py/mdq/_banks.py` without `FileLoader` (the file-system
 * bank stays in Python), plus `Exam.resolve`, `select_random` and their
 * helpers from `mdq-py/mdq/models/_exam.py`. They are here because
 * TypeScript has no model classes, and a bank is only read to resolve an
 * exam.
 *
 * Where the questions live is the host's business: a directory, a database,
 * an HTTP service. The host implements `QuestionBank`, or loads its
 * questions into a `DictLoader`, and calls `resolveExam`. Everything is
 * synchronous, as in Python: a host with a remote bank fetches the
 * questions first.
 */

import type { TagIndex } from "./query.js";
import type { Exam } from "./schema/exam.js";

/**
 * The source of a question in a bank: MDQ Markdown text, or a document that
 * is already parsed.
 */
export type QuestionSource = string | Readonly<Record<string, unknown>>;

/**
 * The questions an exam can include, by id and by tag. `tagged` and `ids`
 * are what an `include-all` query reads (see `Query.select`).
 */
export interface QuestionBank extends TagIndex {
	/**
	 * The source of the question with this id.
	 *
	 * @throws {IncludeNotFoundError} If the bank has no such question.
	 */
	load(questionId: string): QuestionSource;
}

/**
 * A bank over an in-memory mapping of id to source. Useful for tests, and
 * for a host that has its questions in memory.
 *
 * `tagged` and `ids` read an index that is built once, on the first call of
 * either. The index skips a source that is an exam (by `isExam` for text, by
 * `type: "exam"` for a document) and a text that does not parse. A `tags`
 * string is split at commas, as in the frontmatter.
 */
export class DictLoader implements QuestionBank {
	constructor(readonly questions: Readonly<Record<string, QuestionSource>>) {}

	/**
	 * @throws {IncludeNotFoundError} With the detail `not in the mapping`.
	 */
	load(questionId: string): QuestionSource {
		void questionId;
		throw new Error("not implemented");
	}

	tagged(tag: string): ReadonlySet<string> {
		void tag;
		throw new Error("not implemented");
	}

	ids(): ReadonlySet<string> {
		throw new Error("not implemented");
	}
}

/**
 * Chooses the questions of an `include-all` block. It receives the ids that
 * match the query and are not in the exam yet, sorted, and the block's
 * `max`. It returns the chosen ids in the order the exam shows them: at most
 * `max` distinct ids, all from `candidates`.
 */
export type Select = (
	candidates: readonly string[],
	max: number | undefined,
) => readonly string[];

/**
 * The default `Select`: every candidate when `max` is `undefined` or not
 * smaller than the number of candidates, a random sample of `max` otherwise.
 * The result keeps the order of `candidates`.
 */
export function selectRandom(
	candidates: readonly string[],
	max: number | undefined,
): string[] {
	void [candidates, max];
	throw new Error("not implemented");
}

/** Options of `resolveExam`. */
export interface ResolveOptions {
	/** Chooses the questions of each `include-all` block. Default: `selectRandom`. */
	readonly select?: Select;
}

/**
 * A copy of `exam` in which every `include` and `include-all` entry is
 * replaced by the questions it selects from `bank` (`docs/exam.md`,
 * "Include" and "Include all"). `exam` does not change.
 *
 * * An `include` adds the question that `bank.load` returns. A text source
 *   is parsed with `parseQuestionDocument`.
 * * An `include-all` adds the ids that its query selects, sorted, minus the
 *   ids the exam already has: the target of any `include` (also a later
 *   one), a declared inline id, and the ids an earlier `include-all` added.
 *   `select` chooses among them. A query that `parseQuery` rejects adds
 *   nothing.
 * * An included question keeps its own `id`, or takes the id it was loaded
 *   by. It takes `locale` and `author` from the exam when it has none.
 *
 * Unique question ids are a model rule (F5) and are not checked here.
 *
 * @throws {IncludeNotFoundError} If `bank` has no question for an id.
 * @throws {ParseError} If a text source is not a valid MDQ question.
 * @throws {RangeError} If `select` returns an id that is not a candidate
 *   (`select() returned ids that are not candidates: ['...']`), the same id
 *   twice (`select() returned the same id twice`), or more than `max` ids
 *   (`select() returned 3 ids, but max is 2`).
 * @throws {MdqError} If the resolved exam does not satisfy
 *   `schema/exam.yaml` (`the resolved exam does not satisfy its schema:
 *   ...`).
 */
export function resolveExam(
	exam: Exam,
	bank: QuestionBank,
	options?: ResolveOptions,
): Exam {
	void [exam, bank, options];
	throw new Error("not implemented");
}
