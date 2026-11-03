---
type: spec
status: review
tags: [mdq-py, convert, gift, moodle-xml, aiken, diagnostics, cli]
relatedTo: [mdq-py/mdq/convert/_base.py, mdq-py/mdq/convert/_gift.py, mdq-py/mdq/convert/_moodle_xml.py, mdq-py/mdq/convert/_aiken.py, mdq-py/mdq/cli/_convert.py, mdq-py/README.md, dev/issues/converter-remaining-losses.md]
---

# Converter diagnostics: best-effort conversion with warnings

Python only (`mdq-py/`). mdq-js has no converters, so there is no port.

## Status (2026-11-03)

Implementado em `mdq-py/` (todos os requisitos R1 a R18 e os critérios A1 a
A10). Falta só a revisão. Testes novos: `mdq-py/tests/test_convert_diagnostics.py`;
os snapshots passaram a registrar os diagnósticos (`export_diagnostics`,
`import_diagnostics`).

Escolhas técnicas, onde a spec deixa espaço:

- `invalid-xml-character` continua erro: descartar o caractere mudaria uma
  resposta ou um enunciado, e o Moodle rejeitaria o arquivo.
- Caminhos: relativos ao `Report.under(...)` (`("blanks", i, ...)` dentro de um
  blank); itens de `accept`/`reject` por índice na lista da pergunta; o que não
  tem campo no MDQ (elementos `<hint>`, arquivos) usa `()`.
- `grading` de múltipla escolha não é reportado (vira o score de cada
  alternativa); o `grading-changed` do XML vale para toda seleção múltipla,
  também com `grading` padrão.
- `field-dropped` extra, fora do inventário: `feedback` de afirmações de
  verdadeiro ou falso (GIFT e XML), `unit` de blank numérico no XML (cloze),
  `<usecase>1` (`case-sensitivity-dropped`, e o regex do curinga respeita).
- Diretriz de mensagens: aviso sem o prefixo `cannot convert ...`; o erro
  mantém o prefixo.
- Sem alternativa `*` literal no GIFT: `=*` é "qualquer outra resposta"; o
  literal é `\*`.
- `ConversionError(diagnostics, raise_on)` e `ConversionWarning` em `mdq.errors`.
- `ValueError` simples de um parser ou de `to_mdq` (fração que não é número)
  vira `syntax-error` (parser) ou `invalid-question`.

Feito antes, sem mudança de comportamento além da classe da exceção:

Done before the rest, with no change of behavior other than the exception
class:

- R2: `mdq.errors.ConversionError`, with `.diagnostics` and `.code`.
- R6: `mdq.convert.CONVERTER_CODES` (`mdq/convert/_codes.py`). Every raise
  site of the inventory raises `ConversionError` with the code of its row,
  and the registry declares every code as an error for now. When a row
  becomes a warning, its severity changes, not its name.
- Codes not in the inventory, for raise sites it did not list:
  `blank-line-after-blank` (X20, removed by R10), `missing-word-boolean`
  (X27, removed when it is fixed), `blank-in-html-block` (`html_to_mdq`, a
  blank inside an HTML block), `not-a-number` (a numeric answer text that is
  not a number), `invalid-question` (the converter built a question the
  models reject), `invalid-xml-character` (the Moodle XML export of
  a character that XML 1.0 forbids, such as a form feed).
- `import_question` raises `ConversionError` with `syntax-error` (and `line`)
  for a `ParserError`, as R3 asks of `load_question`.
- `mdq-py/tests/test_convert_snapshots.py` records what each converter does
  with the valid corpus, through the public interface. A change of behavior
  shows as a diff of `mdq-py/tests/snapshots/convert/*.json`.

## Problem

- Every imperfect conversion raises `ValueError("cannot convert ...")`. One
  score that is not a Moodle grade, or one regex among ten literal answers,
  rejects the whole question. Formats diverge often, so all-or-nothing makes
  the converters close to useless on real banks.
