---
type: plan
status: active
tags: [mdq, spec, audit, plano]
relatedTo: [dev/audit/report.html, docs/question-types, dev/issues/lint-spec-open-decisions.md]
---

# Plano de ação: contradições do spec

Uma contradição por vez, da mais grave para a menos. IDs do relatório
(`dev/audit/report.html`). Estado: `proposto`, `decidido`, `feito`.

## S1: short-answer, `accept` contra `oneOf`/`regex`

Estado: feito em mdq-py (B). Falta port para mdq-js. Spec da mudança em
`dev/specs/to-review/short-answer-accept-only.md`.

### Comportamento do parser (mdq-py)

| Fonte | AST | Correção |
| --- | --- | --- |
| `[short-answer]: X` | `oneOf: [X]` | vira `accept: [X]` na hora de corrigir |
| `[short-answer]: /re/` | `regex: re` (sem delimitadores) | vira `accept: ["/re/"]` |
| `[short-answer]: /re/i` | `oneOf: ["/re/i"]` | corrigido como regex |
| `[short-answer]:` + `ul` | `oneOf: [...]` | idem |
| `[short-answer]: X` + bloco accept | `oneOf` e `accept` | `oneOf` ignorado: `X` pontua 0 |
| YAML `regex: /re/m` | aceito | embrulhado de novo em `/.../`: nunca casa |

- `_parser/_question.py:699-756`, `models/_text.py:194-205, 338-358`.
- O código já chama `oneOf` e `regex` de "legacy fields".
- Dois bugs: `oneOf` ignorado quando há `accept`; `regex` delimitado nunca
  casa (caso de `examples/valid/short-answer/ignored-regex-flag.yaml`).

### Opções

- A. Spec segue o código: documentar `oneOf`, `regex`, precedência
  `accept > regex > oneOf`. Três grafias da mesma lista no AST.
- B. Código segue o spec: parser sempre emite `accept`. `oneOf` e `regex`
  saem do schema.
- C. Como B, mas YAML/JSON ainda aceita `oneOf`/`regex` como alias obsoleto.

### Proposta: B

Mudanças no spec (`short-answer.md`):

1. Tabela de frontmatter: adicionar `openEnded` (boolean).
2. Seção nova e curta "AST": `[short-answer]: X` gera `accept: [X]`; corpo
   vazio gera `openEnded: true`.
3. Linhas 224-226: o padrão do bloco simples é o primeiro item de `accept`,
   seguido dos itens do bloco `[short-answer/accept]` (resolve S11).
4. Tabela de regras: tirar as linhas de `regex` e `oneOf` (resolve S16);
   `openEnded` passa a citar só `accept`.
5. Objeto de padrão: acrescentar `comment`.

Fora do spec: schema (short-answer, fill-in), modelos, conversores GIFT e
Moodle, lint `shadowed-answers` (some), cerca de 25 YAML do corpus, exemplo
`short-answer/list` reescrito como bloco accept.

## D11: lints de regex e curinga em `preAccept`/`preReject`

Estado: feito em mdq-py (A). Falta port para mdq-js. Spec em
`dev/specs/to-review/pre-validation-lints.md`.

## S5/G1: feedback em blank short-answer de fill-in

Estado: feito (A). Só docs: `fill-in.md` "Feedback", skill
`skills/mdq-questions/references/fill-in.md`, changelog da raiz.

## O6: algoritmo da comparação inexata

Estado: feito em mdq-py. Falta port para mdq-js.
Spec em `dev/specs/to-review/inexact-comparison.md`.

Decisões do humano: tabela de letras baseada no CLDR `Latin-ASCII` (D1);
casefold completo por tabela gerada, sem dep `unicode-case-folding` (D2);
remover controles não-espaço e `Default_Ignorable_Code_Point` (D3);
normalizar aspas e hífens (D4).

## P1: literal exato e NFC

Estado: feito em mdq-py (A: MUST NFC). Falta port para mdq-js.

## TX-S12: linhas de continuação em item de padrão

