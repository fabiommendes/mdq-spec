---
type: plan
status: active
tags: [mdq, mdq-js, port, sync]
relatedTo: [mdq-js/docs/sync/README.md, mdq-js/docs/sync/testing.md]
---

# Roadmap of the TypeScript port

The port follows mdq-py, which is the reference. This document records the
decisions that apply to the port and the phases that closed it. Parity is
done: the TypeScript suites run the whole shared corpus with no entry in
[`tests/not-ported.ts`](../../tests/not-ported.ts).

## Decisions

1. **One cycle per feature.** Each cycle has the public API, the acceptance
   criteria and the Python functions to port. The cycle is test-driven, and
   the corpus is the main test source.
2. **Corpus first.** Before an area is ported, the Python tests of that area
   that state facts about the format move into `examples/`. This can need new
   corpus kinds, for example sources that must fail to parse, with the
   expected error. See [testing.md](testing.md).
3. **Responses are plain JSON.** The response types follow
   [`docs/responses.md`](../../../docs/responses.md): JSON objects, arrays,
   strings and numbers. No `Set` or `Map`, so a response can be stored, sent
   and loaded from a fixture without conversion.
4. **Same dialect as Python.** Differences between the two runtimes must not
   change a result:
   * Every `RegExp` uses the `u` flag. `\w` and `\d` are ASCII in JavaScript
     and Unicode in Python, so a port of a Python pattern that relies on
     Unicode uses `\p{L}`, `\p{N}` and similar classes.
   * Python `$` also matches before a final `\n`; JavaScript `$` does not.
   * Frontmatter YAML is read with the YAML 1.2 Core schema, as the spec
     says (`yes` and `1:30` are strings). The `yaml` package does this;
     `js-yaml` accepts a non-scalar key, so it does not.
   * markdown-it uses the options of the Python `gfm-like` preset.
   * Text comparisons use the same normalization as Python (NFKC, case
     folding, accent removal). `toLowerCase` is not case folding.

   Each difference that a cycle finds gets an example in the corpus.
5. **Validation includes the model rules.** Python checks some rules in the
   Pydantic models (unique ids, regex that compiles, and so on). TypeScript
   has no model layer: these rules are functions in `src/models/<family>.ts`
   that return diagnostics, and `validateDocument` runs them after Zod. So
   `validateDocument` rejects `examples/invalid/model-only/`. See
   [schemas.md](schemas.md).

6. **Same modules as Python.** One TypeScript module per Python module,
   with the same name without the leading underscore. A module differs only
   for a good reason, which its header comment states. For example,
   `schema/` replaces the shapes of `mdq.models` and `mdq.types`, because
   Zod defines the types and the validation in one place. See
   [modules.md](modules.md).

7. **No Temporal yet.** Exam `start` and `duration` use strings: the exam
   frontmatter loader keeps the YAML timestamp text (`YamlTimestamp`, like
   PyYAML `isoformat()`), and `schedule` has one function per field that
   throws `RangeError`. Each function keeps an internal parse and format
   step, so Temporal can replace the internals later without an API change.
   Revisit when Node 26 is the CI minimum, Safari ships Temporal and the
   repository uses TypeScript 6. See
   `dev/notes/temporal-for-exam-schedule.md` (local).

## Phases

| Phase | Scope | Status |
| ----- | ----- | ------ |
| F0 | Corpus layout, `not-ported.ts` manifest, docs | done |
| F1 | Zod schemas equal to the JSON Schema | done |
| F2 | Parser: bracket lists aligned with Python | done |
| F3 | Parser: essay, numeric, short-answer, ordering, fill-in bodies | done |
| F4 | Parser: exams, `include`, `includeAll` | done |
| F4.1 | `resolveExam`, the question bank and the `includeAll` query language | done |
| P0-P2 | Zod equal to the JSON Schema, corpus suites, parser aligned with mdq-py | done |
| P3 | Pattern matching | done |
| P4 | Model rules and `load` | done |
| P5 | Lint | done |
| P6 | Scoring | done |
| P7 | `normalize`, `withIds`, `automation`, slimmer unit tests, docs | done |

The P phases are the ones of RFC 0001 in the root repository
(`dev/rfc/0001-mdq-js-paridade.md`), which keeps the details and the history. The SolidJS components get their own plan.

The CLI, format conversions (Moodle XML, GIFT, Aiken), `show`, `scaffold`,
`render()` and the file-system question bank stay in Python.

## Coordination with mdq-py

* A change in mdq-py or in the corpus makes a corpus test fail in
  TypeScript. Port it, or list the example in `tests/not-ported.ts` with the
  reason until it is ported.
* The module map is in [modules.md](modules.md). When mdq-py moves code
  between modules, update the map and move the TypeScript code to match.
* The Python test helpers (`mdq-py/tests/_corpus.py`,
  `mdq-py/scripts/lint_snapshot.py`, `mdq-py/tests/strategies/`) are not
  ported. TypeScript has its own helpers in `tests/`.

## Pending ports

Changes in mdq-py that the TypeScript port does not follow yet. Remove the
entry when the port is done.

