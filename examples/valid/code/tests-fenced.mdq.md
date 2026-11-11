---
id: tabuada
title: Tabuada
type: code
language: python
file: tabuada.py
---

Escreva a função `tabuada(n)`, que devolve os dez primeiros múltiplos de `n`.

[code]

## [tests]

```pytest
from tabuada import tabuada

def test_tres():
    assert tabuada(3)[:3] == [3, 6, 9]

def test_zero():
    assert tabuada(0) == [0] * 10
```
