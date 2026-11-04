---
type: adr
status: accepted
tags: [ids, parser, models, mdq-py, spec]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Ids derivados nos modelos (with_ids); o parser guarda só os ids explícitos

## Contexto

Uma resposta precisa apontar para uma questão e uma alternativa, mas o autor
não é obrigado a escrever `id` em cada uma. Alguém tem de derivar os ids que
faltam, e era preciso decidir se isso acontece no parse, nos modelos ou no
host.

Evidência:

- `docs/exam.md:300-305` ("Question ids"): uma questão sem `id` "keeps none
  as parsed -- these ids are only derived when a consumer needs an addressable
  exam (grading, say)": `q1`, `q2`, pela posição após a resolução dos includes.
- `docs/references/choices.md:194-200`: a implementação MAY derivar ids a
  partir do texto "when it needs an addressable document; but it is not part
  of the parse step itself".
- `docs/references/choices.md:202-208`: "Derived ids are NOT portable. The
  spec gives no algorithm"; o host SHOULD gravar os ids derivados no documento
  antes de coletar respostas.
- `docs/public-form.md:390-392`: o host SHOULD gravar os ids derivados antes de
  apresentar, porque mudam entre implementações e versões.
- `mdq-py/mdq/_parser/_exam.py:487-489`: "A block with no explicit `id` gets
  none here -- the implicit, position-based id [...] is `Exam.with_ids()`'s
  job, not the parser's."
- `mdq-py/mdq/_parser/_choices.py:398-399`: o parser emite `id` só quando
  `explicit_id` existe.
- `mdq-py/mdq/models/_base.py:640-650`: `BaseQuestion.with_ids()` devolve uma
  cópia com id derivado para cada alternativa sem id; nunca altera `self`,
  nunca toca um id escrito, é idempotente.
- `mdq-py/mdq/models/_slugify.py:1-25`: slugs únicos a partir do texto, em
  ordem crescente de agressividade, processados em ordem ordenada para
  depender só do conteúdo.
- `mdq-py/CHANGELOG.md:240`: "Derived ids for questions and choices
  (`with_ids()`)".
- `mdq-py/tests/_corpus.py:19-23`: `.ids.yaml` do corpus fixa os ids após
  `with_ids()` para `.mdq.md` e `.yaml` do mesmo nome.

## Opções

1. O parser deriva os ids que faltam e o documento parseado já é addressable.
2. O parser guarda só os ids explícitos; os modelos derivam sob demanda com
   `with_ids()`, e o host grava o resultado antes de coletar respostas.

## Decisão

Opção 2. O parse preserva o documento como escrito. `Question.with_ids()` e
`Exam.with_ids()` devolvem cópias addressable: slug do texto para
alternativas, `q<posição>` para questões de uma prova resolvida. A spec não
fixa o algoritmo.

Razões registradas: ids derivados não são portáveis entre implementações e
versões, então o documento gravado é a fonte, não o algoritmo
(`choices.md:202-208`, `public-form.md:390-392`); o id de posição só existe
depois que os includes resolvem (`exam.md:300-316`).

## Consequências

- Serialização de parse round-tripa sem ids inventados.
- `public()` e `presentation()` exigem `with_ids()` antes
  (`MissingIdError`, `mdq-py/CHANGELOG.md:21`).
- O id derivado de uma questão inline após um `includeAll` não é estável; a
  spec recomenda declarar `id` (`exam.md:314-316`).
- `.ids.yaml` no corpus fixa o algoritmo da mdq-py como contrato de fato para
  a mdq-js, embora a spec não o exija.
