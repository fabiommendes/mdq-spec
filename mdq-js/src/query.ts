/**
 * The query language that `docs/exam.md` recommends for `includeAll`.
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
import { UNICODE_SPACE } from "./parser/text.js";

/**
 * An `includeAll` query does not follow the language. The message is
 * `invalid includeAll query '<text>': <detail>`, as in Python.
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

/** A parsed `includeAll` query. Build it with `parseQuery`. */
export class Query {
	constructor(
		readonly expr: QueryExpr,
		/** The ids after `EXCEPT`. */
		readonly excluded: ReadonlySet<string> = new Set(),
	) {}

	/** Whether a question with these tags and this id is selected. */
	matches(tags: Iterable<string>, questionId: string): boolean {
		return (
			!this.excluded.has(questionId) && exprMatches(this.expr, new Set(tags))
		);
	}

	/**
	 * The ids of the questions in `index` that match the query, minus the
	 * `EXCEPT` ids. Evaluates with set operations on `index.tagged`, so
	 * `a AND NOT b` is `tagged(a) - tagged(b)`. Calls `index.ids()` only when
	 * the result of the whole logic part is a complement.
	 */
	select(index: TagIndex): Set<string> {
		const result = exprSelect(this.expr, index);
		const selected = result.negated
			? difference(new Set(index.ids()), result.ids)
			: new Set(result.ids);
		return difference(selected, this.excluded);
	}
}

/**
 * Parse an `includeAll` query. Tokens are `(`, `)`, `,`, and each run of
 * other characters that are not whitespace (Python `\s`, the `SPACE` class
 * of `parser/text`).
 *
 * @throws {QuerySyntaxError} If `text` does not follow the language. The
 *   details are the Python ones: `unexpected '<token>'`, `missing ')'`,
 *   `expected a tag, found '<token>'`, `expected a question id, found
 *   '<token>'`, with `'the end'` when there is no token left.
 */
export function parseQuery(text: string): Query {
	return new QueryParser(text).parse();
}

/** Whether `text` follows the recommended query language. */
export function isStandardQuery(text: string): boolean {
	try {
		parseQuery(text);
	} catch (error) {
		if (error instanceof QuerySyntaxError) {
			return false;
		}
		throw error;
	}
	return true;
}

const KEYWORDS: ReadonlySet<string> = new Set(["AND", "OR", "NOT", "EXCEPT"]);
const PUNCTUATION: ReadonlySet<string> = new Set(["(", ")", ","]);

/**
 * A token is a parenthesis, a comma, or a run of anything that is not a
 * `UNICODE_SPACE` (`docs/exam.md`, `TAG`). Between tokens, the query ignores
 * only space, tab, form feed, carriage return and line feed. Any other
 * character is `invalid` and fails the parse.
 */
const TOKEN_RE = new RegExp(
	`(?<ws>[ \\t\\f\\r\\n]+)|(?<token>[(),]|[^(),${UNICODE_SPACE}]+)|(?<invalid>.)`,
	"gsu",
);

function exprMatches(expr: QueryExpr, tags: ReadonlySet<string>): boolean {
	switch (expr.kind) {
		case "tag":
			return tags.has(expr.name);
		case "not":
			return !exprMatches(expr.operand, tags);
		case "and":
			return exprMatches(expr.left, tags) && exprMatches(expr.right, tags);
		case "or":
			return exprMatches(expr.left, tags) || exprMatches(expr.right, tags);
	}
}

/** A set of ids, or the complement of one when `negated` is set. */
interface Ids {
	readonly ids: ReadonlySet<string>;
	readonly negated: boolean;
}

function difference(a: ReadonlySet<string>, b: ReadonlySet<string>) {
	return new Set([...a].filter((id) => !b.has(id)));
}

function union(a: ReadonlySet<string>, b: ReadonlySet<string>) {
	return new Set([...a, ...b]);
}

function intersection(a: ReadonlySet<string>, b: ReadonlySet<string>) {
	return new Set([...a].filter((id) => b.has(id)));
}

