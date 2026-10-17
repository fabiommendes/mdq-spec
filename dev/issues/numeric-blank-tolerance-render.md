---
type: issue
status: open
tags: [mdq-py, render, numeric, fill-in, round-trip]
relatedTo: [examples/valid/fill-in/unmatched-manual.mdq.md]
---

# Render de tolerância absoluta inteira vira decimal

`examples/valid/fill-in/unmatched-manual.yaml` tem blank numérico `answer: 6`,
`domain: integer`, `tolerance: {absolute: 1}`. O render escreve
`[^length/numeric]: 6 +- 1.0`, e a releitura infere `domain: decimal`.
Ida e volta não é identidade. Provável causa: a tolerância é guardada como
float e `format_num` escreve `1.0`. Conferir se a questão numérica isolada
tem o mesmo problema.

Lateral: `str(tolerance)` (e de qualquer `MdqModel` que não é questão)
levanta `NotImplementedError` em `_render_lines`; `MdqModel.__str__` assume
questão.
