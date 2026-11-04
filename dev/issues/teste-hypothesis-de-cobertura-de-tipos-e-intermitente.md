---
type: issue
status: backlog
tags: [mdq-py, tests, hypothesis]
relatedTo: [mdq-py/tests/test_hypothesis.py]
kind: defect
priority: low
created: 2026-11-04
creator: claude
---

# Teste Hypothesis de cobertura de tipos é intermitente

`tests/test_hypothesis.py::test_questions_without_a_type_covers_every_type`
gera 300 exemplos de `h.questions()` e exige que todos os tipos apareçam. Em
2026-11-04 falhou uma vez em `r2 check-py` e passou na repetição: com
`database=None` nada garante que os 300 sorteios cubram os oito tipos.

Opções: subir `max_examples`, ou trocar o teste por um que sorteie o tipo
primeiro (`sampled_from(QuestionType)`) e só então a questão, o que torna a
cobertura determinística.
