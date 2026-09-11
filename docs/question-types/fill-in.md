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

| Field   | Type      | Description                               |
| ------- | --------- | ----------------------------------------- |
| type    | "fill-in" | The type discriminator                    |
| shuffle | boolean   | True if the inner choices can be shuffled |
| grading | grading   | The grading strategy to use.[^1]          |

[^1]: Grading is `"partial" | "all-or-nothing" | "symmetric"`. Default is `"symmetric"`.


## Stem

This is one of the few question types that requires a specific format for the
stem. The stem follows the grammar

```lark
stem  : inline_md? (blank inline_md?)+
blank : "[^" SLUG "]"
```

`inline_md` represent any valid inline markdown element nested inside the stem
and `blank` represent a reference to a blank. The terminal SLUG is defined in the
base question type [slug](base.md#slug) section. `inline_md` must be a
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


## Blank definitions

Every blank referenced by the stem MUST be defined, and every definition MUST
be referenced by the stem. A definition is a reference-style block whose tag
names the blank and, optionally, its kind:

```lark
blank_def   : choice_def | numeric_def | short_answer_def

choice_def       : "[^" SLUG "]:" ws? nl choice_list
numeric_def      : "[^" SLUG "/numeric" unit? "]:" ws? numeric_body
short_answer_def : "[^" SLUG "/short-answer" "]:" ws? answer
                 | "[^" SLUG "/short-answer/" list_kind "]:" ws? nl pattern_list

list_kind        : "accept" | "reject"
```

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
numeric_def : "[^" SLUG "/" "numeric" unit? "]:" ws? numeric_body
```

The `numeric_body` and `unit` non-terminals represent, respectively, a numeric
value with tolerance and an optional unit of measurement. Both are defined in
the [body](numeric.md#body) section of the numeric question type. The `blank`
slug MUST be present in the stem.

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
short_answer_def : "[^" SLUG "/short-answer" "]:" ws? answer
                 | "[^" SLUG "/short-answer/" list_kind "]:" ws? nl pattern_list

answer           : PATTERN
list_kind        : "accept" | "reject"
pattern_list     : pattern_item+
```

The `pattern_item` rule, including its `>` feedback and `!` comment lines, is
the one defined in the [short answer](short-answer.md#pattern-lines) section,
and `pattern_list` is the unordered list those items form. The `blank` slug
MUST be present in the stem.

The suffix is REQUIRED on all three forms. Without it the definition is a
[multiple choice blank](#multiple-choice-blanks), which is what a bare
`[^slug]:` introduces.

A single `PATTERN` -- whether written after `[^slug/short-answer]:` or as an
item of an accept or reject list -- carries its meaning in exactly the way
[short answer](short-answer.md#pattern-lines) defines it:

* Enclosed in **backticks**, it is an exact literal. Case, interior whitespace
  and punctuation are all significant.
* Delimited by **`/`**, it is a regular expression, implicitly anchored at both
  ends, with optional trailing flags.
* A lone **`*`** is a wildcard matching every response, and belongs as the last
  item of a reject list.
* Anything else is a plain literal, matched inexactly with the normalization
  described at the top of the short answer document.

A blank MUST define at most one of each form: one bare `[^slug/short-answer]`,
one `accept` list and one `reject` list. They may be written in any order, and
a bare definition is interpreted as if its pattern were the only item of the
accept list. A blank that defines no pattern at all is open-ended, and is left
for the instructor to grade -- which makes the whole fill-in question only
partially automated.

An example using all three forms:

```md
The largest planet in the Solar System is [^planet].

[^planet/short-answer/accept]:
* Jupiter
* `Jove`
  > Archaic, but accepted.

[^planet/short-answer/reject]:
* Saturn
  > Second largest, but not the largest.
* *
  > Not a planet of the Solar System.
```


## Feedback

Feedback comes from the blanks, and only choice blanks can carry it: a choice
of a choice blank takes `feedback` and `comment` exactly as it would in a
[multiple choice](multiple-choice.md#feedback) question, and shows it under the
same rule -- the choice the student picked shows its feedback, whatever that
choice scored. Numeric and short answer blanks have no feedback syntax.

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
  patterns do not settle goes to the instructor, exactly as it would in a 
  standalone question, which leaves the whole fill-in question only partially 
  automated, depending on how the question was authored.

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
| blanks[].id     | critical | must be unique within the question[^2]                        |
| stem            | critical | every `[^id]` marker must name a declared blank               |
| blanks[].id     | critical | must be referenced by an `[^id]` marker in the stem           |
| stem            | critical | blanks may only appear in a plain text run of a paragraph[^3] |
| blanks[]        | critical | a short answer blank defines at most one of each form[^4]     |

[^2]: Otherwise the stem's `[^id]` marker is ambiguous.
[^3]: See [where blanks may appear](#where-blanks-may-appear). A `[^id]` found
anywhere else is not a blank, and MUST NOT be silently dropped.
[^4]: One bare `[^id/short-answer]`, one `accept` list and one `reject` list,
in any order.
