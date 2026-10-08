/**
 * Exam scheduling fields: `start` and `duration`.
 *
 * A port of `mdq-py/mdq/_schedule.py`. Each field has a surface form, which
 * an author writes in the exam frontmatter, and a canonical form, which the
 * parsed document stores (see `schema/exam.yaml`). Python splits this into
 * `parse_*` (surface form to a `date`/`datetime`/`timedelta`) and `format_*`
 * (value to canonical form). TypeScript has no such value types, so each
 * field has one function that goes from the surface form to the canonical
 * form, with an internal parse and format step that Temporal can replace
 * later (`docs/sync/roadmap.md`, decision 7).
 */

import { repr, strip } from "./parser/text.js";

/**
 * `P[nW][nD][T[nH][nM][n[.f]S]]`, uppercase only. Years and months are not
 * fixed-length, so they are not part of the grammar at all.
 */
const ISO_DURATION_RE =
	/^P(?=[0-9]|T)(?:(?<weeks>[0-9]+)W)?(?:(?<days>[0-9]+)D)?(?:T(?=[0-9])(?:(?<hours>[0-9]+)H)?(?:(?<minutes>[0-9]+)M)?(?:(?<seconds>[0-9]+(?:\.[0-9]+)?)S)?)?$/u;

/** `H:MM` or `HH:MM`, minutes restricted to 00-59. */
const HH_MM_RE = /^([0-9]{1,2}):([0-5][0-9])$/u;

/** `Xd Yh Zm`, every component optional; only spaces between them. */
const XD_YH_ZM_RE =
	/^(?:(?<days>[0-9]+)d)? *(?:(?<hours>[0-9]+)h)? *(?:(?<minutes>[0-9]+)m)?$/u;

/** A duration as exact integers: whole seconds and microseconds. */
interface Duration {
	readonly seconds: number;
	readonly microseconds: number;
}

/** Python's `repr` of a value in an error message. */
function reprValue(value: unknown): string {
	if (typeof value === "string") return repr(value);
	if (value === null) return "None";
	if (value === true) return "True";
	if (value === false) return "False";
	return String(value);
}

/**
 * Read an exam duration: an ISO 8601 duration with fixed-length units only
 * (`P1W`, `P1DT2H30M`, `PT90M`, `PT1.5S`), `HH:MM` (`1:30`), or `Xd Yh Zm`
 * with every component optional (`90m`, `2h 30m`, `1d2h`).
 *
 * @throws {RangeError} `value` matches none of the forms, uses years or
 *   months, or is not a positive duration.
 */
function parseDuration(value: unknown): Duration {
	if (typeof value !== "string") {
		throw new RangeError(
			`duration must be a string or timedelta, got ${reprValue(value)}`,
		);
	}
	const text = strip(value);
	if (!text) {
		throw new RangeError("duration must not be empty");
	}

	let delta: Duration | undefined;
	if (text.startsWith("P")) {
		const groups = ISO_DURATION_RE.exec(text)?.groups;
		if (groups) {
			let seconds = 0;
			let microseconds = 0;
			const secondsGroup = groups.seconds;
			if (secondsGroup?.includes(".")) {
				const [whole = "0", fraction = ""] = secondsGroup.split(".", 2);
				seconds = Number.parseInt(whole, 10);
				microseconds = Number.parseInt(`${fraction}000000`.slice(0, 6), 10);
			} else {
				seconds = Number.parseInt(secondsGroup ?? "0", 10);
			}
			seconds +=
				Number.parseInt(groups.weeks ?? "0", 10) * 7 * 86400 +
				Number.parseInt(groups.days ?? "0", 10) * 86400 +
				Number.parseInt(groups.hours ?? "0", 10) * 3600 +
				Number.parseInt(groups.minutes ?? "0", 10) * 60;
			delta = { seconds, microseconds };
		}
	} else {
		const hhmm = HH_MM_RE.exec(text);
		if (hhmm) {
			delta = {
				seconds:
					Number.parseInt(hhmm[1] ?? "0", 10) * 3600 +
					Number.parseInt(hhmm[2] ?? "0", 10) * 60,
				microseconds: 0,
			};
		} else {
			const groups = XD_YH_ZM_RE.exec(text)?.groups;
			if (groups && Object.values(groups).some((g) => g !== undefined)) {
				delta = {
					seconds:
						Number.parseInt(groups.days ?? "0", 10) * 86400 +
						Number.parseInt(groups.hours ?? "0", 10) * 3600 +
						Number.parseInt(groups.minutes ?? "0", 10) * 60,
					microseconds: 0,
				};
			}
		}
	}

	if (delta === undefined) {
		throw new RangeError(`invalid duration: ${reprValue(value)}`);
	}
	if (delta.seconds <= 0 && delta.microseconds <= 0) {
		throw new RangeError(`duration must be positive: ${reprValue(value)}`);
	}
	return delta;
}

/**
 * Write a duration as a canonical ISO 8601 duration: components carry into
 * the largest unit that holds them and zero components are left out (90
 * minutes is `PT1H30M`, 24 hours is `P1D`, two weeks is `P14D`). Fractional
 * seconds carry no trailing zeros.
 */
function formatDuration(value: Duration): string {
	const days = Math.floor(value.seconds / 86400);
	let remainder = value.seconds % 86400;
	const hours = Math.floor(remainder / 3600);
	remainder %= 3600;
	const minutes = Math.floor(remainder / 60);
	const seconds = remainder % 60;

	const secondsText = value.microseconds
		? `${seconds}.${String(value.microseconds).padStart(6, "0").replace(/0+$/u, "")}`
		: String(seconds);

	const datePart = days ? `${days}D` : "";
	const time: string[] = [];
	if (hours) time.push(`${hours}H`);
	if (minutes) time.push(`${minutes}M`);
	if (seconds || value.microseconds) time.push(`${secondsText}S`);
	const timePart = time.length > 0 ? `T${time.join("")}` : "";
	return `P${datePart}${timePart}`;
}

