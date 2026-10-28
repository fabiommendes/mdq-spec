# Essay

## Example

Essay questions expect a textual (usually open-ended) response.

```md
Describe how the greenhouse effect works and how it affects the climate.

[essay]
```

## Frontmatter

Essay questions accept the following extra fields in the
frontmatter:

| Field     | Type    | Description                                |
| --------- | ------- | ------------------------------------------ |
| type      | "essay" | The type discriminator                     |
| content   | string  | Either "code", "text" or "plain"[^2]       |
| highlight | string  | Programming language of "code" content[^1] |

[^1]: Allowed only when `content` is "code". With any other content, or with
no `content` (the default is "text"), it is a `schema-error`. It MUST NOT be
the empty string.
[^2]: Default is "text".

The `answerKey` field is not a frontmatter field. A Markdown source sets it with
the [answer key section](#answer-key).

MDQ has no field for the length of the response or for attachments. An author
who wants a limit, such as a maximum number of words, writes it in the stem or
in `meta`. MDQ does not enforce it.


## Body

The body is a paragraph whose only content is the `[essay]` tag, in lower case.
The tag has no colon and no content, see
[Body tags](question-base.md#body-tags). It MAY be indented, as in other types,
and MAY be followed by spaces or tabs.

```lark
essay : ws? "[essay]" ws?
```

The rule `ws` is defined in
[Common grammar rules](../references/grammar.md). The rule applies to the text
of a paragraph. A list item or a heading that holds `[essay]`, such as
`* [essay]` or `## [essay]`, is not the tag. A paragraph with more text than the
tag, such as `[essay] with at most 200 words`, is a `parse-error`, when it is
at the tag position: no paragraph with only `[essay]` follows it. Before a
real tag, `[essay] with at most 200 words` is text of the stem, and a stem
paragraph that starts with `[` is a `forbidden-block-element`, see
[Forbidden elements](question-base.md#forbidden-elements). A second paragraph with only `[essay]` is in the epilogue, so it is a
`detached-tag` error, see
[Tags after the epilogue starts](question-base.md#tags-after-the-epilogue-starts).
A tag in another case, such as `[Essay]`, is a `parse-error` too, see
[Case of tags](question-base.md#case-of-tags).

These cases have no tag, and each one has its own diagnostic:

| Body                                                       | Result                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| `## [essay]`, `> [essay]`, or `[essay]` indented 4 spaces  | `parse-error`: the question has no body                    |
| no `[essay]` paragraph at all                              | `parse-error`: the question has no body                    |
| an `## [answer-key]` section before the tag                | `forbidden-block-element` at `stem`                        |
| `* [essay]` (a list item) and no `type`                    | `foreign-choice-marker` at `choices`                       |
| `* [essay]` (a list item) with `type: essay`               | `schema-error` at `choices`                                |

A paragraph with only `[essay]` is always the tag. It is never a
[slug](question-base.md#slug). A slug can be `essay`, since the name of a type
is a valid slug: in `[essay] Describe the Pantanal.`, at the start of the first
paragraph, `essay` is the id of the question.


## Content

The `content` field describes the kind of response the student writes. It is
"code", "text" or "plain". When omitted, it is "text".

* "code": the response is a code snippet. `highlight` specifies the
  programming language for syntax highlighting.
* "text": the response is rich text, and the editor MAY support Markdown or
  other formatting.
* "plain": the response is plain text without any formatting. Rich text widgets
  are not shown to students.

| Value   | Set by                                 | Meaning                                                      |
| ------- | -------------------------------------- | ------------------------------------------------------------ |
| "text"  | the frontmatter; the default           | The response is rich text. The format depends on the host.   |
| "plain" | the frontmatter                        | The response is plain text, as typed.                        |
| "code"  | the frontmatter                        | The response is code. `highlight` is the language.           |

The `highlight` field is allowed only with `content` "code". With "text" or
"plain", and when `content` is omitted, `highlight` is a `schema-error`.

Implementations MAY report, at the info level, a `highlight` that is not a
recognized language identifier (`unknown-highlight-language`), and a question
with `content` "code" and no `highlight` (`code-content-without-highlight`).

The ordering type has a `content` field too, but it takes a subset of these
values ("code" and "text"), with another meaning and source: the body of the
question sets it. See [Ordering](ordering.md#content).

The response is always a string. For "plain" and "code", it is the text the
student wrote, as typed. For "text", its format depends on the host (for
example Markdown or HTML), and MDQ does not define it. See
[Response](#response).


## Answer key

The answer key section is optional. It is a model answer that guides the
instructor who grades the response.

The section is placed after the `[essay]` tag and after the epilogue, if there
is one. It starts with an `H2` heading with the text `[answer-key]` alone on its
line. It holds the blocks after the heading, up to the end of the question: the
end of the file or, in an exam, the next block.

```lark
answer_key : blank_line* atx_answer_key nl md_block*
           | blank_line+ setext_answer_key nl md_block*
atx_answer_key    : ws? "##" ws "[answer-key]" (ws ("#"+ ws?)?)?
setext_answer_key : ws? "[answer-key]" ws? nl ws? "-"+ ws?
```

The rules `ws`, `nl` and `blank_line` are defined in
[Common grammar rules](../references/grammar.md). A setext heading needs a blank
line before it: without one, `[answer-key]` is a lazy line of the paragraph
before it, as in CommonMark. `md_block` is any CommonMark
block except an H1 heading.

The heading follows the
[heading rule of type-specific sections](question-base.md#epilogue): an ATX
heading (`## [answer-key]`, with the indentation, trailing spaces and closing
sequence CommonMark allows) or a setext heading, as CommonMark reads both as
`H2`:

```md
[answer-key]
------------
```

The section holds any block, headings included, except an `H1` heading. A
heading of the section, such as `### Criteria`, does not end it. Text after the
section is part of the answer key, not an epilogue.

The blocks of the section, without the heading, are the `answerKey` field. The
field allows the same normalization as `stem` and `epilogue`.

```md
Describe how the greenhouse effect works and how it affects the climate.

[essay]

## [answer-key]
The greenhouse effect is a natural process that warms the Earth's surface.
Greenhouse gases in the atmosphere, such as carbon dioxide, methane, and water
vapor, trap part of the heat that the Earth emits. Human activities have
increased the concentration of these gases, which leads to global warming.
```

The same question as YAML:

```yaml
type: essay
stem: Describe how the greenhouse effect works and how it affects the climate.
answerKey: >-
  The greenhouse effect is a natural process that warms the Earth's surface.
  Greenhouse gases in the atmosphere, such as carbon dioxide, methane, and water
  vapor, trap part of the heat that the Earth emits. Human activities have
  increased the concentration of these gases, which leads to global warming.
```

A section with no block, only blank lines, defines no answer key: it is the
same as no section. It is not a `blank-text` error, since `## [answer-key]`
with nothing after it is a common placeholder in a template. Any other content
is a defined answer key, even when it shows nothing, such as an HTML comment.
The `blank-text` rule checks the raw string of that content: a section whose
only content is a U+200B is a `blank-text` error. A document MUST NOT have a second
`## [answer-key]` section (`parse-error`).

Implementations MAY report, at the info level, a question that defines no
answer key (`missing-answer-key`).

A footnote definition belongs to the field where it is. A reference defined in
the stem is not defined by a definition in the answer key, or in the epilogue.
A reference with no definition in its own field is text, as in CommonMark.

The answer key MUST NOT be shown to the student before the student submits the
response. A host MAY show it after that, even if the response is still
[pending](../responses.md#pending). This is a rule for hosts: no lint checks it.


## Grading

Every essay response is graded by the instructor, with a score in the range
[0, 1]. The answer key does not grade the response.

### Automation

The [automation](question-base.md#automation) of an essay is `manual`: every
response is pending until the instructor supplies a score. The `grading` field
of the exam does not apply to essays, and `penalty` does, as for any other
question. See [Grading](../exam.md#grading).


## Feedback

An essay has no feedback syntax. A `>` block after the `[essay]` tag is an
ordinary block quote of the epilogue, not feedback:

```md
Describe the Pantanal.

[essay]

> Good answers mention the floods.
```

Here the epilogue is `> Good answers mention the floods.`. A pending response
shows no feedback, see [Pending](../responses.md#pending).


## Response

The response to an essay question is a string. See
[responses](../responses.md#short-answer-and-essay) for the full shape.

* With `content` "plain" or "code", the response is the text that the student
  wrote, verbatim.
* With `content` "text", the format of the response depends on the host.

An empty response is a response, not a skip.


## Public form

The [public form](../public-form.md) keeps `content` and `highlight`. `answerKey` is private. The
[correct responses](../public-form.md#correct-responses) are the answer key, when it is present.


## Additional Rules

| Field     | Level    | Code                           | Rule                                                       |
| --------- | -------- | ------------------------------ | ---------------------------------------------------------- |
| content   | error    | schema-error                   | must be "code", "text" or "plain" (schema)                 |
| highlight | error    | schema-error                   | must not be empty (schema)                                 |
| highlight | error    | schema-error                   | must be omitted unless `content` is "code" (schema)        |
| body      | error    | parse-error                    | the paragraph of the tag must be only `[essay]`, in lower case[^5] |
| body      | error    | foreign-choice-marker          | the `[essay]` tag cannot be a list item[^4]                |
| epilogue  | error    | detached-tag                   | cannot have a paragraph with only `[essay]`                |
| answerKey | error    | parse-error                    | at most one `## [answer-key]` section may be declared      |
| answerKey | error    | forbidden-block-element        | cannot have an `H1` heading                                |
| answerKey | error    | invalid-frontmatter-field      | cannot be set in the frontmatter of a Markdown source      |
| answerKey | error    | blank-text                     | if defined, must have at least one visible character       |
| highlight | info     | unknown-highlight-language     | is not a recognized language identifier[^3]                |
| highlight | info     | code-content-without-highlight | is not defined when `content` is "code"                    |
| answerKey | info     | missing-answer-key             | is not defined in the document[^6]                         |

[^3]: Any alias of a [Pygments](https://pygments.org/) lexer is a recognized
language identifier. The match is case-insensitive (`Python` is `python`), and
the reference list is the one of the Pygments version that the implementation
ships.
[^4]: A list item such as `* [essay]` reads as a choice with a foreign marker
(see [Type inference](question-base.md#type-inference)).
[^5]: An example is `[essay] with at most 200 words`, when no tag follows it.
Other cases are in [Body](#body).
[^6]: An `## [answer-key]` section with no content is also reported, since it
defines no answer key.
