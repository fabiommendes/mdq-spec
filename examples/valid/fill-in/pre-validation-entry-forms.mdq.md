---
id: fill-in-pre-entry-forms
title: Pantanal states
preAccept:
  state:
    - Mato Grosso
    - "`a.b`"
    - pattern: "/^[A-Za-z ]+$/i"
      feedback: Write the name of the state.
preReject:
  state:
    - pattern: "/\\d+/"
      comment: Digits are not a name.
---

The Pantanal lies mostly in the state of [^state] and floods during the
[^season] season.

[^state/short-answer]:
* Mato Grosso do Sul
* Mato Grosso

[^season/short-answer]:
* rainy
* wet
