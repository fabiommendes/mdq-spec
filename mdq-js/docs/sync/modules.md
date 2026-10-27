---
type: reference
status: active
tags: [mdq, mdq-js, port, sync, modules]
relatedTo: [mdq-js/docs/sync/README.md, mdq-js/docs/sync/schemas.md, dev/rfcs/0001-mdq-js-paridade.md]
---

# Module and API map

Each TypeScript module has the name of the Python module that holds the same
code, without the leading underscore and in kebab-case. A module that
differs states the reason in its header comment.

## Modules

| Python                              | TypeScript                               |
| ----------------------------------- | ---------------------------------------- |
| `mdq/__init__.py`                   | `src/index.ts`                           |
| `mdq/_loading.py`                   | `src/loading.ts`              |
| `mdq/_diagnostics.py`               | `src/diagnostics.ts`                     |
| `mdq/errors.py`                     | `src/errors.ts`                          |
| `mdq/types.py`                      | `src/schema/*`, `src/responses.ts`       |
| `mdq/_markdown.py`                  | `src/markdown.ts`                        |
| `mdq/_letters.py`                   | `src/letters.ts`                         |
| `mdq/_exact.py`                     | `src/exact.ts`                           |
| `mdq/_include_keys.py`              | `src/include-keys.ts`                    |
| `mdq/_schedule.py`                  | `src/schedule.ts`                        |
| `mdq/_banks.py`                     | `src/banks.ts`                           |
| `mdq/_parser/_<name>.py`            | `src/parser/<name>.ts` (`_blocks`, `_choices`, `_exam`, `_fill_in`, `_frontmatter`, `_numeric`, `_ordering`, `_question`, `_short_answer`, `_spaces`, `_tags`) |
| `mdq/models/_base.py`               | `src/models/base.ts` (`FamilyRules`: the validators a family adds) |
| `mdq/models/_choice.py`             | `src/models/choice.ts`                   |
| `mdq/models/_numeric.py`            | `src/models/numeric.ts`                  |
| `mdq/models/_text.py`               | `src/models/text.ts`                     |
| `mdq/models/_fill_in.py`            | `src/models/fill-in.ts`                  |
| `mdq/models/_ordering.py`           | `src/models/ordering.ts`                 |
| `mdq/models/_exam.py`               | `src/models/exam.ts` (`validateQuestionModel`, `validateExamModel`, `FAMILY_RULES`, `lint`, `lintQuestion`, `lintExam`) |
| `mdq/models/_lint.py` (common rules) | `src/models/lint.ts` (the `lint` of a family is its `FamilyRules.lint`; `baseLint` is in `base.ts`) |
| `mdq/models/_lint_codes.py`         | `src/models/lint-codes.ts` (`SEVERITY`, `lintDiagnostic`) |
| Pygments lexer aliases (`unknown-highlight-language`) | `src/pygments-aliases.json` (Pygments 2.21.0) |
| `mdq/models/_regex.py`              | `src/models/regex.ts`                    |
| `mdq/models/_query.py`              | `src/models/query.ts`                    |
| `mdq/models/_slugify.py`            | `src/models/slugify.ts`                  |
| `mdq/models/_score.py`              | `src/models/score.ts` (result types, `scoreResponse`, `prevalidate`, `scoreResponses`; each family scores in its own module: `scoreMultipleChoice`, `scoreNumeric`, `scoreShortAnswer`, `scoreFillIn`, `scoreOrdering`, ...) |
| `tests/_corpus.py`                  | `tests/corpus.ts`                        |
| `tests/strategies/`                 | `tests/arbitraries.ts`                   |

Only in TypeScript:

- `src/parser/text.ts` and `src/parser/tree.ts`: helpers that markdown-it-py
  provides and markdown-it JS does not.
- `src/validate.ts`: `validateDocument` and friends. Python validates when
  it builds the Pydantic model.

Not ported: `mdq/models/_render.py`, `mdq/convert/`, `mdq/cli/`,
`mdq/hypothesis/` (public in Python; test-only in TypeScript).

## Where a Python model goes

A Pydantic model is two things in TypeScript:

- Its shape is a Zod schema in `src/schema/`, a mirror of `schema/*.yaml`.
  The agreement test checks the mirror.
- Its validators, `lint()`, `score_response()` and other methods are
  functions in `src/models/<family>.ts`, the file that matches the Python
  module of the model. A validator is a function that returns
  `Diagnostic[]`. `validateDocument` and `load` run it after Zod accepts the
  document.

## API

| Python                                          | TypeScript                                    |
| ----------------------------------------------- | --------------------------------------------- |
| `load(src, format=, kind=)` -> `Loaded`         | `load(src, {format, kind})` -> `{document, diagnostics}` |
| `parse(src, ...)`                               | `parse(src, ...)`                             |
| `Loaded.validate(raise_on=)`                    | `assertValid(loaded, raiseOn?)`               |
| `Question.lint()`, `Exam.lint()`                | `lint(document)`                              |
| `Question.score_response(r)`                    | `scoreResponse(question, response)`           |
| `ShortAnswerQuestion.prevalidate(r)`            | `prevalidate(question, response)` -> `{valid, feedback}` |
| `Question.normalize()`                          | `normalize(question)`                         |
| `Question.with_ids()`, `Exam.with_ids()`        | `withIds(document)`                           |
| `Question.automation`                           | `automation(question)`                        |
| `Exam.resolve(bank)`                            | `resolveExam(exam, bank)`                     |
| `Exam.grading_for`, `shuffle_for`, `resolve_question` | `gradingFor`, `shuffleFor`, `resolveQuestion` |
| `Exam.score_responses(r)`                       | `scoreResponses(exam, responses)`             |
| `Question.effective_grading`, `effective_shuffle` | `effectiveGrading`, `effectiveShuffle`      |
| `effective_unmatched` (text, fill-in blank)     | `effectiveUnmatched`, `blankEffectiveUnmatched` |
| `Blank.automation`                              | `blankAutomation`                             |
| `QuestionScore`, `ExamScore`                    | types `QuestionScore`, `ExamScore`            |
| `QuestionBank`, `DictLoader`                    | `QuestionBank`, `DictLoader`                  |
| `MdqError`, `InvalidDocument`, `ParseError`     | `MdqError`, `InvalidDocumentError`, `ParseError` |

Responses follow `docs/responses.md`: plain JSON values, no `Set` or `Map`.
