# Generic fields

All question types share a common structure and define a common set of fields.
The markdown document is divided into 4 sections in this exact order: a YAML 
front-matter, introduction, body and epilogue.

This is the basic structure:

```md
---
# Optional YAML front-matter. It expect a valid YAML document with some specific
# fields. This initial comment block is meaningful and is stored as in the 
# parsed outcome.
---

Question introduction and instructions.

<Question body, this depends on the question type>

Epilogue paragraphs, after the question body.

<Special sections for specific question types, usually empty>
```

Both the frontmatter and the epilogue are optional. The introduction and body 
are required.

## Syntax 

### Frontmatter

The frontmatter is a YAML document representing an object. The first paragraph
of comments MUST be read and stored as a **comment string**. The **comment
string** do not include the `#` and first space, if present.

The grammar for the frontmatter is:

```
frontmatter : separator ws? comment_string? yaml separator
separator   : '---'
ws          : /\s+/

comment_string : comment_line+
comment_line   : /#[^\n]*/
```

WARNING: a blank line (without `#` breaks the comment string). Like in the example

```md
---
# This is line is part of the comment string
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

[^1]: Must be a valid question type.
[^2]: Slug MUST be url-safe according to the REGEX `[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*`.
[^3]: Must be a valid UUID, ``xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`` where `M` is the version and `N` is the variant.
[^4]: Must be a valid [IETF BCP 47](https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag) language tag.

If there is a collision of a field that is specified both in the frontmatter and
elsewhere, the frontmatter takes precedence.

## Introduction 

The introduction is comprised by a preamble and a stem. The preamble is a
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

Most markdown block elements are valid in the preamble. A few constructions
are rejected because they may be mistaken by a the body element. For multiple
choice questions, for instances, the body is the unordered list with the [ ] 
checkmarks.

Bellow is the list of invalid preamble elements.

* Unordered lists if all elements start with optional whitespace + `[`.
* Paragraph that starts with optional whitespace + `[`, except the first one.
* H1 headings.
* Heading starting with optional whitespace + `[`.

### The slug

If the first element is a paragraph element, it might begin with a slug identifier
between square brackets. The slug should be unique in the context of a single
question set, but often parsers cannot validate this from only local file 
information.

A example show this:

```md
[Q1] Which is the largest tree in the Amazon rainforest?
...
``` 

This marks the question with the slug `Q1`. This is equivalent to the
frontmatter field `id: Q1`, and if both are set the frontmatter takes
precedence.

The slug SHOULD obbey the regex:

```regex
[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*
```

## The body

The body is one or more block-level markdown elements that is specific for each
question type. Multiple choices, for instance, require the block to be an 
undordered list with every item starting with `[value]`, and value is either
whitespace, the character `*`, or a percentage like in `[50%]`.

Each question type defines their body elements. For all questions the body is 
REQUIRED.

## Epilogue

Any block elements bellow the body are collected in the epilogue. The block
elements MUST follow the same rules as the block elements of the preamble.

Some question types may define optional block elements that are defined
after the epilogue.

