# Base abstract type

All question types share a common structure and define a common set of fields.
The markdown document is divided into 5 sections in this exact order: a YAML 
front-matter, introduction, body, epilogue and a question specific additional
section.

This is the basic structure:

```md
---
# Optional YAML front-matter. It expects a valid YAML document with some specific
# fields. This initial comment block is meaningful and is stored in the 
# parsed outcome.
---

Question introduction and instructions.

<Question body, this depends on the question type>

Epilogue paragraphs, after the question body.

<Special sections for specific question types, usually empty>
```

Both the frontmatter and the epilogue are optional. The introduction and body 
are required.


## Frontmatter

The frontmatter is a YAML document representing an object. The first paragraph
of comments MUST be read and stored as a **comment string**. The **comment
string** does not include the `#` and first space, if present.

The grammar for the frontmatter is:

```
frontmatter : separator ws? comment_string? yaml separator
separator   : "---"
ws          : /\s+/

comment_string : COMMENT_LINE+
COMMENT_LINE   : /#[^\n]*\n/
```

WARNING: a blank line (without `#`) breaks the comment string, as in the example:

```md
---
# This line is part of the comment string
# This line also

# This line is a standard YAML comment and is most likely ignored during parsing.
---
```

The frontmatter object is a mapping of fields and the corresponding values. The
exact list of fields depends on the question type, but some are common to all
questions. All fields are optional.

| Field  | Type               | Description                                                          |
| ------ | ------------------ | -------------------------------------------------------------------- |
| type   | string             | Force a question type (instead of inferring it)[^1]                  |
| title  | string             | A human-readable title.                                              |
| id     | string or number   | Slug identifier. Unique in the context of a single question set.[^2] |
| uuid   | string             | A universally unique identifier.[^3]                                 |
| tags   | string[] or string | A list of strings or a single comma delimited strings.               |
| author | string             | Question author                                                      |
| locale | string             | A locale specification (e.g., pt-BR)[^4]                             |
| meta   | object             | Mapping of strings to arbitrary JSON. User-defined meta information. |
| weight | number             | Weight of the question in the exam score. Defaults to 1.[^5]         |

[^1]: MUST be a valid question type.
[^2]: Slug SHOULD be url-safe according to the REGEX `[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*`.
[^3]: Must be a valid UUID, ``xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`` where `M` is the version and `N` is the variant. `M` and `N` SHOULD correspond to a existing standard.
[^4]: MUST be a valid [IETF BCP 47](https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag) language tag.
[^5]: MUST NOT be negative. The exam score is the weighted mean of its question scores, so a weight of 0 keeps the question in the exam without counting towards the score.

If there is a collision of a field that is specified both in the frontmatter and
elsewhere, the frontmatter takes precedence.

## Introduction 

The introduction comprises a preamble and a stem. The preamble is a
sequence of zero or more markdown block elements (paragraphs, tables, lists, etc). 

The stem is a REQUIRED block of text before the body. It is the main instruction
for the students (e.g. "Mark the correct alternative"). Implementations SHOULD
require that the stem is a paragraph of text (and not other block elements such
as tables, lists, etc).

If the stem consists of a single ellipsis, it MAY be replaced by a default
statement for the question type.

```md
...
* [ ] Earth is flat.
* [*] Markdown is cool.
``` 

This can be expanded to 

```md
Mark the correct answer.
* [ ] Earth is flat.
* [*] Markdown is cool.
``` 

### Forbidden elements

Most markdown block elements are valid in the preamble, epilogue and stem. A few
constructions are rejected because they may be mistaken for the body element.
For multiple choice questions, for instances, the body is the unordered list
starting with the `[ ]` checkmarks.

Below is the list of invalid elements.

* Unordered lists if all elements start with optional whitespace + `[`.
* Paragraph that starts with optional whitespace + `[`, except the first paragraph, or
  if the `[` character is immediately followed by a `^` character[^5].
* H1 headings.
* Heading starting with optional whitespace + `[`.

[^5]: This exception is for the reference-style syntax used to represent the
blanks of a fill-in question. Without it, a fill-in question could not have a
paragraph starting with a blank.


### Slug

If the first element is a paragraph element, it may begin with a slug identifier
between square brackets. The slug should be unique in the context of a single
question set, but often parsers cannot validate this from only local file 
information.

An example shows this:

