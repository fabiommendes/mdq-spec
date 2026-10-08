/**
 * The error hierarchy. Mirrors `mdq-py/mdq/errors.py`.
 *
 * Every error carries enough structure for a caller to react to it without
 * parsing the message: `MissingFieldError` names the field.
 */

/** Base class for every error this package raises. */
export class MdqError extends Error {
	constructor(message: string) {
		super(message);
		this.name = new.target.name;
	}
}

/** The source is not a well-formed MDQ document. */
export class ParseError extends MdqError {}

/** A required field is absent from the document. */
export class MissingFieldError extends ParseError {
	constructor(readonly field: string) {
		super(`missing required field: ${field}`);
	}
}

/**
 * `accept` or `reject` (or `preAccept`/`preReject`) is declared both in the
 * frontmatter and in a `[short-answer/...]` block. Mirrors
 * `ConflictingAnswerKey` in `mdq-py/mdq/errors.py`.
 */
export class ConflictingAnswerKeyError extends ParseError {
	/** The diagnostic code that `load()` reports for this error. */
	readonly code = "conflicting-accept";
}

/**
 * A question bank has no question with the id an `include` or an
 * `include-all` asks for. Mirrors `IncludeNotFound` in `mdq-py/mdq/errors.py`.
 *
 * The message is `cannot resolve included question '<id>'`, followed by
 * `: <detail>` when `detail` is not empty.
 */
export class IncludeNotFoundError extends MdqError {
	constructor(
		readonly questionId: string,
		detail = "",
	) {
		super("not implemented");
		void detail;
		throw new Error("not implemented");
	}
}
