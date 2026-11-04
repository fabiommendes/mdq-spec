---
type: adr
status: accepted
tags: [spec, numeric, mdq-py, mdq-js]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Numérico com aritmética exata e faixa limitada a double

## Contexto

Uma questão numérica compara resposta, answer key e tolerância. Com floats, `1/3` não tem representação segura e `4.0` perde o zero final (`docs/question-types/numeric.md:127-140`). JavaScript lê qualquer número como double antes de qualquer aritmética: `1e400` vira `Infinity`, `1e-999` vira `0`, e `JSON.parse("4.0")` dá `4` (`docs/question-types/numeric.md:150-159,217-220`). Um expoente enorme (`1e999999999`) travava o parser Python antes de existir um `Fraction` (`mdq-py/CHANGELOG.md:156`).

## Opções

1. Floats nos dois lados e aceitar diferenças de arredondamento.
2. Aritmética exata (`fractions` em Python, `fraction.js` em JS) e malformar o que um double não representa.

## Decisão

Opção 2:

- Nenhum valor numérico é mantido como float: `fractions.Fraction` em `mdq-py/mdq/models/_numeric.py:13` e `mdq-py/mdq/_parser/_numeric.py:15`; `fraction.js` em `mdq-js/src/models/numeric.ts:5-9` (`mdq-js/CHANGELOG.md:59`; `mdq-js/docs/sync/README.md:30`).
- Valor, tolerâncias e resposta devem caber na faixa de um double: módulo acima do maior double finito, ou não zero que arredonda para 0, é malformado (`parse-error` no Markdown, `malformed-numeric-answer` em YAML/JSON, `ResponseError` na resposta). Razão registrada: os dois runtimes leem o número como double antes da aritmética exata e não conseguiriam concordar fora dessa faixa (`docs/question-types/numeric.md:150-159`; `docs/responses.md:157-160`).
- O expoente tem no máximo 3 dígitos e a faixa é checada antes de criar o `Fraction` (`mdq-py/CHANGELOG.md:156`). Razão: evitar o travamento do parser.
- Um número YAML/JSON de valor inteiro conta como `integer`. Razão: JavaScript não distingue `4.0` de `4`; para `decimal` o autor escreve `domain: decimal` ou a string `"4.0"` (`docs/question-types/numeric.md:217-220`).

## Consequências

- Fração fica string na serialização JSON, mesmo com valor exato em float (`docs/question-types/numeric.md:139-140`).
- `1.7e308` é válido; `1e400` e `1e-999` não.
- A mdq-js carrega `fraction.js` como dependência.
