# Multiple choice

## Syntax 

One correct answer picked from a list. Body is an unordered list where each item
starts with `[ ]` (wrong) or `[*]` (right). Wrong choices are called "distractors".

```md
What is the capital of Brazil?

* [ ] Lisbon
* [*] Brasília
* [ ] São Paulo
  > Largest city, but never the capital.
* [ ] Rio de Janeiro
  > It was the capital until 1960.
```

### Choice anatomy

```md
* [value] [choice-id] Choice text
  > Feedback shown to the student who picked this choice.
  ! Comment for other instructors.
```

* `value` is ` ` (0), `*` (1), or a percentage like `[50%]` / `[-25%]`.
  Percentages must stay inside -1..1, so `[150%]` is invalid.
* Avoid partial credit or multiple correct choices. The format allow it mostly
  for after the fact revisions of the choice score.
* `choice-id` is optional but recommended: it lets responses reference the
  choice by name instead of position. Must be url-safe and unique.
* Feedback (`>`) and comments (`!`) may span several lines; each line keeps its
  prefix. Both optional.

### Frontmatter

| Field   | Values                                             |
| ------- | -------------------------------------------------- |
| shuffle | `true` to allow shuffling the choices              |
| grading | `symmetric` (default), `partial`, `all-or-nothing` |

Unless explicitly requested, avoid setting those parameters. If left unset, the
instructor can define exam-wide values.

### Grading

An explicit percentage on the picked choice always wins. Otherwise:

* `partial` / `all-or-nothing`: unmarked choices score 0.
* `symmetric`: unmarked choices get a negative score so that guessing at random
  averages zero (4 choices, one correct → a wrong pick scores -0.33).

Feedback is always shown for the choice the student picked, right or wrong — so
put an explanation on the correct choice too.

### Gotchas

* Choice texts must be unique.
* Marking several choices correct is legal; the student still picks one.
* Do not mark every choice correct.


## How to write good multiple-choice questions

When writing any question, have a learning objective in mind. Questions may be 
used for assessment, practice, or discussion.

