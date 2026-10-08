/**
 * The query language that `docs/exam.md` recommends for `include-all`.
 *
 *     query     : logic ("EXCEPT" slugs)?
 *     logic     : logic "OR" logic_and | logic_and
 *     logic_and : logic_and "AND" logic_not | logic_not
 *     logic_not : "NOT" logic_not | atom
 *     atom      : TAG | "(" logic ")"
 *
 * A tag matches a question when it is equal to one of the question's
 * `tags`. The keywords are uppercase only: `and` is an ordinary tag.
 *
 * A port of `mdq-py/mdq/models/_query.py`. The module name has no `models`
 * part because TypeScript has no model layer (see `docs/sync/roadmap.md`,
 * decision 6).
 */

import { MdqError } from "./errors.js";

/**
 * An `include-all` query does not follow the language. The message is
 * `invalid include-all query '<text>': <detail>`, as in Python.
 */
export class QuerySyntaxError extends MdqError {}

/** The part of a question bank that a query reads. */
export interface TagIndex {
	/** The ids of the questions that carry `tag`. */
	tagged(tag: string): Iterable<string>;
	/**
	 * The ids of every question. `Query.select` only calls it when the
	 * whole query is a complement, like `NOT draft`.
	 */
	ids(): Iterable<string>;
}

/** The syntax tree of the logic part of a query. */
export type QueryExpr =
	| { readonly kind: "tag"; readonly name: string }
	| { readonly kind: "not"; readonly operand: QueryExpr }
	| {
			readonly kind: "and";
			readonly left: QueryExpr;
			readonly right: QueryExpr;
	  }
	| {
			readonly kind: "or";
			readonly left: QueryExpr;
			readonly right: QueryExpr;
	  };

/** A parsed `include-all` query. Build it with `parseQuery`. */
export class Query {
	constructor(
		readonly expr: QueryExpr,
		/** The ids after `EXCEPT`. */
		readonly excluded: ReadonlySet<string> = new Set(),
	) {}

	/** Whether a question with these tags and this id is selected. */
	matches(tags: Iterable<string>, questionId: string): boolean {
		void [tags, questionId];
		throw new Error("not implemented");
	}

	/**
	 * The ids of the questions in `index` that match the query, minus the
	 * `EXCEPT` ids. Evaluates with set operations on `index.tagged`, so
	 * `a AND NOT b` is `tagged(a) - tagged(b)`. Calls `index.ids()` only when
	 * the result of the whole logic part is a complement.
	 */
	select(index: TagIndex): Set<string> {
		void index;
		throw new Error("not implemented");
	}
}

/**
 * Parse an `include-all` query. Tokens are `(`, `)`, `,`, and each run of
 * other characters that are not whitespace (Python `\s`, the `SPACE` class
 * of `parser/text`).
 *
 * @throws {QuerySyntaxError} If `text` does not follow the language. The
 *   details are the Python ones: `unexpected '<token>'`, `missing ')'`,
 *   `expected a tag, found '<token>'`, `expected a question id, found
 *   '<token>'`, with `'the end'` when there is no token left.
 */
export function parseQuery(text: string): Query {
	void text;
	throw new Error("not implemented");
}

/** Whether `text` follows the recommended query language. */
export function isStandardQuery(text: string): boolean {
	void text;
	throw new Error("not implemented");
}
