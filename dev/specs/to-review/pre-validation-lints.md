---
type: spec
status: review
tags: [mdq, short-answer, fill-in, lint, preAccept, preReject]
relatedTo: [dev/audit/plan.md, docs/lint-codes.md, docs/references/patterns.md]
---

# Lints em `preAccept`/`preReject` (D11)

Decisão A: `redundant-regex-anchor`, `ignored-regex-flag`, `accept-wildcard`
e `unreachable-reject` cobrem as quatro listas de padrão, não só
`accept`/`reject`.

## Requisitos

1. Anchor e flag: mesmas condições de `accept`/`reject`, path
   `("preAccept", i)` / `("preReject", i)`.
2. `accept-wildcard` (warning) em `*` de `preAccept`; `unreachable-reject`
   (info) em `*` de `preReject` que não é o último item.
3. Blank short-answer de fill-in: path `("blanks", n, "preAccept", i)`.

## Feito

- Docs: `lint-codes.md` (4 linhas), `short-answer.md` tabela de regras,
  `patterns.md` seção Wildcard.
- Corpus: `short-answer/pre-validation-regex-lints`,
  `short-answer/pre-validation-wildcard`, `fill-in/pre-validation-lints`.
- mdq-py: `_lint.check_short_answer` ganha `pre_accept`/`pre_reject`;
  helper `_check_pattern_list`. Callers em `_text.py` e `_fill_in.py`.
  Testes em `tests/test_pre_validation_lints.py`.
- Changelogs da raiz e do mdq-py.

## Pendente

- Port para mdq-js.
