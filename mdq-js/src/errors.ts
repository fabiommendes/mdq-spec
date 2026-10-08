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

/**
 * The source is not a well-formed MDQ document. Subclasses that `load()`
 * reports under a code of their own carry `code`, and `path` when the
 * problem sits at a known place of the document.
 */
export class ParseError extends MdqError {
	/** The diagnostic code `load()` reports; `parse-error` when absent. */
	readonly code: string = "parse-error";
	/** Where the problem is, as a path from the document's root. */
	readonly path: readonly (string | number)[] = [];
}

/** The frontmatter is not valid YAML, or repeats a key. */
export class YamlSyntaxError extends ParseError {
	override readonly code = "yaml-syntax-error";
}

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
	override readonly code = "conflicting-accept";
}

/**
 * fill-in.md, "Additional Rules": a key of the frontmatter `preAccept` or
 * `preReject` map is not the id of a declared blank. The path is
 * `[key, blankId]`. Mirrors `UndefinedBlank` in `mdq-py/mdq/errors.py`.
 */
export class UndefinedBlankError extends ParseError {
	override readonly code = "undefined-blank";
	override readonly path: readonly (string | number)[];

	constructor(
		readonly blankId: string,
		readonly key: string,
	) {
		super(`${key} has a key '${blankId}' but no blank with that id is defined`);
		this.path = [key, blankId];
	}
}

/**
 * base.md, "Type inference": a choice value is not in the `value` rule of
 * the question type, inferred or forced. The path locates the choice.
 * Mirrors `ForeignChoiceMarker` in `mdq-py/mdq/errors.py`.
 */
export class ForeignChoiceMarkerError extends ParseError {
	override readonly code = "foreign-choice-marker";

	constructor(
		readonly value: string,
		readonly questionType: string,
		override readonly path: readonly (string | number)[],
	) {
		super(`[${value}] is not a ${questionType} choice marker`);
	}
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