Estado: feito (A: documentar o parser). Só docs e corpus:
`patterns.md` "Continuation lines", exemplos
`short-answer/continuation-lines` e `fill-in/continuation-lines`.
Sem mudança de código.

## TX-S5: `conflicting-accept`

Estado: feito. Só texto: `lint-codes.md` não cita mais `preAccept`/`preReject`;
`short-answer.md` não deixa mais a implementação aceitar o documento com as
duas grafias (era "MUST let the frontmatter win", contra o erro de carga).

## Render descartava `preAccept`/`preReject` (achado novo)

Estado: feito em mdq-py. `ShortAnswerQuestion.frontmatter()` escreve os dois
campos. Testes em `tests/test_render_pre_validation.py`. Em aberto: blank de
fill-in tem `preAccept`/`preReject` no schema, mas sem grafia em markdown.

## R2 / TX-S16: `openEnded`, `unmatched`, `incorrectFeedback`, curinga

Estado: feito em mdq-py. Falta port para mdq-js. Spec em
`dev/specs/to-review/automation.md`.

## F1: `preAccept`/`preReject` de blank short-answer de fill-in

Decisão: grafia no frontmatter da questão, como mapa `blank id -> lista de
padrões`. No JSON continuam campos do blank (schema inalterado); o parser
distribui, o render recolhe. Chave sem blank: `undefined-blank` em
`["preAccept", chave]`. Chave de blank numérico/escolha: `schema-error` em
`blanks/i/preAccept`. Pre-validação numérica: só ideia no BACKLOG.

Estado: feito em mdq-py (2 lotes TDD: `tests/test_fill_in_pre_validation_parser.py`,
`tests/test_fill_in_pre_validation_render.py`). Falta port para mdq-js.
Lateral achado no lote 2: blank de escolha de fill-in lê `[ ]` como score
ausente (`None`) e multiple-choice lê como `0`. Vai para S2.

## S2 / S3: `[ ]` em multiple-choice

Decisão (humano, spec já editado): `[ ]` omite `score`; `grading` decide o
valor; `[0%]` é zero explícito. S3: tabela corrigida (-1.00). Implementado
em mdq-py: parser omite, render escreve `[0%]`, conversores exportam o score
efetivo (`convert._base.effective_scores`) em vez de recusar. Corpus: 9 YAML
sem `score: 0`. Testes em `tests/test_omitted_choice_score.py`. Falta mdq-js.

## O1: inferência de tipo e marcador estranho

Decisão: A. Regra de precedência escrita em `base.md` "Type inference";
marcador fora da gramática do tipo (inferido ou forçado) é erro
`foreign-choice-marker`, path `["choices", i]` ou
`["blanks", b, "choices", i]`. Fecha o item do BACKLOG sobre `[?]`/`[#]`.
Estado: contrato escrito (spec, lint-codes, 5 exemplos inválidos, skill,
CHANGELOG raiz); mdq-py feito (`tests/test_foreign_choice_marker.py`, 48). Falta mdq-js.

## O4: `[choice-id]` e `[slug]` vs link

Decisão: A. `choice_id` entrou nas gramáticas de item (MC, MS, TF); `SLUG`
virou MUST em `base.md`. Colchete seguido de `(` ou `[` é link, não id.
Detalhe: espaço depois do `]` continua opcional (`[a]Brasília` é id `a`),
para não reverter a decisão antiga de `[Q1]` + NBSP em `test_whitespace`.
Estado: feito em mdq-py (`tests/test_slug_vs_link.py`), exemplos
`multiple-choice/link-choice`, `essay/link-stem`. Falta mdq-js.

## S4: exam.md "Penalty" afirmação falsa

Estado: feito, só texto. `symmetric = 2*partial - 1`; o piso só iguala a
parte negativa.

## S8 / O19: versão do YAML

