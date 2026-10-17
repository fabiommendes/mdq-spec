---
type: spec
status: active
tags: [mdq, short-answer, fill-in, accept, parser]
relatedTo: [docs/question-types/short-answer.md, docs/question-types/fill-in.md, dev/specs/to-review/short-answer-accept-only.md]
---

# Short answer: two blocks, `[short-answer]` and `[short-answer/reject]`

Decisão do humano (2026-09-29), continuação de `short-answer-accept-only`.
`[short-answer]` é o bloco de padrões aceitos e `[short-answer/accept]` é só
um alias dele. Cada bloco aceita um padrão na linha da tag ou uma lista logo
abaixo. Spec, `lint-codes.md` e `examples/` já atualizados pelo orquestrador.
Falta o código de `mdq-py`.

## Superfície pública

- Nenhum campo novo no AST. Novo código de lint: `detached-answer-list`
  (warning, path `["epilogue"]`).
- Some a regra de fusão do ciclo anterior (bloco simples como primeiro item
  do bloco accept).

## Critérios de aceitação

### Lote 1: os dois nomes e as duas formas

- AC1. `[short-answer]:` seguido de lista colada (sem linha em branco) gera
  `accept` com um item por item, com feedback (`>`) e comentário (`!`) dos
  itens. Igual para `[short-answer/accept]:` e `[short-answer/reject]:`.
- AC2. `[short-answer]` e `[short-answer/accept]` no mesmo documento é
  `parse-error`, em qualquer ordem e com qualquer forma (linha ou lista).
  Dois `[short-answer]` ou dois `[short-answer/reject]` continuam erro.
- AC3. Tag com conteúdo na linha seguida de lista colada é `parse-error`.

### Lote 2: linha em branco

- AC4. `[short-answer]:` sem conteúdo, linha em branco, lista: questão aberta
  (`openEnded: true`), a lista vai para `epilogue`, e o lint
  `detached-answer-list` (warning, path `["epilogue"]`) é reportado. Vale
  também para `[short-answer/accept]:`.
- AC5. `[short-answer]: X`, linha em branco, lista: `accept: ["X"]`, lista no
  `epilogue`, mesmo warning.
- AC6. `[short-answer/reject]:` sem conteúdo, linha em branco, lista:
  `parse-error` (bloco reject sem padrão). Com conteúdo na linha e lista
  destacada: `reject: ["X"]`, lista no epílogo, warning.

### Lote 3: blanks de fill-in

- AC7. `[^id/short-answer]:` seguido de lista colada gera `accept` do blank
  com os itens; `[^id/short-answer/accept]:` é alias; `/reject` idem.
- AC8. Alias e nome no mesmo blank é `parse-error`; conteúdo na linha mais
  lista colada é `parse-error`.
- AC9. Lista destacada por linha em branco: blank aberto ou com o padrão da
  linha, lista no `epilogue` da questão, warning `detached-answer-list` com
  path `["epilogue"]`. `/reject` sem padrão é `parse-error`.

### Lote 4: render e fechamento

- AC10. Render: `accept` com um padrão sem feedback e comentário, e sem
  `reject`, vira `[short-answer]: X`; caso contrário `[short-answer]:` com
  lista. `reject` sempre como `[short-answer/reject]:` com lista. Nunca
  renderiza `[short-answer/accept]`. Ida e volta fecha. Mesmo para blanks.
- AC11. `docs/lint-codes.md` lista `detached-answer-list`; suíte inteira
  verde (exceto a falha conhecida de ordering), `mypy`, `ruff` e bundle ok.
  Exemplos novos do corpus passam: `valid/short-answer/detached-list`,
  `valid/short-answer/list-with-feedback`, `valid/fill-in/blank-list`,
  `invalid/short-answer-content-and-list`,
  `invalid/short-answer-both-accept-spellings`,
  `invalid/short-answer-reject-detached-list`,
  `invalid/fill-in-blank-both-accept-spellings`.
