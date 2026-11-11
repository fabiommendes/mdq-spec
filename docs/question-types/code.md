# Code

## Example

A code question asks the student for one source file. Test sources check the
file, and a rubric turns the result into a score.

````md
---
type: code
language: python
file: conta.py
---
[conta-de-luz] A tarifa de energia é R$ 0,80 por kWh. A bandeira tarifária
soma um adicional por kWh: verde R$ 0,00, amarela R$ 0,02 e vermelha R$ 0,05.

Escreva a função `valor_conta(kwh, bandeira)`, que devolve o total em reais.

[code]

## [template]

```python
def valor_conta(kwh, bandeira):
    ...
```

## [tests]

[testes da função](test_conta.py)

## [rubric]

* [+2] {manual} Nomes de variáveis claros
  ! Não descontar por nomes em inglês

## [answer-key]

```python
ADICIONAL = {"verde": 0.00, "amarela": 0.02, "vermelha": 0.05}

def valor_conta(kwh, bandeira):
    return kwh * (0.80 + ADICIONAL[bandeira])
```
````

The file `test_conta.py` holds the test cases and the annotations that bind
them to rubric items:

```python
import pytest
from conta import valor_conta

# mdq: [+3] {example} Acerta os exemplos do enunciado
def test_verde():
    assert valor_conta(100, "verde") == pytest.approx(80.00)

# mdq: [+5] Correta para qualquer consumo e bandeira
# mdq: > Confira o adicional de cada bandeira.
def test_vermelha():
    assert valor_conta(10, "vermelha") == pytest.approx(8.50)

# mdq: [-2] Aceita bandeira que não existe
def test_bandeira_invalida():
    with pytest.raises((KeyError, ValueError)):
        valor_conta(100, "roxa")
```

MDQ never runs code. A [runner](../runner-report.md), a program outside MDQ,
runs the test sources against the submission and returns a report. MDQ reads
the report and computes the score through the rubric. MDQ does not read the
content of a test source either, except for its annotations (lines with
`mdq:`).

The positive items above sum to 10. A student who passes every case but the
last has `(3 + 5 - 2) / 10 = 0.6` from the tests and waits for the instructor
to score the 2 points of the manual item.

## Frontmatter

Code questions accept the following extra fields in the frontmatter:

| Field    | Type   | Description                                         |
| -------- | ------ | --------------------------------------------------- |
| type     | "code" | The type discriminator                              |
| language | string | The programming language of the submission[^1]      |
| file     | string | The name of the file the student submits[^2]        |

