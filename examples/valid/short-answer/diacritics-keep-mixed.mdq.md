---
id: sa-diacritics-keep-mixed
title: Grafia de Maceió
diacritics: keep
preAccept:
  - /[^\d]+/
---

Escreva o nome da capital de Alagoas, com a acentuação correta.

[short-answer]:
* Maceió
  > The inexact literal keeps its diacritics: `Maceio` does not match.
* `MACEIÓ`
  > An exact literal is compared verbatim regardless of `diacritics`.
* /maceio/in
  > A regex strips diacritics with its own `n` flag regardless of `diacritics`.
