/**
 * Upload questions: a port of mdq-py's `models/_upload.py`, following
 * `docs/question-types/upload.md`.
 *
 * Sizes are computed with `BigInt`, never with floating point, so that
 * `1.5 KB` is exactly 1536 bytes and `0.001 KB` is 1 byte on every
 * implementation.
 */

import type { Diagnostic, PathStep } from "../diagnostics.js";
import { NotAutoGradable, ResponseError } from "../errors.js";
import { typeName, UNICODE_SPACE } from "../parser/text.js";
import type { UploadFile } from "../responses.js";
import type { UploadQuestion } from "../schema/index.js";
import { type FamilyRules, freeTextDiagnostics, modelError } from "./base.js";
import { checkUnsafeThematicBreak } from "./lint.js";
import { lintDiagnostic } from "./lint-codes.js";
import type { QuestionScore } from "./score.js";
import { checkAnswerKeyHasNoH1 } from "./text.js";

/** The largest size, in bytes, that every implementation reads exactly. */
const MAX_BYTES = BigInt(Number.MAX_SAFE_INTEGER);

/// The unit of a size string and its number of bytes.
const UNITS: Readonly<Record<string, bigint>> = {
	B: 1n,
	KB: 1024n,
	MB: 1024n ** 2n,
	GB: 1024n ** 3n,
};

/// A size string, as `schema/upload.yaml` writes it.
const SIZE_RE = /^([0-9]+)(?:\.([0-9]{1,3}))? ?(B|KB|MB|GB)$/;

/// A file name: not empty, not `.` or `..`, not only Unicode spaces, no `/` or `\`.
const FILE_NAME_RE = new RegExp(
	`^(?!\\.\\.?$)(?![${UNICODE_SPACE}]+$)[^/\\\\]+$`,
);

/**
 * The size in bytes that a size string stands for, rounded down.
 *
 * The number is read as a decimal, so the result is exact. The size can be 0
 * or above 2^53 - 1; `maxSizeBytes` and the model rule reject both.
 *
 * @throws {RangeError} The text is not a size string.
 */
export function parseByteSize(text: string): bigint {
	const match = SIZE_RE.exec(text);
	if (match === null)
		throw new RangeError(`not a size: ${JSON.stringify(text)}`);
	const [, whole, fraction = "", unit] = match;
	const thousandths =
		BigInt(whole as string) * 1000n + BigInt(fraction.padEnd(3, "0"));
	return (thousandths * (UNITS[unit as string] as bigint)) / 1000n;
}

/** Whether a `maxSize` is a size that holds at least 1 byte and at most 2^53 - 1. */
function sizeInRange(size: number | string): boolean {
	try {
		maxSizeBytes({ maxSize: size });
		return true;
	} catch {
		return false;
	}
}

/**
 * The largest size of one file, in bytes, or `null` when the question sets no limit.
 *
 * Takes the public form too, which keeps `maxSize` as written.
 *
 * @throws {RangeError} `maxSize` is not an integer from 1 to 2^53 - 1, nor a
 *   size string whose size is in that range.
 *
 * @example
 * maxSizeBytes({ maxSize: "1.5 KB" }); // 1536
 */
export function maxSizeBytes(question: {
	readonly maxSize?: number | string | null;
}): number | null {
	const size = question.maxSize;
	if (size === undefined || size === null) return null;
	const bytes =
		typeof size === "number" && Number.isInteger(size)
			? BigInt(size)
			: typeof size === "string"
				? parseByteSize(size)
				: undefined;
	if (bytes === undefined || bytes < 1n || bytes > MAX_BYTES) {
		throw new RangeError(`not a valid maxSize: ${JSON.stringify(size)}`);
	}
	return Number(bytes);
}

/// Only `A` to `Z` become lower case, so that every implementation agrees.
const foldAscii = (text: string): string =>
	text.replace(/[A-Z]/g, (letter) => letter.toLowerCase());

/**
 * Whether a file name ends with one of the extensions and is longer than it.
 *
 * Only `A`-`Z` of the name are folded to lower case. Takes the public form too.
 *
 * @example
 * matchesExtensions({ extensions: [".pdf"] }, "Relatório.PDF"); // true
 */
export function matchesExtensions(
	question: { readonly extensions?: readonly string[] | null },
	name: string,
): boolean {
	const extensions = question.extensions;
	if (extensions === undefined || extensions === null) return true;
	const folded = foldAscii(name);
	return extensions.some(
		(extension) =>
			folded.length > extension.length && folded.endsWith(extension),
	);
}

