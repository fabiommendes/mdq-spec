---
type: decision-log
status: done
tags: [spec, audit, true-false]
relatedTo: [docs/audits/spec/findings.jsonl, docs/question-types/true-false.md]
---

# Decisões da auditoria de true-false

Aplicar no spec ao fim da rodada de decisões.

- D2.1 (F6): (a) NFKC + casefold no valor de todo marcador de choice, antes
  da inferência de tipo. `[Ｆ]` é FALSE, `[Ｘ]` é `x` (multiple selection).
  `marker` guarda o caractere original. Muda o mdq-py.
- D2.2 (F15): (a) terminais `TRUE_LETTER`, `FALSE_LETTER`, `WARNING_LETTER`
  no snippet de `value`, sobre o valor normalizado. Tabela da prosa fica como
  explicação.
- D2.3 (F16, F17): (a) `LETTER` = General_Category Lu/Ll/Lt/Lm/Lo numa versão
  recente do Unicode, exceção declarada ao dialeto de regex em grammar.md;
  implementações MAY divergir em letras recém-atribuídas. mdq-py passa a usar
  `unicodedata2` (hoje `>=17,<18`, acompanha o Node LTS) para categoria e
  NFKC; casefold vira `lower()` ASCII após NFKC (varredura: nenhum não-ASCII
  dobra para t/v/s/f/x). mdq-js assume o Unicode do motor.
- D2.4 (F20): `LETTER` = Lu, Ll, Lt, Lo (sem Lm). `[ˇ]`, `[ー]` viram
  `foreign-choice-marker`.
- D2.5 (F5, F23): validade no texto escrito (1 code point em `LETTER`),
  significado no NFKC + lower ASCII. `E`+U+0301 continua inválido, U+0958
  continua válido. Info `non-nfc-true-false-marker` vira
  `non-nfkc-true-false-marker` ("not its own NFKC form; read as X"); renomear
  `examples/valid/true-false/non-nfc-marker`. Cobre `Ｆ`, U+212B, `ſ`.
- D1 (F1): (c) enum de `grading` por tipo + tabela de correspondência do
  `grading` escalar do exame. MC: partial, symmetric (perde all-or-nothing).
  MS: partial, all-or-nothing, symmetric. TF e fill-in: partial, no-mistakes,
  all-or-nothing, symmetric. Exame: partial, no-mistakes, all-or-nothing,
  symmetric; no-mistakes -> MC partial, MS all-or-nothing; all-or-nothing ->
  MC partial. TF all-or-nothing = 1 ou 0 (abstenção é erro); TF no-mistakes =
  regra antiga. Fill-in no-mistakes: 0 se algum blank preenchido tiver score
  < 1, senão a média (vazio = 0). Delegado a um implementer (spec + mdq-py).

- D3 (F2 F3 F4, F39): mismatch só para letra TRUE/FALSE que não é `t`/`f`
  nem a letra da linha do locale; T/F canônicos em todo locale (locale é
  metadado). WARNING só `unlisted`. SHOULD. `id` fora da tabela. Writer sem
  `marker` SHOULD escrever T/F. APLICADA (pytest 9050 passed).
- D4 (F24 F26 F27 F28 F29): APLICADA. Só spec/schema/corpus; mdq-py já
  conforme. pytest 9053 passed.
- D5: tabela de locale com as 13 línguas do anexo + `it` e `ko` (nota O/X em
  ko/ja). Linha `id` entra (só T/F). Colunas viram listas de aceitos.
- D6.2 (a): pesquisa de conflitos em ~30 línguas (subagente,
  `dev/audits/true-false-letters-research.md`), promover letras sem conflito.
- D6.1 (a): manter WARNING. A linha do locale aceita iniciais de verdadeiro
  que são WARNING (W em de) sem warning; sem locale, warning (ambiguidade:
  W = wrong). Iniciais de falso com conflito: warning dedicado (generalizar
  `false-friend` para pares locale/letra).
- D6.3: linhas `it`, `ko`, nota O/X.
- D7: S sai de TRUE (vira WARNING). Critério: letra global só sem conflito na
  prática (romanização sozinha não conta). TRUE: T V B D Đ 对 對 真 是 В 참 ص
  स স ब ఒ ச ถ સ. FALSE: F M 错 錯 偽 非 Н 거 خ غ ग ম च త த ผ ખ. Anexo
  reescrito com a pesquisa (`dev/audits/true-false-letters-research.md`).
  NFKC preserva cirílico (Н != H); confusables ficam fora (F13 info).
- D8 (a): tabela de locale com 27 linhas (aceitos, false friends), aprovada.
  APLICADA (pytest 9192 passed, spec_audit 14/14).
- D9 (a) uniform mantido + prosa; D10 (a) null = abstenção, não booleano =
  malformado (TF e MS); D11 (a) blocos extras = parse-error, "choice com
  blocos" no BACKLOG; D12 judged correctly/wrongly/abstenção. Mecânicas e F40
  junto. APLICADAS (pytest 9248 passed). Issues: dev/issues/tf-response-unknown-id.md,
  dev/issues/ms-response-mapping-api.md.

## Estado

- D1 APLICADA (spec, schema, corpus, skills, mdq-py, changelogs, port notes).
  spec_audit 14/14, pytest 8974 passed. Sem commit.
- D2.1 a D2.5 APLICADAS (implementer; spec_audit 14/14, pytest 9025 passed).
  `git mv` deixou rename staged no índice.
- Pendentes de decisão: D3 (locale mismatch, I3), D4 (campo `marker`, I4),
  I5 (uniform answers), I6 (null em responses), I7 (blocos extras no item),
  I8 (judged correctly / valor sem ws), I9 (corpus), correções mecânicas
  (F8 F9 F10 F11 F30 F31 F32 F33 F35 F36 F37 F41).
- Issue mdq-py: `dev/issues/foreign-marker-message-drops-spaces.md` (B3).
