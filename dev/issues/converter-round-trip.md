---
type: issue
status: todo
tags: [mdq-py, convert, gift, moodle-xml]
relatedTo: [mdq-py/tests/test_convert_snapshots.py, dev/specs/to-do/converter-diagnostics.md]
---

# Export of an imported question is not the same text

`mdq-py/tests/test_convert_snapshots.py` exports each valid question of the
corpus, imports the text back and exports again. These cases give a
different second export (the `reexport` entries of
`mdq-py/tests/snapshots/convert/*.json`):

| Format     | Question                                         | Second export          |
| ---------- | ------------------------------------------------ | ---------------------- |
| gift       | `valid/fill-in/nbsp-after-blank-definition`      | differs                |
| gift       | `valid/multiple-choice/nbsp-after-choice-marker` | differs                |
| gift       | `valid/short-answer/em-space-starts-pattern-line`| differs                |
| gift       | `valid/short-answer/nbsp-on-tag-line`            | differs                |
| gift       | `valid/short-answer/nbsp-starts-pattern-line`    | differs                |
| gift       | `valid/numeric/exponent-string-answer`           | error: no exact float  |
| moodle-xml | `valid/fill-in/incorrect-feedback`               | `*` becomes `\*`       |
| moodle-xml | `valid/numeric/exponent-string-answer`           | error: no exact float  |

- GIFT: the export keeps a Unicode space (NBSP, em space) at the start of an
  answer (`{=\u00a0Brasília}`); the import strips it.
- Moodle XML: the export writes the `incorrectFeedback` of a cloze short
  answer as the catch-all `~*#...`. The import reads it back as something
  that the second export writes as the literal `~\*#...`, so the catch-all
  becomes a literal answer.
- `exponent-string-answer`: the import writes the float as a string answer
  that the export then rejects.

Check each one against the inventory of `converter-diagnostics.md` before a
fix: some may be losses that the spec turns into warnings.
