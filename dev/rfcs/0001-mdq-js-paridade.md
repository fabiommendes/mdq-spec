---
type: rfc
status: accepted
tags: [mdq-js, port, sync, arquitetura, testes]
relatedTo: [mdq-js/docs/sync/README.md, mdq-js/docs/sync/roadmap.md, mdq-js/docs/sync/schemas.md, mdq-js/docs/sync/testing.md, dev/handoffs/mdq-js-port-pendente.md, dev/handoffs/mdq-js-corpus-slim.md]
---

# RFC 0001: paridade da mdq-js com a mdq-py

## Contexto

- A mdq-js parou na fase F4.1 (parser, exames, `resolveExam`). Depois disso a
  mdq-py passou por cinco auditorias de tipo, duas auditorias completas do
  spec e o enxugamento da suíte de testes.
- `pnpm vitest run` (2026-10-27): 353 falhas em 4140 testes. 153 em
  `tests/parser.spec.ts`, 115 em `tests/invalid-sources.spec.ts`, 85 em
  `tests/schema.spec.ts`. Duas suítes nem carregam:
  `tests/exam-resolution.spec.ts` (`MissingFieldError: body`, um exemplo do
  banco usa sintaxe nova) e `tests/schema-agreement.spec.ts` (`$defs` novo
  sem `enum`).
- A lista do que falta está espalhada em três lugares que já divergem:
  `dev/handoffs/mdq-js-port-pendente.md` (917 linhas, com itens que se
  substituem, ex. M1-M6 por N1-N5), `dev/handoffs/mdq-js-corpus-slim.md` e a
  seção "Reference changes waiting for a phase" de
  `mdq-js/docs/sync/roadmap.md`.
- A mdq-js não lê três tipos de corpus que a mdq-py já usa:
  `examples/grading/*.yaml`, `examples/matching/*.yaml` e os
  `examples/valid/**/*.lint.json`.

## Objetivo

A mdq-js passa em todo o corpus, sem entradas em `tests/not-ported.ts`, para
as camadas: parse, validação (schema e regras de modelo), `load` com
diagnósticos, lint, casamento de padrões, pontuação, pré-validação e
resolução de exames.

Fora de escopo:

- CLI, conversores (Moodle XML, GIFT, Aiken), `show`, `scaffold`, `render()`
  e `frontmatter()`. Já eram divergências declaradas.
- O banco de questões em arquivo (`FileLoader`).
- Componentes SolidJS (F8). Ficam para um RFC próprio, depois da paridade.
- Estratégias Hypothesis públicas (`mdq.hypothesis`). Os arbitrários
  fast-check continuam só em `tests/`.

## Princípios

1. **Arquitetura paralela.** Um módulo TS por módulo Python, com o mesmo
   nome sem `_` e em kebab-case. Um tipo TS por tipo Python. Divergência só
   com motivo escrito no cabeçalho do módulo.
2. **Corpus primeiro.** Um fato do formato é um arquivo em `examples/`, não
   um teste unitário. Teste unitário TS só para API TS (assinaturas,
   erros lançados, dialeto do runtime) e para propriedades fast-check.
3. **Python decide.** Divergência se resolve rodando o caso na mdq-py.
4. **Objetos simples.** Sem classes de modelo. Métodos Python viram funções
   que despacham pelo campo `type`.

## Mapa de módulos

| Python                     | TypeScript hoje        | TypeScript proposto         |
| -------------------------- | ---------------------- | --------------------------- |
| `mdq/__init__.py`          | `index.ts`             | `index.ts`                  |
| `_loading.py`              | (falta)                | `loading.ts`                |
| `_diagnostics.py`          | `diagnostics.ts`       | `diagnostics.ts`            |
| `errors.py`                | `errors.ts`            | `errors.ts`                 |
| `types.py`                 | `schema/*`, `responses.ts` | `schema/*`, `responses.ts` |
| `_markdown.py`             | `parser/markdown.ts`   | `markdown.ts`               |
| `_letters.py`              | dentro de `parser/choices.ts` | `letters.ts`         |
| `_exact.py`                | (falta)                | `exact.ts`                  |
| `_include_keys.py`         | (falta)                | `include-keys.ts`           |
| `_schedule.py`             | `schedule.ts`          | `schedule.ts`               |
| `_banks.py`                | `banks.ts`             | `banks.ts`                  |
| `_parser/_question.py` ... | `parser/*`             | `parser/*` + `parser/spaces.ts` |
| `models/_base.py`          | (falta)                | `models/base.ts`            |
| `models/_choice.py`        | (falta)                | `models/choice.ts`          |
| `models/_numeric.py`       | (falta)                | `models/numeric.ts`         |
| `models/_text.py`          | (falta)                | `models/text.ts`            |
| `models/_fill_in.py`       | (falta)                | `models/fill-in.ts`         |
| `models/_ordering.py`      | (falta)                | `models/ordering.ts`        |
| `models/_exam.py`          | parte em `banks.ts`    | `models/exam.ts`            |
| `models/_lint.py`, `_lint_codes.py` | (falta)       | `models/lint.ts`, `models/lint-codes.ts` |
| `models/_regex.py`         | (falta)                | `models/regex.ts`           |
| `models/_query.py`         | `query.ts`             | `models/query.ts`           |
| `models/_slugify.py`       | `slugify.ts`           | `models/slugify.ts`         |
| `models/_score.py`         | (falta)                | `models/score.ts`           |
| `models/_render.py`, `convert/`, `cli/`, `hypothesis/` | - | fora de escopo |

