---
type: issue
status: todo
tags: [mdq-py, render, numeric, round-trip, spec]
relatedTo: [docs/question-types/numeric.md, mdq-py/mdq/models/_numeric.py]
---

# Render of an integral float answer changes its meaning

`answer: "1e3"` parses to the float `1000.0`. The render writes `1000.0`,
which the parser reads as the string `"1000.0"` with `decimalPlaces: 1`
(the trailing zero is significant). So `parse(render(q))` is not a fixed
point for `"1e3"`, `"1.5e2"`, `"6.022e23"`, and the second round adds a
`decimalPlaces` that the author did not write. `normalize()` returns the
fixed point (`"1000.0"`), and `test_normalize_corpus.py` excludes these
answers from the comparison with the first round trip.

Decide in the spec: render an integral float with an exponent (`1e3`), keep
the float/int distinction out of the model, or something else.
