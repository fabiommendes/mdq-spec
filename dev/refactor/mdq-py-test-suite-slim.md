---
type: plan
status: to-review
tags: [mdq, mdq-py, tests, corpus, coverage]
relatedTo: [mdq-py-restructure]
---

# Enxugar a suíte de testes da mdq-py

Objetivo: levar ao corpus (`examples/`) o que os testes unitários verificam e
apagar os testes unitários que repetem um caso que o corpus já cobre.

Método:

1. `r2 coverage collect` em `mdq-py/`.
2. Baseline = testes parametrizados por um arquivo de `examples/` (29 funções,
   6983 casos) + `tests/test_grading_examples.py`.
3. `r2 coverage redundant` com esse baseline lista os testes que não somam
   cobertura. Para cada um: se o corpus tem o caso, apagar; se não tem, levar
   o caso ao corpus e então apagar.

## Métricas

| Métrica                              | Antes (599c082) | Depois |
| ------------------------------------ | --------------- | ------ |
| Testes coletados                     | 12464           | 12328 |
| Passaram / pulados                   | 12164 / 300     | 11963 / 365 |
| Funções `def test_`                  | 1878            | 941 |
| Arquivos `tests/test_*.py`           | 105             | 94 |
| LOC `tests/test_*.py`                | 25940           | 14577 |
| LOC `tests/_*.py` + `strategies/`    | 1213            | 1213 |
| Casos parametrizados pelo corpus     | 6983            | 8894 |
| Arquivos em `examples/`              | 2189            | 2791 |
| Tempo `pytest tests`                 | 54 s            | 55 s |
| Cobertura de linhas (`--cov=mdq`)    | 7125 stmts, 168 miss | 7125 stmts, 172 miss |
| Cobertura de branches                | 2732 br, 129 parcial | 2732 br, 131 parcial |
| Cobertura total                      | 97%             | 97% |

## Resultado

- 1155 funções não somavam cobertura ao baseline; 948 foram apagadas, o resto
  ficou (texto de mensagem, contrato da API, CLI, Hypothesis, `render()`).
- 602 arquivos novos em `examples/` e 840 linhas novas em
  `examples/grading/*.yaml` e `examples/matching/*.yaml`.
- O tempo não caiu: cada exemplo novo roda em cerca de 15 testes
  parametrizados pelo corpus, e o tempo total vem desses testes e dos testes
  Hypothesis.
- A diferença de cobertura (168 → 172 linhas) é variação do Hypothesis. A única
  linha que o baseline cobria e deixou de cobrir, `mdq/_parser/_question.py:511`,
  só era atingida por entradas aleatórias de
  `test_convert_moodle_xml.py::test_numeric_round_trips_through_moodle_xml`.
- Bugs achados: `dev/issues/render-frontmatter-escapes-non-ascii.md` e
  `dev/issues/ordering-render-lone-deep-line.md`.
