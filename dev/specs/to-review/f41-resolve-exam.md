---
type: spec
status: active
tags: [mdq, mdq-js, exam, include, include-all, query, banks]
relatedTo: [mdq-js/docs/handoffs/10-banks.md, mdq-js/docs/sync/roadmap.md]
---

# F4.1: `resolveExam`, `DictLoader`, `parseQuery` no mdq-js

Porta `mdq-py/mdq/models/_query.py`, `mdq-py/mdq/_banks.py` (sem
`FileLoader`) e `Exam.resolve`/`select_random`/`_load_included`/
`_query_ids`/`_check_selection` de `mdq-py/mdq/models/_exam.py`.

## Interface (já existe como stub; não mudar assinaturas, só preencher)

- `mdq-js/src/query.ts`: `QuerySyntaxError`, `TagIndex`, `QueryExpr`,
  `Query` (`matches`, `select`), `parseQuery`, `isStandardQuery`.
- `mdq-js/src/banks.ts`: `QuestionSource`, `QuestionBank`, `DictLoader`,
  `Select`, `selectRandom`, `ResolveOptions`, `resolveExam`.
- `mdq-js/src/errors.ts`: `IncludeNotFoundError(questionId, detail = "")`
  (stub lança "not implemented" no construtor; implementar a mensagem
  `cannot resolve included question '<id>'` + `: <detail>` se houver).

Uma mudança na interface: `ResolveOptions` ganha `warnings?: Diagnostic[]`
(`src/diagnostics.ts`). `resolveExam` faz `push` de
`diagnostic("warning", "empty-include-all", "the query '<q>' adds no question to the exam", ["questions", index])`
para cada bloco `include-all` que não adiciona nada, com `index` sendo a
posição do bloco em `exam.questions` **antes** da resolução. Atualizar o
docstring de `resolveExam`.

## Semântica (igual ao Python; em dúvida, rodar o Python)

Query:

- Tokens: `(`, `)`, `,`, ou run de caracteres fora de `(),` e de
  `UNICODE_SPACE` (`src/parser/text.ts`). Entre tokens só se ignora
  `[ \t\f\r\n]`. Qualquer outro caractere (ex.: NBSP, U+3000) é
  `unexpected character U+XXXX`.
- Keywords `AND OR NOT EXCEPT` só em maiúsculas. `and`, `ANDROID`, `NOTE`
  são tags.
- Precedência: `NOT` > `AND` > `OR`; `EXCEPT a, b` só no fim.
- Mensagens: `invalid include-all query '<text>': <detail>` com detail em
  `unexpected '<tok>'`, `missing ')'`, `expected a tag, found '<tok>'`,
  `expected a question id, found '<tok>'`; `'the end'` quando acabaram os
  tokens. Python usa `repr` (aspas simples); manter aspas simples.
- `select`: álgebra de conjuntos com flag `negated` (ver `_Ids` no Python);
  `index.ids()` só é chamado quando o resultado da parte lógica inteira é um
  complemento. `tagged` pode retornar qualquer `Iterable`.

Bank:

- `DictLoader.load` lança `IncludeNotFoundError(id, "not in the mapping")`.
- Índice de tags construído uma vez, na primeira chamada de `tagged` ou
  `ids`. Fonte texto: pula se `isExam(text)`; pula se `parseQuestion`
  lança `MdqError`. Fonte objeto: pula se `type === "exam"`. `tags` string
  é separada por vírgula e aparada; lista vira `String(tag)`. Fonte sem
  `tags` tem lista vazia mas entra em `ids()`.

Resolve:

- `taken` inicial = alvos de todo `include` (mesmo posteriores) + `id`
  declarado de toda questão inline.
- Para cada entrada em ordem: `include` -> carrega; `include-all` ->
  `candidates = sorted(query.select(bank) - taken)`, `chosen =
  select(candidates, max)`, valida (`RangeError`, mensagens no docstring),
  `taken ∪= chosen`, carrega cada um; questão inline -> cópia.
- Query que `parseQuery` rejeita -> zero candidatos (sem erro).
- Questão carregada: texto -> `parseQuestionDocument`; objeto -> cópia rasa.
  `id` ausente/undefined -> recebe o id usado no `load`. `locale`/`author`
  (`INHERITED_FIELDS` em `src/parser/exam.ts`) vêm do exame se a questão
  não tem e o exame tem.
- Resultado: `{...exam, questions}` validado com o schema Zod do exame; se
  falhar, `MdqError("the resolved exam does not satisfy its schema: ...")`.
  Ids duplicados **não** são checados aqui (F5).
- `selectRandom`: todos se `max === undefined || max >= length`; senão
  amostra de `max` mantendo a ordem de `candidates`.

## Testes

Três arquivos novos em `mdq-js/tests/`:

1. `query.spec.ts`: porta a seção de query de
   `mdq-py/tests/test_include_all.py` (`test_query_matches_tags`,
   `test_except_removes_listed_ids`, `test_invalid_query_is_rejected`,
   `CountingIndex` + `test_select_lists_every_id_only_for_a_complement`).
   Acrescentar os casos de mensagem de erro listados acima e o caso de
   espaço Unicode (`examples/valid/exam/query-unicode-space.mdq.md`).
2. `banks.spec.ts`: `DictLoader` (load, not found, índice, exame pulado,
   texto inválido pulado, tags string), `selectRandom` (sem max, max >=
   length, amostra mantém ordem e tamanho em 50 rodadas), `resolveExam`
   (porta a seção "Resolution" de `test_include_all.py`: cada `test_*` de
   `test_include_all_adds_every_match_sorted` até
   `test_a_nonstandard_query_adds_nothing`, menos os que dependem de
   `with_ids`/`load`/lint). Os helpers `exam(...)`, `include_all(...)`,
   `question_ids(...)` do Python são reescritos em TS; o banco de
   fixtures do topo do arquivo Python (amazonia, cerrado, mata, pantanal,
   caju...) é reproduzido como `DictLoader`.
3. `exam-resolution.spec.ts`: corpus. Espelha
   `mdq-py/tests/test_exam_resolution_corpus.py`:
   - Banco: `DictLoader` montado em teste a partir de
     `examples/valid/exam/**/*.mdq.md` (id = nome sem `.mdq.md`,
     recursivo, inclui `bank/`). Isso substitui o `FileLoader` do Python.
   - Para cada `*.resolved.yaml`: o exame vem do `<stem>.mdq.md` (via
     `parseExamDocument` + `validateDocument`/schema Zod) ou, se não
     existir, do `<stem>.yaml`. `select = first` (`candidates.slice(0,
     max)`). Ids esperados: `question.id ?? \`q${i + 1}\`` sobre o
     resultado (isso é o `with_ids` do Python reduzido ao que o corpus
     precisa; `withIds` de verdade é F5).
   - Diagnósticos: comparar multiconjunto de `{code, severity, path}`.
   - Também: todo exame em `examples/valid/exam/` (não em `bank/`) com
     entrada `include`/`include-all` tem um `.resolved.yaml`; e existe pelo
     menos um fixture.
   - Usar `corpusIt` de `tests/not-ported.ts` com um manifesto novo
     `RESOLVE: Manifest = {}` (adicionar em `not-ported.ts`).

Checagem final: `pnpm test`, `pnpm typecheck`, `pnpm lint` limpos.
Changelog (`mdq-js/CHANGELOG.md`, `[Unreleased]`, "Added") e
`docs/sync/roadmap.md` (F4.1 -> done) ficam por conta do revisor.
