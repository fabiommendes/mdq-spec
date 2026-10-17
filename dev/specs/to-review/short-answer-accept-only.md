---
type: spec
status: active
tags: [mdq, short-answer, fill-in, accept, schema]
relatedTo: [docs/question-types/short-answer.md, docs/question-types/fill-in.md, dev/audit/plan.md]
---

# Short answer: `accept` is the only answer list

Decisão do humano (2026-09-29): os campos `oneOf` e `regex` deixam de existir
em questões short-answer e em blanks short-answer de fill-in. O parser sempre
emite `accept`. Já feito pelo orquestrador: `docs/`, `schema/*.yaml`, bundle e
`examples/`. Falta o código de `mdq-py` e seus testes.

## Superfície pública

- `ShortAnswerQuestion` e `ShortAnswerBlank`: removidos `one_of` e `regex`.
- `ShortAnswerBlank`: novo `open_ended: bool = False` (alias `openEnded`).
- `mdq.types`: `oneOf` e `regex` saem dos TypedDict; blank ganha `openEnded`.
- `effective_accept()` continua existindo e devolve `accept or []`.
- Código de lint `shadowed-answers` removido.

## Critérios de aceitação

### Lote 1: parser e modelo da questão

- AC1. `[short-answer]: X` gera `accept: ["X"]`. O padrão mantém os
  delimitadores: `` `True` ``, `/abc/`, `/abc/i`, `*`. Nenhum documento gerado
  tem `oneOf` ou `regex`.
- AC2. `[short-answer]: X` com `[short-answer/accept]` gera `accept` com `X`
  como primeiro item, seguido dos itens do bloco, em qualquer ordem dos
  blocos. A correção aceita `X` e os itens do bloco. Com
  `[short-answer/reject]`, `accept: ["X"]` e `reject` do bloco.
- AC3. Um documento (dict, YAML, JSON ou frontmatter) com `oneOf` ou `regex`
  em questão short-answer é rejeitado: `schema-error` em dict/YAML/JSON.

### Lote 2: casos de borda da questão

- AC4. `[short-answer]:` seguido de lista gera `accept` com um item por item
  da lista (comportamento mantido, decisão pendente).
- AC5. `[short-answer]: X` com `accept` no frontmatter é `conflicting-accept`.
  `[short-answer]:` vazio com `accept` no frontmatter é válido e não é
  `openEnded`.
- AC6. `[short-answer]:` vazio, sem `accept`/`reject` em lugar nenhum, gera
  `openEnded: true`. `short-answer-not-gradable` depende só de `accept` e
  `openEnded`.

### Lote 3: blanks de fill-in e lint

- AC7. `[^id/short-answer]: X` gera blank com `accept: ["X"]`; com lista
  accept do mesmo blank, `X` é o primeiro item.
- AC8. `[^id/short-answer]:` vazio gera blank com `openEnded: true`, sem
  `accept`, válido no schema e sem `short-answer-not-gradable`. Blank com
  `openEnded: true` e `accept` ou `reject` é rejeitado.
- AC9. `accept-wildcard`, `ignored-regex-flag` e `redundant-regex-anchor`
  disparam para o padrão do bloco simples, com path `["accept", 0]` (em blank:
  `["blanks", i, "accept", 0]`). `shadowed-answers` não existe mais.

### Lote 4: render, conversores, CLI

- AC10. Render para markdown: `accept` com um único padrão sem feedback nem
  comentário, e sem `reject`, vira `[short-answer]: X`; qualquer outro caso
  vira blocos. Parse do render devolve o mesmo documento.
- AC11. Conversores GIFT e Moodle XML: importação gera `accept`; exportação lê
  `accept`. O que hoje falha por falta de `oneOf` passa a falhar quando
  `accept` é ausente ou tem padrão que não é literal simples.
- AC12. `mdq show` exibe os padrões de `accept`. Suíte inteira verde, `uv run
  mypy mdq` limpo, `uv run scripts/schema_bundle.py --check` limpo.
