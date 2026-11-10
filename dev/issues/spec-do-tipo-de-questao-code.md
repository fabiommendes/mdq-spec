---
type: issue
status: completed
tags: [spec, code]
relatedTo: [questoes-de-codigo-com-correcao-automatica-tipo-code, rubrica-de-correcao]
kind: enhancement
created: 2026-11-10
creator: claude
closed: 2026-11-10
---

# Spec do tipo de questão code

Escrever a spec do tipo `code` pelo RFC
`questoes-de-codigo-com-correcao-automatica-tipo-code` (elementos F1 a F17).
O RFC é a fonte; esta issue é a lista de entregas.

- [ ] `docs/question-types/code.md`: frontmatter (`language`, `file`), tag
  `[code]`, seções `## [template]`, `## [tests]`, `## [rubric]`,
  `## [answer-key]` e a ordem delas, fontes de testes (bloco e link), nota,
  automation, forma JSON
- [ ] gramática Lark do item de rubrica (valor, modificadores, linhas `>` e
  `!`) e da anotação `mdq:`, em `docs/references/`
- [ ] `schema/code.yaml`, a entrada em `schema/exam.yaml`, o bundle
  (`r2 audit`)
- [ ] `docs/public-form.md`: campos privados e a lista derivada das regiões
  públicas. Decidir o nome desse campo (ponto A1 do RFC)
- [ ] `docs/exam.md`: a frase sobre o piso em -1 e a linha dos tipos sem
  `grading`
- [ ] `docs/responses.md`: resposta de `code`, nota do professor por item
  manual, fonte não resolvido como erro
- [ ] `docs/lint-codes.md` e a tabela "Additional Rules"
- [ ] corpus: `examples/valid/code/`, `examples/invalid/code-*`, casos em
  `examples/public.yaml` e `examples/grading/code.yaml`
- [ ] `CHANGELOG.md` da raiz
- [ ] ajustar `dev/issues/rubrica-de-correcao.md` ao que o RFC fixou

Depende da issue do essay (título de seção depois do answer-key).
