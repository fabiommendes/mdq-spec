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
