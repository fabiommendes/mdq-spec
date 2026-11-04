---
type: adr
status: accepted
tags: [short-answer, fill-in, grading, spec, mdq-py]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Short answer é accept-only, sem wildcard; unmatched e automation substituem openEnded

## Contexto

A questão short answer passou por três desenhos da lista de respostas e do
tratamento de uma resposta que não casa com nenhum pattern: campos `oneOf` e
`regex` separados, depois `accept` com o wildcard `*` e `openEnded`, depois
`accept`/`reject` com `unmatched`.

Evidência (todo o `mdq-py/CHANGELOG.md` está sob `[Unreleased]`):

- `mdq-py/CHANGELOG.md:263-268`: short answer e blanks perdem `oneOf` e
  `regex`; "`accept` is the only answer list"; documento com `oneOf` ou
  `regex` é `schema-error`.
- `mdq-py/CHANGELOG.md:281-282`: `ShortAnswerBlank` ganha `openEnded`; um
  `[^id/short-answer]:` sem pattern dá `openEnded: true`.
- `mdq-py/CHANGELOG.md:294-303`: `openEnded` é removido; toda questão ganha
  a propriedade derivada `automation` (`automatic`, `semi-automatic`,
  `manual`), nunca serializada; `ShortAnswerQuestion` e `FillInQuestion`
  ganham `unmatched`.
- `mdq-py/CHANGELOG.md:304-307`: `score_response` aplica accept, reject,
  `unmatched`; resposta não settled levanta `NotAutoGradable`.
- `mdq-py/CHANGELOG.md:309-313`: "The `*` wildcard is removed: `*` is a plain
  literal"; somem `accept-wildcard`, `unreachable-reject` e
  `short-answer-not-gradable`.
- `docs/question-types/short-answer.md:434-452` ("Grading"): três regras em
  ordem; `unmatched` default é `incorrect` com ao menos um `accept` e
  `manual` sem nenhum: "A question with no correct answer to compare with
  cannot mark a response as correct, so it leaves the responses to the
  instructor."
- `docs/question-types/short-answer.md:457-478` ("Automation"): tabela
  automation por `unmatched` e presença de patterns; `automation` MUST NOT
  aparecer no documento.
- `docs/question-types/question-base.md:472-494` ("Automation"): toda questão
  tem automation; é propriedade derivada.
- `CHANGELOG.md:64` (spec): o default de `unmatched` da ordering segue a regra
  da short answer.

## Opções

1. `oneOf` e `regex` como campos separados por tipo de pattern.
2. `accept` único, com `*` como wildcard para "qualquer resposta" e
   `openEnded` para blanks sem pattern.
3. `accept` e `reject` como listas de patterns, `*` literal, `unmatched`
   decide o resto, `automation` derivada e nunca serializada.

## Decisão

Opção 3. Um pattern é exact literal, inexact literal ou regex, e vai em
`accept` ou `reject`. Uma resposta sem match cai em `unmatched`
(`incorrect` ou `manual`). `automation` é calculada de `accept`, `reject` e
`unmatched`, oferecida como propriedade read-only, e é `schema-error` no
documento.

Razão registrada só para o default de `unmatched` (`short-answer.md:444-447`):
uma questão sem resposta correta não pode marcar uma resposta como correta.
Para a remoção de `oneOf`/`regex`, do wildcard `*` e de `openEnded`: Razão não
registrada.

## Consequências

- Nota automática da short answer é binária; crédito parcial é manual
  (`short-answer.md:428-432`).
- `reject` só dá feedback a respostas conhecidas como erradas; não muda o
  destino das outras (`short-answer.md:454-456`).
- Um `*` literal em GIFT/Moodle precisa de escape na exportação e o `*` a 100%
  do Moodle vira `/.*/` na importação (`mdq-py/CHANGELOG.md:314-318`).
- `no-correct-answer` avisa `unmatched: incorrect` sem `accept`.
- Ordering e fill-in reutilizam `unmatched` e a derivação de automation.
