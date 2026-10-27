---
type: issue
status: todo
tags: [mdq-py, banks, include]
relatedTo: [mdq-py/mdq/_banks.py, docs/exam.md, schema/question-base.yaml]
---

# Question banks index invalid questions

Found in the mdq-py architecture review (cli B6). Needs a decision first.

```python
DictLoader({"q2": {"type": "bogus", "tags": ["geo"]}}).tagged("geo")
# {'q2'}
DictLoader({"q3": {"type": "essay", "stem": "x", "tags": "geo, mar"}}).tagged("geo")
# {'q3'}
```

- Actual: `_tags` (`mdq-py/mdq/_banks.py:179`) only checks that a source
  parses to a mapping that is not an exam. A mapping of an unknown type is
  indexed, and a comma string `tags` on a mapping source is split, although
  the schema requires an array.
- The `FileLoader` docstring says "a file ... that does not parse is not a
  question of the bank". It does not say whether "parse" means a valid model.
- Decide: (a) index only sources that validate as a question (slower: a full
  model build per source); (b) keep the cheap check, but reject unknown
  `type` and a non-array `tags` on a mapping; (c) keep as is and fix the
  docstring. Recommend (b).
- Changes external behavior: yes for (a) and (b) (`includeAll` selects fewer
  questions).
- Not testable via the corpus (`DictLoader` mapping sources): add a unit
  test.
