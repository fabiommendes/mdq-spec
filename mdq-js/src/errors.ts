/**
 * The error hierarchy. Mirrors `mdq-py/mdq/errors.py`.
 *
 * Every error carries enough structure for a caller to react to it without
 * parsing the message: `MissingFieldError` names the field.
 */

import type { Diagnostic } from "./diagnostics.js";

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
	readonly path: readonly (string | number)[];
	/** The 1-based source line of the node the problem is about, if known. */
	readonly line: number | undefined;

	constructor(
		message: string,
		path: readonly (string | number)[] = [],
		line?: number,
	) {
		super(message);
		this.path = path;
		this.line = line;
	}
}

/**
 * `Loaded.validate` found no document, or a diagnostic at or above the
 * severity it enforces. Carries every diagnostic `load` produced. Mirrors
 * `InvalidDocument` in `mdq-py/mdq/errors.py`.
 */
export class InvalidDocumentError extends MdqError {
	constructor(readonly diagnostics: readonly Diagnostic[]) {
		super(
			diagnostics
				.map((d) => `${d.severity} ${d.code}: ${d.message}`)
				.join("; ") || "invalid document",
		);
	}
}

/** The frontmatter is not valid YAML, or repeats a key. */
export class YamlSyntaxError extends ParseError {
	override readonly code = "yaml-syntax-error";
}

/** A required field is absent from the document. */
export class MissingFieldError extends ParseError {
	constructor(
		readonly field: string,
		message?: string,
	) {
		super(message ?? `missing required field: ${field}`);
	}
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
		// An empty value came from `[ ]`, since `[]` is a different error.
		super(`[${value || " "}] is not a ${questionType} choice marker`);
	}
}

/**
 * A question bank has no question with the id an `include` or an
 * `includeAll` asks for. Mirrors `IncludeNotFound` in `mdq-py/mdq/errors.py`.
 *
 * The message is `cannot resolve included question '<id>'`, followed by
 * `: <detail>` when `detail` is not empty.
 */
export class IncludeNotFoundError extends MdqError {
	constructor(
		readonly questionId: string,
		detail = "",
	) {
		super(
			`cannot resolve included question '${questionId}'${detail === "" ? "" : `: ${detail}`}`,
		);
	}
}

/**
 * A problem with grading, not with a document. Mirrors `GradingError` in
 * `mdq-py/mdq/errors.py`.
 */
export class GradingError extends MdqError {}

/**
 * A response has the wrong shape for its question, so it is rejected and
 * never scored (`docs/responses.md`, "Errors"). Mirrors `ResponseError` in
 * `mdq-py/mdq/errors.py`.
 */
export class ResponseError extends GradingError {}

/**
 * A response cannot be graded by the library: it waits for an instructor
 * (`docs/responses.md`, "Pending"). Mirrors `NotAutoGradable` in
 * `mdq-py/mdq/errors.py`.
 */
export class NotAutoGradable extends GradingError {}
