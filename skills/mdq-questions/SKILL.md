---
name: mdq-questions
description: Write questions and exams in MDQ, a markdown format for quizzes and exams (.mdq.md files). Use when authoring, reviewing or converting questions - multiple choice, multiple selection, true/false, short answer, numeric, fill-in-the-blanks, essay, ordering - or when assembling them into an exam.
---

# Writing MDQ questions

MDQ writes a question as a markdown file. The question type is **inferred from
the body**, so in most cases you write plain markdown and nothing else.

Files use the `.mdq.md` extension (`.md` and `.mdq` also work); a single file
holds one question, or one exam with many. Validate with `mdq validate <file>`
when the reference implementation is available.

Spec: https://github.com/fabiommendes/mdq-spec (`docs/question-types/`,
`docs/exam.md`, plus worked pairs of markdown + expected YAML in `examples/`).

## Anatomy

```md
---
# Optional comment string (stored, unlike a YAML comment after a blank line).
id: capital-br
title: Capital of Brazil
tags: geography, brazil
---

Optional preamble paragraphs.

What is the capital of Brazil?

* [ ] Lisbon
* [*] Brasília

Optional epilogue paragraphs.
```

The last paragraph before the body is the **stem** (required) and the list is
the **body** (required, and what decides the question type). Everything else is
optional.

* Frontmatter fields: `type`, `title`, `id`, `uuid`, `tags`, `author`,
  `locale`, `meta`, plus per-type ones. Frontmatter always wins over anything
  written in the body.
* Write the stem as `...` to get the default instruction for the type.
* `[slug]` at the start of the first paragraph sets the id: `[Q1] What is ...`.
* Never use H1 headings inside a question, and do not start a paragraph or a
  list item with `[` unless it is a real tag.

## Pick a type

| You want                             | Body                                | Reference |
| ------------------------------------ | ----------------------------------- | --------- |
| One right answer out of several      | `* [ ]` / `* [*]` list              | [multiple-choice](references/multiple-choice.md) |
| Tick all that apply                  | `* [ ]` / `* [x]` list              | [multiple-selection](references/multiple-selection.md) |
| Judge each statement true or false   | `* [T]` / `* [F]` list              | [true-false](references/true-false.md) |
| A short typed word or phrase         | `[short-answer]: ...`               | [short-answer](references/short-answer.md) |
| A number, with tolerance             | `[numeric(unit)]: ...`              | [numeric](references/numeric.md) |
| Gaps inside a sentence               | `[^slug]` markers + definitions     | [fill-in](references/fill-in.md) |
| Free text, graded by hand            | `[essay]`                           | [essay](references/essay.md) |
| Sort lines into the right order      | `[ordering]` + code block or list   | [ordering](references/ordering.md) |
| Several questions in one file        | `# Title` + `===` separators        | [exam](references/exam.md) |

Set `type:` in the frontmatter only to disambiguate; otherwise let it be inferred.

## Feedback and comments

Anywhere a choice or pattern is listed, indent `>` lines for student feedback
and `!` lines for instructor-only comments:

```md
* [ ] Rio de Janeiro
  > It was the capital until 1960.
  ! Most common wrong answer.
```

## Grading

Choice-based types (multiple choice, multiple selection, true/false, fill-in)
take `grading` in the frontmatter:

* `symmetric` (default) — wrong answers subtract, so guessing averages zero.
* `partial` — credit per correct item, never negative.
* `all-or-nothing` — everything right or zero.

Short answer and numeric are always binary (1 or 0). Essay is always manual.

## Checklist

* Stem present and non-empty; body present.
* Choice texts unique; give explicit `[choice-id]`s when ids matter.
* At least one correct answer, and not all of them correct.
* Numeric answers that are not integers carry a tolerance.
* Prefer an explicit `id` and `title`.
