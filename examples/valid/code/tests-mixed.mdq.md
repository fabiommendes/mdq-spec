---
id: tabuada-mista
title: Tabuada com várias fontes de testes
type: code
language: python
---

Escreva um programa que leia `n` e escreva os dez primeiros múltiplos de `n`.

[code]

## [tests]

~~~pytest -q
def test_um():
    assert True
~~~

[entrada e saída](casos/tabuada.IOSpec)

[valores limite](casos/limites.py "Valores no limite")
