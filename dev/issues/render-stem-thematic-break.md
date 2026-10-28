---
type: issue
status: todo
tags: [mdq-py, render, round-trip]
relatedTo: [examples/normalize.yaml, mdq-py/tests/test_normalize_corpus.py]
---

# A stem or epilogue that starts with `---` does not survive render

Two `normalize: true` cases of `examples/normalize.yaml` have a stem or an
epilogue that starts with a `---` thematic break. `load(q.render())` gives
`document=None` for them, so `test_normalize_corpus.py` skips them in the
render/parse round trip. Probably the renderer writes a `---` line that the
reader takes as a frontmatter fence.
