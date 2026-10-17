---
type: spec
status: review
tags: [mdq, short-answer, fill-in, ordering, automation, unmatched, wildcard]
relatedTo: [dev/audit/plan.md, dev/audit/automation.html, docs/question-types/short-answer.md, docs/question-types/base.md]
---

# Automation: sai `openEnded` e o curinga, entram `unmatched` e `incorrectFeedback`

Origem: R2 (ida e volta de questão sem `accept`) e TX-S16 (regra só no
schema). Rascunhos em `dev/audit/automation.html`.

## Decisões do humano

- `openEnded` sai do documento. `automation` (`automatic` |
  `semi-automatic` | `manual`) é propriedade derivada dos modelos, nunca
  campo do JSON nem do frontmatter. Vale para todo tipo de questão.
- Short-answer ganha `unmatched: incorrect | manual` (mesmo campo de
  ordering). Default: `incorrect` com padrão em `accept`, `manual` sem.
  Fill-in recebe `unmatched` para todos os blanks short-answer.
- Curinga `*` removido; `*` é literal comum.
- `incorrectFeedback` (frontmatter de short-answer): feedback de resposta
  incorreta sem feedback de padrão. Só short-answer; ordering e numeric no
  backlog, com essay semi-automática.
- Lista `reject` vazia continua erro.

## Feito

- Spec: short-answer.md, base.md ("Automation"), fill-in.md, ordering.md,
  responses.md ("Pending"), patterns.md (sem "Wildcard"), lint-codes.md
  (`no-correct-answer`; saem `accept-wildcard`, `unreachable-reject`,
  `short-answer-not-gradable`), GLOSSARY ("Automation", "Pending response").
- Schema short-answer e fill-in; bundle.
- Corpus: ver CHANGELOG raiz.
- Skills, BACKLOG, CHANGELOG raiz.

## mdq-py (feito, 3 lotes)

- Modelos, correção, lints: `tests/test_automation.py`.
- Parser, render, `mdq show`: `tests/test_automation_parser.py`.
- Conversores: `tests/test_convert_automation.py`. Export de questão não
  automática dá `ValueError`; `incorrectFeedback` vira a resposta `*` com
  fração 0 no Moodle XML; GIFT ignora.
- Suíte: 5091 passam, só a falha conhecida de ordering.

## Pendente

- Port para mdq-js.
- Export de blank de fill-in (GIFT e cloze) ainda usa a regra antiga: blank
  sem `accept` dá o erro antigo e `unmatched: manual` não é recusado.
- Moodle XML: `accept: ["*"]` literal exporta como `*`, que o Moodle lê como
  "qualquer coisa" e volta como `/.*/`. Perda silenciosa, caso raro.
- Importação Moodle de shortanswer só com `*` fração 0 dá questão sem
  `accept` (manual). Decidir: erro ou aceitar.
- Issues laterais: `dev/issues/numeric-blank-tolerance-render.md`,
  `dev/issues/converters-drop-reject.md`.
