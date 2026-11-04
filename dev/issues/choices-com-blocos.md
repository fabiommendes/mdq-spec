---
type: issue
status: backlog
tags: [spec, choices]
kind: enhancement
created: 2026-11-04
creator: claude
---

# Choices com blocos

Do `BACKLOG.md` (migrado em 2026-11-04).

Permitir vários blocos (parágrafos, código, listas) como texto de uma choice,
antes do feedback. Útil para provas de programação. Hoje qualquer bloco além do
primeiro parágrafo, do feedback e do comentário é `parse-error`
(`docs/references/choices.md`, "Item"). Afeta a gramática, o `text` dos
schemas, o render, e multiple choice, multiple selection, true or false e
fill-in. Mudança aditiva: documentos válidos hoje continuam válidos. O exemplo
`multiple-choice/fenced-code-choice` foi removido até isso ser desenhado.
