---
id: marcadores-de-comentario
title: Marcadores de comentário de várias linguagens
type: code
language: python
---

Escreva a função `kelvin(c)`, que converte graus Celsius em kelvin.

[code]

## [tests]

```html
<!-- mdq: [0] Depois de abrir um comentário HTML
<p id="resultado"></p>
```

```sql
-- mdq: [0] Depois de dois hífens
SELECT 273.15;
```

```prolog
% mdq: [0] Depois de porcentagem
kelvin(0, 273.15).
```

```lisp
; mdq: [0] Depois de ponto e vírgula
(kelvin 0)
```

```pytest
	# mdq: [0] Depois de uma tabulação
def test_zero(): ...
```
