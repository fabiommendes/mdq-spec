---
type: issue
status: backlog
tags: [code]
relatedTo: [anexos-em-questoes-e-provas]
kind: defect
priority: low
created: 2026-11-11
creator: claude
---

# Resto do info string de [tests] se perde no round-trip

Num fence de `## [tests]`, só a primeira palavra do info string é lida (o
formato). O resto some sem aviso e não volta na renderização Markdown
(`str(question)` escreve só ` ```pytest `).

Caso no corpus: `examples/valid/code/tests-mixed.mdq.md:14` tem `~~~pytest -q`.

O comitê dos anexos (D10) decidiu não aplicar a regra do nome no info string
a `[tests]`. Falta decidir o que fazer com o resto: `parse-error` (como no
anexo), aviso, ou guardar o texto.
