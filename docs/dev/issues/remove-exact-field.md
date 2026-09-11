# Remove the question-level `exact` field

Scheduled for after the spec review, as one coherent change.

Exactness used to be declared once per question -- `exact: true` in the
frontmatter, or the `[short-answer/exact]` body suffix -- and applied to
`oneOf` and to every plain literal in `accept`/`reject` at once. The spec now
declares it per pattern, by enclosing the pattern in backticks:

```md
[short-answer]: `math.isnan`
```

So the question-level flag is redundant and comes off. Note this is not a field
deletion but a move from a question-wide switch to a per-pattern one: a single
question can now mix exact and inexact patterns, which it could not before.

## Decisions already taken

* The legacy `regex` field desugars **without** the `i` flag. Regexes are
  case-sensitive by default; an author who wants case-insensitivity writes it,
  as documented under [Regex flags](../../question-types/short-answer.md#regex-flags).
  This changes behaviour for any existing document that used `regex` without
  `exact: true`, which is the case that silently got `i` before.
* `oneOf` entries become ordinary pattern strings: bare is inexact,
  backtick-enclosed is exact.

## Sites to change

* `schema/short-answer.yaml` -- drop the `exact` property; teach
  `patternString` the backtick form; fix the `oneOf` description, which
  currently says "after the normalization implied by `exact`".
* `schema/fill-in.yaml` -- same two spots (`exact` at :127, `oneOf` at :113).
* `mdq/types.py` -- `ShortAnswerQuestionDict.exact`, `ShortAnswerBlankDict.exact`.
* `mdq/models.py` -- the flag is threaded through `AnswerPattern.matches`,
  `first_feedback`, the accept/reject scoring path and `to_dict`. Exactness
  moves into the pattern itself, so `matches` loses its `exact` keyword.
* `mdq/parser.py` -- the `variant` alternation still lists `exact`, plus the
  frontmatter plumbing and the "cannot combine" check, which no longer has
  anything to guard.
* `mdq/show.py` -- `exact` is passed down to the renderer.
* `examples/valid/short-answer/exact.*` and `exact-block.*` -- rewrite in the
  backtick notation, or retire.
* `tests/` -- `test_short_answer.py` (the `/exact` suffix and combine-blocks
  cases), `test_render.py`, `test_scoring.py`.

Because the Pydantic models mirror the schemas, the schema and model edits have
to land together; splitting them leaves the repo in a state CLAUDE.md forbids.
