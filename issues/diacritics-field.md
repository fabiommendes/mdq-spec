# Implement the `diacritics` frontmatter field

Specified in [short-answer.md](../../question-types/short-answer.md#frontmatter),
not yet implemented. The spec now matches what the code already does by
default, so this is an addition rather than a correction.

`diacritics` is `"fold"` (the default, current behaviour) or `"keep"`. It
governs only literals compared inexactly: a backtick-enclosed answer is already
verbatim, and a regex answers to its own `n` flag.

## Sites

* `schema/short-answer.yaml` and `schema/fill-in.yaml` -- a string enum
  alongside the other short-answer fields, defaulting to `"fold"`.
* `mdq/types.py` -- `ShortAnswerQuestionDict`, `ShortAnswerBlankDict`.
* `mdq/models.py` -- `ShortAnswerQuestion` and `ShortAnswerBlank` gain the
  field, and it has to reach `AnswerPattern.matches`. Note `matches` shed its
  `exact` keyword in the previous change precisely because exactness moved into
  the pattern; `diacritics` is a genuine question-level setting, so it does
  belong in the call, and `module-level normalize_text` needs a parameter for
  it rather than always calling `strip_accents`.
* `mdq/parser.py` -- frontmatter plumbing.
* An example pair under `examples/valid/short-answer/`, plus a test that
  `keep` makes an inexact `Brasília` reject `Brasilia`.

## Naming

`"fold"`/`"keep"` was chosen over a boolean to avoid a negative name
(`keepAccents: false`) and to leave room for a third mode later -- a "require"
that rejects an unaccented answer with feedback rather than silently, say.
