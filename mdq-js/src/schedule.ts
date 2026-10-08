/**
 * Exam scheduling fields: `start` and `duration`.
 *
 * A port of `mdq-py/mdq/_schedule.py`. Each field has a surface form, which
 * an author writes in the exam frontmatter, and a canonical form, which the
 * parsed document stores (see `schema/exam.yaml`). Python splits this into
 * `parse_*` (surface form to a `date`/`datetime`/`timedelta`) and `format_*`
 * (value to canonical form). TypeScript has no such value types, so each
 * field has one function that goes from the surface form to the canonical
 * form.
 */

/**
 * A YAML timestamp as mdq-py reads it: `isoformat` is the `isoformat()` of
 * the `date` or `datetime` that PyYAML builds, for example `2026-03-10` or
 * `2026-03-10T09:00:00-03:00`. `loadExamFrontmatterYaml` in
 * `parser/frontmatter` makes these.
 */
export class YamlTimestamp {
	constructor(readonly isoformat: string) {}
}

/**
 * The canonical form of an exam `start`: Python's
 * `format_start(parse_start(value))`.
 *
 * A string is `strip`ped and read with Python's `date.fromisoformat`, then
 * with `datetime.fromisoformat` (Python 3.13 grammar). A date gives
 * `YYYY-MM-DD`; a date-time gives `YYYY-MM-DDTHH:MM:SS`, then `.ffffff` if
 * the microseconds are not zero, then the UTC offset if there is one (`Z`
 * gives `+00:00`). A `YamlTimestamp` gives its `isoformat`.
 *
 * @throws {RangeError} With the Python message: `start must be a string,
 *   date, or datetime, got ...`, `start must not be empty`, or
 *   `invalid start date/time: '...'`.
 */
export function canonicalStart(value: unknown): string {
	void value;
	throw new Error("not implemented");
}

/**
 * The canonical form of an exam `duration`: Python's
 * `format_duration(parse_duration(value))`.
 *
 * Reads an ISO 8601 duration with fixed-length units only (`P1W`,
 * `P1DT2H30M`, `PT1.5S`), `H:MM` (`1:30`), or `Xd Yh Zm` (`90m`, `2h 30m`).
 * Writes `P[nD][T[nH][nM][n[.f]S]]`: weeks become days, every unit carries
 * into the largest unit that holds it, zero units are left out, and the
 * fraction of the seconds (at most 6 digits) has no trailing zeros.
 *
 * @throws {RangeError} With the Python message: `duration must be a string
 *   or timedelta, got ...`, `duration must not be empty`,
 *   `invalid duration: '...'`, or `duration must be positive: '...'`.
 */
export function canonicalDuration(value: unknown): string {
	void value;
	throw new Error("not implemented");
}
