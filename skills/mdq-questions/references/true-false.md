# True / false

## Syntax

A list of statements, each judged individually. Mark a true statement `[T]` and
a false one `[F]`.

```md
Judge the statements.

* [F] Earth is flat.
* [T] Humans and apes share a common ancestor.
  > Darwinian evolution describes common descent, not descent from modern apes.
* [T] The Earth is billions of years old.
* [F] Light travels instantly through space.
```

Statements take the same `[choice-id]`, `>` feedback and `!` comment syntax as
[multiple choice](multiple-choice.md#choice-anatomy).

### Markers

Any single letter works, case-insensitive, except `x` (reserved for
[multiple selection](multiple-selection.md)). Use the pair matching the
document's language:

* Always true: `T`, `V`, `S`.
* Always false: `F`.
* Any other letter means true but raises a warning — avoid it.

For `locale: pt-BR` write `V`/`F`; for English `T`/`F`. The letter itself is
kept in the parsed document, so `V` and `T` stay distinguishable.

### Frontmatter

| Field   | Values                                             |
| ------- | -------------------------------------------------- |
| shuffle | `inherit` (default: the exam's value, else `false`), `true`, `false` |
| grading | `inherit` (default: the exam's value, else `symmetric`), `symmetric`, `partial`, `all-or-nothing` |

### Grading

Unlike multiple selection, a statement may be left **unmarked**, and unmarked
never hurts:

* `partial`: correct markings / total.
* `all-or-nothing`: any wrong marking gives 0; otherwise correct markings / total.
* `symmetric`: (correct - wrong) / total; unmarked scores nothing either way.

Feedback is shown for every statement judged wrongly **and** every statement
left unjudged.

### Gotchas

* Do not make every statement true or every one false.
* Statement texts must be unique.


## How to write good true-false questions

When writing any question, have a learning objective in mind. Questions may be
used for assessment, practice, or discussion.

An MDQ true-false question is a *multiple true-false* item: one stem followed
by several statements, each judged on its own.

### When to use

* Use true-false for content that fits a proposition: a claim that is clearly
  true or false. Good fits are facts, definitions, predictions ("this code
  prints `3`"), and common misconceptions
  [Clay 2001](references.md#true-false-questions).
* Students answer statements quickly, so one question covers a lot of content.
  A single statement is a coin flip for a guesser, so use several statements
  per question and several questions per topic
  [Clay 2001](references.md#true-false-questions).
* Multiple true-false shows partial understanding better than multiple choice.
  A student who holds a right idea and a wrong idea at the same time gets
  caught, instead of picking the one choice they are sure of
  [Brassil & Couch 2019](references.md#true-false-questions).
* Multiple true-false tends to test lower-level thinking than multiple choice
  [Haladyna et al. 2002](references.md#true-false-questions). To test
  application, put a scenario or code in the stem and ask about it.

### Stem

* Give the stem real content: a scenario, a code snippet, a table, or a
  question that all statements refer to. "Judge the statements." wastes the
  stem.
* Keep statements independent: judging one statement must not reveal the
  answer to another.

### Statements

* Express one idea per statement. With two ideas, a student who knows only one
  cannot answer, and a false part hides inside a true one.
* Write statements that are true or false without exceptions. If the claim is
  an opinion or a contested position, attribute it: "According to Dewey, ..."
* Do not copy sentences from the textbook or the lecture. Paraphrase, or ask
  about a new case, so memorizing wording is not enough.
* Avoid negative statements, and never use double negatives. If a negative is
  unavoidable, write it in bold (`**not**`).
* Avoid extreme modifiers (`always`, `never`, `all`, `none`, `only`): testwise
  students mark them false. Avoid vague qualifiers (`usually`, `often`,
  `some`, `may`): they are true for most readers and mean different things to
  different students.
* Make true and false statements about the same length, so length does not
  give away the answer.
* Build false statements from real misconceptions, so they are plausible to a
  student who lacks the knowledge.
* For cause and effect, keep the first part true and vary the truth of the
  second part.
* Use plain vocabulary, unless the vocabulary is what you test.
* Mix true and false statements in no predictable pattern.

All statement guidelines above follow
[Clay 2001](references.md#true-false-questions).

### Use feedback

Feedback matters most on false statements. Students who judge false statements
without feedback carry the misinformation to later tests. With correct-answer
feedback, this drops from about 14% to about 5% of answers
[Uner et al. 2022](references.md#true-false-questions).

* On each false statement, write the corrected statement in the feedback, or why
  the original statement is not correct. "This is false" is a very poor feedback.
* On true statements, explain why they hold.
* In practice quizzes, ask students to correct the statements they mark false.
  With feedback, this improves retention of those items
  [Uner et al. 2022](references.md#true-false-questions).

### Example

Flawed: empty stem, two ideas in one statement, absolute term, negative
statement, and the true statement is the longest one.

```md
Judge the statements.

* [T] Lists are mutable and tuples are immutable.
* [F] Tuples can never be changed.
* [F] A list is not a sequence type.
* [T] Since Python 3.7, dictionaries preserve insertion order, as guaranteed by
  the language reference.
```

Revised: the stem gives a concrete case, each statement tests one idea, and
every statement has feedback.

````md
Consider this code:

```python
a = (1, [2, 3])
b = a
```

Judge each statement.

* [T] `a[1].append(4)` runs without error.
  > The tuple is immutable, but the list inside it is mutable.
* [F] `a[0] = 5` replaces the first item of `a`.
  > Tuples do not support item assignment. This line raises `TypeError`.
* [T] After `a[1].append(4)`, `b[1]` is `[2, 3, 4]`.
  > `b = a` does not copy. Both names refer to the same tuple.
* [F] `len(a)` is `3`.
  > `a` has two items: the integer `1` and the list `[2, 3]`.
````