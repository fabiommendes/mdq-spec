/**
 * Fast-check generators for bracket-list question documents.
 *
 * `bracketListCaseArb` builds MDQ source for a `multiple-choice` /
 * `multiple-selection` / `true-false` question *alongside* the exact
 * document `parseQuestionDocument` must produce from it, the way
 * `docs/handoffs/02-parser-bracket-lists-parity.md` asks for: title,
 * optional id (frontmatter or inline `[slug]`), an optional `type`
 * (sometimes left out of the frontmatter entirely, so the markers alone
 * must drive `_infer_choice_type`), preamble paragraphs, a stem, N choices
 * with markers, optional explicit ids and optional per-choice feedback, and
 * optional `grading`/`shuffle`/`weight` frontmatter.
 *
 * `expected` is computed from the same config the source is built from, not
 * by calling the parser, so the property stays independent of the code
 * under test. A choice carries an `id` in `expected` only when its `ChoiceSpec`
 * carries an `explicitId` -- Python's parser stopped deriving one from the
 * choice text (`_assign_choice_ids`, `_parser/_choices.py`; the derivation moved to
 * `mdq.models.BaseQuestion.with_ids`, ported in a later cycle), so a choice
 * with no explicit id has no `id` key at all, not one computed here to match.
 *
 * The prose pools (stems, preambles, titles) are plain ASCII with no
 * markdown-significant characters (`[`, `>`, `!`, leading list markers,
 * colons), so a generated paragraph round-trips through `raw_text`'s
 * soft-wrap join unchanged -- the property is about the parser's skeleton,
 * not about prose escaping. `CHOICE_TEXTS` is the deliberate exception: it
 * mixes accented and multi-word text, backtick-quoted code, and lone
 * symbols/digits, because that variety exercises choice *text*
 * reconstruction (trimming, backtick spans) even though it no longer drives
 * an id.
 */

import fc from "fast-check";

export type ChoiceKind =
	| "multiple-choice"
	| "multiple-selection"
	| "true-false";

interface ChoiceSpec {
	text: string;
	marker: string;
	explicitId?: string;
	feedback?: string;
}

export interface BracketListCase {
	kind: ChoiceKind;
	source: string;
	expected: Record<string, unknown>;
}

// A mix of plain ascii words, accented and multi-word text, backtick-quoted
// code, and lone symbols/digits -- so choice-text reconstruction (trimming,
// soft-wrap joins) is exercised against more than the ascii-single-word fast
// path, even though none of it drives a derived id anymore (see the module
// docstring).
const CHOICE_TEXTS = [
	"Amazonas",
	"Cerrado",
	"Caatinga",
	"Pantanal",
	"Brasilia",
	"Fortaleza",
	"Recife",
	"Manaus",
	"Curitiba",
	"Cuiaba",
	"Ouro Preto",
	"Rio de Janeiro",
	"Amazônia",
	"Café com leite",
	"Ação e Reação",
	"São Paulo",
	"`x`",
	"`return 0`",
	"!",
	"?",
	"7",
	"0",
];

const STEMS = [
	"Select the correct alternative about Brazilian geography.",
	"Judge the statements about Amazonian biodiversity.",
	"Which of the following are true about quantum mechanics.",
	"Consider the evolutionary history of capybaras.",
	"Mark every accurate claim about ocean currents.",
	"Evaluate the statements about continental drift.",
];

const PREAMBLES = [
	"Brazil is home to diverse biomes.",
	"The Amazon river carries more water than any other.",
	"Quantum entanglement links particle states.",
	"Darwin studied finches in the Galapagos.",
	"Plate tectonics reshapes continents over millions of years.",
	"Coral reefs support a large fraction of marine species.",
];

const TITLES = [
	"Geography Quiz",
	"Ocean Trivia",
	"Brazil Facts",
	"Physics Basics",
	"Evolution Primer",
];

const FRONTMATTER_IDS = ["q1", "geo-quiz", "brazil-1", "ocean-q", "bio-2"];
const INLINE_SLUGS = ["intro-slug", "q-alt", "bio1", "geo-2", "phys-9"];
const EXPLICIT_IDS = ["custom-id", "alt1", "choice-a", "opt-x", "pick-2"];
const FEEDBACK_SENTENCES = [
	"This is not quite right, reconsider the premise.",
	"Correct, this matches the established consensus.",
	"A common misconception worth revisiting.",
	"See the preamble for a hint.",
];