Decisão: A, YAML 1.2 Core schema. `yes/no/on/off`, timestamp e `1:30` são
strings; `010` é 10. `start` aceita espaço entre data e hora. Feito em
mdq-py (`_FrontmatterLoader` com resolvers próprios e int constructor;
`tests/test_yaml_core_schema.py`). Exemplo `multiple-choice/yaml-core-schema`;
`invalid/exam-ids-not-strings` sem `include: yes`. Falta mdq-js (js-yaml
`CORE_SCHEMA`, que também não tem timestamp).

## O2: ordering fora do `Entry` do schema do exame

Estado: feito. `ordering.yaml` no `oneOf`, bundle regenerado, exemplo
`exam/with-ordering`. Sem mudança de código nas implementações.

## O5: fórmula da nota do exame

Decisão: seção "Exam score" em `exam.md` (média ponderada após `penalty`;
pulada = 0 mantendo peso; Σw = 0 → 0; pendente deixa a nota pendente com
provisória opcional). GLOSSARY: "Exam score". mdq-py: `Exam.score_responses`
devolve `ExamScore` (dataclass frozen) com detalhe, pedido do humano.
Testes `tests/test_exam_score.py` (20). Falta mdq-js.

## S7 / O10 / M10 / M11: numeric

Decisão: S7.A (sem abstol fração na tabela). O10.A: `decimalPlaces` é a
precisão da comparação (arredonda resposta e gabarito, meio para longe do
zero, decimal); inferido de `max(casas do answer, casas do abstol)`.
Front pode usar para renderizar, fora do escopo do MDQ. Estado: spec feito;
mdq-py em TDD (`tests/test_decimal_places.py`, 43). Falta mdq-js.

## S10 / O11 / M12: ordering

Decisão: A nas duas. `dedent` = achatar a nível 0 (texto corrigido).
`fixed` compara níveis; só `dedent` (listado ou implicado por `lenient`)
os remove. mdq-py: `grades_indentation()`; testes em
`tests/test_ordering_scoring.py`. Falta mdq-js.

## S9, S12, S14, S15, S17: textuais

Estado: feito. S9: espaço antes de `:` permitido em toda tag (gramáticas de
numeric e fill-in, regexes do parser; `tests/test_tag_colon_spacing.py`).
S12: descrições do schema sem "número vira string". S14: exceções ao
"as-is" listadas. S15: footnote 8 sem "locale pattern". S17: espaços finais
nos exemplos removidos. S16 já estava corrigido.

## S13: stem de reticências

Decisão: B, remover o recurso. `...` é um stem comum. Lint
`unexpanded-stem-ellipsis` removido de lint-codes, `_lint`, `_base` e dos
testes (trocado por `locale-lookalike-language` como info de referência).
Exemplo `multiple-choice/ellipsis-stem` apagado. Falta mdq-js.

## O16: defaults só no schema/código

Estado: feito. `essay.md`: `input` default `text`. `true-false.md`
"Locale": tabela de letras por subtag (en T/F, pt V/F, es V/F), mesma do
`_LOCALE_MARKERS`. Só texto.

## O17: PROVISIONAL

Decisão: categoria vira WARNING (lê como true, avisa; sem promessa de
reatribuição). Lint `provisional-true-false-marker` →
`unlisted-true-false-marker`. Exemplo renomeado `true-false/unlisted-marker`.
Falta mdq-js.

## O18: `null` em campos opcionais

Decisão: A, regra única em base.md: null = ausente em qualquer campo
opcional, nested incluído; `meta` mantém. Pedido extra do humano: `grading`
e `shuffle` ganham valor `inherit` (default) que herda do exame; exame
ganha `shuffle` (default false). mdq-py: validator before em `MdqModel`
descartando None; `effective_grading/shuffle`, `Exam.grading_for/shuffle_for/
resolve_question`; `score_responses` aplica grading herdado (antes ignorava).
Testes `tests/test_null_fields.py`, `tests/test_inherited_grading.py`.
Exemplos `multiple-choice/null-fields`, `exam/inherited-grading`. Falta
mdq-js. GLOSSARY: "Inherit".

## O13, O15, O20: textuais

