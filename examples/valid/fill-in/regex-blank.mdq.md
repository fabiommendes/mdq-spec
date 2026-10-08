---
id: fill-in-regex-blank
title: Datas da independência
---

O Brasil declarou independência em [^data] e a República foi proclamada em
[^ano].

[^data/short-answer]: /1822-0?9-0?7/

[^ano/short-answer]:
* /18(89|9[0-9])/
  > Qualquer ano da década certa é aceito.
* `1889`

[^ano/short-answer/reject]:
* /1[0-7]\d\d/i
  > Século errado.
