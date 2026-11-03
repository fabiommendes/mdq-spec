---
type: issue
status: todo
tags: [mdq-py, convert, gift, moodle-xml]
relatedTo: [mdq-py/tests/test_convert_snapshots.py, dev/specs/to-do/converter-diagnostics.md]
---

# Moodle XML: a literal `[^id]` of a fill-in imports as a blank

`mdq-py/tests/test_convert_snapshots.py` exports each valid question of the
corpus, imports the text back and exports again. One case still fails:

| Format     | Question                           | Import error                                  |
| ---------- | ---------------------------------- | --------------------------------------------- |
| moodle-xml | `valid/fill-in/blank-in-code-is-text` | `invalid-question`: `undefined-blank` capital |

The cloze export joins the stem and the epilogue in one `<questiontext>`. The
`[^capital]` of the epilogue is text there, but on import it is in the stem,
outside code, so it reads as a blank.

The importer cannot write it as literal text: by `fill-in.md`, a `[^id]` in
the plain text of a paragraph is always a blank, also as `\[^id]` or
`&#91;^id]` (both give `undefined-blank` in mdq-py). CommonMark reads `\[` as
a literal `[`. Spec decision: should `\[^id]` be literal text in a stem? If
yes, the importer escapes every `[^id]` of the Moodle text that is not a
cloze, and the GIFT importer does the same.
