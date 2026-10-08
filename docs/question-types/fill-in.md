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

[^1]: Grading is `"partial" | "all-or-nothing" | "symmetric" | "inherit"`.
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

```markdown
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

choice_def       : "[^" SLUG "]" ws? ":" ws? nl choice_list
numeric_def      : "[^" SLUG "/numeric" unit? "]" ws? ":" ws? numeric_body
short_answer_def : accept_def | reject_def
accept_def       : "[^" SLUG "/short-answer" "/accept"? "]" ws? ":" ws? patterns?
reject_def       : "[^" SLUG "/short-answer/reject" "]" ws? ":" ws? patterns
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
choice_def : blank ":" ws? nl choice_list
choice_list : item+
```

The `item` rule is defined in the [multiple-choice](multiple-choice.md#body)
section, and `choice_list` is the unordered list those items form. The list
must start on the following line, with no blank lines in between. The `blank`
slug MUST be present in the stem.


## Numeric blanks

Numeric blanks are represented by a reference definition followed by a numeric
value. It follows the grammar:

```lark
numeric_def : "[^" SLUG "/" "numeric" unit? "]" ws? ":" ws? numeric_body
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


## Short answer blanks

A short answer blank takes the same answer machinery as a standalone
[short answer](short-answer.md) question, written as one or more definitions
sharing the blank's slug:

```lark
short_answer_def : accept_def | reject_def
accept_def       : "[^" SLUG "/short-answer" "/accept"? "]" ws? ":" ws? patterns?
reject_def       : "[^" SLUG "/short-answer/reject" "]" ws? ":" ws? patterns
patterns         : answer | nl pattern_list

answer           : PATTERN
pattern_list     : pattern_item+
```

The `pattern_item` rule, including its `>` feedback and `!` comment lines, is
the one defined in [Pattern items](../references/patterns.md#pattern-items),
and `pattern_list` is the unordered list those items form. The `blank` slug
MUST be present in the stem.

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

A single `PATTERN` -- on the tag line or as an item of a list -- is a pattern
string, with the meaning defined in
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
list.


## Automation

A short answer blank has an [automation](short-answer.md#automation), by the
rules of a short answer question, with the `unmatched` of the question or its
own default. Choice blanks and numeric blanks are always `automatic`.

A fill-in question is `automatic` if every blank is automatic, `manual` if
every blank is manual, and `semi-automatic` in every other case. A response to
the question is settled only when the response to every blank is settled; if
a blank leaves its response to the instructor, the whole question is pending.
Like every automation, this is a derived property and never a field of the
document, see [Automation](base.md#automation).


## Feedback

Feedback comes from the blanks. A choice of a choice blank takes `feedback`
and `comment` exactly as it would in a
[multiple choice](multiple-choice.md#feedback) question, and shows it under the
same rule -- the choice the student picked shows its feedback, whatever that
choice scored. A pattern of a short answer blank takes `feedback` and `comment`
exactly as it would in a [short answer](short-answer.md#feedback) question, and
shows it under the same rule -- the first pattern that matches the response
and defines a feedback message, with `accept` taking precedence over `reject`.
Numeric blanks have no feedback syntax.

A question collects the feedback of every blank into one flat list, in the
order the blank definitions appear in the document, not the order the stem
references them and not the order the student answered. A skipped question
shows no feedback at all, because its grading formula never runs.

## Grading

Every blank is graded on its own, by the rules of the type it declares, and
produces a score in the range `[-1, 1]`. The question's `grading` field selects
both how each blank is scored and how those scores are combined into the
question's score.

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

| Response                              | Blank scores   | "partial" | "all-or-nothing" | "symmetric" |
| ------------------------------------- | -------------- | :-------: | :--------------: | :---------: |
| all three right                       | `[1, 1, 1]`    |   1.00    |       1.00       |    1.00     |
| wrong city, the rest right            | `[1, 1, -0.5]` |   0.67    |       0.00       |    0.50     |
| wrong length, the rest right          | `[1, 0, 1]`    |   0.67    |       0.00       |    0.67     |
| right river, wrong length, city empty | `[1, 0, 0]`    |   0.33    |       0.00       |    0.33     |
| right length, wrong city, river empty | `[0, 1, -0.5]` |   0.33    |       0.00       |    0.17     |
| everything wrong                      | `[0, 0, -0.5]` |   0.00    |       0.00       |    -0.17    |
| everything left empty                 | `[0, 0, 0]`    |   0.00    |       0.00       |    0.00     |

The `-0.5` is what a wrong pick scores in a three-choice blank under
`symmetric`, where unspecified choice scores are derived so that picking at
random averages zero. Under `partial` and `all-or-nothing` that same wrong pick
scores 0, which is the only reason those two score columns ever differ from
`symmetric` in the table above.

The results are rounded to 2 decimal places for clarity, but the actual
results should be computed with full precision.


## Additional Rules

Beyond the rules below, every blank carries the additional rules of the
question type it declares -- a choice blank those of
[multiple choice](multiple-choice.md#additional-rules), a numeric blank those
of [numeric](numeric.md#additional-rules), and a short answer blank those of
[short answer](short-answer.md#additional-rules).

| Field           | Level    | Rule                                                          |
| --------------- | -------- | ------------------------------------------------------------- |
| blanks          | critical | must have at least one blank (schema)                         |
| blanks[].choices | critical | a choice blank must have at least two choices (schema)       |
| blanks[].id     | critical | must be unique within the question[^3]                        |
| stem            | critical | every `[^id]` marker must name a declared blank               |
| blanks[].id     | critical | must be referenced by an `[^id]` marker in the stem           |
| stem            | critical | blanks may only appear in a plain text run of a paragraph[^4] |
| blanks[]        | critical | a short answer blank defines each block at most once[^5]      |
| preAccept, preReject | critical | every key must be the id of a declared short answer blank[^8] |

[^3]: Otherwise the stem's `[^id]` marker is ambiguous.
[^4]: See [where blanks may appear](#where-blanks-may-appear). A `[^id]` found
anywhere else is not a blank, and MUST NOT be silently dropped.
[^5]: One `[^id/short-answer]` (or its alias `[^id/short-answer/accept]`)
and one `[^id/short-answer/reject]`, in any order.
[^8]: A key that is not the id of a declared blank is an `undefined-blank`
error, at the path of the key. A key that is the id of a choice or numeric
blank puts the list on that blank, where the schema rejects it.
