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
| `examples/invalid/`  | Documents that the schema must reject, one violation each |
| `examples/invalid/model-only/` | Documents that pass the schema but break a model rule |
| `examples/grading/`  | Responses and the scores they must produce               |

Three file shapes appear under `valid/`:

* `<name>.mdq.md` -- the surface syntax, what an author writes.
* `<name>.yaml` -- the document a conforming parser must produce from it.
* `<name>.lint.json` -- the warnings and infos the linter must report for
  the document, as a list of `{code, severity, path}`. A missing file means
  no diagnostic. Python writes these files with its lint snapshot script
  (see `mdq-py/AGENTS.md`); do not edit them by hand.

The pair is the specification of the parse. A `.mdq.md` with no `.yaml`
sibling is an incomplete example and both suites fail on it.

Because the paths resolve relative to the repo root, they mean nothing in an
installed package. Each side keeps the path logic in one development-only
module -- `mdq-py/tests/_corpus.py` and [`tests/corpus.ts`](../../tests/corpus.ts) --
which the test suite imports and library code never does.

## What each layer checks

The corpus is consumed at three levels, and an implementation picks up each
one as it grows the machinery to run it:

1. **Schema.** Every document under `valid/` validates; every document under
   `invalid/` is rejected. Python checks `model-only/` in the models, while
   TypeScript checks it with Zod refinements, so there `validateDocument`
   rejects it too. This needs no parser, so it is the
   first thing a port can run -- it is what pins the TypeScript Zod schemas to
   the JSON Schemas in `schema/` that Python validates with.
2. **Parsing.** Each `<name>.mdq.md` parses into exactly its `<name>.yaml`.
   This is the real parity test: the two parsers are separate code that must
   agree, character for character, on the same input.
3. **Linting.** Each document produces exactly the diagnostics in its
   `.lint.json`.
4. **Grading.** The response/score pairs in `examples/grading/` produce the
   expected score under each implementation's own scorer.

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