Estado: feito, só texto, batendo com o mdq-py. O13: gramática de duração
com ≥1 componente (testada com Lark), canônica sem semanas, `start` só
data fica data. O15: questão do banco sem `id` recebe a chave do banco.
O20: AST carrega `locale`/`author` herdados em cada questão.

## O14: `---` colado em parágrafo

Decisão: A. Spec: `---` que abre bloco MUST ter linha em branco antes
(como `===`); MDQ é subconjunto de CommonMark, sem dialeto. Parser
continua deixando o `---` colado dentro do texto, mas agora avisa
(`setext-heading`, path `questions/i/preamble|epilogue`) a partir das
linhas cruas, já que o parser de questão reescreve o setext. Em
`instructions` o lint roda no modelo. Exemplo `exam/setext-heading`.
`tests/test_setext_heading.py`. Falta mdq-js.

## O12: blank fora do stem

Decisão: A. fill-in.md já tinha "Where blanks may appear" (parágrafo e
texto plano; `misplaced-blank`). Faltava preamble/epílogo: `[^slug]` ali é
texto literal, como o mdq-py já faz. Cloze em tabela/lista no BACKLOG.
`dev/issues/blank-placement.md` apagado.

## O22: regras só no schema

Decisão: A. base.md "Additional Rules" explica `minLength: 1` e `minItems`
e cada tipo ganhou linha "(schema)" com o mínimo. Só texto.

## M1–M4: examples/grading

Estado: feito. M1/M2 corrigidos em multiple-choice.yaml, M3 em
true-false.yaml; `tests/test_grading_examples.py` lê os três arquivos (61
casos). Falta mdq-js ler o mesmo corpus.

## O21 / M24: locale

Decisão do humano: só bem formado pela RFC 5646, sem exclusões; validade
(registro) é do consumidor. Spec, schema (descrições), regex do mdq-py
(4ALPHA, 5*8ALPHA, grandfathered), exemplo `essay-malformed-locale` com
`pt_BR`. `tests/test_locale_well_formed.py`. Falta mdq-js.

## M16, M17, M19, M20, M21, M25, M26: higiene do corpus

Estado: feito sem decisão. M27 (`yaml-syntax-error` em bloco de exame com
path `[]`) fica: exigiria o parser do exame propagar o índice do bloco.
M22 já coberto por O13. M18 (`short-answer/open-ended.mdq.md`) não existe
mais no corpus.

## M13: choice com bloco de código

Decisão: A. Exemplo `multiple-choice/fenced-code-choice` apagado (3 arquivos),
entradas NOT_YET_SUPPORTED removidas em `tests/test_parser.py` e
`mdq-js/tests/not-ported.ts`. Item no BACKLOG (Specification): bloco dentro
de choice em MC/MS/TF.

## M14: comment string multilinha

Decisão: A. base.md "Markdown to AST mapping": a licença de normalização
cobre o comment string, que MAY ser unido em uma linha. Só texto.

## M15: `correct` obrigatório

Decisão do humano: `correct` é REQUIRED em MS e TF (cada choice é um
veredito; só MC omite `score` em `[ ]`). Schema (`required`, sem
`default`), MS/TF docs, corpus MS com `correct: false`, inválidos
`multiple-selection-choice-without-correct` e
`true-false-choice-without-correct`. mdq-py: parser emite `correct` sempre
em MS; `BooleanChoice`/`Statement.correct` sem default.
`tests/test_explicit_correct.py`. Falta mdq-js.

## O3: mapeamento markdown → AST

Decisão: A. Seção "## AST" por tipo + exam.md (tabela elemento → campo, um
exemplo md/yaml do corpus). Fazer por último, antes do port mdq-js.

## I1–I16: comportamento do mdq-py (varredura)

Já resolvidos por itens anteriores: I1 (O1), I3, I4 short-answer, I9 (O12),
I10, I11, I12, I16 (O13). Conformes ao spec, sem ação: I4 ordering
(observação depois do bloco é epílogo), I5/I14 (questão inline sem `===` é
instrução; `exam-without-questions` avisa; heurística de blocos não mexida).