`schema/` continua sendo o espelho Zod de `schema/*.yaml` e substitui
`mdq.types` e a parte de forma de `mdq.models`. `parser/text.ts` e
`parser/tree.ts` ficam: são o equivalente dos helpers que a mdq-py pega do
markdown-it-py.

## API pública

`index.ts` exporta o equivalente de `mdq/__init__.py` mais as funções que
substituem os métodos dos modelos:

| Python                                   | TypeScript                                 |
| ---------------------------------------- | ------------------------------------------ |
| `load(src, format=, kind=)` -> `Loaded`  | `load(src, {format, kind})` -> `{document, diagnostics}` |
| `parse(src, ...)`                        | `parse(src, ...)`                          |
| `Loaded.validate(raise_on=)`             | `assertValid(loaded, raiseOn?)`            |
| `Question.lint()`, `Exam.lint()`         | `lint(document)`                           |
| `Question.score_response(r)`             | `scoreResponse(question, response)`        |
| `ShortAnswerQuestion.prevalidate(r)`     | `prevalidate(question, response)`          |
| `Question.normalize()`                   | `normalize(question)`                      |
| `Question.with_ids()`, `Exam.with_ids()` | `withIds(document)`                        |
| `Question.automation`                    | `automation(question)`                     |
| `Exam.resolve(bank)`                     | `resolveExam(exam, bank)` (existe)         |
| `Exam.grading_for/shuffle_for/resolve_question` | `gradingFor`, `shuffleFor`, `resolveQuestion` |
| `Exam.score_responses(r)`                | `scoreResponses(exam, responses)`          |
| `QuestionScore`, `ExamScore`             | tipos `QuestionScore`, `ExamScore`         |

Respostas seguem `docs/responses.md`: JSON puro. `responses.ts` hoje usa
`Set` e `Map`, o que contradiz a decisão 3 do roadmap; muda para arrays e
objetos.

## Decisões

Aceitas em 2026-10-27: D1 (b), D2 (b), D3, D4, D5.

- **D1. Onde ficam as regras de modelo.** O roadmap (decisão 5) diz
  "refinamentos Zod". Proposta: trocar por funções em `models/<família>.ts`
  (`check<Família>(doc): Diagnostic[]`), chamadas por `validateDocument` e
  `load` depois do Zod. Motivos: o validador, o lint e a pontuação de cada
  família ficam no mesmo arquivo, como em `models/_choice.py`; `schema/`
  continua um espelho mecânico do JSON Schema, checado pelo teste de
  concordância. Custo: uma regra de modelo só roda se o schema aceitou. O
  corpus inválido tem uma violação por exemplo, então isso não muda
  resultado; um caso que mude vira exemplo.
- **D2. Testes unitários TS.** Os `tests/parser-*.spec.ts` e
  `tests/whitespace.spec.ts` têm cerca de 7.000 linhas, de antes do
  enxugamento da mdq-py. Proposta: em cada fase, teste unitário que quebra
  por mudança de comportamento vai para o corpus ou é apagado, nunca
  corrigido no lugar. Na última fase, enxugamento por cobertura, como em
  `dev/refactor/mdq-py-test-suite-slim.md`.
- **D3. Testes Python que são fatos do formato.** Antes de cada fase, os
  testes da mdq-py da área que ainda não estão no corpus vão para
  `examples/` (ex.: `test_ordering_scoring.py`, `test_inherited_grading.py`,
  `test_exam_score.py`, `test_numeric_representation.py`). Isso muda
  `mdq-py/tests/` e `examples/`, com commits separados no root e no subtree.
- **D4. Versão de referência.** O port mira um commit fixo da mdq-py. A
  mdq-py continua mudando em paralelo (há mudanças não commitadas em
  `mdq-py/mdq/_loading.py` e `errors.py` agora). Mudanças posteriores entram
  numa lista de pendências do plano, nunca no meio de uma fase. A base é o
  estado final do trabalho em curso na mdq-py, combinado com a sessão dela.
- **D5. Uma lista de pendências.** O plano em `dev/plan/` absorve
  `dev/handoffs/mdq-js-port-pendente.md`, `dev/handoffs/mdq-js-corpus-slim.md`
  e a seção "Reference changes waiting for a phase" do roadmap, já
  deduplicados (só a regra final de cada item). Os dois handoffs são
  apagados. `mdq-js/docs/handoffs/` deixa de receber notas novas: o plano
  registra o que cada fase entregou.

