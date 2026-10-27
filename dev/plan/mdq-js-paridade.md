---
type: plan
status: active
tags: [mdq-js, port, sync, corpus, testes]
relatedTo: [dev/rfcs/0001-mdq-js-paridade.md, mdq-js/docs/sync/modules.md, mdq-js/docs/sync/testing.md, mdq-js/docs/sync/roadmap.md]
---

# Plano: paridade da mdq-js com a mdq-py

Implementa o RFC `dev/rfcs/0001-mdq-js-paridade.md`. Este arquivo é a única
lista do que falta portar. Substitui `dev/handoffs/mdq-js-port-pendente.md`,
`dev/handoffs/mdq-js-corpus-slim.md` e a seção "Reference changes waiting for
a phase" de `mdq-js/docs/sync/roadmap.md` (apagados na fase P0; o git guarda
o texto original).

## Referência

- Commit da mdq-py: `2c281d9` (fim da refatoração J3b/J7).
- `_parser/` final: `_blocks`, `_choices`, `_exam`, `_fill_in`,
  `_frontmatter`, `_numeric`, `_ordering` (com o corpo do ordering),
  `_question` (MDQParser, corpos de essay e numeric), `_short_answer`,
  `_spaces`, `_tags`. `parser/question.ts` segue essa divisão na P2.
- `models/`: `_lint` só tem as regras comuns; as regras de lint de cada
  família estão no arquivo da família. Códigos: `ModelErrorCode`
  (`models/_base.py`), `LintCode`/`SEVERITY` (`models/_lint_codes.py`).
- Mudança de comportamento junto com a referência (`bc33879`):
  `score_response()` lança `ResponseError` para resposta com formato errado
  (int para fill-in, ordering, V/F ou MS; lista ou string para V/F ou
  fill-in). Em V/F e fill-in, ids desconhecidos são checados antes de "não é
  mapa". Vale para a P6.
- Partida (2026-10-27): 353 falhas em 4140 testes; `exam-resolution.spec.ts`
  e `schema-agreement.spec.ts` não carregam.

## Regras de execução

- Uma fase por vez. Uma fase termina com o manifesto dela vazio em
  `mdq-js/tests/not-ported.ts` e com `pnpm test`, `pnpm typecheck` e
  `pnpm lint` verdes.
- O corpus é a especificação. As notas de cada fase abaixo só cobrem o que o
  corpus não expressa: mensagens, armadilhas do runtime JS, API.
- Teste unitário TS que quebra por mudança de formato: o caso vai para o
  corpus ou o teste é apagado (RFC, D2).
- Commits: `mdq-js/` num commit, `dev/` em outro, `examples/` e
  `mdq-py/tests/` (fase M) em commits próprios.
- Mudança da mdq-py depois da referência: entra em "Pendências depois da
  referência" no fim deste arquivo, e é portada numa fase própria.

## Fases

### P0. Base

Não depende do commit de referência.

- [x] `schema-agreement.spec.ts` carrega e ignora os `$defs` `frontmatter-*`.
- [x] `exam-resolution.spec.ts` carrega: o erro de um exemplo vira falha de
  um teste, não da suíte.
- [x] Regenerar `tests/not-ported.ts` a partir das falhas atuais. Cada
  entrada com o motivo e a fase (P2...P7). Suíte verde. `LOAD_CODES` (por
  código) saiu: `LOAD` lista cada arquivo com os códigos esperados.
- [x] Mover para o lugar do mapa: `query.ts` e `slugify.ts` para `models/`,
  `parser/markdown.ts` para `markdown.ts`. Só mover, sem mudar código.
  (`letters.ts` nasce na P2, como port de `_letters.py`: as letras de
  `parser/choices.ts` são a regra antiga.)
- [x] Zod igual ao JSON Schema: `schema-agreement.spec.ts` e as partes
  `valid`/`invalid` de `schema.spec.ts` verdes (`model-only` fica para P4).
