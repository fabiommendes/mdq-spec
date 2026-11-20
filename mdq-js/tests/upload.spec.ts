/**
 * The size and extension rules of upload questions, beyond the corpus.
 *
 * `maxSizeBytes` is compared with an independent reference, a decimal
 * computed with rational arithmetic, for any number, unit and fraction.
 */

import { matchesExtensions, maxSizeBytes } from "@mdq";
import { parseByteSize } from "@mdq/models/upload.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const UNIT_BYTES = { B: 1n, KB: 1024n, MB: 1024n ** 2n, GB: 1024n ** 3n };

/** The reference: the number as a fraction of thousandths, floored. */
function reference(
	whole: bigint,
	thousandths: number,
	unit: keyof typeof UNIT_BYTES,
) {
	return ((whole * 1000n + BigInt(thousandths)) * UNIT_BYTES[unit]) / 1000n;
}

describe("upload.size", () => {
	it("is exact for every number, fraction and unit", () => {
		fc.assert(
			fc.property(
				fc.bigInt({ min: 0n, max: 10n ** 12n }),
				fc.integer({ min: 0, max: 999 }),
				fc.constantFrom(...(["B", "KB", "MB", "GB"] as const)),
				fc.constantFrom("", " "),
				(whole, thousandths, unit, space) => {
					const fraction = String(thousandths).padStart(3, "0");
					const text = `${whole}.${fraction}${space}${unit}`;
					expect(parseByteSize(text)).toBe(
						reference(whole, thousandths, unit as keyof typeof UNIT_BYTES),
					);
				},
			),
		);
	});

	it("never goes through floating point", () => {
		expect(parseByteSize("0.001 KB")).toBe(1n);
		expect(parseByteSize("1.5 KB")).toBe(1536n);
		expect(parseByteSize("0.5 B")).toBe(0n);
		expect(parseByteSize("8388607.999 GB")).toBe(
			(8388607999n * 1024n ** 3n) / 1000n,
		);
		expect(maxSizeBytes({ maxSize: "7.999GB" })).toBe(8588860850);
	});

	it("is null without a limit and the integer itself in bytes", () => {
		expect(maxSizeBytes({})).toBeNull();
		expect(maxSizeBytes({ maxSize: null })).toBeNull();
		expect(maxSizeBytes({ maxSize: 12 })).toBe(12);
	});
});

describe("upload.extensions", () => {
	const only = (...extensions: string[]) => ({ extensions });

	it("matches every name when there are no extensions", () => {
		expect(matchesExtensions({}, "x")).toBe(true);
		expect(matchesExtensions({ extensions: null }, "")).toBe(true);
	});

	it("matches a compound extension and its last part", () => {
		expect(matchesExtensions(only(".tar.gz"), "dados.tar.gz")).toBe(true);
		expect(matchesExtensions(only(".gz"), "dados.tar.gz")).toBe(true);
		expect(matchesExtensions(only(".tar.gz"), "dados.gz")).toBe(false);
	});

	it("needs a name longer than the extension", () => {
		expect(matchesExtensions(only(".pdf"), ".pdf")).toBe(false);
		expect(matchesExtensions(only(".pdf"), ".PDF")).toBe(false);
		expect(matchesExtensions(only(".pdf"), "a.pdf")).toBe(true);
	});

	it("folds only A to Z", () => {
		expect(matchesExtensions(only(".pdf"), "Relatório.PDF")).toBe(true);
		// U+0130 and the Kelvin sign U+212A fold to ASCII under toLowerCase.
		expect(matchesExtensions(only(".ik"), "a.İK")).toBe(false);
		expect(matchesExtensions(only(".k"), "a.K")).toBe(false);
		expect(matchesExtensions(only(".k"), "a.K")).toBe(true);
	});
});
