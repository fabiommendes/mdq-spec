---
type: issue
status: todo
tags: [mdq-py, diagnostics, choices]
relatedTo: [mdq-py/mdq/errors.py, mdq-py/mdq/_parser/_question.py]
---

# Mensagem de `foreign-choice-marker` perde os espaços do marcador

Achado na auditoria de true-false (2026-10-16).

```md
Julgue.

* [T] Um.
* [ ] Dois.
```

`mdq validate` informa:

```
error   [foreign-choice-marker] choices/1: [] is not a true-false choice marker
```

O autor escreveu `[ ]`, não `[]`. A mensagem sugere o marcador vazio, que é
outro erro (`parse-error`).

- A mensagem vem de `mdq.errors.ForeignChoiceMarker` (`mdq-py/mdq/errors.py:164`),
  que recebe `RawChoice.value` já sem `ws`.
- Chamadas em `mdq-py/mdq/_parser/_question.py:566` e `:951`.

Correção: passar o texto original do marcador (com espaços) para a mensagem,
ou formatar o valor vazio como `[ ]`. Adicionar um teste da mensagem.
Depois da correção, registrar em "Pendências depois da referência" de
`dev/plan/mdq-js-paridade.md`.
