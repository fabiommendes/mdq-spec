---
id: sa-regex-subset
title: Sigla do estado
---

Escreva a sigla de um estado da região Norte seguida do nome da capital.

[short-answer]:
* /(?=A)(?:AM|AC|AP) \w+/
  > A non-capturing group and a lookahead are part of the subset.
* /\x50\x41 Bel\u00e9m/
  > Hex and Unicode escapes spell `PA Belém`.
* /(?!AM)[A-Z]{2} [^\d]+/
