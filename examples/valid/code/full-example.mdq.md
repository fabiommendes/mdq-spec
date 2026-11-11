---
type: code
language: python
file: conta.py
title: Conta de luz
---
[conta-de-luz] A tarifa de energia é R$ 0,80 por kWh. A bandeira tarifária
soma um adicional por kWh: verde R$ 0,00, amarela R$ 0,02 e vermelha R$ 0,05.

Escreva a função `valor_conta(kwh, bandeira)`, que devolve o total em reais.

[code]

Os valores de `kwh` são números não negativos.

## [template]

```python
def valor_conta(kwh, bandeira):
    ...
```

## [tests]

[testes da função](test_conta.py)

## [rubric]

* [+2] {manual} Nomes de variáveis claros
  ! Não descontar por nomes em inglês

## [answer-key]

```python
ADICIONAL = {"verde": 0.00, "amarela": 0.02, "vermelha": 0.05}

def valor_conta(kwh, bandeira):
    return kwh * (0.80 + ADICIONAL[bandeira])
```
