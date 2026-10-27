---
type: issue
status: todo
tags: [mdq-py, parser, frontmatter, diagnostics]
relatedTo: [docs/question-types/question-base.md, mdq-py/mdq/_parser/_question.py]
---

# A field that starts with `---` is read as a frontmatter

Found in the mdq-py architecture review (parser B1, major).

Repro (dict input, so the field text reaches the field helpers as is):

```python
mdq.parse({"type": "essay", "stem": "---\n\nfonte: IBGE\n\n---\n\nQual?"}).normalize().stem
# 'Qual?'
mdq.load({"type": "essay", "stem": "---\n\n# Título\n\n---\n\nQual?"})
# no forbidden-block-element; only unsafe-thematic-break
mdq.load({"type": "essay", "stem": "---\n\n[x: y\n\n---\n\nQual?"})
# schema-error "invalid YAML frontmatter"
```

The same happens to an epilogue (`"---\nfonte: IBGE\n---\n\nFim."` normalizes
to `'Fim.'`) and to an answer key.

- Expected: `---` in a field is a thematic break (only `unsafe-thematic-break`,
  `docs/question-types/question-base.md`, Additional Rules). An H1 in a stem
  gives `forbidden-block-element` (same doc, "Forbidden elements").
- Actual: `normalize()` drops three blocks silently, the H1 check is skipped,
  and invalid YAML gives a frontmatter error on a field.
- Cause: `MDQParser.__post_init__` (`mdq-py/mdq/_parser/_question.py:322`)
  always splits off a frontmatter. `reconstruct_blocks`,
  `find_forbidden_elements`, `find_answer_key_forbidden_elements` and
  `find_stray_choice_markers` (same file) build a full `MDQParser` for one
  field.
- Fix: split a block reader out of `MDQParser` with no frontmatter split, and
  use it in the field helpers (review item P1).
- Changes external behavior: yes (`normalize()` output, new diagnostics on
  documents that were silently accepted).
- Regression test: add a corpus example under examples/ rather than a new test
  function.
