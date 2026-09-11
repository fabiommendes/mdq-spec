---
id: ordering-full-metadata
uuid: 3b1f0c52-9d7a-4f16-8b2e-1c0a7d6e4f93
title: Decaimento radioativo
author: Fábio Macêdo Mendes
locale: pt-BR
tags: [fisica, python]
type: ordering
content: code
highlight: python
indentation: strict
unmatched: incorrect
normalizations:
    - skip-blanks
meta:
  difficulty: hard
---

Ordene as linhas abaixo em um programa que simula o decaimento radioativo de
uma amostra, imprimindo quantos núcleos restam a cada passo de tempo.

[ordering]
```python
from math import exp

n0, meia_vida = 1000, 5.0

for t in range(11):
    n = n0 * exp(-0.693 * t / meia_vida)
    print(t, round(n))
```

## [extra]
```python
    n = n0 * exp(0.693 * t / meia_vida)
```

## [reject]

> O expoente do decaimento é negativo: com `exp(+0.693 * t / meia_vida)` a
> amostra cresceria em vez de decair.

! Erro de sinal, o mais comum nesta questão.

```python
from math import exp

n0, meia_vida = 1000, 5.0

for t in range(11):
    n = n0 * exp(0.693 * t / meia_vida)
    print(t, round(n))
```
