---
type: spec
status: review
tags: [mdq, short-answer, fill-in, patterns, unicode, inexact]
relatedTo: [dev/audit/plan.md, docs/references/patterns.md, docs/references/inexact-tables.json, examples/matching/inexact.yaml]
---

# Comparação inexata: algoritmo exato (O6)

Achado O6 da auditoria: `patterns.md` dizia "ignora caixa, tira diacríticos,
troca `/\s+/` por espaço", sem algoritmo. `\s` diverge entre Python e JS.

## Decisões

- D1. Letras sem decomposição (`ø`, `đ`, `ł`, `æ`, `þ`...): tabela das seções
  de letras do CLDR `Latin-ASCII` (309 entradas).
- D2. Case folding completo (`CaseFolding.txt`, C+F) por tabela gerada, com
  versão fixa. Sem a dep `unicode-case-folding`: correta, mas 8,7 kB gzip
  contra 1,5 kB de tabela comprimida, sem versão fixa, um mantenedor.
  `str.casefold()` do Python 3.13 (Unicode 15.1) diverge em 76 code points.
- D3. Remover antes de comparar: controles C0/C1 que não são `UNICODE_SPACE`
  e `Default_Ignorable_Code_Point`. U+001F não é espaço.
- D4. Aspas e hífens tipográficos viram ASCII (seções "Quotes" e "Dashes" do
  `Latin-ASCII`) mais U+2212.
- Decididas pelo agente: flag `n` de regex remove só marcas (`æ`→`ae`
  mudaria o regex); literal exato apara só `UNICODE_SPACE`; versões fixas
  Unicode 18.0.0 e CLDR 48; `NFC` depois do case folding.

## Algoritmo

1. NFKC.
2. Remove ignoráveis (tabela `ignorable`).
3. Só com `fold`: NFD, remove `Mn`, NFC, tabela `letters`.
4. Tabela `punctuation`.
5. Tabela `caseFolding`, depois NFC.
6. Sequências de `UNICODE_SPACE` viram um U+0020; trim.

## Feito

- P1 (decisão do humano): literal exato MUST normalizar para NFC, depois
  aparar `UNICODE_SPACE`. Vetores em `examples/matching/exact.yaml` (17),
  testes em `mdq-py/tests/test_exact_comparison.py`.

- `docs/references/patterns.md`: seções "Inexact literals", "Diacritics",
  "Exact literals", flag `n`.
- `scripts/inexact_tables.py` (+ teste) gera
  `docs/references/inexact-tables.json` e as cópias em `mdq-py/mdq/` e
  `mdq-js/src/`. CI roda `--check`.
- `examples/matching/inexact.yaml`: 40 vetores compartilhados.
- Changelogs, skill `short-answer.md`.
- mdq-py: `normalize_text` em `models/_text.py` segue os seis passos e lê
  `mdq/inexact-tables.json`; literal exato apara só `UNICODE_SPACE`. Testes em
  `tests/test_inexact_comparison.py` (802 casos).

## Pendente

- Port para mdq-js (tabela de casefold comprimida no build).
- Em aberto: remoção de `Mn` vale para toda escrita (em devanágari remove
  sinais de vogal); quem precisa usa `diacritics: keep`.
