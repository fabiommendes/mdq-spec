---
type: adr
status: accepted
tags: [tests, corpus, examples, mdq-py, mdq-js]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# examples/ é a suíte de testes compartilhada das duas implementações

## Contexto

Duas implementações do mesmo formato precisam concordar em parse, lint, ids
derivados, resolução de includes e notas. Testes unitários escritos à mão em
cada lado divergem com o tempo e duplicam esforço.

Evidência:

- Commit `8fae079` (2026-09-24): "Share expected lint diagnostics as .lint.json
  files": `examples/warnings` vai para `examples/valid` ao lado de um
  `.lint.json` com os diagnósticos esperados; `docs/lint-codes.md` nasce.
- `mdq-js/docs/sync/README.md:11-13`: "Both implementations share one test
  corpus in a language-agnostic format (`examples/`). A fact about the format
  is an example in the corpus, not a unit test on one side."
- `mdq-js/docs/sync/testing.md:138-149`: um teste sobre o formato (ids
  derivados, erros de parse, lint, matching, notas) é um exemplo em
  `examples/`; um teste Python desse tipo migra para o corpus antes do porte
  da área; um teste unitário TS só para API TS, diferença de runtime ou
  propriedade fast-check.
- `mdq-py/tests/_corpus.py:1-33`: catálogo dos arquivos do corpus e do runner
  de cada um: `.lint.json`, `.resolved.yaml`, `.ids.yaml`, `normalize.yaml`,
  `matching/query.yaml`.
- `dev/notes/mdq-py-test-suite-slim.md`: investigação para levar ao corpus o
  que os testes unitários da mdq-py verificam e apagar os redundantes, com
  base em cobertura (`r2 coverage redundant`).
- `AGENTS.md:83-86`: "Both implementations share an extensive test suite with
  examples of valid and invalid mdq documents and their expected serialization."

## Opções

1. Cada implementação mantém a própria suíte de testes unitários.
2. Um corpus em `examples/` (documento, serialização esperada, `.lint.json`,
   `.ids.yaml`, `.resolved.yaml`, vetores de grading e de query), rodado pelas
   duas suítes; testes unitários só para API, runtime e propriedades.

## Decisão

Opção 2. Um fato sobre o formato é um exemplo em `examples/`. Cada
implementação tem runners que percorrem o corpus. Testes unitários ficam para
assinaturas, erros lançados, diferenças de runtime e propriedades. A mdq-py
reduz a própria suíte ao que o corpus não cobre.

Razão registrada (`sync/testing.md:138-142`): sem o corpus cada lado porta o
teste à mão e as duas cópias divergem.

## Consequências

- Um exemplo novo roda nas duas implementações; na mdq-js falha até ser
  portado ou listado em `tests/not-ported.ts` (ADR 0003).
- `examples/` faz parte da spec: muda com `docs/` e `schema/` e passa por
  `r2 audit` (ADR 0002).
- Formatos de arquivo auxiliares (`.lint.json`, `.ids.yaml`,
  `.resolved.yaml`) são contrato entre as duas suítes; mudar um exige mudar
  os dois runners.
- Exemplos seguem a convenção "Brazil core" de `AGENTS.md:88-91`.
