---
type: issue
status: open
tags: [mdq-py, diagnósticos]
relatedTo: [docs/question-types/question-base.md]
---

# `type` do frontmatter em conflito com o corpo dá erros crípticos

`type: numeric` no frontmatter com corpo `[short-answer]: Brasília` gera
`schema-error answer: Field required` e `schema-error accept: Extra inputs are
not permitted`. A mensagem deveria dizer que o corpo não tem o marcador do
tipo declarado (ou que tem o marcador de outro tipo).