- Some losses are silent: the GIFT export drops the `incorrectFeedback` of a
  short answer and of short-answer and numeric blanks; the import drops 0%
  numeric answers (with their feedback), the feedback of the 100% numeric
  answer and duplicate 100% numeric answers; Aiken drops every feedback and
  all partial credit. The full list is in the inventory below.
- The GIFT export writes blank lines inside a question (multi-paragraph stem,
  epilogue, true/false group). Moodle's `qformat_default::readquestions`
  (question/format.php) splits questions at every blank line and trims every
  line, so Moodle reads those files as broken questions.

## Decisions

- A conversion returns the result and a list of `mdq.Diagnostic`
  (`severity`, `code`, `message`, `path`, `line`). The codes are
  converter-specific kebab-case codes.
- **warning**: the target cannot hold something; the converter does its best
  (rounds a grade, drops a feedback, drops a regex) and reports it.
- **error**: the output would be meaningless or rejected by the target (a
  multi-blank fill-in to GIFT, a short answer with no literal answer left).
  The first error stops the conversion: there is no result.
- **info**: metadata that does not affect what the student sees or how they
  are graded (`comment`, `author`, `uuid`, `locale`, unknown `meta` keys) is
  dropped.
- Silent losses become warnings or info, or are fixed where the target can
  hold the data.