function not(a: Ids): Ids {
	return { ids: a.ids, negated: !a.negated };
}

function and(a: Ids, b: Ids): Ids {
	if (!a.negated && !b.negated) {
		return { ids: intersection(a.ids, b.ids), negated: false };
	}
	if (!a.negated) {
		return { ids: difference(a.ids, b.ids), negated: false };
	}
	if (!b.negated) {
		return { ids: difference(b.ids, a.ids), negated: false };
	}
	return { ids: union(a.ids, b.ids), negated: true };
}

/** De Morgan: `a | b == ~(~a & ~b)`. */
function or(a: Ids, b: Ids): Ids {
	return not(and(not(a), not(b)));
}

function exprSelect(expr: QueryExpr, index: TagIndex): Ids {
	switch (expr.kind) {
		case "tag":
			return { ids: new Set(index.tagged(expr.name)), negated: false };
		case "not":
			return not(exprSelect(expr.operand, index));
		case "and":
			return and(exprSelect(expr.left, index), exprSelect(expr.right, index));
		case "or":
			return or(exprSelect(expr.left, index), exprSelect(expr.right, index));
	}
}

/** A recursive descent parser over the tokens of one query. */
class QueryParser {
	private readonly tokens: string[];
	private position = 0;

	constructor(private readonly text: string) {
		this.tokens = this.tokenize();
	}

	parse(): Query {
		const expr = this.logic();
		let excluded: ReadonlySet<string> = new Set();
		if (this.accept("EXCEPT")) {
			excluded = this.slugs();
		}
		const rest = this.peek();
		if (rest !== undefined) {
			this.fail(`unexpected '${rest}'`);
		}
		return new Query(expr, excluded);
	}

	private tokenize(): string[] {
		const tokens: string[] = [];
		for (const match of this.text.matchAll(TOKEN_RE)) {
			const { invalid, token } = match.groups ?? {};
			if (invalid !== undefined) {
				const code = (invalid.codePointAt(0) ?? 0)
					.toString(16)
					.toUpperCase()
					.padStart(4, "0");
				this.fail(`unexpected character U+${code}`);
			}
			if (token !== undefined) {
				tokens.push(token);
			}
		}
		return tokens;
	}

	private logic(): QueryExpr {
		let expr = this.logicAnd();
		while (this.accept("OR")) {
			expr = { kind: "or", left: expr, right: this.logicAnd() };
		}
		return expr;
	}

	private logicAnd(): QueryExpr {
		let expr = this.logicNot();
		while (this.accept("AND")) {
			expr = { kind: "and", left: expr, right: this.logicNot() };
		}
		return expr;
	}

	private logicNot(): QueryExpr {
		if (this.accept("NOT")) {
			return { kind: "not", operand: this.logicNot() };
		}
		return this.atom();
	}

	private atom(): QueryExpr {
		if (this.accept("(")) {
			const expr = this.logic();
			if (!this.accept(")")) {
				this.fail("missing ')'");
			}
			return expr;
		}
		return { kind: "tag", name: this.word("a tag") };
	}

	private slugs(): Set<string> {
		const slugs = new Set([this.word("a question id")]);
		while (this.accept(",")) {
			slugs.add(this.word("a question id"));
		}
		return slugs;
	}

	/** Consume a token that is not a keyword or punctuation. */
	private word(expected: string): string {
		const token = this.peek();
		if (token === undefined || KEYWORDS.has(token) || PUNCTUATION.has(token)) {
			this.fail(`expected ${expected}, found '${token ?? "the end"}'`);
		}
		this.position += 1;
		return token;
	}

	private peek(): string | undefined {
		return this.tokens[this.position];
	}

	private accept(token: string): boolean {
		if (this.peek() === token) {
			this.position += 1;
			return true;
		}
		return false;
	}

	private fail(detail: string): never {
		throw new QuerySyntaxError(
			`invalid includeAll query '${this.text}': ${detail}`,
		);
	}
}