- [x] `responses.ts` em JSON puro (arrays e objetos, sem `Set`/`Map`); tirar
  a referência morta ao ADR.
- [x] `roadmap.md`: trocar a tabela de fases F5-F8 por um link para este
  plano; apagar "Reference changes waiting for a phase" e "Known gaps in the
  reference". Apagar os dois handoffs de `dev/handoffs/`.

### P1. Suítes de corpus novas

- [x] `tests/loading.spec.ts` (`invalid/syntax/`).
- [x] `tests/lint.spec.ts` (todos os `valid/**/*.lint.json`, multiconjunto;
  o lado `.yaml` ignora `PARSER_ONLY_CODES`).
- [x] `tests/matching.spec.ts` (`examples/matching/*.yaml`).
- [x] A suíte de resolução confere o `lint` dos `.resolved.yaml` (é ali
  que está `empty-include-all`).
- [x] `tests/ids.spec.ts` (`valid/**/*.ids.yaml`, `withIds`).
- [x] `tests/normalize.spec.ts` (`examples/normalize.yaml`; com
  `normalize: true`, compara o resultado de `normalize`, que é da P7).
- [x] `tests/matching.spec.ts` também lê `matching/query.yaml`; a suíte de
  resolução lê `fields` e `lint` dos `.resolved.yaml`.
- [x] `tests/grading.spec.ts` (`examples/grading/*.yaml`, incluindo
  `short-answer-prevalidation.yaml`; `"malformed"` = `ResponseError`,
  `"pending"` = `NotAutoGradable`; `feedback` só é checado quando a chave
  existe; YAML `.inf`/`.nan`; `exam.yaml`, `automation.yaml`, `essay.yaml`
  e `blank:` na pré-validação).
- [x] Teste de consistência: todo código de `docs/lint-codes.md` existe em
  `models/lint-codes.ts` com a mesma severidade.
- [x] Cada suíte nova começa com o manifesto cheio.

### M. Migração dos testes da mdq-py para o corpus

Feita em 2026-10-27, sobre `2c281d9`, com a sessão `mdq` parada.
Classificação dos testes: `/tmp/mdq-migration/classification.md`
(temporário).

| Métrica                         | Antes (`2c281d9`) | Depois |
| ------------------------------- | ----------------- | ------ |
| `pytest`: passam / pulados      | 11947 / 365       | 11959 / 463 |
| Arquivos `tests/test_*.py`      | 94                | 83     |
| Funções `def test_`             | 931               | 778    |
| LOC `tests/test_*.py`           | 14487             | 12442  |
| Arquivos em `examples/`         | 2799              | 3194   |

- Tipos novos de corpus: `grading/exam.yaml`, `grading/automation.yaml`,
  `grading/essay.yaml`, `<nome>.ids.yaml`, `normalize.yaml`,
  `matching/query.yaml`; `fields`/`lint` no `.resolved.yaml`; `feedback`
  em MC/MS/TF; `blank:` na pré-validação.
- Ficaram em Python: mensagens e dicas, API (tipos, exceções, pureza,
  `render`, `frontmatter`), propriedades Hypothesis, tempo de execução e o
  número de linha dos diagnósticos (o `.lint.json` não tem `line`).
- `setext-heading` do epílogo e do stem ficou em Python: o aviso só sai do
  Markdown e o `.lint.json` é compartilhado com o `.yaml` irmão.
- `test_lint_codes_consistency.py` aceita os códigos da lista "Load errors"
  de `docs/lint-codes.md` (`schema-error` de regra de padrão que o JSON
  Schema não expressa).

### P2. Parser

Feita em 2026-10-27 (`363096f`, `5de27b8`, `25734b4`), conferida contra a
mdq-py `5db0257`; o pacote G (`7c5c726`) só mudou o comentário de ordering, portado em `40a9672`.

