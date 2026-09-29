---
id: ordering-redundant-strict-indentation
title: Algoritmo de Euclides
indentation: strict
normalizations: dedent
---

Order the lines of this implementation of the Euclidean algorithm for the
greatest common divisor.

[ordering]
```python
def mdc(a, b):
    while b:
        a, b = b, a % b
    return a
```
