/**
 * Grading of a code question (docs/question-types/code.md, "Grading"). A port
 * of the scoring part of `mdq-py/mdq/models/_code.py`.
 *
 * The score is exact: a double sum of `0.1 * n / n` gives `1.0000000000000002`
 * or `0.9999999999999998`. Each value is read from its decimal text, the
 * credit, the discount and the total are fractions of `BigInt`, and the one
 * rounding to a double is the last step.
 */

import { NotAutoGradable } from "../errors.js";
import { pyRepr } from "../parser/text.js";
import type { CodeQuestion } from "../schema/questions.js";
import type { RunnerReport } from "../schema/runner-report.js";
import { annotationsOf, requireResolved, rubricPoints } from "./code.js";
import { checkReport } from "./report.js";
import type { QuestionScore } from "./score.js";

/** What the host adds to the response of a code question. */
export interface CodeGrading {
	/** The report of the runner for the response. Missing: no test source. */
	readonly report?: unknown;
	/** The score in [0, 1] of each item of `rubric`, `null` for no score yet. */
	readonly manual?: readonly (number | null | undefined)[] | null;
	/** The score in [0, 1] of the whole response, for a question with no item. */
	readonly instructor?: number | null;
}

/** A non-negative or negative rational: `num / den`, with `den` > 0. */
interface Fraction {
	readonly num: bigint;
	readonly den: bigint;
}

const ZERO: Fraction = { num: 0n, den: 1n };

function gcd(a: bigint, b: bigint): bigint {
	let x = a < 0n ? -a : a;
	let y = b < 0n ? -b : b;
	while (y !== 0n) [x, y] = [y, x % y];
	return x;
}

function fraction(num: bigint, den: bigint): Fraction {
	const divisor = gcd(num, den) || 1n;
	const sign = den < 0n ? -1n : 1n;
	return { num: (sign * num) / divisor, den: (sign * den) / divisor };
}

const add = (a: Fraction, b: Fraction): Fraction =>
	fraction(a.num * b.den + b.num * a.den, a.den * b.den);
const sub = (a: Fraction, b: Fraction): Fraction =>
	fraction(a.num * b.den - b.num * a.den, a.den * b.den);
const mul = (a: Fraction, b: Fraction): Fraction =>
	fraction(a.num * b.num, a.den * b.den);
const div = (a: Fraction, b: Fraction): Fraction =>
	fraction(a.num * b.den, a.den * b.num);
const sign = (a: Fraction): number => (a.num > 0n ? 1 : a.num < 0n ? -1 : 0);

const DECIMAL_RE = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/u;

/**
 * The exact value of the decimal text of a number (`0.1` is 1/10, not the
 * nearest double).
 */
function exact(value: number): Fraction {
	const found = DECIMAL_RE.exec(String(value));
	if (found === null)
		throw new RangeError(`${String(value)} is not a finite number`);
	const [, negative, whole, decimals = "", exponent = "0"] = found;
	const power = Number(exponent) - decimals.length;
	let num = BigInt((negative ?? "") + (whole as string) + decimals);
	let den = 1n;
	if (power >= 0) num *= 10n ** BigInt(power);
	else den = 10n ** BigInt(-power);
	return fraction(num, den);
}

const bitLength = (value: bigint): number => value.toString(2).length;

/** The double nearest to `value`, ties to even: one rounding. */
function toDouble(value: Fraction): number {
	if (value.num === 0n) return 0;
	const negative = value.num < 0n;
	const num = negative ? -value.num : value.num;
	// A quotient of 55 bits or more, plus a sticky bit, rounds right in `Number`.
	const shift = 55 - (bitLength(num) - bitLength(value.den));
	const top = shift >= 0 ? num << BigInt(shift) : num;
	const bottom = shift >= 0 ? value.den : value.den << BigInt(-shift);
	const quotient = top / bottom;
	const sticky = top % bottom === 0n ? 0n : 1n;
	const result = Number((quotient << 1n) | sticky) * 2 ** -(shift + 1);
	return negative ? -result : result;
}

/** Whether `value` is a number in [0, 1]. A boolean is not a number here. */
function isUnitScore(value: unknown): value is number {
	return typeof value === "number" && value >= 0 && value <= 1;
}

/**
 * @throws {RangeError} The scores of the instructor do not fit the question
 *   (responses.md, "Code"). A mistake of the host, not a `GradingError`.
 */
