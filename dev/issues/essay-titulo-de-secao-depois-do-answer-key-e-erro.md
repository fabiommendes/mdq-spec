---
type: issue
status: completed
tags: [spec, essay, mdq-py]
relatedTo: [questoes-de-codigo-com-correcao-automatica-tipo-code, rubrica-de-correcao]
kind: enhancement
created: 2026-11-10
creator: claude
closed: 2026-11-10
---

# Essay: título de seção depois do answer-key é erro

Decisão F12 do RFC `questoes-de-codigo-com-correcao-automatica-tipo-code`.

Hoje um título `## [nome]` escrito depois de `## [answer-key]` num essay vira
texto do gabarito em silêncio (`docs/question-types/essay.md`, seção "Answer
key"; `mdq-py/mdq/_parser/_question.py`). Com `## [rubric]` e as seções do tipo
`code`, isso esconde uma seção escrita no lugar errado.

Mudança: em todo tipo de questão, um título `## [nome]` depois do
`## [answer-key]` é erro, como já é no epílogo (`forbidden-block-element`). A
checagem olha a linha da fonte: `## \[x]` continua sendo um título literal.

Pode ser feita antes do tipo `code`. Nenhum arquivo do corpus é afetado.

- [ ] `docs/question-types/essay.md` e `question-base.md`
- [ ] `docs/lint-codes.md` e a tabela "Additional Rules"
- [ ] corpus: um caso inválido, e um válido com o título escapado
- [ ] mdq-py
- [ ] changelog da raiz e de `mdq-py/`
- [ ] nota de porte para a mdq-js