* A heading after `## [answer-key]` in an essay that starts with `[` is a
  `forbidden-block-element` error at `answerKey` (`docs/question-types/essay.md`,
  "Answer key"), under the same rule as the epilogue (any level, ATX or setext,
  a link at the start excepted). In mdq-py, `find_answer_key_forbidden_elements`
  in `mdq/_parser/_blocks.py` reports an H1 heading and every heading for which
  `_starts_with_bracket` holds, and the model validator of `EssayQuestion`
  raises the error. The check runs on the `answerKey` string, so an escaped
  `## \[x]` is not reported. Port the same function and call it from the essay
  model. Then remove from `tests/not-ported.ts` the entries of
  `essay-answer-key-section-heading.mdq.md`, `essay-answer-key-heading-h3-bracket.mdq.md`
  and `essay-answer-key-heading-x-feito.mdq.md` (in `LOAD` and, with the
  `source.` prefix, in `LOADING`) and of `essay-answer-key-bracket-heading.yaml`
  (`MODEL_RULES` as `model-only.`, and `parsed-only.model-only.` in `LOADING`).

* The `code` question type. mdq-py: `mdq/_parser/_code.py` (sections),
  `mdq/_parser/_rubric.py` (rubric item grammar, annotation scanner, regions),
  `mdq/models/_code.py` (`CodeQuestion`, `TestSource`, `RubricItem`, grading),
  `mdq/models/_report.py` (runner report). Port in this order:
  1. `[code]` tag: `CodeTag`, `code` in `TYPE_NAMES` and in the lazy-line and
     reserved-label regexes, the message "the tag of a code question has no
     content". Detached `[code]` is `detached-tag`.
  2. Sections: the epilogue ends at the first `## [template|tests|rubric|answer-key]`
     heading; each section once; `answer-key` last and to the end (its
     headings go through `find_answer_key_forbidden_elements`); empty
     section is a `parse-error`, except `answer-key`.
  3. Test sources: fence (format is the first word of the info string; text is
     the fence content with LF line endings) or a paragraph with one inline
     link. Trap: markdown-it percent-encodes `href`. The origin must be the
     destination as written (angle brackets, backslash escapes and entities
     removed, no percent-decoding or encoding), so read the link with a
     `normalizeLink` that returns its input and with the `reference` rule
     disabled (`[t][ref]` is then text, and so is a link definition). A
     bare URL (linkify) and an autolink are not links. Check the origin with
     the `ORIGIN` terminal: no scheme, no leading `/`, no `?`, no `#`, an
     extension in the last segment. The test format of a link is that
     extension.
  4. Rubric list: reuse the choice item splitter. Errors of the item are
     `invalid-rubric-item` at `rubric[i]` (not `rubric[i].text`), raised by
     the parser as a typed error with `code` and `path`; a blank criterion
     or feedback is passed on as `""` so the model reports `blank-text` at
     `rubric[i].text` / `rubric[i].feedback`.
  5. Rubric item grammar and annotation scanner (pure functions on text, run
     by the model on `tests[i].text` and on `rubric[i].text`, so every form
     of the document is covered). Traps: the `RUBRIC_VALUE` has a negative
     lookahead for `(` and `[`; `-0` is 0; a `{` after the value or a
     modifier always opens a modifier; the `ANNOTATION_START` regex is
     anchored at the line start (`x = 1  # mdq:` is not an annotation); an
     observation line right after an item line or another observation line
     only; a bad item line still counts as an item line for the lines that
     follow it (no second error); a region ends at the line before the next item
     line. Several problems of
     one source are several errors at the same path (`tests[i].text`).
  6. Model: `language`/`file` patterns need a custom check (the schema
     patterns use lookahead); `tests[]` needs `text` or `origin`
     (`schema-error` at the source); a missing `binding` is `schema-error` at
     `rubric[i].binding`; the template must be exactly one `fence` block
     (`forbidden-block-element` at `template`).
  7. Resolution: `CodeQuestion.resolve(texts)` returns a copy; the origin is an
     opaque key; strip a BOM; rebuild the source (do not copy cached
     annotations); an annotation error of the new text throws.
  8. Report: a strict schema (no coercion, `version` must be the integer 1 and
     not `true`, unknown keys rejected, `meta` free). Cases are checked only
     with the status `completed`.
  9. Grading and the check order: unresolved source, scores of the
     instructor, report, pending. The floor at -1 is the question's own. Exam:
     `scoreResponses` takes `reports`, `manual` and `instructor` by question
     id.
  10. Public form (`publicTests`), `correct_responses` (reference solution is the
     first top-level `fence` of the answer key), `render` (fence longer than
     the backtick runs of the text; `<...>` and escapes for an origin with
     special characters) and the lint `rubric-without-positive-item`.
  Then delete the `code.*` entries of `PARSE` and `SCHEMA` and the `code-*`
  entries of the other manifests in `tests/not-ported.ts`, and the issue
  `mdq-js-porte-do-tipo-code`. Corpus files added by mdq-py:
  `examples/valid/code/rubric-criterion-forms.*`; corrected:
  `examples/invalid/code-rubric-without-binding.lint.json`.
