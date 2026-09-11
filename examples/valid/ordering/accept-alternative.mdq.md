---
id: ordering-temperature
title: Conversão de temperaturas
---

Sort the lines below to read a temperature in degrees Celsius and print it
in both Fahrenheit and kelvin.

[ordering]
```python
celsius = float(input("temperature in Celsius: "))
fahrenheit = celsius * 9 / 5 + 32
kelvin = celsius + 273.15
print(fahrenheit, kelvin)
```

## [accept]

> Both conversions read `celsius` and neither depends on the other, so
> either one may be computed first.

```python
celsius = float(input("temperature in Celsius: "))
kelvin = celsius + 273.15
fahrenheit = celsius * 9 / 5 + 32
print(fahrenheit, kelvin)
```
