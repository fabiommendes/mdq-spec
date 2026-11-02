---
type: issue
status: backlog
tags: [shuffle, seed]
relatedTo: [dev/specs/to-review/presentation.md, docs/exam.md]
kind: enhancement
created: 2026-11-01
creator: Fábio Macêdo Mendes
---

# Seleção seedada no include-all

`select_random` (`mdq-py/mdq/models/_exam.py`) escolhe as questões de um
`includeAll` com `random`. Dois hosts, ou duas requisições do mesmo aluno,
não chegam à mesma seleção.

Usar o mesmo digest da forma apresentada (`docs/public-form.md`, "Presented
form"): ordenar os candidatos por SHA-256(seed, partes) e tomar os `max`
primeiros. Isso exige definir a seed do exame e as partes da chave, e
acrescentar vetores ao corpus.

Saiu de fora do escopo da spec `presentation`.
