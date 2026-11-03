---
type: issue
status: todo
tags: [mdq-js, shuffle, seed]
relatedTo: [dev/specs/to-review/presentation.md, docs/exam.md]
kind: enhancement
created: 2026-11-01
creator: Fábio Macêdo Mendes
---

# Portar a seleção seedada do includeAll para mdq-js

A spec (`docs/exam.md`, "Seeded selection") e mdq-py (`select_seeded`, e5e4772
e 9a6975c) já estão prontos. Falta o port para mdq-js: `selectSeeded(seed)`
para o `resolveExam`, usando o mesmo SHA-256 síncrono da forma apresentada,
e um teste que rode `examples/selection.yaml` (os casos e `rejectedSeeds`).

Depende do port da forma apresentada para mdq-js, que traz o SHA-256.