/// Whether `value` is a mapping made by `{}` or `Object.create(null)`.
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

const FILE_KEYS = ["name", "path", "size"];

/// The checks of a single item of the response.
function parseFile(item: unknown, index: number): UploadFile {
	if (!isPlainObject(item)) {
		throw new ResponseError(
			`file ${index} is not a mapping: got ${typeName(item)}`,
		);
	}
	for (const key of FILE_KEYS) {
		if (!(key in item))
			throw new ResponseError(`file ${index} has no '${key}'`);
	}
	for (const key of Object.keys(item)) {
		if (!FILE_KEYS.includes(key)) {
			throw new ResponseError(`file ${index} has an unknown key '${key}'`);
		}
	}
	const { name, path, size } = item;
	if (typeof name !== "string" || !FILE_NAME_RE.test(name)) {
		throw new ResponseError(`file ${index} has an invalid 'name'`);
	}
	if (typeof path !== "string" || path === "") {
		throw new ResponseError(`file ${index} has an invalid 'path'`);
	}
	if (
		typeof size !== "number" ||
		!Number.isInteger(size) ||
		size < 0 ||
		size > Number.MAX_SAFE_INTEGER
	) {
		throw new ResponseError(`file ${index} has an invalid 'size'`);
	}
	return { name, path, size };
}

/**
 * Check a response against `upload.md`, "Response", and return its files.
 *
 * @throws {ResponseError} The response breaks a rule of the format or a limit of the question.
 */
export function parseUploadResponse(
	question: Pick<UploadQuestion, "maxFiles" | "maxSize" | "extensions">,
	response: unknown,
): UploadFile[] {
	if (!Array.isArray(response)) {
		throw new ResponseError(
			`an upload response is a list of files, got ${typeName(response)}`,
		);
	}
	if (response.length === 0) {
		throw new ResponseError("an upload response has at least one file");
	}
	const files = response.map(parseFile);
	const names = new Set<string>();
	for (const { name } of files) {
		if (names.has(name))
			throw new ResponseError(`two files are named ${JSON.stringify(name)}`);
		names.add(name);
	}
	const maxFiles = question.maxFiles ?? 1;
	if (files.length > maxFiles) {
		throw new ResponseError(
			`${files.length} files, but the limit is ${maxFiles}`,
		);
	}
	const limit = maxSizeBytes(question);
	for (const file of files) {
		if (limit !== null && file.size > limit) {
			throw new ResponseError(
				`${JSON.stringify(file.name)} is larger than ${limit} bytes`,
			);
		}
		if (!matchesExtensions(question, file.name)) {
			throw new ResponseError(
				`${JSON.stringify(file.name)} has an extension that is not accepted`,
			);
		}
	}
	return files;
}

/**
 * An upload is never gradable automatically.
 *
 * @throws {ResponseError} The response is malformed.
 * @throws {NotAutoGradable} Always, for a well-formed response.
 */
export function scoreUpload(
	question: UploadQuestion,
	response: unknown,
): QuestionScore {
	parseUploadResponse(question, response);
	throw new NotAutoGradable("upload questions require manual grading");
}

/// upload.md, "Size": a size string of 0 bytes, or above 2^53 - 1, is a `schema-error`.
function checkMaxSizeInRange(
	question: UploadQuestion,
	path: readonly PathStep[],
): Diagnostic | undefined {
	if (question.maxSize === undefined || sizeInRange(question.maxSize)) {
		return undefined;
	}
	return modelError(
		"schema-error",
		`'maxSize' ${JSON.stringify(question.maxSize)} is not from 1 to 2^53 - 1 bytes`,
		[...path, "maxSize"],
	);
}

export const uploadRules: FamilyRules<UploadQuestion> = {
	fields: (question, path) => [
		...freeTextDiagnostics(question.answerKey, "answerKey", [
			...path,
			"answerKey",
		]),
		...[checkMaxSizeInRange(question, path)].filter(
			(found) => found !== undefined,
		),
	],
	models: [checkAnswerKeyHasNoH1],
	lint: (question) => [
		...(question.answerKey === undefined
			? [
					lintDiagnostic(
						"missing-answer-key",
						["answerKey"],
						"'answerKey' is not defined",
					),
				]
			: []),
		...checkUnsafeThematicBreak(question.answerKey, ["answerKey"]),
	],
};
