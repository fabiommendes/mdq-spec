---
type: issue
status: backlog
tags: [glossary]
relatedTo: [GLOSSARY.md]
kind: task
priority: low
created: 2026-11-01
creator: Fábio Macêdo Mendes
---

# Escrever true or false na prosa de mdq-py e mdq-js

O glossário decidiu (termo `True or false`): na prosa o tipo se chama "true or
false"; `true-false` aparece só como valor de `type` e em identificadores.
`docs/` e `skills/` já foram atualizados. Falta trocar "true/false" (e
"true-false" usado como prosa) em comentários, docstrings, mensagens e docs dos
subtrees:

- mdq-py: `README.md`, `mdq/types.py`, `mdq/convert/_moodle_xml.py`,
  `mdq/convert/_gift.py`, `mdq/convert/_moodle.py`, `mdq/models/_base.py`,
  `mdq/models/_presentation.py`, `mdq/models/_choice.py` e os testes
  `test_convert_moodle_xml.py`, `test_convert_gift.py`,
  `test_explicit_correct.py`.
- mdq-js: `src/solid/messages.tsx` (texto da UI), `src/solid/TrueFalse.tsx`,
  `src/models/exam.ts`, `src/models/choice.ts`, `src/schema/common.ts`,
  `tests/grading.spec.ts`, `tests/frontmatter.spec.ts`.

Não trocar citações de fontes externas (Moodle, Blackboard) nem o nome do
formato "multiple true-false" da literatura.
