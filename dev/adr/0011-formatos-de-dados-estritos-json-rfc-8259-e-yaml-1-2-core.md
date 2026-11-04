---
type: adr
status: accepted
tags: [spec, yaml, json, mdq-py, mdq-js]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Formatos de dados estritos: JSON RFC 8259 e YAML 1.2 Core

## Contexto

Os documentos MDQ chegam em Markdown com frontmatter YAML, em YAML puro ou em JSON. Os leitores padrão são permissivos: `json.loads` do Python aceita `NaN` e `Infinity`, PyYAML segue YAML 1.1 (`yes` é booleano, `1:30` é 90), chave repetida fica com o último valor, e `id: 2024` chegava ao modelo convertido para string (commits 78b4bd2, 40591e2, 4409033, 2026-09-29). Na mdq-js, `js-yaml` aceita chave que não é escalar (`mdq-js/docs/sync/roadmap.md:34-36`).

## Opções

1. Aceitar o que o leitor de cada runtime aceita e documentar as diferenças.
2. Fixar na spec um perfil estrito e fazer cada implementação cumprir.

## Decisão

Opção 2:

- JSON segue RFC 8259: `NaN`, `Infinity` e `-Infinity` são `json-syntax-error`, como em `JSON.parse` (`docs/lint-codes.md:110-112`; `CHANGELOG.md:35`; commit 3e97e04, 2026-10-27).
- YAML segue o Core schema 1.2: um escalar simples é `null`, booleano, inteiro, float ou string; `1:30` é a string `"1:30"` (`docs/question-types/question-base.md:112-116`; `docs/exam.md:504-505`). Tag fora do Core schema (`!!timestamp`, `!!python/...`) é `yaml-syntax-error`; chave escalar vira sua forma string, chave que é sequência ou mapping é erro (`CHANGELOG.md:37`; commit 03904f8, 2026-10-27).
- Chave repetida em mapping YAML ou JSON é erro de sintaxe, não último valor vence (commit 78b4bd2).
- Os valores mantêm o tipo YAML: `id`, `include` e `includeAll` precisam ser strings; `id: 2024` ou `include: yes` é `schema-error` (commits 40591e2, 4409033).

Razão não registrada além do que os commits dizem: um valor convertido em silêncio escondia um erro do autor.

## Consequências

- A mdq-js usa o pacote `yaml` e caminha a AST em vez de `js-yaml` (`mdq-js/docs/sync/roadmap.md:34-36`; commit 03904f8).
- `HH:MM` em `duration` não precisa de aspas (`docs/exam.md:504-505`).
- Exemplos inválidos no corpus para cada regra (`CHANGELOG.md:35,37`).
