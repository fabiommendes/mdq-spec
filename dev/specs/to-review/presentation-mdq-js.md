---
type: spec
status: active
tags: [mdq-js, shuffle, public-form, responses, port]
relatedTo: [dev/specs/to-review/presentation.md, docs/public-form.md, mdq-js/docs/sync/modules.md]
---

# Port da forma apresentada para mdq-js

O comportamento está em `dev/specs/to-review/presentation.md` e em
`docs/public-form.md` ("Presented form"). Esta spec só mapeia a API e as
escolhas do port. Em divergência, Python decide.

## Mapa

| Python                                  | TypeScript                                          |
| --------------------------------------- | --------------------------------------------------- |
| `mdq/models/_presentation.py`           | `src/models/presentation.ts`                        |
| `BaseQuestion.presentation(seed, shuffle=)` | `presentation(question, seed, { shuffle? })`    |
| `Presentation.public()`                 | `Presentation.publicForm()` (`public` é reservada)  |
| `to_response` / `to_presented`          | `toResponse` / `toPresented`                        |
| `Exam.presentation(seed)`               | `examPresentation(exam, seed)`                      |
| `ExamPresentation.public()`             | `publicForm()`                                      |
| `to_responses` / `to_presented_responses` | `toResponses` / `toPresentedResponses`            |
| `ValueError` (seed com U+0000)          | `RangeError`                                        |
| `require_choice_id` (`_choice.py`)      | `requireChoiceId` em `src/models/choice.ts`         |

- `Presentation` e `ExamPresentation` são interfaces com um objeto simples,
  sem classe. O índice exporta só as duas funções e os dois tipos. `digest`
  fica interno (exportado do módulo, para o teste).

## Escolhas

- SHA-256 síncrono: `@noble/hashes` (`sha2.js`, `utils.js`). Roda no
  navegador e em Node ESM puro, sem `node:crypto`. É uma `dependency`.
- Tabelas de rótulo em `Map`, não em objeto: um id como `__proto__` não pode
  colidir com o protótipo.
- `effectiveShuffle` lança em tipos sem `shuffle`. A apresentação usa `false`
  nesses tipos, como o `getattr` do Python.

## Testes

- `tests/presentation.spec.ts` espelha `mdq-py/tests/test_presentation.py`:
  o corpus `examples/presentation.yaml` (via `corpusIt` e o manifesto
  `PRESENTATION` de `tests/not-ported.ts`), estabilidade, ida e volta dos
  vetores de grading, ausência dos ids originais e o exame.

## Divergências achadas

- `publicForm` copiava `shuffle: inherit` e `grading: inherit`. O Python
  omite o valor default. O caso "shuffle inherit reads as false" do corpus
  exige a forma do Python, então o TS passou a omitir.
  `docs/public-form.md` ("Configuration") diz que `inherit` fica `inherit`.
  A doc contradiz o Python e o corpus. Corrigir na spec.
- `examples/presentation.yaml` não aspeia os rótulos. Um rótulo como
  `478e6412` é `Infinity` em YAML 1.2 (core schema da lib `yaml`) e string
  em YAML 1.1 (PyYAML). O teste TS lê o arquivo sem o float exponencial.
  Considerar aspear os rótulos no corpus, e dizer na doc que um host que
  grava rótulos em YAML 1.2 deve aspeá-los.
