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
string** does not include the `#` and first space, if present. An empty
**comment string** (no character after the `#`) is not stored; one of only
whitespace is stored.

The grammar for the frontmatter is:

```lark
frontmatter    : separator nl blank_line* comment_string? yaml separator nl
separator      : "---"
blank_line     : ws? nl
comment_string : COMMENT_LINE+
```

The terminals `ws`, `nl` and `COMMENT_LINE` are defined in
[Common grammar rules](../references/grammar.md).

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

The frontmatter MAY hold only the fields of the frontmatter table of its
question type and the fields of the table below. Any other key is an error
(`invalid-frontmatter-field`). This covers a field that the body sets (for
example `stem`, `choices`, `answer`, `blanks`, `accept` or `reject`, and the
`unit` of a numeric question) and a key that no question type defines. The
message of the error says when the key is a field of the body, and shows the
body syntax that sets it. Only `id` and `type` can be set both in the
frontmatter and in the body.

This rule is for Markdown. A question written in YAML or JSON has no
frontmatter: all the fields of its schema are valid, and an unknown key is a
`schema-error`.

| Field  | Type               | Description                                                          |
| ------ | ------------------ | -------------------------------------------------------------------- |
| type   | string             | Force a question type (instead of inferring it)[^1]                  |
| title  | string             | A human-readable title.                                              |
| id     | string             | Slug identifier. Unique in the context of a single question set.[^2] |
| uuid   | string             | A universally unique identifier.[^3]                                 |
| tags   | string[] or string | A list of strings or a single comma delimited strings.               |
| author | string             | Question author                                                      |
| locale | string             | A locale specification (e.g., pt-BR)[^4]                             |
| meta   | object             | Mapping of strings to arbitrary JSON. User-defined meta information. |
| weight | number             | Weight of the question in the exam score. Defaults to 1.[^5]         |

