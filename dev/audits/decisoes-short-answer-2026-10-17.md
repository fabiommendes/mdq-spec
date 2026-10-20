---
type: decision-log
status: closed
tags: [auditoria-spec, short-answer]
relatedTo: [dev/audits/spec-short-answer-2026-10-17/, docs/question-types/short-answer.md, docs/references/patterns.md]
---

# Decisões da auditoria de short-answer (2026-10-17)

Relatório: `docs/audits/spec/report.pdf` (32 achados, 9 issues).

## Lote M: correções mecânicas (sem decisão)

F1, F14, F22, F23, F33. Aplicadas; `spec_audit.py` passou. F1 também corrigiu
`accept_def`/`reject_def` em `fill-in.md`. Pendente para a auditoria de fill-in:
`choice_def` e `numeric_def` também não têm `ws?` inicial.

## Decisões

### D1. Linhas depois do conteúdo de uma linha (I1: F2, F9, F3, F7, F28)

Decisão: (a), seguir o parágrafo CommonMark.

- Linhas lazy (as que `LAZY_START` aceita) continuam o padrão, também depois
  de uma tag vazia (`[short-answer]:` + `Brasília` = `accept: [Brasília]`).
- `>` ou `!` (não `![`) logo depois do conteúdo: `parse-error`, com mensagem
  que sugere a forma de lista. Corrige `Brasília ! note` virar padrão.
- Lista logo depois: `parse-error` (já era).
- Heading, cerca, HTML, thematic break: encerram o bloco, vão ao epílogo.
- Motivo de rejeitar (b) (`>`/`!` como feedback do padrão único): não há
  container para ancorar `observations` (indentação, fim do bloco), a linha
  em branco fica ambígua com blockquote do epílogo, o markdown-it entrega `>`
  e `!` de formas diferentes, e o ganho é uma linha. A regra `observations`
  fica restrita a itens de lista e seções.
- A gramática ganha `content` com continuação e `pattern_item` em
  patterns.md, compartilhados com fill-in (que troca `PATTERN` por eles).

Ajustes depois do lote D1:

- J7 (aceito sem objeção): `>` logo depois de tag vazia também é
  `parse-error`, como `!`. O implementer o tinha mandado para o epílogo.
- B3 (anotado, sem mudar sintaxe): `[short-answer]: X` + `---` é setext
  heading; a mensagem "A required field is missing" deve sugerir a causa.

### D2. Preparo da resposta antes da regex (F10)

Decisão: (a). NFC e remoção de `UNICODE_SPACE` das pontas, os mesmos passos
do literal exato. A flag `n` vem depois.

- Motivo: espaço nas pontas e NFD dependem do teclado e do sistema do aluno.
  Quem precisa de espaços específicos quase sempre pergunta sobre
  programação, e pode pedir a resposta em notação de string (`" a "`).

### D3. Modo Unicode e classes da regex (F11)

- D3a: (a) code points, como JS com `u`. `.` casa um code point, `i` usa o
  case folding simples do Unicode, `\u{...}` vale. `u` e `v` seguem aceitas
  e sem efeito. JS compila sempre com `u`.
- D3b: (a) classes explícitas e iguais nos dois runtimes: `\d` = `[0-9]`,
  `\w` = `[A-Za-z0-9_]`, `\b` segue `\w`, `\s` = `UNICODE_SPACE` (sem
  U+FEFF). `/\w+/` não aceita `José`; usar `n` ou classe explícita.

### D4. Delimitadores da regex (F12)

Decisão: (a). A última `/` fecha a regex; `/` sem escape no corpo é
permitida (`/a/b/` tem corpo `a/b`). Espaços e tabs depois das flags são
removidos, como antes da `/` inicial. Escrever explicitamente no spec.
Motivo: URLs e caminhos sem escape; o exemplo `/usr/bin` já supõe isso.

### D5. Flag `n` e escapes (F13)

Decisão (proposta do humano): o `n` remove diacríticos da resposta e dos
caracteres literais do corpo da regex (`/água/n` casa `agua`). Um escape
(`\u00e1`, `\xe1`, `\u{e1}`, `\u0301`) é sempre o code point exato e o `n`
não o altera. Lint `info` `unmatchable-regex-escape`: sob `n`, um escape cujo
code point muda com o strip, e por isso não pode aparecer na resposta.

- Motivo: quem escreve o code point tem uma intenção específica; a regra
  fica simples e nenhum escape muda de significado (`\u002E` segue literal).
  Info e não warning: dentro de uma classe (`[\u00e1a]`) o escape é inócuo.

### D6. Sintaxe do pattern string (I3: F4, F5, F6, F8, F24)

- D6a: `content` ganha `regex` (`exact | regex | inexact`); `PLAIN_TEXT` não
  começa com `/`, então regex sem fechamento falha na gramática.
- D6b: padrão sem caractere visível (definição de grammar.md) é `blank-text`
  (error): `"   "`, crases com um espaço, U+200B sozinho. `""` segue
  `schema-error` (`minLength`).
