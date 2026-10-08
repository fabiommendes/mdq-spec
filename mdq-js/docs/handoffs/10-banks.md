---
type: handoff
status: completed
tags: [mdq, mdq-js, exam, include, include-all, question-bank, query, tdd]
relatedTo: [mdq-js/docs/sync/roadmap.md, mdq-js/docs/handoffs/09-parser-exam.md]
---

# Cycle F4.2 — Question banks and include resolution

## Goal

Port the `include-all` query language, the in-memory question bank and the
resolution of `include`/`include-all` entries, so that a host can turn a
parsed exam into an exam with inline questions only. This finishes phase F4.
Depends on F4.1 (`09-parser-exam.md`).

Out of scope: `FileLoader` (stays in Python), the `empty-include-all`
warning and the `warnings` argument of `Exam.resolve` (F5/F6, with the
`Diagnostic` type), `nonstandard-include-query` and
`undeclared-id-after-include-all` (F6), unique ids after resolution and
`withIds` (F5), async banks.

## Public API

Stubs exist. `src/query.ts` (port of `models/_query.py`, not exported from
`src/index.ts`):

```ts
class QuerySyntaxError extends MdqError {}
interface TagIndex { tagged(tag: string): Iterable<string>; ids(): Iterable<string> }
type QueryExpr = {kind: "tag", name} | {kind: "not", operand} | {kind: "and" | "or", left, right};
class Query { expr; excluded: ReadonlySet<string>; matches(tags, questionId): boolean; select(index): Set<string> }
function parseQuery(text: string): Query;
function isStandardQuery(text: string): boolean;
```

`src/banks.ts` (port of `_banks.py` without `FileLoader`, plus
`Exam.resolve`, `_load_included`, `_query_ids`, `_check_selection` and
`select_random` from `models/_exam.py`), exported from `src/index.ts`:

```ts
type QuestionSource = string | Readonly<Record<string, unknown>>;
interface QuestionBank extends TagIndex { load(questionId: string): QuestionSource }
class DictLoader implements QuestionBank { constructor(questions: Record<string, QuestionSource>) }
type Select = (candidates: readonly string[], max: number | undefined) => readonly string[];
function selectRandom(candidates, max): string[];
function resolveExam(exam: Exam, bank: QuestionBank, options?: { select?: Select }): Exam;
```

`src/errors.ts`: `IncludeNotFoundError(questionId, detail = "")`, a port of
`IncludeNotFound`, with a `questionId` field.

Everything is synchronous, as in Python. A host with a remote bank fetches
the questions into a `DictLoader` (or its own `QuestionBank`) first.

## Reference

* `mdq-py/mdq/models/_query.py`: the whole module.
* `mdq-py/mdq/_banks.py`: `QuestionBank`, `_IndexedBank`, `DictLoader`,
  `_tags`.
* `mdq-py/mdq/models/_exam.py`: `select_random`, `Exam.resolve`,
  `_load_included`, `_query_ids`, `_check_selection`.
* `mdq-py/mdq/errors.py`: `IncludeNotFound`.
* Tests: `mdq-py/tests/test_include_all.py` ("Query language" and
  "Resolution", with `DictLoader` for the bank; not the `load`/lint ones),
  `test_exam.py` ("include resolution": port the `FileLoader` cases with a
  `DictLoader` built from the `.mdq.md` files under
  `examples/valid/exam/`, keyed by file name without `.mdq.md`).
* `docs/exam.md`: "Include", "Include all".

## Runtime differences to watch

* The token pattern is Python `[(),]|[^\s(),]+`: use `SPACE` from
  `parser/text` for `\s`, and the `u` flag.
* Messages quote with `repr` from `parser/text`. Python formats the list of
  unknown ids as `sorted(unknown)`: `['tundra']`, that is `[` + the `repr`
  of each id joined by `, ` + `]`.
* Python `sorted` of ids compares code points. JavaScript `sort()` compares
  UTF-16 units: use a code point comparison.
* `select` returns a `Set`; a query result, the index and `excluded` are
  sets, not arrays. They are not responses, so decision 3 does not apply.
* `_tags` of a text source: `isExam` first (skip), then
  `parseQuestionDocument` (skip on `MdqError`). A `tags` string is split at
  `,` and each part is `strip`ped; a list gives `String(tag)` of each item.
* `resolveExam` never changes `exam` or a bank document: copy before adding
  `id`, `locale`, `author`.

## Acceptance criteria

Batch 1:

1. `parseQuery` follows the grammar: precedence `NOT` > `AND` > `OR`,
   parentheses, uppercase keywords only, `EXCEPT a, b`. It rejects the
   queries of `test_invalid_query_is_rejected` with `QuerySyntaxError` and
   the Python message; `isStandardQuery` is `false` for them.
2. `Query.matches` gives the results of `test_query_matches_tags` and
   `test_except_removes_listed_ids`.
3. `Query.select` gives the ids of `test_select_lists_every_id_only_for_a_complement`
   and calls `index.ids()` only in the cases that test marks.

Batch 2:

4. `DictLoader.load` returns the source, or raises `IncludeNotFoundError`
   with the message `cannot resolve included question '<id>': not in the mapping`.
5. `DictLoader.tagged`/`ids` index text and document sources, skip exams
   and text that does not parse, and read a `tags` string. Over the corpus
   files of `examples/valid/exam/`, `tagged("wetland")` is
   `{pantanal-01, pantanal-02}`, `ids()` has `recursion-01` and not
   `midterm`.
6. `selectRandom` keeps every candidate in order without `max` or when
   `max` is not smaller; otherwise it returns `max` distinct candidates in
   the order of `candidates`.

Batch 3:

7. `resolveExam` replaces `include` entries (own `id` kept, else the
   loaded id; `locale`/`author` inherited) and `include-all` entries
   (sorted candidates minus the taken ids, `select` called with the
   candidates and `max`, a nonstandard query adds nothing), as in the
   "Resolution" tests of `test_include_all.py`. `exam` is not changed.
8. A bad `select` result raises `RangeError` with the Python message (not a
   candidate, the same id twice, more than `max`).
9. With a `DictLoader` over the corpus bank, `midterm` resolves as in
   `test_exam.py` (essay `recursion-01`, title `Base cases`, locale
   `pt-BR`), and `include-all` with a `select` that keeps the first `max`
   candidates gives `cerrado-01`, `amazonia-01`, `pantanal-01` and the
   inline question, as its `.yaml` comment says. Update the F4 row of
   `docs/sync/roadmap.md` to done.
