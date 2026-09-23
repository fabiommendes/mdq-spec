Consider the code

```python
def fact(n: int) -> int:
    if n == 0:
        return 1
    else:
        return n * fact(n - 1)
```

Explain the pros and cons of the recursive implementation of the factorial function above.

[essay]