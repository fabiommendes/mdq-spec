---
type: handoff
status: open
tags: [mdq-js, port, auditoria-spec]
relatedTo: [docs/references/choices.md, mdq-py/CHANGELOG.md]
---

# Mudanças do mdq-py a portar para o mdq-js

O port fica para o final, depois da auditoria de todos os tipos de questão.
Cada auditoria acrescenta uma seção aqui.

## Auditoria de multiple-selection (2026-10-15)

Ver `mdq-py/CHANGELOG.md` [Unreleased] e `mdq-py/tests/test_choice_items.py`.

- C1. Item que começa com `[...](` ou `[...][` não é choice. Lista de links é
  válida no preâmbulo, stem e epílogo; parágrafo, heading ou item que começa
  com link não é `forbidden-block-element`.
- C2. Definição de referência (`[ref]: url`) que não é tag MDQ não é parágrafo
  proibido.
- C3. Warning novo `stray-choice-marker`, um por item, path no campo
  (`["epilogue"]`), também no nível do modelo (YAML/JSON).
- C4. Dois blocos de feedback ou de comentário são `parse-error`, mesmo
  separados por linha em branco ou por bloco do outro tipo. Vale para choices,
  lacunas de escolha, itens de padrão e ordering.
- C5. Linha que abre bloco (`- x`, `# h`, fence, linha horizontal, `1.`) depois
  do texto de uma choice, ou segundo parágrafo, é `parse-error`.
- C6. Linha só com `>` ou `!` vira `\n\n` no valor.
- C7. Indentação relativa ao conteúdo do item (coluna do markdown-it):
  `>`/`!` com 4+ colunas é continuação; `*      [x] Rio` é bloco de código;
  `[x]  [id]` com vários espaços reconhece o id.
- C8. Inferência de tipo: regra 4 é "otherwise: multiple selection"; `[]` é
  `parse-error`.

## Estratégias de grading por tipo (2026-10-16)

Ver `docs/exam.md` (Grading), `schema/*.yaml`, `mdq-py/CHANGELOG.md`
[Unreleased] e `mdq-py/tests/test_inherited_grading.py`.

- G1. `grading` de questão é um enum por tipo (mais `inherit`): MC
  `partial|symmetric`; MS `partial|all-or-nothing|symmetric`; TF e fill-in
  `partial|no-mistakes|all-or-nothing|symmetric`. MC com `all-or-nothing` e MS
  com `no-mistakes` são `schema-error`. Tipos e bundle do schema
  (`mdq.schema.json` é regenerado pelo `spec_audit`).
- G2. TF `all-or-nothing`: 1 só se todo item for julgado certo; abstenção conta
  como erro. A regra antiga (0 se algum julgado errado, senão certos/total) é
  `no-mistakes`.
- G3. Fill-in `no-mistakes`: 0 se algum blank preenchido pontua < 1 (inclui
  escolha com 0.5 explícito); senão média dos blanks, blank vazio vale 0 e não
  é erro.
- G4. `grading` escalar da prova é traduzido por tipo (tabela em
  `docs/exam.md`): `no-mistakes` vira `partial` em MC e `all-or-nothing` em MS;
  `all-or-nothing` vira `partial` em MC; o resto é identidade. Em `gradingFor`
  (equivalente de `Exam.grading_for`) e em `resolveQuestion`.
- G5. Forma de mapa da prova: cada valor é do enum do tipo da chave, sem
  tradução; valor fora do enum do tipo é `schema-error`. Chaves ausentes
  continuam `symmetric`.
- G6. Corpus novo: `examples/valid/{true-false,fill-in,exam}/grading-no-mistakes.*`,
  `examples/invalid/multiple-choice-grading-all-or-nothing.*`,
  `examples/invalid/multiple-selection-grading-no-mistakes.*`. Mudou
  `examples/grading/true-false.yaml` (casos `no-mistakes`; `all-or-nothing`
  novo) e `examples/grading/multiple-choice.yaml` (sem `all-or-nothing`).

## Letras e normalização de marcadores (2026-10-16)

Ver `docs/references/choices.md` (Choice marker), `docs/references/grammar.md`
(Tokens, `LETTER`), `docs/question-types/true-false.md` (Body) e
`mdq-py/CHANGELOG.md` [Unreleased]. Código em `mdq-py/mdq/_letters.py`.

- L1. Valor normalizado de todo marcador (todos os tipos de choice): NFKC e
  depois minúsculas só ASCII (A-Z). Em JS: `value.normalize('NFKC')` e um
  replace `/[A-Z]/g`; não usar `toLowerCase()`. Inferência de tipo, regra
  `value` de cada tipo e significado usam o valor normalizado. `[Ｘ]` é `x`,
  `[＊]` é `*`, `[Ｆ]` é false. `marker` guarda o caractere escrito.
- L2. `LETTER` = 1 code point com General_Category Lu, Ll, Lt ou Lo (sem Lm).
  Em JS: `/^[\p{Lu}\p{Ll}\p{Lt}\p{Lo}]$/u`. Usa as tabelas Unicode do motor; pode
  divergir do mdq-py em letras de versões recentes (permitido pelo spec).
- L3. Validade é medida no texto escrito (1 code point em `LETTER`, antes da
  normalização). Significado é medido no valor normalizado. `E` + U+0301 (2
  code points) segue inválido; U+0958 (1 code point, Lo) segue válido.
  Contar code points, não unidades UTF-16.
- L4. `[ˇ]` e `[ー]` (Lm) viram `foreign-choice-marker` no Markdown e
  `malformed-true-false-marker` no modelo. `Ｘ` no modelo TF é
  `reserved-true-false-marker`.
- L5. Se o NFKC de uma letra tem mais de 1 code point (`ﬁ`), ela é WARNING.
- L6. Lint `non-nfc-true-false-marker` renomeado para
  `non-nfkc-true-false-marker` (info). Dispara quando o marcador escrito difere
  do seu NFKC. Mensagem: "<marcador> is not its own NFKC form; read as <X>".
  Cobre `Ｆ`, U+212B, `ſ`. Marcadores de locale e `S` sob `id` comparam o valor
  normalizado.