function checkManual(
	manual: CodeGrading["manual"],
	instructor: CodeGrading["instructor"],
	rubricSize: number,
	hasItems: boolean,
): void {
	if (manual !== undefined && manual !== null) {
		if (manual.length !== rubricSize) {
			throw new RangeError(
				`${manual.length} manual score(s) for ${rubricSize} item(s) of \`rubric\``,
			);
		}
		for (const score of manual) {
			if (score !== undefined && score !== null && !isUnitScore(score)) {
				throw new RangeError(
					`the manual score ${pyRepr(score)} is not a number in [0, 1]`,
				);
			}
		}
	}
	if (instructor !== undefined && instructor !== null) {
		if (hasItems) {
			throw new RangeError(
				"one score for the whole response is only for a question with no " +
					"rubric item: score the manual items instead",
			);
		}
		if (!isUnitScore(instructor)) {
			throw new RangeError(
				`the score ${pyRepr(instructor)} is not a number in [0, 1]`,
			);
		}
	}
}

/**
 * The score of a response to a code question, from the runner report and the
 * scores of the instructor. The response itself does not matter here.
 *
 * The checks run in this order: the test sources, the scores of the
 * instructor, the report and then whether the response is pending.
 *
 * @throws {UnresolvedTestSource} A test source has no text.
 * @throws {RangeError} `manual` or `instructor` does not fit the question: a
 *   list of another length than `rubric`, a score outside [0, 1], or
 *   `instructor` for a question that has an item.
 * @throws {ReportError} The report does not follow the schema, does not fit
 *   the question, or is missing while there is a test source.
 * @throws {NotAutoGradable} The status of the report is `runner-error`, a
 *   manual item that counts has no score, or the question has no item and
 *   `instructor` is missing.
 */
export function scoreCode(
	question: CodeQuestion,
	grading: CodeGrading = {},
): QuestionScore {
	requireResolved(question);
	const tests = question.tests ?? [];
	const rubric = question.rubric ?? [];
	const hasItems = tests.length > 0 || rubric.length > 0;
	const { instructor } = grading;
	checkManual(grading.manual, instructor, rubric.length, hasItems);
	const report: RunnerReport | null = checkReport(question, grading.report);

	if (report?.status === "runner-error") {
		throw new NotAutoGradable(
			"the runner failed (status `runner-error`): the response is pending, never 0",
		);
	}
	const scores = rubric.map((_, index) => grading.manual?.[index] ?? null);
	for (const [index, item] of rubric.entries()) {
		if (rubricPoints(item) !== 0 && scores[index] === null) {
			throw new NotAutoGradable(
				`the manual item ${pyRepr(item.text)} has no score of the instructor`,
			);
		}
	}
	if (!hasItems) {
		if (instructor === undefined || instructor === null) {
			throw new NotAutoGradable("the instructor has not scored the response");
		}
		return { score: instructor, feedback: [] };
	}

	let credit = ZERO;
	let discount = ZERO;
	let positive = ZERO;
	const buildError = report?.status === "build-error";
	const cases = report === null || buildError ? [] : report.cases;
	for (const [index, source] of tests.entries()) {
		const scan = annotationsOf(source);
		const owned = cases.filter((item) => item.source === index);
		const groups: [Fraction, typeof owned][] = scan.annotated
			? scan.items.map((note) => [
					exact(note.value ?? 1),
					owned.filter((c) => note.line <= c.line && c.line <= note.end),
				])
			: [[exact(1), owned]];
		for (const [value, group] of groups) {
			const size: Fraction = { num: BigInt(group.length), den: 1n };
			if (sign(value) > 0) {
				positive = add(positive, value);
				if (group.length > 0) {
					const passed = group.filter((c) => c.verdict === "pass").length;
					credit = add(
						credit,
						div(mul(value, { num: BigInt(passed), den: 1n }), size),
					);
				}
			} else if (sign(value) < 0) {
				const loss = mul(value, { num: -1n, den: 1n });
				if (buildError) {
					discount = add(discount, loss);
				} else if (group.length > 0) {
					const failed = group.filter((c) => c.verdict !== "pass").length;
					discount = add(
						discount,
						div(mul(loss, { num: BigInt(failed), den: 1n }), size),
					);
				}
			}
		}
	}
	for (const [index, item] of rubric.entries()) {
		const points = exact(rubricPoints(item));
		const earned = exact(scores[index] ?? 0);
		if (sign(points) > 0) {
			positive = add(positive, points);
			credit = add(credit, mul(points, earned));
		} else if (sign(points) < 0) {
			discount = add(discount, mul(mul(points, { num: -1n, den: 1n }), earned));
		}
	}
	if (sign(positive) === 0) return { score: 0, feedback: [] };
	const net = div(sub(credit, discount), positive);
	const floor: Fraction = { num: -1n, den: 1n };
	return {
		score: toDouble(sign(sub(net, floor)) < 0 ? floor : net),
		feedback: [],
	};
}
