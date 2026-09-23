/**
 * The error hierarchy. Mirrors `mdq/errors.py`.
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
