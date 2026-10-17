---
type: spec
status: complete
tags: [mdq, short-answer, fill-in, diacritics, ttdd]
relatedTo: [docs/question-types/short-answer.md, docs/question-types/fill-in.md, schema/short-answer.yaml, schema/fill-in.yaml]
---

# Handoff: short-answer `diacritics`

Spec: `docs/question-types/short-answer.md` § Diacritics, and
`docs/question-types/fill-in.md` § Frontmatter (footnote 2). Python only
(`mdq-py/`). Do NOT touch `mdq-js/`.

## Already done (orchestrator)

- Docs: the § Diacritics section in `short-answer.md`, and the `diacritics` row
  in the `fill-in.md` frontmatter table.
- Schema: `schema/short-answer.yaml#/$defs/diacritics` (`fold | keep`, default
  `fold`), referenced by the short-answer and fill-in schemas. Bundles are
  regenerated.
- `mdq/types.py`: `DiacriticsType`, `ShortAnswerQuestionDict.diacritics`,
  `FillInQuestionDict.diacritics`.
- `mdq/models.py`: `Diacritics` alias. `ShortAnswerQuestion.diacritics` and
  `FillInQuestion.diacritics` default to `"fold"`. `frontmatter()` emits the field
  only when it is `"keep"`.
- `mdq/hypothesis/frontmatter.py`: `diacritics` is in the fill-in key list
  (short-answer already had it).
- Examples: `examples/valid/short-answer/diacritics-keep.{mdq.md,yaml}`,
  `examples/valid/fill-in/diacritics-keep.{mdq.md,yaml}` and
  `examples/invalid/short-answer-unknown-diacritics.yaml`.

## Rules

1. `diacritics` is an optional frontmatter field on `short-answer` and `fill-in`
   questions. Its value is `"fold"` (the default) or `"keep"`. The parser copies
   it verbatim into the parsed question, so an explicit `fold` stays in the
   output. It is a known frontmatter key for both types, so it causes no
   `unknown-frontmatter-key` warning.
2. It applies only to **plain literals**, the patterns that are compared
   inexactly. Under `fold`, the matching works as it does today: NFKC, strip
   diacritics, casefold, collapse whitespace, trim. Under `keep`, every step
   stays except stripping diacritics. So `Maceió` accepts `maceió` and
   ` MACEIÓ ` but not `Maceio`, and an NFD `Maceió` response still matches an
   NFC `Maceió` pattern.
3. Regex patterns ignore the field and follow their own `n` flag. Backtick
   (exact) literals and the `*` wildcard also ignore it.
4. It applies to every pattern list: `accept`, `reject`, `preAccept`,
   `preReject`, and the legacy `oneOf`, which becomes plain-literal accept
   patterns. The `reject` list controls which feedback a response gets, so
   `first_feedback` must use the question's `diacritics` value too.
5. On `fill-in`, the question-level `diacritics` applies to every short answer
   blank. Blanks have no `diacritics` field of their own.

## Public API (the tester targets this, the implementer provides it)

- `AnswerPattern.matches(response: str, *, diacritics: Diacritics = "fold") -> bool`
- `first_feedback(patterns, response, *, diacritics: Diacritics = "fold") -> list[str]`
- `ShortAnswerQuestion.score_response(response)` uses `self.diacritics`.
- `FillInQuestion.score_response(response)` uses `self.diacritics` for its
  short answer blanks.
- `parse_question` / `parse_file` return `diacritics` when the frontmatter has it.

## Implementation scope

- `mdq/parser.py`: read `diacritics` for short-answer and fill-in, and add it to
  `TYPE_QUESTION_KEYS` for both types.
- `mdq/models.py`: pass `diacritics` through `AnswerPattern.matches`,
  `first_feedback`, `short_answer_matches`, and the two `score_response`
  methods. The plain-literal comparison needs a normalization that does not
  strip diacritics. Do not change `mdq.regex.normalize_text`, which the `n`
  flag uses.

## Testing strategy

- Model level: parametrized `AnswerPattern.matches` cases for each rule above,
  under both values: plain, regex with and without `n`, backtick, `*`, NFD vs
  NFC, case and whitespace under `keep`.
- `score_response` on a short-answer question with `keep`: score, and reject
  feedback chosen with `keep`. The same for a fill-in short answer blank.
- The parser is covered by the example pairs. The unknown-key check is covered
  by `test_unknown_frontmatter_keys.py` through the examples.
- Reuse the existing test files (`tests/test_short_answer.py`, the scoring
  tests). Hypothesis is welcome for "under `fold`, a pattern and its
  accent-stripped form always match". Keep it small.

## Acceptance

- `uv run pytest tests` green, except the known failure
  `test_hypothesis.py::test_code_block_round_trips_verbatim`
  (`dev/issues/hypothesis-whitespace-code-block.md`). `uv run mypy mdq` clean.
- These are currently red: `test_parser.py::test_parses_matches_fixture` for
  `short-answer.diacritics-keep.mdq.md` and `fill-in.diacritics-keep.mdq.md`,
  and the matching `test_unknown_frontmatter_keys.py` cases.
