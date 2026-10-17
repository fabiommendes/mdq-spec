---
type: spec
status: active
tags: [mdq, short-answer, fill-in, parser]
relatedTo: [docs/question-types/short-answer.md, docs/question-types/fill-in.md, dev/specs/to-review/short-answer-two-blocks.md]
---

# Short answer: blocos malformados são erro

Decisão do humano (2026-09-29). O spec já era claro; a implementação estava
errada. Spec ajustado (gramática com `patterns?` só no bloco accept, regra MUST
para reject, linha nova na tabela de regras) e 3 exemplos inválidos novos.

## Critérios de aceitação

- AC1. Feedback (`>`) e comentário (`!`) intercalados num item de padrão
  (`>`, `!`, `>` ou `!`, `>`, `!`) é `parse-error`, em `[short-answer]`,
  `[short-answer/reject]` e nos blocos de blank de fill-in. Continuam válidos:
  só feedback, só comentário, feedback e depois comentário, comentário e
  depois feedback, cada um com várias linhas.
- AC2. `[short-answer/reject]:` sem padrão (linha vazia, sem lista, ou com
  lista destacada por linha em branco) é `parse-error`. Mesmo para
  `[^id/short-answer/reject]:`.
- AC3. Exemplos de regressão do corpus passam:
  `invalid/short-answer-interleaved-observations`,
  `invalid/short-answer-empty-reject`,
  `invalid/fill-in-blank-interleaved-observations`.
