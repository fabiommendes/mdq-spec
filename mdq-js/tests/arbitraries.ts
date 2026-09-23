/**
 * Fast-check generators for bracket-list question documents.
 *
 * `bracketListCaseArb` builds MDQ source for a `multiple-choice` /
 * `multiple-selection` / `true-false` question *alongside* the exact
 * document `parseQuestionDocument` must produce from it, the way
 * `docs/handoffs/01-parser-bracket-lists.md` asks for: title, optional id
 * (frontmatter or inline `[slug]`), an optional `type` (sometimes left out
 * of the frontmatter entirely, so the markers alone must drive
 * `_infer_choice_type`), preamble paragraphs, a stem, and N choices with
 * markers, optional explicit ids and optional per-choice feedback.
 *
 * `expected` is computed from the same config the source is built from, not
 * by calling the parser, so the property stays independent of the code
 * under test -- including the choice id, which is derived the way
 * `_slugify_choice_text` derives it (accents folded, multi-word text
 * hyphenated, a lone symbol or digit named) rather than assumed to equal
 * the lowercased text.
 *
 * The prose pools (stems, preambles, titles) are plain ASCII with no
 * markdown-significant characters (`[`, `>`, `!`, leading list markers,
 * colons), so a generated paragraph round-trips through `raw_text`'s
 * soft-wrap join unchanged -- the property is about the parser's skeleton,
 * not about prose escaping. `CHOICE_TEXTS` is the deliberate exception: it
 * mixes accented and multi-word text, backtick-quoted code, and lone
 * symbols/digits, because that variety is exactly what choice-id derivation
 * needs to be exercised against.
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
// code, and lone symbols/digits -- so the property exercises the same id
// derivation the corpus does (`_slugify_choice_text`: accents fold, spaces
// become hyphens, a lone symbol or digit gets a name, a two-backtick span
// is unwrapped first), not just the ascii-single-word fast path.
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

// Mirrors `mdq-py/mdq/parser.py`'s `DIGIT_NAMES`/`SYMBOL_NAMES`: a lone
// symbol or digit slugifies to nothing useful once punctuation is stripped,
// so it gets a name instead.
const DIGIT_NAMES: Record<string, string> = {
	"0": "zero",
	"1": "one",
	"2": "two",
	"3": "three",
	"4": "four",
	"5": "five",
	"6": "six",
	"7": "seven",
	"8": "eight",
	"9": "nine",
};
const SYMBOL_NAMES: Record<string, string> = {
	"-": "hyphen",
	"*": "asterisk",
	"+": "plus",
	"!": "bang",
	"?": "question",
	"/": "slash",
	".": "dot",
	",": "comma",
	":": "colon",
	";": "semicolon",
	"@": "at",
	"#": "hash",
	$: "dollar",
	"%": "percent",
	"&": "ampersand",
	"=": "equals",
	_: "underscore",
};

/** Ascii-fold like Python's `unicodedata.normalize("NFKD", ...).encode("ascii", "ignore")`. */
function foldAscii(text: string): string {
	return Array.from(text.normalize("NFKD"))
		.filter((ch) => (ch.codePointAt(0) ?? 0) <= 127)
		.join("");
}

function slugify(text: string): string {
	const folded = foldAscii(text).toLowerCase();
	return folded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** Port of `_slugify_choice_text` (parser.py:1386) -- the reference id derivation. */
function slugifyChoiceText(text: string): string {
	let core = text.trim();
	if (
		core.length >= 2 &&
		core[0] === "`" &&
		core[core.length - 1] === "`" &&
		core.split("`").length - 1 === 2
	) {
		core = core.slice(1, -1);
	}
	if (core.length === 1) {
		if (core in SYMBOL_NAMES) {
			return SYMBOL_NAMES[core] as string;
		}
		if (core in DIGIT_NAMES) {
			return DIGIT_NAMES[core] as string;
		}
	}
	return slugify(text) || "choice";
}

function markerArb(kind: ChoiceKind): fc.Arbitrary<string> {
	if (kind === "multiple-choice") {
		return fc.constantFrom("", ...PERCENTS);
	}
	if (kind === "multiple-selection") {
		return fc.constantFrom("", "x", "X");
	}
	return fc.constantFrom(...TRUE_FALSE_LETTERS);
}

function optionalFrom<T extends string>(
	pool: readonly T[],
): fc.Arbitrary<T | undefined> {
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
	const id = spec.explicitId ?? slugifyChoiceText(spec.text);
	const entry: Record<string, unknown> = { id, text: spec.text };
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
	 * from the markers alone (`_infer_choice_type`, parser.py:1653). Safe
	 * because `choiceSpecsArb` never mixes a kind's markers with another
	 * kind's signal: multiple-choice always carries a `*`, which the ladder
	 * checks first; multiple-selection and true-false markers never contain
	 * a `*`/percent or an `x`, so they fall through to the single-letter
	 * check (true-false) or the final default (multiple-selection) exactly
	 * as intended.
	 */
	omitType: boolean;
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
	expected.type = cfg.kind;
	if (cfg.preambles.length > 0) {
		expected.preamble = cfg.preambles.join("\n\n");
	}
	expected.stem = cfg.stem;
	expected.choices = cfg.choices.map((c) => choiceEntry(cfg.kind, c));

	return { kind: cfg.kind, source, expected };
}

function caseArb(kind: ChoiceKind): fc.Arbitrary<BracketListCase> {
	return fc
		.record({
			frontmatterId: optionalFrom(FRONTMATTER_IDS),
			title: optionalFrom(TITLES),
			inlineSlug: optionalFrom(INLINE_SLUGS),
			omitType: fc.boolean(),
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
