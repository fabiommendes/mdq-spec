---
type: issue
status: backlog
tags: [lint, ordering]
relatedTo: [docs/question-types/ordering.md, docs/lint-codes.md]
kind: enhancement
created: 2026-11-05
creator: claude
---

# Aviso para linha de comentário que vira epílogo

## Problema

Numa questão de ordenação, linhas `!` depois do bloco `[ordering]` e antes do
primeiro `## [accept]` não são comentário: viram o `epilogue`, que vai na
forma pública. O comentário do professor apareceu para os alunos no Codehood
(`prolog-avaliador-de-expressoes`, curso de Paradigmas), e o parser não avisou
nada. As duas linhas `!` foram juntadas num parágrafo, com o segundo `!` no
meio do texto.

## Proposta

Um aviso de lint quando um parágrafo do epílogo (ou do enunciado) começa com
`! ` seguido de texto, em qualquer tipo de questão: quase sempre é um
comentário fora do lugar. A mensagem diz onde o comentário seria aceito
(dentro de `## [accept]`/`## [reject]`, ou no ponto que o tipo define).
