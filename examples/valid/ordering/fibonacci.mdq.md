---
id: ordering-fibonacci
title: Fibonacci sequence
---

Sort the lines below to create a program that prints the first ten numbers of
the Fibonacci sequence.

[ordering]
```python
x, y = 1, 1
for _ in range(10):
    print(x)
    aux = x + y
    x = y
    y = aux
```