Corrigidos neste lote (corpus em `examples/invalid/`):
- I2 `* [] A` → `parse-error` (`multiple-choice-empty-brackets`).
- I6 `domain-mismatch` disparava para `5 +- 1.0`: o parser infere `decimal`
  pela escrita e o lint re-inferia `integer` pelo valor. Regra final: por
  valor (JSON não distingue `4.0` de `4`, mdq-js precisa portar), e só
  dispara quando o domínio declarado é mais estreito que o inferido
  (`decimal` cabe tudo). numeric.md [^3], lint-codes.md, exemplo
  `numeric/inferred-decimal-tolerance`. Dois testes da regra antiga
  reescritos.
- I7 prosa entre bloco `[ordering]` e seção → `parse-error` claro
  (`ordering-epilogue-before-section`); ordering.md ganhou a frase.
- I8a decisão do humano: item de `ul` é exatamente uma linha; continuação
  ou segundo parágrafo é `parse-error` (`ordering-multiline-item`).
- I8b `normalizations` com repetição: `uniqueItems` no schema + modelo
  (`ordering-repeated-normalization.yaml`).
- I13 `start`/`duration` inválidos em fonte markdown saem como
  `malformed-start`/`invalid-duration` com path, como em YAML
  (`exam-malformed-start`, `exam-invalid-duration` + sibling yaml).
- I15 H1 ATX nas instruções → `forbidden-block-element` em `instructions`
  (setext `===` fica só com `setext-heading`, que explica o conserto).
  Bloco `---` com YAML quebrado (`exam-broken-yaml-block`): decisão do
  humano (A): par `---` em posição de bloco é bloco mesmo com YAML inválido
  → `yaml-syntax-error`. Junto, lint novo `unsafe-thematic-break` (warning)
  para thematic break escrito com `-` em instructions/preamble/stem/epilogue;
  `***`/`___` são seguros. exam.md "Questions", base.md regra + [^9],
  lint-codes.md; exemplos `essay/thematic-break-epilogue` (novo),
  `essay/thematic-break-preamble` e `exam/thematic-break-in-question` ganham
  o warning. `tests/test_unsafe_thematic_break.py`. Falta mdq-js em tudo.

## G2 / G4: `.lint.json` para inválidos só-YAML

