# Runner report

A **runner** is a program outside MDQ that executes the test sources of a
[code](question-types/code.md) question against a submission. The **runner
report** is the JSON document it returns: a status and one verdict for each
test case. MDQ never runs code. It reads the report and turns it into a score
through the rubric of the question.

Third parties write runners, so the report has a JSON Schema,
[`schema/runner-report.yaml`](../schema/runner-report.yaml). Responses have
none, see [responses.md](responses.md). The report is not a question or an
exam: it has no `type`.

```json
{
  "status": "completed",
  "runner": {"name": "mdq-pytest", "version": "0.1.0", "language": "python", "toolchainVersion": "3.13.1"},
  "hashes": {
    "submission": "4a1f1e2f0b5c8e9d7a6b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f",
    "sources": ["9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"]
  },
  "cases": [
    {"source": 0, "line": 5, "verdict": "pass", "id": "test_verde", "duration": 0.002},
    {"source": 0, "line": 10, "verdict": "fail", "id": "test_vermelha",
     "message": "assert 8.0 == approx(8.5)", "expected": "8.5", "actual": "8.0"}
  ]
}
```

## Input of a runner

The input of a runner is the private JSON form of the question and the response
string. The private form keeps the text of each test source, so a fenced source
and a resolved linked source are the same to the runner. This is why `line` has
one meaning for every source: line 1 is the first line of the code text of a
fenced block, as defined in
[JSON form](question-types/code.md#json-form). MDQ defines nothing else about
the input, nor how the runner gets it.

## Fields of the report

| Field     | Required | Type             | Description                                                    |
| --------- | -------- | ---------------- | -------------------------------------------------------------- |
| `version` | no       | integer          | The version of the format, `1`. Absent means `1`               |
| `status`  | yes      | string           | `completed`, `build-error` or `runner-error`                   |
| `cases`   | yes      | list of cases    | The test cases that ran                                        |
| `build`   | no       | string           | The message of the compiler or of the syntax error             |
| `message` | no       | string           | A short message for a human, mainly with `runner-error`        |
| `runner`  | no       | object           | What ran the tests                                             |
| `hashes`  | no       | object           | Digests of the submission and of the test sources              |
| `meta`    | no       | object           | Data of the runner, for the host. MDQ ignores it               |

`message` is for the person who reads the report, for example the reason of a
`runner-error`. Grading does not use it. `build` is the message of the
submission, and `message` is the message of the report.

The object `runner` has the string fields `name` (required), `version`,
`language` and `toolchainVersion`, the version of the toolchain that ran the
submission. The host reads them for information, and grading does not use them.

The object `hashes` has `submission`, the digest of the response, and
`sources`, the list with the digest of the text of each test source, in the
order of `tests` of the question. A digest is the SHA-256 of the UTF-8 encoding
of the text, with no change to its line endings, written as 64 lowercase
hexadecimal digits. Grading does not check the digests. A host MAY compare them
with its own, to find a report that is out of date.

An object of the report has no field besides the ones of the schema, except the
content of `meta`. A report with a field that the schema does not define is not
graded (`ReportError`, see [Errors](#errors)).

`version` is the version of the format of the report. This document defines the
version 1. A report with no `version` is a version 1 report. A reader that does
not know the value of `version` does not grade the report (`ReportError`), so
a later version of the format can add fields without an old reader grading a
report in silence with a score that differs from the one of a newer reader.

`meta` is an object that holds any JSON value, with any key. A runner puts in
it the data that the format does not define, for example a coverage figure, the
identifier of a container or the URL of a log. It is allowed at the root of the
report and in each case. MDQ never reads it, and grading does not use it.

## Status

| Status          | Meaning                                                                  | Effect on the response                                   |
| --------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| `completed`     | The runner ran the test cases. `cases` is the result.                    | Graded by the rubric.                                    |
| `build-error`   | The submission did not build, so no case ran. `build` holds the message. | Every item of tests fails. The manual items stay valid.  |
| `runner-error`  | The infrastructure failed. The report says nothing about the submission. | The response is [pending](responses.md#pending), never 0. |

`cases` is required with every status. With `build-error` and `runner-error` it
is ignored, so a runner writes the empty list. The schema does not force the
list to be empty. It is also not checked against the question: a `source` or a
`line` in it that [would be an error](#errors) with the status `completed` is not
a `ReportError` here.

## Cases

| Field                | Required | Type    | Description                                                   |
| -------------------- | -------- | ------- | ------------------------------------------------------------- |
| `source`             | yes      | integer | The 0-based index of the test source in `tests`               |
| `line`               | yes      | integer | The line of the source where the case is defined, from 1      |
| `verdict`            | yes      | string  | `pass`, `fail`, `error`, `timeout`, `resource-limit` or `skipped` |
| `id`                 | no       | string  | A name to show, such as `test_verde` or `test_x[3]`           |
| `message`            | no       | string  | A short message about the verdict                             |
| `expected`, `actual` | no       | string  | The two values, for a diff                                    |
| `stdout`, `stderr`   | no       | object  | The captured stream: `text` and `truncated`                   |
| `duration`           | no       | number  | The time of the case, in seconds                              |
| `memory`             | no       | number  | The peak memory of the case, in bytes                         |
| `meta`               | no       | object  | Data of the runner for this case. MDQ ignores it              |

A case is binary: the runner does not return a score, and only the verdict
`pass` passes. `fail`, `error`, `timeout`, `resource-limit` and `skipped` are
all not passed, so a skipped case counts in the `n` of its item and not in its
`p`. A runner that could not run a case for its own reasons, such as a missing
dependency of the runner, reports `runner-error` for the report, not `skipped`
for the case: `skipped` is for a case that the test itself skips, such as a
marker of the author. A runner that wants a case out of the score omits it. A test that a parametrized definition expands into 15 cases is
15 entries, all with the `line` of the definition. The order of the list does
not matter.

`stdout` and `stderr` are objects with `text`, the captured text, and
`truncated`, which is `true` when the runner cut the text. Without `truncated`
the text is whole.

## From a case to an item

The pair `source` and `line` decides which rubric item owns a case. The `line`
is the line, counted from 1, of the `text` of the test source, as defined in
[Annotations](question-types/code.md#annotations).

1. `source` is the index in `tests`. An index that is not in `tests` makes the
   report invalid, see [Errors](#errors).
2. If the source has no annotation, the case belongs to the implicit item of
   the source.
3. Otherwise the case belongs to the item whose
   [region](question-types/code.md#regions) holds `line`. A case before the first
   annotation owns no item: it runs and counts for nothing.
4. An item of value 0 owns its cases, which count for nothing.

The score comes from the cases of each item, see
[Score](question-types/code.md#score). An item that owns no case has no credit
and no discount. This is not an error: the report may be out of date, and a
host that wants to know compares the [digests](#fields-of-the-report).

## Errors

A report that does not follow the schema, or that does not fit the question, is
not graded: the grading fails (`ReportError`, see [responses](responses.md#errors)).
A report does not follow the schema when it has a field that the schema does not
define, or a `version` that the reader does not know. A report does not fit the
question when:

* the status is `completed` and a case has a `source` that is not an index of
  `tests`;
* the status is `completed` and a case has a `line` after the last line of the
  text of its source;
* the question has a source of tests, and the grading received no report.

The checks of a case apply only with the status `completed`: with another
status `cases` is not read, see [Status](#status).

A report with `runner-error` that is valid is not an error: it makes the
response pending.
