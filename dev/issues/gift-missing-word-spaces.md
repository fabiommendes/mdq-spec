---
type: issue
status: todo
tags: [mdq-py, convert, gift, fill-in]
relatedTo: [mdq-py/mdq/convert/_gift.py]
---

# GIFT missing-word import and export lose the spaces around the blank

Found in the mdq-py architecture review (convert B1).

```python
q = import_question("::q:: The capital is {=Brasilia ~Rio} today.", format="gift")
q.stem                              # 'The capital is[^blank]today.'
export_question(q, format="gift")   # '::q:: [markdown] The capital is {=Brasilia ~Rio}today.'
```

- Expected: `The capital is [^blank] today.` The GIFT missing-word format keeps
  the text on both sides of `{...}` as written.
- Actual: both spaces are lost on import; the export also drops the space
  before the tail.
- Cause: the GIFT parser strips `stem` and `tail`, and
  `GiftDecoder.block_to_mdq` joins them with no space
  (`mdq-py/mdq/convert/_gift.py:409`). `GiftBlock.__str__` appends the tail
  with no separator (`_gift.py:193-194`). Lines as of commit `e9700cc`.
- Fix: keep the original whitespace around the answer in the parsed block (or
  record whether there was any), and write it back on both sides.
- Changes external behavior: yes (imported stem text, exported GIFT).
- Not testable via the corpus: add a converter round-trip test.
