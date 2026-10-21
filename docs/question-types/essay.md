# Essay

## Example

Essay questions expect a textual (usually open-ended) response.

```md
Describe how the greenhouse effect works and how it affects the climate.

[essay]
```

## Frontmatter

Essay questions accept the following extra arguments in the
frontmatter:

| Field     | Type    | Description                                |
| --------- | ------- | ------------------------------------------ |
| type      | "essay" | The type discriminator                     |
| content   | string  | Either "code", "text" or "plain"[^2]       |
| highlight | string  | Programming language of "code" content[^1] |

[^1]: This property is ignored if `content` is not "code", and SHOULD be
omitted. It MUST NOT be the empty string.
[^2]: Default is "text".

The `answerKey` field is not a frontmatter field. A Markdown source sets it with
the [answer key section](#answer-key).

MDQ has no field for the length of the response or for attachments. An author
who wants a limit, such as a maximum number of words, writes it in the stem or
in `meta`. MDQ does not enforce it.


## Body

The body is a paragraph whose only content is the `[essay]` tag, in lower case.
The tag MAY be indented, as in other types, and MAY be followed by spaces or
tabs.

```lark
essay : ws? "[essay]" ws?
```

The rule `ws` is defined in
[Common grammar rules](../references/grammar.md). The rule applies to the text
of a paragraph. A list item or a heading that holds `[essay]`, such as
`* [essay]` or `## [essay]`, is not the tag. A paragraph with more text than the
tag, such as `[essay] with at most 200 words` or `[Essay]`, is a `parse-error`.
A second paragraph with only `[essay]` is a forbidden element of the epilogue,
see [Forbidden elements](question-base.md#forbidden-elements).

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

The ordering type has a `content` field too, with the values "code" and "text".
See [Ordering](ordering.md#frontmatter).

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
answer_key : ws? "##" ws "[answer-key]" ws? nl md_block*
```

The rules `ws` and `nl` are defined in
[Common grammar rules](../references/grammar.md). `md_block` is any
CommonMark block.

The heading is an ATX heading (`## [answer-key]`) or a setext heading, as
CommonMark reads both as `H2`:

```md
[answer-key]
------------
```

The section holds any block, headings included, except an `H1` heading. A
heading of the section, such as `### Criteria`, does not end it. Text after the
section is part of the answer key, not an epilogue.

The blocks of the section, without the heading, are the `answerKey` field. The
field has the same license of normalization as `stem` and `epilogue`.

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

A section with no content defines no answer key: it is the same as no section.
It is not a `blank-text` error, since `## [answer-key]` with nothing after it
is a common placeholder in a template. A document MUST NOT have a second
`## [answer-key]` section.

A footnote definition belongs to the field where it is. A reference defined in
the stem is not defined by a definition in the answer key, or in the epilogue.
A reference with no definition in its own field is text, as in CommonMark.

The answer key MUST NOT be shown to the student before the student submits the
response. A host MAY show it after that, even if the response is still
[pending](../responses.md#pending).


## Grading

Every essay response is graded by the instructor, with a score in the range
[0, 1]. The answer key does not grade the response.

### Automation

The [automation](question-base.md#automation) of an essay is `manual`: every
response is pending until the instructor supplies a score. The `grading` field
of the exam does not apply to essays, and `penalty` does, as for any other
question. See [Grading](../exam.md#grading).


## Response

The response to an essay question is a string. See
[responses](../responses.md#short-answer-and-essay) for the full shape.

* With `content` "plain" or "code", the response is the text that the student
  wrote, verbatim.
* With `content` "text", the format of the response depends on the host.

An empty response is a response, not a skip.


## Additional Rules

| Field     | Level    | Code                           | Rule                                                       |
| --------- | -------- | ------------------------------ | ---------------------------------------------------------- |
| content   | error    | schema-error                   | must be "code", "text" or "plain" (schema)                 |
| highlight | error    | schema-error                   | must not be empty (schema)                                 |
| body      | error    | parse-error                    | the paragraph of the tag must be only `[essay]`, in lower case[^5] |
| body      | error    | foreign-choice-marker          | the `[essay]` tag cannot be a list item[^4]                |
| epilogue  | error    | forbidden-block-element        | cannot have a paragraph with only `[essay]`                |
| answerKey | error    | parse-error                    | at most one `## [answer-key]` section may be declared      |
| answerKey | error    | forbidden-block-element        | cannot have an `H1` heading                                |
| answerKey | error    | invalid-frontmatter-field      | cannot be set in the frontmatter of a Markdown source      |
| answerKey | error    | blank-text                     | if defined, must have at least one visible character       |
| highlight | warning  | ignored-highlight              | should be omitted unless `content` is "code"               |
| highlight | info     | unknown-highlight-language     | is not a recognized language identifier[^3]                |
| highlight | info     | code-content-without-highlight | is not defined when `content` is "code"                    |
| answerKey | info     | missing-answer-key             | is not defined in the document[^6]                         |

[^3]: Any alias of a [Pygments](https://pygments.org/) lexer is a recognized
language identifier -- Pygments' own lexer aliases are the reference list.
[^4]: A list item such as `* [essay]` reads as a choice with a foreign marker
(see [Type inference](question-base.md#type-inference)).
[^5]: Examples are `[essay] with at most 200 words` and `[Essay]`.
[^6]: An `## [answer-key]` section with no content is also reported, since it
defines no answer key.
