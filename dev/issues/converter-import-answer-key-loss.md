---
type: issue
status: todo
tags: [mdq-py, convert, gift, moodle-xml, short-answer, numeric]
relatedTo: [mdq-py/mdq/convert/_moodle_xml.py, mdq-py/mdq/convert/_gift.py, docs/question-types/short-answer.md, docs/question-types/numeric.md, dev/issues/converters-drop-reject.md]
---

# Moodle/GIFT import changes the answer key

Found in the mdq-py architecture review (convert B2, B3, B4). The importers
read the answers of short-answer and numeric questions without their
fraction (credit), so wrong answers become correct.

## Repro

Moodle `shortanswer`:

```xml
<answer fraction="100"><text>Brasilia</text></answer>
<answer fraction="0"><text>Rio</text><feedback><text>No</text></feedback></answer>
<answer fraction="50"><text>Sao Paulo</text></answer>
```

imports as `accept: [Brasilia, Rio, Sao Paulo]` (B2).

Moodle `numerical` with `<answer fraction="0">3</answer>` then
`<answer fraction="100">5</answer>`, and GIFT `{#=%0%3 =5}`, both import as
`answer: 3` (B3).

GIFT `{=%50%Rio#meio =Brasilia#sim}` imports as `accept: [Rio, Brasilia]`,
feedback dropped (B4).

## Expected

Short answer and numeric scores are binary
(`docs/question-types/short-answer.md` and `docs/question-types/numeric.md`,
"Grading"). So:

- 100%: `accept` (or the numeric `answer`).
- 0%: `reject`, keeping its feedback (short answer). Numeric has only
  `incorrectFeedback`.
- Partial credit (0 < f < 100) has no MDQ form: raise `ValueError` (or warn
  and drop), never promote it to full credit.

## Cause

Line numbers as of commit `e9700cc`; a parallel refactor is moving them.

- `MoodleXmlDecoder.block_to_mdq`, short-answer branch
  (`mdq-py/mdq/convert/_moodle_xml.py:456`): `fraction` is read only for the
  `*` answer.
- `numeric_from_block` (`_moodle_xml.py:530`), and
  `GiftDecoder.block_to_mdq` / `blank_from_answer`
  (`mdq-py/mdq/convert/_gift.py:435`, `:465`): numeric takes `answers[0]` /
  `options[0]`.
- `_gift.py:429` and `:461`: short answer maps every option to `accept`,
  ignoring `credit` and `feedback`.

## Fix

One helper in `mdq-py/mdq/convert/_base.py` that splits imported answers by
fraction into accept / reject / unsupported, used by both importers. The
export side of `reject` is `dev/issues/converters-drop-reject.md`; do them
together.

- Changes external behavior: yes (imported answer keys, new errors).
- Not testable via the corpus (no converter corpus): add tests to the
  converter test files.