- D6c: crase incompleta (`` `math.isnan` (x) ``) segue `schema-error`, nas
  duas formas; ganha linha na tabela.
- D6d: schema só com classes explícitas, alinhado a `EXACT_TEXT` e
  `PLAIN_TEXT`; espaço e tab das duas pontas de qualquer padrão são removidos
  antes de classificá-lo (`"  `x`"` é o exato `x`).

### D8/D9. Campos do corpo no frontmatter (vale para todos os tipos)

Levantamento (2026-10-20): só `id` (slug `[Q1]`), `type` (inferido),
`unit` do numeric (`[numeric(kg)]`) e `accept`/`reject` do short-answer
aparecem nos dois lugares. Campos só do corpo (`stem`, `choices`, `answer`,
`blanks`, ...) são descartados em silêncio se escritos no frontmatter.
`unit: kg` + `[numeric(g)]: 10` virava 10 kg.

- `accept`/`reject` saem do frontmatter do `.mdq.md` do short-answer (seguem
  campos do YAML/JSON). `conflicting-accept` deixa de existir. D7a perde o
  sentido: a tag é a única forma de declarar o accept.
- `unit` sai do frontmatter do numeric; só `[numeric(unit)]`.
- Ficam redundantes só `id` e `type`. Mantém "frontmatter vence". `id` nos
  dois lugares gera warning `redundant-id` (com o mesmo valor ou não; a
  mensagem diz qual vence quando diferem).
- J20: `scripts/spec_audit.py` gera, das tabelas de frontmatter, um schema de
  frontmatter por tipo (tabela do tipo + base, `unevaluatedProperties:
  false`) no bundle, e valida o frontmatter de todo `.mdq.md` do corpus.
- J21: chave fora da tabela, campo do corpo ou desconhecida, é erro
  `invalid-frontmatter-field` (um código só, mostra a origem do erro).
- B6 (issue à parte): `type: numeric` com corpo de short-answer dá
  `schema-error` crípticos.

### D7. Additional Rules (I4: F16, F17, F29, F30, F31)

D7a sem efeito (ver D8). D7b-d seguem a recomendação, sem objeção: linhas
para linha de padrão vazia (`parse-error`) e bloco `[short-answer/preAccept]`
(`forbidden-block-element`); `no-correct-answer` com "should not" e frase
SHOULD NOT em Grading; nota de que a tabela lista só diagnósticos; uma frase
na prosa para cada linha sem texto (F31). `automation` no frontmatter passa a
ser `invalid-frontmatter-field`; no YAML segue `schema-error`.

### D10. Feedback (I5: F25, F26, F27, F32)

- D10a: vale a regra do short-answer.md: primeiro padrão que casa e tem
  feedback, na lista que decidiu. patterns.md e schema apontam para ela.
- D10b: (a) submissão inválida mostra o feedback do primeiro `preReject` que
  casa e tem feedback; se nenhum `preAccept` casa, o do primeiro `preAccept`
  com feedback (dica de formato). `preReject` primeiro.
- D10c: blanks short-answer do fill-in ganham `incorrectFeedback` já. Forma
  (escolha do agente, reversível): campo do blank no AST; no frontmatter, mapa
  id do blank -> string, como o atalho de `preAccept`/`preReject`.
- D10d: chave `feedback` nos vetores de grading e arquivo de vetores de
  pré-validação.

### D11. Valor da resposta (F15)

Decisão: (a). A resposta de short-answer é uma string; outro valor (número,
lista, mapa) é `ResponseError`. `""` e uma string só de espaços são avaliadas
normalmente: não são pulo (só `null` é pulo). Quebras de linha são
permitidas. Vai em `docs/responses.md` e nos vetores de grading.

- Motivo de rejeitar a conversão de número: `1.0` e `1` viram textos
  diferentes, e cada runtime formata o número de um jeito.

### D12. Literal exato com crase (F18)

Decisão: (a). O literal exato segue o code span do CommonMark: abre com N
crases e fecha com uma sequência de exatamente N crases. Se o conteúdo começa
e termina com espaço (e não é só espaço), remove um espaço de cada ponta.
`` `` `print` `` `` é o literal `` `print` ``; ```` ```a``b``` ```` é ``a``b``.
Vale no `.mdq.md` e no YAML/JSON (o pattern string é o mesmo).

### D13. Exam e glossário (F20, F34)

- D13a: frase em `docs/exam.md`, seção "Grading", depois do parágrafo da
  tabela: short-answer, numeric, essay e ordering não têm `grading`; o
  `grading` do exame não se aplica a eles; cada um pontua em [0, 1] pelas
  regras do tipo, e `penalty` vale como para os outros; o mapa de `grading`
  não aceita chave desses tipos (`schema-error`, o schema já faz isso). Texto
  curto igual na `description` de `grading` em `schema/exam.yaml`.
- D13b: entradas novas no `GLOSSARY.md`: Pattern, Settled response, Exact
  literal, Inexact literal, Pre-validation.
