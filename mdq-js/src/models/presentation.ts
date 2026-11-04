/**
 * The presented form of a question (`docs/public-form.md`, "Presented
 * form"): the public form with opaque choice labels in place of the choice
 * ids, in an order that depends on a seed, and the translation of the
 * responses between the labels and the ids. A port of
 * `models/_presentation.py`.
 *
 * Differs from Python in shape only: a `Presentation` is a plain object made
 * by `presentation(question, seed)`, and `Exam.presentation` is the free
 * function `examPresentation(exam, seed)` (here, because `exam.ts` does not
 * import the public form). The digest is a synchronous SHA-256 from
 * `@noble/hashes`, so it runs in the browser and in plain Node ESM alike.
 */

import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { MissingIdError, ResponseError, UnresolvedInclude } from "../errors.js";
import { typeName } from "../parser/text.js";
import type { ExamResponses, QuestionResponse } from "../responses.js";
import type { Exam } from "../schema/exam.js";
import type { Question } from "../schema/questions.js";
import { effectiveShuffle, isGradedQuestion } from "./base.js";
import { requireChoiceId } from "./choice.js";
import { shuffleFor } from "./exam.js";
import { type PublicQuestion, publicForm } from "./public-form.js";

/**
 * The lengths of a label, in hex digits. A choice gets the shortest one whose
 * prefix of its digest no other choice of the scope shares.
 */
const LABEL_LENGTHS = [8, 16, 32, 64] as const;

const ENCODER = new TextEncoder();

/**
 * The SHA-256 of `seed` and the key `parts`, joined by U+0000 and encoded in
 * UTF-8, as 64 lowercase hex digits.
 *
 * @throws {RangeError} `seed` or a part holds U+0000 (Python raises
 *   `ValueError`).
 */
// r2: adr-0012
export function digest(seed: string, ...parts: string[]): string {
	const all = [seed, ...parts];
	if (all.some((part) => part.includes("\0"))) {
		throw new RangeError("a seed and a key part cannot hold U+0000");
	}
	return bytesToHex(sha256(ENCODER.encode(all.join("\0"))));
}

/** The choices that get their labels together, and their presented order. */
interface Scope {
	/** Choice id to label. */
	readonly labels: ReadonlyMap<string, string>;
	/** Label to choice id. */
	readonly ids: ReadonlyMap<string, string>;
	/** The choice ids in the presented order. */
	readonly order: readonly string[];
}

function makeScope(
	seed: string,
	prefix: readonly string[],
	choiceIds: readonly string[],
	shuffle: boolean,
): Scope {
	const digests = new Map<string, string>();
	for (const id of choiceIds) digests.set(id, digest(seed, ...prefix, id));
	const labels = new Map<string, string>();
	for (const [id, own] of digests) {
		const length = LABEL_LENGTHS.find((n) => {
			for (const [other, theirs] of digests) {
				if (other !== id && theirs.slice(0, n) === own.slice(0, n)) {
					return false;
				}
			}
			return true;
		});
		labels.set(id, length === undefined ? own : own.slice(0, length));
	}
	const ids = new Map<string, string>();
	for (const [id, label] of labels) ids.set(label, id);
	const unique = [...digests.keys()];
	const order = shuffle
		? [...unique].sort((a, b) => {
				const la = labels.get(a) as string;
				const lb = labels.get(b) as string;
				return la < lb ? -1 : la > lb ? 1 : 0;
			})
		: unique;
	return { labels, ids, order };
}

/** `choices` (public form) in the presented order, with labels as ids. */
function present<C extends { id: string }>(scope: Scope, choices: C[]): C[] {
	const byId = new Map(choices.map((choice) => [choice.id, choice]));
	return scope.order.map((id) => ({
		...(byId.get(id) as C),
		id: scope.labels.get(id) as string,
	}));
}

/**
 * The label of the id `value` (`toLabel`), or else the id of the label.
 *
 * @throws {ResponseError} `value` is not a known id (or label).
 */