const PERCENTS = ["0%", "25%", "50%", "75%", "100%", "-25%", "-50%"];
const TRUE_FALSE_LETTERS = ["T", "F", "t", "f", "V", "v"];
const FALSE_LETTERS = new Set(["f", "错", "偽"]);

const GRADINGS = ["partial", "all-or-nothing", "symmetric"] as const;
const WEIGHTS = [0, 0.5, 1, 2, 3.25, 10] as const;

function markerArb(kind: ChoiceKind): fc.Arbitrary<string> {
	if (kind === "multiple-choice") {
		return fc.constantFrom("", ...PERCENTS);
	}
	if (kind === "multiple-selection") {
		return fc.constantFrom("", "x", "X");
	}
	return fc.constantFrom(...TRUE_FALSE_LETTERS);
}

function optionalFrom<T>(pool: readonly T[]): fc.Arbitrary<T | undefined> {
	return fc.option(fc.constantFrom(...pool), { nil: undefined });
}

/** N choice specs for `kind`, at least one `*` forced for multiple-choice. */
function choiceSpecsArb(kind: ChoiceKind): fc.Arbitrary<ChoiceSpec[]> {
	return fc.integer({ min: 2, max: 5 }).chain((n) =>
		fc
			.tuple(
				fc.uniqueArray(fc.constantFrom(...CHOICE_TEXTS), {
					minLength: n,
					maxLength: n,
				}),
				fc.array(markerArb(kind), { minLength: n, maxLength: n }),
				fc.array(optionalFrom(FEEDBACK_SENTENCES), {
					minLength: n,
					maxLength: n,
				}),
				fc.array(optionalFrom(EXPLICIT_IDS), { minLength: n, maxLength: n }),
				kind === "multiple-choice"
					? fc.integer({ min: 0, max: n - 1 })
					: fc.constant(-1),
			)
			.map(([texts, markers, feedbacks, explicitIds, starIndex]) => {
				const specs = texts.map((text, i) => ({
					text,
					marker: markers[i] as string,
					feedback: feedbacks[i],
					explicitId: explicitIds[i],
				}));
				const forced = specs[starIndex];
				if (
					kind === "multiple-choice" &&
					forced !== undefined &&
					!specs.some((c) => c.marker === "*")
				) {
					specs[starIndex] = { ...forced, marker: "*" };
				}
				return specs;
			}),
	);
}

function bracket(marker: string): string {
	return marker === "" ? "[ ]" : `[${marker}]`;
}

function choiceLine(spec: ChoiceSpec): string {
	const idPart = spec.explicitId ? `[${spec.explicitId}] ` : "";
	let line = `* ${bracket(spec.marker)} ${idPart}${spec.text}`;
	if (spec.feedback) {
		line += `\n  > ${spec.feedback}`;
	}
	return line;
}

function scoreFromMarker(marker: string): number {
	if (marker === "*") {
		return 1;
	}
	if (/^[+-]?\d+(?:\.\d+)?%$/.test(marker)) {
		return Number.parseFloat(marker.slice(0, -1)) / 100;
	}
	return 0;
}

function choiceEntry(
	kind: ChoiceKind,
	spec: ChoiceSpec,
): Record<string, unknown> {
	// `id` appears only when the source wrote one explicitly -- Python's
	// `_assign_choice_ids` (`_parser/_choices.py`) no longer derives one from the
	// choice text, so a choice with no `[id]` prefix has no `id` key here.
	const entry: Record<string, unknown> = { text: spec.text };
	if (spec.explicitId !== undefined) {
		entry.id = spec.explicitId;
	}
	if (kind === "multiple-choice") {
		entry.score = scoreFromMarker(spec.marker);
	} else if (kind === "multiple-selection") {
		if (spec.marker.toLowerCase() === "x") {
			entry.correct = true;
		}
	} else {
		entry.correct = !FALSE_LETTERS.has(spec.marker.toLowerCase());
		entry.marker = spec.marker;
	}
	if (spec.feedback) {
		entry.feedback = spec.feedback;
	}
	return entry;
}

