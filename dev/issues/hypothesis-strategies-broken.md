---
type: issue
status: todo
tags: [mdq-py, hypothesis, testing]
relatedTo: [mdq-py/mdq/hypothesis/documents.py]
---

# `mdq.hypothesis`: `exams()` and `questions(type=...)` do not work

Found in the mdq-py architecture review (convert B9).

```python
from mdq import hypothesis as h
h.exams(3).example()                          # ValidationError: blank-text ScoredChoice
h.questions(type="multiple-choice").example() # KeyError: 'multiple-choice'
{type(h.questions().example()) for _ in range(20)}   # {EssayQuestion}
```

- Expected: the three public entry points generate valid documents of every
  question type.
- Cause (`mdq-py/mdq/hypothesis/documents.py`):
  - `QUESTION_TYPES = ("essay",)` (:34); the real list is commented out.
  - `QUESTION_STRATEGIES` (:610) maps only `"essay"`.
  - `exams` (:222) is `st.builds(models.Exam)` with no arguments, so
    Hypothesis infers fields and builds invalid choices.
- Fix: write the missing per-type strategies and build exams from
  `questions()`. Or, if that is not planned soon, make the unsupported calls
  raise `NotImplementedError` and say so in the docstrings.
- Changes external behavior: yes (public testing API).
- Not testable via the corpus: add a test that draws from each entry point.
