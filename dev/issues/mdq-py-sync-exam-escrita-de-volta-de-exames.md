---
type: issue
status: todo
tags: [mdq-py, sync, api]
relatedTo: [mdq-py-sync-question-escrita-de-volta-com-edicao-minima]
kind: enhancement
created: 2026-11-12
creator: claude
---

# mdq-py: sync_exam, escrita de volta de exames

Mesmo contrato de `sync_question` (as duas leis, função pura, `SyncError`)
para exames: `sync_exam(src: str, target: Exam) -> str`. Depende de
`push-exams` na CLI do Codehood (RFC `sync-bidirecional`).

Questões a decidir antes:

* Os blocos de questão separados por `===`: editar cada bloco com
  `sync_question` ou tratar o exame como um documento só?
* Os `include`/`includeAll`: um `target` resolvido não pode virar questões
  inline no arquivo.
* Ordem: começar depois da v1 de `sync_question`.