Fechar `parser.spec.ts` e os códigos do parser em `invalid-sources.spec.ts`.
Dividir `parser/question.ts` como o `_parser/` final da mdq-py.

Notas:

- `tests/parser.spec.ts`: a propriedade "every parse satisfies
  validateQuestion" está como `it.fails` até o parser e
  `tests/arbitraries.ts` pararem de escrever `preamble`.
- `PARSER_CODES` de `tests/invalid-sources.spec.ts` está desatualizado
  (`conflicting-accept` não existe mais; faltam `invalid-frontmatter-field`,
  `detached-tag`, ...).
- O Zod não tem mais `min(1)` onde o YAML não tem `minLength`: texto vazio
  passa no schema e as regras `blank-text` do modelo (P4) o rejeitam.
- Frontmatter: validar as chaves com `$defs/frontmatter-<tipo>` e
  `frontmatter-exam` do bundle (só as chaves de `properties`; os valores
  seguem para o schema). Chave fora: `invalid-frontmatter-field`, um por
  chave, `path` = `[chave]` (ou `questions, i, chave` no exame), e `load`
  não devolve documento. A mensagem diz quando a chave é campo do corpo e
  mostra a sintaxe (`_BODY_SYNTAX`). `unknown-frontmatter-key` e
  `ConflictingAnswerKeyError` deixam de existir. Atalhos:
  `FRONTMATTER_SHORTHANDS` de `scripts/schema_bundle.py` (`preAccept`,
  `preReject`, `incorrectFeedback`, `domain`, `decimalPlaces` do fill-in).
- `preamble` sai do formato; o stem é a junção de todos os blocos antes do
  corpo. Essay: `input` vira `content`.
- Comentário do frontmatter: trim; vazio não é guardado. `redundant-id`
  (warning, `["id"]`) com `id` no frontmatter e slug `[Q1]`.
- Marcadores: valor normalizado = NFKC e depois minúscula só em `A-Z`
  (`replace(/[A-Z]/g, ...)`, nunca `toLowerCase`). `LETTER` =
  `/^[\p{Lu}\p{Ll}\p{Lt}\p{Lo}]$/u`, medido no texto escrito, contando code
  points. `[050%]` é `foreign-choice-marker`. Conjuntos TRUE/FALSE e tabela
  de locale: `mdq-py/mdq/_letters.py`.
- Tags: só minúsculas; com `:` exigem conteúdo, sem `:` não aceitam;
  `detached-tag` em todos os tipos; lista colada a lista de conteúdo é
  `parse-error`; literal exato malformado no corpo é `parse-error`.
  Ordering usa `[ordering]:`.