Feito. 39 `.lint.json` novos (21 em `invalid/`, 18 em `invalid/model-only/`),
gerados da saída de `mdq.load` e revisados contra o comentário `#` de cada
arquivo: todos os códigos batiam. Único ajuste: `accept-reject-overlap`
saía com path `[]` (model validator cru); agora `["accept", i]` via
`_raise_unique_id_error`. Teste novo
`test_invalid_parsed_only_example_reports_its_lint_json` em
`tests/test_invalid_sources.py` exige `.lint.json` para todo inválido sem
irmão `.mdq.md` e compara o multiset completo (erros incluídos).
Fixa 17 dos 19 códigos de G4. Ficam `non-ascii-whitespace` e
`unknown-frontmatter-key` (só parser markdown, item do BACKLOG "lint file
for the Markdown side only"); `conflicting-accept` e `json-syntax-error`
vão em G20. Falta mdq-js (corpus novo).

## G3: `.lint.json` obrigatório em todo válido

Feito. Convenção nova: todo exemplo válido tem `.lint.json`; documento limpo
fixa `[]` (antes, arquivo ausente = zero diagnósticos, o que não fixava
nada). 35 arquivos `[]` novos (33 fora de `exam/bank/` + 2 no bank).
`tests/test_lint_corpus.py` exige o arquivo; `scripts/lint_snapshot.py`
escreve `[]`. Bug latente do script corrigido: `.lint.json` termina em
`.json` e era lido como documento (gerava `foo.lint.lint.json`; antes
mascarado porque só produzia erros, filtrados). Spec
`dev/specs/to-review/loading-module.md` "Expected lint files" atualizada.
Falta mdq-js (teste de corpus equivalente).

## G14: tabelas de grading

Feito. MC ganhou as 4 linhas que faltavam da tabela do spec (clamp inferior
e superior). MS e TF reescritos com as 6 linhas da tabela × 3 estratégias,
mais casos de 3 alternativas (frações) e `null` explícito em TF; tudo bateu
com a implementação. Novos `numeric.yaml` e `short-answer.yaml`
(`question:` com os campos do YAML, `examples: [{response, score}]`, score
`"malformed"` → `ResponseError`, `"pending"` → `NotAutoGradable`).
`tests/test_grading_examples.py` lê os 5 arquivos (205 casos).

Bugs achados: (1) resposta decimal em questão `integer` era pontuada 0 em vez
de malformada (responses.md "Numeric") → `numeric_matches(domain=)`,
`effective_domain` em NumericQuestion e no blank; um teste antigo fixava o
comportamento errado, corrigido. (2) `NumericResponse` não incluía `str` e o
fill-in rejeitava `"1/3"` → ampliado. Três expectativas minhas erradas no
numeric.yaml, corrigidas pelo spec: domínio decimal arredonda a
`decimalPlaces` inferido antes da tolerância (`1/3 +- 0.01` → 0.33; `0 +-
0.5` → 1 casa; `5` com `domain: decimal` → 0 casas).

Fora: `{value, unit}` não existe no mdq-py (BACKLOG); ordering, fill-in e
penalidade de exame com `null` vs `{}` (BACKLOG). Falta mdq-js (ler os 5
arquivos).

## G1 (parte), G6, G8, G9: choices e elementos proibidos

Feito. 34 exemplos novos (MC 8 válidos + 3 inválidos; MS 4 + 1; TF 12 + 7;
essay 7 + 10). CH-G17 descartado: S13 removeu o stem `...`; a skill
`skills/mdq-questions` ainda ensinava isso, linha removida. CH-G19/G20
já estavam cobertos pelos I-itens. `multiple-choice-two-checkbox-lists`: o
parser toma a primeira lista `[ ]` como corpo e a segunda cai no epílogo
como `forbidden-block-element`; aceito (erro de qualquer forma).

Bugs corrigidos:
- `id` de choice/blank sem padrão SLUG no modelo (schema tinha `pattern`):
  `SlugId` em `_base.py`, usado nos 3 choices e nos 3 blanks.
- Heading ATX em preamble/stem/epilogue/answerKey perdia os `#`
  (`raw_text` tira os marcadores para detectar `## [answer-key]`); novo
  `block_text` mantém o markup nos campos. Com isso `## [Rubrica]` vira
  `forbidden-block-element`.
- `is_exam` aceitava H1 em qualquer lugar: `Pre / # H1 / ...` carregava
  como exame sem questões. Agora só a primeira linha não vazia após o
  frontmatter (exam.md "The title").
Falta mdq-js (três correções + corpus).

## G10: short-answer

Feito. 10 válidos (`accept-and-reject-blocks`, `regex-flags-f-b`,
`literal-asterisk`, `exact-with-spaces`, `regex-subset`,
`frontmatter-accept`, `diacritics-keep-mixed`, `diacritics-fold-explicit`,
`inline-id-and-indented-tag`, `ignored-regex-flag-in-reject`,
`redundant-regex-anchor-cases`) e 16 inválidos (backtick parcial, regex sem
fechar em 3 posições, linha vazia, `conflicting-accept` ×3 incluindo o
caso TX-G14 de `[short-answer]: X` + frontmatter `accept`, bloco
`preAccept`, blocos repetidos ×3, 4 construções de regex fora do subset).
TX-G5 (curinga) descartado: `*` não é curinga no spec atual (R2), é literal.
TX-G21 descartado (S13). TX-G20 fica para G5/G20.

Bugs corrigidos: (1) conteúdo que abre com backtick sem fechar o span era
aceito como literal inexato; regra no schema `patternString` (vira
`schema-error`) e no modelo `AnswerPattern`; teste antigo
`leading-backtick` removido. (2) item `*` vazio em lista de padrões era lido
como continuação do item anterior (`LIST_ITEM_START_RE` exigia espaço após
o marcador); agora é item vazio → `parse-error`. Decisão TX-G14: spec já
diz que `[short-answer]` com conteúdo + `accept` no frontmatter é
conflito; pinado como `conflicting-accept`. Falta mdq-js.

## G11: fill-in

Feito. 11 válidos md + 3 YAML de lint por tipo de blank (todos os 17
códigos de TX-G34 fixados), 13 inválidos md (mais
`fill-in-unit-on-short-answer-tag`, irmão md do YAML existente com outro
diagnóstico: `parse-error` vs `schema-error`). `mixed-blanks` reordenado
(TX-G24). TX-G22 (blank aberto): representação atual é blank sem `accept`,
sem diagnóstico; fixado como válido.

Bugs corrigidos: (1) `_BLANK_MARKER_RE` (`_base.py` e `_markdown.py`)
aceitava qualquer coisa entre `[^` e `]`; agora SLUG. Teste antigo
`test_inline_blank_type_is_stripped_from_the_marker` (`[^size/numeric]` no
stem) invertido: spec não tem kind no marcador do stem. (2) Blank em code
span não era reportado ("literal") mas contava como referência: agora
`misplaced-blank` (estratégia "reject", a mensagem já dizia isso). (3)
`[^id]:` + linha em branco + lista era aceito; agora `parse-error`
(fill-in.md "Multiple choice blanks"). Heading com `[^id]` no preamble:
fica como texto, blank vira `unreferenced-blank`; aceito. Falta mdq-js.

## G12: numeric

Feito. 19 válidos md + 5 YAML de lint, 12 inválidos md + 2 YAML
(`numeric-unit-with-space-field.yaml` renomeado para não colidir com o md de
mesmo stem, que dá `parse-error` em vez de `schema-error`). NO-G12 (NBSP)
fica para G5/G20. NO-G8: `"4/2"` com `domain: integer` não dá
`answer-outside-domain` mas dá `domain-mismatch` (fração é mais larga que
inteiro, [^3]); fixado assim.

Bugs corrigidos: (1) `3.14 +- 5% +- 10%` aceito, última vencia →
`parse-error`. (2) `Tolerance` sem `ge=0` no modelo (schema tem
`minimum: 0`). (3) `domain: decimal` no frontmatter + `[numeric]: 26` não
carregava `decimalPlaces` inferido (spec: "the parsed document carries the
inferred value"); `_parse_numeric_expression` sempre calcula as casas
escritas e o chamador as mantém quando o domínio efetivo é decimal. Falta
mdq-js.

## G13: ordering (+ NO-S8)

Feito. 20 válidos md, 7 inválidos md, 8 YAML de schema, 1 model-only.
NO-G25 já decidido (item de uma linha); NO-G26 (reject igual ao gabarito)
sem código, fica; NO-G27 (grading) no BACKLOG.

NO-S8 decidido aqui (A): observações `>`/`!` seguem a gramática do spec
(`observations : feedback comment? | comment feedback?`, sem linha em
branco obrigatória), não a lazy continuation do CommonMark. O parser lê as
linhas cruas dos nós blockquote/parágrafo-`!`: uma linha com prefixo
diferente abre outro bloco; linha em branco fecha o bloco; prefixo
repetido ou intercalado → `parse-error`. Antes `> fb` + `! cm` virava
feedback "fb ! cm" e `>`,`!`,`>` passava.

Outro bug: `OrderingAlternative.lines` sem `min_length=1` (schema tem
`minItems: 1`). Helper `parse_body` de `tests/test_ordering_render.py`
estendido para `~~~`, `-`/`+` e epílogo. Falta mdq-js.

## G15–G19: exame

Feito. 28 válidos md + 3 YAML, 13 inválidos md + 7 YAML + 5 model-only.
EX-G3/G4 já decididos (I5/I14/I15); EX-G22 vai em G20; EX-G23/G24 feitos
em G10/G6. Observações: `start` com `Z` sai como `+00:00` (forma canônica
com offset, fixado); `type: exam` sem H1 dá `schema-error` em `[]`
(mensagem do discriminador, aceitável); `[Prova Final]` no H1 não é slug
(espaço), exemplo `unsafe-id` reescrito com `id` no frontmatter.

Convenção nova (EX-G13/G14): `<exam>.resolved.yaml` ao lado de todo exame
válido com `include`/`include-all`: `questions` (ids após `resolve` contra
`examples/valid/exam/` + `with_ids`) e `diagnostics` do `resolve`; `max`
pega os primeiros candidatos. Teste `tests/test_exam_resolution_corpus.py`
exige o arquivo. Coletores (`_corpus.collect_files`, `lint_snapshot`)
ignoram o sufixo. Spec `dev/specs/to-review/loading-module.md` atualizada.
7 fixtures, conferidas à mão (`include-all` dá `q4`, EX-G14).

Bug corrigido: `schema-error` em união simples (`grading`) vazava labels
do pydantic no path (`["grading", "literal[...]"]`) e gerava um
diagnóstico por membro; `_strip_discriminator_tags` descarta labels e
`_pydantic_diagnostics` deduplica por (code, path). Falta mdq-js.

## G5, G7, G20 e essay (EB-G1–G15, G32–G40, EX-G22)

Feito. 36 válidos md + 10 YAML em essay (mais `short-answer/nbsp-on-tag-line`),
19 inválidos md, 9 YAML/JSON, 1 model-only. Diretório novo
`examples/invalid/syntax/` para o que não é documento (JSON quebrado, chave
repetida em JSON, lista no topo): `_corpus.INVALID_SYNTAX`, fora dos testes
de schema, dentro do teste de `.lint.json`. BACKLOG: item "lint file for
the Markdown side only" removido; o par md/yaml já compartilha o
`.lint.json` e o lado YAML ignora os `PARSER_ONLY_CODES`, então
`non-ascii-whitespace` e `unknown-frontmatter-key` ficaram fixados.

Decisões: EB-S4 (answerKey em branco): prosa vence, schema relaxado
(`blank-text-field` warning, como `title`). `tags: "a, , b,"` descarta
vazios (vírgula final inofensiva), fixado. U+000C dentro do frontmatter é
inválido pelo próprio YAML; exemplo só com U+000C no parágrafo.
`locale: no` é string em YAML 1.2 (norueguês), exemplo válido.

Bugs corrigidos: `weight: "2"` aceito (strict); tags repetidas aceitas
(`uniqueItems`); lista no topo dava `schema-error` em vez de
`invalid-document`; segundo `## [answer-key]` engolido; `#` sozinho não
guardava `comment: ""`. Testes de varredura ajustados
(`test_example_pairs`, `test_unknown_frontmatter_keys`) para exemplos que
fixam `unknown-frontmatter-key` e para tags com entradas vazias. Falta
mdq-js.

## Port mdq-js (2026-10-08)

Feito no mdq-js tudo que as seções acima marcam "Falta mdq-js" na camada de
schema (Zod) e de parser: S1, D11 (só schema), O6 (não; é scoring), P1
(não; scoring), R2/TX-S16 (parser), F1, S2/S3, O1, O4, S8/O19, O5 (não;
scoring), S7/O10 (parser: `decimalPlaces`), S10 (não; scoring), S13
(schema), O17 (não; lint), O18 (parser e schema; `effective_*` fica para
F5), O14 (parser: `setext-heading`), M15, I2, I6 (parser), I7, I8a, I8b
(schema), I13 (parser mantém o valor; código fica para F5), I15 (bloco
`---` com YAML quebrado), G6/G8 (três correções), G10, G11, G12, G13 +
NO-S8, G15–G19 (parser; `.resolved.yaml` fica para F4.1), G5/G7/G20
(parser e schema). Lint e scoring não existem no mdq-js: ver
`mdq-js/docs/sync/roadmap.md`.
