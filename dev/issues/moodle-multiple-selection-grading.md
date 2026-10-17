---
type: issue
status: completed
tags: [mdq-py, convert, moodle-xml, gift, multiple-selection, grading]
relatedTo: [mdq-py/mdq/convert/_moodle_xml.py, mdq-py/mdq/convert/_gift.py, docs/question-types/multiple-selection.md]
closed: 2026-10-02
---

# Moodle/GIFT export of multiple selection ignores the MDQ grading strategy

Found 2026-09-29 while checking the Moodle grade list (commit `98ee35e`).
Not verified yet.

## What the code does

`MoodleXml.block_from_selection` (`mdq/convert/_moodle_xml.py`) exports a
multiple-selection question as a Moodle `multichoice` with `single=false`:

- each correct choice gets `1/n_correct`;
- each incorrect choice gets `-1/n_incorrect`;
- the question's `grading` field (`partial`, `all-or-nothing`,
  `symmetric`) is not read at all.

`selection_from_block` imports it back with only `correct = fraction > 0`,
so the per-choice grades and any grading intent are dropped.

Since `98ee35e`, a question with more than 10 correct or more than 10
incorrect choices raises, because `1/11` is not a Moodle grade.

## What to check

1. How Moodle scores a `multichoice` with `single=false`: sum of the
   fractions of the selected choices, clamped to `[0, 1]`? Read
   `question/type/multichoice/question.php` (Moodle 4.5).
2. Which MDQ strategy (`docs/question-types/multiple-selection.md`,
   "Grading") that scoring matches, if any. Compare with a table of cases,
   like the one in the true-false spec.
3. For each strategy, whether a Moodle fraction assignment exists that
   gives the same score, using only grades from Moodle's list. If not,
   decide: raise, warn, or export the nearest behavior.
4. Moodle's "all-or-nothing" multiple choice is a separate qtype
   (`qtype_multichoiceset`, a plugin). Check if the export should target it
   for `grading: all-or-nothing`.
5. Import: map Moodle fractions back to a `grading` value when the pattern
   matches one, instead of dropping it.
6. Same questions for the GIFT converter (`mdq/convert/_gift.py`).

Work test-first. Tell the "mdq-js" session only if the MDQ model or spec
changes: it does not port the converters.
