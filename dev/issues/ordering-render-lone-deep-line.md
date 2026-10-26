---
type: issue
status: open
tags: [mdq-py, render, ordering, round-trip]
relatedTo: [mdq-py-test-suite-slim]
---

# Render de ordering perde o nível de uma seção com uma linha funda

`examples/valid/ordering/accept-other-level-lenient.yaml` tem `accept` com uma
linha só, `[2, "condensação"]`. O render escreve 8 espaços antes da linha. A
releitura infere a unidade de indentação pela própria seção e devolve
`[1, "condensação"]`. O mesmo vale para `accept-other-level-strict`,
`reject-other-level-lenient` e `reject-unreachable-level-and-copies`, que por
isso ficaram só em `.yaml`.

Decidir na spec: a unidade de uma seção vem do bloco `[ordering]` (e então o
parser está errado) ou de cada bloco (e então essa forma não tem sintaxe de
superfície e o render deveria avisar).