function lookup(scope: Scope, value: unknown, toLabel: boolean): string {
	const found =
		typeof value === "string"
			? (toLabel ? scope.labels : scope.ids).get(value)
			: undefined;
	if (found === undefined) {
		throw new ResponseError(
			`unknown ${toLabel ? "choice id" : "choice label"} in a response: ${JSON.stringify(value)}`,
		);
	}
	return found;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The labels and the order of the choices of one question, for one seed.
 *
 * The labels are the prefix of SHA-256(seed, question id, [blank id,] choice
 * id), see "Presented form" in `docs/public-form.md`. The seed must be
 * unpredictable for the student: the host derives it, for example with an
 * HMAC of a secret. The library does not handle secrets. It keeps no state
 * beyond the label maps, so a host can build it again at each request.
 */
export interface Presentation {
	/**
	 * The presented form: the public form of the question with the choices of
	 * each scope in the presented order and a label in the place of each
	 * choice id.
	 *
	 * @throws {MissingIdError} A choice has no id.
	 */
	publicForm(): PublicQuestion;
	/**
	 * Translate a presented response (with labels) into the response that
	 * grading takes (with ids).
	 *
	 * @throws {ResponseError} A label is not in its scope, or the response has
	 *   the wrong shape for a choice question.
	 */
	toResponse(presented: unknown): QuestionResponse;
	/**
	 * Translate a response (with ids) into a presented response (with labels),
	 * to show a stored response again.
	 *
	 * @throws {ResponseError} An id is not in its scope, or the response has
	 *   the wrong shape for a choice question.
	 */
	toPresented(response: unknown): QuestionResponse;
}

/** `Presentation` plus the translation both ways, shared with the exam. */
interface PresentationImpl extends Presentation {
	translate(response: unknown, toLabel: boolean): QuestionResponse;
}

/**
 * The presentation of `question` for `seed`.
 *
 * `options.shuffle` overrides the effective `shuffle` of the question, which
 * is the default (`effectiveShuffle`; inside an exam use `examPresentation`).
 * A fill-in question applies it to every choice blank.
 *
 * @throws {RangeError} `seed` holds U+0000.
 * @throws {MissingIdError} A choice has no id. Call `withIds` first, and
 *   store the result.
 */
export function presentation(
	question: Question,
	seed: string,
	options: { readonly shuffle?: boolean } = {},
): Presentation {
	return buildPresentation(question, seed, options.shuffle);
}

function buildPresentation(
	question: Question,
	seed: string,
	shuffleOption: boolean | undefined,
): PresentationImpl {
	digest(seed); // rejects a seed with U+0000, even with no scope.
	const shuffle =
		shuffleOption ??
		(isGradedQuestion(question) ? effectiveShuffle(question) : false);
	const qid = question.id ?? "";
	let scope: Scope | undefined;
	const blanks = new Map<string, Scope>();
	switch (question.type) {
		case "multiple-choice":
		case "multiple-selection":
		case "true-false":
			scope = makeScope(
				seed,
				[qid],
				question.choices.map(requireChoiceId),
				shuffle,
			);
			break;
		case "fill-in":
			for (const blank of question.blanks) {
				if (blank.type === "multiple-choice") {
					blanks.set(
						blank.id,
						makeScope(
							seed,
							[qid, blank.id],
							blank.choices.map(requireChoiceId),
							shuffle,
						),
					);
				}
			}
			break;
		default:
			break;
	}

	function translate(response: unknown, toLabel: boolean): QuestionResponse {
		if (response === null || response === undefined) return null;
		if (scope !== undefined) {
			if (question.type === "multiple-choice") {
				return lookup(scope, response, toLabel);
			}
			if (question.type === "multiple-selection") {
				if (!Array.isArray(response)) {
					throw new ResponseError(
						`A multiple selection response must be a list of ids, found ${typeName(response)}`,
					);
				}
				return response.map((item) => lookup(scope, item, toLabel));
			}
			if (question.type === "true-false") {
				if (!isRecord(response)) {
					throw new ResponseError(
						`A true or false response must be a mapping of statement ids, found ${typeName(response)}`,
					);
				}
				return Object.fromEntries(
					Object.entries(response).map(([key, value]) => [
						lookup(scope, key, toLabel),
						value,
					]),
				) as QuestionResponse;
			}
		}
		if (question.type === "fill-in") {
			if (!isRecord(response)) {
				throw new ResponseError(
					`A fill-in response must be a mapping of blank ids, found ${typeName(response)}`,
				);
			}
			return Object.fromEntries(
				Object.entries(response).map(([key, value]) => {
					const blank = blanks.get(key);
					return [
						key,
						blank !== undefined && value !== null
							? lookup(blank, value, toLabel)
							: value,
					];
				}),
			) as QuestionResponse;
		}
		return response as QuestionResponse;
	}

	return {
		publicForm() {
			const form = publicForm(question) as unknown as Record<string, unknown>;
			if (scope !== undefined) {
				form.choices = present(
					scope,
					form.choices as { id: string; text: string }[],
				);
			}
			if (Array.isArray(form.blanks)) {
				form.blanks = (form.blanks as { id: string; choices?: never[] }[]).map(
					(blank) => {
						const own = blanks.get(blank.id);
						return own === undefined
							? blank
							: { ...blank, choices: present(own, blank.choices ?? []) };
					},
				);
			}
			return form as unknown as PublicQuestion;
		},
		toResponse: (presented) => translate(presented, false),
		toPresented: (response) => translate(response, true),
		translate,
	};
}

/**
 * The presentation of each question of a resolved exam, in the order of the
 * exam (`docs/public-form.md`, "Presented form"). Get one with
 * `examPresentation`.
 */
export interface ExamPresentation {
	/** The presented form of each question, in the order of the exam. */
	publicForm(): PublicQuestion[];
	/**
	 * Translate the presented responses of an attempt (question id to
	 * response) into the responses that grading takes.
	 *
	 * @throws {ResponseError} A key names no question of the exam, or a
	 *   response does not translate.
	 */
	toResponses(presented: Readonly<Record<string, unknown>>): ExamResponses;
	/**
	 * Translate the responses of an attempt (question id to response) into
	 * presented responses.
	 *
	 * @throws {ResponseError} A key names no question of the exam, or a
	 *   response does not translate.
	 */
	toPresentedResponses(
		responses: Readonly<Record<string, unknown>>,
	): ExamResponses;
}

/**
 * The presentation of every question of `exam` for `seed`, with the `shuffle`
 * each question gets here (`shuffleFor`). The exam must be resolved and its
 * questions must have ids.
 *
 * @throws {UnresolvedInclude} The exam still holds an include block.
 * @throws {MissingIdError} A question or a choice has no id.
 * @throws {RangeError} `seed` holds U+0000.
 */
export function examPresentation(exam: Exam, seed: string): ExamPresentation {
	const presentations = new Map<string, PresentationImpl>();
	for (const entry of exam.questions) {
		if ("include" in entry || "includeAll" in entry) {
			throw new UnresolvedInclude("cannot present an exam with include blocks");
		}
		if (entry.id === undefined) {
			throw new MissingIdError("cannot present a question without an id");
		}
		presentations.set(
			entry.id,
			buildPresentation(entry, seed, shuffleFor(exam, entry)),
		);
	}

	function translate(
		responses: Readonly<Record<string, unknown>>,
		toLabel: boolean,
	): ExamResponses {
		const result: Record<string, QuestionResponse> = {};
		for (const [key, response] of Object.entries(responses)) {
			const own = presentations.get(key);
			if (own === undefined) {
				throw new ResponseError(
					`response for unknown question ${JSON.stringify(key)}`,
				);
			}
			Object.defineProperty(result, key, {
				value: own.translate(response, toLabel),
				enumerable: true,
				writable: true,
				configurable: true,
			});
		}
		return result;
	}

	return {
		publicForm: () => [...presentations.values()].map((p) => p.publicForm()),
		toResponses: (presented) => translate(presented, false),
		toPresentedResponses: (responses) => translate(responses, true),
	};
}
