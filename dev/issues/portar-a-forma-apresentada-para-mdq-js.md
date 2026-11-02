---
type: issue
status: backlog
tags: [mdq-js, seed]
relatedTo: [dev/specs/to-review/presentation.md, docs/public-form.md]
kind: task
created: 2026-11-01
creator: Fábio Macêdo Mendes
---

# Portar a forma apresentada para mdq-js

A spec `presentation` implementou em mdq-py `Presentation` e
`ExamPresentation` (`docs/public-form.md`, "Presented form"). Falta o port
para mdq-js, que precisa de um SHA-256 síncrono (por exemplo,
`@noble/hashes`) e deve passar no corpus `examples/presentation.yaml`.

Escrever a spec do port em `dev/specs/to-do/` antes de implementar.
