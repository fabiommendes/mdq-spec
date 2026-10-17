---
type: handoff
status: open
tags: [auditoria-spec, short-answer]
relatedTo: [dev/audits/spec-true-false-2026-10-16/, dev/audits/decisoes-true-false-2026-10-16.md, dev/handoffs/mdq-js-port-pendente.md, docs/question-types/short-answer.md]
---

# Próxima auditoria do spec: short-answer

## Estado

- Feitas: multiple-choice (2026-10-13), multiple-selection (2026-10-15),
  true-false (2026-10-16/17). Logs arquivados em `dev/audits/spec-<tipo>-<data>/`.
- Faltam, nesta ordem: short-answer, numeric, fill-in, essay, ordering.
- `docs/audits/spec/` está vazio: a próxima auditoria cria o log do zero
  (`/audit-spec spec para questões short-answer`). A skill só é iniciada pelo
  humano.
- Tudo commitado até `da7e03b`, mais o commit do `dev/` que acompanha este
  handoff. `.claude/skills/audit-spec/spec.md` tem mudanças que não são desta
  sessão: não commitar.
- `dev/` passou a ser commitado (decisão de 2026-10-17, ver `AGENTS.md`).
  `docs/audits/` continua ignorado via `.git/info/exclude`.

## Como a auditoria de true-false rodou (repetir)

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
5. Depois de cada lote: `uv run scripts/spec_audit.py` (14 passos) e, no
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

## Pontos já conhecidos para short-answer

- `docs/question-types/short-answer.md`: grading por padrões `accept`/`reject`
  e `unmatched` (`incorrect`/`manual`), sem o campo `grading` de estratégia.
  Conferir como o `grading` escalar do exame (tabela da D1 em `docs/exam.md`)
  trata short-answer. `essay.md` é separado, mas short-answer cita a resposta
  de essay.
- A normalização de marcadores (NFKC + lower ASCII) vale só para choices;
  checar se a normalização de texto da resposta (case, espaços, Unicode) está
  definida com a mesma explicitude.
- Fill-in usa short-answer nos blanks: achados de short-answer podem afetar
  `docs/question-types/fill-in.md`.

## Pendências fora da auditoria

- Port para o mdq-js: acumulado em `dev/handoffs/mdq-js-port-pendente.md`,
  só depois de todos os tipos.
- `dev/issues/foreign-marker-message-drops-spaces.md` (mdq-py, mensagem de
  `foreign-choice-marker` mostra `[]` para `[ ]`).
- Backlog: "Choices with blocks" em `BACKLOG.md`.
- Info sem ação da auditoria de true-false: F13 (homóglifos, ex.: cirílico `Н`
  é FALSE e latino `H` é WARNING) e F23 (U+0958 e NFC).
