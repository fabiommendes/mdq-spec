---
type: adr
status: accepted
tags: [spec, parser, markdown]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# MDQ segue CommonMark onde há escolha; markdown-it só para a estrutura de blocos

## Contexto

MDQ é uma camada sobre Markdown. Em vários pontos a gramática do formato toca
regras do CommonMark: linhas lazy, indentação de marcadores, blocos `>` e `!`,
tags `[short-answer]: ...` que têm a forma de uma link reference definition.
Cada ponto exigia decidir se MDQ inventa a própria regra ou segue a do
CommonMark, e se o parser confia na árvore do markdown-it ou relê as linhas.

Evidência:

- `docs/references/grammar.md:11-14`: o dialeto é CommonMark mais três
  extensões GFM (tabelas, strikethrough, autolinks). Nenhuma outra.
- `docs/references/grammar.md:202-206`: "The normative rule for a lazy line is
  the paragraph continuation of CommonMark. `LAZY_START` is an approximation
  [...] Where the two disagree, the rule of CommonMark wins."
- `docs/references/grammar.md:89` e `:241`: indentação de marcador e linhas
  lazy "as in CommonMark".
- `docs/question-types/question-base.md:468-469`: heading indentado dentro de
  item de lista pertence ao item, "as in CommonMark".
- Commit `8c5f35f` (2026-10-13): "Define feedback and comment lines once,
  following CommonMark": blocos `>` e `!` seguem as regras de block quote.
- `mdq-py/mdq/_parser/_question.py:11-28`: usa markdown-it-py só para a
  estrutura de blocos ("exactly the kind of thing not worth reimplementing");
  para a sintaxe própria do MDQ relê as linhas do `node.map`, porque a
  lazy continuation do CommonMark absorve linhas `!` dentro do blockquote `>`
  e "throws away exactly the split we need".
- `mdq-py/mdq/_markdown.py:93-98` e `mdq-js/src/markdown.ts:24-30`: a regra
  `reference` é desabilitada porque as tags do MDQ são indistinguíveis de
  link reference definitions, que o markdown-it consome em silêncio.

## Opções

1. Regras próprias do MDQ onde a gramática toca o CommonMark, com o terminal
   Lark como norma.
2. CommonMark é a norma onde há escolha; o terminal Lark é aproximação. O
   parser usa markdown-it para blocos e relê as linhas para a sintaxe do MDQ.

## Decisão

Opção 2. Onde o terminal Lark e o CommonMark divergem, o CommonMark vence
(`grammar.md:206`). O parser confia no markdown-it só para a estrutura de
blocos (`node.map`) e relê o fonte para marcadores, linhas de feedback e
comentário e tags. A regra `reference` fica desabilitada nas duas
implementações.

Razões registradas: reimplementar a estrutura de blocos do CommonMark não
vale o esforço; a lazy continuation destrói a divisão `>`/`!` que o MDQ
precisa; a regra `reference` engole as tags do MDQ sem emitir token.

## Consequências

- Autor que conhece CommonMark não precisa aprender exceções do MDQ.
- Os terminais Lark de `grammar.md` são aproximações; o audit não pode
  tratá-los como a definição final de uma linha lazy.
- Toda sintaxe própria do MDQ é reconhecida por releitura das linhas, não pela
  árvore do markdown-it. Um porte precisa repetir essa releitura e o mesmo
  conjunto de regras ativas (`mdq-js/src/markdown.ts:9-22`).
- O parser depende de `node.map` do markdown-it; trocar o parser de Markdown
  exige a mesma informação de intervalo de linhas.
