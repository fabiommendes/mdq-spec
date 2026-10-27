/**
 * The regex patterns of `accept`/`reject`: `/body/flags` strings compiled
 * with the supported constructs of `docs/references/patterns.md`. A port of
 * `mdq-py/mdq/models/_regex.py`.
 *
 * NOT PORTED (phase P3 of `dev/plan/mdq-js-paridade.md`): a stub that throws.
 */

/** A compiled `/body/flags` pattern string. */
export class RegexPattern {
	constructor(readonly pattern: string) {
		throw new Error("not ported (P3)");
	}

	/** Whether the pattern accepts `response`. */
	match(_response: string): boolean {
		throw new Error("not ported (P3)");
	}
}
