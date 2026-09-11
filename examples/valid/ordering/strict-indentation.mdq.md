---
id: ordering-fizzbuzz
title: FizzBuzz
indentation: strict
---

Sort the lines below into a program that prints the numbers from 1 to 100,
replacing multiples of three with `Fizz`, multiples of five with `Buzz` and
multiples of both with `FizzBuzz`. You must also indent each line correctly.

[ordering]
```python
for i in range(1, 101):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```
