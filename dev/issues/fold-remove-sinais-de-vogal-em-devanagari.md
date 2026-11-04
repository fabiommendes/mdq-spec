---
type: issue
status: backlog
tags: [spec, matching, unicode]
kind: defect
created: 2026-11-04
creator: claude
---

# fold remove sinais de vogal em devanágari

Do `BACKLOG.md` (migrado em 2026-11-04). Achado na revisão de
`inexact-comparison` (2026-11-03).

A comparação inexata com `diacritics: fold` remove todo code point `Mn`
(`docs/references/patterns.md`, "Inexact literals", passo 3). Em escritas como
o devanágari isso também remove os sinais de vogal, e `fold` confunde palavras
distintas. Hoje a saída é `diacritics: keep`.

Decidir se `fold` deve se limitar às marcas combinantes do latim, grego e
cirílico, e regenerar as tabelas (`scripts/inexact_tables.py`).