/**
 * The canonical form of an exam `duration`: Python's
 * `format_duration(parse_duration(value))`. See `parseDuration` and
 * `formatDuration`.
 *
 * @throws {RangeError} With the Python message: `duration must be a string
 *   or timedelta, got ...`, `duration must not be empty`,
 *   `invalid duration: '...'`, or `duration must be positive: '...'`.
 */
export function canonicalDuration(value: unknown): string {
	return formatDuration(parseDuration(value));
}

/** `YYYY-MM-DD`, as `date.fromisoformat` reads it (the ISO basic form too). */
const DATE_RE = /^(?<year>[0-9]{4})-?(?<month>[0-9]{2})-?(?<day>[0-9]{2})$/u;

/**
 * The ISO 8601 date-time grammar of Python 3.13's
 * `datetime.fromisoformat`: a date, a `T` or space, a time with optional
 * seconds and fraction, and an optional UTC offset (`Z`, `+HH:MM`, `+HHMM`,
 * `+HH`, with optional seconds).
 */
const DATETIME_RE =
	/^(?<year>[0-9]{4})-?(?<month>[0-9]{2})-?(?<day>[0-9]{2})[T ](?<hour>[0-9]{2})(?::?(?<minute>[0-9]{2})(?::?(?<second>[0-9]{2})(?:[.,](?<fraction>[0-9]+))?)?)?(?<offset>Z|z|[+-][0-9]{2}(?::?[0-9]{2}(?::?[0-9]{2}(?:[.,][0-9]+)?)?)?)?$/u;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeap(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Whether a date is a real calendar date, as Python's `date` demands. */
function validDate(year: number, month: number, day: number): boolean {
	if (year < 1 || month < 1 || month > 12 || day < 1) return false;
	const days =
		(DAYS_IN_MONTH[month - 1] ?? 0) + (month === 2 && isLeap(year) ? 1 : 0);
	return day <= days;
}

/**
 * The canonical form of a UTC offset: `Z` gives `+00:00`; `+HHMM` and `+HH`
 * are written as `+HH:MM`; seconds are kept when they are not zero.
 * `undefined` when the offset is not one a `timezone` can hold (more than
 * 24 hours, or a fractional second).
 */
function formatOffset(offset: string): string | undefined {
	if (offset === "Z" || offset === "z") return "+00:00";
	const sign = offset[0] ?? "+";
	const digits = offset.slice(1).replace(/:/gu, "");
	if (/[.,]/u.test(digits)) return undefined;
	const hours = Number.parseInt(digits.slice(0, 2), 10);
	const minutes = Number.parseInt(digits.slice(2, 4) || "0", 10);
	const seconds = Number.parseInt(digits.slice(4, 6) || "0", 10);
	if (minutes > 59 || seconds > 59) return undefined;
	const total = hours * 3600 + minutes * 60 + seconds;
	if (total >= 24 * 3600) return undefined;
	const hh = String(hours).padStart(2, "0");
	const mm = String(minutes).padStart(2, "0");
	const ss = seconds ? `:${String(seconds).padStart(2, "0")}` : "";
	return `${sign}${hh}:${mm}${ss}`;
}

/**
 * The canonical form of an exam `start`: Python's
 * `format_start(parse_start(value))`.
 *
 * A string is `strip`ped and read with Python's `date.fromisoformat`, then
 * with `datetime.fromisoformat` (Python 3.13 grammar). A date gives
 * `YYYY-MM-DD`; a date-time gives `YYYY-MM-DDTHH:MM:SS`, then `.ffffff` if
 * the microseconds are not zero, then the UTC offset if there is one (`Z`
 * gives `+00:00`).
 *
 * @throws {RangeError} With the Python message: `start must be a string,
 *   date, or datetime, got ...`, `start must not be empty`, or
 *   `invalid start date/time: '...'`.
 */
export function canonicalStart(value: unknown): string {
	if (typeof value !== "string") {
		throw new RangeError(
			`start must be a string, date, or datetime, got ${reprValue(value)}`,
		);
	}
	const text = strip(value);
	if (!text) {
		throw new RangeError("start must not be empty");
	}
	const invalid = () =>
		new RangeError(`invalid start date/time: ${reprValue(value)}`);

	const date = DATE_RE.exec(text)?.groups;
	if (date) {
		const year = Number(date.year);
		const month = Number(date.month);
		const day = Number(date.day);
		if (!validDate(year, month, day)) throw invalid();
		return `${date.year}-${date.month}-${date.day}`;
	}

	const groups = DATETIME_RE.exec(text)?.groups;
	if (!groups) throw invalid();
	const year = Number(groups.year);
	const month = Number(groups.month);
	const day = Number(groups.day);
	const hour = Number(groups.hour);
	const minute = Number(groups.minute ?? "0");
	const second = Number(groups.second ?? "0");
	if (!validDate(year, month, day) || hour > 23 || minute > 59 || second > 59) {
		throw invalid();
	}
	// Python keeps six digits: a longer fraction is truncated, a shorter
	// one padded.
	const microseconds = Number.parseInt(
		`${groups.fraction ?? ""}000000`.slice(0, 6),
		10,
	);
	let out = `${groups.year}-${groups.month}-${groups.day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}`;
	if (microseconds) out += `.${String(microseconds).padStart(6, "0")}`;
	if (groups.offset !== undefined) {
		const offset = formatOffset(groups.offset);
		if (offset === undefined) throw invalid();
		out += offset;
	}
	return out;
}
