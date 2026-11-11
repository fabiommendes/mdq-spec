---
type: issue
status: backlog
tags: [mdq-py, code]
relatedTo: [questoes-de-codigo-com-correcao-automatica-tipo-code, mdq-py-tipo-code]
kind: enhancement
created: 2026-11-10
creator: claude
---

# mdq-py: resolver fontes de testes em link no CLI e na prova

Hoje só `CodeQuestion.resolve(texts)` resolve um fonte de testes em link.

- `mdq validate` e `mdq show` nunca leem o arquivo ligado. As anotações `mdq:` de um arquivo externo não são checadas, e `rubric-without-positive-item` nunca dispara para elas. O CLI pode resolver o caminho relativo ao arquivo da questão. O ADR 0007 diz que `mdq validate` checa uma fonte só: decidir se o CLI abre exceção para fontes de testes.
- `Exam` não tem passo de resolução para os fontes das suas questões. A spec diz que o host resolve cada questão com o próprio mapa, mas hoje o host precisa reconstruir a prova. Proposta: `Exam.resolve_tests({id da questão: {origem: texto}})`.

Achado na revisão da implementação do tipo `code` (2026-11-10).