- L7. Corpus: `examples/valid/true-false/non-nfkc-marker.*` (renomeado),
  `examples/valid/true-false/fullwidth-marker.*`,
  `examples/valid/multiple-selection/fullwidth-x.*`,
  `examples/invalid/true-false-modifier-marker.*`. `non-bmp-marker.yaml` agora
  usa U+10400 (a negrito matemático normaliza para `T`).

## Regra de locale do true-false (decisão D3)

Ver `docs/question-types/true-false.md` ("Locale") e `mdq-py/mdq/models/_lint.py`
(`check_true_false_markers`).

- M1. `T`/`F` (valor normalizado `t`/`f`) são canônicos em qualquer locale e
  nunca geram `locale-mismatched-true-false-marker`. Antes, `T` sob `pt-BR`
  gerava o aviso.
- M2. Para locale com subtag de idioma na tabela (`en`, `pt`, `es`): letra TRUE
  cujo valor não é `t` nem o TRUE da linha, ou letra FALSE cujo valor não é `f`
  nem o FALSE da linha, gera o aviso. Ex.: `S` ou `真` sob `pt-BR`, `V` sob `en`.
- M3. Letra WARNING gera só `unlisted-true-false-marker`. `id` não está na
  tabela: `S` sob `id` gera só `false-friend-true-false-marker`. Idioma fora da
  tabela: sem aviso.
- M4. Mensagem do aviso: "<marcador> does not fit locale <locale>: use 'V'/'F'
  or 'T'/'F'".
- M5. Serializador sem `marker` escreve `T`/`F` por `correct` (já era assim no
  mdq-py).
- M6. Corpus: `locale-pt-canonical.*` (novo), `locale-mismatch.*` (agora `S`),
  `locale-es.lint.json` (sem aviso).

## Letras do true-false e tabela de locale (2026-10-16)

Ver `docs/question-types/true-false.md` ("Body", "Locale"),
`mdq-py/mdq/_letters.py` (`TRUE_LETTERS`, `FALSE_LETTERS`, `LOCALE_ROWS`) e
`mdq-py/mdq/models/_lint.py` (`check_true_false_markers`). Substitui as regras
M1 a M6 da seção anterior (o item M4 e a tabela `en`/`pt`/`es`).

- N1. Conjuntos globais, sobre o valor normalizado (lowercase só ASCII, então
  letras com caixa fora do ASCII entram nas duas caixas). TRUE: `T V B D Đ`
  e 对 對 真 是 В 참 ص स স ब ఒ ச ถ સ. FALSE: `F M` e 错 錯 偽 非 Н 거 خ غ ग ম च త த ผ ખ.
  WARNING: qualquer outra letra exceto `X`. `S` saiu de TRUE: agora é WARNING
  (continua valendo verdadeiro). O parser (`correct`) e o validador
  `true-false-marker-disagrees-with-correct` usam os mesmos conjuntos.
- N2. Tabela de locale com 27 linhas (`LOCALE_ROWS`): TRUE aceitas, FALSE aceitas
  e falsos amigos (letras que significam falso no idioma, mas verdadeiro no
  global). As letras aceitas podem ser WARNING (`S`, `C`, `W`, `R`, `O`, `K`).
- N3. Ordem das regras, sobre o valor normalizado: 1) falso amigo da linha:
  só `false-friend-true-false-marker`; 2) letra aceita pela linha: nada;
  3) letra WARNING: só `unlisted-true-false-marker` (também sem linha ou sem
  locale); 4) locale sem linha: nada; 5) letra TRUE/FALSE não aceita:
  `locale-mismatched-true-false-marker`.
- N4. Mensagens: falso amigo diz que a letra lê como verdadeiro; mismatched diz
  "use 'T'/'F' or a letter of the locale table".
- N5. Corpus novo: `false-friend-vi`, `locale-pt-cebraspe`, `locale-ru-cyrillic`,
  `locale-de-wahr`, `locale-hi-indic`, `locale-ja-o-marker`. Alterados:
  `global-markers.*` (sem `S`, com `B D M`), `cjk-markers.*` (só letras do `zh`),
  `locale-mismatch.yaml` (agora `B`), `locale-without-expectation.*` (locale
  `nl`, porque `de` agora tem linha).
- N6. Testes: tabela de exemplos parametrizada em
  `mdq-py/tests/test_linter.py::test_locale_marker_rule`.

## Respostas malformadas no verdadeiro/falso

- O1. `TrueFalseQuestion.score_response` (mdq-py) lança `ResponseError` quando
  um valor da resposta não é booleano nem `None` (`"T"`, `1`). `null` e chave
  ausente continuam sendo abstenção. Portar para o scoring do mdq-js.
- O2. Fixture nova em `examples/grading/true-false.yaml`: casos com
  `score: "malformed"` ("Malformed value") e `all-or-nothing` com três
  afirmações ("Three statements"). O runner do mdq-js deve tratar
  `"malformed"` como erro de resposta, como já faz no `numeric`.
- O3. Corpus novo: `valid/true-false/{unlisted-marker-markdown,uniform-false,
  locale-pt-s-marker}` e `invalid/true-false-forced-type-{x,word}-marker`,
  `invalid/multiple-choice-{second-paragraph,code-block,nested-list,
  text-after-feedback}`.
- O4. `uniform-true-false-answers` é reportado em `choices` (antes a tabela do
  spec dizia `choices[].correct`).

## Ids desconhecidos em respostas

- P1. Um id de resposta que não existe na questão é sempre resposta malformada
  (`ResponseError` no mdq-py), nunca ignorado nem pontuado como erro. Vale para
  múltipla seleção (id no conjunto), verdadeiro/falso (chave do mapa) e fill-in
  (chave do mapa de lacunas). Múltipla escolha e a prova (chave de questão
  desconhecida) já eram assim.