## Testes

Suítes de corpus que a mdq-js precisa ter, cada uma com seu manifesto em
`tests/not-ported.ts`:

| Corpus                                   | Suíte TS                       | Equivalente Python              |
| ---------------------------------------- | ------------------------------ | ------------------------------- |
| `valid/**/*.mdq.md` + `.yaml`            | `parser.spec.ts` (existe)      | `test_example_pairs.py`         |
| `valid/`, `invalid/`, `model-only/`      | `schema.spec.ts` (existe)      | `test_schemas.py`               |
| `invalid/**/*.mdq.md` + `.lint.json`     | `invalid-sources.spec.ts` (existe) | `test_invalid_sources.py`   |
| `invalid/syntax/`                        | `loading.spec.ts` (nova)       | `test_loading.py`               |
| `valid/**/*.lint.json`                   | `lint.spec.ts` (nova)          | `test_lint_corpus.py`           |
| `exam/*.resolved.yaml`                   | `exam-resolution.spec.ts` (existe) | `test_exam_resolution_corpus.py` |
| `matching/{exact,inexact,regex}.yaml`    | `matching.spec.ts` (nova)      | `test_exact_comparison.py`, `test_inexact_comparison.py`, `test_regex_table.py` |
| `grading/*.yaml`                         | `grading.spec.ts` (nova)       | `test_grading_examples.py`      |

`docs/lint-codes.md` também vira teste: todo código listado tem
implementação na mdq-js (equivalente de `test_lint_codes_consistency.py`).

## Mudanças nos docs de sync

Partes desatualizadas que o RFC corrige:

- `README.md`: tabela de documentos (`parsing.md`, `rendering.md` "not
  written"; `rendering.md` sai, `render` está fora de escopo); "Python and
  MDQ implementations" no primeiro parágrafo.
- `roadmap.md`: decisão 5 (D1); fases F5-F8 trocadas por um link para o
  plano; seção "Reference changes waiting for a phase" vai para o plano
  (D5); seção "Known gaps in the reference" está quase toda resolvida
  (`examples/grading/` é lido, `ExamScore` existe, `{value, unit}` existe,
  `model-only/` tem `.lint.json`); só sobra `empty-include-all` sem exemplo.
  Decisão 4 diz "mesmo preset (`gfm-like`)"; o TS usa `"default"` com as
  opções do `gfm-like` copiadas. Trocar o texto para "mesmas opções".
- `schemas.md`: "Methods and functions" usa nomes Python (`mdq:normalize()`,
  `mdq/score_response`); passa a apontar para a tabela de API deste RFC.
  "Module structure" ganha `models/`.
- `testing.md`: "three levels" com cinco itens; faltam as suítes de
  `matching/`, `grading/` e `syntax/`; a nota de F6 sobre `.lint.json`.
- Novo `modules.md`: o mapa de módulos e a tabela de API acima, mantidos
  como referência viva.

## Fases (esboço; o plano detalha)

| Fase | Escopo |
| ---- | ------ |
| P0 | Referência fixa (D4); suítes carregam; manifesto regenerado, suíte verde com falhas esperadas; mover `query`, `slugify`, `markdown`, `letters` para o lugar do mapa; `responses.ts` em JSON puro |
| P1 | Suítes novas de corpus (`lint`, `matching`, `grading`, `loading`), todas com manifesto cheio |
| P2 | Parser: os 153 pares e os códigos do parser em `invalid/` (tags SP1-SP5, frontmatter pelo bundle, ordering, fill-in, essay, numeric com expoente, `parser/spaces.ts`) |
| P3 | Casamento: `exact.ts`, normalização inexata, `models/regex.ts` (tradução para JS com `u`), vetores de `matching/` |
| P4 | Regras de modelo e `load()`: `models/*.ts`, caminhos sem tag de união, mensagens de `type` ausente, erros de sintaxe YAML/JSON |
| P5 | Lint: `models/lint.ts`, todos os `.lint.json` |
| P6 | Pontuação: `scoreResponse` por tipo, aritmética exata com `fraction.js`, pré-validação, `scoreResponses` do exame, `gradingFor`/`shuffleFor`/`resolveQuestion` |
| P7 | `normalize`, `withIds`, `automation`; enxugamento por cobertura (D2); docs de sync finais; `CHANGELOG.md` |

Cada fase começa pela migração D3 da sua área e termina com o manifesto da
fase vazio.

## Riscos

- A mdq-py muda durante o port (D4).
- Unicode do motor JS pode divergir do Python em letras novas (já permitido
  pelo spec, L2). Regex: `\w` sob `iu` casa `ſ` e U+212A no JS; a tradução
  precisa cobrir isso (Q10, S2-2).
- Exatidão numérica: `fraction.js` com expoentes grandes. O limite de
  expoente de 3 dígitos (N16) evita a explosão.
- O `.lint.json` é comparado como multiconjunto (ordem livre), mas fixa a
  lista inteira: um diagnóstico a mais ou a menos falha.
