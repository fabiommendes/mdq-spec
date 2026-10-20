---
type: handoff
status: open
tags: [auditoria-spec, numeric]
relatedTo: [dev/audits/spec-short-answer-2026-10-17/, dev/audits/decisoes-short-answer-2026-10-17.md, dev/handoffs/mdq-js-port-pendente.md, docs/question-types/numeric.md]
---

# Próxima auditoria do spec: numeric

## Estado

- Feitas: multiple-choice (2026-10-13), multiple-selection (2026-10-15),
  true-false (2026-10-16/17), short-answer (2026-10-17 a 2026-10-20). Logs
  arquivados em `dev/audits/spec-<tipo>-<data>/`.
- Faltam, nesta ordem: numeric, fill-in, essay, ordering.
- `docs/audits/spec/` está vazio: a próxima auditoria cria o log do zero
  (`/audit-spec spec para questões numeric`). A skill só é iniciada pelo
  humano.
- `.claude/skills/audit-spec/spec.md` tem mudanças que não são da auditoria:
  não commitar.
- `docs/audits/` continua ignorado via `.git/info/exclude`.

## Como as auditorias rodam (repetir)

1. `/audit-spec` com subagentes por parte: um grammar-auditor (snippets Lark,
   terminais, dialeto de regex) e um scanner do tipo (prosa, tabela de regras,
   schema, corpus, lint-codes). Revisar cada achado com `show`, `accept`,
   `merge`.
2. Síntese, `coverage`, `render`, conferir o PDF página a página.
3. Decisões com o humano, **uma a uma, com exemplos**, no máximo 4 por vez.
   Registrar cada decisão em `dev/audits/decisoes-<tipo>-<data>.md` à medida
   que sai (sobrevive à compactação).
4. Aplicar cada lote decidido com um implementer em background (spec, schema,
   corpus, skills, mdq-py, changelogs, nota de port). Enquanto ele roda,
   apresentar a próxima decisão. Lotes que mexem no mesmo arquivo rodam em
   sequência.
5. Depois de cada lote: `uv run scripts/spec_audit.py` (15 passos) e, no
   `mdq-py/`, `uv run pytest -q`, `uv run mypy mdq`, `uv run ruff check`.
   Rodar de novo a suíte completa se o agente diz que não rodou.
6. Commits separados: raiz (spec, corpus, `dev/`), `mdq-py/`, bundle do
   `mdq-js/`.

## Lições

- O humano quer regras em gramática e tabelas; a prosa explica o motivo
  (memória `spec-explicit-over-prose`). Motivos das escolhas ficam visíveis no
  spec ou num anexo com fontes.
- Pesquisa de dados externos (línguas, Unicode) rende: um subagente com
  WebSearch produziu `dev/audits/true-false-letters-research.md` e mudou a
  decisão do `S`.
- A resposta de multiple-selection é a lista de ids marcados. O mapeamento
  id -> bool é artefato antigo; não propor (memória `ms-response-is-set`).
- Id desconhecido em qualquer resposta é resposta malformada.
- Implementers às vezes alteram exemplos do corpus para caber numa regra nova
  (ex.: `cjk-markers`, `non-bmp-marker`). Conferir e reportar ao humano.
- Subagentes nunca rodam `git stash`, `checkout` ou `reset`.

## Pontos já conhecidos para numeric

- D8/D9 da short-answer: `unit` saiu do frontmatter do numeric (só
  `[numeric(unit)]`). Chave fora da tabela de frontmatter é
  `invalid-frontmatter-field`; o bundle tem `$defs/frontmatter-<tipo>`.
- D13a: numeric não tem `grading`; o `grading` do exame não se aplica, e o
  score fica em [0, 1]. Frase em `docs/exam.md`, seção "Grading".
- `docs/responses.md`, seção "Numeric", tem frases fracas: "MAY flag the
  system to use decimal arithmetic", e "reject ... with grade zero" mistura
  malformed com nota 0.
- Fill-in (próximo tipo): `choice_def` e `numeric_def` não têm `ws?` no
  início (o F1 da short-answer corrigiu só `accept_def`/`reject_def`). Falta
  estratégia Hypothesis para `incorrectFeedback` dos blanks.

## Pendências fora da auditoria

- Port para o mdq-js: acumulado em `dev/handoffs/mdq-js-port-pendente.md`,
  só depois de todos os tipos.
- `dev/issues/foreign-marker-message-drops-spaces.md` (mdq-py, mensagem de
  `foreign-choice-marker` mostra `[]` para `[ ]`).
- Backlog: "Choices with blocks" em `BACKLOG.md`.
- Info sem ação da auditoria de true-false: F13 (homóglifos, ex.: cirílico `Н`
  é FALSE e latino `H` é WARNING) e F23 (U+0958 e NFC).
- `dev/issues/type-clash-cryptic-errors.md`,
  `dev/issues/frontmatter-error-after-body-parse.md`,
  `dev/issues/moodle-import-backtick-answer.md` (mdq-py, da short-answer).
- `dev/issues/hypothesis-preamble-h1.md`: 1 teste do Hypothesis falha com o
  banco `.hypothesis/` local, também no HEAD.
- O bundle `mdq-js/src/mdq.schema.json` mudou sem port do código: testes do
  mdq-js que contam `$defs` ou usam `unknown-frontmatter-key` quebram até o
  port.
- `ruff format --check` do mdq-py já falhava em 23 arquivos antes da
  auditoria de short-answer.
