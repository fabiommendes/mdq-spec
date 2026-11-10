---
type: issue
status: completed
tags: [spec, code, runner]
relatedTo: [questoes-de-codigo-com-correcao-automatica-tipo-code]
kind: enhancement
created: 2026-11-10
creator: claude
closed: 2026-11-10
---

# Schema e documento do relatório do runner

Seção "Relatório do runner" do RFC
`questoes-de-codigo-com-correcao-automatica-tipo-code`.

O relatório é o JSON que um runner devolve: `status` (`completed`,
`build-error`, `runner-error`) e uma lista de casos com `source`, `line` e
`verdict`, mais os campos opcionais. É produzido por projetos de terceiros,
então tem schema, ao contrário das respostas.

- [ ] `schema/runner-report.yaml`. É o primeiro schema que não é de questão
  nem de prova: `scripts/schema_bundle.py` e `scripts/spec_audit.py` precisam
  de uma regra para ele
- [ ] um documento próprio em `docs/`, com as regras: `runner-error` deixa a
  resposta pendente, `build-error` reprova todos os itens ligados a testes,
  caso é binário, como uma linha vira região e item
- [ ] casos de exemplo no corpus (relatório + nota esperada)
