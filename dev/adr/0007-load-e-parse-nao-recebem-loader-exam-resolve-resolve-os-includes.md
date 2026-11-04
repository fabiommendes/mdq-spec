---
type: adr
status: accepted
tags: [loading, exam, include, api, mdq-py]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# load e parse não recebem loader; Exam.resolve resolve os includes

## Contexto

Uma prova pode ter blocos `include` e `includeAll` que apontam para um
question bank. Era preciso decidir se `load`/`parse` resolvem esses blocos
(e portanto recebem um loader) ou se devolvem a prova não resolvida e deixam a
resolução para o host.

Evidência:

- Commit `a929489` (2026-09-24): "Load documents through one module with
  diagnostics": `mdq.load` "runs parse, include resolution, model validation
  and lint"; nasce `mdq/loading.py` com resolução de includes dentro.
- Commit `d967efd` (2026-09-28): "Move lint rules onto the models and add
  include-all": `includeAll` com a linguagem de query, "resolved by
  `Exam.resolve()`".
- `mdq-py/mdq/_loading.py:1-4`: "The one path from Markdown/data to a
  validated model: parse, build the pydantic model, then lint. An exam's
  include blocks stay unresolved; the host resolves them with `Exam.resolve`."
- `mdq-py/mdq/models/_exam.py:464-474`: `Exam.resolve(bank, *, select,
  warnings)` devolve uma cópia com cada `include` e `includeAll` substituído
  pelas questões do bank.
- `mdq-py/CHANGELOG.md:36` ([Unreleased], Changed): "`load` and `parse` take
  no `loader`: an exam's `include` and `includeAll` blocks stay unresolved,
  and the host resolves them with `Exam.resolve(bank)`. `mdq validate` checks
  the exam source only."
- `dev/issues/validate-resolve-includes.md`: registra que foi "a deliberate
  change from the first design of the loading module, which had a `loader=`
  parameter on `load`", e lista as consequências em aberto.

## Opções

1. `load(source, loader=...)`: o carregamento resolve includes e devolve a
   prova resolved com diagnósticos (desenho de `a929489`).
2. `load`/`parse` sem loader: devolvem a prova com includes; `Exam.resolve(bank)`
   é um passo separado do host (desenho atual).

## Decisão

Opção 2. `load` e `parse` fazem parse, modelo e lint de um documento só.
`Exam.resolve(bank, select=...)` substitui `include` e `includeAll` pelas
questões do question bank, com seleção opcional por seed. O loader entra só
em `resolve`.

Razão não registrada. O changelog e a issue registram a mudança como
deliberada, mas nenhum dos dois diz por quê.

## Consequências

- `mdq validate exam.mdq.md` não vê os includes: uma prova com include ausente
  ou questão incluída inválida sai com 0 (`dev/issues/validate-resolve-includes.md`).
- `Exam.resolve` reporta problemas como exceções (`IncludeNotFound`,
  `ValidationError`), não como `Diagnostic`; a issue propõe convertê-los.
- `mdq show` monta `FileLoader(src.parent)` por conta própria.
- A API de carregamento não depende de sistema de arquivos nem de bank, o que
  facilita o porte para a mdq-js, onde só existe `DictLoader` (ADR 0003).
