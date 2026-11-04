---
type: issue
status: backlog
tags: [mdq-py, numeric, responses]
kind: enhancement
created: 2026-11-04
creator: claude
---

# Resposta numérica como {value, unit}

Do `BACKLOG.md` (migrado em 2026-11-04).

`docs/responses.md` admite a resposta numérica na forma `{value, unit}`: válida
quando a unidade bate com a da questão, malformada quando a questão não declara
unidade. A mdq-py aceita só o número ou a string racional. Conversão de
unidades fica opcional.
