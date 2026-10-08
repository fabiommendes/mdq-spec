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

import { type Diagnostic, diagnostic } from "./diagnostics.js";
import { IncludeNotFoundError, MdqError } from "./errors.js";
import { INHERITED_FIELDS, isExam } from "./parser/exam.js";
import { parseQuestionDocument } from "./parser/question.js";
import { parseQuery, QuerySyntaxError, type TagIndex } from "./query.js";
import { Exam } from "./schema/exam.js";

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
	private index:
		| { byTag: Map<string, Set<string>>; ids: Set<string> }
		| undefined;

	constructor(readonly questions: Readonly<Record<string, QuestionSource>>) {}

	/**
	 * @throws {IncludeNotFoundError} With the detail `not in the mapping`.
	 */
	load(questionId: string): QuestionSource {
		if (!Object.hasOwn(this.questions, questionId)) {
			throw new IncludeNotFoundError(questionId, "not in the mapping");
		}
		return this.questions[questionId] as QuestionSource;
	}

	tagged(tag: string): ReadonlySet<string> {
		return this.buildIndex().byTag.get(tag) ?? new Set();
	}

	ids(): ReadonlySet<string> {
		return this.buildIndex().ids;
	}

	private buildIndex() {
		if (this.index !== undefined) {
			return this.index;
		}
		const byTag = new Map<string, Set<string>>();
		const ids = new Set<string>();
		for (const [questionId, source] of Object.entries(this.questions)) {
			const tags = sourceTags(source);
			if (tags === undefined) {
				continue;
			}
			ids.add(questionId);
			for (const tag of tags) {
				let tagged = byTag.get(tag);
				if (tagged === undefined) {
					tagged = new Set();
					byTag.set(tag, tagged);
				}
				tagged.add(questionId);
			}
		}
		this.index = { byTag, ids };
		return this.index;
	}
}

/** The tags of a question's source, or `undefined` if it is not a question. */
function sourceTags(source: QuestionSource): string[] | undefined {
	let document: Readonly<Record<string, unknown>>;
	if (typeof source === "string") {
		if (isExam(source)) {
			return undefined;
		}
		try {
			document = parseQuestionDocument(source);
		} catch (error) {
			if (error instanceof MdqError) {
				return undefined;
			}
			throw error;
		}
	} else {
		document = source;
	}
	if (document.type === "exam") {
		return undefined;
	}
	const tags = document.tags ?? [];
	if (typeof tags === "string") {
		return tags
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag !== "");
	}
	return Array.from(tags as Iterable<unknown>, String);
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
	if (max === undefined || max >= candidates.length) {
		return [...candidates];
	}
	// Partial Fisher-Yates over the indices, then restore the original order.
	const indices = candidates.map((_, i) => i);
	for (let i = 0; i < max; i++) {
		const j = i + Math.floor(Math.random() * (indices.length - i));
		[indices[i], indices[j]] = [indices[j] as number, indices[i] as number];
	}
	const chosen = new Set(indices.slice(0, max));
	return candidates.filter((_, i) => chosen.has(i));
}

/** Options of `resolveExam`. */
export interface ResolveOptions {
	/** Chooses the questions of each `include-all` block. Default: `selectRandom`. */
	readonly select?: Select;
	/**
	 * When given, `resolveExam` appends an `empty-include-all` warning for
	 * every `include-all` block that adds nothing.
	 */
	readonly warnings?: Diagnostic[];
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
 * When `options.warnings` is given, an `empty-include-all` warning
 * (`the query '<q>' adds no question to the exam`, path `["questions",
 * index]`, `index` being the position of the block in `exam.questions`
 * before the resolution) is appended for every `include-all` block that adds
 * nothing.
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
	const select = options?.select ?? selectRandom;
	const taken = new Set<string>();
	for (const entry of exam.questions) {
		if ("include" in entry) {
			taken.add(entry.include);
		} else if (!("include-all" in entry) && typeof entry.id === "string") {
			taken.add(entry.id);
		}
	}

	const questions: Record<string, unknown>[] = [];
	exam.questions.forEach((entry, index) => {
		if ("include" in entry) {
			questions.push(loadIncluded(exam, bank, entry.include));
		} else if ("include-all" in entry) {
			const query = entry["include-all"];
			const candidates = [...queryIds(bank, query)]
				.filter((id) => !taken.has(id))
				.sort(compareCodePoints);
			const chosen = [...select(candidates, entry.max)];
			checkSelection(chosen, candidates, entry.max);
			for (const id of chosen) {
				taken.add(id);
			}
			if (chosen.length === 0) {
				options?.warnings?.push(
					diagnostic(
						"warning",
						"empty-include-all",
						`the query '${query}' adds no question to the exam`,
						["questions", index],
					),
				);
			}
			for (const id of chosen) {
				questions.push(loadIncluded(exam, bank, id));
			}
		} else {
			questions.push({ ...entry });
		}
	});

	const result = Exam.safeParse({ ...exam, questions });
	if (!result.success) {
		throw new MdqError(
			`the resolved exam does not satisfy its schema: ${result.error.message}`,
		);
	}
	return result.data;
}

/** Python's string order for `sorted()`: by code point, not UTF-16 unit. */
function compareCodePoints(a: string, b: string): number {
	const left = Array.from(a, (c) => c.codePointAt(0) as number);
	const right = Array.from(b, (c) => c.codePointAt(0) as number);
	const length = Math.min(left.length, right.length);
	for (let i = 0; i < length; i++) {
		const diff = (left[i] as number) - (right[i] as number);
		if (diff !== 0) {
			return diff;
		}
	}
	return left.length - right.length;
}

/** The ids `query` selects from `bank`; none if it cannot be read. */
function queryIds(bank: QuestionBank, query: string): Set<string> {
	try {
		return parseQuery(query).select(bank);
	} catch (error) {
		if (error instanceof QuerySyntaxError) {
			return new Set();
		}
		throw error;
	}
}

function checkSelection(
	chosen: readonly string[],
	candidates: readonly string[],
	max: number | undefined,
): void {
	const known = new Set(candidates);
	const unknown = [...new Set(chosen.filter((id) => !known.has(id)))].sort(
		compareCodePoints,
	);
	if (unknown.length > 0) {
		const listed = unknown.map((id) => `'${id}'`).join(", ");
		throw new RangeError(
			`select() returned ids that are not candidates: [${listed}]`,
		);
	}
	if (new Set(chosen).size !== chosen.length) {
		throw new RangeError("select() returned the same id twice");
	}
	if (max !== undefined && chosen.length > max) {
		throw new RangeError(
			`select() returned ${chosen.length} ids, but max is ${max}`,
		);
	}
}

/** Load an included question as a plain document, with its inherited fields. */
function loadIncluded(
	exam: Exam,
	bank: QuestionBank,
	questionId: string,
): Record<string, unknown> {
	const source = bank.load(questionId);
	const question: Record<string, unknown> =
		typeof source === "string"
			? { ...parseQuestionDocument(source) }
			: { ...source };
	// An included question already has an identity, so it keeps its own id,
	// falling back to the id it was found by.
	if (question.id === undefined) {
		question.id = questionId;
	}
	for (const field of INHERITED_FIELDS) {
		const value = exam[field];
		if (!(field in question) && value !== undefined) {
			question[field] = value;
		}
	}
	return question;
}
