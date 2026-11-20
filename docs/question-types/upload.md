# Upload

## Example

Upload questions expect one or more files as the response: a PDF with a
report, a photo of a diagram drawn by hand, a spreadsheet.

```md
---
maxFiles: 2
maxSize: 5 MB
extensions: [".pdf", ".png", ".jpg"]
---

Desenhe o ciclo da água na bacia do rio São Francisco e envie uma foto ou um
PDF do desenho.

[upload]
```

## Frontmatter

Upload questions accept the following extra fields in the frontmatter:

| Field    | Type                | Description                                                  |
| -------- | ------------------- | ------------------------------------------------------------ |
| type     | "upload"            | The type discriminator                                       |
| maxFiles | integer             | The most files a response holds. Default is 1                |
| maxSize  | integer or string   | The largest size of one file. No limit when omitted[^1]      |
| extensions | string[]          | The file extensions accepted. Any file when omitted[^2]      |

[^1]: An integer is a number of bytes. A string is a number and a unit, such
as `5 MB`, see [Size](#size).
[^2]: Each extension starts with `.`, such as `.pdf`, see [Extensions](#extensions).

The `answerKey` field is not a frontmatter field. A Markdown source sets it with
the [answer key section](#answer-key), as in an [essay](essay.md#answer-key).

MDQ never reads the bytes of a file. The host stores the files and tells where
each one is, see [Response](#response).

### Count

`maxFiles` is an integer, from 1 to 2⁵³ − 1. A response holds from 1 to `maxFiles`
files. When `maxFiles` is omitted, it is 1. MDQ has no value for "any number
of files": a host has a limit of its own, and an author who does not care sets
a large value.

### Size

`maxSize` is the largest size of each file, not of the sum of the files. It is
one of:

* an integer, from 1 to 2⁵³ − 1: a number of bytes;
* a string with a number, an optional space and a unit: `512 KB`, `5 MB`,
  `1.5GB`. The number has at most three decimal places.

```lark
size_string : NUMBER " "? UNIT
NUMBER      : /[0-9]+(\.[0-9]{1,3})?/
UNIT        : "B" | "KB" | "MB" | "GB"
```

The units are powers of 1024: `KB` is 1024 bytes, `MB` is 1024² bytes and
`GB` is 1024³ bytes, as most hosts show them. The units are in upper case. A
string with another unit, such as `5 mb` or `5 MiB`, is a `schema-error`.

The size in bytes is the number times the unit, computed exactly, as a decimal
and not as a binary floating point number, and then rounded down to an
integer: `1.5 KB` is 1536 bytes and `0.001 KB` is 1 byte. A size that rounds
down to 0, such as `0.5 B` or `0 MB`, or that is larger than 2⁵³ − 1, is a
`schema-error`. The schema cannot express these two rules, so the model checks
them, with the same code.

The host can have a smaller limit of its own. A host SHOULD tell the author,
when it stores the question, that its limit is smaller than `maxSize`.

### Extensions

`extensions` is a list of at least one extension. Each extension starts with
`.`, then has one or more characters among `a-z`, `0-9`, `.`, `_`, `+` and
`-`, and the character after the first `.` is a letter or a digit: `.pdf`,
`.c`, `.tar.gz`. Upper case letters are a `schema-error`, so that `.PDF` and
`.pdf` cannot both appear. A repeated extension is a `schema-error`.

```lark
extension : "." /[a-z0-9]/ /[a-z0-9._+-]/*
```

A file matches an extension when its name ends with the extension and is
longer than it. Before the comparison, the letters `A` to `Z` of the name
become `a` to `z`. No other character changes, so that every implementation
gives the same result. `Relatório.PDF` matches `.pdf`, `dados.tar.gz` matches
`.tar.gz` and `.gz`, and `.pdf` (a name that is only the extension) matches
nothing. A response file that matches no item of `extensions` makes the
response malformed, see [Response](#response).

An extension is not a file type. A host that wants to check the content of a
file, such as the signature of a PDF, does it on its own. MDQ does not
define it.


## Body

The body is a paragraph whose only content is the `[upload]` tag, in lower
case. The tag has no colon and no content, see
[Body tags](question-base.md#body-tags). The rules are the ones of the
[essay](essay.md#body) tag, with `[upload]` in place of `[essay]`.

```lark
upload : ws? "[upload]" ws?
```

The rule `ws` is defined in
[Common grammar rules](../references/grammar.md). `[upload]: x` is a
`parse-error` "the tag of an upload has no content: write `[upload]` without a
colon". A second paragraph with only `[upload]` is in the epilogue, so it is a
`detached-tag` error. `* [upload]` (a list item) gets the same
diagnostic as `* [essay]`: `foreign-choice-marker` at `choices` without `type`, and
`parse-error` (the question has no body) with `type: upload`, see
[essay](essay.md#body).

A paragraph with only `[upload]` is always the tag. It is never a
[slug](question-base.md#slug).


## Answer key

The answer key section is optional. It is a model answer, or the criteria,
that guides the instructor who grades the files. It has the syntax, the
position and the rules of the [answer key of an essay](essay.md#answer-key):
an `## [answer-key]` section after the `[upload]` tag and after the epilogue,
before or after the `## [attachments]` section, each at most once.

```lark
upload_sections : (attachments_section answer_key? | answer_key attachments_section?)?
```

The rules `attachments_section` and `answer_key` are defined in
[Attachments](question-base.md#position) and in
[essay](essay.md#answer-key).

The answer key MUST NOT be shown to the student before the student submits the
response. A host MAY show it after that, even while the response is pending.


## Grading

Every upload response is graded by the instructor, with a score in the range
[0, 1]. MDQ does not read the files, and the answer key does not grade the
response.

### Automation

The [automation](question-base.md#automation) of an upload question is
`manual`: every response is pending until the instructor supplies a score. The
`grading` field of the exam does not apply to it, and `penalty` does, as for any
other question. See [Grading](../exam.md#grading).


## Feedback

An upload question has no feedback syntax. A `>` block after the `[upload]` tag
is an ordinary block quote of the epilogue, as in an essay.


## Response

The response is a list of files, from 1 to `maxFiles`. Each file is a mapping
with three keys:

| Key  | Type    | Description                                                        |
| ---- | ------- | ------------------------------------------------------------------ |
| name | string  | The name of the file, as the student sent it. A file name[^3]                     |
| path | string  | Where the host keeps the file. Not empty                            |
| size | integer | The size of the file in bytes, from 0 to 2⁵³ − 1[^5]                 |

[^5]: A number with no fractional part, such as `1.0`, is the integer `1`,
since JSON does not tell them apart. A boolean is not a number.
[^3]: The `file-name` rule of `schema/question-base.yaml`: not empty, not `.`
or `..`, not only Unicode spaces, with no `/` and no `\`.

```yaml
response:
  - name: ciclo-da-agua.pdf
    path: uploads/2026/ana/ciclo-da-agua.pdf
    size: 482133
```

`path` is opaque to MDQ. It is whatever lets the host find the bytes again: a
path on disk, a URL, a key of a store addressed by content. MDQ does not read
it, compare it or resolve it. Two hosts can write different paths for the same
file.

The response is malformed (`ResponseError`) when:

* it is not a list, or it is an empty list;
* an item is not a mapping, misses a key, or has a key other than `name`,
  `path` and `size`;
* a `name` is not a string, or breaks the file name rule: it is empty, `.` or
  `..`, only Unicode spaces, or has a `/` or a `\`;
* a `path` is not a string, or is empty;
* a `size` is not an integer from 0 to 2⁵³ − 1: a boolean, a negative number, a
  number with a fractional part or a larger number;
* two items have the same `name`, compared code point by code point, with no
  normalization (a host MAY apply a stricter rule when it stores the files);
* it has more items than `maxFiles`;
* a `size` is larger than `maxSize`;
* a `name` matches no item of `extensions`, when `extensions` is set.

A response with no file is a skip: it is `null`, not `[]`. See
[Skipping](../responses.md#skipping).

The checks above are the same that a host SHOULD apply when the student sends
the files, so that the student gets the reason at once and not when the
exam is graded.


## Public form

The [public form](../public-form.md) keeps `maxFiles`, `maxSize` and `extensions`.
`maxSize` keeps the form of the document: an integer stays an integer, and a
string stays the same string. `answerKey` is private. The list of
[correct responses](../public-form.md#correct-responses) is always empty: a
response is a list of files, which a document cannot write down. Unlike an
essay, the answer key is not a correct response.


## Additional Rules

| Field     | Level    | Code                      | Rule                                                       |
| --------- | -------- | ------------------------- | ---------------------------------------------------------- |
| maxFiles  | error    | schema-error              | must be an integer, at least 1 (schema)                    |
| maxSize   | error    | schema-error              | must be an integer from 1 to 2⁵³ − 1, or a size string (schema)[^4] |
| extensions | error   | schema-error              | must be a list of at least one extension, with no repeated item (schema) |
| extensions | error   | schema-error              | each item must start with `.` and use only `a-z`, `0-9`, `.`, `_`, `+` and `-` (schema) |
| body      | error    | parse-error               | the paragraph of the tag must be only `[upload]`, in lower case |
| body      | error    | foreign-choice-marker     | the `[upload]` tag cannot be a list item                   |
| epilogue  | error    | detached-tag              | cannot have a paragraph with only `[upload]`               |
| answerKey | error    | parse-error               | at most one `## [answer-key]` section may be declared      |
| answerKey | error    | forbidden-block-element   | cannot have an `H1` heading                                |
| answerKey | error    | forbidden-block-element   | cannot have a heading that starts with `[`, links excepted |
| answerKey | error    | invalid-frontmatter-field | cannot be set in the frontmatter of a Markdown source      |
| answerKey | error    | blank-text                | if defined, must have at least one visible character       |
| answerKey | info     | missing-answer-key        | is not defined in the document                             |

[^4]: A string whose size rounds down to 0 bytes, such as `0.5 B`, or is
larger than 2⁵³ − 1 bytes, is also a `schema-error`. The schema cannot express
it, so the model checks it, with the same code.