- P2. Múltipla seleção: elemento do conjunto que não é string também é malformado.
  A resposta de MS é só o conjunto de ids marcados; nenhum mapa id -> bool.
- P3. Fixtures novas `score: "malformed"` em `examples/grading/true-false.yaml`
  ("Unknown statement id") e `examples/grading/multiple-selection.yaml`
  ("Malformed tick", `ticks` com id desconhecido e com número). O runner do
  mdq-js deve tratar `"malformed"` como erro também em MS.

## Auditoria de short-answer (2026-10-17)

- Q1. Conteúdo de uma linha (`[short-answer]`, `/accept`, `/reject` e
  `[^id/short-answer]`) segue o parágrafo CommonMark. Linha lazy (as que
  `LAZY_START` aceita) continua o padrão, até a linha em branco, também depois de
  tag vazia: `[short-answer]:` + `Brasília` é `accept: [Brasília]`;
  `[short-answer/reject]:` + `Rio` é reject válido. As linhas se juntam com um
  U+0020, qualquer que seja a indentação da continuação (mdq-py:
  `MDQParser._join_content_lines`).
- Q2. Mudança de comportamento: linha que começa com `>` ou `!` (não `![`) logo
  depois do conteúdo é `parse-error`, com mensagem que sugere a forma de lista.
  Antes, `> x` ia para o epílogo e `! x` entrava no padrão (`Brasília ! note`).
  `![` continua sendo continuação (imagem). Tag vazia + `!` também é erro; tag
  vazia + `>` também é erro (J7, antes ia ao epílogo).
- Q3. Sem mudança: item de lista logo depois do conteúdo é `parse-error`;
  heading ATX, cerca, bloco HTML e thematic break encerram o bloco e vão ao
  epílogo. Atenção: `---` logo depois do conteúdo é setext heading no
  markdown-it, não thematic break.
- Q4. Corpus novo: `valid/short-answer/{empty-tag-text-line,
  empty-reject-text-line,heading-after-content}` e
  `invalid/{short-answer-quote-after-content,short-answer-comment-after-content,
  fill-in-short-answer-comment-after-content}`.
- Q5. Gramática: `content` ganhou linhas de continuação (e o literal exato pode
  atravessar linhas), `lazy_content` cobre a linha depois de tag vazia, e
  `pattern_item` agora está em Lark em `docs/references/patterns.md`. O fill-in
  usa as mesmas regras (o terminal `PATTERN` saiu).
