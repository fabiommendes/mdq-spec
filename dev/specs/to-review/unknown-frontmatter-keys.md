---
type: spec
status: complete
tags: [mdq, linter, frontmatter, parser, ttdd]
relatedTo: [mdq-py/mdq/parser.py, mdq-py/mdq/linter.py, mdq-py/mdq/validator.py]
---

# Handoff: lint unknown frontmatter keys

Python only (`mdq-py/`); do NOT touch `mdq-js/`.

## Problem

The parser silently drops frontmatter keys it does not recognize (questions, exams,
and question blocks inside exams). `description: ...` on a question, or a typo like
`auther:`, vanish without a trace. The linter cannot see them: it only receives the
parsed document, where they are already gone.

## Design

The parser is the only component that knows which keys it consumes, so it reports
them, through an injected sink. Parsing itself never fails because of them.

```python
# mdq/parser.py
def parse_question(text, *, warnings: list[LintWarning] | None = None) -> QuestionDict
def parse_exam(text, loader=None, *, warnings: list[LintWarning] | None = None) -> ExamDict
def parse_any(text, loader=None, *, warnings: list[LintWarning] | None = None) -> QuestionDict | ExamDict
```

- When `warnings` is given, the parser appends one `LintWarning` per unknown key.
  Without it, behaviour is unchanged.
- Rule id: `unknown-frontmatter-key`, level `default` (a dead field, probably a
  mistake). Message names the key and says it is ignored.
- `path`: `("<key>",)` for a question or exam frontmatter; `("questions", i, "<key>")`
  for the i-th (0-based) block of an exam.
- Known keys are declared once, next to the code that consumes them: the common
  question keys, per-type keys, exam keys, and exam-block keys (`include`, plus
  whatever an include entry accepts today). No scattered duplication.
- The key set must match what the parser actually reads: a known key is never
  reported, and an unknown key is always reported, for every question type.
- `mdq/validator.py`: `validate_file` on a `.mdq.md` source adds these warnings to
  `ValidationResult.warnings` (before the `lint_document` ones). `load_document`
  keeps its signature and return value.
- Docs: add the rule where the linter's rules are documented (if there is such a
  place); otherwise a short note in the module docstring of `mdq/linter.py`.

## Testing strategy

- Drift guard: for each question type (and exam), every known frontmatter key is
  either a property of that type's schema (`schema/*.yaml`, following `$ref`s) or
  a documented surface-only key. Every frontmatter key used in `examples/valid/**`
  produces no warning (run over all `.mdq.md` sources).
- Hypothesis: arbitrary key names that are not known for the type produce exactly
  one warning each with the right path; known keys produce none.
- A few examples: question typo (`auther`), exam-level unknown key, unknown key in
  the 2nd block of an exam (path `("questions", 1, key)`), and `mdq validate` CLI
  printing the warning and still exiting OK.
- Add a fixture to `examples/warnings/` only if that suite supports `.mdq.md`
  sources; otherwise skip it.

## Acceptance

- `uv run pytest tests` green, `uv run mypy mdq` clean.
- `mdq validate` on a question with `auther: X` prints a warning at `auther` (existing
  `! location: message` format, unchanged) and the document is still valid.
