---
type: issue
status: backlog
tags: [spec, fill-in]
kind: enhancement
created: 2026-11-04
creator: claude
---

# Pesos por blank no fill-in

Do `BACKLOG.md` (migrado em 2026-11-04).

Um blank de fill-in não tem peso próprio: a estratégia da questão combina os
blanks com peso igual (`docs/question-types/fill-in.md`, "Blank scores"). O
Moodle Cloze tem peso por blank, e a importação o descarta com o aviso
`blank-weight-dropped` (`mdq-py/mdq/convert/_codes.py`).

Decidir a sintaxe (frontmatter por id de blank, como `domain` e
`decimalPlaces`), a semântica em cada estratégia, schema, exemplos no corpus e
suporte em mdq-py e mdq-js.