- Q6. D2: antes de a regex casar, a resposta vai a NFC e perde os
  `UNICODE_SPACE` das duas pontas; a flag `n` vem depois (patterns.md, "Regex
  subject"). Espaço interior não muda. mdq-py: `RegexPattern._subject`. Antes,
  `/Brasília/` rejeitava `Brasília ` e a resposta em NFD.
- Q7. B3: `[short-answer]: X` + `---`/`===` vira setext heading no markdown-it
  e nenhum corpo é achado. A mensagem do `MissingField` agora diz isso e
  sugere linha em branco (mdq-py: `MDQParser.find_body_start`). Sintaxe igual.
- Q8. Corpus novo: `invalid/short-answer-quote-after-empty-tag`. Vetores novos
  em `examples/grading/short-answer.yaml` ("Regex response preparation",
  "Regex with the f flag and interior spaces").
- Q9. D3 (F11): regex em modo code point e classes explícitas (patterns.md,
  "Code point mode" e "Shorthand classes"). O mdq-js deve compilar sempre com
  `u` (`.` casa um code point, `\u{...}` vale, `i` usa case folding simples).
- Q10. `\d`/`\D` = `[0-9]`; `\w`/`\W` = `[A-Za-z0-9_]`; `\s`/`\S` =
  `UNICODE_SPACE` (traduzir `\s`: o `\s` do JS casa U+FEFF, tirar). `\b`/`\B`
  seguem o `\w` explícito, não o do JS. Atenção a `u`+`i`: em JS `/\w/iu` casa
  `ſ` e U+212A, então a tradução para classe explícita deve evitar isso (por
  exemplo `(?:(?![\u017F\u212A])...)`, ou testar o caractere antes de aplicar
  `i`). Vale também dentro de classe `[...]`. mdq-py: `translate_body` em
  `mdq/models/_regex.py`.
- Q11. Classe abreviada como ponta de intervalo (`[a-\d]`) é `invalid-regex`.
  Vetores novos em `examples/grading/short-answer.yaml` ("Regex dot matches
  one code point" ... "Regex space"). U+212A chega à regex já como `K` (NFC).
- Q12. D4 (F12): a última `/` do padrão fecha a regex, o resto são as flags;
  `/` sem escape no corpo vale (`/a/b/` = corpo `a/b`). Espaços e tabs das duas
  pontas saem antes (hoje o JS deve falhar com `/abc/i `). O mdq-js NÃO pode
  usar o parser de literal RegExp para separar corpo e flags: procurar a última
  `/` na string e só depois montar `new RegExp(corpo, "u")`. Uma única `/` é
  `invalid-regex`. mdq-py: `parse_regex` em `mdq/models/_regex.py`. Corpus:
  `valid/short-answer/regex-unescaped-slash`; vetor "Regex with an unescaped
  slash" em `examples/grading/short-answer.yaml`.
- Q13. D5 (F13): a flag `n` tira diacríticos (NFD, remove `Mn`, NFC) da
  resposta e dos caracteres LITERAIS do corpo da regex (`/água/n` casa `agua` e
  `água`). Um escape de code point (`\uXXXX`, `\xXX`, `\u{...}`) é sempre aquele
  code point e o `n` não o altera (`/\u00e1gua/n` não casa nada). mdq-js: aplicar
  o strip ao corpo antes de compilar, sem tocar nas sequências de escape
  (mdq-py: `RegexPattern.__init__`, `normalize_text`).
- Q14. Lint `info` `unmatchable-regex-escape` (accept, reject, preAccept,
  preReject e blanks do fill-in): sob `n`, um escape cujo code point muda com o
  strip (Mn, ou NFD com Mn, como U+00E1). Um diagnóstico por padrão. mdq-py:
  `_check_unmatchable_regex_escape` em `mdq/models/_lint.py` e
  `escaped_code_points` em `mdq/models/_regex.py`. Corpus:
  `valid/short-answer/unmatchable-regex-escape`; vetores "Regex n strips literal
  diacritics" e "Regex n keeps escapes" em `examples/grading/short-answer.yaml`.
- Q15. D6a (F4): a gramática do `content` é `exact | regex | inexact`;
  `PLAIN_TEXT` não começa com `/`. Regex sem fechamento falha na gramática e o
  código é `invalid-regex`. Sem mudança de comportamento no mdq-py.
- Q16. D6b (F6, F24): padrão sem caractere visível é `blank-text` (error):
  `"   "`, crases com um espaço, U+200B sozinho. Em literal exato, vale o texto
  entre as crases. Vale em toda lista de padrões (corpo, frontmatter, blanks do
  fill-in). `""` segue `schema-error` (`minLength`). mdq-py:
  `AnswerPattern.check_pattern_has_visible_character`. Antes, `"   "` era
  `schema-error` e U+200B passava.
- Q17. D6c (F5): conteúdo que abre com crase e não é um span completo
  (`` `math.isnan` (x) ``) segue `schema-error`, nas duas formas; ganhou linha
  na tabela de short-answer.md.
- Q18. D6d (F8): o `pattern` de `patternString` usa só classes explícitas (sem
  `\s`), alinhado a `EXACT_TEXT` e `PLAIN_TEXT`: nenhum CR/LF no padrão, nenhuma
  crase ou CR/LF dentro do literal exato. Espaço e tab das duas pontas de
  QUALQUER padrão saem antes de classificá-lo: `"  `x`"` é o literal exato `x`
  (antes era `schema-error`). Conversores que geram padrão com quebra de linha
  (importação Moodle) passam a falhar no schema.
- Q19. Corpus novo: `valid/short-answer/exact-leading-spaces`,
  `invalid/model-only/{short-answer-blank-exact-literal,
  short-answer-blank-zero-width-pattern}`.
- Q20. D8/D9: o frontmatter de um `.mdq.md` só aceita os campos da tabela de
  frontmatter do tipo mais os da base (`question-base.md`), mais os atalhos
  (`FRONTMATTER_SHORTHANDS` em `scripts/schema_bundle.py`). Qualquer outra
  chave (campo do corpo ou desconhecida) é erro `invalid-frontmatter-field`,
  `path` = `[chave]`, um diagnóstico por chave, e `load` não devolve documento.
  Vale para perguntas, para o frontmatter da prova e para blocos de pergunta
  dentro da prova (`path` = `questions, i, chave`). YAML/JSON não mudam
  (chave desconhecida segue `schema-error`). O warning `unknown-frontmatter-key`
  deixou de existir (substituído).
- Q21. O mdq-js deve validar o frontmatter com os schemas do bundle
  (`$defs/frontmatter-<tipo>`, um por tipo de pergunta e `frontmatter-exam`),
  gerados por `scripts/schema_bundle.py` a partir das tabelas. mdq-py usa só as
  chaves de `properties` (`mdq/_parser/_frontmatter.py`), os valores seguem para
  o modelo. O bundle em `mdq-js/src/mdq.schema.json` já está regenerado. O
  teste que exige um `$defs` por arquivo de schema deve ignorar as chaves
  `frontmatter-*`. A mensagem diz quando a chave é campo do corpo e mostra a
  sintaxe (`_BODY_SYNTAX` em `_frontmatter.py`).
- Q22. `accept`/`reject` saíram da tabela de frontmatter do short-answer e
  `unit` da do numeric: só o corpo (`[short-answer]`, `[numeric(unit)]`) os
  define. O código `conflicting-accept` foi removido (não existe mais
  `ConflictingAnswerKey`); o `unit` do frontmatter deixou de sobrepor o da tag.
- Q23. Novo warning `redundant-id`: `id` no frontmatter e como slug `[Q1]`,
  com valor igual ou diferente; o frontmatter vence e a mensagem diz isso
  quando diferem. `path` = `["id"]`. Só o parser Markdown o produz (entra em
  `PARSER_ONLY_CODES`).
- Q24. J22: conversores (importação Moodle/GIFT) juntam as linhas de uma
  resposta com um U+0020 (cada quebra de linha mais a indentação da seguinte),
  como a regra de continuação do corpo (mdq-py: `literal_pattern` em
  `mdq/convert/_base.py`). Resolve a nota do Q18 sobre padrões com quebra.
- Q25. Corpus: `valid/short-answer/frontmatter-accept` virou
  `invalid/short-answer-frontmatter-accept` (sem o `.yaml`);
  `valid/essay/unknown-frontmatter-key` virou
  `invalid/essay-unknown-frontmatter-key`; `valid/numeric/frontmatter-unit-wins`
  foi removido (coberto por `invalid/numeric-frontmatter-unit`);
  `invalid/short-answer-conflicting-*` agora esperam `invalid-frontmatter-field`
  (`path` = `[accept]` ou `[reject]`); `valid/short-answer/exact-leading-spaces`
  ficou só em YAML (os espaços não cabem no corpo). Novos:
  `invalid/{numeric-frontmatter-unit,multiple-choice-frontmatter-stem}`,
  `valid/numeric/redundant-id-{equal,different}`. `id-precedence` e
  `inline-id-and-indented-tag` ganharam `redundant-id` no `.lint.json`.
- Q26. D7/D10a (só texto do spec): linhas novas em "Additional Rules" do
  short-answer, nota de que a tabela lista só diagnósticos, e `patterns.md` e o
  schema (`feedback` do padrão) apontam para a regra de seleção de
  short-answer.md "Feedback". Sem mudança de código.
- Q27. D10b: pré-validação (short-answer.md, "Pre-validation"). Inválida =
  casa um `preReject`, ou `preAccept` existe e nenhum casa. Feedback da
  submissão inválida: (1) primeiro `preReject` que casa e tem feedback; (2)
  senão, se nenhum `preAccept` casa, primeiro `preAccept` com feedback (dica de
  formato). Se a regra que vale não acha feedback, nenhum é mostrado (não cai
  na regra seguinte). Válida: sem feedback. mdq-py:
  `ShortAnswerQuestion.prevalidate(response) -> (valid, feedback | None)`,
  `ShortAnswerBlank.prevalidate(response, diacritics=...)` e
  `prevalidate_response` em `mdq/models/_text.py`.
- Q28. D10c: o blank short-answer do fill-in ganha `incorrectFeedback` (campo
  do blank no AST, mesmo sentido do short-answer). No frontmatter do fill-in é
  mapa id do blank -> string (atalho, como `preAccept`/`preReject`; em
  `FRONTMATTER_SHORTHANDS`). Id desconhecido: `undefined-blank` com
  `path = [incorrectFeedback, id]`; id de blank de escolha ou numérico:
  `schema-error`; valor que não é string: `parse-error`; texto sem caractere
  visível: `blank-text`. Pontuação do blank: o `incorrectFeedback` do blank só
  entra quando o blank é incorreto e nenhum padrão deu feedback.
  mdq-py: `_question.py` (`distribute_blank_pattern_lists`), `_fill_in.py`.
- Q29. Vetores: `examples/grading/short-answer.yaml` ganhou a chave opcional
  `feedback` por resposta (string ou null; ausente = não checa) e quatro
  questões novas ("Feedback ...", "incorrectFeedback", "No feedback for a
  pending response"). Arquivo novo `examples/grading/short-answer-prevalidation.yaml`
  (`response`, `valid`, `feedback`). O runner do mdq-js deve ler os dois.
  mdq-py: `tests/test_grading_examples.py`. Corpus novo:
  `valid/fill-in/incorrect-feedback`.
- Q30. D11: a resposta de short-answer, de essay e do blank short-answer do
  fill-in é string. Qualquer outro valor (número, booleano, lista, mapa) é
  `ResponseError`; `""` e só espaços são avaliados normalmente (não são pulo,
  só `null` é). mdq-py: `check_text_response` em `mdq/models/_text.py`, chamado
  por `ShortAnswerQuestion.score_response` e `EssayQuestion.score_response`
  (essay: a checagem vem antes do `NotAutoGradable`). O fill-in já checava.
  Vetores: o score `"malformed"` em `examples/grading/short-answer.yaml`; o
  runner deve esperar `ResponseError` para ele.
- Q31. D12: literal exato é um code span do CommonMark. Abre com N crases e
  fecha com a primeira sequência de exatamente N crases, que deve terminar o
  pattern (depois de remover espaços e tabs das pontas). Sequências de outro
  tamanho dentro são texto. Conteúdo que começa e termina com espaço (e não é só
  espaço) perde um espaço de cada ponta; depois disso valem NFC e o trim de
  `UNICODE_SPACE` de sempre. mdq-py: `mdq/_exact.py` (`exact_literal`,
  `exact_span`), usado por `AnswerPattern` (`matches`, `blank-text`) e por
  `convert/_base.py` (`literal_answers`).
- Q32. D12: pattern que abre com crase e não é literal completo é
  `schema-error` (`` ``x` ``, `` `a` b` ``). O JSON Schema (`patternString`)
  não compara o tamanho das sequências (precisa de backreference), então só
  exige abrir e fechar com crase; o modelo checa o resto. Por isso o exemplo
  `invalid/model-only/short-answer-fence-mismatch` é válido no schema. No
  mdq-py a mensagem do erro é própria e o tipo pydantic é `schema-error`; o
  port deve reportar o mesmo código no mesmo `path` (`[accept, 0]`).
- Q33. D12: o parser do `.mdq.md` não muda; a linha da tag chega crua e o
  pattern é classificado pelo modelo. A gramática trocou `"`"` por `FENCE`
  (`/`+/`) e `EXACT_TEXT` aceita sequências internas de crases. Corpus novo:
  `valid/short-answer/exact-backtick`, `exact-backtick-run`. Vetores novos em
  `examples/grading/short-answer.yaml` ("Exact literal with a backtick" e
  similares).
- Q34. D13a: o `grading` do exame não vale para short-answer, numeric, essay e
  ordering, e o mapa `grading` não aceita chave desses tipos (`schema-error`,
  o schema já fazia). Só texto e a `description` do schema. Corpus novo:
  `invalid/exam-grading-short-answer-key`. D13b: cinco entradas no
  `GLOSSARY.md`, sem efeito no código.

## Auditoria de numeric (2026-10-20)

- N1. Aritmética exata (D1): usar `fraction.js` 5.x (BigInt) para answer,
  resposta e tolerâncias. Ler número com `String(x)` (a forma decimal mais
  curta que volta ao mesmo double; mdq-py: `Fraction(repr(x))`) e passar ao
  `Fraction`. Arredondar (half away from zero) e testar a tolerância em
  racionais, nunca em `number`.
- N2. Tolerância relativa: usa o answer antes do arredondamento
  (`|answer| × relative`); as tolerâncias não são arredondadas.
- N3. Inferência a partir de YAML/JSON: string pela grafia; número pela forma
  `String(x)`, mas valor inteiro (`5`, `4.0`) é `integer` com 0 casas. JS não
  distingue `4.0` de `4`, então nada a fazer além de checar
  `Number.isInteger`. mdq-py: `_written_places` e `_infer_numeric_domain`.
- N4. Respostas por domain (D3, tabela em `docs/responses.md`): inteiro decide
  pelo valor (`4.0`, `"4.0"`, `"4/2"` valem); fração em questão `decimal` é
  malformada; não finito e `boolean` são malformados em todo domain. String de
  resposta é exatamente `sign? value` (regex ancorada nas duas pontas, sem
  `trim`, sem expoente, sem vírgula). Número JSON com expoente vale. mdq-py:
  `_response_value`, `parse_numeric_string`. O "sem expoente" foi trocado em
  N13: a string de resposta aceita expoente.
- N5. Unidade (D2): a resposta pode ser `{value, unit}`. Unidade igual à
  declarada (`normalize("NFC")` nas duas) ou ausente vale; outra, ou unidade
  numa questão sem unidade, é `ResponseError`. Chaves além de `value` e `unit`,
  ou sem `value`, também. Sem conversão.
- N6. A unidade da tag é texto-fonte, sem markdown inline: `[numeric(m\*s)]`
  tem unidade `m\*s`. Vale para o blank `[^id/numeric(...)]`.
- N7. `answer` e tolerâncias têm de ser finitos: `malformed-numeric-answer`,
  caminho `answer` ou `tolerance.absolute`/`tolerance.relative`. O schema não
  expressa (JSON não tem infinito), então é regra do modelo. Corpus:
  `invalid/model-only/numeric-{infinite-answer,nan-answer,infinite-tolerance}`.
- N8. Vetores novos em `examples/grading/numeric.yaml` (só questões novas,
  nenhuma alterada). O runner precisa aceitar resposta `{value, unit}`, `.inf`
  e `.nan` do YAML, e `unit` na questão. O cabeçalho do arquivo mudou.
- N9. Diagnósticos (D4): `answer-outside-domain` cobre `integer` (valor não
  inteiro) e `fraction` (nem inteiro nem string de fração: `0.75`, `"0.75"`);
  `"4/2"` vale nos dois. `domain-mismatch` só para `tolerance.absolute`
  decimal (número de valor não inteiro) sob `integer` ou `fraction`, caminho
  `domain`. `missing-tolerance` só quando o domain efetivo (declarado ou
  inferido, com a tolerância) é `decimal`. mdq-py: `_lint.check_numeric`.
  Atenção: o corpus mudou (11 `.lint.json` reescritos) e o blank do fill-in usa
  as mesmas regras.
- N10. `incorrectFeedback` no numeric (D5): campo do frontmatter e do YAML,
  string com ao menos um caractere visível (`blank-text`). `score_response`
  devolve `[incorrectFeedback]` só quando a nota é 0 e a resposta é bem
  formada; resposta correta, malformada (erro) ou pulada não mostra nada.
  Vetores em `examples/grading/numeric.yaml` ganharam a chave `feedback`
  (runner: checar só quando a chave existe, como no short-answer).
- N11. Fill-in (D6): mapas `domain` e `decimalPlaces` no frontmatter (id do
  blank para valor), sobrescrevem o inferido. Chave que não é blank:
  `undefined-blank` no caminho `[mapa, chave]`; chave de blank que não é
  numérico: o valor vai para o blank e o schema rejeita (`schema-error` em
  `blanks[i].domain`). Valor inválido: `schema-error` no blank. Se o mapa
  `domain` dá `decimal` e `decimalPlaces` falta, as casas vêm do corpo.
  mdq-py: `numeric_blank_maps`, `distribute_numeric_blank_maps`.
  `scripts/schema_bundle.py` ganhou dois atalhos de frontmatter.
- N12. Indentação (D7): o `ws?` no início de um bloco vale até 3 espaços (tab
  expandido para múltiplo de 4). Quatro espaços ou um tab antes de
  `[numeric]:` é bloco de código e o resultado é `parse-error`. O mdq-py já
  fazia isso; só o corpus ganhou exemplos
  (`invalid/numeric-tag-indented-{four-spaces,tab}`, `valid/numeric/tag-indented-three-spaces`).
- N13. Notação científica (D8): `number = (INTEGER | DECIMAL) EXPONENT?`, com
  `EXPONENT = /[eE][+-]?[0-9]+/` (zeros à esquerda valem: `1e05`). Vale no
  valor, na tolerância absoluta e na relativa (Markdown), na string do
  `answer` (padrão do schema) e na string da resposta. Fração não tem expoente
  (`1e3/2`, `1/2e3`: `parse-error` no corpo, `malformed-numeric-answer` na
  string). Domain: grafia com expoente (corpo Markdown ou string) é `decimal`.
  Número JSON não tem grafia: continua pela regra de valor inteiro (`1e22` é
  `integer`, `1.5e-3` é `decimal`). Casas: `max(0, d - e)` com `d` = dígitos
  depois do ponto da mantissa; para número JSON vale a mesma fórmula sobre
  `String(x)`, que usa expoente a partir de 1e21 e abaixo de 1e-6 (`1e-7` dá
  7, `1.5e-7` dá 8; o resultado não depende de onde a plataforma troca para
  expoente). `Fraction` do `fraction.js` lê `"6.022e23"`? Conferir; senão,
  separar mantissa e expoente à mão. Representação: valor com expoente vira
  número se `parseFloat` volta aos mesmos dígitos e a mantissa não termina em
  zero depois do ponto (`1.50e3` fica string); `1e400` fica string. mdq-py:
  `_parser/_numeric.py` (`_NUMBER`, `_is_decimal_spelling`, `_written_places`,
  `_answer_value`), `_lint._infer_numeric_domain`, `models._numeric.
  _written_places`. Risco: `1e999999999` faz `Fraction` alocar um inteiro
  gigante (mdq-py hoje não limita o expoente).
- N14. Grafias rejeitadas (F18): U+2212, `±`, vírgula decimal e separador de
  milhar (espaço, NBSP, U+2009, U+202F entre dígitos) são `parse-error` no
  corpo. A mensagem do mdq-py acrescenta a dica (`use "-"`, `use "+-"`,
  `use "." as the decimal separator`, `remove the digit group separator`),
  checadas nessa ordem. A dica não faz parte do contrato (o corpus só confere
  o código). Corpus: `invalid/numeric-{minus-sign-u2212,plus-minus-sign,
  decimal-comma,digit-group-separator,exponent-without-digits,
  exponent-in-fraction,exponent-decimal-point,malformed-exponent-answer}`;
  `valid/numeric/exponent*` (o antigo `invalid/numeric-exponent` virou
  `valid/numeric/exponent`) e `valid/fill-in/numeric-blank-exponent`. Vetores
  novos e a questão "Response string grammar" mudou (`"1e3"` agora vale).
- N16. Limite do expoente (D9): `EXPONENT = /[eE][+-]?[0-9]{1,3}/`. Valor ou
  tolerância com módulo acima do maior double finito (`1e400`) ou não nulo que
  arredonda para 0 como double (`1e-400`) é malformado: `parse-error` no corpo,
  `malformed-numeric-answer` no `answer` (string e número) e `ResponseError` na
  resposta. Fração: confere numerador e denominador, cada um. Checar a faixa
  antes de qualquer aritmética exata (em JS, `Number(s)` dá `Infinity` ou `0`;
  teste `Number.isFinite` e "mantissa não nula com resultado 0"). Padrão do
  schema com `{1,3}`. Corpus: `invalid/numeric-exponent-too-long`,
  `invalid/numeric-exponent-out-of-range`, `invalid/numeric-malformed-exponent-answer-too-long`
  e `invalid/numeric-answer-out-of-range`; `valid/numeric/exponent-largest-double`.
  Vetores novos em `examples/grading/numeric.yaml` ("Range of a double").
- N15. `incorrectFeedback` no blank numérico (consistência com D5): campo do
  blank no YAML e mapa `incorrectFeedback` do frontmatter do fill-in (id do
  blank para string), como no blank short-answer; blank de escolha continua
  rejeitando (`schema-error`). `score_response`: blank numérico com nota 0,
  resposta bem formada e blank respondido soma `[incorrectFeedback]` à lista
  plana de feedback, na ordem dos blanks. Blank pulado, correto ou malformado
  (erro) não mostra nada. Corpus: `valid/fill-in/numeric-blank-incorrect-feedback`,
  `invalid/model-only/fill-in-numeric-blank-empty-incorrect-feedback`.

## Auditoria de fill-in (2026-10-20)

- FI1. `preamble` sai do formato; `stem` guarda todos os blocos entre a
  frontmatter (ou o slug) e o corpo (um ou mais blocos, ainda obrigatório).
  Tipos: tirar `preamble` de `BaseQuestion`/`QuestionBase` e dos tipos do
  schema. YAML/JSON com `preamble` vira `schema-error`
  (`unevaluatedProperties`); na frontmatter, `invalid-frontmatter-field`.
  Parser: `split_intro` devolve `(stem, slug)`; o stem é a junção de todos os
  blocos antes do corpo, e o `[slug]` inline sai só do primeiro bloco. O
  `setext-heading` colado em um `---` dentro do stem usa o campo `stem` no
  caminho (antes `preamble`). Modelo: `forbidden-block-element`,
  `blank-text`, `unsafe-thematic-break` e `stray-choice-marker` valem só para
  `stem` e `epilogue`; a exceção do `[slug]` no primeiro bloco vale para o
  stem. `normalize_intro` virou `normalize_stem` (reconstrói os blocos do
  stem, sem migrar nada para outro campo); `can_inline_id` recebe só o stem.
  O lint `stem-not-a-paragraph` foi removido (o SHOULD "o stem é um parágrafo"
  saiu). Render: `yield_introduction` escreve só o stem. Show/componentes:
  desenhar só o `stem` (blanks marcados em todo o stem). Conversores Moodle,
  GIFT e Aiken: o texto da questão vem de `stem` (+ `epilogue`), sem
  `preamble`. Fill-in: um blank pode estar em qualquer parágrafo comum do
  stem; `[^slug]` no epílogo continua literal. Estratégias de teste: o `stem`
  gerado passa a ser uma sequência de blocos. Testes: tirar `preamble` dos
  casos, trocar `("preamble",)` por `("stem",)` nos caminhos de lint, apagar o
  teste de `stem-not-a-paragraph`. Corpus: os `.yaml` que tinham `preamble`
  agora têm o texto no `stem` (juntado por uma linha em branco); apagados
  `invalid/model-only/essay-blank-preamble` e `valid/essay/stem-not-a-paragraph`;
  novo `valid/fill-in/blanks-in-two-paragraphs`.

- FI2. Resultado de um `[^slug]` em cada contexto do stem (decisão D1b). Código
  (cerca, bloco indentado, code span) é texto literal: não declara nem
  referencia blank (antes o code span dava `misplaced-blank`). Heading, item de
  lista, célula de tabela, blockquote, ênfase, strong, texto de link e alt de
  imagem: `misplaced-blank`. `[^x](url)` e `[^x][ref]` são links (o regex do
  marcador tem lookahead `(?![(\[])`). O parse inline do parágrafo inteiro vem
  primeiro. Py: `mdq._markdown.find_blank_markers` devolve `(id, misplaced)`
  e `check_blank_markers` usa esse resultado (antes um regex no stem cru, que
  contava marcadores em código). Corpus: `invalid/fill-in-misplaced-blank-code-span`
  virou `valid/fill-in/blank-in-code-span-is-text`; novos
  `invalid/fill-in-misplaced-blank-{list-item,table-cell,blockquote}` e
  `valid/fill-in/blank-link-is-not-a-blank`; todo exemplo com `preamble` no
  nome agora diz `stem` (ex.: `valid/essay/heading-in-stem`).

- FI3. Blank vazio e fill-in pendente (D2). Chave ausente ou `null` é blank
  vazio (nota 0, sem feedback). `{}` tem todos os blanks vazios: nota 0, não é
  skip (só `null` pula). Tipo errado para o blank (número em choice blank, lista
  em short answer ou numeric blank, resposta que não é mapa) é `ResponseError`.
  Pendente: o instrutor pontua cada blank pendente em [0, 1] e a estratégia
  combina; `score_response` lança `NotAutoGradable` depois de checar os outros
  blanks (um `ResponseError` de um blank posterior vem antes do pendente).
  Corpus novo `examples/grading/fill-in.yaml` (formato: `scores` por estratégia
  ou `score` único; `malformed` e `pending`; `feedback` é a lista plana). O
  corpus não expressa a nota do instrutor.

- FI4. Estratégia do choice blank (D3). `partial`, `no-mistakes` e
  `all-or-nothing` pontuam o choice blank com o `partial` do multiple choice
  (escolha sem nota vale 0); `symmetric` com o `symmetric` (nota derivada
  negativa). Antes o py usava sempre 0 para escolha sem nota. Py:
  `unspecified_choice_score` em `models/_choice.py`, usado também por
  `MultipleChoiceQuestion.unspecified_score`.

- FI5. Blocos mínimos de short answer (D9, reverte D4). A questão short-answer
  e o short answer blank precisam de pelo menos um dos blocos `[short-answer]`
  (alias `/accept`) e `[short-answer/reject]`. Só reject é válido: sem
  `accept`, `unmatched` tem default `manual`. Nenhum port para D4: o mdq-js
  não deve rejeitar o blank só com reject. Py: removido o `ParseError` de
  `parse_fill_in_body`. Questão sem bloco nenhum continua `parse-error` (corpo
  ausente, `MissingField("body")`). Corpus: `valid/fill-in/reject-only-blank`,
  `valid/short-answer/reject-block-only`.

- FI6. Referência repetida no stem (D6b). `[^id]` repetido no stem é o erro
  `duplicate-blank-reference`, caminho `["stem"]`. Py: validador
  `check_blank_references_are_unique` em `models/_fill_in.py` (conta os
  marcadores de `find_blank_markers`, depois do `misplaced-blank`; código não
  conta). Corpus: `invalid/fill-in-duplicate-blank-reference`.

- FI7. Parse errors das definições (D6c). Só texto e tabela mudaram, mais a
  mensagem do py para texto na linha da tag de choice (`[^capital]: Brasília`):
  diz que a linha deve ficar vazia e sugere `[^capital/short-answer]:`. Os
  outros casos já eram `parse-error` no py. Corpus novo:
  `invalid/fill-in-choice-text-on-tag-line`,
  `invalid/fill-in-short-answer-list-after-content`.

- FI8. Gramáticas de lista (D7). Sem mudança de comportamento no py. O
  `pattern_item` perdeu `ws? LIST_MARK ws`; `value` do numeric virou
  `numeric_value` (só nome na gramática); trocar o caractere do bullet inicia
  outra lista (markdown-it já faz; teste
  `tests/test_fill_in_blank_references.py`). Comentários do mdq-js que citam
  `sign? value` podem virar `sign? numeric_value`.

- FI9. Definições contíguas (D6a). Uma linha de tag de definição de blank no
  epílogo (`[^id...]:` no início da linha, fora de código em bloco) é o erro
  `detached-blank-definition`, caminho `["epilogue"]`; vale só em Markdown.
  Py: `report_detached_blank_definitions` em `_parser/_question.py`, chamado
  depois de `parse_fill_in_body`; é um diagnóstico de erro do parser, então o
  `load` para antes do modelo e a referência do stem não gera `undefined-blank`.
  Corpus: `invalid/fill-in-detached-blank-definition`.

- FI10. Linhas lazy e literal exato (D8). (1) Sublinhado setext (`=+` ou `-+`,
  até 3 espaços de indentação, espaço/tab no fim) logo depois do conteúdo de
  uma definição short-answer (também do blank `[^id/short-answer]`, depois de
  linhas lazy, e depois do texto de um item de lista de padrão ou de choice) é
  `parse-error`. Depois de linha `>`/`!` do item continua sendo texto. Py:
  `MDQParser.check_no_setext_tag` (olha o nó heading `-`/`=` cuja primeira
  linha é uma tag, em cada laço de blocos do short-answer e do fill-in; antes
  só `find_body_start` via a primeira tag) e `check_no_setext_item` (heading
  filho de um item, em `parse_item_list` e nos itens de padrão). (2) `>`/`!`
  com 4+ colunas de indentação continua o conteúdo: `_is_comment_line` só vale
  com indentação < 4 (o blockquote já era resolvido pelo markdown-it). O
  `LAZY_START` da spec ganhou a alternativa de indentação 4+, e `feedback_line`
  e `comment_line` usam `MARK_INDENT` (1 a 3 espaços). (3) Literal exato não
  abre no fim da linha nem fecha no começo de uma linha de continuação:
  `schema-error`. Py: `mdq._exact.join_pattern_lines` junta as linhas do
  padrão com espaço; no caso inválido junta com `\n`, e
  `AnswerPattern.check_pattern_string` (que já proibia quebra de linha) dá o
  `schema-error` no `accept[i]`. `split_item` recebe `join_text`. YAML, JSON e
  frontmatter não têm quebra de linha, então nada muda. Corpus novo:
  `invalid/short-answer-setext-after-content`, `-setext-after-continuation`,
  `fill-in-short-answer-setext-after-content`,
  `short-answer-exact-opens-at-line-end` (e `-item`),
  `short-answer-exact-closes-at-line-start`,
  `valid/short-answer/indented-quote-continuation`. Ordenação e choice blanks
  do fill-in não passam por `check_no_setext_item` (ver o relatório de D8).