[^1]: Optional. A string with at least one character that is not a
[Unicode space](../references/grammar.md#unicode-spaces): an empty string, or
one with only such characters, is a `schema-error`. The question has no `highlight` field: the host derives the
syntax highlighting from `language`. MDQ does not compare `language` with the
format of a test source. The host chooses the runner from the pair `language`
and test format, which tells apart a Prolog file from a Perl one, since both
have the extension `.pl`.
[^2]: Optional. A plain file name, with no `/` and no `\`. It MUST NOT be empty,
be only [Unicode spaces](../references/grammar.md#unicode-spaces), or be `.` or
`..` (`schema-error`). A test of input and output needs no name, so it omits the
field.

A question has no other frontmatter field of its own. `tests`, `rubric`,
`template` and `answerKey` are not frontmatter fields: a Markdown source sets
them with the [sections](#sections) below, and a key of the frontmatter with
one of these names is an `invalid-frontmatter-field` error.

This version of MDQ has no field for a time limit, a memory limit or the
number of attempts.

## Body

The body is a paragraph whose only content is the `[code]` tag, in lower case.
The tag has no colon and no content, see
[Body tags](question-base.md#body-tags). It MAY be indented, as in other types,
and MAY be followed by spaces or tabs.

```lark
code : ws? "[code]" ws?
```

The rule `ws` is defined in
[Common grammar rules](../references/grammar.md). The tag follows the same rules
as the [essay](essay.md#body) tag: a list item or a heading that holds
`[code]` is not the tag, a paragraph with more text than the tag is a
`parse-error` when it is at the tag position, a second paragraph with only
`[code]` is in the epilogue (`detached-tag`) and a tag in another case, such as
`[Code]`, is a `parse-error`. A paragraph with only `[code]` is always the tag
and never a [slug](question-base.md#slug). The question has the type `code`,
see [Type inference](question-base.md#type-inference).

| Body                                                       | Result                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------- |
| `## [code]`, `> [code]`, or `[code]` indented 4 spaces     | `parse-error`: the question has no body                    |
| no `[code]` paragraph at all                               | `parse-error`: the question has no body                    |
| a section before the tag                                   | `forbidden-block-element` at `stem`                        |
| `* [code]` (a list item) and no `type`                     | `foreign-choice-marker` at `choices`                       |
| `* [code]` (a list item) with `type: code`                 | `schema-error` at `choices`                                |
| `[code]: text`, with a colon                               | `parse-error`: the tag of a code question has no content: write `[code]` without a colon |

## Sections

The sections come after the `[code]` tag and after the epilogue, if there is
one. Each one starts with an `H2` heading whose text is the name in square
brackets, alone on its line, and follows the
[heading rule of type-specific sections](question-base.md#epilogue): an ATX
heading with the indentation, trailing spaces and closing sequence that
CommonMark allows, or a setext heading. A section ends at the next heading of a
section, or at the end of the question.

| Section             | Field        | Holds                                              |
| ------------------- | ------------ | -------------------------------------------------- |
| `## [template]`     | `template`   | one fenced code block                              |
| `## [tests]`        | `tests`      | fenced blocks and paragraphs with a link           |
| `## [rubric]`       | `rubric`     | one list of manual rubric items                    |
| `## [answer-key]`   | `answerKey`  | any block except an `H1` heading                   |

`## [template]`, `## [tests]` and `## [rubric]` come in any order, each at most
once. A second section of the same name is a `parse-error`. `## [answer-key]`,
when it exists, is the last section and holds every block up to the end of the
question, as in [essay](essay.md#answer-key). A section with no block, only
blank lines, is a `parse-error`, except `## [answer-key]`. A heading
`## [name]` with another name is not a section. Before the first section it
stays in the epilogue, where it is a `forbidden-block-element` error. After the
first section started it is a `parse-error`, since it would be a block of that
section, or a section in the wrong place (`## [hints]` after `## [tests]`). An
escaped heading, `## \[name]`, is a literal heading.

```lark
code_sections    : (template_section | tests_section | rubric_section)* answer_key?
template_section : blank_line* section_heading "template" nl fenced_block blank_line*
tests_section    : blank_line* section_heading "tests" nl blank_line* test_sources blank_line*
test_sources     : fenced_block (blank_line* test_sources)?
                 | link_paragraph (blank_line+ test_sources
                                  | blank_line* fenced_block (blank_line* test_sources)?)?
rubric_section   : blank_line* section_heading "rubric" nl rubric_list blank_line*
```

Two link paragraphs need a blank line between them, as CommonMark reads two
lines with no blank line as one paragraph. A fenced block needs no blank line
before or after it. `answer_key` is defined in [essay](essay.md#answer-key). `section_heading`
stands for the heading of the section, whose name follows it in the rules above.
`fenced_block` is a CommonMark fenced code block. `test_source` is defined
in [Test sources](#test-sources) and `rubric_list` in
[Rubric section](#rubric-section).

After `## [answer-key]`, a heading that the epilogue rule forbids (see
[essay](essay.md#answer-key)) is a `forbidden-block-element` error in every
question type, because it would be text of the answer key and hide a section
that is in the wrong place.

### Template

The template is the code the student starts from, in the editor. The section
holds exactly one fenced code block. In a Markdown source, a second block, any
other block, or an indented code block is a `parse-error`. The `template` field
is the Markdown source of the block, with its fences, as the `answerKey` field
is the Markdown source of its section. The info string of the fence is not
compared with `language`.

The rule holds in every form. In a document written as YAML or JSON, a
`template` that is not exactly one fenced code block, such as code with no
fence, prose around the block or two blocks, is a `forbidden-block-element`
error at `template`. A `template` that is empty or has no visible character is a
`blank-text` error. The model checks it, as it checks the `answerKey`. A
Markdown source keeps the `parse-error` of the grammar: the section is
read by the grammar before a model exists, and the same rule that makes a
section with no block a `parse-error` in every type applies, so the two forms
do not share one code.

### Test sources

The `## [tests]` section is a sequence of **test sources**, in order. A test
source is one of:

* A fenced code block. The first word of the info string is the
  [test format](#test-format). A fence with no info string has no format, so it
  is a `parse-error`.
* A paragraph whose only content is an inline link to a file.

Any other block is a `parse-error`.

```lark
test_source    : fenced_block | link_paragraph
link_paragraph : ws? "[" md_inline* "](" ws? ORIGIN (ws LINK_TITLE)? ws? ")" ws? nl
ORIGIN         : /(?![A-Za-z][A-Za-z0-9+.-]*:)(?!\/)[^?#]*[.][^.\/?#]+/
LINK_TITLE     : /"[^"\r\n]*"|'[^'\r\n]*'|\([^()\r\n]*\)/
```

`md_inline` is any markdown inline element except a line ending. The link text
and the title are not used. The title has any of the three forms of CommonMark:
`"..."`, `'...'` or `(...)`. The **origin** is the destination of the link after
CommonMark removes the angle brackets, the backslash escapes and the entity
references. MDQ does not decode percent-encoding: the origin of
`[t](testes/função.py)` is `testes/função.py`, and the origin of
`[t](<meus testes.py>)` is `meus testes.py`. The rule `ORIGIN` above describes
the origin after this reading. It MUST be a relative path: it has no scheme, no
query (`?`) and no fragment (`#`), and it does not start with `/`. A `?` or a
`#` in the origin is a fault even when the author escaped it, as in
`[t](a\#b.py)`, whose origin is `a#b.py`. The fragment is reserved for a later
version. Each fault is a `parse-error`. A paragraph that has another character
besides the link, or two links, is not a test source. Two links on consecutive
lines are one paragraph, as in CommonMark: write a blank line between the
links. A reference link, an
autolink and an image are not an inline link. A link in a list item or in a
quote is not a test source either: the block is a list or a quote.

#### Test format

The format of a fenced block is the first word of its info string, the text up
to the first space or tab. The format of a link is the text after the last `.`
of the last segment of the origin. A file with no `.` in its last segment, or
with nothing after the last `.`, has no format: it is a `parse-error`. Case is
kept, so `py` and `python` are two formats for MDQ. An unknown format is not an
error. MDQ does not interpret the format: each runner declares the formats it
accepts, and the host chooses the runner from `language` and the format.

#### JSON form

Each test source becomes an object of the `tests` list.

| Field    | Source                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| `format` | The test format.                                                                 |
| `text`   | The code text of a fenced block. Absent in a source that is not resolved.        |
| `origin` | The origin of a link. Absent in a fenced block.                                  |

The **code text** of a fenced block is the content between its fences, as
CommonMark reads it: the indentation of the opening fence is removed from each
line, and each line ends with U+000A, whatever line ending the document has.
Both `text` and the [reference solution](#answer-key) use it. The `text` of an
empty block is the empty string.

`load` and `parse` do not read files. A linked source is **unresolved**: it has
`origin` and no `text`. A resolution step, after loading, takes a map from
origin to text and fills `text` of each linked source whose origin is a key of
the map. The other sources stay unresolved and fail later with
`UnresolvedTestSource`, in the operations that need the text. The step does not
fail for an origin that the map lacks, and it ignores a key that no source
uses. One key fills every source with that origin, and a second call with a
larger map fills the rest.

The **origin is an opaque key**, compared as a string: MDQ does not normalize it
and does not resolve it against a base, so `./test_conta.py` and
`test_conta.py` are two keys. The step and its map are per question. For a
host, the path is relative to the file that declares the link (the exam file,
for a question written inline in an exam), but MDQ does not use that. An exam
can hold two questions that link the same origin for two different files, so a
host resolves each question of an exam with its own map. The text of a file is the
string the host reads, with the line endings it has, but with a leading U+FEFF
(byte order mark) removed. The resolution step removes it before the lines are
counted and before the digest of the text is computed. A document that is
resolved still keeps its `origin`. The operations that need the text fail on an
unresolved source: [grading](#grading) and the [public form](#public-form). The
rules of the lint that need the text, such as the check of the
[annotations](#annotations), report nothing for an unresolved source, since a
lint cannot fail, and report it after resolution.

### Annotations

An **annotation** is a line of a test source that declares a rubric item, the
feedback of the item or its comment. The line has the marker `mdq:` after zero
or more ASCII punctuation characters, spaces and tabs. The punctuation covers
the starts of comments in many languages (`#`, `//`, `--`, `;`, `%`, `*`,
`/*`, `<!--`). A letter or a digit before the marker, ASCII or not, makes the
line ordinary text.

```lark
annotation_line  : ANNOTATION_START ws? (rubric_item | ">" ws? md_inline* | COMMENT_MARK ws? md_inline*)
annotation_block : item_line observation_line*
item_line        : ANNOTATION_START ws? rubric_item nl
observation_line : ANNOTATION_START ws? (">" | COMMENT_MARK) ws? md_inline* nl

ANNOTATION_START : /[ \t!-\/:-@\[-`{-~]*mdq:/
```

The rules `ws`, `nl` and the terminal `COMMENT_MARK` are defined in
[Common grammar rules](../references/grammar.md), and `rubric_item` in
[Rubric items](../references/rubric.md#item). The lines of a source are the
text split on the line endings of CommonMark and numbered from 1. A final line
ending does not start another line. Some rules:

* `mdq:` is in lower case, with no space before the colon.
* After the marker, a line that starts with `>` is feedback, and a line that
  starts with `!` not followed by `[` is a comment. Any other line is an item,
  with the grammar of the [rubric item](../references/rubric.md#item): an
  optional value, optional modifiers and the criterion. A line with nothing
  after the marker is an item with a blank criterion (`blank-text`), as is
  `mdq: [+1]`.
* The criterion runs to the end of the line. A closing of a block comment
  (`*/`, `-->`) at the end of the line is part of the text: use a line comment,
  or put the closing on the next line.
* The feedback and the comment come on the lines right after the item, and each
  line has its own marker, since a line of code cannot continue them. The lines
  of one block join as in
  [Feedback and comment lines](../references/grammar.md#feedback-and-comment-lines).
  An empty `mdq: >` line separates two paragraphs.
* An item has at most one feedback block and one comment block, in either
  order. Another line, even a blank one, ends the block lines of the item.
  A feedback or comment line with no item or observation line right before it
  is an error (`invalid-rubric-item`).
* `{public}` and `{example}` are valid here, and `{manual}` is not. An item with
  `{manual}` in a test source is an error (`invalid-rubric-item`).

A source with at least one item line is **annotated**. A source with none is
not, even when it holds the text `mdq:` where the grammar does not read an
annotation.

#### Regions

A **region** goes from an item line to the line before the next item line, or
to the last line of the source. The lines of the feedback and the comment of the
item are in its region. A test case belongs to the region that holds the line
where the case is defined, and so to the rubric item of that region. In an
annotated source, the lines before the first item line are in no region. A case
there runs and counts for nothing: it is a fact of the grading, not an error of
the document, since only the runner report says where the cases are.

A source with no annotation has one **implicit item** with the value 1, for the
whole source. Its cases share it in equal parts. The implicit item has no
criterion, no modifier, no feedback and no comment.

```md
import pytest
from conta import valor_conta

# mdq: [+3] {example} Acerta os exemplos do enunciado
def test_verde(): ...

def test_amarela(): ...

# mdq: [-2] Aceita bandeira que não existe
def test_bandeira_invalida(): ...
```

In this source, the imports are before the first item line and are in no
region. `test_verde` and `test_amarela` are in the first region, and the item
`[+3]` is passed in the fraction of its cases that pass. `test_bandeira_invalida`
is in the second.

#### Public regions

A region of an item with `{public}` or `{example}` is a **public region**. The
student sees its test cases and can run them before the submission, with an
immediate result. A test with no such region is hidden. With the value `[0]`, a
public region is a pre-validation: it does not count in the score. This is the
same idea as `preAccept` and `preReject` of the
[short answer](short-answer.md#pre-validation). A region with `{example}` is
also shown by the host in the stem, so the author does not copy the examples to
the text. The host shows the text of the region as a code block. A plugin of the
test format can show it better, for example as a table of inputs and outputs.

The **text of a public region** is for display. It has the lines of the region
without the lines of the item, its feedback and its comment, and without the
blank lines at either end, joined with U+000A, with no final U+000A. A line is
blank when it is empty or has only spaces and tabs. A blank line between two
non-blank lines stays as it is. These lines are private, and it has no import
that comes before the first annotation. The **first line** of a public region is
the line of the source where its text starts, which is its first non-blank line,
counted from 1. A display maps the line of a case of the report to the line
`line - firstLine + 1` of the text. A public region with no non-blank line after
its annotation lines, because no line follows them or only blank lines do, has
no text and no entry in `publicTests`: it is omitted. It is still a
public region for the rest. The runner always runs the whole source, never only
the text of a region.

### Rubric section

The `## [rubric]` section holds the manual items. It holds exactly one
unordered list, and nothing else: another block, a second list (a change of the
bullet character starts one) or an ordered list is a `parse-error`. Each item of the list is a
[rubric item](../references/rubric.md#item) with the binding `{manual}`, and has
the same body as an item of a [choice list](../references/choices.md#item):

```lark
rubric_list      : rubric_list_item+
rubric_list_item : ws? rubric_item nl lazy_line* (blank_line* observations)?
```

The rules `ws`, `nl`, `lazy_line`, `blank_line` and `observations` are defined
in [Common grammar rules](../references/grammar.md#feedback-and-comment-lines).
The criterion continues on the lazy lines after its first line. An item holds
only that paragraph, the feedback and the comment: any other block in it is a
`parse-error`. An item with no `{manual}` has no binding, and is an error
(`invalid-rubric-item`).

```md
## [rubric]

* [+2] {manual} Nomes de variáveis claros
  > Escolha nomes que digam o que a variável guarda.
  ! Não descontar por nomes em inglês
* [-1] {manual} Deixou código de depuração
```

Each item becomes an object of the `rubric` list, with the
[AST](../references/rubric.md#ast) of a rubric item. The `rubric` field has only
the manual items, in document order. The items that a test applies are in the
`text` of the test sources. An item of `## [rubric]` is identified by its
position in the list, and an item of a test source by the source and the line of
its annotation. A host copies the rubric when the grading starts, so a later
change of the document does not touch the scores already given.

#### Full rubric

The **full rubric** is a derived value, as `automation` is, and not a field of the
document. It lists every item of the question: first the items of the test
sources, in the order of the sources and then of the lines, with the implicit
item of each source that has no annotation, and then the items of `rubric`. Each
item of the full rubric is an object:

| Field      | Value                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| `value`    | The value, always present: 1 when the item has none.                        |
| `binding`  | `manual` or `tests`.                                                        |
| `text`     | The criterion. Absent in an implicit item.                                  |
| `feedback` | The feedback. Absent if none.                                               |
| `comment`  | The comment. Absent if none.                                                |
| `source`   | An item of `tests`: the index of the test source.                           |
| `line`     | An item of `tests`: the line of its annotation. Absent in an implicit item. |
| `public`   | An item of `tests`: `true` with `{public}` or `{example}`.                  |
| `example`  | An item of `tests`: `true` with `{example}`.                                |

The names of the fields of the full rubric are not normative, as the names of
the other derived values. Its content is.

### Answer key

The `## [answer-key]` section is optional. It follows the rules of the
[essay answer key](essay.md#answer-key): it is the last section, it holds any
block except an `H1` heading, a section with no block defines no answer key, and
a host MUST NOT show it to the student before the student submits the response.

The **reference solution** is a derived value: the code text of the first fenced
code block that is a direct child of the section. An indented block, or a block
inside a list or a quote, does not count. A section with no such block has no
reference solution. The core extracts it, so every runner reads the same block.
The reference solution is a submission that passes every test case. How a test
reaches the submission and the reference solution is a convention of the format
of the test, and MDQ does not define it.

## Grading

The runner decides which test cases pass, and MDQ computes the score. A
question is graded from the response, from a [runner report](../runner-report.md)
and from the scores that the instructor gave to the manual items. The question
has no `grading` field.

The grading checks in this order: first, a test source that is unresolved
(`UnresolvedTestSource`); then the scores of the instructor (`ValueError`);
then the validity of the report, a missing report included (`ReportError`);
then whether the response is [pending](#pending). So a question with tests, no
report and a manual item with no score is a `ReportError`, not pending, and a
list of scores with a wrong length is a `ValueError` even when the report is
not valid.

The scores of the instructor MUST fit the question: a list with a wrong length,
a score outside `[0, 1]`, or one score for the whole response when the question
has a rubric item is a host error (`ValueError`), see
[responses](../responses.md#code).

### Score

The items of the full rubric have a value `v`. The items with `v = 0` count for
nothing and the others are positive (`v > 0`) or negative (`v < 0`). Let `P` be
the sum of the values of the positive items, of every binding. For each item:

| Item                                   | Credit                       | Discount                        |
| -------------------------------------- | ---------------------------- | ------------------------------- |
| positive, of tests, with `n` cases, `p` of them passed | `v * p / n`  | none                            |
| negative, of tests, with `n` cases, `p` of them passed | none         | `-v * (n - p) / n`              |
| positive, manual, instructor score `x` | `v * x`                      | none                            |
| negative, manual, instructor score `x` | none                         | `-v * x`                        |

The `n` cases of an item are the cases of the report that the item owns, see
[Regions](#regions) and the
[report](../runner-report.md#from-a-case-to-an-item). Only the verdict `pass`
passes: `fail`, `error`, `timeout`, `resource-limit` and `skipped` do not. An
item with `n = 0` has no credit and no discount, positive or negative. The score `x` of a manual item
is in `[0, 1]`: the fraction of the value that the student earns, or the
fraction of the discount that applies. Let `G` be the sum of the credits and
`D` the sum of the discounts. The score of the response is:

```md
score = max(-1, (G - D) / P)
```

The score is in `[-1, 1]` as the score of every question. When `P = 0`, the
score is 0. The `penalty` of the exam decides the rest, as for a multiple choice
question: with the default `"none"`, the question never falls below 0. See
[Penalty](../exam.md#penalty).

A report with the status `build-error` fails every item of tests: the credit of
a positive item is 0, and the discount of a negative item is its whole value.
The manual items stay as the instructor scored them.

The example of this document has the items `[+3]`, `[+5]` and `[-2]` of tests
and `[+2]` manual, so `P = 10`. A student who passes all the cases, and who gets
`x = 1` in the manual item, has `G = 10` and `D = 0`: the score is 1. A student
who passes the cases of `[+3]` and `[+5]`, fails the case of `[-2]` and gets
`x = 0.5` in the manual item has `G = 3 + 5 + 1 = 9`, `D = 2`, and the score
`(9 - 2) / 10 = 0.7`. A student with `G = 1` and `D = 2` has `-0.1`. The floor
applies when the discounts are larger than the positive values: with the items
`[+4]`, `[-5]` and `[-5]`, a student who passes the first and fails the others
has `(4 - 10) / 4 = -1.5`, and the score is -1.

The response of a student who has no case in the region of a positive item earns
no credit for it, and one who has no case in the region of a negative item has
no discount for it.

Note (not normative): an item that owns no case can mean that the report is out
of date. A host that wants to detect it can compare the digests of the
[report](../runner-report.md#fields-of-the-report), or check the cases it got.

### Pending

A response is pending, and has no score, when:

* the report has the status `runner-error`: the failure is of the infrastructure
  and says nothing about the submission, so the response is never 0;
* a manual item with a value other than 0 has no score of the instructor;
* the question has no rubric item at all, and the instructor gave no score. The
  instructor then scores the whole response in `[0, 1]`, as in an
  [essay](essay.md#grading).

A host MAY show the credit and the discount of the items of tests while a manual
item is pending, if it labels them as provisional. See
[Pending](../responses.md#pending).

### Automation

The [automation](question-base.md#automation) of a code question is derived from
the sources of tests and the manual items, and does not need their text:

| Test sources | Manual items with a value other than 0 | Automation       |
| ------------ | -------------------------------------- | ---------------- |
| none         | any                                    | `manual`         |
| one or more  | none                                   | `automatic`      |
| one or more  | one or more                            | `semi-automatic` |

A report with `runner-error` makes the response pending whatever the
automation. The cases of [`examples/grading/code.yaml`](../../examples/grading/code.yaml)
give the automation of several questions.

## Feedback

The `>` lines of a rubric item are its feedback, as in a choice. Whether and
when the student sees them is a policy of the host, as is what the student sees
of the hidden tests. A feedback of an item that tests apply is in the
annotation of the item. See
[Rubric items](../references/rubric.md#feedback-and-comment).

## Response

The response to a code question is a string: the content of the submitted file,
as the student wrote it. Any other value is a malformed response. An empty
string is a response, not a skip, and the runner runs it. See
[responses](../responses.md#code).

## Public form

The [public form](../public-form.md#code) keeps `language`, `file` and
`template`. `tests`, `rubric` and `answerKey` are private. It has one derived
list, `publicTests`, with one entry for each public region that has a text. An unresolved test
source makes the public form fail. The
[correct responses](../public-form.md#correct-responses) are the reference
solution, when there is one.

## Additional Rules

| Field                | Level    | Code                      | Rule                                                              |
| -------------------- | -------- | ------------------------- | ----------------------------------------------------------------- |
| language             | error    | schema-error              | must not be empty or only Unicode spaces (schema)                 |
| file                 | error    | schema-error              | must be a plain name: not only Unicode spaces, not `.` or `..`, with no `/` and no `\` (schema) |
| tests                | error    | schema-error              | must have at least one test source (schema)                       |
| tests[]              | error    | schema-error              | must have a `text` or an `origin` (schema)                        |
| tests[].format       | error    | schema-error              | must not be empty (schema)                                        |
| tests[].origin       | error    | schema-error              | must be a relative path with no scheme, query or fragment (schema) |
| rubric               | error    | schema-error              | must have at least one item (schema)                              |
| rubric[].binding     | error    | schema-error              | must be `manual` (schema)                                         |
| body                 | error    | parse-error               | the paragraph of the tag must be only `[code]`, in lower case[^3] |
| body                 | error    | foreign-choice-marker     | the `[code]` tag cannot be a list item[^4]                        |
| epilogue             | error    | detached-tag              | cannot have a paragraph with only `[code]`                        |
| body                 | error    | parse-error               | a section may be declared at most once                            |
| body                 | error    | parse-error               | a heading `## [name]` that is not a section cannot come after the first section |
| template             | error    | parse-error               | in a Markdown source, the section must have exactly one fenced code block |
| template             | error    | forbidden-block-element   | in every form, must be exactly one fenced code block              |
| template             | error    | blank-text                | if defined, must have at least one visible character              |
| tests                | error    | parse-error               | the section must have a fenced block with an info string, or a paragraph with only an inline link, in each block; two links need a blank line between them |
| tests                | error    | parse-error               | the link of a test source must have a relative origin with no query or fragment, and a file name with an extension |
| rubric               | error    | parse-error               | the section must have exactly one unordered list                  |
| rubric[]             | error    | parse-error               | holds only its first paragraph, the feedback and the comment, see [Rubric section](#rubric-section) |
| rubric[]             | error    | parse-error               | carries at most one feedback block and one comment block          |
| template, tests, rubric | error | parse-error               | the section must have at least one block                          |
| answerKey            | error    | parse-error               | at most one `## [answer-key]` section may be declared             |
| answerKey            | error    | forbidden-block-element   | cannot have an `H1` heading                                       |
| answerKey            | error    | forbidden-block-element   | cannot have a heading that starts with `[`, links excepted        |
| template, tests, rubric, answerKey | error | invalid-frontmatter-field | cannot be set in the frontmatter of a Markdown source |
| answerKey            | error    | blank-text                | if defined, must have at least one visible character              |
| rubric[].text        | error    | blank-text                | must have at least one visible character                          |
| rubric[].feedback    | error    | blank-text                | must have at least one visible character                          |
| rubric[].comment     | error    | blank-text                | must have at least one visible character                          |
| tests[].text         | error    | blank-text                | the criterion, feedback and comment of an annotation must have at least one visible character |
| rubric[]             | error    | invalid-rubric-item       | must have the binding `{manual}`, and no other modifier[^5]       |
| tests[].text         | error    | invalid-rubric-item       | an annotation must follow the rubric item syntax, and have no `{manual}`[^5] |
| tests[].text         | error    | invalid-rubric-item       | a feedback or comment line must follow an item or observation line of an annotation, with at most one block of each kind |
| tests, rubric        | warning  | rubric-without-positive-item | the full rubric has an item, and the sum of its positive values is 0[^6] |

[^3]: An example is `[code] in Python`, when no tag follows it. Other cases are
in [Body](#body).
[^4]: A list item such as `* [code]` reads as a choice with a foreign marker
(see [Type inference](question-base.md#type-inference)).
[^5]: A modifier that is not `manual`, `public` or `example`, a modifier in the
wrong place, a modifier that repeats, a `{` that does not open a modifier, a
criterion that starts with `[` that is not a link (`[ 3 ]`, `[3,5]`, `[50%]`, `[slug]`), `>` or `!`. See
[Rubric items](../references/rubric.md#item). The path of an error in an item of
`rubric` is the item, `rubric[i]`, and never `rubric[i].text`, in a Markdown
source and in a YAML or JSON one. The rules of a test source apply to the
`text` of a source, whatever the form of the document, and are reported
when the text is known: a linked source is checked after its resolution.
[^6]: The rubric here is the [full rubric](#full-rubric): the items of the test
sources, with the implicit items, and the items of `rubric`. A full rubric with
no item has no such rule. The path is the question, `[]`, always. The lint needs
the text of every test source, so it reports nothing while a source is
unresolved. The score of such a question is 0, see [Score](#score).