interface CaseConfig {
	kind: ChoiceKind;
	frontmatterId?: string;
	title?: string;
	inlineSlug?: string;
	/**
	 * Leave `type` out of the frontmatter, so the parse must infer `kind`
	 * from the markers alone (`_infer_choice_type`, `_parser/_choices.py`). Safe
	 * because `choiceSpecsArb` never mixes a kind's markers with another
	 * kind's signal: multiple-choice always carries a `*`, which the ladder
	 * checks first; multiple-selection and true-false markers never contain
	 * a `*`/percent or an `x`, so they fall through to the single-letter
	 * check (true-false) or the final default (multiple-selection) exactly
	 * as intended.
	 */
	omitType: boolean;
	/**
	 * `grading`/`shuffle`/`weight` frontmatter, copied verbatim into `expected`
	 * the way `apply_common_frontmatter` (`_parser/_question.py`, `weight`) and
	 * `apply_type_specific_frontmatter` (`_parser/_question.py`, `grading`/`shuffle`
	 * for every `GRADED_QUESTION_TYPES` member -- all three kinds this
	 * generator builds) do: the key is copied whenever the frontmatter carries
	 * it, including the falsy `shuffle: false` and `weight: 0`.
	 */
	grading?: (typeof GRADINGS)[number];
	shuffle?: boolean;
	weight?: number;
	preambles: string[];
	stem: string;
	choices: ChoiceSpec[];
}

function buildCase(cfg: CaseConfig): BracketListCase {
	const fmFields: string[] = [];
	if (cfg.frontmatterId) {
		fmFields.push(`id: ${cfg.frontmatterId}`);
	}
	if (cfg.title) {
		fmFields.push(`title: ${cfg.title}`);
	}
	if (!cfg.omitType) {
		fmFields.push(`type: ${cfg.kind}`);
	}
	if (cfg.grading !== undefined) {
		fmFields.push(`grading: ${cfg.grading}`);
	}
	if (cfg.shuffle !== undefined) {
		fmFields.push(`shuffle: ${cfg.shuffle}`);
	}
	if (cfg.weight !== undefined) {
		fmFields.push(`weight: ${cfg.weight}`);
	}
	const frontmatter =
		fmFields.length > 0 ? `---\n${fmFields.join("\n")}\n---\n\n` : "";

	const introBlocks = [...cfg.preambles, cfg.stem];
	if (cfg.inlineSlug) {
		introBlocks[0] = `[${cfg.inlineSlug}] ${introBlocks[0]}`;
	}

	const choiceLines = cfg.choices.map(choiceLine).join("\n");
	const source = `${frontmatter}${introBlocks.join("\n\n")}\n\n${choiceLines}\n`;

	const expected: Record<string, unknown> = {};
	const id = cfg.frontmatterId ?? cfg.inlineSlug;
	if (id !== undefined) {
		expected.id = id;
	}
	if (cfg.title !== undefined) {
		expected.title = cfg.title;
	}
	if (cfg.weight !== undefined) {
		expected.weight = cfg.weight;
	}
	expected.type = cfg.kind;
	if (cfg.preambles.length > 0) {
		expected.preamble = cfg.preambles.join("\n\n");
	}
	expected.stem = cfg.stem;
	expected.choices = cfg.choices.map((c) => choiceEntry(cfg.kind, c));
	if (cfg.shuffle !== undefined) {
		expected.shuffle = cfg.shuffle;
	}
	if (cfg.grading !== undefined) {
		expected.grading = cfg.grading;
	}

	return { kind: cfg.kind, source, expected };
}

function caseArb(kind: ChoiceKind): fc.Arbitrary<BracketListCase> {
	return fc
		.record({
			frontmatterId: optionalFrom(FRONTMATTER_IDS),
			title: optionalFrom(TITLES),
			inlineSlug: optionalFrom(INLINE_SLUGS),
			omitType: fc.boolean(),
			grading: optionalFrom(GRADINGS),
			shuffle: optionalFrom([true, false] as const),
			weight: optionalFrom(WEIGHTS),
			preambleCount: fc.integer({ min: 0, max: 2 }),
			stem: fc.constantFrom(...STEMS),
			choices: choiceSpecsArb(kind),
		})
		.chain((base) =>
			fc
				.uniqueArray(fc.constantFrom(...PREAMBLES), {
					maxLength: base.preambleCount,
				})
				.map((preambles) => ({ ...base, preambles })),
		)
		.map((cfg) => buildCase({ kind, ...cfg }));
}

/** A bracket-list document (any of the three in-scope types) with its expected parse. */
export const bracketListCaseArb: fc.Arbitrary<BracketListCase> = fc.oneof(
	caseArb("multiple-choice"),
	caseArb("multiple-selection"),
	caseArb("true-false"),
);