Unless noted, the guidelines below follow
[Haladyna et al. 2002](references.md#multiple-choice-questions) and the
[NBME Item-Writing Guide](references.md#multiple-choice-questions). Flawed items
make questions harder for reasons unrelated to what they test
[Downing 2005](references.md#multiple-choice-questions).

* Test one important idea per question. Skip trivia.
* Aim above recall when the objective allows: ask students to apply, analyze,
  or judge, using a new scenario instead of textbook wording
  [Brame 2013](references.md#multiple-choice-questions).
* Keep questions independent: one question must not give away the answer to
  another.
* Avoid opinion questions ("What is the best language?") unless the stem names
  whose opinion or which criterion counts.
* No trick questions. Difficulty must come from the content, not from
  wording [Butler 2018](references.md#multiple-choice-questions).

### Stem and preamble

* Put the whole problem in the stem. If it needs introduction of a scenario, new
  concepts, a text for the student to read, tables, code snippets, etc., include
  in preamble paragraphs. Apply the **cover-the-options rule**: a student who
  knows the material should be able to answer with the choices hidden.
* Prefer a direct question over a sentence to complete. If you want to write
  fill in the blanks type of questions, prefer the fill-in type.
* Cut window dressing: text that does not help answer the question or make a
  distractor attractive only tests reading speed.
* State the stem positively. If `NOT`, `EXCEPT` or similar wording is
  unavoidable, write it in capitals and bold (`**NOT**`).
* Move words repeated in every choice into the stem.

### Correct choice

* Make sure exactly one choice is correct, or clearly best. Ask a colleague to
  answer the question before using it.
* Do not let the correct choice stand out: it is often the longest, the most
  precise, or the only one written like a textbook sentence.
* Vary its position. Depending on system configuration, the choices may have
  fixed ordering, shuffled, or sorted by some criteria (like word length,
  alphabetical, etc). If the stem dictates a specific order, set `shuffle:
  false` in the frontmatter.
* If ordering is irrelevant to understanding the question, sort choices by
  length.

### Distractors

* Build distractors from real student mistakes and misconceptions. For every
  question, consider common and plausible mistakes and build the distractors
  around that [Gierl et al. 2017](references.md#multiple-choice-questions).
* Consider only conceptual mistakes: typos, basic math errors, and similar minor
  errors tend to be very easy to spot.
* Every distractor must be plausible to a student who lacks the knowledge. Drop
  absurd or joke choices.
* Ideally, write one correct choice with four distractors, but three choices
  (one correct, two distractors) are usually enough. Only pick meaningful
  distractors: three good choices beat four or five with filler, and save
  testing time [Rodriguez 2005](references.md#multiple-choice-questions). In
  practice, teacher-written items average only about 1.5 working distractors
  [Tarrant et al. 2009](references.md#multiple-choice-questions). Use four when you have four plausible choices not because
  you feel obligated to have a given number of distractors.
* The human may ask for a specific number of choices. In that case, provide the
  requested number, but at least try to write meaningful filler choices.
* Keep choices homogeneous: same kind of thing, same grammatical form, about
  the same length.
* Keep choices mutually exclusive. Overlapping numeric ranges and choices that
  imply each other leave more than one defensible answer.
* Order choices logically (numeric, chronological, or by size) when they have
  a natural order. Disable shuffling for those questions.

### Avoid these patterns

* **All of the above:** a student who spots two correct choices gets the answer
  without knowing the rest [Brame 2013](references.md#multiple-choice-questions).
  It also makes the question worse at telling strong students from weak ones
  [Butler 2018](references.md#multiple-choice-questions).
* **None of the above:** it tells you only what the student rejects, not what
  they know. If needed, write a concrete choice instead.
* **Combined choices** ("A and C", "B, but not D"): they test logic puzzles, not
  content. Use a multiple-selection question instead.
* **Absolute terms** (`always`, `never`) in distractors: testwise students
  eliminate them. Vague frequency terms (`usually`, `often`) are read
  differently by different students.
* **Clang clues:** a word from the stem repeated only in the correct choice.
* **Grammatical clues:** only the correct choice matches the stem's article,
  number, or tense.
* **Convergence:** the correct choice shares the most terms with the other
  choices.
* **Collectively exhaustive pairs:** two choices that cover every possibility
  ("increases" / "does not increase"), so the answer must be one of them.

### Use feedback

MDQ shows feedback for the picked choice. Explain each distractor's
misconception and why the correct choice is right. Feedback after a
multiple-choice test reduces the risk that students learn the wrong answer
from a distractor [Butler 2018](references.md#multiple-choice-questions).

You may provide the feedback to the correct choice, if it helps clarify why it
is correct.

### Comments

Use comments to provide additional context or explanations for the train of thought behind the question construction and for each of the distractors. This can be
useful for the instructor when reviewing or revising the question later. Do not
repeat information that is already in the feedback or the choice itself. 

Comments are only useful if they provide additional insight that is not already
evident from the question stem, choices, or feedback.

### Example

Flawed: vague stem, correct choice is longest, all of the above, absurd
distractor.

```md
Python lists:

* [ ] are immutable
* [*] can be changed in place after creation, for example with `append`
* [ ] are a type of fish
* [ ] all of the above
```

Revised: the stem states the problem, and each distractor is a real
misconception with feedback.

````md

Consider the Python code

```python
a = [1, 2]
b = a
b.append(3)
print(a)
```

What does it print?

* [*] `[1, 2, 3]`
  > `b = a` does not copy the list. Both names refer to the same object.
* [ ] `[1, 2]`
  > Assignment does not copy. Use `a.copy()` to get an independent list.
* [ ] An error, because lists are immutable
  > Lists are mutable. Tuples are the immutable sequence type.
````