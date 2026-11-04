---
type: issue
status: backlog
tags: [spec, ordering]
kind: enhancement
created: 2026-11-04
creator: claude
---

# Ordering: indentação explícita em lista ul

Do `BACKLOG.md` (migrado em 2026-11-04).

Uma linha de lista só ganha nível pelo aninhamento (`docs/question-types/ordering.md`,
"Indentation"). Ideia: em um item que começa com code span, os espaços depois
da crase de abertura são indentação, resolvida pelo MDC como num bloco de
código. Precisa de regras para a fonte (CommonMark tira um espaço de cada
ponta do code span), para o texto da linha e para a mistura com aninhamento.
Os hosts renderizam o código inline com `white-space: pre`. Hoje um bloco
cercado cobre o caso.
