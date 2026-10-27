---
type: issue
status: todo
tags: [mdq-py, models, parser, normalize]
relatedTo: [mdq-py/mdq/models/_base.py, mdq-py/mdq/hypothesis/documents.py]
---

# `normalize()` and the parser disagree on some fields

Found while writing the `mdq.hypothesis` strategies. A model built from YAML
and then normalized differs from the same question parsed from Markdown:

- Choice text: `normalize()` keeps trailing spaces; the parser strips them.
- Numeric: `normalize()` does not fill `domain` or `decimalPlaces`; the
  parser infers both.
- True/false: `normalize()` does not fill `marker`; the parser gives `T`/`F`.

Decide whether `normalize()` should produce what a render/parse round trip
gives (then fix it, with `normalize: true` cases in `examples/normalize.yaml`),
or document the difference. The strategies work around it today.
