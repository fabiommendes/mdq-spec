# Lint diagnostic codes

Reference list of every `code` the lint pass can report, always at
`warning` or `info` severity -- never `error` (see `mdq/linter.py` and
the `unknown-frontmatter-key` rule in `mdq/parser.py`, in `mdq-py/`, and
`dev/specs/to-do/loading-module.md`). This is a different, closed set
from the `error`-severity diagnostics `mdq.load`/`mdq.parse` can also
report (a parse failure, a pydantic validation error, `wrong-kind`, an
unresolved `include`), which are not lint rules and are not listed here.

This is the reference list `mdq-js` mirrors; keep the two in sync.

| Code | Severity | Question types | Description |
| --- | --- | --- | --- |
| `answer-outside-domain` | warning | numeric | The declared `domain` contradicts the answer's own representation (e.g. `domain: integer` with a fractional answer). |
| `blank-choice-text` | warning | multiple-choice, multiple-selection, true-false, fill-in | A choice's `text` has no visible (non-whitespace) character. |
| `blank-tag` | warning | any | A `tags` entry is empty or whitespace only. |
| `blank-text-field` | warning | any | A free-text field (`title`, `author`, `preamble`, `stem`, `epilogue`, `comment`, `answerKey`) is defined but has no visible character. |
| `code-input-without-highlight` | warning | essay | `input: code` is set but no `highlight` language is given. |
| `duplicate-blank-id` | warning | fill-in | Two blanks declare the same `id`. |
| `duplicate-choice-id` | warning | multiple-choice, multiple-selection, true-false, fill-in | Two choices (or one choice blank's choices) declare the same `id`. |
| `duplicate-choice-text` | warning | multiple-choice, multiple-selection, true-false, fill-in | Two choices declare the same `text`. |
| `duplicate-question-id` | warning | exam | Two entries of `questions` (inline or `include`) resolve to the same id. |
| `exam-without-questions` | warning | exam | The exam has no questions, so it cannot be answered. |
| `false-friend-true-false-marker` | warning | true-false | Marker `S` under `locale: id` reads as true, but is the initial letter of Indonesian "salah" (false). |
| `ignored-decimal-places` | info | numeric | `decimalPlaces` is ignored when `domain` is `integer` or `fraction`. |
| `ignored-highlight` | warning | essay | `highlight` is set but ignored, since `input` is not `code`. |
| `invalid-regex` | warning | short-answer, fill-in | A delimited (`/.../`) pattern does not compile as a regex. |
| `locale-lookalike-language` | info | any | `locale`'s language subtag is a two-letter code that looks like a country code rather than a language (e.g. `cn` instead of `zh`). |
| `locale-mismatched-true-false-marker` | info | true-false | A marker is unusual for the question's `locale`, which normally writes a different letter. |
| `malformed-locale` | warning | any | `locale` is not a well-formed BCP 47 language tag. |
| `multiple-choice-many-correct-choices` | warning | multiple-choice | More than one choice has a `score >= 1`. |
| `multiple-choice-no-correct-choice` | warning | multiple-choice | No choice has a `score >= 1`. |
| `provisional-true-false-marker` | warning | true-false | The marker is a PROVISIONAL letter: true today, but a future spec revision may reassign it. |
| `redundant-regex-anchor` | info | short-answer | A `regex` starts with `^` or ends with `$`, which is redundant since matching is always a full match. |
| `relative-tolerance-around-zero` | warning | numeric | A relative tolerance around an answer of `0` can never widen the accepted range. |
| `relative-tolerance-over-one` | info | numeric | A relative tolerance greater than `1` is written as a fraction, not a percentage -- likely a units mistake. |
| `reserved-true-false-marker` | warning | true-false | Marker `X` is reserved for a selected multiple-selection choice and has no true/false meaning. |
| `shadowed-answers` | warning | short-answer | `regex` takes precedence over `oneOf`, so the listed answers are never used. |
| `short-answer-not-gradable` | warning | short-answer | No `accept`/`oneOf`/`regex` is given and the question is not `openEnded`, so nothing can grade it. |
| `stem-not-a-paragraph` | info | any | The stem starts with what looks like a heading, list, blockquote, table, or code fence rather than a paragraph. |
| `undefined-blank` | warning | fill-in | The stem references a `[^id]` marker that names no declared blank. |
| `unexpanded-stem-ellipsis` | info | any | The stem is a bare ellipsis (`...`/`…`) that was never replaced with a real statement. |
| `unknown-frontmatter-key` | warning | any | A frontmatter key is not recognized for this document/question type and was dropped. |
| `unreferenced-blank` | warning | fill-in | A declared blank is never referenced by a `[^id]` marker in the stem. |
| `unsplit-tag-list` | warning | any | A `tags` entry contains a comma; comma-splitting only applies when `tags` is written as a single string. |
| `uuid-unknown-variant` | warning | any | The UUID's variant nibble is not one of `8`, `9`, `a`, `b`. |
| `uuid-unknown-version` | warning | any | The UUID's version nibble is not one of `1`-`8`. |
| `visually-identical-choice-text` | info | multiple-choice, multiple-selection, true-false, fill-in | Two choices' texts differ only in whitespace, so they render identically. |
