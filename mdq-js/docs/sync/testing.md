# Testing

Both implementations are checked against the same examples. The suites
themselves are written in whatever is idiomatic for each language -- Pytest
and Hypothesis on one side, Vitest and Fast-check on the other -- but the
*documents* they run against are one shared corpus, not two copies of one.

## The shared corpus

The corpus lives at the root of the checkout, in [examples/](../../../examples),
outside either package. Both suites read it from disk at collection time and
generate one test per file, so adding an example extends both suites at once
and neither can quietly fall behind the other.

| Directory            | Holds                                                    |
| -------------------- | -------------------------------------------------------- |
| `examples/valid/`    | Documents that must validate, by question type           |
| `examples/valid/exam/` | Exams, plus the question bank an exam `include`s        |
| `examples/invalid/`  | Documents that `load` must reject, one violation each    |
| `examples/invalid/model-only/` | Documents that pass the schema but break a model rule |
| `examples/invalid/syntax/` | YAML/JSON that is not a document at all (broken, repeated key, not a mapping); outside the schema suites |
| `examples/grading/`  | Responses and the scores they must produce, one file per question type |

Four file shapes appear under `valid/`:

* `<name>.mdq.md` -- the surface syntax, what an author writes.
* `<name>.yaml` -- the document a conforming parser must produce from it.
* `<name>.lint.json` -- every diagnostic `load` must report for the
  document, as a list of `{code, severity, path}`. Every valid example has
  one; a clean document pins `[]`. The `.mdq.md` and the `.yaml` of a pair
  share it, and the `.yaml` side ignores the codes only the Markdown
  parser produces (`PARSER_ONLY_CODES` in `mdq-py/tests/_corpus.py`).
  Python writes these files with its lint snapshot script (see
  `mdq-py/AGENTS.md`); do not edit them by hand.
* `exam/<name>.resolved.yaml` -- for an exam with `include`/`include-all`:
  the ids of its questions after resolution against `examples/valid/exam/`
  and `with_ids`, and the diagnostics of the resolution. Not a document;
  `collectFiles` leaves it out.

The pair is the specification of the parse. A `.mdq.md` with no `.yaml`
sibling is an incomplete example and both suites fail on it.

Under `invalid/`, a `.mdq.md` has a `.lint.json` with every diagnostic of
`load`, errors included, and its `.yaml` sibling (when present) must report
the same ones. A `.yaml`/`.json` with no `.mdq.md` sibling has its own
`.lint.json`.

Because the paths resolve relative to the repo root, they mean nothing in an
installed package. Each side keeps the path logic in one development-only
module -- `mdq-py/tests/_corpus.py` and [`tests/corpus.ts`](../../tests/corpus.ts) --
which the test suite imports and library code never does.

## What each layer checks

The corpus is consumed at three levels, and an implementation picks up each
one as it grows the machinery to run it:

1. **Schema.** Every document under `valid/` validates; every document under
   `invalid/` (outside `syntax/`) is rejected. Python checks `model-only/`
   in the models, while TypeScript checks it with Zod refinements, so there
   `validateDocument` rejects it too. This needs no parser, so it is the
   first thing a port can run -- it is what pins the TypeScript Zod schemas to
   the JSON Schemas in `schema/` that Python validates with.
2. **Parsing.** Each `<name>.mdq.md` under `valid/` parses into exactly its
   `<name>.yaml` (`tests/parser.spec.ts`). This is the real parity test:
   the two parsers are separate code that must agree, character for
   character, on the same input. Each `.mdq.md` under `invalid/` is
   rejected with an error code its `.lint.json` pins
   (`tests/invalid-sources.spec.ts`): a parser code must come from
   `parseDocument`, `schema-error` from `validateDocument`, and a code of a
   layer not ported yet is listed in `LOAD_CODES` of `not-ported.ts`.
3. **Linting.** Each document produces exactly the diagnostics in its
   `.lint.json` (F6).
4. **Resolution.** Each exam with includes resolves to its
   `.resolved.yaml` (F4.1).
5. **Grading.** The response/score pairs in `examples/grading/` produce the
   expected score under each implementation's own scorer (F7).

A divergence at any layer is resolved in favour of Python, which
[README.md](README.md) names the reference implementation.

## Tracking what is not ported

The TypeScript suites run every example in the corpus, including the ones the
port does not handle yet. [`tests/not-ported.ts`](../../tests/not-ported.ts)
lists those, per layer, with the reason:

* A listed example runs as an expected failure (`it.fails`). When it starts
  to pass, the test fails until the entry is removed, so the list cannot go
  stale.
* An example that is not listed must pass. An example that Python adds
  therefore fails at once in TypeScript, which makes drift visible in CI.

Python keeps its own list, `NOT_YET_SUPPORTED` in
`mdq-py/tests/test_parser.py`, for features the reference itself does not
support yet.

## Language-agnostic tests belong in the corpus

A Python test that states a fact about the format, and not about a Python
API, moves into `examples/` before the TypeScript port of its area starts.
Examples are id derivation, parse errors, lint rules and scores. Otherwise
TypeScript has to port the test by hand and the two copies drift.

## Properties

Where Python uses Hypothesis, TypeScript uses Fast-check, and the properties
are ported rather than reinvented: `tests/slugify.spec.ts` mirrors
`mdq-py/tests/test_slugify.py` property for property, down to the shared
`assertValidUniqueSlugs` contract helper. Generators differ -- the two
libraries shrink differently and there is no point pretending otherwise --
but the invariant being asserted is the same sentence in both suites.

## Where they may differ

Only where the feature itself only exists on one side. Python additionally
tests the CLI and the Moodle/GIFT/Aiken conversions, which
[README.md](README.md) lists as deliberate non-goals for TypeScript; there is
nothing for a TypeScript test to mirror there.
