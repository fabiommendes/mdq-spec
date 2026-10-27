/**
 * The severity of each `warning` and `info` lint code. A port of
 * `mdq-py/mdq/models/_lint_codes.py`.
 *
 * NOT PORTED (phase P5 of `dev/plan/mdq-js-paridade.md`): the table is
 * empty. `docs/lint-codes.md` is the source of the codes and severities.
 */

import type { Severity } from "../diagnostics.js";

/** The severity of a lint code, by code. */
export const SEVERITY: Readonly<Record<string, Severity>> = {};
