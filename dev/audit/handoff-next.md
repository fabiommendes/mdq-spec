---
type: handoff
status: active
tags: [mdq, audit, corpus, mdq-js]
relatedTo: [plan.md, report.html, mdq-js/docs/sync/roadmap.md]
---

# Handoff: auditoria do spec feita em mdq-py e portada ao parser/schema do mdq-js

Repo: `/home/chips/git/codehood/mdq` (raiz = spec; subtrees `mdq-py/`,
`mdq-js/`). Idioma com o humano: português. Arquivos públicos em inglês.
`dev/` nunca é commitado. Nunca commitar sem pedido. Prefixar shell com
`rtk`. Ler `AGENTS.md`, `mdq-py/AGENTS.md` e `mdq-js/docs/sync/*.md`
(`mdq-js/AGENTS.md` não existe; a raiz aponta para ele).

## Estado

- mdq-py: tudo de `plan.md` feito (commits até `a7f866a`). Suíte: 8479
  passam; 1 falha pré-existente deselecionada
  (`tests/test_ordering_parser.py::test_render_parse_is_a_fixed_point`).
- mdq-js (2026-10-08, não commitado): schema Zod e parser alinhados ao
  corpus. `pnpm test` 2596 passam, `pnpm typecheck` e `pnpm lint` limpos.
  Camadas: schema (`tests/schema.spec.ts`), parse de válidos
  (`tests/parser.spec.ts`, agora via `parseDocument`), rejeição dos
  `invalid/*.mdq.md` (`tests/invalid-sources.spec.ts`; códigos de modelo
  ficam em `LOAD_CODES` de `tests/not-ported.ts` como `it.fails`).
  Resumo em `mdq-js/docs/handoffs/12-audit-port.md` e no
  `mdq-js/CHANGELOG.md` `[Unreleased]`.
- Working tree: só `mdq-js/` mudou nesta sessão. Commit só a pedido
  (raiz, depois `git subtree push`).

## Próximo no mdq-js (ordem sugerida)

1. F4.1: `resolveExam`, `DictLoader`, `parseQuery` (`banks.ts`, `query.ts`
   são stubs com `throw new Error("not implemented")`); teste de corpus
   lendo `examples/valid/exam/*.resolved.yaml`.
2. F5: `load()` com diagnósticos (`Diagnostic` já existe), `withIds`, regras
   de modelo como refinements (lista em `docs/sync/roadmap.md`, "Reference
   changes waiting for a phase"); `invalid/model-only/` e `LOAD_CODES`
   saem do manifesto conforme forem portados.
3. F6: linter contra `.lint.json` (todo válido tem um; `[]` é limpo).
4. F7: scoring contra `examples/grading/*.yaml` (5 arquivos, 205 casos).

## Pendências fora do foco

- M27 (path `[]` em `yaml-syntax-error` de bloco de exame). Falha
  hypothesis de ordering (NBSP / `main-0` vs `main-00`).
- BACKLOG: `{value, unit}` como resposta numérica; grading de ordering,
  fill-in e penalidade de exame (`null` vs `{}`); O3 (seção AST por tipo).
- `dev/issues/*` e `dev/specs/to-review/automation.md`.
- A raiz `AGENTS.md` referencia `mdq-js/AGENTS.md`, que não existe.
