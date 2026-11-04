---
type: adr
status: accepted
tags: [spec, schema, grammar, lint]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# O normativo é o schema, a gramática Lark e as tabelas Additional Rules; a prosa explica

## Contexto

A especificação em `docs/` mistura prosa, trechos de gramática Lark, tabelas
"Additional Rules" com códigos de lint e um JSON Schema em `schema/`. Duas
implementações leem esses documentos. Sem uma regra sobre qual parte manda, a
prosa e as tabelas divergem e cada implementação escolhe a sua leitura.

Evidência:

- `docs/question-types/question-base.md:568-572`: "The tables of Additional
  Rules list document diagnostics only. Other RFC 2119 keywords of a document
  bind hosts, graders and authors, and have no lint [...] The JSON Schema is
  normative for the shape of a document."
- `docs/references/grammar.md:3-7`: os trechos de gramática usam o formato
  Lark e compartilham regras e terminais definidos em um só lugar.
- `AGENTS.md:101-109`: os trechos Lark podem ser incompletos, mas devem ser
  Lark válido; `scripts/spec_audit.py` compila todos com stubs para as regras
  não definidas.
- `AGENTS.md:145-150`: `r2 audit` (`scripts/spec_audit.py`) regenera o bundle
  do schema e verifica que schemas, docs, tabelas "Additional Rules",
  `docs/lint-codes.md` e o corpus concordam, e roda o teste de acordo do
  schema da mdq-py. A CI roda com `--check` (`.github/workflows/ci.yml:21-22`).

## Opções

1. A prosa é a norma; gramática, schema e tabelas são ilustração.
2. Schema, gramática Lark e tabelas são a norma; a prosa explica. Um script
   verifica a concordância entre as partes mecânicas.

## Decisão

Opção 2. O JSON Schema é normativo para a forma do documento. A gramática Lark
define a sintaxe do Markdown. As tabelas "Additional Rules" são a lista
completa dos diagnósticos de documento, com código e severidade. A prosa
explica e dá exemplos. `scripts/spec_audit.py` compila cada trecho Lark e
cruza tabelas, `docs/lint-codes.md`, schema e corpus; a CI falha quando
divergem.

Razão registrada (`question-base.md:568-572`, `AGENTS.md:145-150`): só as
partes mecânicas podem ser verificadas por script. Palavras-chave RFC 2119 da
prosa que obrigam hosts e autores não têm lint.

## Consequências

- Uma regra nova entra primeiro na gramática, no schema ou na tabela; a prosa
  vem depois. Uma regra só na prosa não é verificada e não é um diagnóstico.
- Toda mudança em `docs/`, `schema/` ou `examples/` exige rodar `r2 audit`.
- Os trechos Lark têm de ser Lark válido mesmo incompletos; o audit os compila
  com stubs.
- Onde um terminal Lark aproxima uma regra do CommonMark, o CommonMark vence
  (ADR 0001).
