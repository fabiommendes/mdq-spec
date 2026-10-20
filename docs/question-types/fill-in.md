# Fill in the blanks

## Example

Fill in the blanks show a text with some blanks and the students must fill in
the correct answer on spot.

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

Fill in the blanks questions accept the following extra arguments in the
frontmatter

| Field      | Type      | Description                                       |
| ---------- | --------- | ------------------------------------------------- |
| type       | "fill-in" | The type discriminator                            |
| shuffle    | boolean or "inherit"   | True if the inner choices can be shuffled[^1]     |
| grading    | grading   | The grading strategy to use.[^1]                  |
| diacritics | string    | Either "fold" (the default) or "keep"[^2]         |
| unmatched  | string    | Either "incorrect" or "manual"[^6]                |
| preAccept  | map       | Blank id to the patterns a response must match[^7] |
| preReject  | map       | Blank id to the patterns a response must not match[^7] |
| incorrectFeedback | map | Blank id to the feedback of an incorrect response that no pattern gave feedback to[^9] |
| domain     | map       | Blank id to the `domain` of a [numeric blank](#numeric-blanks)[^10] |
| decimalPlaces | map    | Blank id to the `decimalPlaces` of a [numeric blank](#numeric-blanks)[^10] |

[^1]: Grading is `"partial" | "no-mistakes" | "all-or-nothing" | "symmetric" | "inherit"`.
Default is `"inherit"`, which takes the strategy from the exam, and is
`"symmetric"` outside an exam. `shuffle` is `boolean | "inherit"` with the
same rule: `"inherit"` is the default and resolves to `false` outside an
exam. See [exam inheritance](../exam.md#inheritance).
[^2]: Applies to every [short answer blank](#short-answer-blanks) of
the question, with the same meaning as in a standalone short answer question.
See [short answer diacritics](short-answer.md#diacritics).
[^6]: Applies to every [short answer blank](#short-answer-blanks) of the
question, with the same meaning as in a standalone short answer question. If
absent, each blank takes its own default: `"incorrect"` if the blank has an
`accept` pattern, `"manual"` if it has none. See [Automation](#automation).
[^7]: Frontmatter-only, like the `preAccept` and `preReject` fields of a
[short answer](short-answer.md#frontmatter) question. Each key is the id of a
[short answer blank](#short-answer-blanks) and its value a pattern list, with
the same entries and the same meaning as in a standalone short answer
question: the lists validate a response before submission and play no part in
grading. In JSON they are fields of the blank, not of the question:

```yaml
preAccept:
  state: ["/^[A-Za-z ]+$/"]
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
    preAccept: ["/^[A-Za-z ]+$/"]
  - id: season
    type: short-answer
    preReject:
      - pattern: "/\\d+/"
        feedback: Write the season, not a month number.
```

[^9]: Frontmatter-only, like `preAccept` and `preReject`. Each key is the id of
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

[^10]: Frontmatter-only, like `preAccept` and `preReject`. Each key is the id of
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


## Stem

This is one of the few question types that requires a specific format for the
stem. The stem follows the grammar

```lark
stem  : inline_md? (blank inline_md?)+
blank : "[^" SLUG "]"
```

`inline_md` represent any valid inline markdown element nested inside the stem
and `blank` represent a reference to a blank. The terminal `SLUG` is defined in
[Common grammar rules](../references/grammar.md). `inline_md` must be a
well defined markdown inline element that do not contain blanks.

### Where blanks may appear

A blank may appear **only in a regular paragraph, in a run of plain text**.
That is the whole rule, and it cuts in two directions.

At the block level, the hosting block MUST be an ordinary paragraph. Blanks in
headings, list items, table cells, blockquotes and fenced code blocks are all
illegal. A `[^slug]` found in any of them is not a blank: implementations MUST
either reject the document or leave the text exactly as written, and MUST NOT
silently drop it. Fenced code is the one case where leaving it alone is
obviously right -- a blank inside code is literal text.

At the inline level, blanks cannot occur inside markup. Consider the example

```md
**start [^blank] end**
```

This whole snippet is a markdown bold inline element containing a blank. If the
parser prioritizes spliting the parent block around the blanks, it would be
interpreted as an unclosed bold element `**start `, followed by a blank and then
the text ` end**`. In both approaches, the result would be illegal acording to
the spec, so both parsing strategies are valid.

The same reasoning rules out link text, image alt text, emphasis and inline
code: a blank must be a direct child of the paragraph, with only plain text
around it.

Only the stem holds blanks. A `[^slug]` in the preamble or in the epilogue is
literal text, even in an ordinary paragraph: implementations MUST leave it as
written, and it neither declares a blank nor has to match one.


## Blank definitions

Every blank referenced by the stem MUST be defined, and every definition MUST
be referenced by the stem. A definition is a reference-style block whose tag
names the blank and, optionally, its kind:

```lark
blank_def   : choice_def | numeric_def | short_answer_def

choice_def       : ws? "[^" SLUG "]" ws? ":" ws? nl choice_list
numeric_def      : ws? "[^" SLUG "/" "numeric" unit? "]" ws? ":" numeric_body
short_answer_def : accept_def | reject_def
accept_def       : ws? "[^" SLUG "/short-answer" "/accept"? "]" ws? ":" ws? patterns?
reject_def       : ws? "[^" SLUG "/short-answer/reject" "]" ws? ":" ws? patterns
patterns         : answer | nl pattern_list
```

The rules `ws` and `nl` and the terminal `SLUG` are defined in
[Common grammar rules](../references/grammar.md).

The kind suffix is what tells the three apart. A bare `[^slug]:` is a choice
blank; anything else states its kind explicitly. Note that `unit` attaches to
`numeric` and to nothing else -- a unit of measurement is meaningless for a
choice or a piece of text, so `[^planet/short-answer(km)]` is not valid syntax.

Definitions may appear in any order, and that order need not match the order
the stem references them. The `blanks` array preserves the order the
definitions appear in the document.


## Multiple choice blanks

Multiple-choice blanks are represented by a reference definition followed by a 
list of choices. It follows the grammar:

```lark
choice_def : ws? blank ws? ":" ws? nl choice_list
choice_list : item+
```

The `item` rule is defined in [Choice lists](../references/choices.md#item),
with the `value` rule of [multiple choice](multiple-choice.md#body), and
`choice_list` is the unordered list those items form. The list
must start on the following line, with no blank lines in between. The `blank`
slug MUST be present in the stem.


## Numeric blanks

Numeric blanks are represented by a reference definition followed by a numeric
value. It follows the grammar:

```lark
numeric_def : ws? "[^" SLUG "/" "numeric" unit? "]" ws? ":" numeric_body
```

The `numeric_body` and `unit` non-terminals represent, respectively, a numeric
value with tolerance and an optional unit of measurement. Both are defined in
the [body](numeric.md#body) section of the numeric question type. The `blank`
slug MUST be present in the stem. The blank's `answer` follows the same
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
short_answer_def : accept_def | reject_def
accept_def       : ws? "[^" SLUG "/short-answer" "/accept"? "]" ws? ":" ws? patterns?
reject_def       : ws? "[^" SLUG "/short-answer/reject" "]" ws? ":" ws? patterns
patterns         : content | nl lazy_content | nl pattern_list
pattern_list     : pattern_item+
```

The `content` and `lazy_content` rules, with their continuation lines, are
the ones of the [short answer body](short-answer.md#body). The `pattern_item`
rule, including its `>` feedback and `!` comment lines, is the one defined in
[Pattern items](../references/patterns.md#pattern-items), and `pattern_list`
is the unordered list those items form. The `blank` slug MUST be present in
the stem.

The suffix `/short-answer` is REQUIRED. Without it the definition is a
[multiple choice blank](#multiple-choice-blanks), which is what a bare
`[^slug]:` introduces.

A short answer blank has the two blocks of a short answer question:
`[^slug/short-answer]` (alias `[^slug/short-answer/accept]`) lists the
accepted patterns and `[^slug/short-answer/reject]` the rejected ones. Each
takes either a single pattern on the tag line or a list on the following
lines, with the same rules as in a [short answer](short-answer.md#body)
question, including the rule that a list after a blank line is not part of
the block, and that a reject block MUST declare at least one pattern. A blank
MUST define each block at most once, in any order. A blank whose
`[^slug/short-answer]` block has no pattern has no `accept` list, and the
instructor grades its responses, see [Automation](#automation).

The lines after the content of a `[^slug/short-answer]` definition follow the
rules of the [short answer body](short-answer.md#pattern-lines): a lazy line
continues the content, also after an empty tag; a `>` or `!` line (not `![`)
or a list item right after the content (a `>` or `!` line also right after an
empty tag) is a `parse-error`; an ATX heading,
fenced code, HTML block or thematic break ends the definition.

The `content` of a definition -- on the tag line or as an item of a list -- is
a pattern string, with the meaning defined in
[Pattern string](../references/patterns.md#pattern-string). The question's
`diacritics` field applies to its plain literals.

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
Like every automation, this is a derived property and never a field of the
document, see [Automation](question-base.md#automation).


## Feedback

Feedback comes from the blanks. A choice of a choice blank takes `feedback`
and `comment` exactly as it would in a
[multiple choice](multiple-choice.md#feedback) question, and shows it under the
same rule -- the choice the student picked shows its feedback, whatever that
choice scored. A pattern of a short answer blank takes `feedback` and `comment`
exactly as it would in a [short answer](short-answer.md#feedback) question, and
shows it under the same rule -- the first pattern that matches the response
and defines a feedback message, with `accept` taking precedence over `reject`.
A short answer blank also takes `incorrectFeedback`, with the same meaning as
in a short answer question: the feedback of an incorrect response that no
pattern gave feedback to. A numeric blank takes `incorrectFeedback` with the
meaning it has in a [numeric](numeric.md#feedback) question: the feedback of a
well-formed response outside the accepted tolerance. It is never shown for a
correct response, a malformed response or an empty blank. Both are written in
the `incorrectFeedback` map of the [frontmatter](#frontmatter). The tag of a
numeric blank has no place for feedback.

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
which takes the strategy from the exam: the exam's `grading`, or its entry for
`fill-in` when it is a map (see [exam grading](../exam.md#grading)). When neither
the question nor the exam sets a strategy, and outside an exam, the strategy
is `"symmetric"`.

A blank the student left empty scores 0 under every strategy. 

What each kind of blank can score:

* A **choice blank** is graded like a
  [multiple choice](multiple-choice.md#grading) question, under the strategy
  the fill-in question declares. It is the only kind of blank that can score
  below zero.
* A **numeric blank** is graded like a [numeric](numeric.md#grading) question:
  1 inside the tolerance, 0 outside it.
* A **short answer blank** is graded like a
  [short answer](short-answer.md#grading) question: 1 or 0. A response its
  patterns do not settle, under `unmatched: manual`, goes to the instructor,
  exactly as it would in a standalone question. The question is then not
  settled either, see [Automation](#automation).

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
order, and every strategy is computed from those three numbers.

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
it holds under every strategy.

The results are rounded to 2 decimal places for clarity, but the actual
results should be computed with full precision.


## Additional Rules

Beyond the rules below, every blank carries the additional rules of the
question type it declares -- a choice blank those of
[multiple choice](multiple-choice.md#additional-rules), a numeric blank those
of [numeric](numeric.md#additional-rules), and a short answer blank those of
[short answer](short-answer.md#additional-rules).

| Field                | Level    | Code               | Rule                                                               |
| -------------------- | -------- | ------------------ | ------------------------------------------------------------------ |
| blanks               | error    | schema-error       | must have at least one blank (schema)                              |
| blanks[].id          | error    | schema-error       | must be present and a slug: letters, digits, `-` and `_` (schema)  |
| blanks[].choices     | error    | schema-error       | a choice blank must have at least two choices (schema)             |
| blanks[].unit        | error    | schema-error       | only a numeric blank may have a `unit` (schema)                    |
| blanks[].id          | error    | duplicate-blank-id | must be unique within the question[^3]                             |
| stem                 | error    | undefined-blank    | every `[^id]` marker must name a declared blank                    |
| blanks[].id          | error    | unreferenced-blank | must be referenced by an `[^id]` marker in the stem                |
| stem                 | error    | misplaced-blank    | blanks may only appear in a plain text run of a paragraph[^4]      |
| blanks[]             | error    | parse-error        | a short answer blank defines each block at most once[^5]           |
| blanks[]             | error    | parse-error        | a `>` or `!` line must not follow the content or an empty tag line of a short answer definition without a blank line |
| preAccept, preReject, incorrectFeedback | error | undefined-blank | every key must be the id of a declared blank[^8]                  |
| preAccept, preReject | error | schema-error    | a key must not be the id of a choice or numeric blank (schema)[^8] |
| incorrectFeedback    | error | schema-error    | a key must not be the id of a choice blank (schema)[^8] |
| domain, decimalPlaces | error | undefined-blank | every key must be the id of a declared blank[^11]                  |
| domain, decimalPlaces | error | schema-error    | a key must not be the id of a choice or short answer blank (schema)[^11] |
| blanks[].incorrectFeedback | error | blank-text         | if defined, must have at least one visible character              |

[^3]: Otherwise the stem's `[^id]` marker is ambiguous.
[^4]: See [where blanks may appear](#where-blanks-may-appear). A `[^id]` found
anywhere else is not a blank, and MUST NOT be silently dropped.
[^5]: One `[^id/short-answer]` (or its alias `[^id/short-answer/accept]`)
and one `[^id/short-answer/reject]`, in any order.
[^8]: In the `preAccept`, `preReject` and `incorrectFeedback` maps. A key that is not the id of a declared blank is an `undefined-blank`
error, at the path of the key. A key that is the id of a blank that does not
take the field (a choice or numeric blank for `preAccept` and `preReject`; a
choice blank for `incorrectFeedback`) puts the value on that blank, where the
schema rejects it.
[^11]: In the `domain` and `decimalPlaces` maps. A key that is not the id of a
declared blank is an `undefined-blank` error, at the path of the key. A key that
is the id of a choice or short answer blank puts the value on that blank, where
the schema rejects it. A value that is not a valid `domain` or `decimalPlaces`
is a `schema-error` on the blank.
