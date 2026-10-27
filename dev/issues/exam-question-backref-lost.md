---
type: issue
status: todo
tags: [mdq-py, models, exam]
relatedTo: [mdq-py/mdq/models/_exam.py, mdq-py/mdq/models/_base.py]
---

# `Exam.with_ids()` and `Exam.model_copy()` break `question.exam`

Found in the mdq-py architecture review (models B2).

```python
exam = Exam.model_validate(
    {"type": "exam", "questions": [{"type": "essay", "stem": "Fale do Cerrado."}]}
)
exam.with_ids().questions[0].exam                 # None
mdq.load("# Prova\n\n===\n\nFale do Cerrado.\n\n[essay]\n",
         format="mdq", ids="fill").document.questions[0].exam   # None
copy = exam.model_copy()
copy.questions[0] is exam.questions[0]            # True, still points to `exam`
```

- Expected: every question of an exam points back to the exam that holds it
  (public property `BaseQuestion.exam`). No `docs/` rule covers this.
- Actual: `None` after `with_ids()`; the original exam after `model_copy()`.
- Cause: `Exam.model_post_init` (`mdq-py/mdq/models/_exam.py:757`) binds the
  questions, but pydantic does not run it on `model_copy`.
  `BaseQuestion.model_copy` (`mdq-py/mdq/models/_base.py:400`) clears `_exam`,
  and `Exam.with_ids` (:618) builds its result through copies.
- Fix: override `Exam.model_copy` to copy the questions and rebind them (or
  rebind in one helper that `with_ids` and `model_copy` call).
- Changes external behavior: yes (`question.exam` becomes correct).
- Not testable via the corpus: add a unit test.
