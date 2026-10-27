---
type: issue
status: todo
tags: [mdq-py, convert, gift, moodle-xml, feedback]
relatedTo: [mdq-py/mdq/convert/_gift.py, mdq-py/mdq/convert/_moodle_xml.py]
---

# Converters drop epilogue and feedback with no warning

Found in the mdq-py architecture review (convert B5, B6, B8). Each converter
drops text that the other one, or the target format, can carry. Line numbers
as of commit `e9700cc`.

## GIFT true/false export drops the epilogue (B5)

```md
Julgue.

* [T] Brasília é a capital.
* [F] Rio é a capital.

Fonte: IBGE.
```

- GIFT output has no `Fonte: IBGE.`. Moodle XML keeps it, merged into the
  shared stem (`mdq-py/mdq/convert/_moodle_xml.py:277`).
- Cause: `GiftEncoder.blocks_from_true_false`
  (`mdq-py/mdq/convert/_gift.py:292-293`) builds the group stem from `stem`
  only.
- Fix: `join_blocks(stem, question.epilogue)`, as Moodle does.

## Moodle cloze export drops choice feedback (B6)

```md
A capital é [^c].

[^c]:
* [*] Brasilia
  > yes
* [ ] Rio
  > no
```

- Moodle: `{1:MULTICHOICE:=Brasilia~Rio}`. GIFT keeps it:
  `{=Brasilia#yes ~Rio#no}`. The cloze syntax supports `#feedback`.
- Cause: `cloze_from_blank` (`_moodle_xml.py:403`) builds `MoodleAnswer`
  without `feedback`.
- Fix: pass `choice.feedback`.

## Import drops general feedback (B8)

- GIFT `::q:: Capital? {=Brasilia ~Rio ####Geral}` imports with no `Geral`.
  Only essay keeps it, as `answerKey` (`_gift.py:384`).
- Same in Moodle XML: `<generalfeedback>` is parsed
  (`_moodle_xml.py:676`) and then never read by the decoder, for every type,
  essay included (verified while writing this issue).
- Fix: map general feedback to an MDQ field (epilogue? needs a decision) or
  raise/warn. Do not drop it silently.

Changes external behavior: yes (converter output). Not testable via the
corpus: add converter tests.
