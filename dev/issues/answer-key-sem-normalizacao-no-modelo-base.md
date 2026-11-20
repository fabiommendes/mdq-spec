---
type: issue
status: backlog
tags: [mdq-py, essay, upload, normalize]
relatedTo: [mdq-py/mdq/models/_base.py]
---

# `answer_key` não passa pela normalização do modelo-base

`BaseQuestion._normalize` (mdq-py) normaliza `stem` e `epilogue`, mas não o
`answer_key` de essay, upload e code. A spec diz que o campo "permite a mesma
normalização de `stem` e `epilogue`". Um answer key com quebra suave não volta
igual na ida e volta Markdown → modelo → Markdown.

Por isso as estratégias hypothesis do essay não geram answer key, e as do
upload só geram answer key em bloco cercado.

## A fazer

- Normalizar `answer_key` em `_normalize`, com teste de ida e volta.
- Conferir se a mdq-js tem a mesma lacuna.
- Liberar answer key livre nas estratégias de essay e upload.
- Acrescentar os campos de anexo à estratégia `moodle_essay_block`.
