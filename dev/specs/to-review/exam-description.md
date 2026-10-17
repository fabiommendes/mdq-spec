---
type: spec
status: complete
tags: [mdq, exam, description, ttdd]
relatedTo: [docs/exam.md, schema/exam.yaml, exam-start-duration]
---

# Handoff: exam `description`

Spec: `docs/exam.md` § Frontmatter and § Inheritance. Python only (`mdq-py/`);
do NOT touch `mdq-js/`.

## Already done (orchestrator)

- `schema/exam.yaml`: `description: string, minLength: 1`. Bundles regenerated.
- `mdq/types.py`: `ExamDict.description: str`. `mdq/models.py`: `Exam.description: str | None`.
- Examples: `examples/valid/exam/scheduled.{mdq.md,yaml}` now carry a description;
  `examples/invalid/exam-empty-description.yaml`.

## Rules

- Optional plain string, read only from the exam frontmatter. No H1/body form.
- Copied verbatim into the parsed exam (`parse_exam`), like `course`.
- NOT inherited: questions inside the exam never receive it, and a question's own
  frontmatter `description` (not a question field) is not affected by this change.
- Empty string is invalid by schema (`minLength: 1`); the parser does not reject it
  itself, same as `course`/`title`.
- `mdq show` for an exam: "Description" row when set.

## Testing strategy

- One parser test: frontmatter `description` lands in the parsed exam and in no question.
- One `mdq show` test for the row.
- Example pair and invalid fixture are already covered by the existing suites.
- Keep it minimal: this is a pass-through field.

## Acceptance

- `uv run pytest tests` green, `uv run mypy mdq` clean.
- `test_parser.py::test_parses_matches_fixture[exam.scheduled.mdq.md]` passes (currently red).
