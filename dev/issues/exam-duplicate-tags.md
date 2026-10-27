---
type: issue
status: todo
tags: [mdq-py, models, exam, schema]
relatedTo: [schema/exam.yaml, mdq-py/mdq/models/_exam.py]
---

# Exam accepts duplicate tags

Found in the mdq-py architecture review (models B1).

```md
---
tags: [cerrado, cerrado]
---

# Prova
```

Same with `mdq.load({"type": "exam", "tags": ["a", "a"], "questions": []})`.

- Expected: `schema-error`. `schema/exam.yaml:82-89` sets `tags` to
  `uniqueItems: true`, as questions do.
- Actual: the exam loads with `tags == ['cerrado', 'cerrado']`, only lint
  infos.
- Cause: `Exam.tags` (`mdq-py/mdq/models/_exam.py:324`) has no validator.
  `BaseQuestion.check_tags_are_unique` (`mdq-py/mdq/models/_base.py:339`)
  does it for questions only.
- Fix: share the validator (review item M7).
- Changes external behavior: yes (documents now rejected).
- Regression test: add a corpus example under examples/ rather than a new test
  function.
