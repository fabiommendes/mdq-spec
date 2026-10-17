---
type: issue
status: todo
tags: [spec, audit, grammar, schema]
relatedTo: [docs/references/grammar.md, docs/question-types/question-base.md]
---

# Fragilidades da spec fora de multiple-choice

Encontradas durante a auditoria de multiple-choice (outubro de 2026), fora do
escopo dela. Usar como ponto de partida da auditoria das outras questões.

## 1. `tags` como string em YAML/JSON

`docs/question-types/question-base.md` (tabela do frontmatter) diz que `tags` é
`string[] or string`, e a seção "Frontmatter" diz que as regras valem para
Markdown, YAML e JSON. `schema/question-base.yaml` só aceita lista. O mdq-py só
separa por vírgula no frontmatter Markdown: em YAML, `tags: "a, b"` é
`schema-error`.

Decidir: (a) a string só existe no frontmatter Markdown, e a tabela diz isso;
ou (b) o schema aceita string e a separação vale em todo formato.

## 2. `blank-text` faltando nas tabelas Additional Rules

`docs/lint-codes.md` aplica `blank-text` ao feedback e comment de uma
alternativa de ordering, de um pattern de short-answer e de um choice blank de
fill-in. As tabelas de `ordering.md` e `fill-in.md` não têm essas linhas, e a
de `short-answer.md` só tem `incorrectFeedback`. O `spec_audit` não pega,
porque o código está declarado em outra tabela.

## 3. Seção "Feedback and comment lines" sem teste Lark

`docs/references/grammar.md`, seção "Feedback and comment lines": compila no
`spec_audit`, mas o que ela aceita e rejeita não foi testado. Casos: lazy line,
linha que interrompe parágrafo, `![` no início, linha só com o marcador, um
segundo bloco do mesmo tipo (com e sem linha em branco ou bloco do outro tipo
no meio), indentação de 4 espaços. Vale para MC, MS, TF, ordering e patterns.

## 4. Choice blanks de fill-in

Verificar se a sintaxe das escolhas de um choice blank segue as regras novas do
item de lista: `CHOICE_ID` (o id sempre vence, lookahead de link), texto vazio
como `blank-text`, `percent` sobre `INTEGER`/`DECIMAL`.

## 5. Port para mdq-js

O mdq-js ainda não tem: a gramática do item com `CHOICE_ID`, o `blank-text`
(com a definição de visible character de `grammar.md`), a vírgula final em
`tags`, e os códigos `no-correct-choice`/`many-correct-choices`. Os bundles do
schema já estão atualizados.