- Linhas: `>`/`!` com 4+ colunas continuam o conteúdo; sublinhado setext
  depois do conteúdo é `parse-error`; linha só com `>` ou `!` vira `\n\n`.
  `rawText` mantém as quebras duras (dois espaços ou `\` antes do fim de
  linha) byte a byte; só a quebra suave vira espaço.
- `[^x]` em código é texto; em heading, item, célula, citação, ênfase, link
  ou alt é `misplaced-blank`; `[^x](url)` e `[^x][ref]` são links; dentro de
  autolink é literal.
- Numeric: unidade da tag é texto-fonte. Expoente
  `/[eE][+-]?[0-9]{1,3}/`; checar a faixa do double antes de qualquer
  aritmética (`Number.isFinite`, mantissa não nula que dá 0). Valor com
  expoente vira número só se `parseFloat` volta aos mesmos dígitos e a
  mantissa não termina em zero depois do ponto. Casas: `max(0, d - e)`.
- Ordering: nível de `ul` = profundidade do item na árvore (não coluna);
  `- - Bahia` é `[1, "Bahia"]`; espaços no fim saem; tab vai ao múltiplo de
  4; epílogo antes da primeira seção; linguagem da cerca = primeira palavra
  do info string; seção usa a linguagem do `[ordering]` ou nenhuma.
- Exame: separador `===` estrito com `malformed-separator`; `comment` e
  `missing-title`; `setext-heading` com o path da seção.
- `letters.ts` (`_letters.py`) substitui as letras de `parser/choices.ts`.
- `parser/spaces.ts` (`_parser/_spaces.py`): `non-ascii-whitespace` roda
  antes do parse e fica quando o parse falha; as linhas de
  `[short-answer]:` são posição de sintaxe.
- Mensagens seguem o texto da mdq-py. O corpus só confere código e path,
  mas `tests/parser-exam.spec.ts` compara o texto antigo do erro de `---`
  (agora "a question's epilogue or section cannot use '---' ...").

### P3. Casamento de padrões

Feita em 2026-10-27 (`9e5d54f`). `scoreResponse` já pontua short-answer e
fill-in só com blanks short-answer; o resto da pontuação é da P6.

`exact.ts`, normalização inexata (`src/inexact-tables.json`) e
`models/regex.ts`. Fecha `matching.spec.ts`.

Notas:

- Literal exato = code span do CommonMark (N crases abrem, a primeira
  sequência de exatamente N fecha e termina o padrão; um espaço sai de cada
  ponta quando as duas têm espaço).
- Comparação: NFKC, case folding e remoção de acentos como a mdq-py.
  `toLowerCase` não é case folding.
- Regex: a última `/` separa corpo e flags, depois de tirar espaço e tab das
  pontas; nunca usar o parser de literal `RegExp`. Compilar sempre com `u`.
  Allow-list de construções de `docs/references/patterns.md`; fora dela,
  `invalid-regex`. `\d` = `[0-9]`, `\w` = `[A-Za-z0-9_]`, `\s` =
  `UNICODE_SPACE` (o `\s` do JS casa U+FEFF); `\b` segue o `\w` explícito;
  as classes abreviadas dobram sob `i`. `\uHHHH` em D800-DFFF é inválido.
  Classe abreviada como ponta de intervalo é inválida.
- Sujeito da regex: NFC e trim de `UNICODE_SPACE` antes; flag `n` depois
  (tira `Mn` pela tabela `nonspacing`, da resposta e dos literais do corpo,
  nunca dos escapes).
- Padrão sem caractere visível é `blank-text`; `has_visible_character` e
  `starts_block` vêm de `mdq-py/mdq/_markdown.py`.

### P4. Regras de modelo e `load`

P4a feita em 2026-10-27 (`4b4f01b`): `load`, regras comuns e do exame, D06.
P4b feita (`d7bea86`): regras por família; `MODEL_RULES` e `LOAD` vazios.
Abertos: chave composta de YAML (agente do YAML 1.2), `blank-text` junto com
erro de schema (`essay-blank-stem-and-unknown-field`), e `answer: " 1"`, que
a mdq-py aceita (strip) e o JSON Schema recusa (levado à sessão `mdq`).

`models/<família>.ts` com os validadores, `loading.ts` com `load`/`parse`,
`assertValid`. Fecha `model-only/`, `LOAD_CODES`, `loading.spec.ts` e o
resto de `invalid-sources.spec.ts`.

Notas:

- Issue genérica do Zod é `schema-error`; regra nomeada mantém seu código
  (`docs/lint-codes.md`, "Load errors").
- Paths: sem tag de união (`questions.0.stem`, não
  `questions.0.question.essay.stem`); param num atalho escrito como string
  (`["accept", 0]`, nunca `["accept", 0, "pattern"]`); um diagnóstico por
  `(code, path)`.
- `null` em campo opcional é ausente, também aninhado; `meta` guarda os
  nulls.
- Sem `type`: "a question needs a `type`"; entrada de exame sem `type` nem
  include: "an entry of `questions` needs a `type`, or an `include` or
  `includeAll` key", mais a dica de `include-all` (`_include_keys.py`).
  Nunca vazar a mensagem do discriminador do Zod.
- YAML usa o carregador do frontmatter (YAML 1.1 sem base 60). JSON com
  chave repetida é `json-syntax-error`: `JSON.parse` fica com o último valor,
  então precisa de checagem própria.
- `start`/`duration`: `malformed-start`, `invalid-duration` (PT0S, P0D, P1M,
  P1Y, `""` e não string são inválidos).
- `id`, `include`, `includeAll` que não são string: `schema-error` no path
  do campo.
- `ParseError` do TS não guarda o nó, então não tem a `line` que o Python
  reporta (`blocks.ts`, `ordering.ts`). Portar junto com `load`.
- Chaves de YAML que não são string (revisão da P2): o js-yaml converte toda
  chave em string, o PyYAML não. `1: a` mais `"1": b` é `yaml-syntax-error`
  só no TS; `domain: {1: decimal}` com `[^1/numeric]` é `undefined-blank` só
  no Python; `{? [a]: 1}` é `yaml-syntax-error` só no Python. Decidir com a
  sessão `mdq` se vira exemplo de corpus ou se o formato proíbe chave não
  string.
- `CORE_SCHEMA` recusa `!!timestamp`/`!!binary` com `yaml-syntax-error`; o
  Python carrega e o modelo rejeita. U+0085/U+2028 num escalar: o PyYAML
  rejeita, o js-yaml aceita. Mesmo encaminhamento.

Divergências achadas na P4a, sem exemplo no corpus:

- Erro de campo do modelo junto com erro de tipo (`{title: "  ", foo: 1}`):
  o Python reporta os dois no mesmo passe, o TS só o de schema.
- `null` dentro de mapa que não é modelo: alinhado na P4b.
- JSON com `NaN`/`Infinity`: o Python aceita, o JS recusa. Levado à sessão
  `mdq`.

### P5. Lint

`models/lint.ts`, `models/lint-codes.ts` e o `lint()` de cada família. Fecha
`lint.spec.ts`.

Notas:

- Identidade de linha do ordering por modo: `fixed` = nível e texto;
  `lenient`/`strict` = texto. Vale para `accept-outside-answer-key`,
  `unreachable-alternative` e a checagem da resposta.
- Numeric: `domain-mismatch`, `answer-outside-domain`,
  `missing-tolerance`, `relative-tolerance-around-zero` julgam uma string
  pelo valor ou pela grafia; o blank numérico do fill-in usa as mesmas
  regras.
- `redundant-regex-anchor`: `^` só sem a flag `f`; `$` só sem `f` nem `b`;
  `$` depois de número ímpar de `\` é literal.
- True/false: ordem das regras de locale em
  `mdq-py/mdq/models/_lint.py` (`check_true_false_markers`).

Notas da revisão da P2 para a P5:

- `findUnicodeSpaces` (`parser/spaces.ts`) não é chamado em `src/`: o TS
  não emite `non-ascii-whitespace`. Ligar no `lint`.

### P6. Pontuação

`scoreResponse`, `prevalidate`, `scoreResponses`, `gradingFor`,
`shuffleFor`, `resolveQuestion`. Fecha `grading.spec.ts`.

Notas:

- Aritmética exata com `fraction.js` 5 (BigInt). Número lido por
  `String(x)`; arredondamento half away from zero; tolerância relativa sobre
  o answer antes do arredondamento; nada em `number`.
- Resposta numérica: tabela por domain de `docs/responses.md`; string é
  `sign? numeric_value` com expoente opcional, sem trim; `{value, unit}` com
  unidade igual em NFC ou ausente.
- Malformado (`ResponseError`): id desconhecido em qualquer tipo; valor de
  TF que não é booleano nem `null`; resposta de texto que não é string;
  tipo errado no blank do fill-in. `null` pula; `{}` no fill-in é nota 0.
- `grading` do exame traduzido por tipo (tabela em `docs/exam.md`); mapa sem
  tradução.
- Feedback: o do primeiro padrão com feedback entre os que casam na lista
  que decidiu; `incorrectFeedback` só com nota 0, resposta bem formada e sem
  feedback de padrão. Pendente: sem feedback.

### P7. Fechamento

- [ ] `normalize` (usa a reconstrução de blocos do parser), `withIds`,
  `automation`.
- [ ] Enxugamento dos testes unitários TS por cobertura: baseline = suítes
  de corpus; apagar o que não soma cobertura ou levar o caso ao corpus.
- [ ] `mdq-js/docs/sync/*` revisados; `mdq-js/CHANGELOG.md` [Unreleased].
- [ ] `tests/not-ported.ts` vazio em todas as camadas.
- [ ] Só mensagem difere (código e path batem): `[numerİc]` (o `iu` do JS
  não leva `İ`/`ı` a `i`, `tags.ts`); `split(/\s+/u)` em
  `short-answer.ts:298` contra `str.split()` (U+0085, U+001C, U+FEFF).
- [ ] Candidatos ao enxugamento, da revisão da P2: `parser-exam.spec.ts`
  (repete o corpus), blocos "edge cases the corpus does not cover" de
  `parser-essay`, `parser-short-answer` e `parser-fill-in` (viram corpus),
  `whitespace.spec.ts`.

## Lacunas na referência

Reportadas à sessão `mdq`:

- A spec não diz qual de duas grafias com o mesmo slug fica com o slug puro
  e qual ganha `-2` (`brasilia`/`brasilia-2`); só os `.ids.yaml` fixam isso.
  A sessão `mdq` levou a questão ao comitê de spec.

## Pendências depois da referência

- `exam-duplicate-tags`: `Exam.tags` repetido é `schema-error`; exemplo
  `examples/invalid/exam-duplicate-tags`.
- `exam-question-backref-lost`: `Exam.with_ids()` e `Exam.model_copy()`
  religam `question.exam` à cópia (sem exemplo no corpus).
- `foreign-choice-marker`: a mensagem mostra marcador vazio como `[ ]`.
- Erros de mapa do frontmatter de fill-in (`domain`, `decimalPlaces`,
  `preAccept`, `preReject`, `incorrectFeedback`): `path` aponta o campo
  (`["domain"]`; `["incorrectFeedback", "river"]` para uma entrada), não `[]`.
  Quatro `.lint.json` de `examples/invalid/fill-in-*` mudaram.

- Rodada de bugs da mdq-py, commitada (HEAD `4fac1db`):
  - D01 (spec `823cdd2`, mdq-py `11fd3a8`): numa linha lazy, linha com
    menos de 4 colunas de recuo que casa `^\[(label)\][ \t]*:`, com label
    que começa com `^` ou é rótulo reservado, é `parse-error` ("the line
    '…' is a tag, so it cannot continue the content before it; add a blank
    line before the tag"). Vale para as linhas [1:] de um parágrafo de tag
    de short-answer, numeric ou definição de lacuna, e para as linhas lazy
    de item de lista (padrões, choice, ordering). Link def não reservada
    (`[ibge]: https://…`) segue texto. Corpus: `invalid/*-tag-line-after-*`,
    `valid/short-answer/link-definition-continuation`. Etapas P2a/P2b/P2c.
  - D02: setext H1 (`===`) é `forbidden-block-element` nas instruções do
    exame, no stem e no epílogo (substitui `setext-heading` ali). O parser
    mantém as linhas de sublinhado setext em stem e epílogo.
    `Exam.lint()` reporta `setext-heading` em `questions[i].stem`/
    `.epilogue`; o parser do exame não emite mais o aviso para esses dois
    campos. A mensagem de `setext-heading` cita a linha real. Corpus:
    `exam-setext-h1-*`, `question-setext-h1-*`,
    `model-only/question-setext-h1-in-stem.yaml`,
    `valid/short-answer/stem-setext-h2`, `valid/exam/question-stem-setext-h2`;
    `valid/exam/setext-heading-equals-underline` virou
    `invalid/exam-setext-h1-in-instructions`. Parser na P2c, regra na P4,
    lint na P5.
  - Exame sem título: H1 só com `#` vale (`valid/exam/empty-heading`).
  - D06 (`adaa1e5`): o índice do banco só aceita fontes que validam como
    questão; sem split por vírgula nem `str()` nas tags de mapping.
    `tests/banks.spec.ts:157-172` passa a esperar fonte fora do índice
    (P4, depois de `validateDocument` com regras de modelo).
  - D07: só comentários dos `.ids.yaml`.
- Anunciado sem data: refatorações internas da mdq-py com pequenas mudanças
  de mensagem.

- Pacote G da `mdq` (refatoração interna, HEAD `7c5c726`): só estrutura,
  salvo a mensagem do ordering para parágrafo de imagem logo após
  `## [accept]` ("the ## [accept] section has no content block",
  `197fc54`). Reconferir a P2 contra `7c5c726`.
- Pacote H (em andamento): exemplos G1-G9 da P2 e `$` trocado por
  `fullmatch` nos validadores (`*-trailing-newline.yaml`). A P4 reconfere.
- Pacote I (anunciado): YAML 1.2 na mdq-py. Chave escalar vira string,
  `1: a` + `"1": b` e chave composta são `yaml-syntax-error`, U+0085/U+2028
  aceitos, `!!timestamp`/`!!binary` são `yaml-syntax-error`. Fecha as
  divergências de YAML da revisão da P2 sem mudar a mdq-js (conferir a
  chave composta, que o js-yaml aceita).

Próxima rodada anunciada pela sessão `mdq`: bugs de `dev/issues/`
(conversores, `show`, CLI, `exam-duplicate-tags`,
`exam-question-backref-lost`, `banks-index-invalid-questions`) e as questões
de `dev/issues/spec-questions-from-review.md`. Só as que mudarem parser,
modelo, lint ou pontuação entram aqui.

## Histórico

- 2026-10-27: plano criado. P0 feita (sem commit): Zod igual ao JSON Schema, módulos
  movidos, manifesto explícito (PARSE 154, MODEL_RULES 103, LOAD 174,
  RESOLVE 2). Suíte verde: 4206 testes.
- 2026-10-27: fase M feita. Manifesto da mdq-js com o corpus novo: PARSE
  161, MODEL_RULES 113, LOAD 233, RESOLVE 2. Suíte verde: 4512 testes.
- 2026-10-27: P2 feita. `parser/legacy/` apagado. Manifesto: PARSE 0,
  RESOLVE 0, LOAD 110 (todas P4), MODEL_RULES 115. Suíte verde: 4458 testes.
  Nove casos sem exemplo no corpus (`/tmp/mdq-p2/corpus-gaps.md`) vão para a
  sessão `mdq`.
- 2026-10-27: P1 feita (`6d2b826`): 8431 testes. P3 feita (`9e5d54f`):
  `matching.spec.ts` sem manifesto.
- 2026-10-27: P4 feita (`4b4f01b`, `d7bea86`). Pacotes I e J da `mdq`
  portados em `03904f8`: YAML 1.2 Core pelo pacote `yaml` (o js-yaml não
  rejeita chave composta), chaves escalares viram string, e regras de campo
  junto com erro de schema. Falta o pacote K (`answer: " 1"` em YAML/JSON é
  `malformed-numeric-answer`; null num mapa por blank do fill-in = ausente).
- 2026-10-27: P5 feita (`254c1c0`): `LINT` vazio. Pacote K portado
  (`fa68490`). Suíte verde: 8612 testes; `spec_audit --check` verde.
- 2026-10-27: P6 feita (`e7d2cdd`): pontuação de todos os tipos. MS que
  aceita string ou mapa na mdq-py levado à sessão `mdq` como bug.
