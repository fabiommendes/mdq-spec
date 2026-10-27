# Fill in the blanks

## Example

Fill in the blanks questions show a text with some blanks and the students must fill in
the correct answer on the spot.

```md
The capital of Brazil is [^capital]. It has approximately [^size] inhabitants.

[^capital]:
* [ ] Lisbon
* [*] Brasília
* [ ] São Paulo
* [ ] Buenos Aires
* [ ] Rio de Janeiro

[^size/numeric]: 2750000 +- 10%
```

## Frontmatter

Fill in the blanks questions accept the following extra fields in the
frontmatter:

| Field      | Type      | Description                                       |
| ---------- | --------- | ------------------------------------------------- |
| type       | "fill-in" | The type discriminator                            |
| shuffle    | boolean or "inherit" | True if the inner choices can be shuffled[^1] |
| grading    | "partial", "no-mistakes", "all-or-nothing", "symmetric" or "inherit" | The grading strategy to use.[^1] |
| diacritics | string    | Either "fold" (the default) or "keep"[^2]         |
| unmatched  | string    | Either "incorrect" or "manual"[^3]                |
| preAccept  | map       | Blank id to the patterns a response must match[^4] |
| preReject  | map       | Blank id to the patterns a response must not match[^4] |
| incorrectFeedback | map | Blank id to the feedback of an incorrect response that no pattern gave feedback to[^5] |
| domain     | map       | Blank id to the `domain` of a [numeric blank](#numeric-blanks)[^6] |
| decimalPlaces | map    | Blank id to the `decimalPlaces` of a [numeric blank](#numeric-blanks)[^6] |

[^1]: Grading is `"partial" | "no-mistakes" | "all-or-nothing" | "symmetric" | "inherit"`.
Default is `"inherit"`, which takes the strategy from the exam, and is
`"symmetric"` outside an exam. `shuffle` is `boolean | "inherit"` with the
same rule: `"inherit"` is the default and resolves to `false` outside an
exam. See [exam inheritance](../exam.md#inheritance).
With `shuffle: true`, an implementation MAY present the choices in any
order. With `shuffle: false`, it MUST NOT change their order. This rule is
for implementations that present the question: it has no diagnostic.
[^2]: Applies to every [short answer blank](#short-answer-blanks) of
the question, with the same meaning as in a standalone short answer question.
See [short answer diacritics](short-answer.md#diacritics).
[^3]: Applies to every [short answer blank](#short-answer-blanks) of the
question, with the same meaning as in a standalone short answer question. If
absent, each blank takes its own default: `"incorrect"` if the blank has an
`accept` pattern, `"manual"` if it has none. See [Automation](#automation).
[^4]: Frontmatter-only, like the `preAccept` and `preReject` fields of a
[short answer](short-answer.md#frontmatter) question. Each key is the id of a
[short answer blank](#short-answer-blanks) and its value a pattern list, with
the same entries and the same meaning as in a standalone short answer
question: the lists validate a response before submission and play no part in
grading. In JSON they are fields of the blank, not of the question:

```yaml
preAccept:
  state: ["/[A-Za-z ]+/"]
preReject:
  season:
    - pattern: "/\\d+/"
      feedback: Write the season, not a month number.
```

maps to

```yaml
blanks:
  - id: state
    type: short-answer
    preAccept: ["/[A-Za-z ]+/"]
  - id: season
    type: short-answer
    preReject:
      - pattern: "/\\d+/"
        feedback: Write the season, not a month number.
```

[^5]: Frontmatter-only, like `preAccept` and `preReject`. Each key is the id of
a [short answer blank](#short-answer-blanks) or of a
[numeric blank](#numeric-blanks) and its value a string, with the same meaning
as the `incorrectFeedback` of a standalone
[short answer](short-answer.md#feedback) or [numeric](numeric.md#feedback)
question. In JSON it is a field of the blank:

```yaml
incorrectFeedback:
  state: That is not a state of the Southeast.
  height: The Pico da Neblina is higher than that.
```

maps to

```yaml
blanks:
  - id: state
    type: short-answer
    incorrectFeedback: That is not a state of the Southeast.
  - id: height
    type: numeric
    incorrectFeedback: The Pico da Neblina is higher than that.
```

[^6]: Frontmatter-only, like `preAccept` and `preReject`. Each key is the id of
a [numeric blank](#numeric-blanks) and its value is the field of the same name
of a [numeric](numeric.md#frontmatter) question, with the same meaning. It wins
over the value inferred from the body of the blank. In JSON they are fields of
the blank:

```yaml
domain:
  height: decimal
decimalPlaces:
  height: 2
```

maps to

```yaml
blanks:
  - id: height
    type: numeric
    domain: decimal
    decimalPlaces: 2
```

A blank without an entry takes the inferred values, see
[numeric](numeric.md#number-typedomain). This is the only way to write in
Markdown a numeric blank with a declared `domain`, for example a `decimal`
blank with an integer answer.

The value of each of the five maps (`preAccept`, `preReject`,
`incorrectFeedback`, `domain` and `decimalPlaces`) MUST be a mapping from blank
ids to values. A scalar or a list, such as `incorrectFeedback: Wrong answer.`,
is a `parse-error`.

An entry whose value is `null` means the field is absent for that blank, in
all five maps, as `null` does in an optional field of a blank. The blank id
MUST still be the id of a blank of the question.

The five maps hold values that differ per blank by nature: patterns, feedback
and number domains. `unmatched` and `diacritics` are grading policy for the
whole question, and apply to every short answer blank.


## Stem

The stem of a fill-in question is a sequence of block elements, as in any other
question type (see [Stem](question-base.md#stem)). It MUST hold at
least one blank. A blank may appear in any ordinary paragraph of the stem, and
the stem can have paragraphs with no blank. The stem follows the grammar

```lark
stem      : block+
block     : paragraph | other_block
paragraph : inline_md* (BLANK inline_md*)*
BLANK     : /\[\^[a-zA-Z0-9]+([-_][a-zA-Z0-9]+)*\](?![(\[])/
```

`other_block` represents any other block element (heading, list, table, code
block, etc.), and `inline_md` represents one valid inline markdown element nested
inside a paragraph. `BLANK` is a `SLUG` between `[^` and `]`, and `SLUG` is
defined in [Common grammar rules](../references/grammar.md). `inline_md` must be a
well-defined markdown inline element that does not contain blanks.

### Where blanks may appear

A blank may appear **only in a regular paragraph, in a run of plain text**.
A parser reads the inline markup of the whole paragraph first, as CommonMark
does, and then looks for blanks in the result. So `**start [^blank] end**` is
a strong element that contains a blank, and it is a `misplaced-blank`. A parser
MUST NOT split the paragraph around the blank before it reads the markup.

A `[^slug]` has one outcome in each context of the stem:

| Context                                                         | Outcome                    |
| --------------------------------------------------------------- | -------------------------- |
| Plain text of an ordinary paragraph                             | A blank                    |
| Fenced code, indented code, code span                           | Literal text, not a blank  |
| Autolink: `<https://...>`, bare URL or `www.` address[^7]      | Literal text, not a blank  |
| `[^slug](url)` and `[^slug][ref]`                               | A link, not a blank        |
| Heading, list item, table cell, blockquote                      | `misplaced-blank` (error)  |
| Emphasis, strong, strikethrough, link text, image alt text      | `misplaced-blank` (error)  |
| HTML block                                                      | Literal text, not a blank  |
| Text between inline HTML tags, as in `<span>[^slug]</span>`     | A blank                    |

[^7]: The URL of an autolink is one token, like a code span. A `[^slug]` inside
it stays as written, and a definition of that id is an `unreferenced-blank`.

An HTML block is raw text in CommonMark, like a code block: a `[^slug]` in it
is literal text, so a definition of that blank is an `unreferenced-blank`. An
inline HTML tag is not a Markdown element that contains the text between its
tags, so that text is plain text. Strikethrough is part of
[MDQ Markdown](../references/grammar.md#markdown-dialect).

Literal text neither declares a blank nor references one, and an
implementation MUST leave it as written. A `[^slug]` that is `misplaced-blank`
MUST NOT be silently dropped.

The `BLANK` terminal above does not match a `]` followed by `(` or `[`, because
that bracket starts a markdown link: in `[^nota](https://www.ibge.gov.br)`
the link text is `^nota`.

Only the stem holds blanks. A `[^slug]` in the epilogue is literal text, even
in an ordinary paragraph: implementations MUST leave it as written, and it
neither declares a blank nor has to match one. The one exception is a line
that starts like a definition, see [Blank definitions](#blank-definitions).


## Blank definitions

Every blank referenced by the stem MUST be defined, and every definition MUST
be referenced by the stem. Each blank id MUST appear at most once in the stem:
a second `[^id]` for the same id is a `duplicate-blank-reference`. A definition is a reference-style block whose tag
names the blank and, optionally, its kind:

```lark
blank_def : choice_def | numeric_def | short_answer_def
```

`choice_def` is defined in [Choice blanks](#choice-blanks), `numeric_def` in
[Numeric blanks](#numeric-blanks), and `short_answer_def` in
[Short answer blanks](#short-answer-blanks). The rules `ws` and `nl` and the
terminal `SLUG` that they use are defined in
[Common grammar rules](../references/grammar.md).

A stem reference matches a definition by exact comparison of the blank ids,
and the comparison is case-sensitive: `[^rio]` and `[^RIO]` are two blanks.
CommonMark compares labels without case, so a CommonMark reader merges them.
Two blank ids that differ only in ASCII case give the `case-variant-blank-id`
warning. A stem reference with no definition of the same case is an
`undefined-blank` error, even if a definition with another case exists. The
error message SHOULD point to that definition.

The kind suffix is what tells the three apart. A bare `[^slug]:` is a choice
blank; anything else states its kind explicitly. The tags follow the
convention of [Body tags](question-base.md#body-tags): a tag with a colon
requires content, and a tag without a colon has none. Note that `unit` attaches to
`numeric` and to nothing else -- a unit of measurement is meaningless for a
choice or a piece of text, so `[^planet/short-answer(km)]` is a `parse-error`.

A definition MUST NOT be any of these. Each one is a `parse-error`:

* An unknown kind suffix, such as `[^resposta/essay]:`.
* A unit on a tag that is not numeric, such as `[^planet/short-answer(km)]:`.
* A second definition of an id. A blank id MUST NOT have two kinds, and a
  choice or numeric blank MUST NOT be defined twice. A short answer blank MAY
  have one `accept` and one `reject` definition, see
  [Short answer blanks](#short-answer-blanks).

Definitions may appear in any order, and that order need not match the order
the stem references them. The `blanks` array preserves the order the
definitions appear in the document. A short answer blank with an `accept` and
a `reject` definition takes the position of its first definition.

The definitions form one contiguous sequence of blocks, separated only by
blank lines. The first block that is not part of a definition starts the
epilogue. In the epilogue, a line that starts with `[^SLUG]`, with or without a kind
suffix, followed by `:` defines nothing, whether or not text follows the colon.
Examples are `[^capital/short-answer]: Brasília`, `[^estados/numeric]: 26`,
`[^nota]: Brasília foi inaugurada em 1960.` and a `[^x]:` line followed by a
choice list. A paragraph that holds only a short answer tag, such as
`[^cidade/short-answer]`, defines nothing either. A `[^SLUG]` elsewhere in a
line stays literal text. Each of these cases is the error
`detached-tag`, at the path `epilogue`, and its message tells the
author to move the tag up, before the epilogue, see
[Tags after the epilogue starts](question-base.md#tags-after-the-epilogue-starts).
A tag line inside fenced code does not count. The error is the only one reported for that id: an
implementation MUST NOT also report `undefined-blank` for its stem reference.


## Choice blanks

Choice blanks are represented by a reference definition followed by a 
list of choices (JSON `type`: `multiple-choice`). It follows the grammar:

```lark
choice_def : ws? BLANK ws? ":" ws? nl choice_list
choice_list : item+
```

The `item` rule is defined in [Choice lists](../references/choices.md#item),
with the `value` rule of [multiple choice](multiple-choice.md#body), and
`choice_list` is the unordered list those items form. The list
MUST start on the line that follows the tag, with no blank line in between;
otherwise the definition is a `parse-error`. A tag with no list is a
`parse-error` too. The tag line MUST have no text
after the colon: `[^capital]: Brasília` is a `parse-error`, not a choice blank.
To define a text answer, add the suffix, as in `[^capital/short-answer]: Brasília`.
The slug MUST be present in the stem.


## Numeric blanks

Numeric blanks are represented by a reference definition followed by a numeric
value. It follows the grammar:

```lark
numeric_def : ws? "[^" SLUG "/" "numeric" unit? "]" ws? ":" numeric_body
```

The `numeric_body` and `unit` non-terminals represent, respectively, a numeric
value with tolerance and an optional unit of measurement. Both are defined in
the [body](numeric.md#body) section of the numeric question type. The slug
MUST be present in the stem. The blank's `answer` follows the same
[answer representation](numeric.md#answer-representation) as a numeric
question: a fraction such as `1/3` is a string.

The unit is written inside the tag, before the closing bracket, exactly as it
is in a standalone numeric question:

```md
The Amazon runs approximately [^length] before reaching the Atlantic.

[^length/numeric(km)]: 6400 +- 5%
```

A numeric blank follows all the rules of a numeric question for itself: the
inference of `domain` and `decimalPlaces`, the exact arithmetic of the
tolerance test, the responses that are valid for each domain, and the unit of
the response. The unit in the tag is source text, as in
[numeric](numeric.md#body). See [numeric.md](numeric.md) and
[Numeric](../responses.md#numeric) in the responses.

The tag has no place for a `domain` or `decimalPlaces`. A blank takes the
inferred values, unless the `domain` and `decimalPlaces` maps of the
[frontmatter](#frontmatter) declare them. This blank is `decimal` with an
integer answer and one decimal place:

```md
---
domain:
  length: decimal
decimalPlaces:
  length: 1
---

The Amazon runs approximately [^length] before reaching the Atlantic.

[^length/numeric(km)]: 6400 +- 50
```


## Short answer blanks

A short answer blank takes the same answer machinery as a standalone
[short answer](short-answer.md) question, written as one or more definitions
sharing the blank's slug:

```lark
short_answer_def : bare_accept_def | colon_accept_def | reject_def
bare_accept_def  : ws? "[^" SLUG "/short-answer" "/accept"? "]" ws?
colon_accept_def : ws? "[^" SLUG "/short-answer" "/accept"? "]" ws? ":" ws? patterns
reject_def       : ws? "[^" SLUG "/short-answer/reject" "]" ws? ":" ws? patterns
```

The `patterns` rule, with `content`, `lazy_content`, `pattern_list` and their
continuation lines, is the one of the [short answer body](short-answer.md#body).
The `pattern_item` rule, including its `>` feedback and `!` comment lines, is
the one defined in [Pattern items](../references/patterns.md#pattern-items),
and `pattern_list` is the unordered list those items form. The slug MUST be
present in the stem.

The suffix `/short-answer` is REQUIRED. Without it the definition is a
[choice blank](#choice-blanks), which is what a bare
`[^slug]:` introduces.

A short answer blank has the two blocks of a short answer question:
`[^slug/short-answer]` (alias `[^slug/short-answer/accept]`) lists the
accepted patterns and `[^slug/short-answer/reject]` the rejected ones. Each
takes either a single pattern on the tag line or a list on the following
lines, with the same rules as in a [short answer](short-answer.md#body)
question, including the rule that a tag with a colon MUST have a pattern, on
its line or in a list on the line right after it. A blank line before the
list is a `parse-error`. A reject block MUST declare at least one pattern. A
blank MUST define each block at most once, in any order.

A blank that has no definition is an `undefined-blank` error. The
`[^slug/short-answer]` block MAY have no pattern. It
is then written without a colon, as a paragraph whose only content is the tag:

```md
A capital do Brasil é [^capital], e a cidade que eu mais gostaria de visitar
é [^cidade].

[^capital/short-answer]: Brasília

[^cidade/short-answer]
```

`[^slug/short-answer]:` with a colon and no pattern is a `parse-error`.
`[^slug/short-answer/reject]` has no form without a colon. A list on the line
right after a tag without a colon is a `parse-error`: the colon is missing. A
blank with only a `[^slug/short-answer/reject]` block is valid. A blank with
no `[^slug/short-answer]` block, or with one with no pattern, has no `accept`
list, and `unmatched` defaults to `manual`: the instructor grades the
responses that no reject pattern settles, see [Automation](#automation). In
YAML and JSON, `accept` is optional and a missing `accept` is the same as a
block with no pattern.

The lines after the content of a `[^slug/short-answer]` definition follow the
rules of the [short answer body](short-answer.md#pattern-lines): a lazy line
continues the content, also after a tag line with a colon and no text; a `>`
or `!` line (not `![`) or a list item right after the content (a `>` or `!`
line also right after a tag line with a colon and no text) MUST be a
`parse-error`, and so MUST a tag line (a reserved label or a blank label
`^slug` with a colon, such as `[^b/short-answer]:`) right after the content
or after a pattern item, so write a blank line before the next tag, and so
MUST a setext underline (a line of only `=` or only `-`
characters) right after the content, since it would turn the tag line into a
heading; an ATX heading, fenced code, HTML block or thematic break ends the
definition.

The `content` of a definition -- on the tag line or as an item of a list -- is
a pattern string, with the meaning defined in
[Pattern string](../references/patterns.md#pattern-string). The question's
`diacritics` field applies to its inexact literals.

An example using both blocks:

```md
The largest planet in the Solar System is [^planet].

[^planet/short-answer]:
* Jupiter
* `Jove`
  > Archaic, but accepted.

[^planet/short-answer/reject]:
* Saturn
  > Second largest, but not the largest.
```

A short answer blank also takes the `preAccept` and `preReject` lists of a
short answer question. They have no block of their own: they are written in
the question's [frontmatter](#frontmatter), in a map from the blank id to the
list. The feedback of an invalid response follows the rules of
[Pre-validation](short-answer.md#pre-validation).


## Automation

A short answer blank has an [automation](short-answer.md#automation), by the
rules of a short answer question, with the `unmatched` of the question or its
own default. Choice blanks and numeric blanks are always `automatic`.

A fill-in question is `automatic` if every blank is automatic, `manual` if
every blank is manual, and `semi-automatic` in every other case. A response to
the question is settled only when the response to every blank is settled; if
a blank leaves its response to the instructor, the whole question is pending.
The instructor then scores each pending blank in the range `[0, 1]`, and the
strategy of the question combines the blank scores as usual, see
[Grading](#grading). An empty blank is not pending: it scores 0.
Like every automation, this is a derived property and never a field of the
document, see [Automation](question-base.md#automation).


## Feedback

Feedback comes from the blanks. A choice of a choice blank takes `feedback`
and `comment` exactly as it would in a
[multiple choice](multiple-choice.md#feedback) question, and shows it under the
same rule -- the choice the student picked shows its feedback, whatever that
choice scored. A pattern of a short answer blank takes `feedback` and `comment`
exactly as it would in a [short answer](short-answer.md#feedback) question, and
shows it under the same rule -- the first pattern with a feedback message
among the matching patterns of the list that decided the outcome (`accept` or
`reject`), see [Feedback](short-answer.md#feedback).
A short answer blank also takes `incorrectFeedback`, with the same meaning as
in a short answer question: the feedback of an incorrect response that no
pattern gave feedback to. A numeric blank takes `incorrectFeedback` with the
meaning it has in a [numeric](numeric.md#feedback) question: the feedback of a
well-formed response outside the accepted tolerance. It is never shown for a
correct response, a malformed response or an empty blank. Both are written in
the `incorrectFeedback` map of the [frontmatter](#frontmatter). The tag of a
numeric blank has no place for feedback. An empty blank shows no feedback. A pending response shows no feedback, also
for the settled blanks, see [Pending](../responses.md#pending).

A question collects the feedback of every blank into one flat list, in the
order the blank definitions appear in the document, not the order the stem
references them and not the order the student answered. A skipped question
shows no feedback at all, because its grading formula never runs.

## Grading

Every blank is graded on its own, by the rules of the type it declares, and
produces a score in the range `[-1, 1]`. The question's `grading` field selects
both how each blank is scored and how those scores are combined into the
question's score.

The `grading` field of the frontmatter selects one of the four strategies
below. It can be set in the question, or left as `"inherit"`, the default,
which takes the strategy the exam's `grading` gives for fill-in: its `fill-in`
entry when it is a map, or the translation of a scalar by the table of
[exam grading](../exam.md#grading). The strategy is `"symmetric"` outside an
exam, and in an exam that does not set one for fill-in (no `grading`, or a map
without a `fill-in` key).

A blank the student left empty scores 0 under every strategy. A blank is empty
when its key is missing from the response or its value is `null`, see
[Fill in the blanks](../responses.md#fill-in-the-blanks).

What each kind of blank can score:

* A **choice blank** is graded like a
  [multiple choice](multiple-choice.md#grading) question, with the strategy
  that the table of the [exam grading](../exam.md#grading) gives for the
  question's strategy: `partial`, `no-mistakes` and `all-or-nothing` score the
  blank with the multiple choice `partial`, and `symmetric` scores it with
  `symmetric`. So a wrong pick of a choice without a score scores 0 under
  the first three and, under `symmetric`, the negative score that multiple
  choice derives for a choice without a score. A choice with a declared
  negative score keeps it under every strategy. A choice blank is the only
  kind of blank that can score below zero.
* A **numeric blank** is graded like a [numeric](numeric.md#grading) question:
  1 inside the tolerance, 0 outside it.
* A **short answer blank** is graded like a
  [short answer](short-answer.md#grading) question: 1 or 0. A response its
  patterns do not settle, under `unmatched: manual`, goes to the instructor,
  exactly as it would in a standalone question. The question is then not
  settled either, see [Automation](#automation). The instructor scores a
  pending blank with any value in `[0, 1]`, and the strategy combines it with
  the other blank scores as usual.

The strategies combine those blank scores as follows:

* **partial**: the mean of the blank scores, with any negative blank score
  taken as 0. The result lies in the range `[0, 1]`.
* **no-mistakes**: 0 if any blank the student filled scores below 1,
  otherwise the mean of the blank scores, where an empty blank scores 0. An
  empty blank is not a mistake, but a choice blank with a score below 1, even
  a positive one such as 0.5, is.
* **all-or-nothing**: 1 if every blank scores 1, and 0 otherwise. Any mistake
  anywhere gives zero points, including a single blank left empty.
* **symmetric**: the mean of the blank scores as they stand, negatives
  included. Dividing by the total number of blanks puts the result in the
  range `[-1, 1]`.


**Examples**:

Consider a question with three blanks -- `river` (a short answer blank),
`length` (a numeric blank) and `city` (a choice blank offering three choices).
The "blank scores" column lists what each blank scored on its own, in that
order, under `symmetric`. Under the other three strategies a wrong pick in the
choice blank scores 0 instead of `-0.5`, and those strategies are computed from
the blank scores with that change.

| Response                              | Blank scores   | "partial" | "no-mistakes" | "all-or-nothing" | "symmetric" |
| ------------------------------------- | -------------- | :-------: | :-----------: | :--------------: | :---------: |
| all three right                       | `[1, 1, 1]`    |   1.00    |     1.00      |       1.00       |    1.00     |
| right river and length, city empty    | `[1, 1, 0]`    |   0.67    |     0.67      |       0.00       |    0.67     |
| wrong city, the rest right            | `[1, 1, -0.5]` |   0.67    |     0.00      |       0.00       |    0.50     |
| partial-credit city, the rest right   | `[1, 1, 0.5]`  |   0.83    |     0.00      |       0.00       |    0.83     |
| wrong length, the rest right          | `[1, 0, 1]`    |   0.67    |     0.00      |       0.00       |    0.67     |
| right river, wrong length, city empty | `[1, 0, 0]`    |   0.33    |     0.00      |       0.00       |    0.33     |
| right length, wrong city, river empty | `[0, 1, -0.5]` |   0.33    |     0.00      |       0.00       |    0.17     |
| everything wrong                      | `[0, 0, -0.5]` |   0.00    |     0.00      |       0.00       |    -0.17    |
| everything left empty                 | `[0, 0, 0]`    |   0.00    |     0.00      |       0.00       |    0.00     |

The `-0.5` is what a wrong pick scores in a three-choice blank under
`symmetric`, where unspecified choice scores are derived so that picking at
random averages zero. Under `partial`, `no-mistakes` and `all-or-nothing` that
same wrong pick scores 0. The `0.5` is a score the choice declares itself, so
it holds under every strategy. The "partial-credit city" row uses a variant
of the question whose picked `city` choice declares the score 0.5. In that
variant the declared scores sum to 1.5, so the choice without a score derives
-1 under `symmetric`, not -0.5. The grading corpus
`examples/grading/fill-in.yaml` has these rows, in two questions: "Table of
fill-in.md" and "Partial-credit choice".

The results are rounded to 2 decimal places for clarity, but the actual
results should be computed with full precision.


## Additional Rules

Beyond the rules below, every blank carries the additional rules of the
question type it declares -- a choice blank those of
[multiple choice](multiple-choice.md#additional-rules), a numeric blank those
of [numeric](numeric.md#additional-rules), and a short answer blank those of
[short answer](short-answer.md#additional-rules). An inherited row is only in
the table of its source type. This table has the rows of the fill-in fields and
the rows whose code or rule differs from the embedded type. A different path
alone, such as `blanks[].accept` for `accept`, is not a reason to restate a row.

| Field                | Level    | Code               | Rule                                                               |
| -------------------- | -------- | ------------------ | ------------------------------------------------------------------ |
| blanks               | error    | schema-error       | must have at least one blank (schema). A Markdown stem with no `[^id]` marker gives `blanks: []`, so the error is at `blanks`; the message MAY hint at the `[^id]` marker |
| blanks[].id          | error    | schema-error       | must be present and match `SLUG` ([grammar.md](../references/grammar.md)) (schema) |
| blanks[].choices     | error    | schema-error       | a choice blank must have at least two choices (schema)             |
| blanks[].unit        | error    | schema-error       | only a numeric blank may have a `unit` (schema)                    |
| blanks[].unit        | error    | blank-text         | if defined, must have at least one visible character               |
| blanks[].id          | error    | duplicate-blank-id | must be unique within the question[^8]                             |
| blanks[].id          | warning  | case-variant-blank-id | two ids must not differ only in ASCII case, see [Blank definitions](#blank-definitions) |
| stem                 | error    | undefined-blank    | every `[^id]` marker must name a declared blank                    |
| blanks[].id          | error    | unreferenced-blank | must be referenced by an `[^id]` marker in the stem                |
| stem                 | error    | misplaced-blank    | blanks may only appear in a plain text run of a paragraph[^9]      |
| stem                 | error    | duplicate-blank-reference | each `[^id]` marker may appear at most once in the stem     |
| blanks[]             | error    | parse-error        | a blank id must not have a second definition of any kind (two kinds, or a choice or numeric blank twice) |
| blanks[]             | error    | parse-error        | the kind suffix of a tag must be `numeric` or `short-answer`, with `accept` or `reject` only after the latter |
| blanks[]             | error    | parse-error        | only a `numeric` tag may have a unit                               |
| blanks[]             | error    | parse-error        | the choice list must start on the line right after the tag of a choice blank, with no blank line in between |
| blanks[]             | error    | parse-error        | a tag with a colon must have content, see [Body tags](question-base.md#body-tags): a short answer definition has a pattern on its line or in a list on the line right after it, and a choice blank has a list |
| blanks[]             | error    | parse-error        | a tag is in lower case, and a tag with a reserved label has a known suffix, see [Body tags](question-base.md#body-tags) |
| blanks[]             | error    | parse-error        | a line that starts with a tag (a reserved label or `^slug`, and a colon) must not follow the content of a definition or a pattern item without a blank line |
| blanks[]             | error    | parse-error        | a list must not start on the line right after the choice list or the pattern list of a blank, see [Lists after a content list](question-base.md#lists-after-a-content-list) |
| blanks[]             | error    | parse-error        | the tag line of a choice blank must have no text after the colon (use `/short-answer` for a text answer) |
| epilogue             | error    | detached-tag       | a blank definition tag line must not follow a block that is not a definition[^10] |
| preAccept, preReject, incorrectFeedback | error | undefined-blank | every key must be the id of a declared blank[^11]                  |
| preAccept, preReject | error | schema-error    | a key must not be the id of a choice or numeric blank (schema)[^11] |
| incorrectFeedback    | error | schema-error    | a key must not be the id of a choice blank (schema)[^11] |
| domain, decimalPlaces | error | undefined-blank | every key must be the id of a declared blank[^12]                  |
| domain, decimalPlaces | error | schema-error    | a key must not be the id of a choice or short answer blank (schema)[^12] |
| diacritics           | error    | schema-error       | must be "fold" or "keep" (schema)                                    |
| unmatched            | error    | schema-error       | must be "incorrect" or "manual" (schema)                             |
| grading              | error    | schema-error       | must be `partial`, `no-mistakes`, `all-or-nothing`, `symmetric` or `inherit` (schema) |
| shuffle              | error    | schema-error       | must be a boolean or `inherit` (schema)                            |
| blanks[].incorrectFeedback | error | blank-text         | if defined, must have at least one visible character[^13]         |
| preAccept, preReject, incorrectFeedback, domain, decimalPlaces | error | parse-error | the frontmatter value must be a mapping from blank ids to values |
| automation           | error    | invalid-frontmatter-field | must not be in the frontmatter                              |
| automation           | error    | schema-error       | must not be a field of the YAML or JSON form                       |

The table lists diagnostics only. The MAY permissions of a short answer blank
(one `accept` and one `reject` block, an `accept` block with no pattern) have no
row, because they cannot fail. Other RFC keywords bind hosts and graders and have
no lint, see [Additional Rules](question-base.md#additional-rules). The
`shuffle` rule is one of them: a host that presents the question applies it,
see the footnote of the frontmatter table.

[^8]: Otherwise the stem's `[^id]` marker is ambiguous.
[^9]: See [where blanks may appear](#where-blanks-may-appear). It applies to
a `[^id]` in a heading, list item, table cell or blockquote of the stem, or
inside emphasis, strong, link text or image alt text. Code and the links
`[^id](url)` and `[^id][ref]` hold no blank. A misplaced `[^id]` MUST NOT be
silently dropped.
[^10]: The definitions are one contiguous sequence of blocks. A tag line in the
epilogue, outside fenced code, is this error, and the stem reference of its id
gives no `undefined-blank`. See [Blank definitions](#blank-definitions).
[^11]: In the `preAccept`, `preReject` and `incorrectFeedback` maps. A key that is not the id of a declared blank is an `undefined-blank`
error, at the path of the key. A key that is the id of a blank that does not
take the field (a choice or numeric blank for `preAccept` and `preReject`; a
choice blank for `incorrectFeedback`) puts the value on that blank, where the
schema rejects it.
[^12]: In the `domain` and `decimalPlaces` maps. A key that is not the id of a
declared blank is an `undefined-blank` error, at the path of the key. A key that
is the id of a choice or short answer blank puts the value on that blank, where
the schema rejects it. A value that is not a valid `domain` or `decimalPlaces`
is a `schema-error` on the blank.
[^13]: The path is the model path `blanks[i].incorrectFeedback`, also when the
`incorrectFeedback` map of the frontmatter gave the value. The message says
`incorrectFeedback`.