- The CLI writes the result and prints the diagnostics to stderr. `--strict`
  turns warnings into errors (today's behavior: no output, exit 1).
- Converter codes are documented in a table in the mdq-py README, not in
  `docs/lint-codes.md`. Reason: they are not spec rules, and both
  `scripts/spec_audit.py` (step 6: every code in `lint-codes.md` must be
  declared in an "Additional Rules" table of `docs/`) and
  `mdq-py/tests/test_lint_codes_consistency.py` (every documented code must be
  produced by the example corpus) would fail for them.
- GIFT leniency: the importer keeps accepting blank lines before and inside
  the answer body, with a warning, and keeps indentation. The exporter writes
  only what Moodle reads: no blank line inside a question (encoded with the
  GIFT `\n` escape, which Moodle's `escapedchar_pre`/`escapedchar_post` turn
  into a line feed).
- A path in a diagnostic is always a path in the MDQ question: of the source
  question on export, of the produced question on import.

## Requirements

### API

R1. `mdq.convert` exports a generic frozen dataclass `Converted[T]`:

- `value: T | None`: the result, `None` if some diagnostic is an error.
- `diagnostics: list[Diagnostic]`, in the order found.
- `__bool__`: true if `value` is not `None`.
- `validate(raise_on: Severity = "error") -> T`: return `value`, or raise
  `ConversionError` if `value` is `None` or a diagnostic is at or above
  `raise_on`. It mirrors `Loaded.validate`.

R2. `mdq.errors.ConversionError(MdqError)` carries every diagnostic
(`.diagnostics`), like `InvalidDocument`. Its message is the message of the
first diagnostic at or above the threshold, prefixed as today
(`cannot convert to GIFT: ...`), so `except ValueError` and existing message
checks keep working.

R3. Full-control functions, which never raise for a problem in the document:

```python
def load_question(
    source: str, /, *, format: str, html: Literal["block", "markdown"] = "block"
) -> Converted[Question]: ...

def dump_question(question: Question, /, *, format: str) -> Converted[str]: ...
```

- A syntax error of the source (`ParserError`) becomes an error diagnostic
  `syntax-error` with `line` set (1-based, as `Diagnostic.line` elsewhere).
- An unknown `format` still raises `ValueError` (a programming error, not a
  document problem).
- `dump_question` of a type the format does not support returns the error
  `unsupported-type`. `export_question` no longer raises `TypeError` for it.

R4. The simple calls keep their signatures, plus keyword options:

```python
def import_question(
    source: str, /, *, format: str, strict: bool = False,
    html: Literal["block", "markdown"] = "block",
) -> Question: ...

def export_question(question: Question, /, *, format: str, strict: bool = False) -> str: ...
```

- They raise `ConversionError` on an error, and on a warning if `strict`.
- Otherwise each warning is emitted with
  `warnings.warn(ConversionWarning(diagnostic))`, so it is never silent.
  `mdq.errors.ConversionWarning(UserWarning)` keeps the diagnostic in
  `.diagnostic`. Info diagnostics are not emitted.

R5. `ConversionBase.to_mdq` and `from_mdq` take a reporter that collects
diagnostics (`report.warning(code, message, path)`, `report.info(...)`,
`report.error(...)`, the last one stops the conversion). The names are free;
the reporter is internal. The converter classes stay internal.

R6. `mdq/convert/` declares every code with its severity in one registry (for
example `CONVERTER_CODES: dict[str, Severity]`). A code has one severity. No
code is also a code of `docs/lint-codes.md`.

### CLI

R7. `mdq import` and `mdq export`:

- Print each diagnostic to stderr as `<severity>: <message> [<code>]`,
  followed by ` at <path>` when the path is not empty, in the order found.
  Info lines are printed too.
- Without errors: write the output, exit 0, also with warnings.
- With an error: write nothing, exit 1 (`EXIT_INVALID`).
- `--strict`: a warning counts as an error (no output, exit 1).
- `mdq import --html {block,markdown}` selects R16. Default `block`.

### Best-effort behavior

R8. Each row of the inventory below is implemented with its severity, code
and best-effort behavior. The messages name the format and the dropped or
changed value.

R9. A field of the MDQ question with a non-default value that the target has
no place for reports `field-dropped` (warning) when it changes what the
student sees or how the response is graded, and `metadata-dropped` (info)
otherwise (`id`, `comment`, `author`, `uuid`, `locale`, `meta` keys other than
`generalFeedback`). Decisão humana (2026-11-03): `id` é `metadata-dropped`,
porque quase toda questão tem um e o aluno não o vê; a CLI só mostra um info
com `-v`/`--verbose`. One diagnostic per field, at its path. The per-format
lists are in the inventory (rows S20 to S22).

### GIFT

R10. The GIFT export never writes a blank line inside a question. Each blank
line inside a text is removed and the line before it gets a trailing `\n`
escape (`a\n\nb` is written as the two lines `a\n` and `b`). Moodle reads
both forms back as `a\n\nb`. The fill-in "tail has a blank line" error goes
away.

R11. The GIFT parser unescapes exactly what Moodle's `escapedchar_pre`
unescapes: `\\`, `\:`, `\#`, `\=`, `\{`, `\}`, `\~`, and `\n` (a line feed).
Any other backslash stays, as in Moodle (`\*` stays `\*`, a Markdown escape in
a stem and a literal asterisk in a short answer). Today `unescape_text` drops
every backslash and reads `\n` as `n`. Cloze keeps its own rules
(`escape_cloze_text`).

R12. The GIFT importer reads a lone `*` short answer as Moodle does, like the
Moodle XML importer (`short_answer_key(..., any_answer=True)`): at 0% with
feedback it is the `incorrectFeedback`, at 100% it is `accept: /.*/`. The
GIFT export writes `incorrectFeedback` of a short answer, and of short-answer
and numeric blanks, as `=%0%*#feedback`, which Moodle stores as a `*` answer
(a wildcard in `qtype_shortanswer`). A literal `*` answer is written `\*`
(R11), so it does not clash.

R13. The GIFT importer keeps reading blank lines before the `{` and inside the
answer body, and reports `gift-blank-line` (warning, path `()`, `line` of the
blank line) once per question: Moodle would split the question there. It
keeps the indentation of each line; no diagnostic.

R14. The GIFT export reports `indentation-lost` (warning) for each text field
with a line, other than the first, that starts with a space or tab: Moodle
trims every line, so an indented code block or a nested list changes.

### Moodle XML

R15. A true/false group exported as several `truefalse` questions gives each
one `defaultgrade = weight / n` (n statements), so the group keeps its total
weight. The import sums the `defaultgrade` of the group. Today every
statement gets the full `weight`.

### HTML text on import

R16. `html="markdown"` converts every HTML text of the import (GIFT `[html]`;
Moodle `html`, and `wiki_like` or unknown formats, which are read as `html`)
to Markdown with `markdownify`, instead of the default `html="block"`
(`html_to_mdq`, one `<div>` HTML block with no blank line).

- `markdownify` (MIT) is an optional dependency: extra `mdq[html]` in
  `mdq-py/pyproject.toml`, imported only when `html="markdown"`.
- If it is missing, `load_question`/`import_question` raise `ImportError`
  with the message `html="markdown" needs the markdownify package: install
  mdq[html]`, before parsing the source. The CLI prints it as `error: ...`
  and exits 2.
- A Moodle cloze question text is converted as a whole, with each blank
  replaced by a placeholder that markdownify keeps, then the `[^blankN]`
  markers are put back. Converting segment by segment would split HTML
  elements.
- The option does not apply to short-answer or numeric answer texts (they are
  not Markdown, as today).

### Documentation

R17. The mdq-py README "Converters" section replaces "There is no warning
channel ..." with the new model, documents `load_question`, `dump_question`,
`strict`, `html` and the CLI flags, and has a "Converter diagnostics" table:
code, severity, formats, direction, best-effort behavior. The "Answer key"
table and the general feedback section are updated to the new behavior.
`mdq-py/docs/api/mdq.convert.rst` lists the new names.

R18. `[Unreleased]` in `mdq-py/CHANGELOG.md`: the new API, the CLI flags, the
`TypeError` to diagnostic change, the GIFT `*`, `\n` and backslash changes, the
true/false weight split, the `mdq[html]` extra.

## Inventory

Function names, not line numbers: another agent is editing these files.
"Export" is MDQ to the format, "import" is the format to MDQ. W: warning,
E: error, I: info.

### Current raise sites

| #   | Site (function)                                       | Dir    | Formats                    | Today                                                    | New  | Code                      | Best-effort behavior                                                                                                                                                                                                 |
| --- | ----------------------------------------------------- | ------ | -------------------------- | -------------------------------------------------------- | ---- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X1  | `_base.moodle_score` (via `moodle_percent`)            | export | GIFT, Moodle XML           | a score not in `MOODLE_GRADES` raises                     | W    | `score-rounded`           | Use the nearest grade of `MOODLE_GRADES` (ties to the one closer to 0). Message has both values. Covers multiple-choice choices, GIFT choice blanks and the multiple-selection shares (1/11 becomes 1/10).                    |
| X2  | `_base.float_answer`                                  | export | GIFT, Moodle XML           | a non-float answer (`"1/3"`) without tolerance raises     | W    | `inexact-answer`          | Write the nearest float, tolerance 0. Message says only that float is accepted and suggests a tolerance.                                                                                                              |
| X3  | `_base.require_automatic`                             | export | GIFT, Moodle XML           | short answer with `unmatched: manual` raises              | W    | `manual-grading-dropped`  | Export the literal answers; a response that matches none gets 0 instead of waiting for the instructor. With no `accept`, X5 applies.                                                                                 |
| X4  | `_base.literal_text`                                  | export | GIFT, Moodle XML           | a regex pattern raises                                   | W    | `regex-dropped`           | Drop the pattern (accept or reject) with its feedback. If no `accept` is left, X5.                                                                                                                                  |
| X5  | `_base.literal_answers`                               | export | GIFT, Moodle XML           | empty or missing `accept` raises                          | E    | `no-accept`               | None: no response could be correct.                                                                                                                                                                                  |
| X6  | `_base.exported_general_feedback`                     | export | GIFT, Moodle XML           | `meta.generalFeedback` not a visible string raises        | W    | `general-feedback-dropped`| Drop it.                                                                                                                                                                                                             |
| X7  | `_base._credit_kind` (via both key helpers)            | import | GIFT, Moodle XML, cloze    | partial or negative credit raises                         | W    | `partial-credit-dropped`  | Short answer: the answer goes to `reject` (0, feedback kept). Numeric: the answer is dropped. Never gives more credit than the source.                                                                                |
| X8  | `_base.short_answer_key`                              | import | GIFT, Moodle XML, cloze    | `*` inside a short answer raises                          | W    | `wildcard-to-regex`       | Write an MDQ regex that matches the whole response as Moodle's wildcard does (`*` is any text, other characters literal, case-insensitive unless `usecase` is 1). Check anchoring and flags in `docs/references/patterns.md`. |
| X9  | `_base.numeric_answer_key`, `*` at 100%                | import | GIFT, Moodle XML, cloze    | raises                                                   | W    | `answer-dropped`          | Drop the `*` answer. If no other 100% answer is left, X11.                                                                                                                                                           |
| X10 | `_base.numeric_answer_key`, two different 100%         | import | GIFT, Moodle XML, cloze    | raises                                                   | W    | `answer-dropped`          | Keep the first 100% answer, drop the others.                                                                                                                                                                         |
| X11 | `_base.numeric_answer_key`, no 100%                    | import | GIFT, Moodle XML, cloze    | raises                                                   | W/E  | `partial-credit-dropped` / `no-full-credit` | The answer with the highest positive credit becomes the key (warning). No positive answer: error `no-full-credit`.                                                                    |
| X12 | `_base.export_question` type check                     | export | all                        | `TypeError`                                              | E    | `unsupported-type`        | None.                                                                                                                                                                                                                |
| X13 | `_gift.encode_question` (multiple-selection, ordering) | export | GIFT                       | raises                                                   | E    | `unsupported-type`        | None. (GIFT weighted `~%50%` answers could hold multiple selection later; out of scope.)                                                                                                                             |
| X14 | `_moodle_xml.encode_question` (ordering)               | export | Moodle XML                 | raises                                                   | E    | `unsupported-type`        | None.                                                                                                                                                                                                                |
| X15 | `_aiken.Aiken.from_mdq`                                | export | Aiken                      | non multiple-choice raises                                | E    | `unsupported-type`        | None.                                                                                                                                                                                                                |
| X16 | `_aiken.AikenQuestion.__post_init__`, > 26 choices      | export | Aiken                      | raises                                                   | E    | `too-many-choices`        | None. (The index check of the same method is internal and stays an assertion.)                                                                                                                                       |
| X17 | `_gift.gift_block`, essay `answerKey` and `meta.generalFeedback` | export | GIFT              | raises                                                   | W    | `general-feedback-dropped`| Write the `answerKey` as `####`, drop `meta.generalFeedback`.                                                                                                                                                         |
| X18 | `_gift.block_from_fill_in`, blank count ≠ 1            | export | GIFT                       | raises                                                   | E    | `multiple-blanks`         | None: GIFT has one answer body per question.                                                                                                                                                                         |
| X19 | `_gift.block_from_fill_in`, marker not in stem          | export | GIFT                       | raises                                                   | E    | `blank-marker-mismatch`   | None. Unreachable for a validated model; kept as a guard.                                                                                                                                                             |
| X20 | `_gift.block_from_fill_in`, blank line in tail          | export | GIFT                       | raises                                                   | -    | -                         | Removed: R10 encodes the blank line.                                                                                                                                                                                 |
| X21 | `_moodle_xml.block_from_fill_in`, unknown blank / unreferenced blank | export | Moodle XML      | raises                                                   | E    | `blank-marker-mismatch`   | None. Unreachable for a validated model; kept as a guard.                                                                                                                                                             |
| X22 | `_moodle_xml.block_from_fill_in`, choice blank < 2 choices | export | Moodle XML             | raises                                                   | E    | `blank-marker-mismatch`   | Unreachable (`ChoiceBlank.choices` has `min_length=2`). Remove the check, or keep it under the same guard code.                                                                                                       |
| X23 | `_moodle_xml.block_from_fill_in`, no 100% answer        | export | Moodle XML                 | raises                                                   | E    | `no-full-credit`          | None: Moodle rejects the cloze (`fractionsnomax`).                                                                                                                                                                   |
| X24 | `_moodle_xml.escape_cloze_text`                        | export | Moodle XML (cloze)         | `~` or a backslash before `~`, `}`, `#` or at the end raises | W | `cloze-text-changed` / `answer-dropped` | Choice text and feedback: write `~` as `&#126;` and such a backslash as `&#92;` (`cloze-text-changed`). Short-answer literal: drop the answer (`answer-dropped`); if no accept is left, X5. |
| X25 | `_gift.decode_question`, `_moodle_xml.decode_question`, several blocks not all true/false | import | GIFT, Moodle XML | raises                                  | E    | `multiple-questions`      | None: `import_question` imports one question.                                                                                                                                                                        |
| X26 | `_gift.decode_question`, `_moodle_xml.decode_question`, no block | import | GIFT, Moodle XML        | raises                                                   | E    | `no-question`             | None. (GIFT fails earlier in the parser: `syntax-error`.)                                                                                                                                                             |
| X27 | `_gift.block_to_mdq`, `{T}`/`{F}` with a tail            | import | GIFT                       | raises                                                   | -    | -                         | Fixed: a fill-in with one choice blank `True`/`False`, the correct one at score 1.                                                                                                                                   |
| X28 | `_gift.blank_from_answer`, essay with a tail             | import | GIFT                       | raises                                                   | W    | `missing-word-joined`     | An essay whose stem is stem, a space, and the tail.                                                                                                                                                                  |
| X29 | `MoodleXmlParser.block_from_element`, unknown `type`     | import | Moodle XML                 | raises                                                   | E    | `unsupported-type`        | None (matching, ddwtos, calculated, description, ...). `category` is still skipped.                                                                                                                                 |
| X30 | `parse_cloze`, unterminated blank                       | import | Moodle XML (cloze)         | raises `ValueError`                                       | E    | `syntax-error`            | None.                                                                                                                                                                                                                |
| X31 | `normalize_cloze_kind`, unknown kind                     | import | Moodle XML (cloze)         | raises                                                   | W/E  | `case-sensitivity-dropped` / `unsupported-cloze-kind` | `SHORTANSWER_C` (`SAC`, `MWC`): a short-answer blank, warning. Other kinds (`MULTIRESPONSE`, ...): error.                                                     |
| X32 | `GiftParser.fail`, `MoodleXmlParser.parse`, `AikenParser` | import | all                       | `ParserError`                                             | E    | `syntax-error`            | None. `line` from `ParserError.lineno`.                                                                                                                                                                              |

### Silent losses

| #   | Site (function)                                       | Dir    | Formats            | Today                                                                        | New | Code                     | Best-effort behavior                                                                                                   |
| --- | ----------------------------------------------------- | ------ | ------------------ | ---------------------------------------------------------------------------- | --- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| S1  | `_gift.block_from_short`                               | export | GIFT               | `incorrectFeedback` dropped                                                  | -   | -                        | Fixed by R12: `=%0%*#feedback`.                                                                                        |
| S2  | `_gift.block_from_fill_in` (short-answer, numeric blank) | export | GIFT             | `incorrectFeedback` dropped                                                  | -   | -                        | Fixed by R12.                                                                                                          |
| S3  | `_base.numeric_answer_key`, 0% answer                   | import | GIFT, Moodle XML, cloze | dropped with its feedback                                               | W   | `answer-dropped`         | Drop it.                                                                                                               |
| S4  | `_base.numeric_answer_key`, equal second 100% answer    | import | GIFT, Moodle XML, cloze | dropped                                                                 | W   | `answer-dropped`         | Drop it (its feedback may differ).                                                                                     |
| S5  | `_base.numeric_answer_key`, feedback of the 100% answer  | import | GIFT, Moodle XML, cloze | dropped (`NumericAnswerKey` has no field for it)                         | W   | `feedback-dropped`       | Drop it.                                                                                                               |
| S6  | `_moodle_xml.block_from_fill_in`, `_gift.block_from_fill_in` | export | GIFT, Moodle XML | a fill-in whose short-answer blanks are not automatic is exported without a check (`require_automatic` is only called for short-answer questions) | W | `manual-grading-dropped` | As X3.                                     |
| S7  | `_moodle_xml.selection_from_block`                      | import | Moodle XML         | fractions become `correct = fraction > 0`; the Moodle grading scheme is lost  | W   | `grading-changed`        | Keep the mapping. Report once per question.                                                                            |
| S8  | `_moodle_xml.block_from_selection`                      | export | Moodle XML         | `grading` ignored: Moodle grades ticked choices only (1/n correct, -1/m wrong, floor 0), which is none of `partial`, `all-or-nothing`, `symmetric` | W | `grading-changed` | Keep the mapping. Report once per question. |
| S9  | `_moodle_xml.parse_cloze`                               | import | Moodle XML (cloze) | blank weight other than 1 ignored                                            | W   | `blank-weight-dropped`   | Drop it.                                                                                                               |
| S10 | `_moodle_xml._mdq_unit`, `block_from_element` (numerical) | import | Moodle XML       | characters outside `UNIT` removed; only the first `<unit>` read; `unit_multiplier` ignored | W | `unit-changed` | Keep the first unit with multiplier 1 (or the only one); report removed characters and dropped units.              |
| S11 | `essay_content_from_response_format`                    | import | Moodle XML         | unknown `responseformat` (`noinline`, `editorfilepicker`) read as `text`       | W   | `field-dropped`          | Read as `text`.                                                                                                        |
| S12 | `MoodleXmlParser.block_from_element`                    | import | Moodle XML         | `<file>` elements and `@@PLUGINFILE@@` references not read                    | W   | `embedded-file-dropped`  | Keep the text as is; one warning per question.                                                                         |
| S13 | `MoodleXmlParser.block_from_element`                    | import | Moodle XML         | non-empty `<correctfeedback>`, `<partiallycorrectfeedback>`, `<incorrectfeedback>`, `<hint>` not read | W | `field-dropped` | Drop them. Other elements (`penalty`, `hidden`, `answernumbering`) stay ignored, no diagnostic. |
| S14 | `true_false_from_blocks` (GIFT, Moodle XML)              | import | GIFT, Moodle XML   | name, idnumber, tags, shuffle of the blocks after the first dropped           | W   | `field-dropped`          | Keep the first block's; report a later block whose value differs.                                                     |
| S15 | `blocks_from_true_false`                                | export | Moodle XML         | each statement gets the full `weight`                                        | -   | -                        | Fixed by R15.                                                                                                          |
| S16 | `_aiken.Aiken.from_mdq`                                 | export | Aiken              | partial credit collapsed to one correct choice                               | W   | `partial-credit-dropped` | As today: the first highest-scoring choice is correct.                                                                 |
| S17 | `_aiken.AikenQuestion.__post_init__`                    | export | Aiken              | line breaks in a choice text joined with a space                             | W   | `line-breaks-dropped`    | As today.                                                                                                              |
| S18 | `_base.literal_text` and the short-answer exports       | export | GIFT, Moodle XML   | `diacritics: fold` (the default) is not expressible; Moodle compares diacritics | W | `diacritics-not-folded` | Report only when an exported literal has a diacritic.                                                                   |
| S19 | `_moodle_xml.markdown_block`, `_gift.markdown_block`     | import | GIFT, Moodle XML   | Moodle auto-format line breaks lost (README)                                  | -   | -                        | Out of scope; stays documented.                                                                                        |
| S20 | GIFT export (`gift_block`, encoders)                    | export | GIFT               | dropped without report: `id`, `tags`, `weight`, `shuffle`, numeric `unit`, `domain`, `decimalPlaces`, essay `content`, `highlight`, `grading`, `preAccept`, `preReject`, choice `comment`, `author`, `uuid`, `locale`, other `meta` keys | W/I | `field-dropped` / `metadata-dropped` | R9. Kept: `title`, `comment` (question), `stem`, `epilogue` (joined), feedback, `meta.generalFeedback`. |
| S21 | Moodle XML export (encoders)                            | export | Moodle XML         | dropped: `domain`, `decimalPlaces`, `highlight`, `grading` (other than S8), `preAccept`, `preReject`, `comment`, `author`, `uuid`, `locale`, other `meta` keys | W/I | `field-dropped` / `metadata-dropped` | R9. |
| S22 | Aiken export                                            | export | Aiken              | dropped: `id`, `title`, `tags`, `weight`, `shuffle`, `grading`, every `feedback`, `meta`, `comment` | W/I | `field-dropped` / `metadata-dropped` | R9. The `_aiken.Aiken` docstring already lists these. |
| S23 | `GiftParser`, `split_blocks`                            | import | GIFT               | blank lines before `{` accepted without report (Moodle splits there)          | W   | `gift-blank-line`        | R13.                                                                                                                   |
| S24 | `_common.unescape_text` (GIFT)                          | import | GIFT               | `\n` read as `n`; `\*` and other backslashes dropped                          | -   | -                        | Fixed by R11.                                                                                                          |
| S25 | GIFT export, any text                                   | export | GIFT               | leading whitespace that Moodle trims                                         | W   | `indentation-lost`       | R14.                                                                                                                   |

## Acceptance criteria

A1. For each row of the inventory with a code, a test builds the smallest
input, converts it with `load_question`/`dump_question` and checks the
severity, code and path, and for a warning that `value` is not `None` and
holds the best-effort result described.

A2. A test checks that every code the converters can produce is in the
registry (R6), every registry code is in the README table with the same
severity and vice versa, and no registry code is in `docs/lint-codes.md`.

A3. `import_question`/`export_question`:
- an error raises `ConversionError`, which is a `ValueError`, with
  `.diagnostics`;
- a warning is emitted as `ConversionWarning` (`pytest.warns`) and the result
  is returned;
- `strict=True` raises `ConversionError` on a warning.

A4. CLI: a warning-only conversion writes the output, prints
`warning: ... [code]` to stderr and exits 0; with `--strict` it writes
nothing and exits 1; an error writes nothing and exits 1.

A5. GIFT round trip: a multi-paragraph stem, an epilogue and a true/false
group exported to GIFT have no blank line inside a question, and a
re-import gives the same question. A test reads such an export with a
Python port of Moodle's `readquestions` split (blank line, trimmed lines) and
checks that the number of questions is the expected one.

A6. GIFT: `incorrectFeedback` of a short answer, a short-answer blank and a
numeric blank round-trips. `=\*` imports as the literal `*`; `=%0%*#fb` as
`incorrectFeedback`; `\n` in a stem as a line feed; `\*` in a stem stays `\*`.

A7. Moodle XML: a true/false group of weight 3 with 3 statements exports
`defaultgrade` 1 each and imports back with weight 3.

A8. `html="markdown"` without markdownify installed raises `ImportError`
with the message of R16; the CLI exits 2. With markdownify, `<p>Capital do
<b>Brasil</b></p>` imports as `Capital do **Brasil**`, and a cloze whose
blanks sit inside `<p>` keeps every `[^blankN]` marker.

A9. The existing tests that expect `ValueError("cannot convert ...")` for a
row that is now a warning are changed to expect the warning; the ones for an
error still pass.

A10. `uv run mypy mdq`, `uv run pytest` and `uv run scripts/spec_audit.py`
pass (the last one is not affected: no change in `docs/`, `schema/`,
`examples/`).

## Non-goals

- Importing or exporting more than one question per call (a GIFT or Moodle
  XML file with many questions). Note: today several true/false questions in
  one file are merged into one group.
- New question types in a format (GIFT multiple selection, matching).
- Moodle auto-format line breaks (S19).
- Grading parity between MDQ and Moodle beyond the reports above.

## Decisions (human, 2026-10-30)

- Q1: a lone `*` in a GIFT short answer is Moodle's wildcard (R12), as the
  Moodle XML importer already reads it.
- Q2: `grading-changed` is a warning.
- Q3: `inexact-answer` is a warning; the export writes the nearest float.
- Q4: `load_question`/`dump_question`.
