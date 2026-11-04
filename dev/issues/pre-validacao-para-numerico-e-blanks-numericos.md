---
type: issue
status: backlog
tags: [spec, numeric, fill-in]
kind: enhancement
created: 2026-11-04
creator: claude
---

# Pré-validação para numérico e blanks numéricos

Do `BACKLOG.md` (migrado em 2026-11-04). Exploração.

A resposta numérica é um número ou uma string racional (`docs/responses.md`),
então `preAccept` e `preReject` precisariam de uma forma textual para casar
(por exemplo, recusar vírgula decimal), ou de uma checagem de intervalo em vez
de padrões.
