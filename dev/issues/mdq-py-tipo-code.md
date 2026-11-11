---
type: issue
status: completed
tags: [mdq-py, code]
relatedTo: [questoes-de-codigo-com-correcao-automatica-tipo-code]
kind: enhancement
created: 2026-11-10
creator: claude
closed: 2026-11-11
---

# mdq-py: tipo code

Implementar o tipo `code` na mdq-py, pela spec (issues "Spec do tipo de
questão code" e "Schema e documento do relatório do runner").

- [ ] parser: tag `[code]`, as quatro seções, fontes de testes em bloco e em
  link
- [ ] scanner de anotações `mdq:` e cálculo das regiões
- [ ] modelo e schema; rubrica completa como valor derivado
- [ ] passo de resolução dos fontes em link (mapa de origem para texto), sem
  loader em `load` e `parse` (ADR 0007)
- [ ] nota a partir de um relatório do runner e das notas dos itens manuais
- [ ] forma pública
- [ ] lints e CLI (`mdq show` imprime a rubrica completa e a distribuição dos
  pontos)
- [ ] `mdq-py/CHANGELOG.md`

Fora desta issue: a interface de plugin e os plugins de formato (E1 e E2 do
RFC).
