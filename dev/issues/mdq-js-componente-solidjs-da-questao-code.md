---
type: issue
status: completed
tags: [mdq-js, code, solid]
relatedTo: [questoes-de-codigo-com-correcao-automatica-tipo-code, mdq-js-porte-do-tipo-code]
kind: enhancement
created: 2026-11-11
creator: claude
closed: 2026-11-11
---

# mdq-js: componente SolidJS da questão code

Componente SolidJS para a questão `code`, replicando o `Essay` (`mdq-js/src/solid/Essay.tsx`): enunciado, editor de texto simples com o `template` como valor inicial, epílogo.

- [ ] `mdq-js/src/solid/Code.tsx`, ligado em `QuestionView` e exportado em `solid/index.ts`
- [ ] modo de revisão: resposta pendente (sem runner não há relatório), solução de referência quando há gabarito
- [ ] mostrar as regiões `{example}` de `publicTests` como bloco de código depois do enunciado (F8 do RFC), quando a forma pública as traz
- [ ] testes em `mdq-js/tests/solid/code.spec.tsx`
- [ ] `mdq-js/CHANGELOG.md`

Fora: editor com realce, rodar testes públicos, mostrar o relatório do runner.