[^1]: MUST be a valid question type.
[^2]: Slug SHOULD be url-safe according to the REGEX `[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*`.
[^3]: Must be a valid UUID, ``xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx`` where `M` is the version and `N` is the variant. `M` and `N` SHOULD correspond to a existing standard.
[^4]: MUST be a well-formed [IETF BCP 47](https://www.rfc-editor.org/rfc/rfc5646)
language tag: a string the grammar of RFC 5646 section 2.1 accepts (`langtag`,
`privateuse` or a grandfathered tag), compared case-insensitively. Whether a
subtag is registered is not checked, so `brasil` is well-formed and `pt_BR`
is not. MDQ does little with the locale, so a host that needs a registered
or supported language applies its own rule.
[^5]: MUST NOT be negative. The exam score is the weighted mean of its question scores, so a weight of 0 keeps the question in the exam without counting towards the score.

A mapping MUST NOT repeat a key. A repeated key is an error
(`yaml-syntax-error`), not a value that replaces the first one, since it is
almost always a mistake.

The frontmatter, and a question or exam written directly in YAML, follow the
[YAML 1.2 Core schema](https://yaml.org/spec/1.2.2/#103-core-schema): a plain
scalar is `null` (`null`, `Null`, `NULL`, `~` or nothing), a boolean (`true`,
`True`, `TRUE`, `false`, `False`, `FALSE`), an integer (decimal, `0o17`,
`0x1F`), a float (`1.5`, `1e3`, `.inf`, `.nan`) or else a string. YAML 1.1
forms are plain strings: `yes`, `no`, `on`, `off`, a timestamp such as
`2026-03-10`, the base-60 `1:30`, `010` is the decimal 10, not the octal 8.
A parser built on a YAML 1.1 library MUST be configured to match.

A value keeps its YAML type and is never converted. A field of type string
MUST hold a YAML string: `id: 2024` is a number and is an error, so a
numeric-looking id is quoted (`id: "2024"`). A `null` value (the key with
nothing after it, `~` or `null`) in any OPTIONAL field is the same as an absent
field: `weight: null` is `weight: 1`, and `title:` is no title. This applies
to every document, in Markdown, YAML and JSON, and to nested objects such as
choices and blanks.

If `id` is set both in the frontmatter and as a [slug](#slug), the frontmatter
takes precedence. An implementation SHOULD report `redundant-id` in this case,
whether the two values are equal or not. When they are different, the message
says that the frontmatter value wins.

## Stem

The stem is a REQUIRED sequence of one or more markdown block elements
(paragraphs, tables, lists, etc) before the body. It holds the context of the
question and the main instruction for the students (e.g. "Mark the correct
alternative"). Every block between the frontmatter (and the [slug](#slug)) and
the body is part of the stem.

### Forbidden elements

Most markdown block elements are valid in the stem and in the epilogue. A few
constructions are rejected because they may be mistaken for the body element.
For multiple choice questions, for instances, the body is the unordered list
starting with the `[ ]` checkmarks.

Below is the list of invalid elements. In each, a bracket that starts a
markdown link (`[text](url)`, `[text][ref]`) does not count: a paragraph, a
heading or a list item can start with a link. A link reference definition
(`[ref]: url`) is not a paragraph, so it is valid too, unless it is an MDQ tag
line such as `[numeric]: 42`.

* Unordered lists if all elements start with optional `ws` + `[`.
* Paragraph that starts with optional `ws` + `[`, except the first paragraph, or
  if the `[` character is immediately followed by a `^` character[^6].
* H1 headings.
* Heading starting with optional `ws` + `[`.

An unordered list in which only some items start with a
[choice marker](../references/choices.md#choice-marker) is valid, but it is
almost always a broken choice list: a typo in one item makes the whole list
prose, and the question can lose its body. Implementations SHOULD report each
item of such a list whose marker is a value of a choice type (`[ ]`, `[x]`,
`[*]`, a percentage or a letter) or is empty, `[]` (`stray-choice-marker`).

```md
* [x] Manaus
* [IBGE](https://www.ibge.gov.br)
* [ ] Santos
```

[^6]: This exception is for the reference-style syntax used to represent the
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
frontmatter field `id: Q1`. If both are set, the frontmatter takes precedence
and the `redundant-id` warning is reported, see [Frontmatter](#frontmatter).

The slug MUST match the `SLUG` terminal of
[Common grammar rules](../references/grammar.md):

```lark
SLUG: /[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*/
```

A bracket at the start of the paragraph is a slug only when its content
matches `SLUG` and the next character is not `(` or `[`, which open a markdown
link (`[text](url)`, `[text][ref]`). A paragraph that starts with a link has no
slug, and the link is part of the text:

```md
[Amazonia](https://pt.wikipedia.org/wiki/Amazônia) é o maior bioma de qual país?
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
Here, whitespace means only spaces and tabs, the `ws` rule of
[Common grammar rules](../references/grammar.md).


## Body

The body is one or more block-level markdown elements that are specific to each
question type. Multiple choice, for instance, requires the block to be an 
unordered list with every item starting with `[value]`, and value is either
spaces and tabs, the character `*`, or a percentage like in `[50%]`.

Each question type defines their body elements. For all questions the body is 
REQUIRED.

### Type inference

A question without `type` in the frontmatter takes its type from the body.
Short answer, numeric, essay, ordering and fill in the blanks questions are
identified by the bracketed tag that opens their body, see each type. A body
that is a [choice list](../references/choices.md) takes its type from the
normalized values of its choice markers (see
[Choice marker](../references/choices.md#choice-marker)). The first rule that
applies wins. A value is read without the `ws` around it, so `[ T ]`, `[ x ]`
and `[ * ]` have the values `T`, `x` and `*`:

1. a value is `*` or a percentage: multiple choice;
2. a value is `x` or `X`: multiple selection;
3. a value is a [letter](true-false.md#body), as written: true/false;
4. otherwise: multiple selection. This covers a list whose values are all
   blank, and a list of blank and unknown values such as `[ ]` and `[?]`.

Once the type is known, inferred or forced by `type`, every value MUST belong
to the `value` rule of that type: `[x]` in a multiple choice list, `[ ]` in a
true/false list, `[*]` in a list forced to multiple selection, or a `[?]`
anywhere is a `foreign-choice-marker` error. An implementation MUST NOT read
such a value as an unmarked choice: the answer key would change in silence.


## Epilogue

Any block elements below the body are collected in the epilogue. The block
elements MUST follow the same rules as the block elements of the stem.

Sections that are specific to a type, such as the `## [answer-key]` section of
an essay or the `## [extra]`, `## [accept]` and `## [reject]` sections of an
ordering question, come after the epilogue. The epilogue ends where the first
of those sections starts, so it MUST NOT contain a `## [name]` heading.

The heading of such a section is a CommonMark `H2` heading whose text is the
name in square brackets, alone on its line. It accepts every form CommonMark
gives an `H2`:

* up to 3 spaces of indentation before `##`;
* trailing spaces;
* an ATX closing sequence (`## [extra] ##`);
* a setext heading, with the name underlined by `---`.

```md
[extra]
-------
```

An implementation SHOULD warn about the setext form inside an exam, where the
underline is easy to mistake for a block boundary (`setext-heading`, see
[exam](../exam.md#question-and-include-blocks)). The warning points at the
section (`answerKey`, `extra`, or `accept`/`reject` with the section index).
A section with no content is a `parse-error`, except where the question type
says otherwise (the `## [answer-key]` section of an essay).

Inside a `ul` content block, a heading indented by 2 columns or more belongs
to the last item of the list, as in CommonMark; indent the heading by at most 1
column there, or use a code block.


## Automation

Every question has an **automation**, which tells how many responses the
question settles without the instructor:

| Automation       | Meaning                                            |
| ---------------- | -------------------------------------------------- |
| `automatic`      | every response gets a score                        |
| `semi-automatic` | some responses get a score, the others are pending |
| `manual`         | every response is pending                          |

Multiple choice, multiple selection, true/false and numeric questions are
`automatic`. Essay questions are `manual`. A [short answer](short-answer.md#automation)
question, an [ordering](ordering.md#automation) question and a
[fill in the blanks](fill-in.md#automation) question derive it from their
fields.

Automation is a derived property, never a field of the document. It MUST NOT
appear in the frontmatter of a question or in its YAML or JSON form. An
implementation SHOULD offer it as a read-only property of the question. A
response that is not settled is reported as pending, see
[responses.md](../responses.md#pending).


## AST representation

The spec defines both a markdown and the parsed corresponding YAML/JSON AST 
representation. For each question AST MUST conforms to a JSON Schema. The schema
provides only a initial validation step: all ASTs are valid acording to the
schema, but a conforming AST needs to obey additional rules.

Also, we define some optional rules that are desired for a well formed
documents, but are not strictly required. Implementations SHOULD provide
validations for those optional rules in the form of linting or warnings.

This section documents how a question maps to its AST and the rules an AST
must follow beyond its JSON Schema.

### Markdown to AST mapping

The AST for questions is represented by a root object with a set of fields that
vary from question type.

In all question types, all fields in the frontmatter are translated as-is to
fields in the AST, with two exceptions: `tags` written as a single
comma-delimited string becomes the list of its parts, each stripped of
surrounding whitespace (an empty part after a final comma is dropped, so
`"cerrado, bioma,"` is `[cerrado, bioma]`), and the per-type shorthands that each question type
documents (`normalizations` as a bare string in ordering, the `preAccept`,
`preReject` and `incorrectFeedback` maps in fill in the blanks). The fields carry the same name,
types, optionality and validation rules as in the frontmatter. Validation rules that can be described
by a JSON Schema are defined in the corresponding schema document. We only
document here the validations that require additional processing.

This spec distinguish optional from nullable fields. An OPTIONAL field may or
may not appear in a document. In Javascript, OPTIONAL fields might also assume
the value `undefined`. A NULLABLE field can take the value of some type or
`null`. If not specified, a NULLABLE field must appear in the document with a
value of `null`. Fields can be both OPTIONAL and NULLABLE at the same time.

The `stem` and `epilogue` fields are derived from the corresponding
markdown block elements and are represented by strings. `epilogue` is
OPTIONAL. The string can be created by taking a verbatim copy of
those elements in the body of text, but implementations MAY perform any
normalization step that do not affect markdown semantics. For instance,
implementations may remove word wrap and normalize whitespace since both have no
influence in the resulting rendered markdown.

The same license applies to the frontmatter **comment string**: a comment
that spans several `#` lines MAY be joined into one line with single spaces.

Each question defines their own rules for translating the body and eventual 
additional fields. Those rules are covered in their own dedicated document.


## Additional Rules

This section documents only the rules that are NOT captured by the JSON schema and
requires additional programatic support in compliant implementations. Each rule
is assigned a strictness level of "error", "warning", "info". 

* **error:** MUST be enforced on compliant documents. 
* **warning**: considered to be bad practices, but still can produce usable
  documents. SHOULD be enforced on compliant documents under some optional flag.
* **info**: violations that may indicate flaws in the document and might be
  relevant to know for a user authoring a question, but still produces valid and
  usable documents.

The JSON Schema is normative for the shape of a document. It validates the
document after the removal of each `null` value of an OPTIONAL field (see
[Frontmatter](#frontmatter)). A list field MUST have at least the number of
items the schema states (`minItems`). Each question type lists its minimums
below. A free-text field (`title`, `author`, `comment`, `stem`,
`epilogue`, choice text, feedback and the like) and each entry of `tags` MUST
have at least one [visible
character](../references/grammar.md#visible-characters) when it is defined. The
schema does not check this: an empty or whitespace-only string is the
`blank-text` error. A `null` value is an absent field, or a `schema-error` in a
required field. Identifiers and syntax fields, such as `id`, are not free text:
the schema rejects their empty string.

| Field                    | Level    | Code                      | Rule |
| ------------------------ | -------- | ------------------------- | -------------------- |
| title, author, comment, epilogue, stem | error    | blank-text | if defined, must have at least one visible character |
| epilogue, stem           | error    | forbidden-block-element   | cannot have explicitly forbidden block elements[^7] |
| locale                   | error    | malformed-locale          | must be a well-formed IETF BCP 47 tag[^4] |
| id                       | warning  | unsafe-id                 | should be url-safe[^2] |
| tags                     | error    | blank-text                | each entry must have at least one visible character |
| tags                     | warning  | unsplit-tag-list          | an entry containing a comma is only split when `tags` itself is a single string, not a list |
| uuid                     | error    | malformed-uuid            | must be a well-formed UUID[^3] |
| uuid                     | warning  | uuid-unknown-version      | the version nibble should correspond to an existing standard[^3] |
| uuid                     | warning  | uuid-unknown-variant      | the variant nibble should correspond to an existing standard[^3] |
| id                       | info     | missing-id                | the field is not defined in the document |
| title                    | info     | missing-title             | the field is not defined in the document |
| locale                   | info     | locale-lookalike-language | the language subtag looks like a country code[^8]           |
| epilogue, stem           | warning  | unsafe-thematic-break     | a thematic break should be `***` or `___`, not `---`[^9] |
| epilogue, stem           | warning  | stray-choice-marker       | a list item outside the body should not start with a choice value[^7] |
| any frontmatter key      | error    | invalid-frontmatter-field | must be a field of the frontmatter table of the question type or of the base table[^11] |
| id                       | warning  | redundant-id              | should not be set both in the frontmatter and as a slug[^12] |
| any text                 | warning  | non-ascii-whitespace      | U+0085, U+2028, U+2029, or a Unicode space in a syntax position[^10] |
| any text                 | info     | non-ascii-whitespace-in-prose | any other Unicode space outside ASCII[^10]                       |

[^11]: A field that the body sets, or a key that no question type defines,
is not valid in the frontmatter. See [Frontmatter](#frontmatter).
[^12]: The frontmatter value wins, whether the two values are equal or not.
See [Slug](#slug).
[^7]: Those elements are described in the section [forbidden elements](#forbidden-elements)
[^8]: For example `cn` (a country code) instead of `zh` (the language). The
`malformed-locale` check only tests that the tag is well-formed under BCP 47,
not whether the subtag names a real language.
[^9]: Inside an exam a `---` line opens a frontmatter or include block, so a
thematic break written with `-` changes meaning when the question is pasted
into one (`unsafe-thematic-break`, see [exam.md](../exam.md#question-and-include-blocks)).
[^10]: Specified in [Common grammar rules](../references/grammar.md#the-non-ascii-whitespace-lint):
`non-ascii-whitespace` (warning) for U+0085, U+2028, U+2029 and for a Unicode
space in a syntax position, `non-ascii-whitespace-in-prose` (info) for any other
Unicode space.