```md
[Q1] Which is the largest tree in the Amazon rainforest?
...
``` 

This marks the question with the slug `Q1`. This is equivalent to the
frontmatter field `id: Q1`, and if both are set the frontmatter takes
precedence.

The slug SHOULD obey the regex:

```regex
[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*
```

Implementations MAY widen the allowed characters under an option flag.


### Bracketed tags

Slugs and the type tags of the question types below share a bracketed spelling
-- `[Q1]`, `[choice-id]`, `[^capital]`, `[essay]`, `[numeric(kg)]`,
`[short-answer/accept]`. No whitespace is allowed anywhere between the
brackets: `[ Q1 ]` and `[short-answer /accept]` are NOT tags, and are left
alone as ordinary inline text. This mirrors what most markdown parsers already do with
`[this]` versus `[ this ]`, and it keeps the tag grammars free of optional
whitespace at every position.

Whitespace outside the brackets is unaffected: a tag may be indented, and a
tag followed by `:` may have spaces around the colon and before the value.


## Body

The body is one or more block-level markdown elements that are specific to each
question type. Multiple choice, for instance, requires the block to be an 
unordered list with every item starting with `[value]`, and value is either
whitespace, the character `*`, or a percentage like in `[50%]`.

Each question type defines their body elements. For all questions the body is 
REQUIRED.


## Epilogue

Any block elements below the body are collected in the epilogue. The block
elements MUST follow the same rules as the block elements of the preamble.

Some question types may define optional block elements that appear
after the epilogue.


## AST representation

The spec defines both a markdown and the parsed corresponding YAML/JSON AST 
representation. For each question AST MUST conforms to a JSON Schema. The schema
provides only a initial validation step: all ASTs are valid acording to the
schema, but a conforming AST needs to obey additional rules.

Also, we define some optional rules that are desired for a well formed
documents, but are not strictly required. Implementations SHOULD provide
validations for those optional rules in the form of linting or warnings.

This section documents the 


### Markdown to AST mapping

The AST for questions is represented by a root object with a set of fields that
vary from question type.

In all question types, all fields in the frontmatter are translated as-is to
fields in the AST. The fields carry the same name, types, optionality and
validation rules as in the frontmatter. Validation rules that can be described
by a JSON Schema are defined in the corresponding schema document. We only
document here the validations that require additional processing.

This spec distinguish optional from nullable fields. An OPTIONAL field may or
may not appear in a document. In Javascript, OPTIONAL fields might also assume
the value `undefined`. A NULLABLE field can take the value of some type or
`null`. If not specified, a NULLABLE field must appear in the document with a
value of `null`. Fields can be both OPTIONAL and NULLABLE at the same time.

The `preamble`, `epilogue`, and `stem` fields are derived from the corresponding
markdown block elements and are represented by strings. `preamble` and
`epilogue` are OPTIONAL. The string can be created by taking a verbatim copy of
those elements in the body of text, but implementations MAY perform any
normalization step that do not affect markdown semantics. For instance,
implementations may remove word wrap and normalize whitespace since both have no
influence in the resulting rendered markdown.

Each question defines their own rules for translating the body and eventual 
additional fields. Those rules are covered in their own dedicated document.


### Additional Rules

This section documents only the rules that are NOT captured by the JSON schema and
requires additional programatic support in compliant implementations. Each rule
is assigned a strictness level of "critical", "warning", "info". 

* **critical:** MUST be enforced on compliant documents. 
* **warning**: considered to be bad practices, but still can produce usable
  documents. SHOULD be enforced on compliant documents under some optional flag.
* **info**: violations that may indicate flaws in the document and might be
  relevant to know for a user authoring a question, but still produces valid and
  usable documents.

| Field                    | Level    | Rule                                                |
| ------------------------ | -------- | --------------------------------------------------- |
| preamble, epilogue, stem | critical | must have at least one visisible character          |
| preamble, epilogue, stem | critical | cannot have explicitly forbidden block elements[^6] |
| locale                   | critical | must be a valide IETF BCP 47 tag[^4]                |
| id                       | warning  | must be url-safe[^2]                                |
| stem                     | warning  | must be a markdown `p` block element                |
| uuid                     | warning  | must be a valid UUID[^3]                            |
| id, title                | info     | field must be defined in the document               |

[^6]: Those elements are described in the section [forbidden elements](#forbidden-elements)