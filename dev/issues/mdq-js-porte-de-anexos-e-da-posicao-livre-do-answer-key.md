---
type: issue
status: backlog
tags: [mdq-js, anexos]
relatedTo: [anexos-em-questoes-e-provas]
kind: enhancement
created: 2026-11-11
creator: claude
---

# mdq-js: porte de anexos e da posição livre do answer key

# mdq-js: porte de anexos e da posição livre do answer key

Portar da mdq-py para a mdq-js a seção `## [attachments]` e a nova regra de
`## [answer-key]` (question-base.md, "Attachments"; exam.md, "Attachments";
essay.md e code.md, "Answer key").

- Parser: um leitor de anexos comum (fence com info string `formato nome`,
  parágrafo com um link), usado pela questão e pela prova. Os leitores de seção
  de essay, code e ordering aprendem `attachments`; nos outros tipos a seção
  encerra o epílogo. Em essay e code, `## [answer-key]` termina no próximo
  heading de seção do tipo. Na prova, a seção fica entre as instruções e a
  primeira questão; `setext-heading` em `attachments` e em
  `questions[i].attachments`.
- Modelo Zod: `Attachment` (`name`, `format`, `text` ou `origin`, `label`),
  campo `attachments` na base das questões e na prova; erros
  `duplicate-attachment-name`, `attachment-name-disagrees-with-origin`,
  `attachment-format-disagrees-with-origin`; `attachments` no frontmatter é
  `invalid-frontmatter-field`.
- Forma pública e apresentada: `attachments` sem `origin`.

Referência na mdq-py: `mdq/_parser/_attachments.py`, `models/_base.py`
(`Attachment`). Os exemplos do corpus estão listados em
`mdq-js/tests/not-ported.ts` com esta issue.
