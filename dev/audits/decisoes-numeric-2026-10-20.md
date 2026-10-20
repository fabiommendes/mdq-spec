---
type: decision-log
status: closed
tags: [auditoria-spec, numeric]
relatedTo: [dev/audits/spec-numeric-2026-10-20/, docs/question-types/numeric.md, docs/responses.md]
---

# Decisões da auditoria de numeric (2026-10-20)

Relatório: `docs/audits/spec/report.pdf` (27 achados, 8 issues).

## Lote M: correções mecânicas (sem decisão)

F7, F12, F15, F16, F24, F29, mais o `ws?` inicial de `numeric_def` (F13, mesma
regra do F1 da short-answer). Também `choice_def` do fill-in ganha `ws?`
(pendência da auditoria de short-answer).

## Decisões

Aplicado: terminal `DENOMINATOR` em grammar.md; `numeric_def` e `choice_def`
iguais nas duas cópias, com `ws?` inicial. O mdq-py já se comportava assim
(sem mudança de código). Removido `examples/invalid/docs/` (lock vazio criado
por um subagente que rodou `audit-findings` no diretório errado).

### D1. Aritmética exata (I1: F1, F2, F3, F26)

Decisão: (a). Answer, resposta e tolerâncias são racionais exatos. Um float é
lido pela forma decimal mais curta que volta ao mesmo double (`repr` em
Python, `String(x)` em JS): o JSON `2.675` é `2.675`. A inferência de
`domain` e `decimalPlaces` no YAML/JSON usa essa forma, mas um número de
valor inteiro conta como integer com 0 casas (`5` e `4.0`: integer; `3.14`:
decimal, 2 casas), porque JS não distingue `4.0` de `4`. Uma string segue a
grafia (`"4.0"`: decimal, 1 casa). A tolerância relativa usa o
answer antes do arredondamento; as tolerâncias não são arredondadas. O mdq-py
já faz isso (`Fraction(repr(value))`). Port: `fraction.js` 5.x (BigInt) no
mdq-js.

### D2. Unidade na resposta (I3: F5, F11, F17)

Decisão: (a). A unidade da resposta é igual à declarada (string exata depois
de NFC) ou ausente; número sem unidade está na unidade declarada. Outra
unidade é malformada. Conversão é responsabilidade do host, antes da
correção; o mdq não usa biblioteca de unidades. A unidade da tag é
texto-fonte (`[numeric(m\*s)]` tem unidade `m\*s`). Vetores com `{value, unit}`.

### D3. Respostas válidas por domain (I2: F4, F6, F19)

Tabela em `docs/responses.md` (✓ corrigida, ✗ malformada):

| domain   | `5`, `"5"`, `5.0`, `"5.0"` | `5.5`, `"5.5"` | `"1/3"` | não finito |
|----------|----------------------------|----------------|---------|------------|
| integer  | ✓                          | ✗              | ✗       | ✗          |
| fraction | ✓                          | ✓ (nota 0 se ≠)| ✓       | ✗          |
| decimal  | ✓                          | ✓              | ✗       | ✗          |

- Inteiro decide pelo valor: `4.0` (número ou string) vale numa questão
  integer. Motivo: JS não distingue o número `4.0` de `4`
  (`JSON.parse("4.0")` dá `4`), e a nota 3 do numeric.md já lê valores.
  A string `"4.0"` também vale, pela mesma regra (interpretação minha,
  reversível).
- Fração numa questão decimal é malformada: só existe como string, e um
  campo decimal não a produz.
- String de resposta segue `sign? value` (sem expoente nem vírgula); número
  JSON com expoente vale. `answer`, resposta e tolerâncias são finitos.

Aplicado (D1 a D3). Julgamentos do implementer:
- Não finito (answer e tolerâncias) é `malformed-numeric-answer`, exemplos em
  `invalid/model-only/` (o schema não expressa NaN).
- String de resposta não é aparada (`" 5"` malformada) e segue `INTEGER`
  (`"007"` malformada).
- `"4/2"` vale numa questão integer (pelo valor); é malformada numa decimal.
- Também corrigi `mdq-py/tests/strategies/moodle_xml.py`: o filtro de
  `blank-text` usava só Cc/Cf e gerava `'\x7f \x7f'`.

### D4. Diagnósticos de domain e tolerância (I4: F8, F9, F21, F22, F23, F25)

Decisão: recomendação aceita.
- `answer-outside-domain` (warning): answer não inteiro sob `integer` ou
  `fraction`.
- `domain-mismatch` (info): só a tolerância absoluta decimal sob `integer` ou
  `fraction`.
- `missing-tolerance` (info): só domain `decimal`.
- Linhas de warning com "should", não "must".
- Tolerances: tolerância não negativa; `p%` vira `relative: p/100` (já feito
  na D1).
- Answer representation: os SHOULD valem para a saída do parser e não têm
  diagnóstico (nota).

### D5. Feedback no numeric (I5: F10)

Decisão: (a). Campo `incorrectFeedback` (frontmatter e YAML), como no
short-answer e nos blanks do fill-in. `reject` com tolerância fica para o
BACKLOG.

### D6. `domain` e `decimalPlaces` do blank numérico em Markdown (I6: F20)

Decisão: (a). Mapas no frontmatter do fill-in: `domain: {altura: decimal}`,
`decimalPlaces: {altura: 2}`, como `incorrectFeedback`.

### D7. Indentação no início de um bloco (I7: F14)

Decisão: frase em grammar.md: `ws?` no início de um bloco vale no máximo 3
espaços (tab expandido), como em item de lista.

### D8. Grafias de número (I8: F18)

Decisão do humano: notação científica entra já, no formato do número JSON
(`[eE][+-]?[0-9]+` depois de um INTEGER ou DECIMAL: `6.022e23`, `1E-3`,
`2.5e+4`). As outras grafias (U+2212, `±`, vírgula decimal, espaço de milhar)
seguem rejeitadas; o Body as lista, e o `parse-error` sugere a grafia certa.

Detalhes (escolha minha, reversível):
- Vale no valor, na tolerância absoluta e relativa, na string do `answer` em
  YAML/JSON e na string da resposta.
- Domain: um número com expoente é `decimal`, como `DECIMAL`.
- Casas inferidas: `max(0, dígitos depois do ponto - expoente)`. `6.022e23`
  dá 0; `1.5e-3` dá 4.

Aplicado (D4 a D7). 11 `.lint.json` existentes mudaram pela D4 (informado ao
humano). `missing-tolerance` usa o domain efetivo (declarado ou inferido).
D7 já valia no mdq-py; só corpus e doc. Junto com D8: o blank numérico do
fill-in ganha `incorrectFeedback` (consistência com D5 e D10c da
short-answer; escolha minha, reversível).

Aplicado (D8). `examples/invalid/numeric-exponent` virou
`examples/valid/numeric/exponent`. Vetor "Response string grammar": `"1e3"`
passou de malformado a válido. Renomeei
`invalid/model-only/numeric-blank-incorrect-feedback` para
`numeric-empty-incorrect-feedback` (era uma questão numeric, não um blank).
Em aberto: limite do expoente (`1e999999999` trava o `Fraction`).

### D9. Limite do expoente

Decisão: (a). Valor que não cabe num double finito (módulo acima do maior
double) é `malformed-numeric-answer` no answer e nas tolerâncias, e
malformado na resposta. A gramática limita o expoente a 3 dígitos. Extensão
minha (reversível): um valor não nulo que vira 0 como double (`1e-999`) também
é malformado, pela mesma razão (JS lê 0).
